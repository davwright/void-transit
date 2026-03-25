import { Intent } from '../types';
import { correctSpelling, viterbiTag, viterbiNBest, ViterbiResult, TaggedToken, actionWords as statActionWords, dirWords as statDirWords } from './StatisticalTagger';
import { decodeObject } from '../encoding';
import * as fs from 'fs';
import * as path from 'path';
import config from '../config';

// ─── Word Categories ───────────────────────────────────────────────────────
// Every word gets classified. Nouns are whatever's left after classification.

type WordCategory = 'direction' | 'action' | 'movement' | 'question' | 'modal'
  | 'pronoun' | 'preposition' | 'article' | 'conjunction' | 'adverb'
  | 'generic_verb' | 'meta' | 'noun';

// Directions → normalized direction
const directions: Record<string, string> = {
  n: 'north', s: 'south',
  e: 'east', w: 'west',
  up: 'up', u: 'up', down: 'down', d: 'down',
  in: 'in', enter: 'in', inside: 'in',
  out: 'out', exit: 'out', outside: 'out',
  fore: 'north', f: 'north', bow: 'north', forward: 'north',
  aft: 'south', a: 'south', stern: 'south', astern: 'south',
  port: 'west', p: 'west', portside: 'west',
  starboard: 'east', sb: 'east', stbd: 'east',
};

// Game action verbs → normalized action
const gameActions: Record<string, string> = {
  look: 'look', l: 'look',
  examine: 'examine', x: 'examine', inspect: 'examine', analyze: 'examine', scan: 'examine', study: 'examine', describe: 'examine', check: 'examine',
  take: 'take', get: 'take', grab: 'take', pick: 'take', pickup: 'take',
  drop: 'drop', discard: 'drop', leave: 'drop',
  use: 'use', apply: 'use', push: 'use', pull: 'use', turn: 'use', press: 'use', flip: 'use',
  tap: 'use', touch: 'use', poke: 'use', type: 'use', interact: 'use',
  activate: 'use', deactivate: 'use', enable: 'use', disable: 'use',
  power: 'use', boot: 'use', reboot: 'use',
  switch: 'use', shut: 'use',
  test: 'use', fix: 'use', repair: 'use', patch: 'use', weld: 'use', install: 'use', replace: 'use', swap: 'use',
  combine: 'combine', attach: 'combine', connect: 'combine', join: 'combine', merge: 'combine',
  open: 'open', unlock: 'open', close: 'open',
  read: 'read', access: 'read', query: 'read',
  equip: 'equip', wear: 'equip', don: 'equip', put: 'equip',
  unequip: 'unequip', remove: 'unequip', doff: 'unequip',
  inventory: 'inventory', i: 'inventory', inv: 'inventory', items: 'inventory',
  status: 'status', stat: 'status', health: 'status', date: 'status', time: 'status', clock: 'status', year: 'status',
  help: 'help', '?': 'help', commands: 'help',
  save: 'save', load: 'load', restore: 'load',
  saves: 'saves', hint: 'hint', hints: 'hint',
  search: 'search', find: 'search', where: 'search', locate: 'search',
  talk: 'talk', speak: 'talk', say: 'talk', ask: 'talk',
  stand: 'posture', sit: 'posture', rise: 'posture', crouch: 'posture',
  kneel: 'posture', crawl: 'posture', lie: 'posture', lay: 'posture',
  wait: 'wait', z: 'wait',
  map: 'map', m: 'map', systems: 'systems', sys: 'systems',
  calculate: 'puzzle_action', compute: 'puzzle_action', set: 'puzzle_action',
  calibrate: 'puzzle_action', adjust: 'puzzle_action',
};

// ─── Phrasal Verbs ─────────────────────────────────────────────────────────
// Multi-word verb phrases treated as a single action.
// Matched before single-word actions. Also used for post-positional particles
// ("turn beacon off" → detect "turn...off" → action: 'use')

interface PhrasalVerb {
  verb: string;       // first word (must be classified as action or movement)
  particle: string;   // second word (often a preposition/direction that changes meaning)
  action: string;     // resulting game action
}

const phrasalVerbs: PhrasalVerb[] = [
  { verb: 'pick', particle: 'up', action: 'take' },
  { verb: 'put', particle: 'on', action: 'equip' },
  { verb: 'put', particle: 'down', action: 'drop' },
  { verb: 'take', particle: 'off', action: 'unequip' },
  { verb: 'turn', particle: 'on', action: 'use' },
  { verb: 'turn', particle: 'off', action: 'use' },
  { verb: 'switch', particle: 'on', action: 'use' },
  { verb: 'switch', particle: 'off', action: 'use' },
  { verb: 'pull', particle: 'up', action: 'read' },
  { verb: 'get', particle: 'up', action: 'posture' },
  { verb: 'get', particle: 'out', action: 'move' },
  { verb: 'climb', particle: 'out', action: 'move' },
  { verb: 'sit', particle: 'up', action: 'posture' },
  { verb: 'stand', particle: 'up', action: 'posture' },
  { verb: 'lie', particle: 'down', action: 'posture' },
  { verb: 'lay', particle: 'down', action: 'posture' },
  { verb: 'look', particle: 'at', action: 'examine' },
  { verb: 'look', particle: 'in', action: 'search' },
  { verb: 'look', particle: 'inside', action: 'search' },
  { verb: 'look', particle: 'into', action: 'examine' },
  { verb: 'shut', particle: 'off', action: 'use' },
  { verb: 'shut', particle: 'down', action: 'use' },
  { verb: 'power', particle: 'on', action: 'use' },
  { verb: 'power', particle: 'off', action: 'use' },
];

// Movement verbs (need a direction after them)
const movementVerbs = new Set(['go', 'walk', 'move', 'run', 'head', 'climb']);

// Question words
const questionWords = new Set([
  'what', 'where', 'how', 'why', 'who', 'when', 'which',
  "what's", "where's", "who's", "how's",
]);

// Modal verbs (can, could, should, etc.)
const modalVerbs = new Set([
  'can', 'could', 'would', 'should', 'may', 'might', 'will', 'shall',
  "can't", "couldn't", "wouldn't", "shouldn't",
]);

// Pronouns
const pronouns = new Set([
  'i', 'me', 'my', 'you', 'your', 'we', 'us', 'our', 'he', 'she', 'it', 'its',
  'they', 'them', 'their', 'this', 'that', 'these', 'those', 'myself', 'yourself',
]);

// Prepositions
const prepositions = new Set([
  'at', 'to', 'on', 'in', 'with', 'from', 'into', 'around', 'about',
  'of', 'for', 'by', 'through', 'over', 'under', 'between', 'against', 'onto',
]);

// Articles & determiners
const articles = new Set(['the', 'a', 'an', 'some', 'any', 'no', 'every']);

// Conjunctions
const conjunctions = new Set(['and', 'or', 'but', 'nor', 'so', 'yet', 'then']);

// Adverbs & fillers
const adverbs = new Set([
  'very', 'really', 'actually', 'just', 'also', 'please', 'maybe', 'perhaps',
  'here', 'there', 'now', 'then', 'still', 'already', 'even', 'not',
  'too', 'quite', 'rather',
]);

// Generic verbs (not game actions — verbs used in conversation)
const genericVerbs = new Set([
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'do', 'does', 'did', 'done',
  'have', 'has', 'had', 'having',
  'eat', 'drink', 'feel', 'smell', 'taste', 'hear', 'see',
  'know', 'think', 'tell', 'need', 'want', 'try', 'like', 'make',
  'consist', 'contain', 'mean', 'work', 'happen',
  'let', 'give', 'keep', 'seem', 'appear', 'become',
]);

// Meta words (yes/no, affirmations)
const metaWords = new Set(['yes', 'no', 'ok', 'okay', 'sure', 'right', 'well']);

// Recognized but rejected verbs — injectable or lazy-loaded from fs
let rejectedVerbs: Record<string, string> = {};
let rejectedResponses: Record<string, string[]> = {};
let _rejectedLoaded = false;

function _ensureRejectedLoaded() {
  if (_rejectedLoaded) return;
  _rejectedLoaded = true;
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(config.dataDir, 'rejected-verbs.json'), 'utf-8'));
    const data = decodeObject(raw) as { verbs: Record<string, string>; responses: Record<string, string[]> };
    rejectedVerbs = data.verbs;
    rejectedResponses = data.responses;
  } catch { /* browser — data must be injected via injectRejectedVerbs */ }
}

/** Inject rejected verbs data (for browser builds that can't use fs) */
export function injectRejectedVerbs(data: { verbs: Record<string, string>; responses: Record<string, string[]> }) {
  rejectedVerbs = data.verbs;
  rejectedResponses = data.responses;
  _rejectedLoaded = true;
}

/** Check if a word or phrase is a recognized-but-rejected verb. Returns a flavor Intent or null. */
function checkRejectedVerb(word: string, fullInput?: string): Intent | null {
  if (!word) return null;
  _ensureRejectedLoaded();
  // Check full input first (for multi-word rejections like "go north")
  if (fullInput) {
    const category = rejectedVerbs[fullInput.toLowerCase()];
    if (category) {
      const responses = rejectedResponses[category];
      if (responses?.length) {
        const message = responses[Math.floor(Math.random() * responses.length)];
        return { action: 'rejected', target: null, instrument: null, raw: fullInput, value: message };
      }
    }
  }
  const category = rejectedVerbs[word.toLowerCase()];
  if (!category) return null;
  const responses = rejectedResponses[category];
  if (!responses || responses.length === 0) return null;
  const message = responses[Math.floor(Math.random() * responses.length)];
  return { action: 'rejected', target: null, instrument: null, raw: word, value: message };
}

// ─── Tokenizer & Classifier ───────────────────────────────────────────────

interface Token {
  word: string;
  category: WordCategory;
  /** For directions: the normalized direction. For actions: the normalized action. */
  normalized?: string;
}

function classify(word: string): Token {
  const clean = word.replace(/[?!.,;:]+$/, '');

  if (directions[clean] !== undefined) return { word: clean, category: 'direction', normalized: directions[clean] };
  if (gameActions[clean] !== undefined) return { word: clean, category: 'action', normalized: gameActions[clean] };
  if (movementVerbs.has(clean)) return { word: clean, category: 'movement' };
  if (questionWords.has(clean)) return { word: clean, category: 'question' };
  if (modalVerbs.has(clean)) return { word: clean, category: 'modal' };
  if (pronouns.has(clean)) return { word: clean, category: 'pronoun' };
  if (prepositions.has(clean)) return { word: clean, category: 'preposition' };
  if (articles.has(clean)) return { word: clean, category: 'article' };
  if (conjunctions.has(clean)) return { word: clean, category: 'conjunction' };
  if (adverbs.has(clean)) return { word: clean, category: 'adverb' };
  if (genericVerbs.has(clean)) return { word: clean, category: 'generic_verb' };
  if (metaWords.has(clean)) return { word: clean, category: 'meta' };

  return { word: clean, category: 'noun' };
}

function tokenize(input: string): Token[] {
  return input.toLowerCase().split(/\s+/).filter(w => w.length > 0).map(classify);
}

// Abbreviation matching for game actions
function matchAction(word: string): string | undefined {
  if (gameActions[word] !== undefined) return gameActions[word] ?? undefined;
  const candidates = Object.keys(gameActions).filter(v => v.startsWith(word) && word.length >= 2);
  if (candidates.length >= 1) {
    candidates.sort((a, b) => a.length - b.length);
    return gameActions[candidates[0]] ?? undefined;
  }
  return undefined;
}

function matchDirection(word: string): string | undefined {
  if (directions[word] !== undefined) return directions[word];
  const candidates = Object.keys(directions).filter(d => d.startsWith(word) && word.length >= 2);
  if (candidates.length >= 1) {
    candidates.sort((a, b) => a.length - b.length);
    return directions[candidates[0]];
  }
  return undefined;
}

// ─── Extract nouns from token list ─────────────────────────────────────────

function extractNouns(tokens: Token[], nounOnly = true): string {
  if (nounOnly) {
    return tokens.filter(t => t.category === 'noun').map(t => t.word).join(' ');
  }
  // Permissive mode: treat all content words as potential targets (skip grammar words)
  const skipCategories = new Set(['preposition', 'article', 'conjunction', 'pronoun', 'modal', 'adverb']);
  return tokens.filter(t => !skipCategories.has(t.category)).map(t => t.word).join(' ');
}

// ─── Phrasal Verb Matcher ─────────────────────────────────────────────────
// Handles both adjacent ("turn on beacon") and split ("turn beacon off") particles

function matchPhrasalVerb(tokens: Token[], raw: string): Intent | null {
  if (tokens.length < 2) return null;
  const first = tokens[0];

  // First word must be a game action or movement verb
  const verbWord = first.word;
  const isVerb = first.category === 'action' || movementVerbs.has(verbWord);
  if (!isVerb) return null;

  // Check for adjacent phrasal verb: "turn on X", "pick up X"
  const secondWord = tokens[1].word;
  const adjacentMatch = phrasalVerbs.find(pv => pv.verb === verbWord && pv.particle === secondWord);
  if (adjacentMatch) {
    const restTokens = tokens.slice(2);
    let target = extractNouns(restTokens, false) || null;
    // For movement phrasal verbs with no target, use the particle as direction
    if (!target && adjacentMatch.action === 'move') target = adjacentMatch.particle;
    return { action: adjacentMatch.action, target, instrument: null, raw };
  }

  // Check for split phrasal verb: "turn beacon off", "pick the wrench up"
  // Look for the particle anywhere after the verb
  for (const pv of phrasalVerbs) {
    if (pv.verb !== verbWord) continue;
    const particleIdx = tokens.findIndex((t, i) => i >= 2 && t.word === pv.particle);
    if (particleIdx >= 0) {
      // Everything between verb and particle (excluding stopwords) is the target
      const middleTokens = tokens.slice(1, particleIdx);
      const afterTokens = tokens.slice(particleIdx + 1);
      const target = extractNouns([...middleTokens, ...afterTokens], false) || null;
      return { action: pv.action, target, instrument: null, raw };
    }
  }

  return null;
}

// ─── Main Parser ───────────────────────────────────────────────────────────

export function parse(input: string): Intent {
  const raw = input.trim();
  if (!raw) return { action: 'look', target: null, instrument: null, raw };

  // Special: "?" alone means help
  if (raw === '?') return { action: 'help', target: null, instrument: null, raw };

  // Split compound sentences on punctuation, work with first clause
  const firstClause = raw.split(/[?!.]/)[0].trim() || raw;
  const tokens = tokenize(firstClause);

  if (tokens.length === 0) return { action: 'look', target: null, instrument: null, raw };

  // Check full input against multi-word rejected phrases (e.g. "go north")
  {
    _ensureRejectedLoaded();
    const fullLower = firstClause.toLowerCase();
    const category = rejectedVerbs[fullLower];
    if (category) {
      const responses = rejectedResponses[category];
      if (responses?.length) {
        const message = responses[Math.floor(Math.random() * responses.length)];
        return { action: 'rejected', target: null, instrument: null, raw, value: message };
      }
    }
  }

  const first = tokens[0];

  // ── Single word ──────────────────────────────────────────────────────
  if (tokens.length === 1) {
    if (first.category === 'direction') return { action: 'move', target: first.normalized!, instrument: null, raw };
    if (first.category === 'action') return { action: first.normalized!, target: null, instrument: null, raw };
    if (first.category === 'movement') return { action: 'look', target: null, instrument: null, raw };

    // Check rejected verbs BEFORE abbreviation matching
    // ("hello" should not match "help" via abbreviation)
    const rejected = checkRejectedVerb(first.word, raw);
    if (rejected) return rejected;

    // Try abbreviation matching
    const action = matchAction(first.word);
    if (action) return { action, target: null, instrument: null, raw };
    const dir = matchDirection(first.word);
    if (dir) return { action: 'move', target: dir, instrument: null, raw };

    // Single unknown word — try spelling correction (likely a mistyped command)
    if (first.category === 'noun' && first.word.length >= 3) {
      const correction = correctSpelling(first.word, 2);
      if (correction && (correction.category === 'action' || correction.category === 'direction')) {
        if (correction.category === 'direction') {
          return { action: 'move', target: correction.normalized!, instrument: null, raw };
        }
        return { action: correction.normalized!, target: null, instrument: null, raw };
      }
    }

    // Single unknown word → examine attempt (only if it's a noun, not a filler word)
    if (first.category === 'noun' && first.word.length >= 2) return { action: 'examine', target: first.word, instrument: null, raw };
    return { action: 'unknown', target: null, instrument: null, raw };
  }

  // ── Phrasal verbs: "turn on X", "pick up X", "turn X off" ──────────
  const phrasalResult = matchPhrasalVerb(tokens, raw);
  if (phrasalResult) return phrasalResult;

  // ── Movement: "go north", "walk south" ───────────────────────────────
  if (first.category === 'movement') {
    const dirToken = tokens.find(t => t.category === 'direction');
    if (dirToken) return { action: 'move', target: dirToken.normalized!, instrument: null, raw };
  }

  // ── Direction at start: "north", "port" ──────────────────────────────
  if (first.category === 'direction' && tokens.length <= 2) {
    return { action: 'move', target: first.normalized!, instrument: null, raw };
  }

  // ── Game action at start (or abbreviation) ───────────────────────────
  // "i" alone means inventory, but "i was in pod 14" is a sentence starting with pronoun "I"
  const iAsPronoun = first.word === 'i' && tokens.length > 1;
  const actionMatch = iAsPronoun ? undefined
    : first.category === 'action' ? first.normalized!
    : matchAction(first.word);
  if (actionMatch) {
    const rest = tokens.slice(1);
    const restNoStop = rest.filter(t => t.category === 'noun' || t.category === 'direction');

    // "use X on Y" / "combine X with Y"
    if (actionMatch === 'use' || actionMatch === 'combine') {
      const onIdx = rest.findIndex(t => t.word === 'on' || t.word === 'with');
      if (onIdx >= 0) {
        const targetNouns = extractNouns(rest.slice(0, onIdx));
        const instrumentNouns = extractNouns(rest.slice(onIdx + 1));
        return { action: actionMatch, target: targetNouns || null, instrument: instrumentNouns || null, raw };
      }
    }

    // "look at X" → examine
    if (actionMatch === 'look' && restNoStop.length > 0) {
      const target = extractNouns(rest.filter(t => t.word !== 'at'));
      return { action: 'examine', target: target || null, instrument: null, raw };
    }

    // "save/load NAME" — preserve full text
    if (actionMatch === 'save' || actionMatch === 'load') {
      const name = tokens.slice(1).map(t => t.word).join(' ') || 'quicksave';
      return { action: actionMatch, target: name, instrument: null, raw };
    }

    const target = extractNouns(rest) || null;
    return { action: actionMatch, target, instrument: null, raw };
  }

  // ── Direction at start (longer phrase) ───────────────────────────────
  if (first.category === 'direction') {
    return { action: 'move', target: first.normalized!, instrument: null, raw };
  }

  // ── Spelling correction for first word (multi-word) ─────────────────
  // If the first word is classified as noun but looks like a misspelled verb,
  // generate a corrected interpretation as the primary intent, but also
  // keep the literal (noun) interpretation as an alternative.
  if (first.category === 'noun' && first.word.length >= 3 && tokens.length >= 2) {
    const correction = correctSpelling(first.word, 2);
    if (correction && correction.category === 'action' && correction.normalized) {
      const correctedAction = correction.normalized;
      const rest = tokens.slice(1);
      const confidence = correction.distance === 1 ? 0.8 : 0.5;

      let correctedIntent: Intent;

      // Handle "use X on Y" / "combine X with Y"
      if (correctedAction === 'use' || correctedAction === 'combine') {
        const onIdx = rest.findIndex(t => t.word === 'on' || t.word === 'with');
        if (onIdx >= 0) {
          const targetNouns = extractNouns(rest.slice(0, onIdx));
          const instrumentNouns = extractNouns(rest.slice(onIdx + 1));
          correctedIntent = { action: correctedAction, target: targetNouns || null, instrument: instrumentNouns || null, raw, confidence };
        } else {
          correctedIntent = { action: correctedAction, target: extractNouns(rest) || null, instrument: null, raw, confidence };
        }
      } else {
        correctedIntent = { action: correctedAction, target: extractNouns(rest) || null, instrument: null, raw, confidence };
      }

      // Alternative: treat the whole thing as examine (literal reading)
      const allNouns = extractNouns(tokens);
      if (allNouns.length >= 2) {
        correctedIntent.alternatives = [
          { action: 'examine', target: allNouns, instrument: null, raw, confidence: 0.3 }
        ];
      }

      return correctedIntent;
    }
    if (correction && correction.category === 'direction') {
      return { action: 'move', target: correction.normalized!, instrument: null, raw, confidence: correction.distance === 1 ? 0.8 : 0.5 };
    }
  }

  // ── Natural language: extract nouns, treat as examine ────────────────
  // At this point the sentence starts with a question word, modal, pronoun, etc.
  // The player is asking about something. Extract the nouns.
  const nouns = extractNouns(tokens);
  if (nouns.length >= 2) {
    return { action: 'examine', target: nouns, instrument: null, raw };
  }

  // ── Statistical fallback: n-best Viterbi POS inference ─────────────
  // When the deterministic parser gives up, use the HMM bigram model to
  // produce multiple competing interpretations. The game engine evaluates
  // each against game state to pick the valid one (or ask the player).
  return statisticalFallback(tokens, raw);
}

/** Convert a Viterbi tag sequence into an Intent */
function taggedToIntent(tagged: TaggedToken[], raw: string, confidence: number): Intent | null {
  // Find the first action or movement verb
  const actionToken = tagged.find(t => (t.category === 'action' || t.category === 'movement'));

  if (actionToken) {
    let action: string | undefined;
    if (actionToken.corrected) {
      action = gameActions[actionToken.corrected] || actionToken.normalized;
    } else if (actionToken.category === 'action' && actionToken.normalized) {
      action = actionToken.normalized;
    } else if (actionToken.category === 'movement') {
      const dirToken = tagged.find(t => t.category === 'direction');
      if (dirToken) {
        return { action: 'move', target: dirToken.normalized || dirToken.word, instrument: null, raw, confidence };
      }
      return { action: 'look', target: null, instrument: null, raw, confidence };
    }

    if (action) {
      const actionIdx = tagged.indexOf(actionToken);
      const afterAction = tagged.slice(actionIdx + 1);

      // Check for instrument pattern: "v n p n"
      const prepIdx = afterAction.findIndex(t => t.category === 'preposition');
      if (prepIdx >= 0 && (action === 'use' || action === 'combine')) {
        const targetNouns = afterAction.slice(0, prepIdx).filter(t => t.category === 'noun').map(t => t.word).join(' ');
        const instrumentNouns = afterAction.slice(prepIdx + 1).filter(t => t.category === 'noun').map(t => t.word).join(' ');
        return { action, target: targetNouns || null, instrument: instrumentNouns || null, raw, confidence };
      }

      const nounTokens = afterAction.filter(t => t.category === 'noun');
      const target = nounTokens.map(t => t.word).join(' ') || null;
      return { action, target, instrument: null, raw, confidence };
    }
  }

  // Check for direction
  const dirToken = tagged.find(t => t.category === 'direction');
  if (dirToken) {
    return { action: 'move', target: dirToken.normalized || dirToken.word, instrument: null, raw, confidence };
  }

  // Noun-only → examine
  const nounTokens = tagged.filter(t => t.category === 'noun');
  if (nounTokens.length > 0) {
    return { action: 'examine', target: nounTokens.map(t => t.word).join(' '), instrument: null, raw, confidence };
  }

  return null;
}

function statisticalFallback(tokens: Token[], raw: string): Intent {
  const words = tokens.map(t => t.word);
  const nBestResults = viterbiNBest(words, 4);

  if (nBestResults.length === 0) {
    const rejected = checkRejectedVerb(tokens[0]?.word, raw);
    return rejected || { action: 'unknown', target: null, instrument: null, raw };
  }

  // Convert each Viterbi path to an Intent
  const candidates: Intent[] = [];
  for (const result of nBestResults) {
    const intent = taggedToIntent(result.tags, raw, result.confidence);
    if (intent) {
      // Deduplicate: skip if same action+target already exists
      const isDuplicate = candidates.some(c => c.action === intent.action && c.target === intent.target);
      if (!isDuplicate) {
        candidates.push(intent);
      }
    }
  }

  if (candidates.length === 0) {
    const rejected = checkRejectedVerb(tokens[0]?.word, raw);
    return rejected || { action: 'unknown', target: null, instrument: null, raw };
  }

  // Primary = highest confidence, rest = alternatives
  const primary = candidates[0];
  if (candidates.length > 1) {
    primary.alternatives = candidates.slice(1);
  }

  return primary;
}

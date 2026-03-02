import { Intent } from '../types';

const directionAliases: Record<string, string | null> = {
  north: 'north', n: 'north', south: 'south', s: 'south',
  east: 'east', e: 'east', west: 'west', w: 'west',
  up: 'up', u: 'up', down: 'down', d: 'down',
  in: 'in', enter: 'in', inside: 'in',
  out: 'out', exit: 'out', outside: 'out',
  // Nautical/ship directions
  fore: 'north', bow: 'north', forward: 'north',
  aft: 'south', stern: 'south', astern: 'south',
  port: 'west', portside: 'west',
  starboard: 'east', stbd: 'east',
  go: null, walk: null, move: null, run: null, head: null, climb: null
};

const actionVerbs: Record<string, string | null> = {
  look: 'look', l: 'look', examine: 'examine', x: 'examine', inspect: 'examine',
  take: 'take', get: 'take', grab: 'take', pick: 'take', pickup: 'take',
  drop: 'drop', put: 'drop', discard: 'drop', leave: 'drop',
  use: 'use', apply: 'use', activate: 'use',
  combine: 'combine', attach: 'combine', connect: 'combine', join: 'combine', merge: 'combine',
  open: 'open', unlock: 'open',
  read: 'read', check: 'read',
  equip: 'equip', wear: 'equip', don: 'equip',
  unequip: 'unequip', remove: 'unequip', doff: 'unequip',
  inventory: 'inventory', i: 'inventory', inv: 'inventory', items: 'inventory',
  status: 'status', stat: 'status', health: 'status',
  help: 'help', '?': 'help', commands: 'help',
  save: 'save', load: 'load', restore: 'load',
  saves: 'saves', hint: 'hint', hints: 'hint',
  search: 'search', find: 'search',
  talk: 'talk', speak: 'talk', say: 'talk', ask: 'talk',
  wait: 'wait', z: 'wait',
  map: 'map', systems: 'systems', sys: 'systems',
  push: 'use', pull: 'use', turn: 'use', press: 'use', flip: 'use',
  analyze: 'examine', scan: 'examine', study: 'examine',
  fix: 'use', repair: 'use', patch: 'use', weld: 'use',
  install: 'use', replace: 'use', swap: 'use',
  calculate: 'puzzle_action', compute: 'puzzle_action', set: 'puzzle_action',
  calibrate: 'puzzle_action', adjust: 'puzzle_action', enter: null
};

const stopWords = ['the', 'a', 'an', 'at', 'to', 'on', 'in', 'with', 'my', 'this', 'that', 'it', 'of', 'from', 'into', 'around', 'up'];

function matchVerb(word: string): string | null | undefined {
  if (actionVerbs[word] !== undefined) return actionVerbs[word];
  const candidates = Object.keys(actionVerbs).filter(v => v.startsWith(word) && word.length >= 2);
  if (candidates.length === 1) return actionVerbs[candidates[0]];
  if (candidates.length > 1) {
    candidates.sort((a, b) => a.length - b.length);
    return actionVerbs[candidates[0]];
  }
  return undefined;
}

function matchDirection(word: string): string | null | undefined {
  if (directionAliases[word] !== undefined) return directionAliases[word];
  const candidates = Object.keys(directionAliases).filter(d => d.startsWith(word) && word.length >= 2);
  if (candidates.length >= 1) {
    candidates.sort((a, b) => a.length - b.length);
    return directionAliases[candidates[0]];
  }
  return undefined;
}

export function parse(input: string): Intent {
  const raw = input.trim();
  if (!raw) return { action: 'look', target: null, instrument: null, raw };

  const lower = raw.toLowerCase();
  const tokens = lower.split(/\s+/);
  const firstWord = tokens[0];

  // Single-word shortcuts — check exact matches first, then substring
  if (tokens.length === 1) {
    // Exact direction match (n, s, e, w, north, south, etc.)
    if (directionAliases[firstWord] !== undefined) {
      const dir = directionAliases[firstWord];
      if (dir === null) return { action: 'look', target: null, instrument: null, raw };
      return { action: 'move', target: dir, instrument: null, raw };
    }
    // Exact verb match
    if (actionVerbs[firstWord] !== undefined) {
      const verb = actionVerbs[firstWord];
      if (verb === null) return { action: 'look', target: null, instrument: null, raw };
      return { action: verb, target: null, instrument: null, raw };
    }
    // Substring verb match (prioritize verbs over directions for abbreviations)
    const verb = matchVerb(firstWord);
    if (verb !== undefined) {
      if (verb === null) return { action: 'look', target: null, instrument: null, raw };
      return { action: verb, target: null, instrument: null, raw };
    }
    // Substring direction match
    const dir = matchDirection(firstWord);
    if (dir !== undefined) {
      if (dir === null) return { action: 'look', target: null, instrument: null, raw };
      return { action: 'move', target: dir, instrument: null, raw };
    }
  }

  // "go <direction>" and similar movement verbs
  const movementVerbs = ['go', 'walk', 'move', 'run', 'head', 'climb'];
  if (movementVerbs.some(mv => firstWord === mv || (firstWord.length >= 2 && mv.startsWith(firstWord)))) {
    if (tokens.length > 1) {
      const dirWord = tokens.slice(1).join(' ');
      const dir = matchDirection(dirWord) || matchDirection(tokens[1]);
      if (dir) {
        return { action: 'move', target: dir, instrument: null, raw };
      }
    }
  }

  // Direction word at start
  const dirAtStart = matchDirection(firstWord);
  if (dirAtStart && dirAtStart !== null && tokens.length <= 2) {
    return { action: 'move', target: dirAtStart, instrument: null, raw };
  }

  // Action verbs (with substring matching)
  const action = matchVerb(firstWord);
  if (action !== undefined && action !== null) {
    // For use/combine, find "on"/"with" BEFORE stripping stop words
    const rawRest = tokens.slice(1);
    const onIdx = rawRest.indexOf('on');
    const withIdx = rawRest.indexOf('with');
    const splitIdx = onIdx >= 0 ? onIdx : withIdx;

    if (splitIdx >= 0 && (action === 'use' || action === 'combine')) {
      const targetTokens = rawRest.slice(0, splitIdx).filter(t => !stopWords.includes(t) && t !== 'on' && t !== 'with');
      const instrumentTokens = rawRest.slice(splitIdx + 1).filter(t => !stopWords.includes(t));
      const target = targetTokens.join(' ');
      const instrument = instrumentTokens.join(' ');
      return { action, target: target || null, instrument: instrument || null, raw };
    }

    const rest = rawRest.filter(t => !stopWords.includes(t));

    if (action === 'look' && rest.length > 0) {
      const target = rest.filter(t => t !== 'at').join(' ');
      return { action: rest.length > 0 ? 'examine' : 'look', target: target || null, instrument: null, raw };
    }

    if (firstWord === 'pick' && tokens[1] === 'up') {
      const target = tokens.slice(2).filter(t => !stopWords.includes(t)).join(' ');
      return { action: 'take', target: target || null, instrument: null, raw };
    }

    if (firstWord === 'put' && tokens[1] === 'on') {
      const target = tokens.slice(2).filter(t => !stopWords.includes(t)).join(' ');
      return { action: 'equip', target: target || null, instrument: null, raw };
    }

    if (action === 'save' || action === 'load') {
      const name = tokens.slice(1).join(' ') || 'quicksave';
      return { action, target: name, instrument: null, raw };
    }

    const target = rest.join(' ') || null;
    return { action, target, instrument: null, raw };
  }

  if (dirAtStart) {
    return { action: 'move', target: dirAtStart || tokens[1], instrument: null, raw };
  }

  return { action: 'unknown', target: null, instrument: null, raw };
}


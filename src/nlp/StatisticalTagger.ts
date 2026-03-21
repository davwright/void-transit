/**
 * Statistical POS Tagger — HMM bigram model for unknown/misspelled word inference.
 *
 * Uses the existing vocabulary tables to build:
 *   - Emission probabilities: P(word | category)
 *   - Transition probabilities: P(category_i | category_{i-1})
 *   - Levenshtein-based spelling correction
 *
 * Only invoked as a fallback when the deterministic parser fails.
 * Vocabulary is base64-encoded at rest; decoded at module init.
 */

import { decodeString } from '../encoding';

// ─── Types ─────────────────────────────────────────────────────────────────

export type POSCategory = 'direction' | 'action' | 'movement' | 'question' | 'modal'
  | 'pronoun' | 'preposition' | 'article' | 'conjunction' | 'adverb'
  | 'generic_verb' | 'meta' | 'noun';

export interface TaggedToken {
  word: string;
  category: POSCategory;
  confidence: number;     // 0–1, how confident we are in this tag
  corrected?: string;     // if spelling-corrected, the original known word
  normalized?: string;    // for directions/actions: the normalized value
}

// ─── Decode helpers ────────────────────────────────────────────────────────

/** Decode a Record<encoded, encoded> → Record<plaintext, plaintext> */
function decodeRecord(enc: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(enc)) out[decodeString(k)] = decodeString(v);
  return out;
}

/** Decode an encoded string array */
function decodeArray(enc: string[]): string[] {
  return enc.map(s => decodeString(s));
}

// ─── Vocabulary (encoded at rest, decoded at init) ─────────────────────────

const vocabulary: Record<string, POSCategory> = {};

// Directions — encoded keys→values
const dirWords: Record<string, string> = decodeRecord({
  'bm9ydGg=': 'bm9ydGg=', 'bg==': 'bm9ydGg=', 'c291dGg=': 'c291dGg=', 'cw==': 'c291dGg=',
  'ZWFzdA==': 'ZWFzdA==', 'ZQ==': 'ZWFzdA==', 'd2VzdA==': 'd2VzdA==', 'dw==': 'd2VzdA==',
  'dXA=': 'dXA=', 'dQ==': 'dXA=', 'ZG93bg==': 'ZG93bg==', 'ZA==': 'ZG93bg==',
  'aW4=': 'aW4=', 'ZW50ZXI=': 'aW4=', 'aW5zaWRl': 'aW4=',
  'b3V0': 'b3V0', 'ZXhpdA==': 'b3V0', 'b3V0c2lkZQ==': 'b3V0',
  'Zm9yZQ==': 'bm9ydGg=', 'Zg==': 'bm9ydGg=', 'Ym93': 'bm9ydGg=', 'Zm9yd2FyZA==': 'bm9ydGg=',
  'YWZ0': 'c291dGg=', 'YQ==': 'c291dGg=', 'c3Rlcm4=': 'c291dGg=', 'YXN0ZXJu': 'c291dGg=',
  'cG9ydA==': 'd2VzdA==', 'cA==': 'd2VzdA==', 'cG9ydHNpZGU=': 'd2VzdA==',
  'c3RhcmJvYXJk': 'ZWFzdA==', 'c2I=': 'ZWFzdA==', 'c3RiZA==': 'ZWFzdA=='
});
for (const w of Object.keys(dirWords)) vocabulary[w] = 'direction';

// Actions — encoded keys→values
const actionWords: Record<string, string> = decodeRecord({
  'bG9vaw==': 'bG9vaw==', 'bA==': 'bG9vaw==',
  'ZXhhbWluZQ==': 'ZXhhbWluZQ==', 'eA==': 'ZXhhbWluZQ==', 'aW5zcGVjdA==': 'ZXhhbWluZQ==', 'YW5hbHl6ZQ==': 'ZXhhbWluZQ==', 'c2Nhbg==': 'ZXhhbWluZQ==', 'c3R1ZHk=': 'ZXhhbWluZQ==', 'ZGVzY3JpYmU=': 'ZXhhbWluZQ==',
  'dGFrZQ==': 'dGFrZQ==', 'Z2V0': 'dGFrZQ==', 'Z3JhYg==': 'dGFrZQ==', 'cGljaw==': 'dGFrZQ==', 'cGlja3Vw': 'dGFrZQ==',
  'ZHJvcA==': 'ZHJvcA==', 'ZGlzY2FyZA==': 'ZHJvcA==', 'bGVhdmU=': 'ZHJvcA==',
  'dXNl': 'dXNl', 'YXBwbHk=': 'dXNl', 'cHVzaA==': 'dXNl', 'cHVsbA==': 'dXNl', 'dHVybg==': 'dXNl', 'cHJlc3M=': 'dXNl', 'ZmxpcA==': 'dXNl',
  'dGFw': 'dXNl', 'dG91Y2g=': 'dXNl', 'cG9rZQ==': 'dXNl',
  'YWN0aXZhdGU=': 'dXNl', 'ZGVhY3RpdmF0ZQ==': 'dXNl', 'ZW5hYmxl': 'dXNl', 'ZGlzYWJsZQ==': 'dXNl',
  'cG93ZXI=': 'dXNl', 'Ym9vdA==': 'dXNl', 'cmVib290': 'dXNl',
  'c3dpdGNo': 'dXNl', 'c2h1dA==': 'dXNl',
  'Zml4': 'dXNl', 'cmVwYWly': 'dXNl', 'cGF0Y2g=': 'dXNl', 'd2VsZA==': 'dXNl', 'aW5zdGFsbA==': 'dXNl', 'cmVwbGFjZQ==': 'dXNl', 'c3dhcA==': 'dXNl',
  'Y29tYmluZQ==': 'Y29tYmluZQ==', 'YXR0YWNo': 'Y29tYmluZQ==', 'Y29ubmVjdA==': 'Y29tYmluZQ==', 'am9pbg==': 'Y29tYmluZQ==', 'bWVyZ2U=': 'Y29tYmluZQ==',
  'b3Blbg==': 'b3Blbg==', 'dW5sb2Nr': 'b3Blbg==', 'Y2xvc2U=': 'b3Blbg==',
  'cmVhZA==': 'cmVhZA==', 'Y2hlY2s=': 'cmVhZA==', 'YWNjZXNz': 'cmVhZA==', 'cXVlcnk=': 'cmVhZA==',
  'ZXF1aXA=': 'ZXF1aXA=', 'd2Vhcg==': 'ZXF1aXA=', 'ZG9u': 'ZXF1aXA=', 'cHV0': 'ZXF1aXA=',
  'dW5lcXVpcA==': 'dW5lcXVpcA==', 'cmVtb3Zl': 'dW5lcXVpcA==', 'ZG9mZg==': 'dW5lcXVpcA==',
  'aW52ZW50b3J5': 'aW52ZW50b3J5', 'aQ==': 'aW52ZW50b3J5', 'aW52': 'aW52ZW50b3J5', 'aXRlbXM=': 'aW52ZW50b3J5',
  'c3RhdHVz': 'c3RhdHVz', 'c3RhdA==': 'c3RhdHVz', 'aGVhbHRo': 'c3RhdHVz',
  'aGVscA==': 'aGVscA==', 'Pw==': 'aGVscA==', 'Y29tbWFuZHM=': 'aGVscA==',
  'c2F2ZQ==': 'c2F2ZQ==', 'bG9hZA==': 'bG9hZA==', 'cmVzdG9yZQ==': 'bG9hZA==',
  'c2F2ZXM=': 'c2F2ZXM=', 'aGludA==': 'aGludA==', 'aGludHM=': 'aGludA==',
  'c2VhcmNo': 'c2VhcmNo', 'ZmluZA==': 'c2VhcmNo',
  'dGFsaw==': 'dGFsaw==', 'c3BlYWs=': 'dGFsaw==', 'c2F5': 'dGFsaw==', 'YXNr': 'dGFsaw==',
  'd2FpdA==': 'd2FpdA==', 'eg==': 'd2FpdA==',
  'bWFw': 'bWFw', 'bQ==': 'bWFw', 'c3lzdGVtcw==': 'c3lzdGVtcw==', 'c3lz': 'c3lzdGVtcw==',
  'Y2FsY3VsYXRl': 'cHV6emxlX2FjdGlvbg==', 'Y29tcHV0ZQ==': 'cHV6emxlX2FjdGlvbg==', 'c2V0': 'cHV6emxlX2FjdGlvbg==',
  'Y2FsaWJyYXRl': 'cHV6emxlX2FjdGlvbg==', 'YWRqdXN0': 'cHV6emxlX2FjdGlvbg=='
});
for (const w of Object.keys(actionWords)) vocabulary[w] = 'action';

// Movement
for (const w of decodeArray(['Z28=', 'd2Fsaw==', 'bW92ZQ==', 'cnVu', 'aGVhZA==', 'Y2xpbWI='])) vocabulary[w] = 'movement';

// Question
for (const w of decodeArray(['d2hhdA==', 'd2hlcmU=', 'aG93', 'd2h5', 'd2hv', 'd2hlbg==', 'd2hpY2g=', 'd2hhdCdz', 'd2hlcmUncw==', 'd2hvJ3M=', 'aG93J3M='])) vocabulary[w] = 'question';

// Modal
for (const w of decodeArray(['Y2Fu', 'Y291bGQ=', 'd291bGQ=', 'c2hvdWxk', 'bWF5', 'bWlnaHQ=', 'd2lsbA==', 'c2hhbGw=', 'Y2FuJ3Q=', 'Y291bGRuJ3Q=', 'd291bGRuJ3Q=', 'c2hvdWxkbid0'])) vocabulary[w] = 'modal';

// Pronoun
for (const w of decodeArray(['aQ==', 'bWU=', 'bXk=', 'eW91', 'eW91cg==', 'd2U=', 'dXM=', 'b3Vy', 'aGU=', 'c2hl', 'aXQ=', 'aXRz', 'dGhleQ==', 'dGhlbQ==', 'dGhlaXI=', 'dGhpcw==', 'dGhhdA==', 'dGhlc2U=', 'dGhvc2U=', 'bXlzZWxm', 'eW91cnNlbGY='])) vocabulary[w] = 'pronoun';

// Preposition
for (const w of decodeArray(['YXQ=', 'dG8=', 'b24=', 'aW4=', 'd2l0aA==', 'ZnJvbQ==', 'aW50bw==', 'YXJvdW5k', 'YWJvdXQ=', 'b2Y=', 'Zm9y', 'Ynk=', 'dGhyb3VnaA==', 'b3Zlcg==', 'dW5kZXI=', 'YmV0d2Vlbg==', 'YWdhaW5zdA==', 'b250bw=='])) vocabulary[w] = 'preposition';

// Article
for (const w of decodeArray(['dGhl', 'YQ==', 'YW4=', 'c29tZQ==', 'YW55', 'bm8=', 'ZXZlcnk='])) vocabulary[w] = 'article';

// Conjunction
for (const w of decodeArray(['YW5k', 'b3I=', 'YnV0', 'bm9y', 'c28=', 'eWV0', 'dGhlbg=='])) vocabulary[w] = 'conjunction';

// Adverb
for (const w of decodeArray(['dmVyeQ==', 'cmVhbGx5', 'YWN0dWFsbHk=', 'anVzdA==', 'YWxzbw==', 'cGxlYXNl', 'bWF5YmU=', 'cGVyaGFwcw==', 'aGVyZQ==', 'dGhlcmU=', 'bm93', 'dGhlbg==', 'c3RpbGw=', 'YWxyZWFkeQ==', 'ZXZlbg==', 'bm90', 'dG9v', 'cXVpdGU=', 'cmF0aGVy'])) vocabulary[w] = 'adverb';

// Generic verb
for (const w of decodeArray(['aXM=', 'YXJl', 'd2Fz', 'd2VyZQ==', 'YmU=', 'YmVlbg==', 'YmVpbmc=', 'YW0=', 'ZG8=', 'ZG9lcw==', 'ZGlk', 'ZG9uZQ==', 'aGF2ZQ==', 'aGFz', 'aGFk', 'aGF2aW5n', 'ZWF0', 'ZHJpbms=', 'ZmVlbA==', 'c21lbGw=', 'dGFzdGU=', 'aGVhcg==', 'c2Vl', 'a25vdw==', 'dGhpbms=', 'dGVsbA==', 'bmVlZA==', 'd2FudA==', 'dHJ5', 'bGlrZQ==', 'bWFrZQ==', 'Y29uc2lzdA==', 'Y29udGFpbg==', 'bWVhbg==', 'd29yaw==', 'aGFwcGVu', 'bGV0', 'Z2l2ZQ==', 'a2VlcA==', 'c2VlbQ==', 'YXBwZWFy', 'YmVjb21l'])) vocabulary[w] = 'generic_verb';

// Meta
for (const w of decodeArray(['eWVz', 'bm8=', 'b2s=', 'b2theQ==', 'c3VyZQ==', 'cmlnaHQ=', 'd2VsbA=='])) vocabulary[w] = 'meta';


// ─── Category Priors ───────────────────────────────────────────────────────
// P(category) — how likely each category is in general. Derived from
// word counts in the vocabulary tables, smoothed.

const allCategories: POSCategory[] = [
  'direction', 'action', 'movement', 'question', 'modal',
  'pronoun', 'preposition', 'article', 'conjunction', 'adverb',
  'generic_verb', 'meta', 'noun',
];

const categoryCounts: Record<POSCategory, number> = {} as Record<POSCategory, number>;
for (const cat of allCategories) categoryCounts[cat] = 0;
for (const cat of Object.values(vocabulary)) categoryCounts[cat]++;
categoryCounts['noun'] = 50; // Unknown words default to noun — give it a substantial prior

const totalWords = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
const categoryPrior: Record<POSCategory, number> = {} as Record<POSCategory, number>;
for (const cat of allCategories) {
  categoryPrior[cat] = categoryCounts[cat] / totalWords;
}


// ─── Transition Probabilities ──────────────────────────────────────────────
// P(category_j | category_i) — bigram transition model.
// Derived from the sentence patterns the parser recognizes.

// Sentence patterns observed in the parser (using category abbreviations):
// START → action, START → direction, START → movement, START → question, START → noun
// action → noun, action → preposition, action → article
// movement → direction
// noun → preposition, noun → noun (compounds)
// preposition → noun, preposition → article
// article → noun
// question → generic_verb, question → noun, question → pronoun
// generic_verb → article, generic_verb → noun, generic_verb → pronoun
// pronoun → generic_verb, pronoun → preposition

// We model START as a special state in the transition table
type TransitionState = POSCategory | 'START';
const transitionCounts: Record<TransitionState, Partial<Record<POSCategory, number>>> = {
  'START': { action: 40, direction: 15, movement: 10, question: 8, noun: 20, pronoun: 3, modal: 2, meta: 2 },
  'direction': { noun: 1 },
  'action': { noun: 30, preposition: 8, article: 10, direction: 5, pronoun: 2 },
  'movement': { direction: 20, preposition: 3, noun: 2 },
  'question': { generic_verb: 10, noun: 5, pronoun: 5, modal: 3, preposition: 3 },
  'modal': { generic_verb: 8, action: 5, pronoun: 3, adverb: 2 },
  'pronoun': { generic_verb: 10, action: 5, preposition: 3, noun: 3, modal: 2 },
  'preposition': { noun: 20, article: 10, pronoun: 3 },
  'article': { noun: 25, adverb: 2 },
  'conjunction': { noun: 8, action: 5, article: 3, pronoun: 2 },
  'adverb': { noun: 5, action: 5, generic_verb: 3, adverb: 2 },
  'generic_verb': { article: 8, noun: 10, pronoun: 5, preposition: 5, adverb: 3 },
  'meta': { noun: 3, action: 2 },
  'noun': { preposition: 10, noun: 8, conjunction: 3, article: 2, adverb: 2, direction: 1 },
};

// Normalize transition counts to probabilities, with Laplace smoothing
const SMOOTHING = 0.1;
const transitionProb: Record<TransitionState, Record<POSCategory, number>> = {} as any;

for (const from of ['START', ...allCategories] as TransitionState[]) {
  const counts = transitionCounts[from] || {};
  const total = Object.values(counts).reduce((a, b) => a + (b || 0), 0) + SMOOTHING * allCategories.length;
  transitionProb[from] = {} as Record<POSCategory, number>;
  for (const to of allCategories) {
    transitionProb[from][to] = ((counts[to] || 0) + SMOOTHING) / total;
  }
}


// ─── Levenshtein Distance ──────────────────────────────────────────────────

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Single-row optimization — O(min(m,n)) space instead of O(m×n)
  const short = a.length < b.length ? a : b;
  const long = a.length < b.length ? b : a;
  let prev = Array.from({ length: short.length + 1 }, (_, i) => i);
  let curr = new Array(short.length + 1);

  for (let i = 1; i <= long.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= short.length; j++) {
      const cost = long[i - 1] === short[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // deletion
        curr[j - 1] + 1,   // insertion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[short.length];
}

// ─── BK-Tree ───────────────────────────────────────────────────────────────
// Burkhard-Keller tree for efficient fuzzy string matching.
// Instead of comparing against every word in the vocabulary (O(n) per query),
// the BK-tree prunes branches using the triangle inequality property of
// edit distance: |d(x,z) - d(y,z)| ≤ d(x,y). This means for a query word q
// and max distance n, we only need to explore children at distances d±n
// from the current node, skipping entire subtrees.

interface BKNode {
  word: string;
  category: POSCategory;
  children: Map<number, BKNode>;  // keyed by edit distance to this node's word
}

// Category priority for tie-breaking: content words (action, direction, movement)
// are more likely spelling correction targets than function words (the, a, not).
const categoryPriority: Record<POSCategory, number> = {
  action: 10, direction: 10, movement: 9,
  noun: 7, generic_verb: 5,
  question: 3, modal: 2, pronoun: 2, meta: 2,
  preposition: 1, article: 1, conjunction: 1, adverb: 1,
};

/** Is the new candidate a better match than the current best? */
function isBetterMatch(dist: number, node: BKNode, best: SpellingMatch): boolean {
  if (dist < best.distance) return true;
  if (dist > best.distance) return false;
  // Same distance — prefer content categories
  const newPri = categoryPriority[node.category] || 0;
  const bestPri = categoryPriority[best.category] || 0;
  if (newPri > bestPri) return true;
  if (newPri < bestPri) return false;
  // Same priority — prefer shorter word
  return node.word.length < best.word.length;
}

class BKTree {
  private root: BKNode | null = null;

  insert(word: string, category: POSCategory): void {
    if (!this.root) {
      this.root = { word, category, children: new Map() };
      return;
    }

    let node = this.root;
    let dist = levenshtein(word, node.word);

    while (node.children.has(dist)) {
      node = node.children.get(dist)!;
      dist = levenshtein(word, node.word);
      if (dist === 0) return; // duplicate
    }

    node.children.set(dist, { word, category, children: new Map() });
  }

  /** Find all words within maxDistance of the query. Returns best match only.
   *  Tie-breaking: shorter distance > content word > shorter word length. */
  search(query: string, maxDistance: number): SpellingMatch | null {
    if (!this.root) return null;

    let best: SpellingMatch | null = null;
    const stack: BKNode[] = [this.root];

    while (stack.length > 0) {
      const node = stack.pop()!;
      const dist = levenshtein(query, node.word);

      if (dist > 0 && dist <= maxDistance && node.word.length >= 3) {
        if (!best || isBetterMatch(dist, node, best)) {
          best = {
            word: node.word,
            category: node.category,
            distance: dist,
            normalized: getNormalized(node.word, node.category),
          };
        }
      }

      // Triangle inequality pruning: only explore children at distances [dist-max, dist+max]
      const lo = dist - maxDistance;
      const hi = dist + maxDistance;
      for (const [childDist, child] of node.children) {
        if (childDist >= lo && childDist <= hi) {
          stack.push(child);
        }
      }
    }

    return best;
  }
}

// ─── Spelling Correction ───────────────────────────────────────────────────
// Uses a BK-tree for O(log n) average-case fuzzy matching instead of O(n).
// The tree is built once at module load from the vocabulary tables.

interface SpellingMatch {
  word: string;
  category: POSCategory;
  distance: number;
  normalized?: string;
}

function getNormalized(word: string, category: POSCategory): string | undefined {
  if (category === 'direction') return dirWords[word];
  if (category === 'action') return actionWords[word];
  return undefined;
}

// Build BK-tree at module init
const bkTree = new BKTree();
for (const [word, category] of Object.entries(vocabulary)) {
  bkTree.insert(word, category);
}

export function correctSpelling(input: string, maxDistance = 2): SpellingMatch | null {
  if (input.length < 3) return null;
  return bkTree.search(input, maxDistance);
}


// ─── Viterbi Decoder ───────────────────────────────────────────────────────
// Given a sequence of words, find the most likely POS tag sequence
// using the bigram HMM model.

function emissionProb(word: string, category: POSCategory): number {
  const known = vocabulary[word];

  if (known !== undefined) {
    // Known word — high probability for its category, low for others
    return known === category ? 0.95 : 0.005;
  }

  // Unknown word — check spelling correction
  const correction = correctSpelling(word);
  if (correction) {
    // Misspelling: high prob for corrected word's category, scaled by distance
    const correctionConfidence = correction.distance === 1 ? 0.75 : 0.5;
    return correction.category === category ? correctionConfidence : 0.02;
  }

  // Completely unknown word — favor noun (most unknown words in adventure games are object names)
  if (category === 'noun') return 0.60;
  if (category === 'action') return 0.10;
  if (category === 'generic_verb') return 0.08;
  if (category === 'direction') return 0.03;
  return 0.02; // all other categories very unlikely for unknown words
}

/** Result of n-best Viterbi: multiple tag sequences ranked by probability. */
export interface ViterbiResult {
  tags: TaggedToken[];
  score: number;       // log probability of this path
  confidence: number;  // normalized 0–1 (relative to best path)
}

/**
 * N-best Viterbi decoder. Returns up to `nBest` tag sequences ranked by
 * path probability. When the best path is unambiguous (all known words),
 * only 1 result is returned. When words are ambiguous (unknown, misspelled,
 * or multi-category), multiple competing interpretations are returned.
 */
export function viterbiTag(words: string[], nBest = 1): TaggedToken[] {
  return viterbiNBest(words, nBest)[0]?.tags || [];
}

export function viterbiNBest(words: string[], nBest = 3): ViterbiResult[] {
  const n = words.length;
  if (n === 0) return [];

  const numCats = allCategories.length;

  // viterbi[i][c] = log probability of best path ending at position i with category c
  const vit: number[][] = Array.from({ length: n }, () => new Array(numCats).fill(-Infinity));
  const backptr: number[][] = Array.from({ length: n }, () => new Array(numCats).fill(0));

  // Initialization (position 0, from START)
  for (let c = 0; c < numCats; c++) {
    const cat = allCategories[c];
    const trans = Math.log(transitionProb['START'][cat]);
    const emit = Math.log(emissionProb(words[0], cat));
    vit[0][c] = trans + emit;
  }

  // Forward pass
  for (let i = 1; i < n; i++) {
    for (let c = 0; c < numCats; c++) {
      const cat = allCategories[c];
      const emit = Math.log(emissionProb(words[i], cat));

      let bestScore = -Infinity;
      let bestPrev = 0;

      for (let p = 0; p < numCats; p++) {
        const prevCat = allCategories[p];
        const score = vit[i - 1][p] + Math.log(transitionProb[prevCat][cat]);
        if (score > bestScore) {
          bestScore = score;
          bestPrev = p;
        }
      }

      vit[i][c] = bestScore + emit;
      backptr[i][c] = bestPrev;
    }
  }

  // Collect top-K final states by score
  const finals: Array<{ catIdx: number; score: number }> = [];
  for (let c = 0; c < numCats; c++) {
    finals.push({ catIdx: c, score: vit[n - 1][c] });
  }
  finals.sort((a, b) => b.score - a.score);

  // Deduplicate: only keep paths that produce different tag sequences
  const seen = new Set<string>();
  const results: ViterbiResult[] = [];
  const bestScore = finals[0].score;

  for (const final of finals) {
    if (results.length >= nBest) break;

    // Backtrace from this final state
    const path = new Array(n);
    path[n - 1] = final.catIdx;
    for (let i = n - 2; i >= 0; i--) {
      path[i] = backptr[i + 1][path[i + 1]];
    }

    const key = path.join(',');
    if (seen.has(key)) continue;
    seen.add(key);

    // Build tagged tokens for this path
    const tags: TaggedToken[] = [];
    for (let i = 0; i < n; i++) {
      const word = words[i];
      const cat = allCategories[path[i]];
      const known = vocabulary[word];

      let confidence: number;
      let corrected: string | undefined;
      let normalized: string | undefined;

      if (known !== undefined) {
        confidence = 1.0;
        normalized = getNormalized(word, known);
      } else {
        const correction = correctSpelling(word);
        if (correction && correction.category === cat) {
          confidence = correction.distance === 1 ? 0.85 : 0.6;
          corrected = correction.word;
          normalized = correction.normalized;
        } else {
          // Compute confidence from Viterbi scores (softmax over this position)
          const scores = allCategories.map((_, c) => vit[i][c]);
          const maxS = Math.max(...scores);
          const expSum = scores.reduce((sum, s) => sum + Math.exp(s - maxS), 0);
          confidence = Math.exp(vit[i][path[i]] - maxS) / expSum;
        }
      }

      tags.push({ word, category: cat, confidence, corrected, normalized });
    }

    // Normalize path score to 0–1 relative to best
    const relativeConfidence = Math.exp(final.score - bestScore);

    results.push({ tags, score: final.score, confidence: relativeConfidence });
  }

  return results;
}


// ─── Public API ────────────────────────────────────────────────────────────

export { vocabulary, allCategories, dirWords, actionWords };

/**
 * Generate encoded vocabulary data for StatisticalTagger.
 * Run: npx ts-node scripts/encode-tagger.ts
 * Outputs encoded constants to paste into StatisticalTagger.ts
 */
import { encodeString } from '../src/encoding';

// Encode a Record<string, string> — encode both keys and values
function encodeRecord(obj: Record<string, string>): string {
  const entries = Object.entries(obj).map(
    ([k, v]) => `  '${encodeString(k)}': '${encodeString(v)}'`
  );
  return `{\n${entries.join(',\n')}\n}`;
}

// Encode a string array
function encodeArray(arr: string[]): string {
  return `[${arr.map(w => `'${encodeString(w)}'`).join(', ')}]`;
}

// Direction words
const dirWords: Record<string, string> = {
  north: 'north', n: 'north', south: 'south', s: 'south',
  east: 'east', e: 'east', west: 'west', w: 'west',
  up: 'up', u: 'up', down: 'down', d: 'down',
  in: 'in', enter: 'in', inside: 'in',
  out: 'out', exit: 'out', outside: 'out',
  fore: 'north', f: 'north', bow: 'north', forward: 'north',
  aft: 'south', a: 'south', stern: 'south', astern: 'south',
  port: 'west', p: 'west', portside: 'west',
  starboard: 'east', sb: 'east', stbd: 'east',
};

// Action words
const actionWords: Record<string, string> = {
  look: 'look', l: 'look',
  examine: 'examine', x: 'examine', inspect: 'examine', analyze: 'examine', scan: 'examine', study: 'examine', describe: 'examine',
  take: 'take', get: 'take', grab: 'take', pick: 'take', pickup: 'take',
  drop: 'drop', discard: 'drop', leave: 'drop',
  use: 'use', apply: 'use', push: 'use', pull: 'use', turn: 'use', press: 'use', flip: 'use',
  tap: 'use', touch: 'use', poke: 'use',
  activate: 'use', deactivate: 'use', enable: 'use', disable: 'use',
  power: 'use', boot: 'use', reboot: 'use',
  switch: 'use', shut: 'use',
  fix: 'use', repair: 'use', patch: 'use', weld: 'use', install: 'use', replace: 'use', swap: 'use',
  combine: 'combine', attach: 'combine', connect: 'combine', join: 'combine', merge: 'combine',
  open: 'open', unlock: 'open', close: 'open',
  read: 'read', check: 'read', access: 'read', query: 'read',
  equip: 'equip', wear: 'equip', don: 'equip', put: 'equip',
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
  calculate: 'puzzle_action', compute: 'puzzle_action', set: 'puzzle_action',
  calibrate: 'puzzle_action', adjust: 'puzzle_action',
};

// Word category arrays
const movementWords = ['go', 'walk', 'move', 'run', 'head', 'climb'];
const questionWords = ['what', 'where', 'how', 'why', 'who', 'when', 'which', "what's", "where's", "who's", "how's"];
const modalWords = ['can', 'could', 'would', 'should', 'may', 'might', 'will', 'shall', "can't", "couldn't", "wouldn't", "shouldn't"];
const pronounWords = ['i', 'me', 'my', 'you', 'your', 'we', 'us', 'our', 'he', 'she', 'it', 'its', 'they', 'them', 'their', 'this', 'that', 'these', 'those', 'myself', 'yourself'];
const prepWords = ['at', 'to', 'on', 'in', 'with', 'from', 'into', 'around', 'about', 'of', 'for', 'by', 'through', 'over', 'under', 'between', 'against', 'onto'];
const articleWords = ['the', 'a', 'an', 'some', 'any', 'no', 'every'];
const conjunctionWords = ['and', 'or', 'but', 'nor', 'so', 'yet', 'then'];
const adverbWords = ['very', 'really', 'actually', 'just', 'also', 'please', 'maybe', 'perhaps', 'here', 'there', 'now', 'then', 'still', 'already', 'even', 'not', 'too', 'quite', 'rather'];
const genericVerbWords = ['is', 'are', 'was', 'were', 'be', 'been', 'being', 'am', 'do', 'does', 'did', 'done', 'have', 'has', 'had', 'having', 'eat', 'drink', 'feel', 'smell', 'taste', 'hear', 'see', 'know', 'think', 'tell', 'need', 'want', 'try', 'like', 'make', 'consist', 'contain', 'mean', 'work', 'happen', 'let', 'give', 'keep', 'seem', 'appear', 'become'];
const metaWords = ['yes', 'no', 'ok', 'okay', 'sure', 'right', 'well'];

console.log('// ─── ENCODED DIRECTION WORDS ───');
console.log('const _dirWords = ' + encodeRecord(dirWords) + ';');
console.log('');
console.log('// ─── ENCODED ACTION WORDS ───');
console.log('const _actionWords = ' + encodeRecord(actionWords) + ';');
console.log('');
console.log('// ─── ENCODED CATEGORY ARRAYS ───');
console.log('const _movementWords = ' + encodeArray(movementWords) + ';');
console.log('const _questionWords = ' + encodeArray(questionWords) + ';');
console.log('const _modalWords = ' + encodeArray(modalWords) + ';');
console.log('const _pronounWords = ' + encodeArray(pronounWords) + ';');
console.log('const _prepWords = ' + encodeArray(prepWords) + ';');
console.log('const _articleWords = ' + encodeArray(articleWords) + ';');
console.log('const _conjunctionWords = ' + encodeArray(conjunctionWords) + ';');
console.log('const _adverbWords = ' + encodeArray(adverbWords) + ';');
console.log('const _genericVerbWords = ' + encodeArray(genericVerbWords) + ';');
console.log('const _metaWords = ' + encodeArray(metaWords) + ';');

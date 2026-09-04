/**
 * The data files the runtime loads, and therefore the only ones the
 * decode/encode round-trip should touch. Shared so the two scripts
 * cannot drift apart.
 */
export const DATA_FILES = [
  'rooms.json', 'items.json', 'story.json', 'puzzles.json',
  'scenery.json', 'ship-systems.json', 'rejected-verbs.json',
  'messages.json', 'prompts.json', 'rules.json',
];

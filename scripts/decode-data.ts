/**
 * Decode all base64-encoded data files to plaintext JSON in data-plain/.
 * Run: npx ts-node scripts/decode-data.ts
 *
 * This gives you human-readable files to edit. When done, run
 * encode-from-plain.ts to write them back to src/data/ as base64.
 */
import * as fs from 'fs';
import * as path from 'path';
import { decodeObject } from '../src/encoding';

const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const PLAIN_DIR = path.join(__dirname, '..', 'data-plain');
const FILES = [
  'rooms.json', 'items.json', 'story.json', 'puzzles.json',
  'scenery.json', 'ship-systems.json', 'rejected-verbs.json',
  'messages.json', 'prompts.json', 'state-transitions.json',
];

if (!fs.existsSync(PLAIN_DIR)) fs.mkdirSync(PLAIN_DIR, { recursive: true });

for (const file of FILES) {
  const src = path.join(DATA_DIR, file);
  if (!fs.existsSync(src)) {
    console.log(`SKIP (not found): ${file}`);
    continue;
  }
  const raw = JSON.parse(fs.readFileSync(src, 'utf-8'));
  const decoded = decodeObject(raw);
  const dest = path.join(PLAIN_DIR, file);
  fs.writeFileSync(dest, JSON.stringify(decoded, null, 2), 'utf-8');
  console.log(`DECODED: ${file} -> data-plain/${file}`);
}

console.log('\nEdit files in data-plain/, then run: npx ts-node scripts/encode-from-plain.ts');

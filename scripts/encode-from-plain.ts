/**
 * Encode plaintext JSON from data-plain/ back to base64 in src/data/.
 * Run: npx ts-node scripts/encode-from-plain.ts
 *
 * Only encodes files that exist in data-plain/. Files not present
 * in data-plain/ are left untouched in src/data/.
 */
import * as fs from 'fs';
import * as path from 'path';
import { encodeObject } from '../src/encoding';

const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const PLAIN_DIR = path.join(__dirname, '..', 'data-plain');

if (!fs.existsSync(PLAIN_DIR)) {
  console.error('data-plain/ does not exist. Run decode-data.ts first.');
  process.exit(1);
}

const files = fs.readdirSync(PLAIN_DIR).filter(f => f.endsWith('.json'));

for (const file of files) {
  const src = path.join(PLAIN_DIR, file);
  const raw = JSON.parse(fs.readFileSync(src, 'utf-8'));
  const encoded = encodeObject(raw);
  const dest = path.join(DATA_DIR, file);
  fs.writeFileSync(dest, JSON.stringify(encoded, null, 2), 'utf-8');
  console.log(`ENCODED: data-plain/${file} -> src/data/${file}`);
}

console.log('\nDone. Run tests to verify: npm test');

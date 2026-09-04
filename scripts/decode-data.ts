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
import { DATA_FILES } from './data-files';

const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const PLAIN_DIR = path.join(__dirname, '..', 'data-plain');

/** Inverse of flattenRejectedVerbs in encode-from-plain.ts. */
function groupRejectedVerbs(decoded: any): any {
  if (!decoded?.verbs || !decoded?.responses) return decoded;

  const categories: Record<string, { verbs: string[]; responses: string[] }> = {};
  for (const [category, responses] of Object.entries<any>(decoded.responses)) {
    categories[category] = { verbs: [], responses };
  }
  for (const [verb, category] of Object.entries<any>(decoded.verbs)) {
    categories[category].verbs.push(verb);
  }

  return { categories };
}

const TRANSFORMS: Record<string, (decoded: any) => any> = {
  'rejected-verbs.json': groupRejectedVerbs,
};

if (!fs.existsSync(PLAIN_DIR)) fs.mkdirSync(PLAIN_DIR, { recursive: true });

for (const file of DATA_FILES) {
  const src = path.join(DATA_DIR, file);
  if (!fs.existsSync(src)) {
    console.log(`SKIP (not found): ${file}`);
    continue;
  }
  const raw = JSON.parse(fs.readFileSync(src, 'utf-8'));
  const decoded = (TRANSFORMS[file] ?? (x => x))(decodeObject(raw));
  const dest = path.join(PLAIN_DIR, file);
  fs.writeFileSync(dest, JSON.stringify(decoded, null, 2), 'utf-8');
  console.log(`DECODED: ${file} -> data-plain/${file}`);
}

console.log('\nEdit files in data-plain/, then run: npx ts-node scripts/encode-from-plain.ts');

/**
 * Encode plaintext JSON from data-plain/ back to base64 in src/data/.
 * Run: npx ts-node scripts/encode-from-plain.ts
 *
 * Only encodes the files the runtime loads (DATA_FILES, shared with
 * decode-data.ts). Anything else in data-plain/ is authoring scratch
 * and is skipped.
 */
import * as fs from 'fs';
import * as path from 'path';
import { decodeObject, encodeObject } from '../src/encoding';
import { DATA_FILES } from './data-files';

const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const PLAIN_DIR = path.join(__dirname, '..', 'data-plain');

/**
 * rejected-verbs.json is authored grouped by category — verbs sit next to the
 * responses they trigger — but Parser.ts loads two flat maps. Flatten on the
 * way in so the authoring format stays readable without duplicating responses.
 */
function flattenRejectedVerbs(raw: any): any {
  if (!raw?.categories) return raw;

  const verbs: Record<string, string> = {};
  const responses: Record<string, string[]> = {};

  for (const [category, group] of Object.entries<any>(raw.categories)) {
    responses[category] = group.responses;
    for (const verb of group.verbs) {
      if (verb in verbs) {
        throw new Error(
          `rejected-verbs.json: "${verb}" appears in both "${verbs[verb]}" and "${category}"`
        );
      }
      verbs[verb] = category;
    }
  }

  return { verbs, responses };
}

const TRANSFORMS: Record<string, (raw: any) => any> = {
  'rejected-verbs.json': flattenRejectedVerbs,
};

if (!fs.existsSync(PLAIN_DIR)) {
  console.error('data-plain/ does not exist. Run decode-data.ts first.');
  process.exit(1);
}

/**
 * Content that exists in src/data/ but not in data-plain/ was added to
 * src/data/ after the last decode, and encoding would silently discard it.
 * Compare decoded content rather than mtimes: encoding rewrites every
 * src/data/ file, so timestamps go stale on files that never actually changed.
 */
function droppedPaths(plain: unknown, data: unknown, at = ''): string[] {
  if (Array.isArray(data)) {
    if (!Array.isArray(plain)) return [at];
    return data.flatMap((v, i) =>
      i < plain.length ? droppedPaths(plain[i], v, `${at}[${i}]`) : [`${at}[${i}]`]
    );
  }
  if (data !== null && typeof data === 'object') {
    if (plain === null || typeof plain !== 'object' || Array.isArray(plain)) return [at];
    const p = plain as Record<string, unknown>;
    return Object.entries(data as Record<string, unknown>).flatMap(([k, v]) =>
      k in p ? droppedPaths(p[k], v, at ? `${at}.${k}` : k) : [at ? `${at}.${k}` : k]
    );
  }
  return [];
}

const stale = DATA_FILES.flatMap(file => {
  const plain = path.join(PLAIN_DIR, file);
  const data = path.join(DATA_DIR, file);
  if (!fs.existsSync(plain) || !fs.existsSync(data)) return [];
  const decoded = decodeObject(JSON.parse(fs.readFileSync(data, 'utf-8')));
  const authored = (TRANSFORMS[file] ?? (x => x))(JSON.parse(fs.readFileSync(plain, 'utf-8')));
  const dropped = droppedPaths(authored, decoded);
  return dropped.length ? [{ file, dropped }] : [];
});

const force = process.argv.includes('--force');

if (stale.length) {
  const verb = force ? 'Discarding' : 'Refusing to encode —';
  console.error(`${verb} src/data/ content that data-plain/ lacks:\n`);
  for (const { file, dropped } of stale) {
    console.error(`  ${file} (${dropped.length} ${force ? 'lost' : 'would be lost'})`);
    for (const p of dropped.slice(0, 5)) console.error(`      ${p}`);
    if (dropped.length > 5) console.error(`      ... and ${dropped.length - 5} more`);
  }
  if (!force) {
    console.error(
      '\nEncoding would discard the above. Re-run decode-data.ts to pull it in' +
        '\n(this overwrites data-plain/), then re-apply your edits.' +
        '\nIf the removal is deliberate (a rename, a deletion), re-run with --force.'
    );
    process.exit(1);
  }
  console.error('');
}

for (const file of DATA_FILES) {
  const src = path.join(PLAIN_DIR, file);
  if (!fs.existsSync(src)) {
    console.log(`SKIP (not in data-plain/): ${file}`);
    continue;
  }
  const raw = JSON.parse(fs.readFileSync(src, 'utf-8'));
  const encoded = encodeObject((TRANSFORMS[file] ?? (x => x))(raw));
  const dest = path.join(DATA_DIR, file);
  fs.writeFileSync(dest, JSON.stringify(encoded, null, 2), 'utf-8');
  console.log(`ENCODED: data-plain/${file} -> src/data/${file}`);
}

console.log('\nDone. Run tests to verify: npm test');

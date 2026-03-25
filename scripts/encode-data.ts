/**
 * Encode all story data JSON files in-place with base64 (keys + values).
 * Run: npx ts-node scripts/encode-data.ts
 * Handles migration from any prior format.
 */
import * as fs from 'fs';
import * as path from 'path';
import { encodeObject } from '../src/encoding';

const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const FILES = ['rooms.json', 'items.json', 'story.json', 'puzzles.json', 'scenery.json', 'ship-systems.json', 'rejected-verbs.json', 'messages.json', 'prompts.json', 'rules.json'];

const OLD_PREFIX = 'b64:';

/** Decode any prior encoding format back to plaintext */
function toPlaintext(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    // Strip old b64: prefix if present
    if (obj.startsWith(OLD_PREFIX)) {
      return Buffer.from(obj.slice(OLD_PREFIX.length), 'base64').toString('utf-8');
    }
    // Try base64 decode — if it round-trips, it was encoded; otherwise plaintext
    try {
      const decoded = Buffer.from(obj, 'base64').toString('utf-8');
      const reencoded = Buffer.from(decoded, 'utf-8').toString('base64');
      if (reencoded === obj && decoded !== obj) return decoded;
    } catch { /* not base64 */ }
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(item => toPlaintext(item));
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      // Keys might also be encoded
      const plainKey = typeof key === 'string' ? toPlaintext(key) as string : key;
      result[plainKey] = toPlaintext(val);
    }
    return result;
  }
  return obj;
}

for (const file of FILES) {
  const filepath = path.join(DATA_DIR, file);
  if (!fs.existsSync(filepath)) {
    console.log(`SKIP: ${file} (not found)`);
    continue;
  }

  const raw = fs.readFileSync(filepath, 'utf-8');
  const data = JSON.parse(raw);

  const plaintext = toPlaintext(data);
  const encoded = encodeObject(plaintext);
  fs.writeFileSync(filepath, JSON.stringify(encoded, null, 2) + '\n', 'utf-8');
  console.log(`ENCODED: ${file}`);
}

/**
 * Replace cardinal directions with nautical equivalents in all story data.
 * Only fixes directions in prose strings (>20 chars), not in IDs or short keys.
 *
 * Mapping: north→fore, south→aft, east→starboard, west→port
 * Also handles: "To the north" → "To fore", "NORTH" → "FORE", etc.
 */
import { decodeObject, encodeObject } from '../src/encoding';
import * as fs from 'fs';

const FILES = ['rooms.json', 'items.json', 'story.json', 'puzzles.json', 'scenery.json'];

// Replacements — order matters (longer phrases first to avoid partial matches)
type ReplacePair = [RegExp, (m: string) => string];
const replacements: ReplacePair[] = [
  // "To the north" style phrases
  [/\bto the north\b/gi, (m: string) => matchCase(m, 'to fore')],
  [/\bto the south\b/gi, (m: string) => matchCase(m, 'to aft')],
  [/\bto the east\b/gi, (m: string) => matchCase(m, 'to starboard')],
  [/\bto the west\b/gi, (m: string) => matchCase(m, 'to port')],
  // "from the north" style
  [/\bfrom the north\b/gi, (m: string) => matchCase(m, 'from fore')],
  [/\bfrom the south\b/gi, (m: string) => matchCase(m, 'from aft')],
  [/\bfrom the east\b/gi, (m: string) => matchCase(m, 'from starboard')],
  [/\bfrom the west\b/gi, (m: string) => matchCase(m, 'from port')],
  // "north end", "south wall" style compound phrases
  [/\bnorth end\b/gi, (m: string) => matchCase(m, 'fore end')],
  [/\bsouth end\b/gi, (m: string) => matchCase(m, 'aft end')],
  // Standalone direction words in prose
  [/\bnorth\b/gi, (m: string) => matchCase(m, 'fore')],
  [/\bsouth\b/gi, (m: string) => matchCase(m, 'aft')],
  [/\beast\b/gi, (m: string) => matchCase(m, 'starboard')],
  [/\bwest\b/gi, (m: string) => matchCase(m, 'port')],
];

function matchCase(original: string, replacement: string): string {
  if (original === original.toUpperCase()) return replacement.toUpperCase();
  if (original[0] === original[0].toUpperCase()) return replacement[0].toUpperCase() + replacement.slice(1);
  return replacement;
}

function fixDirections(text: string): string {
  let result = text;
  for (const [pattern, replaceFn] of replacements) {
    result = result.replace(pattern, replaceFn);
  }
  return result;
}

function fixObject(obj: unknown, path: string): unknown {
  if (typeof obj === 'string') {
    if (obj.length > 20) { // Only fix prose, not IDs
      const fixed = fixDirections(obj);
      if (fixed !== obj) {
        process.stdout.write(`FIXED @ ${path}:\n  OLD: ...${obj.substring(0, 120)}...\n  NEW: ...${fixed.substring(0, 120)}...\n\n`);
      }
      return fixed;
    }
    return obj;
  }
  if (Array.isArray(obj)) return obj.map((v, i) => fixObject(v, `${path}[${i}]`));
  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      result[k] = fixObject(v, `${path}.${k}`);
    }
    return result;
  }
  return obj;
}

for (const file of FILES) {
  const fp = `src/data/${file}`;
  if (!fs.existsSync(fp)) continue;
  const raw = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  const decoded = decodeObject(raw);
  const fixed = fixObject(decoded, file);
  const encoded = encodeObject(fixed);
  fs.writeFileSync(fp, JSON.stringify(encoded, null, 2) + '\n', 'utf-8');
  process.stdout.write(`Wrote: ${file}\n`);
}

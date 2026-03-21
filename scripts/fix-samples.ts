/**
 * Fix: lab references should distinguish between transmitted data (readings)
 * and physical objects (samples, specimens) which can't cross interstellar distances.
 * Physical samples should be synthesized/fabricated from probe data, not "collected."
 * Readings/data are fine as-is — they were transmitted.
 */
import { decodeObject, encodeObject } from '../src/encoding';
import * as fs from 'fs';

const files = ['scenery.json', 'rooms.json', 'items.json'];

for (const file of files) {
  const fp = `src/data/${file}`;
  if (!fs.existsSync(fp)) continue;
  const raw = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  const decoded = decodeObject(raw);
  let changed = false;

  const fix = (obj: unknown, path: string): unknown => {
    if (typeof obj === 'string') {
      let result = obj;
      // Fix any remaining references to physical specimens "collected" from 82 Eridani
      if (result.includes('biological survey specimens') ||
          result.includes('biological growth medium predictions') ||
          result.includes('biological growth media')) {
        result = result
          .replace(/biological survey specimens/g, 'biological viability models')
          .replace(/biological growth medium predictions/g, 'biological viability models')
          .replace(/biological growth media/g, 'biological viability models');
        if (result !== obj) {
          process.stdout.write(`FIXED @ ${path}\n`);
          changed = true;
        }
      }
      // Fix "specimens collected" patterns
      if (result.includes('specimens collected')) {
        result = result.replace(/specimens collected/g, 'models derived from data transmitted');
        process.stdout.write(`FIXED @ ${path}\n`);
        changed = true;
      }
      return result;
    }
    if (Array.isArray(obj)) return obj.map((v, i) => fix(v, `${path}[${i}]`));
    if (typeof obj === 'object' && obj !== null) {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        result[k] = fix(v, `${path}.${k}`);
      }
      return result;
    }
    return obj;
  };

  const fixed = fix(decoded, file);
  if (changed) {
    fs.writeFileSync(fp, JSON.stringify(encodeObject(fixed), null, 2) + '\n', 'utf-8');
    process.stdout.write(`Wrote: ${file}\n`);
  }
}
process.stdout.write('Done.\n');

import { decodeObject } from '../src/encoding';
import * as fs from 'fs';

const files = ['rooms.json', 'scenery.json', 'items.json'];
const terms = ['hydroponics', 'plants', 'crops', 'grow', 'harvest', 'nutrient', 'garden', 'vegetation', 'botanical'];

for (const file of files) {
  const fp = `src/data/${file}`;
  if (!fs.existsSync(fp)) continue;
  const raw = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  const decoded = decodeObject(raw);

  const find = (obj: unknown, path: string): void => {
    if (typeof obj === 'string' && terms.some(t => obj.toLowerCase().includes(t))) {
      // Don't print the content — just flag the path and length
      process.stdout.write(`${file} @ ${path} (${obj.length} chars)\n`);
    } else if (Array.isArray(obj)) {
      obj.forEach((v, i) => find(v, `${path}[${i}]`));
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        find(v, `${path}.${k}`);
      }
    }
  };
  find(decoded, '');
}
process.stdout.write('Done.\n');

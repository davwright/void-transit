import { decodeObject } from '../src/encoding';
import * as fs from 'fs';

const files = ['items.json', 'rooms.json', 'scenery.json', 'story.json', 'puzzles.json'];
const terms = ['chen', 'wei-lin', 'wei lin', 'woman', 'alone', 'seventeen months', '17 months'];

for (const file of files) {
  const fp = `src/data/${file}`;
  if (!fs.existsSync(fp)) continue;
  const raw = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  const decoded = decodeObject(raw);

  const find = (obj: unknown, path: string): void => {
    if (typeof obj === 'string' && terms.some(t => obj.toLowerCase().includes(t))) {
      process.stdout.write(`\n${file} @ ${path}:\n  ${obj.substring(0, 300)}\n`);
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
process.stdout.write('\nDone.\n');

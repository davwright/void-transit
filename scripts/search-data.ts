import { decodeObject } from '../src/encoding';
import * as fs from 'fs';
const items = decodeObject(JSON.parse(fs.readFileSync('src/data/items.json', 'utf-8'))) as any;
for (const item of items.items) {
  if (item.location === 'med_bay') {
    process.stdout.write(`${item.id} | "${item.name}" | loc=${item.location} | aliases=[${(item.aliases||[]).join(', ')}]\n`);
  }
}
// Also check scenery for med_bay
const scenery = decodeObject(JSON.parse(fs.readFileSync('src/data/scenery.json', 'utf-8'))) as any;
const medScenery = scenery.examineTargets?.med_bay || {};
process.stdout.write('\nmed_bay scenery keys: ' + Object.keys(medScenery).join(', ') + '\n');

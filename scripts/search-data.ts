import { decodeObject } from '../src/encoding';
import * as fs from 'fs';
const items = decodeObject(JSON.parse(fs.readFileSync('src/data/items.json', 'utf-8'))) as any;
for (const item of items.items) {
  if (item.id?.includes('log') || item.id?.includes('maintenance')) {
    process.stdout.write(`${item.id}: readable=${item.readable} readText=${item.readText ? 'yes(' + item.readText.length + ' chars)' : 'no'}\n`);
  }
}

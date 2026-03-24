import { decodeObject, encodeObject } from '../src/encoding';
import * as fs from 'fs';

const fp = 'src/data/items.json';
const data = decodeObject(JSON.parse(fs.readFileSync(fp, 'utf-8'))) as any;
let fixes = 0;

for (const item of data.items) {
  if (item.id === 'maintenance_log') {
    item.readable = true;
    // Use the examineDetail as readText since it contains the log content
    if (item.examineDetail && !item.readText) {
      item.readText = item.examineDetail;
    }
    fixes++;
    process.stdout.write('Fixed maintenance_log: readable=true, readText set\n');
  }
}

if (fixes > 0) {
  fs.writeFileSync(fp, JSON.stringify(encodeObject(data), null, 2) + '\n', 'utf-8');
  process.stdout.write('Wrote items.json\n');
}

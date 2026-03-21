import { decodeObject } from '../src/encoding';
import * as fs from 'fs';

const rooms = decodeObject(JSON.parse(fs.readFileSync('src/data/rooms.json', 'utf-8')));
for (const [id, room] of Object.entries((rooms as any).rooms)) {
  const r = room as any;
  for (const [dir, exit] of Object.entries(r.exits || {})) {
    if (typeof exit === 'object' && (exit as any).hidden) {
      process.stdout.write(`HIDDEN EXIT: ${id} → ${dir} → ${(exit as any).roomId}\n`);
    }
    if (typeof exit === 'object' && (exit as any).conditions) {
      process.stdout.write(`CONDITIONAL EXIT: ${id} → ${dir} → ${(exit as any).roomId} conditions=${JSON.stringify((exit as any).conditions)}\n`);
    }
  }
}
process.stdout.write('Done.\n');

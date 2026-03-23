import { decodeObject } from '../src/encoding';
import * as fs from 'fs';

// Check personal_photo and cryo items
const items = decodeObject(JSON.parse(fs.readFileSync('src/data/items.json', 'utf-8'))) as any;
for (const item of items.items) {
  if (item.id === 'personal_photo' || item.id === 'cryoprotectant_residue' || item.id === 'cryo_log') {
    process.stdout.write(`${item.id}: portable=${item.portable} hidden=${item.hidden} location=${item.location}\n`);
    process.stdout.write(`  name: "${item.name}" aliases: ${JSON.stringify(item.aliases)}\n\n`);
  }
}

// Check corridor_c exits for blocked fore
const rooms = decodeObject(JSON.parse(fs.readFileSync('src/data/rooms.json', 'utf-8'))) as any;
const cc = rooms.rooms?.corridor_c;
if (cc) {
  process.stdout.write('corridor_c exits: ' + JSON.stringify(cc.exits) + '\n');
  if (cc.conditions) process.stdout.write('corridor_c conditions: ' + JSON.stringify(cc.conditions) + '\n');
}

// Check what's blocking fore from corridor_c
const reactor = rooms.rooms?.reactor_room;
if (reactor?.conditions) {
  process.stdout.write('reactor_room conditions: ' + JSON.stringify(reactor.conditions) + '\n');
}

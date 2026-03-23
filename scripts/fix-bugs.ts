/**
 * Remove cheat-like hints and replace with mechanic hints.
 * Also update the help text to mention combine/use mechanics.
 */
import { decodeObject, encodeObject } from '../src/encoding';
import * as fs from 'fs';

// Remove the specific puzzle hints from scenery
const sceneryFp = 'src/data/scenery.json';
const sceneryData = decodeObject(JSON.parse(fs.readFileSync(sceneryFp, 'utf-8'))) as any;
const et = sceneryData.examineTargets;

// Delete the cheat hints we added
const toRemove = [
  ['life_support', 'scrubber housing'],
  ['life_support', 'access panel'],
  ['reactor_room', 'containment bolts'],
  ['reactor_room', 'shielding'],
  ['airlock_outer', 'hull'],
  ['electrical', 'junction'],
  ['engine_room', 'deceleration profile'],
];

let removed = 0;
for (const [room, key] of toRemove) {
  if (et[room]?.[key]) {
    delete et[room][key];
    removed++;
  }
}

fs.writeFileSync(sceneryFp, JSON.stringify(encodeObject(sceneryData), null, 2) + '\n', 'utf-8');
process.stdout.write(`Removed ${removed} cheat hints from scenery\n`);
process.stdout.write('Done.\n');

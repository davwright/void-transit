/**
 * Add revealsOnExamine to cryo_bay — examining pod reveals hidden items
 */
import { decodeObject, encodeObject } from '../src/encoding';
import * as fs from 'fs';

const roomsFp = 'src/data/rooms.json';
const rooms = decodeObject(JSON.parse(fs.readFileSync(roomsFp, 'utf-8'))) as any;
const cryo = rooms.rooms?.cryo_bay;

if (cryo) {
  // Examining any of these scenery targets reveals the hidden items
  cryo.revealsOnExamine = {
    'pod': ['datapad', 'personal_photo'],
    'my pod': ['datapad', 'personal_photo'],
    'storage': ['datapad', 'personal_photo'],
    'storage compartment': ['datapad', 'personal_photo'],
    'compartment': ['datapad', 'personal_photo'],
  };

  // Remove the openTargets approach (it only worked with "open" command)
  if (cryo.openTargets?.pod) delete cryo.openTargets.pod;

  fs.writeFileSync(roomsFp, JSON.stringify(encodeObject(rooms), null, 2) + '\n', 'utf-8');
  process.stdout.write('Added revealsOnExamine to cryo_bay\n');
}

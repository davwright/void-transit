/**
 * Hide datapad and photo in cryo_bay — revealed by examining the pod.
 * Also add "hello"/"help" responses for confused players.
 */
import { decodeObject, encodeObject } from '../src/encoding';
import * as fs from 'fs';

// Hide datapad and photo
const itemsFp = 'src/data/items.json';
const items = decodeObject(JSON.parse(fs.readFileSync(itemsFp, 'utf-8'))) as any;
for (const item of items.items) {
  if (item.id === 'datapad' && item.location === 'cryo_bay') {
    item.hidden = true;
    process.stdout.write('Hidden: datapad\n');
  }
  if (item.id === 'personal_photo' && item.location === 'cryo_bay') {
    item.hidden = true;
    process.stdout.write('Hidden: personal_photo\n');
  }
}
fs.writeFileSync(itemsFp, JSON.stringify(encodeObject(items), null, 2) + '\n', 'utf-8');

// Add pod examine that reveals items
const roomsFp = 'src/data/rooms.json';
const rooms = decodeObject(JSON.parse(fs.readFileSync(roomsFp, 'utf-8'))) as any;
const cryo = rooms.rooms?.cryo_bay;
if (cryo) {
  // Add examineTargets that reveal items
  if (!cryo.examineTargets) cryo.examineTargets = {};

  // Make examining the pod reveal the datapad and photo
  if (!cryo.openTargets) cryo.openTargets = {};
  cryo.openTargets['pod'] = {
    message: 'You lean back into the pod, reaching into the storage compartment at the base. Your fingers find familiar shapes — a datapad and a photograph, stowed before cryo.',
    revealsItem: 'datapad',
  };
}
fs.writeFileSync(roomsFp, JSON.stringify(encodeObject(rooms), null, 2) + '\n', 'utf-8');

// Add "hello" handling to rejected verbs
const verbsFp = 'src/data/rejected-verbs.json';
const verbs = decodeObject(JSON.parse(fs.readFileSync(verbsFp, 'utf-8'))) as any;
verbs.verbs['hello'] = 'social';
verbs.verbs['hi'] = 'social';
verbs.verbs['help me'] = 'social';
// Add cryo-specific social responses
verbs.responses.social.push('Your voice comes out as a dry croak. The sound dies in the cold air. No one answers.');
verbs.responses.social.push('You try to speak. Your throat is raw from cryoprotectant. The word comes out as a rasp that wouldn\'t carry three meters.');
fs.writeFileSync(verbsFp, JSON.stringify(encodeObject(verbs), null, 2) + '\n', 'utf-8');

process.stdout.write('Done.\n');

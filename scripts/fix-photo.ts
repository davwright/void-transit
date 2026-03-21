/**
 * Fix: Add Chen's photograph as a separate item in crew_quarters.
 * personal_photo stays where it was originally (cryo_bay, the player's own photo).
 * Chen's photo is a new item, hidden under the pillow / in the locker.
 */
import { decodeObject, encodeObject } from '../src/encoding';
import * as fs from 'fs';

// 1. Restore personal_photo to cryo_bay (it's the player's photo)
const itemsFp = 'src/data/items.json';
const itemsRaw = JSON.parse(fs.readFileSync(itemsFp, 'utf-8'));
const items = decodeObject(itemsRaw);

for (const item of (items as any).items) {
  if (item.id === 'personal_photo') {
    item.location = 'cryo_bay';
    item.hidden = false;
    process.stdout.write('Restored personal_photo to cryo_bay\n');
  }
}

// 2. Add Chen's photograph as a new item
const chensPhoto = {
  id: 'chen_photograph',
  name: "Chen's Photograph",
  aliases: ['chen photo', 'framed photo', 'framed photograph', 'river photo', 'locker photo'],
  description: "A small framed photograph showing a woman standing at the edge of a river, mountains rising behind her, the light golden and warm. She is looking directly at the camera with a slight smile and steady eyes. The frame is simple brushed aluminum, standard ship-issue. On the back, in neat handwriting: 'Yangtze headwaters, 2184. Last trip before departure.' The woman is Chen Wei-Lin.",
  portable: true,
  weight: 0.1,
  location: 'crew_quarters',
  hidden: true,
  examineDetail: "The woman in the photograph stands on a rocky bank, the Yangtze's headwaters rushing behind her. She wears hiking gear, her hair pulled back, squinting slightly against the sun. Her expression is calm, confident -- someone who has not yet learned what seventeen months alone on a dying ship will do to a person. The date on the back places this photo three years before launch. The frame has been handled often -- the aluminum is worn smooth at the edges where fingers have held it.",
  readable: false,
};

(items as any).items.push(chensPhoto);
process.stdout.write('Added chen_photograph item\n');

fs.writeFileSync(itemsFp, JSON.stringify(encodeObject(items), null, 2) + '\n', 'utf-8');
process.stdout.write('Wrote items.json\n\n');

// 3. Update crew_quarters room: add chen_photograph to items, set openTargets to reveal it
const roomsFp = 'src/data/rooms.json';
const roomsRaw = JSON.parse(fs.readFileSync(roomsFp, 'utf-8'));
const rooms = decodeObject(roomsRaw);
const cq = (rooms as any).rooms.crew_quarters;

// Add to room items list
if (!cq.items.includes('chen_photograph')) {
  cq.items.push('chen_photograph');
}

// Update examineTargets for pillow to mention the photo is visible
if (!cq.examineTargets) cq.examineTargets = {};
cq.examineTargets['pillow'] = "The pillow bears the persistent dent of a head, compressed by months of nightly use. A single dark hair rests across its surface. Tucked partly underneath, the corner of a small framed photograph peeks out.";

// Update openTargets for locker to reveal chen_photograph
if (!cq.openTargets) cq.openTargets = {};
cq.openTargets['pillow'] = {
  message: 'You lift the pillow. Underneath, a small framed photograph lies face-down on the mattress.',
  revealsItem: 'chen_photograph'
};

// Remove the old photo/picture examineTargets (those were placeholders)
delete cq.examineTargets['photo'];
delete cq.examineTargets['picture'];

fs.writeFileSync(roomsFp, JSON.stringify(encodeObject(rooms), null, 2) + '\n', 'utf-8');
process.stdout.write('Wrote rooms.json\n');

// 4. Update scenery.json — update the photograph scenery entry to reference Chen's photo
const sceneryFp = 'src/data/scenery.json';
const sceneryRaw = JSON.parse(fs.readFileSync(sceneryFp, 'utf-8'));
const scenery = decodeObject(sceneryRaw);
const cqScenery = (scenery as any).examineTargets?.crew_quarters;
if (cqScenery) {
  cqScenery['photograph'] = "You can see the corner of a small framed photograph peeking out from under the pillow on the used bunk. You'd need to lift the pillow to see it properly.";
  cqScenery['photo'] = cqScenery['photograph'];
}

fs.writeFileSync(sceneryFp, JSON.stringify(encodeObject(scenery), null, 2) + '\n', 'utf-8');
process.stdout.write('Wrote scenery.json\n');
process.stdout.write('Done.\n');

/**
 * Fix tournament-exposed bugs:
 * 1. cryo_log should be portable (it's a printed log)
 * 2. Add vague hints about items and using them to room descriptions
 */
import { decodeObject, encodeObject } from '../src/encoding';
import * as fs from 'fs';

// Fix cryo_log portability
const itemsFp = 'src/data/items.json';
const itemsData = decodeObject(JSON.parse(fs.readFileSync(itemsFp, 'utf-8'))) as any;
let itemFixes = 0;
for (const item of itemsData.items) {
  if (item.id === 'cryo_log') {
    item.portable = true;
    item.weight = 0.1;
    process.stdout.write('Fixed cryo_log: now portable\n');
    itemFixes++;
  }
}
if (itemFixes > 0) {
  fs.writeFileSync(itemsFp, JSON.stringify(encodeObject(itemsData), null, 2) + '\n', 'utf-8');
}

// Add vague hints to scenery entries where items can be used
const sceneryFp = 'src/data/scenery.json';
const sceneryData = decodeObject(JSON.parse(fs.readFileSync(sceneryFp, 'utf-8'))) as any;
const et = sceneryData.examineTargets;
let sceneryFixes = 0;

function addHint(room: string, key: string, text: string) {
  if (!et[room]) et[room] = {};
  if (et[room][key]) return; // don't overwrite
  et[room][key] = text;
  sceneryFixes++;
}

// Life support — hint about replacing the scrubber
addHint('life_support', 'scrubber housing', 'The scrubber housing for quadrant three has a set of quick-release latches on its access panel. The housing is designed for field replacement — slide the old cartridge out, slide a new one in. Standard maintenance procedure, assuming you have a replacement cartridge.');

addHint('life_support', 'access panel', 'Four quick-release latches hold the scrubber access panel shut. The latches are designed to be operable by one person in an emergency. Inside, you can see the edge of the installed cartridge — dark gray where it should be white.');

// Reactor room — hint about shielding and tools
addHint('reactor_room', 'containment bolts', 'The containment bolts securing the reactor shielding panels are recessed hex-heads, each one requiring precisely calibrated torque. Too loose and containment fails; too tight and the bolts shear under thermal expansion. Not a job for bare hands or a general-purpose tool.');

addHint('reactor_room', 'shielding', 'The reactor shielding panels show subtle misalignment along their mounting tracks — a few millimeters of drift that has accumulated over years of thermal cycling. The gap is just wide enough to let radiation through. Fixing it would require re-torquing the containment bolts to specification.');

// Hull breach area — hint about sealant
addHint('airlock_outer', 'hull', 'The outer hull is visible through the porthole — kilometers of composite and steel, all of it cold. Somewhere out there, a micrometeorite strike has compromised the pressure vessel. A sealant rated for vacuum and thermal extremes would be needed for any repair.');

// Electrical — hint about cable
addHint('electrical', 'junction', 'The main distribution junction shows where power from the reactor splits to feed every system on the ship. Three circuits are tripped. Restoring them would require either resetting the breakers or running new cable to bypass the damaged sections.');

// Engine room — hint about fuel discrepancy
addHint('engine_room', 'deceleration profile', 'The planned deceleration burn is a precisely calculated sequence — months of gradual braking to shed interstellar velocity. The burn equations on the forward display use the expected fuel mass. But if the actual fuel mass differs from the expected value, the numbers change. Someone should check.');

fs.writeFileSync(sceneryFp, JSON.stringify(encodeObject(sceneryData), null, 2) + '\n', 'utf-8');
process.stdout.write(`Added ${sceneryFixes} hint entries to scenery\n`);
process.stdout.write('Done.\n');

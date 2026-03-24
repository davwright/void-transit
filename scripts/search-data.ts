import { decodeObject, encodeObject } from '../src/encoding';
import * as fs from 'fs';

// Update cryo_bay scenery — examining "pod" or "my pod" should reveal items
const sceneryFp = 'src/data/scenery.json';
const scenery = decodeObject(JSON.parse(fs.readFileSync(sceneryFp, 'utf-8'))) as any;
const cryo = scenery.examineTargets?.cryo_bay;
if (cryo) {
  // Override pod description to hint at the storage compartment
  cryo['my pod'] = 'Your cryo pod. The lid is open, the interior still wet with cryoprotectant. The monitoring leads dangle from the headrest. At the base, a small storage compartment is ajar — standard issue for personal effects during long transit.';
  process.stdout.write('Updated "my pod" scenery\n');
}
fs.writeFileSync(sceneryFp, JSON.stringify(encodeObject(scenery), null, 2) + '\n', 'utf-8');

// Also remove the [Type HELP] line from the intro — let them figure it out
const msgFp = 'src/data/messages.json';
const msgs = decodeObject(JSON.parse(fs.readFileSync(msgFp, 'utf-8'))) as any;
if (msgs.intro && msgs.intro.includes('[Type HELP')) {
  msgs.intro = msgs.intro.replace(/\n\[Type HELP[^\]]*\]\n/, '\n');
  fs.writeFileSync(msgFp, JSON.stringify(encodeObject(msgs), null, 2) + '\n', 'utf-8');
  process.stdout.write('Removed [Type HELP] from intro\n');
}

process.stdout.write('Done.\n');

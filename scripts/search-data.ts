import { decodeObject } from '../src/encoding';
import * as fs from 'fs';
const story = decodeObject(JSON.parse(fs.readFileSync('src/data/story.json', 'utf-8'))) as any;
for (const act of story.acts || []) {
  for (const beat of act.beats || []) {
    const text = (beat.text || '').toLowerCase();
    if (text.includes('wake') || text.includes('detonation') || text.includes('do not wake')) {
      process.stdout.write('Beat: ' + beat.id + ' (act: ' + act.id + ')\n');
      process.stdout.write('  trigger: ' + JSON.stringify(beat.trigger) + '\n');
      process.stdout.write('  text[0:120]: ' + (beat.text || '').substring(0, 120) + '\n\n');
    }
  }
}
// Also check cryo_bay firstVisit
const rooms = decodeObject(JSON.parse(fs.readFileSync('src/data/rooms.json', 'utf-8'))) as any;
const cryo = rooms.rooms?.cryo_bay;
if (cryo?.firstVisit) {
  process.stdout.write('cryo_bay firstVisit[0:120]: ' + cryo.firstVisit.substring(0, 120) + '\n');
}

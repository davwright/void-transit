/**
 * Fix: Remove cryo_bay firstVisit (intro already covers waking up)
 * and change beat_wake trigger so it doesn't fire alongside the intro.
 */
import { decodeObject, encodeObject } from '../src/encoding';
import * as fs from 'fs';

// Remove cryo_bay firstVisit
const roomsFp = 'src/data/rooms.json';
const rooms = decodeObject(JSON.parse(fs.readFileSync(roomsFp, 'utf-8'))) as any;
if (rooms.rooms?.cryo_bay?.firstVisit) {
  delete rooms.rooms.cryo_bay.firstVisit;
  fs.writeFileSync(roomsFp, JSON.stringify(encodeObject(rooms), null, 2) + '\n', 'utf-8');
  process.stdout.write('Removed cryo_bay firstVisit\n');
}

// Change beat_wake trigger from game_start to first move out of cryo
const storyFp = 'src/data/story.json';
const story = decodeObject(JSON.parse(fs.readFileSync(storyFp, 'utf-8'))) as any;
for (const act of story.acts || []) {
  for (const beat of act.beats || []) {
    if (beat.id === 'beat_wake') {
      // Trigger on first look in cryo_bay instead of game_start
      beat.trigger = { type: 'room_visit', room: 'cryo_bay', firstOnly: true };
      process.stdout.write('Changed beat_wake trigger to room_visit/cryo_bay\n');
    }
  }
}
fs.writeFileSync(storyFp, JSON.stringify(encodeObject(story), null, 2) + '\n', 'utf-8');
process.stdout.write('Done.\n');

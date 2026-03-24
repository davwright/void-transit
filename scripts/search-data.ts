import { decodeObject, encodeObject } from '../src/encoding';
import * as fs from 'fs';

// Remove trailing ═══ line from intro
const fp = 'src/data/messages.json';
const msgs = decodeObject(JSON.parse(fs.readFileSync(fp, 'utf-8'))) as any;
if (msgs.intro) {
  // Remove the last line of ═══
  msgs.intro = msgs.intro.replace(/\n═+$/, '');
  fs.writeFileSync(fp, JSON.stringify(encodeObject(msgs), null, 2) + '\n', 'utf-8');
  process.stdout.write('Removed trailing ═══ from intro\n');
}

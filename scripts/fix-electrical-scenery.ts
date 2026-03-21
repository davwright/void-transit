import { decodeObject, encodeObject } from '../src/encoding';
import * as fs from 'fs';

const fp = 'src/data/scenery.json';
const data = decodeObject(JSON.parse(fs.readFileSync(fp, 'utf-8'))) as any;
const et = data.examineTargets;

if (!et.electrical) et.electrical = {};
let count = 0;
function add(key: string, text: string) {
  if (et.electrical[key]) return;
  et.electrical[key] = text;
  count++;
}

add('bus bar', 'The main distribution bus bar runs the full length of the room — a heavy copper conductor the width of your forearm, bolted to ceramic standoff insulators rated for thousands of amperes. Where it has been recently cleaned, the copper gleams bright and warm. Where it hasn\'t, green-black patina maps the years of galvanic corrosion in the ship\'s humid recycled atmosphere. The cleaning was selective — someone maintained only the sections that mattered most, the junctions where power splits to critical systems.');

add('bus', et.electrical['bus bar']);
add('bar', et.electrical['bus bar']);
add('copper', et.electrical['bus bar']);

add('circuit breakers', 'Rows of magnetic circuit breakers line the starboard bulkhead, each one labeled with the system it protects. Most are in the ON position, their indicators green. Three are tripped — amber indicators showing the circuits they guard have exceeded safe current draw. The tripped breakers are labeled in small block letters that you\'d need to step closer to read.');

add('breakers', et.electrical['circuit breakers']);

fs.writeFileSync(fp, JSON.stringify(encodeObject(data), null, 2) + '\n', 'utf-8');
process.stdout.write('Added ' + count + ' entries to electrical room.\n');

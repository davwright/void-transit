/**
 * Fix: CO2 scrubbers in hydroponics bay are scientifically wrong.
 * Plants ARE the CO2 scrubbers — photosynthesis converts CO2 to O2.
 * The bay should have ventilation fans that bring CO2-rich air TO the plants,
 * not mechanical scrubbers that remove CO2.
 */
import { decodeObject, encodeObject } from '../src/encoding';
import * as fs from 'fs';

const fp = 'src/data/scenery.json';
const raw = JSON.parse(fs.readFileSync(fp, 'utf-8'));
const decoded = decodeObject(raw) as any;

const hydroTargets = decoded.examineTargets?.hydroponics;
if (!hydroTargets) { process.stdout.write('No hydroponics scenery found.\n'); process.exit(); }

let changed = false;

// Check scrubber entries
for (const key of ['scrubbers', 'co2 scrubbers', 'co2_scrubbers']) {
  if (hydroTargets[key]) {
    const old = hydroTargets[key] as string;
    if (old.toLowerCase().includes('scrubber')) {
      // Replace — the plants themselves are the scrubbers, the overhead units are circulation fans
      hydroTargets[key] = 'The overhead ventilation units cycle air from the rest of the ship through the hydroponics bay — or they did, when the bay was active. The design is elegant: CO2-rich air from the crew decks is drawn in through intake vents, passes over the plant beds where photosynthesis converts it to oxygen, and the oxygen-enriched air is pushed back into the ship\'s circulation. The plants are the scrubbers. The fans just move the air. Right now, with half the growth troughs dark and the surviving plants stressed, the system is running at a fraction of its designed capacity. The fans still turn, but the air that leaves is barely different from the air that enters.';
      process.stdout.write(`FIXED: ${key}\n`);
      changed = true;
    }
  }
}

if (changed) {
  fs.writeFileSync(fp, JSON.stringify(encodeObject(decoded), null, 2) + '\n', 'utf-8');
  process.stdout.write('Wrote scenery.json\n');
} else {
  process.stdout.write('No scrubber references found to fix.\n');
}

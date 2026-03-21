/**
 * Fix CO2 scrubber naming confusion:
 * - co2_scrubber_cartridge (item 23, cargo bay) = the fresh replacement. Keep as "CO2 Scrubber Cartridge"
 * - co2_filter (item 56, life support) = the spent unit installed in the system. Rename to "Spent CO2 Scrubber Unit"
 * Remove overlapping aliases so "scrubber" and "filter" resolve unambiguously.
 */
import { decodeObject, encodeObject } from '../src/encoding';
import * as fs from 'fs';

const fp = 'src/data/items.json';
const raw = JSON.parse(fs.readFileSync(fp, 'utf-8'));
const decoded = decodeObject(raw);
const items = decoded.items as Array<Record<string, unknown>>;

let fixes = 0;

for (const item of items) {
  if (item.id === 'co2_scrubber_cartridge') {
    // Fresh replacement cartridge — remove "filter" aliases, keep "cartridge" and "scrubber cartridge"
    item.aliases = ['cartridge', 'scrubber cartridge', 'co2 cartridge', 'fresh cartridge'];
    process.stdout.write(`FIXED co2_scrubber_cartridge aliases: ${JSON.stringify(item.aliases)}\n`);
    fixes++;
  }

  if (item.id === 'co2_filter') {
    // Spent unit in life support — rename clearly, distinct aliases
    item.name = 'Spent CO2 Scrubber Unit';
    item.aliases = ['spent scrubber', 'scrubber unit', 'old scrubber', 'co2 scrubber', 'scrubber'];
    item.description = 'The active CO2 scrubber unit in the quadrant three housing. Its status indicator glows a steady amber — the absorption medium is well past its rated service life.';
    process.stdout.write(`FIXED co2_filter → name: "${item.name}", aliases: ${JSON.stringify(item.aliases)}\n`);
    fixes++;
  }
}

if (fixes > 0) {
  const encoded = encodeObject(decoded);
  fs.writeFileSync(fp, JSON.stringify(encoded, null, 2) + '\n', 'utf-8');
  process.stdout.write(`\nWrote ${fixes} fixes to ${fp}\n`);
}

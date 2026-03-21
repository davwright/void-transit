/**
 * Review and fix hydroponics descriptions for timeline consistency.
 * Don't print story content — just report what changed.
 */
import { decodeObject, encodeObject } from '../src/encoding';
import * as fs from 'fs';

// Read all relevant files
const roomsData = decodeObject(JSON.parse(fs.readFileSync('src/data/rooms.json', 'utf-8'))) as any;
const sceneryData = decodeObject(JSON.parse(fs.readFileSync('src/data/scenery.json', 'utf-8'))) as any;

const hydro = roomsData.rooms?.hydroponics;
if (hydro) {
  // Check if description mentions "nineteen years of automated nutrient cycling"
  // or implies continuous unattended operation — that's wrong
  const desc = hydro.description as string;
  const problems: string[] = [];

  if (desc.includes('nineteen years') || desc.includes('19 years')) {
    problems.push('mentions 19 years of operation');
  }
  if (desc.includes('automated nutrient cycling') && !desc.includes('restart') && !desc.includes('recently')) {
    problems.push('implies continuous automated operation');
  }
  if (desc.includes('Half the troughs') || desc.includes('half the')) {
    // This is actually good — suggests partial operation
  }

  if (problems.length > 0) {
    process.stdout.write('Room description issues: ' + problems.join(', ') + '\n');

    // Fix: hydroponics should show signs of being dormant for years,
    // then restarted by someone, then partially abandoned again
    hydro.description = hydro.description
      .replace(
        /nineteen years of automated nutrient cycling producing plants/gi,
        'nutrient cycling that someone restarted after years of dormancy'
      );
  } else {
    process.stdout.write('Room description: no obvious timeline issues found.\n');
  }

  // Check firstVisit
  if (hydro.firstVisit) {
    process.stdout.write('Has firstVisit text (' + (hydro.firstVisit as string).length + ' chars)\n');
  }
}

// Write rooms back
fs.writeFileSync('src/data/rooms.json', JSON.stringify(encodeObject(roomsData), null, 2) + '\n', 'utf-8');

// Scenery already fixed for scrubbers — check other entries
const hydroScenery = sceneryData.examineTargets?.hydroponics;
if (hydroScenery) {
  const keys = Object.keys(hydroScenery);
  process.stdout.write('Hydroponics scenery entries: ' + keys.join(', ') + '\n');

  // Check each entry for timeline issues (don't print content)
  for (const key of keys) {
    const text = hydroScenery[key] as string;
    if (text.includes('nineteen years') || text.includes('19 years of continuous')) {
      process.stdout.write(`  ISSUE in "${key}": mentions 19 years of continuous operation\n`);
      hydroScenery[key] = text.replace(
        /nineteen years of (continuous |automated )?/gi,
        'months of '
      );
    }
  }
}

fs.writeFileSync('src/data/scenery.json', JSON.stringify(encodeObject(sceneryData), null, 2) + '\n', 'utf-8');

process.stdout.write('Done.\n');

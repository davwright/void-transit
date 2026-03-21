/**
 * Add critical missing scenery targets — nouns mentioned in room descriptions
 * that players will naturally try to examine. Focus on interactive-sounding objects.
 * NO STORY CONTENT PRINTED.
 */
import { decodeObject, encodeObject } from '../src/encoding';
import * as fs from 'fs';

const sceneryFp = 'src/data/scenery.json';
const sceneryData = decodeObject(JSON.parse(fs.readFileSync(sceneryFp, 'utf-8'))) as any;
const et = sceneryData.examineTargets;

let count = 0;
function add(room: string, key: string, text: string) {
  if (!et[room]) et[room] = {};
  if (et[room][key]) return; // don't overwrite existing
  et[room][key] = text;
  count++;
}

// === CAPTAIN'S QUARTERS ===
add('captains_quarters', 'panel', 'The biometric panel beside the door glows a steady red — access denied. It requires the captain\'s biometric credentials: retinal scan, fingerprint, or both. The panel\'s surface is clean, no smudges or wear marks. It has not been used in a very long time. Or it has been cleaned very recently.');
add('captains_quarters', 'biometric panel', et.captains_quarters?.['panel'] || 'The biometric panel beside the door glows a steady red — access denied.');
add('captains_quarters', 'door', 'Standard shipboard construction — steel with a foam core for sound insulation. The nameplate reads CPT. A. LINDQVIST -- PRIVATE. The biometric panel beside the handle glows red. The door is locked.');
add('captains_quarters', 'nameplate', 'CPT. A. LINDQVIST -- PRIVATE. The lettering is laser-etched into a brushed steel plate, standard fleet issue. Lindqvist. The captain. You have not met her. You have not met anyone.');
add('captains_quarters', 'bunk', 'A narrow bunk with magnetic restraints for zero-g sleep, the sheets tucked with military precision. The mattress shows the faintest impression of a body — someone slept here regularly before cryo. A photo is mag-clipped to the wall above it.');
add('captains_quarters', 'desk', 'A fold-down desk bolted to the bulkhead, its surface covered with printed star charts and handwritten calculations. The volume of work is staggering for one person.');
add('captains_quarters', 'locker', 'The open locker contains a few personal effects and a personal datapad, neatly arranged.');

// === BRIDGE ===
add('bridge', 'panel', 'Multiple display panels line the bridge console, each cycling through status readouts. Several show amber error states. The navigation panel dominates the center, flanked by communications and systems oversight stations.');

// === CRYO BAY ===
add('cryo_bay', 'alarm', 'A faint alarm chimes at the edge of hearing — steady, patient, insistent. It has been sounding for a while. The tone is designed to wake crew from cryo without causing cardiac distress, a frequency that bypasses panic and speaks directly to the brainstem.');
add('cryo_bay', 'floor', 'The deck plates are cold beneath your feet — cold enough to feel through standard-issue boots. A thin film of condensation makes the surface treacherous. Cryoprotectant residue pools in the seams between plates, a viscous blue-green fluid that smells of glycol and something organic.');
add('cryo_bay', 'pod', 'Your cryo pod. The lid is open, the interior still wet with cryoprotectant. The monitoring leads are disconnected, dangling from the headrest. The pod\'s display shows your revival sequence: EMERGENCY REVIVAL -- AUTOMATIC -- triggered by a system event you do not yet understand.');
add('cryo_bay', 'pods', 'Rows of cryo pods stretch into the amber-lit dimness. Most are occupied — their status lights a steady green, their occupants dreaming whatever dreams frozen neurons produce. One pod, four rows down, is open and empty.');
add('cryo_bay', 'viewport', 'A narrow viewport set into the hull shows a sliver of the void outside. Stars, steady and unblinking. No atmosphere to make them twinkle. Just points of light in an infinite dark.');

// === CORRIDOR B ===
add('corridor_b', 'kiosk', 'The central information kiosk displays the ship\'s status in broad strokes. The timestamp is hours old. Several metrics are flagged amber but the summary insists: ALL SYSTEMS NOMINAL. The word NOMINAL feels like it\'s trying too hard.');
add('corridor_b', 'hub', 'You are standing in Deck B\'s central hub — the widest open space on the ship, a circular junction where corridors radiate outward like spokes of a wheel.');

// === MED BAY ===
add('med_bay', 'autodoc', 'The autodoc is a reclining pod bristling with articulated instrument arms, like the legs of a sleeping spider. Its status display shows READY. A tray of instruments sits beside it — gauze, sutures, retractors, scalpel — laid out in procedural order. They have been used.');
add('med_bay', 'tray', 'The instrument tray holds surgical implements laid out in precise procedural order. Gauze, sutures, retractors, scalpel. They have been used and sterilized, but not put away. Someone performed a procedure and left everything in place.');
add('med_bay', 'instruments', et.med_bay?.['tray'] || 'Surgical instruments in procedural order.');

// === MESS HALL ===
add('mess_hall', 'table', 'The nearest table holds a single abandoned meal — a bowl of reconstituted soup, its surface skinned over with a thin membrane of dried protein. The condensation ring beneath it has evaporated long ago. The meal was set down and never finished.');
add('mess_hall', 'meal', et.mess_hall?.['table'] || 'An abandoned meal.');
add('mess_hall', 'soup', 'The soup has been sitting here for months. Its surface has skinned over, dried to a papery membrane. Beneath it, the liquid has thickened to a gel. The smell is faint — the ship\'s air recycling has long since carried away the worst of it.');
add('mess_hall', 'chopsticks', 'A pair of lacquered bamboo chopsticks rests across the bowl at a precise angle — the habit of someone taught proper table etiquette. Near the base of each stick, two characters are engraved: the owner\'s name.');

// === CORRIDOR C ===
add('corridor_c', 'rungs', 'Steel rungs set into the bulkhead lead upward toward Deck B and downward toward the spine passage. The handholds are cold, slightly greasy with condensation from the thermal differential between decks.');
add('corridor_c', 'ladder', et.corridor_c?.['rungs'] || 'Steel rungs between decks.');
add('corridor_c', 'boot prints', 'Boot prints in the fine dust that coats the deck plating. A single set, repeated over many passages — the same boots, the same stride, worn into a visible path by months of solitary transit. The prints lead in every direction, evidence of one person doing the work of fourteen.');

// === CORRIDOR D ===
add('corridor_d', 'passage', 'The spine passage runs the length of the ship\'s lowest deck — a narrow corridor with the structural feel of a submarine. Conduit and pipe run along the ceiling in dense bundles. The air is noticeably colder here, closer to the hull.');

// === ENGINE ROOM ===
add('engine_room', 'nozzle', 'The magnetic nozzle dominates the aft end of the compartment — the throat where fusion exhaust will be channeled during the deceleration burn. It is massive, elegant in its engineering, and currently cold. The ship has been coasting for nineteen years.');

// === LAB ===
add('lab', 'bench', 'The adjacent bench holds the remains of an active research project — star charts, spectral printouts, and a terminal displaying analysis results. The work is recent, methodical, and deeply focused on a single subject.');
add('lab', 'terminal', 'A research terminal displaying the last active session. The login screen shows recent database queries related to stellar physics and orbital mechanics. The session is locked.');

// === LIFE SUPPORT ===
add('life_support', 'panel', 'The monitoring panel shows the ship\'s atmospheric status. Three amber lights blink in a slow rhythm — each one a system operating outside normal parameters. The numbers tell the story: CO2 is rising, oxygen is dropping, and one reading doesn\'t belong at all.');

// === MACHINE SHOP ===
add('machine_shop', 'workbench', 'The central workbench runs the length of the compartment, scarred with decades of use — burn marks, tool gouges, the stains of a hundred different lubricants and solvents. Someone has been using it recently. The most recent marks are sharp and clean, not yet worn smooth by time.');
add('machine_shop', 'tools', 'Hand tools hang on a pegboard in their white outlines — most are in their places, a few are missing. The organizational system is military in its precision. Every tool has a home, and every absence is visible.');

process.stdout.write('Added ' + count + ' missing scenery entries.\n');
fs.writeFileSync(sceneryFp, JSON.stringify(encodeObject(sceneryData), null, 2) + '\n', 'utf-8');
process.stdout.write('Wrote scenery.json\n');

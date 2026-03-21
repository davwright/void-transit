/**
 * Second pass: add remaining physical objects that players would naturally try to examine.
 * Focus on noun phrases that the gap finder flagged but the first pass missed.
 */
import { decodeObject, encodeObject } from '../src/encoding';
import * as fs from 'fs';

const sceneryFp = 'src/data/scenery.json';
const sceneryData = decodeObject(JSON.parse(fs.readFileSync(sceneryFp, 'utf-8'))) as any;
const et = sceneryData.examineTargets;

let count = 0;
const perRoom: Record<string, number> = {};

function add(room: string, key: string, text: string) {
  if (!et[room]) et[room] = {};
  if (et[room][key]) return;
  et[room][key] = text;
  count++;
  perRoom[room] = (perRoom[room] || 0) + 1;
}

// =============================================================================
// BRIDGE — viewport alias, console, platform, overhead lights
// =============================================================================
add('bridge', 'forward viewport', et.bridge?.['viewport'] || 'The forward viewport dominates the bridge.');
add('bridge', 'central console', et.bridge?.['console'] || 'The central console shows navigation data.');
add('bridge', 'raised platform', 'The captain\'s chair sits on a raised platform at the center of the bridge, elevated perhaps twenty centimeters above the surrounding deck. The elevation is symbolic as much as practical -- a clear line of sight to every station, and the unspoken authority of height.');
add('bridge', 'overhead lights', 'The overhead lights are locked in blue-shift nightwatch mode, casting the bridge in a dim, cold luminescence that deepens shadows and drains color from every surface. The mode is designed for rest periods, to encourage melatonin production in crew who should be sleeping. No one ordered this setting.');

// =============================================================================
// COMMS ROOM — console, main display, speaker
// =============================================================================
add('comms_room', 'central console', et.comms_room?.['console'] || 'The central console controls the deep-space antenna array.');
add('comms_room', 'main display', 'The main display dominates the forward wall, showing the ship\'s communication log in scrolling columns. Position reports, signal buffers, antenna status, frequency allocations. The display is the room\'s focal point -- everything the ship hears and says passes through here.');
add('comms_room', 'display', et.comms_room?.['main display'] || 'The main communications display.');
add('comms_room', 'overhead speaker', 'The overhead speaker that erupted with static when you entered now sits silent, a standard-issue communications monitor mounted flush in the ceiling tile. Its grille is clean, its indicator light dark. Whatever caused that burst of static, the speaker has returned to silence.');
add('comms_room', 'queue', 'The incoming signal buffer shows one data packet in the queue, received 11 hours ago. The packet header identifies it as a response to an outgoing transmission -- a transmission you did not send, encrypted with credentials that are not yours. The queue holds it patiently, waiting for someone to open it.');

// =============================================================================
// CORRIDOR B — junction, kiosk already exists, spokes
// =============================================================================
add('corridor_b', 'circular junction', et.corridor_b?.['hub'] || 'Deck B\'s central hub.');
add('corridor_b', 'junction', et.corridor_b?.['hub'] || 'Deck B\'s central hub.');

// =============================================================================
// MED BAY — reclining pod alias, starboard wall, port wall, scrolling list
// =============================================================================
add('med_bay', 'reclining pod', et.med_bay?.['autodoc'] || 'The autodoc pod.');
add('med_bay', 'surgical arms', 'The autodoc\'s articulated surgical arms are folded in standby position, each one a multi-jointed limb ending in interchangeable tool attachments. In operation, they move with inhuman precision -- faster and steadier than any human hand. In standby, they look like the legs of a sleeping spider, folded tight against the pod\'s housing.');
add('med_bay', 'starboard wall', 'Pharmaceutical cabinets line the starboard wall, their glass fronts revealing neat rows of labeled vials, blister packs, and emergency hyposprays. One cabinet stands open, its contents partially depleted. The glass is clean, the labels legible, the organization precise.');
add('med_bay', 'port wall', 'The diagnostic terminal occupies the port wall, its display showing crew biometric data in a continuous scroll. Heart rates, neural activity, core temperatures -- the vital signs of cryogenic suspension, slow and glacial. The terminal hums quietly, monitoring lives it cannot wake.');
add('med_bay', 'scrolling list', et.med_bay?.['biometric data'] || 'Crew biometric data scrolling on the terminal.');

// =============================================================================
// MESS HALL — galley/aft wall, tables
// =============================================================================
add('mess_hall', 'aft wall', 'The galley occupies the aft wall -- induction cooktops, a water dispenser, racks of vacuum-sealed ration packs. The equipment is institutional, designed for efficiency rather than culinary ambition. The cooktops are cold, the dispenser on standby, the rations untouched except for one opened pack set aside on the counter.');
add('mess_hall', 'induction cooktops', et.mess_hall?.['cooktops'] || 'Induction cooktops in the galley.');

// =============================================================================
// LAB — sample cabinet, spectrometer (aliases), stage/slide
// =============================================================================
add('lab', 'stage', 'The microscope stage holds a prepared slide, still in position from the last session. The slide clamp is engaged, the eyepieces adjusted for someone\'s vision -- someone shorter than you. Whatever is on this slide was important enough to leave in place.');
add('lab', 'microscope', et.lab?.['microscopy station'] || 'The microscopy station.');

// =============================================================================
// CREW QUARTERS — datapad, paperback
// =============================================================================
add('crew_quarters', 'datapad', 'The shaped foam cutout in the locker\'s top shelf is rectangular, roughly the size of a standard datapad. The cutout is empty -- whatever was stored here has been removed. The foam retains the impression perfectly, a negative space in the shape of something missing.');
add('crew_quarters', 'paperback', et.crew_quarters?.['book'] || 'A worn paperback.');
add('crew_quarters', 'robinson', et.crew_quarters?.['book'] || 'A worn Kim Stanley Robinson paperback.');

// =============================================================================
// HYDROPONICS — label, strange plant aliases, corner, troughs
// =============================================================================
add('hydroponics', 'label', 'A handwritten label is stuck to the edge of the small, separate trough. The handwriting is small and precise. The label identifies the plant by a designation that is not in the mission\'s agricultural manifest.');
add('hydroponics', 'plant', et.hydroponics?.['strange plant'] || 'The unusual dark-leafed plant.');
add('hydroponics', 'dark plant', et.hydroponics?.['strange plant'] || 'The unusual dark-leafed plant.');
add('hydroponics', 'trough', et.hydroponics?.['troughs'] || 'Growth troughs stretching the length of the bay.');
add('hydroponics', 'corner', 'A small trough is tucked into the corner near the atmospheric exchange vent, separate from the main rows. It contains a single plant -- dark-leafed, almost black, with a thick succulent stem. The placement is deliberate, positioned to benefit from the warm, CO2-rich air flowing through the vent.');

// =============================================================================
// REC ROOM — table, knight, rook, chairs
// =============================================================================
add('rec_room', 'table', et.rec_room?.['chess table'] || 'The chess table.');
add('rec_room', 'knight', 'White\'s remaining knight occupies f1, defensive but passive. Both bishops are gone, traded away in the middlegame. The knight is magnetic, adhering to the board with quiet permanence, unmoved by vibration or drift.');
add('rec_room', 'rook', 'Black\'s rook occupies the seventh rank -- the second rank from white\'s perspective -- where it exerts maximum pressure on white\'s position. The piece is magnetic, placed with deliberate care. The position it creates is suffocating.');
add('rec_room', 'queen', 'Black\'s queen controls the center of the board, the most powerful piece in its most dominant position. Supported by the rook on the seventh rank, it threatens checkmate in three moves. There is nothing white can do about it.');

// =============================================================================
// CORRIDOR C — conduit (alias), ozone (alias)
// =============================================================================
add('corridor_c', 'power distribution', 'The power distribution systems to port hum with the electrical smell of ozone. Heavy cable runs feed from the reactor through distribution panels to every system on the ship. The hum is louder here than anywhere in habitation -- the sound of raw power being routed and managed.');
add('corridor_c', 'ozone smell', et.corridor_c?.['ozone'] || 'The sharp smell of ozone.');

// =============================================================================
// REACTOR ROOM — containment, console alias
// =============================================================================
add('reactor_room', 'primary containment', 'The primary containment readout shows steady state -- all green, all nominal. The primary magnetic bottle holds the plasma at 152.3 million degrees, unfailing and precise. It is the secondary containment that stutters, cycling through amber alerts that the automated systems correct but cannot resolve permanently.');
add('reactor_room', 'secondary containment', et.reactor_room?.['magnetic bottle'] || 'The secondary magnetic bottle cycling through amber alerts.');
add('reactor_room', 'amber alerts', 'The secondary magnetic bottle cycles through amber alerts at irregular intervals -- every few minutes, the containment field flickers, the automated systems compensate, and the alert clears. Then it happens again. The pattern is irregular enough to resist prediction but consistent enough to suggest an underlying cause.');

// =============================================================================
// MACHINE SHOP — freight door alias, bins
// =============================================================================
add('machine_shop', 'freight door', 'A heavy freight door occupies the aft wall, large enough to move equipment pallets through. Beyond it lies the cargo bay. The door slides on industrial tracks, heavy gauge, designed for loads that the habitation doors never need to handle. Its surface is scratched from years of pallet traffic.');
add('machine_shop', 'bins', 'Wall-mounted bins hold raw metal stock organized by material and dimension -- aluminum bar, steel rod, titanium plate, copper sheet. The bins are labeled and inventoried. Some show recent withdrawals; the inventory tags have been updated in the same small, precise handwriting visible throughout the ship.');
add('machine_shop', 'cutting fluid', 'The air smells of cutting fluid -- a thin, mineral-scented lubricant used during machining operations. The smell is fresh, not stale, suggesting recent use of the CNC unit or lathe. Cutting fluid residue glistens on the workbench surface near the drill press.');

// =============================================================================
// LIFE SUPPORT — scrubbers alias, co2
// =============================================================================
add('life_support', 'co2 scrubbers', et.life_support?.['scrubbers'] || 'CO2 scrubbers lining the forward bulkhead.');
add('life_support', 'co2', et.life_support?.['scrubbers'] || 'The CO2 scrubbing system.');
add('life_support', 'trace gas', 'The trace gas analysis shows elevated levels of an organic compound the system has flagged but cannot identify. Concentration: 0.003 PPM. Within safety parameters. Source: unknown. The compound\'s molecular signature doesn\'t match anything in the ship\'s chemical database.');
add('life_support', 'organic compound', et.life_support?.['anomaly'] || 'An unidentified organic compound in the atmosphere.');

// =============================================================================
// ELECTRICAL — bus bar alias, distribution
// =============================================================================
add('electrical', 'main distribution', et.electrical?.['bus bar'] || 'The main distribution bus bar.');
add('electrical', 'distribution bus', et.electrical?.['bus bar'] || 'The main distribution bus bar.');

// =============================================================================
// CARGO BAY — weapons locker alias, containers alias
// =============================================================================
add('cargo_bay', 'weapons', et.cargo_bay?.['weapons locker'] || 'The sealed weapons locker.');
add('cargo_bay', 'equipment', 'Agricultural equipment, prefabricated habitat modules, medical supplies -- the containers hold everything a colony needs to establish itself on a new world. Each container is sealed, labeled, and secured against the decades of transit. The contents represent the cumulative investment of a civilization.');

// =============================================================================
// CORRIDOR D — warm panel alias, wall alias
// =============================================================================
add('corridor_d', 'warm wall', et.corridor_d?.['warm spot'] || 'The warm section of wall.');
add('corridor_d', 'panel', et.corridor_d?.['warm panel'] || 'The warm panel in the corridor wall.');
add('corridor_d', 'bulkhead', 'Standard corridor bulkheads -- access panels, maintenance hatches, conduit runs. The walls are crowded with the ship\'s infrastructure, functional rather than aesthetic. One section between sections 7 and 8 radiates warmth that should not be there.');

// =============================================================================
// CRYO BAY — viewport alias, monitoring station alias
// =============================================================================
add('cryo_bay', 'window', et.cryo_bay?.['viewport'] || 'A narrow viewport in the hull.');
add('cryo_bay', 'narrow viewport', et.cryo_bay?.['viewport'] || 'A narrow viewport in the hull.');
add('cryo_bay', 'brushed steel', 'Each cryo pod is a sarcophagus of brushed steel, cold to the touch, frosted along the viewport seams. The steel has a matte finish designed to resist corrosion in the high-humidity environment of the cryo bay. Condensation beads on every surface, running in slow rivulets down the curved housings.');
add('cryo_bay', 'steel', et.cryo_bay?.['brushed steel'] || 'Brushed steel cryo pod housings.');
add('cryo_bay', 'hum', 'The hum of the cooling systems vibrates through the deck plates -- a deep mechanical drone that is the loudest sound in the bay apart from your breathing. The frequency is low enough to feel in your chest, a constant reminder that thousands of lives depend on these systems running without interruption.');
add('cryo_bay', 'breathing', 'Your own breathing, amplified by the cold, quiet space. Each exhalation produces a small cloud of visible moisture that drifts and disperses. The sound of your breath is the second loudest thing in the cryo bay, after the cooling systems. You are the only warm thing in this room.');

// =============================================================================
// ENGINE ROOM — nozzle aliases, consoles, status
// =============================================================================
add('engine_room', 'magnetic nozzle', et.engine_room?.['nozzle'] || 'The magnetic nozzle assembly.');
add('engine_room', 'plasma', 'During burns, superheated deuterium-helium-3 plasma would flow through the magnetic nozzle at temperatures exceeding 150 million degrees. Now the chamber is cold, the plasma injectors sealed, the magnetic containment on standby. The nozzle\'s interior surface carries a faint iridescent sheen from nineteen years of residual plasma interactions.');
add('engine_room', 'fuel reserve', et.engine_room?.['fuel'] || 'The fuel reserve percentage.');
add('engine_room', 'status', 'Engine status shows the drive in cold standby -- plasma injectors sealed, magnetic containment on minimum, thrust vectoring locked neutral. The system is nominal for coast phase. But the fuel consumption data shows a discrepancy that should not exist when the drive is off.');

// =============================================================================
// FUEL STORAGE — tanks aliases, diagnostics
// =============================================================================
add('fuel_storage', 'diagnostics', 'Detailed diagnostics are available through the monitoring station -- flow logs, pressure history, temperature trends, maintenance records. The diagnostics for tanks 1 through 5 are unremarkable. Tank 6\'s diagnostics tell a different story: pressure fluctuations, temperature differentials, and a fill level that doesn\'t match projections.');
add('fuel_storage', 'fill level', 'Tank 6 shows a fill level of 87.3% against a projected 94.1%. The discrepancy represents a significant quantity of fuel -- deuterium and helium-3 that should be there but isn\'t. During coast phase, with the drive shut down, fuel levels should not change at all.');
add('fuel_storage', 'walls', 'The walls of the monitoring station are lined with tank status displays, six in total, each showing the same parameters in identical format. The visual uniformity makes Tank 6\'s anomalous readings stand out immediately -- one display telling a different story from the other five.');
add('fuel_storage', 'monitors', et.fuel_storage?.['tank monitors'] || 'Six tank status monitors line the walls.');

// =============================================================================
// AIRLOCK INNER — polycarbonate, suit 3
// =============================================================================
add('airlock_inner', 'polycarbonate', 'The helmet visor is polycarbonate -- impact-resistant, optically clear, treated with anti-fog and anti-scratch coatings. Faint wipe marks are visible on the surface where someone cleaned it recently. The visor is the interface between the wearer and the void, and someone has been keeping it meticulously maintained.');
add('airlock_inner', 'maintenance cradle', et.airlock_inner?.['cradle'] || 'Suit maintenance cradles.');
add('airlock_inner', 'maintenance cradles', et.airlock_inner?.['cradle'] || 'Suit maintenance cradles.');
add('airlock_inner', 'gloves', 'EVA gloves sit in each suit\'s maintenance cradle -- thick, articulated, designed to preserve dexterity while protecting against vacuum, temperature extremes, and radiation. The gloves on Suit 3 show wear at the fingertips, consistent with extended manual work on hull surfaces.');

// =============================================================================
// AIRLOCK OUTER — door, stars, temperature
// =============================================================================
add('airlock_outer', 'outer door', 'The outer door is the last barrier between the ship\'s atmosphere and the void. It is heavy, industrial, sealed with mechanical and electromagnetic locks. Through the porthole, absolute darkness. The door\'s cycling mechanism takes 90 seconds -- long enough to reconsider, long enough to commit.');
add('airlock_outer', 'door', et.airlock_outer?.['outer door'] || 'The outer airlock door.');
add('airlock_outer', 'stars', 'Through the porthole, when a star drifts into view, it is a hard, unwinking point of light -- no atmosphere to soften it, no diffraction, just raw photons from a fusion reactor light-years away arriving at your retina with geometric precision. The stars do not comfort. They simply are.');
add('airlock_outer', 'temperature', 'The status display reads -270.4 Celsius -- just 2.75 degrees above absolute zero. The temperature of interstellar space, the near-absence of all thermal energy. Beyond the outer door, heat is a memory, warmth a theoretical concept. Your suit\'s thermal regulation is the only thing that would prevent you from cooling to match.');
add('airlock_outer', 'radiation', 'Radiation levels read nominal -- the word refers to the baseline flux of cosmic rays and solar wind particles that permeate interstellar space. Nominal does not mean zero. Your suit provides shielding, but extended EVA accumulates dose. The numbers tick upward slowly, counting particles that pass through you.');

// =============================================================================
// HULL EXTERIOR — ship, antenna, reflector
// =============================================================================
add('hull_exterior', 'ship', 'The ISV Kepler\'s Promise stretches away from you in both directions -- a kilometer of engineered metal, sensor arrays forward, drive nozzle aft, the habitation ring visible as a bulge amidships. At 36,000 kilometers per second, it is among the fastest objects ever built by human hands. From out here, it looks fragile.');
add('hull_exterior', 'kepler', et.hull_exterior?.['ship'] || 'The ISV Kepler\'s Promise.');
add('hull_exterior', 'antenna', 'The hand-built antenna array sits in the cavity where hull plating was removed -- a parabolic reflector fabricated from machined components, aimed at a fixed point in the void. It is enormous, far too large for standard communications. Its construction is precise, the work of someone with engineering training and access to the machine shop.');
add('hull_exterior', 'antenna array', et.hull_exterior?.['antenna'] || 'The hand-built antenna array.');
add('hull_exterior', 'reflector', 'The parabolic reflector is the antenna\'s primary component -- a curved dish fabricated from machined aluminum, its surface polished to a mirror finish. The dish is aimed at coordinates that correspond to no known astronomical object. Its diameter suggests it is designed for receiving or transmitting at extreme range.');
add('hull_exterior', 'coordinates', 'Your suit\'s navigation overlay identifies the antenna\'s target coordinates. The system cross-references against its star catalog, its known relay stations, its mapped objects. No match. The coordinates point to empty space -- nothing charted, nothing expected, nothing that should be there.');
add('hull_exterior', 'target', et.hull_exterior?.['coordinates'] || 'The antenna\'s target coordinates.');

// === OUTPUT SUMMARY ===
process.stdout.write('=== Pass 2: Scenery entries added per room ===\n');
const sortedRooms = Object.entries(perRoom).sort(([a], [b]) => a.localeCompare(b));
for (const [room, n] of sortedRooms) {
  process.stdout.write(`  ${room}: ${n}\n`);
}
process.stdout.write(`\nTotal new entries (pass 2): ${count}\n`);

// === WRITE ===
fs.writeFileSync(sceneryFp, JSON.stringify(encodeObject(sceneryData), null, 2) + '\n', 'utf-8');
process.stdout.write('Wrote scenery.json\n');

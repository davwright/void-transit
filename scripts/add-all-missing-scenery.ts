/**
 * Comprehensive pass: add ALL missing scenery examine targets for every room.
 * Every physical noun/noun phrase mentioned in room descriptions that a player
 * could reasonably try to examine gets an entry.
 * NO STORY CONTENT PRINTED to stdout.
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
  if (et[room][key]) return; // don't overwrite existing
  et[room][key] = text;
  count++;
  perRoom[room] = (perRoom[room] || 0) + 1;
}

// =============================================================================
// BRIDGE
// =============================================================================
add('bridge', 'instrumentation', 'Banks of instruments arc around the captain\'s chair in a crescent of glass and brushed steel. Navigation, communications, systems oversight -- each station alive with scrolling data and status readouts. The screens cast shifting light across the ceiling, blue and amber alternating like a slow argument between normalcy and alarm.');
add('bridge', 'glass', 'The forward viewport is reinforced quartz, not glass -- a distinction that matters when the only thing between you and vacuum is a transparent slab engineered to withstand micrometeorite impacts at relativistic speeds. It is flawless, without scratch or blemish, and through it the stars hang motionless and sharp.');
add('bridge', 'quartz', 'Reinforced quartz, rated for impact resistance at speeds up to 15% of lightspeed. The viewport is a single piece, manufactured in orbital foundries where gravity wouldn\'t warp the cooling process. Its surface is cold to the touch -- space bleeds heat through it despite the insulating layers.');
add('bridge', '82 eridani', 'You search the starfield through the viewport but cannot distinguish 82 Eridani from the thousands of surrounding points of light. The navigation display insists it is there, dead ahead, a K0V main sequence star still 22.7 years away at current velocity. Your destination. Your future. Indistinguishable from background noise.');
add('bridge', 'eridani', et.bridge?.['82 eridani'] || 'The navigation display marks it dead ahead.');
add('bridge', 'secondary display', 'The secondary display cycles through the long-range sensor feed. Spectral data, gravitational measurements, radiation levels -- all the instruments the ship uses to see ahead. Near the center of the feed, an amber marker blinks with quiet insistence: a gravitational anomaly flagged but never reviewed, sitting at coordinates near 82 Eridani.');
add('bridge', 'sensor', et.bridge?.['sensor feed'] || 'The long-range sensor feed.');
add('bridge', 'duty stations', 'Three duty stations curve around the captain\'s chair: navigation to port, communications center, systems oversight to starboard. Each has its own console, display array, and seat with restraint harness. Every screen is active, cycling through data that no one is watching. The stations are designed for efficiency -- everything within arm\'s reach, nothing wasted.');
add('bridge', 'error states', 'Several screens cycle through amber error states, text scrolling too fast to read in full. You catch fragments: ALIGNMENT DRIFT, RECALIBRATION REQUIRED, SENSOR ARRAY ANOMALY. None appear critical. All appear unaddressed. The errors have been accumulating, each one a small question that no one has answered.');
add('bridge', 'amber', et.bridge?.['error states'] || 'Amber error states scroll across several screens.');
add('bridge', 'nightwatch', 'The overhead lights are locked in blue-shift nightwatch mode -- a circadian-management protocol designed to promote crew rest during off-duty hours. But there are no duty hours. There is no crew awake to rest. The lighting mode was either set deliberately or triggered by a system that doesn\'t know the difference between midnight and the absence of everyone.');

// =============================================================================
// CORRIDOR A
// =============================================================================
add('corridor_a', 'shadow', 'Your shadow stretches behind you, elongated and strange in the low-angle emergency track lighting. It moves when you move, stops when you stop. It is the only thing in this corridor that responds to your presence.');
add('corridor_a', 'emergency lighting', 'Emergency track lighting runs along the base of both walls at floor level, casting a pale clinical wash upward. The strips are rated for 10,000 hours of continuous operation. They are not the primary lighting system -- those remain off, or were never turned on.');
add('corridor_a', 'chemical tang', 'The air carries a faint chemical sharpness -- metallic, acrid, like the ghost of a soldering iron left on a joint too long. It is stronger here than on the bridge. The ventilation system should have scrubbed this from the atmosphere hours ago. Either it can\'t, or the source is still active.');
add('corridor_a', 'tang', et.corridor_a?.['chemical tang'] || 'A faint chemical sharpness in the air.');
add('corridor_a', 'bridge access hatch', 'The bridge access hatch is a standard shipboard pressure door, heavier gauge than internal doors, with a manual override wheel and a status indicator showing atmosphere on both sides. It stands open.');
add('corridor_a', 'communications suite', 'The door to the communications suite stands to port, vibrating with the low hum of signal processing equipment running continuously. The door is standard issue, unremarkable, labeled COMMS in stenciled lettering.');

// =============================================================================
// CAPTAIN'S QUARTERS
// =============================================================================
add('captains_quarters', 'bulkhead', 'Standard shipboard bulkhead construction -- pressed steel panels over structural ribs, painted institutional grey. The safe is recessed into the lower section beneath the desk. Above the bunk, the bulkhead shows the faint rectangular ghost of adhesive residue where something else once hung beside the photo.');
add('captains_quarters', 'personal terminal', 'The personal terminal\'s screen traces lazy Lissajous curves in the dark -- the default screen saver, two frequencies slowly drifting in and out of phase. The terminal is powered but idle, waiting for input. The keyboard shows uneven wear on certain keys.');
add('captains_quarters', 'screen', et.captains_quarters?.['personal terminal'] || 'The terminal traces Lissajous curves.');
add('captains_quarters', 'lissajous', 'The screen saver traces Lissajous curves -- two perpendicular sine waves at slightly different frequencies, their ratio irrational, never quite repeating. The pattern has been running long enough to leave a faint persistence image on the display. A physicist\'s default. Or a mathematician\'s.');
add('captains_quarters', 'datapad', 'A personal datapad rests on the pillow, its screen dark but not locked. Standard fleet issue, ruggedized for shipboard use. The casing shows scratches and wear from months of daily handling.');
add('captains_quarters', 'mattress', 'The narrow mattress bears the faintest impression of a body, compressed by weeks or months of regular use. The magnetic restraints for zero-g sleep are unbuckled and pushed aside. The sheets are pulled taut with military precision on one side and rumpled on the other, as though the occupant had a restless night.');
add('captains_quarters', 'restraints', et.captains_quarters?.['magnetic restraints'] || 'Magnetic restraints for zero-g sleep.');
add('captains_quarters', 'children', 'The photo shows a woman and two children on a rocky shore. The children are young -- perhaps five and eight -- bundled in winter coats, laughing. Their faces are clear, unguarded, caught in the middle of something joyful. They are 19.3 light-years away, and nineteen years older than in this image.');

// =============================================================================
// COMMS ROOM
// =============================================================================
add('comms_room', 'signal processors', 'Signal processors line every available surface, their indicator lights blinking in patterns that correspond to the constant background hum of deep-space signal processing. Each unit handles a different frequency band, filtering the electromagnetic noise of the cosmos for anything that might be information.');
add('comms_room', 'electronics', 'Every surface is studded with displays and signal processing equipment. The room hums with quiet electronic industry -- machines listening to the void on every frequency, analyzing, filtering, waiting for signals that may never come. Or that already have.');
add('comms_room', 'communication log', 'The main display shows the ship\'s communication log -- a long column of automated position reports, one every 72 hours, transmitted faithfully into the void. Each entry is identical in format: timestamp, coordinates, velocity, heading, systems status. A species talking to itself across distances that make conversation impossible.');
add('comms_room', 'position reports', et.comms_room?.['communication log'] || 'Automated position reports sent every 72 hours.');
add('comms_room', 'indicators', 'The status board is a constellation of indicators -- mostly red and amber where green should dominate. Antenna alignment, signal strength, receiver sensitivity, noise floor. Several subsystems are degraded, running on backup parameters. The board tells a story of gradual drift and no one to correct it.');
add('comms_room', 'status indicators', et.comms_room?.['indicators'] || 'Red and amber indicators on the status board.');
add('comms_room', 'azimuth readout', 'The high-gain antenna\'s azimuth readout drifts slowly across the display -- a fraction of a degree every few minutes. During coast phase, with no thrust or maneuvering, this drift should be impossible. Something has knocked the antenna off its calibrated alignment, or something is actively moving it.');
add('comms_room', 'high-gain antenna', et.comms_room?.['azimuth readout'] || 'The azimuth readout is drifting.');

// =============================================================================
// CORRIDOR B
// =============================================================================
add('corridor_b', 'ring', 'The centrifugal ring rotates around the ship\'s spine, generating 0.7g of simulated gravity through angular momentum. You can\'t feel the rotation directly, but the Coriolis effect is subtle and real -- drop something and it curves slightly as it falls. The ring connects the habitation modules: medical, mess hall, science lab, crew quarters.');
add('corridor_b', 'centrifugal ring', et.corridor_b?.['ring'] || 'The centrifugal ring provides simulated gravity.');
add('corridor_b', 'spokes', 'Four corridors radiate from the central hub like spokes, each leading to a different section of Deck B\'s habitation ring. The geometry is visible in the floor\'s gentle upward curve -- you are walking on the inside of a wheel, and the spokes connect the rim to the axle.');
add('corridor_b', 'wheel', et.corridor_b?.['spokes'] || 'The ring structure of Deck B.');
add('corridor_b', 'timestamp', 'The timestamp on the central information kiosk reads six hours old. The display should update in real time. Either the kiosk\'s clock is wrong, or the data feed from the ship\'s systems has been interrupted, or someone froze the display deliberately. Six hours is a long time for a ship to go unmonitored.');

// =============================================================================
// MED BAY
// =============================================================================
add('med_bay', 'cabinets', et.med_bay?.['pharmaceutical cabinets'] || 'Pharmaceutical cabinets line the starboard wall.');
add('med_bay', 'hyposprays', 'Emergency hyposprays in blister packaging, each labeled with dosage and indication. Several slots in the rack are empty -- broad-spectrum antibiotics, a coagulant spray, and a bottle of stimulant hyposprays have been removed. Stimulants for extended solo operations. Someone was staying awake far longer than human circadian rhythm allows.');
add('med_bay', 'stimulants', et.med_bay?.['hyposprays'] || 'Stimulant hyposprays for extended solo operations.');
add('med_bay', 'biometric data', 'The diagnostic terminal displays crew biometric data in a scrolling list. Heart rate, respiration, neural activity, core temperature -- all the vital signs of cryogenic suspension, slow and glacial. Your own entry blinks at the top: ACTIVE. The contrast between your racing pulse and the frozen stillness of everyone else is stark.');
add('med_bay', 'crew list', et.med_bay?.['biometric data'] || 'Crew biometric data scrolling on the terminal.');
add('med_bay', 'vials', 'Neat rows of labeled pharmaceutical vials behind glass cabinet fronts. Standard shipboard medical supplies -- analgesics, antibiotics, antiemetics, sedatives, stimulants, emergency epinephrine. Everything a ship\'s medical officer would need for a crew of fourteen. The labels are precise, the organization compulsive.');
add('med_bay', 'procedure checklist', 'A laminated procedure checklist hangs on the wall beside the autodoc: pre-operative assessment, anesthesia protocol, sterilization sequence, post-operative monitoring. Each step has a checkbox. Several are marked with a quick, decisive tick in black ink. The handwriting is small and precise.');
add('med_bay', 'checklist', et.med_bay?.['procedure checklist'] || 'A laminated procedure checklist.');

// =============================================================================
// MESS HALL
// =============================================================================
add('mess_hall', 'racks', 'Wall-mounted racks hold magnetic meal trays in vertical slots, designed to prevent drift in variable gravity. The trays are stainless steel, institutional, each one identical. They are clean -- someone ran them through the sanitizer -- except for the one on the table.');
add('mess_hall', 'meal trays', et.mess_hall?.['racks'] || 'Magnetic meal trays in wall-mounted racks.');
add('mess_hall', 'emergency lighting', 'The emergency lighting bathes everything in sullen amber, turning stainless steel surfaces the color of old brass and making shadows pool in corners. It is not the warm solar-spectrum lighting of Deck B\'s hub -- this is utilitarian, minimal, designed to save power rather than comfort.');
add('mess_hall', 'ration packs', 'Vacuum-sealed ration packs arranged by meal type and caloric content fill the galley racks. Each pack is labeled with contents, preparation instructions, and a date of manufacture that predates launch. The selection is comprehensive but not exciting -- the kind of food designed for nutrition rather than pleasure.');
add('mess_hall', 'bowl', 'The bowl sits on the table, half-filled with rehydrated miso soup that has skinned over and gone cold. The ceramic is ship-issue, white, unremarkable. The condensation ring beneath it has long since evaporated, leaving a mineral ghost on the table surface. The meal was set down and never finished.');
add('mess_hall', 'condensation ring', 'A faint mineral deposit marks the table where condensation from the bowl evaporated over time. The ring is dry, the moisture long gone, absorbed back into the ship\'s closed atmosphere. The deposit tells you the bowl has been sitting here for weeks at minimum.');
add('mess_hall', 'water dispenser', et.mess_hall?.['dispenser'] || 'The water dispenser.');

// =============================================================================
// LAB
// =============================================================================
add('lab', 'spectrometer', 'The spectrometer hums with quiet satisfaction, its display showing emission lines from an analysis completed but never reviewed. The instrument is still powered, still processing, still waiting for a human to acknowledge its findings. The sample chamber is closed, its contents analyzed and measured with inhuman precision.');
add('lab', 'fume hoods', et.lab?.['fume hood'] || 'Fume hoods along the port bulkhead.');
add('lab', 'extraction fans', 'The extraction fans in the fume hoods cycle in a low, continuous drone, pulling air through the hoods and filtering it before returning it to the lab\'s atmosphere. They have been running continuously since the lab was last used, maintaining negative pressure in the hoods as designed.');
add('lab', 'fans', et.lab?.['extraction fans'] || 'Extraction fans cycling in the fume hoods.');
add('lab', 'reference samples', 'Sealed reference samples in the wall cabinet -- mineral analogues, atmospheric condensate models, biological viability models, all manufactured on Earth to match spectral data from 82 Eridani\'s planetary system. Each sample is labeled, indexed, and cross-referenced. They were fabricated from unmanned probe telemetry transmitted back decades before this ship was built.');
add('lab', 'sample cabinet', 'The sealed sample cabinet contains synthesized reference materials -- mineral analogues, atmospheric condensate models, and biological viability models, all manufactured on Earth from unmanned probe data. Each sample is labeled and cross-referenced with meticulous precision. The cabinet\'s environmental seals are intact.');
add('lab', 'login', 'The terminal displays a standard login prompt, cursor blinking. The session has timed out from inactivity. The last active user\'s handle is partially visible in the username field, a few characters before the field auto-cleared.');
add('lab', 'login prompt', et.lab?.['login'] || 'Standard login prompts on the terminals.');
add('lab', 'results', 'The spectrometer\'s results are still displayed on screen -- emission lines, wavelength measurements, elemental composition analysis. The data has been waiting for review, the machine patient and indifferent to the passage of time. The analysis is complete. The interpretation is not.');
add('lab', 'emission lines', et.lab?.['results'] || 'Emission lines from a completed analysis.');
add('lab', 'mainframe', 'The research terminals are networked into the ship\'s central mainframe, sharing processing power and data storage across all workstations. The network status shows active connections, data flowing between nodes. The mainframe is operational, processing background tasks, running the ship.');

// =============================================================================
// CREW QUARTERS
// =============================================================================
add('crew_quarters', 'compartments', 'Seven sleeping compartments line the room, each barely large enough for a bunk, a locker, and a fold-down privacy screen. They are spartan, functional, designed for people who would spend most of the voyage frozen. The compartments are identical except for the personal effects visible through open locker doors.');
add('crew_quarters', 'cryo-wrapping', 'The cryo-transit wrapping on the unused bunks is a thin, crinkly polymer film designed to protect the mattresses during the decades of unoccupied transit. It crinkles like old paper when touched. On most bunks it is intact, sealed. On one, it has been torn away.');
add('crew_quarters', 'personal effects', 'Labeled lockers hold the personal effects of fourteen crew members -- photographs, data tablets, books, small personal items chosen under strict mass allocation limits. Each locker tells a small story about its owner through the objects they chose to carry across forty-two light-years.');
add('crew_quarters', 'effects', et.crew_quarters?.['personal effects'] || 'Personal effects in labeled lockers.');
add('crew_quarters', 'crayon', 'The child\'s drawing is done in crayon on standard paper -- a spaceship that bears no resemblance to the actual Kepler\'s Promise, all right angles and flame exhaust and a smiling stick figure in the window. It is labeled ISV KEPLER\'S PROMISE in determined, careful lettering. Someone\'s child drew this. Someone carried it forty-two light-years.');
add('crew_quarters', 'dust', 'Fine dust coats the surfaces -- polymer particles shed from cryo-wrapping, skin cells from the ventilation system, the microscopic debris of a closed environment. It settles in the seams of lockers, on the edges of bunks, in the creases of unopened cryo-wrap. The ship\'s air filtration should handle this. It isn\'t keeping up.');
add('crew_quarters', 'stencil', 'A name is stenciled on the locker door in standard fleet lettering -- white on grey, regulation height and spacing. It identifies the locker\'s assigned occupant.');
add('crew_quarters', 'name', et.crew_quarters?.['stencil'] || 'A name stenciled on the locker door.');

// =============================================================================
// HYDROPONICS
// =============================================================================
add('hydroponics', 'LED', 'Full-spectrum LED arrays hang above the growth troughs, tuned to wavelengths optimized for photosynthesis. The light is bright and warm with a slight purple cast from the red and blue peaks in the spectrum. The arrays over the living troughs burn steadily. The arrays over the dead troughs are dark -- someone turned them off to conserve power.');
add('hydroponics', 'LEDs', et.hydroponics?.['LED'] || 'Full-spectrum LED arrays above the troughs.');
add('hydroponics', 'nutrient cycling', 'The living troughs circulate a thin film of nutrient solution over the plant roots -- a hydroponic system that delivers water, minerals, and trace elements without soil. The solution is slightly cloudy, rich with dissolved nutrients. Small pumps hum beneath each trough, pushing the liquid in a continuous loop.');
add('hydroponics', 'nutrients', et.hydroponics?.['nutrient cycling'] || 'Nutrient solution circulating through the troughs.');
add('hydroponics', 'root systems', 'In the dead troughs, root systems have calcified in their channels -- white, brittle, mineral-encrusted threads that crumble at a touch. The roots dried out when the water supply failed and then slowly fossilized in the ship\'s dry, recycled air. What was once alive is now a mineral cast of itself.');
add('hydroponics', 'roots', et.hydroponics?.['root systems'] || 'Calcified root systems in the dead troughs.');
add('hydroponics', 'fault codes', 'The warning panel displays six separate fault codes, all related to water distribution in the starboard troughs. Valve failures, pressure drops, pump malfunctions -- a cascade of problems that went unaddressed until the plants on that side died. The port-side systems show no such faults. Someone triaged.');
add('hydroponics', 'water distribution', et.hydroponics?.['fault codes'] || 'Fault codes related to water distribution.');
add('hydroponics', 'atmospheric exchange', 'The atmospheric exchange vent connects the hydroponics bay to the ship\'s air recycling system. Plants exhale oxygen and inhale CO2; the vent channels this exchange into the broader life support network. The vent grille is warm and slightly damp, and the air flowing through it smells green.');
add('hydroponics', 'vent', et.hydroponics?.['atmospheric exchange'] || 'The atmospheric exchange vent.');
add('hydroponics', 'humidity', 'The air is thick with humidity, heavy and tropical compared to the dry recycled atmosphere of the corridors. Moisture beads on metal surfaces and condenses on the cooler sections of wall. Your skin feels damp within moments of entering.');
add('hydroponics', 'media', 'The growing media in the troughs is a porous ceramic aggregate -- lightweight, sterile, designed to anchor roots while allowing nutrient solution to flow freely. In the living troughs it is dark and damp. In the dead troughs it is dry, pale, and crumbling.');

// =============================================================================
// REC ROOM
// =============================================================================
add('rec_room', 'chess position', 'White has castled kingside but lost both bishops and a knight. Black\'s queen controls the center, supported by a rook on the seventh rank. The position is lost for white -- three moves from checkmate with no viable defense. The pieces are magnetic, undisturbed by vibration. This position was constructed deliberately.');
add('rec_room', 'position', et.rec_room?.['chess position'] || 'The chess position on the board.');
add('rec_room', 'game', et.rec_room?.['chess position'] || 'The chess position on the board.');
add('rec_room', 'board', et.rec_room?.['chess table'] || 'The chess table between two chairs.');
add('rec_room', 'cables', 'The resistance machine\'s cables are still taut, adjusted for a moderate workout load. The seat height is set for someone of moderate height. Grip wear on the handles shows regular, recent use -- someone maintained a fitness routine. Alone, in a metal tube, hurtling through interstellar space.');
add('rec_room', 'resistance machine', et.rec_room?.['exercise machine'] || 'The resistance exercise machine.');
add('rec_room', 'seat', 'The exercise machine\'s seat is adjusted for someone of moderate height. The padding shows compression from regular use, and the adjustment pin is worn smooth where it\'s been pulled and replaced hundreds of times.');
add('rec_room', 'films', 'The entertainment console\'s library holds films, music, and interactive media sufficient to last several lifetimes. The selection is curated -- classics, documentaries, simulations. The recently-accessed list shows a pattern of late-night viewing, the timestamps clustered in the small hours of ship time.');
add('rec_room', 'media', et.rec_room?.['films'] || 'Films, music, and interactive media.');
add('rec_room', 'music', et.rec_room?.['films'] || 'The entertainment console\'s media library.');
add('rec_room', 'move notation', 'The move notation on the pad beside the chess board is all in one handwriting -- small, precise, unhurried. Every move recorded in standard algebraic notation. This was not a game between two people. Someone played both sides, exploring a specific endgame scenario where the weaker side has no good options.');
add('rec_room', 'notation', et.rec_room?.['move notation'] || 'Move notation in one handwriting.');
add('rec_room', 'paper books', 'Real paper books -- a luxury of mass allocation on a ship where every gram counts. The collection is eclectic: novels, philosophy, technical manuals, poetry. The spines show varying degrees of wear. Some have been read repeatedly. Others are pristine, their pages still stiff.');

// =============================================================================
// CORRIDOR C
// =============================================================================
add('corridor_c', 'deck plates', 'Heavy gauge steel deck plates, scarred with the boot prints and tool marks of the construction crews who built this ship in Earth orbit. The plates are thicker here than in habitation -- industrial grade, designed for heavy equipment transit. You can feel the reactor\'s pulse through them, a low vibration in your soles.');
add('corridor_c', 'placards', 'Warning placards proliferate on every surface: RADIATION AREA FORE, HIGH VOLTAGE PORT, AUTHORIZED PERSONNEL ONLY. The signage is standard fleet issue, red and yellow on white, designed to be legible in emergency lighting. They mark the boundary between habitation and the working machinery of the ship.');
add('corridor_c', 'warning signs', et.corridor_c?.['placards'] || 'Warning placards on the bulkheads.');
add('corridor_c', 'conduit bundles', 'Conduit bundles as thick as your arm run along the ceiling, carrying power, data, and coolant to every system on the ship. They are bundled and labeled with obsessive precision -- every cable tagged, every junction documented. The labels use a color-coding system: red for power, blue for data, yellow for coolant.');
add('corridor_c', 'cables', et.corridor_c?.['conduit bundles'] || 'Conduit bundles along the ceiling.');
add('corridor_c', 'maintenance log', 'A maintenance log is taped to the bulkhead beside the ladder well. Several entries are visible in small, precise handwriting. The entries document routine inspections, minor repairs, system adjustments -- the kind of work that keeps a ship alive. The last entry is dated roughly six months ago, ship time.');
add('corridor_c', 'handwriting', 'The handwriting in the maintenance log is small, precise, and consistent across entries spanning months. It belongs to one person. The letters are careful, unhurried, the work of someone who values accuracy over speed. Certain technical abbreviations recur -- shorthand developed by someone intimately familiar with the ship\'s systems.');

// =============================================================================
// REACTOR ROOM
// =============================================================================
add('reactor_room', 'containment coils', 'The magnetic containment coils ring the reactor vessel, glowing with a faint blue-white luminescence -- visible evidence of the magnetic fields holding 150 million degrees of plasma in place. The glow is steady on the primary coils. The secondary coils flicker at irregular intervals, cycling through amber alerts that the automated systems keep correcting.');
add('reactor_room', 'hum', 'Not the polite hum of habitation systems. This is a deep, chest-resonating thrum that bypasses your ears and speaks directly to your sternum, your molars, the fluid in your inner ear. It is the sound of deuterium plasma held at stellar temperatures by magnetic fields. You feel it more than hear it.');
add('reactor_room', 'sound', et.reactor_room?.['hum'] || 'The deep thrum of the reactor.');
add('reactor_room', 'status displays', 'Status displays ring the compartment at eye level, most showing green. Primary containment: steady state. Plasma temperature: 152.3 million K. Magnetic field strength: nominal. Power output: nominal. The secondary containment readout is the exception, cycling through amber alerts at irregular intervals.');
add('reactor_room', 'dosimeter', 'The radiation dosimeter by the door chirps softly, tracking your cumulative exposure in real time. The display shows microsieverts per hour and total accumulated dose since entry. The numbers are within tolerance -- barely. You have approximately 45 minutes before cumulative dose becomes a concern.');
add('reactor_room', 'radiation warning', 'Radiation warning strips on the bulkhead shift color based on ambient radiation levels. They are currently yellow -- elevated but within safety parameters. The strips are a passive system, requiring no power, responding chemically to ionizing radiation. A simple, reliable indicator of how close you are to danger.');
add('reactor_room', 'warning strips', et.reactor_room?.['radiation warning'] || 'Radiation warning strips on the bulkhead.');
add('reactor_room', 'console', 'The reactor control console displays real-time parameters: plasma temperature, confinement pressure, power output, fuel consumption rate. Manual adjustment controls sit beneath the displays, protected by clear flip covers that prevent accidental changes. Several covers have been opened recently -- fingerprints on the plastic.');
add('reactor_room', 'manual adjustments', 'Someone has been making manual adjustments to the magnetic confinement parameters. Small changes, careful ones, documented in precise handwriting on a note taped to the console. The adjustments follow a pattern -- each one compensating for the secondary containment\'s intermittent amber alerts.');
add('reactor_room', 'confinement', et.reactor_room?.['manual adjustments'] || 'Manual adjustments to the confinement parameters.');

// =============================================================================
// MACHINE SHOP
// =============================================================================
add('machine_shop', 'CNC', 'The CNC fabrication unit sits at the center of the shop -- a precision machining system capable of cutting, milling, and shaping replacement parts from raw metal stock. Its job queue is not empty. The most recent fabrication jobs are logged on the adjacent display, and not all of them are standard maintenance items.');
add('machine_shop', 'fabrication unit', et.machine_shop?.['CNC'] || 'The CNC fabrication unit.');
add('machine_shop', 'welding gear', 'MIG, TIG, and plasma cutter hang on a pegboard in their labeled white outlines -- military-precise organization where every tool has a home and every absence is visible. The MIG welder shows recent use: fresh spatter on the nozzle, a partially consumed spool of wire.');
add('machine_shop', 'pegboard', et.machine_shop?.['welding gear'] || 'Welding gear on a labeled pegboard.');
add('machine_shop', 'vise', 'A heavy bench vise bolted to the workbench, its jaws scarred with use marks. Fresh scratches in the jaw faces suggest recent work -- someone clamped something and filed or machined it by hand. Metal shavings cling to the thread of the screw.');
add('machine_shop', 'drill press', 'A drill press bolted to the workbench, its chuck holding a 4mm bit. A small pile of aluminum shavings sits on the table beneath it, bright and curled. The press has been used recently -- the shavings haven\'t been swept away.');
add('machine_shop', 'hand tools', 'Hand tools that would not have been out of place in a twentieth-century garage -- wrenches, pliers, screwdrivers, files, hammers. Each hangs in its labeled outline on the pegboard. Most are in their places. A few outlines are empty, the tools elsewhere on the ship, in use or forgotten.');
add('machine_shop', 'raw stock', 'Wall-mounted bins hold raw metal stock -- aluminum bar, steel rod, titanium plate, copper sheet. Standard fabrication materials for a ship expected to manufacture its own replacement parts over a forty-two-year voyage. The bins are organized by material and dimension. Some show recent withdrawals.');
add('machine_shop', 'parts manifest', 'The parts manifest tracks every fabricated component and its destination -- a running log of what the ship has made for itself. Most entries are routine: seals, brackets, fasteners, replacement sensor housings. The recent entries are different.');
add('machine_shop', 'oil', 'The workbench surface is scarred and oil-stained from decades of use -- cutting fluid, machine oil, solvent residue layered and burnished into the metal. Fresh stains sit atop old ones, bright against dark. The most recent marks are sharp and clean, not yet worn smooth.');
add('machine_shop', 'shavings', 'Aluminum shavings curl on the workbench and around the drill press -- bright, fresh, catching the light. They smell faintly of cutting fluid. Someone was machining aluminum recently, with precision -- the shavings are uniform, the work of steady hands and a well-set machine.');

// =============================================================================
// LIFE SUPPORT
// =============================================================================
add('life_support', 'air recyclers', 'Massive cylindrical scrubbers line the forward bulkhead, pulling CO2 from the ship\'s atmosphere and cracking it back into breathable oxygen through electrolysis. The units hum at slightly different frequencies, creating a subtle beat pattern. Quadrant three\'s unit runs rougher than the others, its amber warning light a steady pulse.');
add('life_support', 'water reclamation', 'The water reclamation system occupies the port side -- a closed-loop array of filters, UV sterilizers, and mineral reinjection modules. It has been turning the crew\'s waste back into drinking water for nineteen years without complaint. The output purity readings are within specification. The system is one of the most reliable on the ship.');
add('life_support', 'filters', 'Multiple filtration stages visible through inspection windows: mechanical pre-filters, activated carbon beds, reverse osmosis membranes, UV sterilization chambers. The filters in quadrant three show visible discoloration -- degraded efficiency, replacement recommended. The ship carries spares, but someone would need to perform the swap manually.');
add('life_support', 'humidity controllers', 'Humidity controllers regulate moisture levels throughout the ship, preventing both the corrosion of too-damp air and the static discharge of too-dry conditions. The displays show current humidity by deck and compartment. Most readings are nominal. Hydroponics runs high, as expected.');
add('life_support', 'temperature regulators', 'Temperature regulators maintain the ship\'s thermal environment within habitable range, balancing the heat generated by systems and crew against the cold of the hull. Temperature varies by deck: warmer in habitation, cooler near the hull, coldest in the spine passage and lower decks.');
add('life_support', 'monitors', 'Atmospheric composition monitors display O2, N2, CO2, and trace gas levels in real time. The numbers paint a portrait of the ship\'s internal environment: O2 at 20.8%, N2 at 78.1%, CO2 at 0.041%. Within parameters. The trace gas analysis, however, shows an anomaly -- an unidentified organic compound the system has flagged.');
add('life_support', 'atmospheric display', et.life_support?.['monitors'] || 'Atmospheric composition readings.');
add('life_support', 'alarm panel', 'Three amber lights blink in a slow, patient rhythm on the alarm panel. Two are routine: filter degradation, calibration drift. The third reads TRACE ATMOSPHERIC ANOMALY -- an unidentified organic compound detected four days ago, concentration 0.003 PPM, source unknown. Within safety parameters. But present, and unexplained.');
add('life_support', 'UV sterilizers', 'Ultraviolet sterilization chambers glow with a faint purple light, visible through inspection ports. The UV lamps kill bacteria and break down organic contaminants in the water supply. Lamp hours are tracked on an adjacent display -- all within rated lifespan.');
add('life_support', 'sterilizers', et.life_support?.['UV sterilizers'] || 'UV sterilization chambers.');

// =============================================================================
// ELECTRICAL
// =============================================================================
add('electrical', 'breaker panels', 'Floor-to-ceiling circuit breaker panels line three walls, hundreds of labeled switches controlling the flow of electricity from the reactor to every system on the ship. Most are in their expected positions -- habitation on reduced power, cryo at full, engineering nominal. One breaker stands out from the pattern.');
add('electrical', 'copper', 'The main distribution bus bar is copper -- bright where it has been recently cleaned and dark with patina where it hasn\'t. The contrast is stark. Someone polished a section of the bus bar recently, probably during an inspection or repair. The cleaned section corresponds to the circuit that feeds the starboard hull.');
add('electrical', 'bus bar', 'The main distribution bus bar runs the length of the room, a thick copper conductor that carries primary power from the reactor distribution system to the breaker panels. It is copper-bright where recently cleaned and dark with oxidation patina where untouched. The cleaned sections tell you where someone has been working.');
add('electrical', 'diagnostic panels', 'Diagnostic panels between the breaker banks show power consumption by deck and system in real time. Deck A draws minimal power. Deck B shows habitation-level consumption. Deck C is industrial. Deck D shows an anomalous draw on circuit 12 -- far higher than any standard system should require.');
add('electrical', 'power draw', et.electrical?.['diagnostic panels'] || 'Power consumption displays by deck and system.');
add('electrical', 'air', 'The air tastes of ozone -- sharp, mineral, the unmistakable signature of electricity arcing at connection points. In a properly sealed system, you should not taste this. Several junction points are arcing slightly, either from age or from recent modification that didn\'t quite restore the original insulation.');
add('electrical', 'connection points', 'Several connection points are not quite sealed, allowing small electrical arcs that produce the ozone taste in the air. The arcing is minor -- not dangerous, but indicative of joints that were opened and resealed without achieving factory-quality insulation. Someone worked on these connections.');
add('electrical', 'labels', 'Every cable, every conduit, every breaker is labeled with obsessive precision -- alphanumeric codes, color-coded tags, destination markers. The labeling system is standard fleet issue, designed so that any trained engineer can trace any circuit from source to load. The system works. You can read the ship\'s electrical anatomy like a book.');

// =============================================================================
// CARGO BAY
// =============================================================================
add('cargo_bay', 'containers', 'Sealed cargo containers in standardized intermodal units, stacked floor to ceiling, secured with mag-locks and tension straps. Each container is labeled with a manifest code, weight, and contents summary. The containers hold everything a colony needs: agricultural equipment, habitat modules, seed stock, medical supplies, cultural archives.');
add('cargo_bay', 'manifest terminal', 'The manifest terminal near the entrance provides a searchable index of every item on board, cross-referenced by container, weight, and priority classification. The screen shows the results of a recent search -- someone queried the database for containers classified MISSION CONTINGENCY -- RESTRICTED.');
add('cargo_bay', 'mag-locks', 'Magnetic locks secure each container to the deck, rated for 15g of acceleration -- massive overkill for a ship that rarely exceeds 0.01g during coast phase. The locks are electromagnetic, controlled from the manifest terminal. They can be individually released with proper authorization.');
add('cargo_bay', 'tension straps', 'Tension straps augment the mag-locks, webbing each container to its neighbors and to the deck anchoring points. The straps are rated for dynamic loads and show no sign of stress or wear. The containers have not shifted since they were loaded in Earth orbit.');
add('cargo_bay', 'cold', 'The cargo bay runs on minimal climate control to save power. The air is cold enough to make your breath visible -- thin ghosts that drift and dissipate in the near-zero gravity. The temperature is well above freezing but far below comfort. Extended time here would require warmer clothing.');
add('cargo_bay', 'breath', 'Your breath hangs visible in the cold air, each exhalation a small cloud that drifts and disperses slowly in the near-zero gravity. The moisture condenses and evaporates in the dry, cold atmosphere of the bay.');
add('cargo_bay', 'search results', 'The manifest terminal shows the results of a recent search for containers classified MISSION CONTINGENCY -- RESTRICTED. Four containers match: emergency rations, backup communications equipment, a sealed weapons locker, and a fourth whose contents field is simply: CLASSIFIED -- SEE MISSION DIRECTIVE 7.');
add('cargo_bay', 'labels', 'Each container bears a label showing manifest code, weight, and contents summary. The labels are printed on durable polymer, sealed against moisture and handling. Agricultural equipment, prefabricated habitat modules, seed stock, medical supplies, cultural archives, educational materials -- the compressed essence of a civilization.');
add('cargo_bay', 'air', 'The air in the cargo bay is cold and dry, kept at minimal conditioning to conserve power. It smells of nothing -- no organic compounds, no humidity, just the sterile emptiness of refrigerated metal and sealed containers. Your lungs feel the chill with each breath.');

// =============================================================================
// CORRIDOR D
// =============================================================================
add('corridor_d', 'handrails', 'Handrails line both walls of the zero-gravity corridor, cold to the touch, worn smooth at the most-used grip points. Your movements here are the slow, deliberate translations of microgravity -- push, drift, catch, redirect. The rails are your primary means of locomotion.');
add('corridor_d', 'access panels', 'Maintenance access panels dot the corridor walls, each secured with quarter-turn fasteners. Behind them: conduit, pipe, insulation, the hidden anatomy of the ship. One panel, between sections 7 and 8, feels warmer than its neighbors when you brush past it.');
add('corridor_d', 'fluorescent', 'Harsh fluorescent lighting runs the length of the corridor, the kind that makes healthy skin look cadaverous. The light is functional, nothing more -- no attempt at the solar-spectrum warmth of the habitation decks. Down here, the ship does not pretend to be anything but a machine.');
add('corridor_d', 'fluorescent lighting', et.corridor_d?.['fluorescent'] || 'Harsh fluorescent lighting in the corridor.');
add('corridor_d', 'warm spot', 'You press your palm flat against the section of wall that felt different. Yes -- warmth, subtle but unmistakable, radiating through the panel. According to the ship\'s schematics, there is nothing behind this section of bulkhead except hull insulation and the cold of interstellar space. Something is generating heat where nothing should be.');
add('corridor_d', 'conduit', 'Conduit and pipe run along the ceiling in dense bundles, carrying power, data, and coolant the length of the ship\'s lowest deck. The bundles are labeled and color-coded, but the labeling is less meticulous here than on Deck C -- functional rather than obsessive.');
add('corridor_d', 'pipe', et.corridor_d?.['conduit'] || 'Conduit and pipe bundles along the ceiling.');
add('corridor_d', 'pipes', et.corridor_d?.['conduit'] || 'Conduit and pipe bundles along the ceiling.');

// =============================================================================
// CRYO BAY
// =============================================================================
add('cryo_bay', 'status lights', 'Status lights glow above each cryo pod -- steady green for nominal, amber for warning, red for failure. The vast majority are green, row after row of reassuring emerald indicating successful suspension. Your own pod\'s light has shifted to white: REVIVAL COMPLETE. One other pod, four rows down, shows no light at all.');
add('cryo_bay', 'cooling systems', 'The hum of the cooling systems vibrates through the deck plates, a deep mechanical drone that is the loudest sound in the bay apart from your own breathing. The systems maintain the pods at cryogenic temperatures -- liquid nitrogen circulation, thermoelectric cooling, backup refrigeration. They have been running without interruption for nineteen years.');
add('cryo_bay', 'condensation', 'Condensation beads on every metal surface -- the ceiling, the pod housings, the monitoring station, the handrails. The cold of the cryo systems meets the relative warmth of the ship\'s atmosphere and moisture precipitates on every exposed surface. The floor is slick with it.');
add('cryo_bay', 'monitoring station', 'The monitoring station near the entrance displays cryo bay status: temperature, pressure, individual pod readings, system alerts. A faint alarm tone pulses from its speakers -- steady, patient, designed to wake crew without causing cardiac distress. The display shows your revival was triggered by an automated emergency protocol.');
add('cryo_bay', 'deck plates', 'The deck plates are cold enough to feel through standard-issue boots. Condensation makes the surface treacherous, and cryoprotectant residue pools in the seams between plates -- a viscous blue-green fluid that smells of glycol and something faintly organic.');
add('cryo_bay', 'gel', 'Cryoprotectant gel -- a viscous, slightly blue-green fluid that smells of glycol and something organic. It is drying on your skin in sticky, cooling patches. The substance is designed to prevent ice crystal formation in human tissue during cryogenic suspension. It is effective, and deeply unpleasant.');
add('cryo_bay', 'cryoprotectant', et.cryo_bay?.['gel'] || 'Cryoprotectant gel drying on your skin.');

// =============================================================================
// ENGINE ROOM
// =============================================================================
add('engine_room', 'bell', 'The drive nozzle\'s bell-shaped structure narrows to a throat where superheated plasma would be directed to produce thrust. It is enormous, dominating the aft end of the compartment, and currently cold and silent. The interior surface is lined with ablative thermal protection -- layers of ceramic and composite rated for temperatures that would vaporize steel.');
add('engine_room', 'thrust vectoring', 'Thrust vectoring actuators ring the nozzle like the petals of a steel flower, each capable of redirecting the exhaust plume by fractions of a degree. During burns, these actuators provide fine course correction, steering the ship by sculpting the shape of its thrust. They are currently locked in neutral position, dormant.');
add('engine_room', 'actuators', et.engine_room?.['thrust vectoring'] || 'Thrust vectoring actuators ring the nozzle.');
add('engine_room', 'control consoles', 'Control consoles line the forward bulkhead, displaying engine status, fuel consumption curves, and the deceleration profile. The displays are active, continuously updated, monitoring a drive system that won\'t fire for another sixteen years. The data is beautiful and precise -- trajectories, delta-v budgets, burn timing calculated to the second.');
add('engine_room', 'fuel consumption', 'Fuel consumption curves trace the planned use of deuterium and helium-3 over the mission\'s duration. The curves should be flat during coast phase -- no thrust means no fuel use. But the actual consumption line deviates slightly from the projected line. The discrepancy is small. But it shouldn\'t exist at all.');
add('engine_room', 'deceleration profile', 'The deceleration profile is a carefully calculated burn sequence that will begin in 16.4 years -- slowing the ship from 12% of lightspeed to orbital velocity around 82 Eridani e. The math is beautiful and merciless: there is exactly enough fuel, with a 4.2% margin. Exactly enough. No room for error.');
add('engine_room', 'margin', et.engine_room?.['deceleration profile'] || 'The deceleration burn profile and fuel margin.');
add('engine_room', 'burn sequence', et.engine_room?.['deceleration profile'] || 'The planned deceleration burn sequence.');
add('engine_room', 'chamber', 'The engine chamber has the reverent stillness of a weapon at rest. The drive nozzle is dormant, the plasma injectors sealed, the magnetic containment fields on standby. Everything waits in cold silence for a burn that is still sixteen years away. The chamber smells of nothing -- vacuum-clean, sterile, absent.');

// =============================================================================
// FUEL STORAGE
// =============================================================================
add('fuel_storage', 'tank monitors', 'Six tank status monitors line the walls, each showing fill level, temperature, pressure, and flow rate for one of the ship\'s fuel reserves. The displays are identical in format, their data presented in clean, standardized readouts. Five tanks read nominal. Tank 6 is the anomaly.');
add('fuel_storage', 'tanks', 'The fuel tanks themselves are invisible from inside -- stored in the outer hull, accessible only through status displays and sensor readings. Deuterium and helium-3 in cryogenic storage, the fuel for the fusion drive. The monitoring station wraps around the infrastructure, a room-sized instrument panel for systems you cannot see or touch.');
add('fuel_storage', 'tank 6', 'Tank 6\'s display shows a fill level of 87.3% where 94.1% is expected. Temperature reads 0.3 degrees above the other tanks. A pressure fluctuation graph shows irregular sawtooth oscillations over six days, suggesting the tank\'s contents are not at rest. Something is happening inside tank 6 that is not happening in the other five.');
add('fuel_storage', 'pressure graph', 'The pressure fluctuation graph for tank 6 shows a sawtooth pattern over the past six days -- pressure rises gradually, then drops sharply, then rises again. The pattern suggests something periodically disturbing the tank\'s equilibrium. In a system designed for absolute stillness, any oscillation is significant.');
add('fuel_storage', 'pressure', et.fuel_storage?.['pressure graph'] || 'Pressure fluctuations in tank 6.');
add('fuel_storage', 'temperature', 'Tank temperatures are displayed to three decimal places. Tanks 1 through 5 read within 0.01 degrees of each other -- the uniformity expected in a cryogenic storage system. Tank 6 reads 0.3 degrees higher. In absolute terms, insignificant. In a system designed for uniformity, a clear signal that something is different.');
add('fuel_storage', 'display', 'The adjacent display shows detailed telemetry for whichever tank is selected. Selecting tank 6 reveals the sawtooth pressure pattern, the temperature differential, and the fill level discrepancy. The display also shows flow logs -- and the flow logs should be empty during coast phase.');
add('fuel_storage', 'flow logs', et.fuel_storage?.['display'] || 'Detailed telemetry for the fuel tanks.');
add('fuel_storage', 'breath', 'Your breath leaves brief clouds in the near-zero gravity, each exhalation a small fog that drifts and disperses slowly. The room is cold -- insulated proximity to cryogenic fuel tanks bleeds heat from the air despite the climate control\'s best efforts.');

// =============================================================================
// AIRLOCK INNER
// =============================================================================
add('airlock_inner', 'eva suits', 'Four EVA suits hang in alcoves along the port wall, each in its own maintenance cradle with helmet, gloves, and life-support pack. Three are pristine, sealed in their transit packaging, never used. The fourth -- Suit 3 -- has been removed from packaging, extensively used, and returned to its cradle.');
add('airlock_inner', 'suits', et.airlock_inner?.['eva suits'] || 'EVA suits in alcoves along the port wall.');
add('airlock_inner', 'alcoves', 'Four suit alcoves line the port wall, each a recessed maintenance cradle designed to hold one complete EVA suit assembly. The cradles include charging ports for the life-support packs, diagnostic connections, and restraints to prevent the suits from drifting in variable gravity.');
add('airlock_inner', 'cradle', et.airlock_inner?.['alcoves'] || 'Suit maintenance cradles in the alcoves.');
add('airlock_inner', 'packaging', 'Transit packaging -- a vacuum-sealed polymer wrap with humidity indicators and inspection tags -- protects three of the four EVA suits. The packaging on Suit 3 has been removed, neatly folded, and stowed on the shelf above the alcove. Someone who respects equipment.');
add('airlock_inner', 'transit packaging', et.airlock_inner?.['packaging'] || 'Transit packaging on the unused suits.');
add('airlock_inner', 'life-support pack', 'The life-support pack on Suit 3 is charged and shows recent maintenance. The pack provides oxygen, thermal regulation, CO2 scrubbing, and communications for up to eight hours of EVA activity. Its charge level is full -- someone recharged it after the last use.');
add('airlock_inner', 'life support', et.airlock_inner?.['life-support pack'] || 'The life-support pack on Suit 3.');
add('airlock_inner', 'inner door', 'The inner airlock door is a heavy pressure door separating the ship\'s atmosphere from the airlock chamber. Its status indicator shows atmosphere on both sides -- the chamber is currently pressurized. The door opens with a heavy mechanical thunk, breaking the pressure seal.');
add('airlock_inner', 'outer door', 'The outer door\'s status light glows red: OUTER DOOR SEALED -- VACUUM BEYOND. The door will not open while the inner door is unsealed -- a fundamental safety interlock that prevents accidental decompression. To open the outer door, you must seal the inner door and depressurize the chamber.');
add('airlock_inner', 'doors', 'Two heavy pressure doors define the airlock\'s function: inner and outer, never both open simultaneously. The interlock system is mechanical and electronic, redundant, fail-safe. It is one of the simplest and most critical systems on the ship.');
add('airlock_inner', 'checklist', 'The pre-EVA checklist is posted on the bulkhead in laminated format: suit integrity check, life-support verification, tether inspection, communication test, buddy check (crossed out in ink -- there is no buddy), depressurization sequence. Several items show check marks in black ink.');
add('airlock_inner', 'status panel', 'The status panel confirms atmosphere on both sides of the inner door. Pressure readings, temperature, atmospheric composition -- all showing standard shipboard values. The outer door status glows red: vacuum beyond. Everything is as it should be, except that someone has been using this airlock regularly.');

// =============================================================================
// AIRLOCK OUTER
// =============================================================================
add('airlock_outer', 'porthole', 'A single porthole in the outer door, a disk of reinforced quartz perhaps fifteen centimeters across. Through it: nothing. Not darkness in any earthly sense, but the void itself -- the absence of everything, occasionally punctuated by the hard, unwinking point of a star. You could stare through it for hours and see nothing move.');
add('airlock_outer', 'walls', 'The walls are bare metal, uninsulated. Cold radiates from them in waves -- the hull\'s outer surface is only centimeters away, separated from interstellar vacuum by the thickness of the metal. You can feel the temperature gradient even through an EVA suit\'s thermal regulation. This close to the void, the ship is honest about what it is.');
add('airlock_outer', 'cycling control', 'The cycling control panel manages the depressurization and repressurization sequence. One button to begin the cycle, a confirmation, and then 90 seconds while the pumps evacuate the chamber\'s atmosphere into storage tanks. The process is accompanied by the deeply unsettling sound of air being removed from the space you occupy.');
add('airlock_outer', 'cycling panel', et.airlock_outer?.['cycling control'] || 'The airlock cycling control panel.');
add('airlock_outer', 'tether points', 'Tether attachment points are bolted to the frame of the outer door, heavy steel loops rated for 500kg of dynamic load. The tethers are designed to arrest a suited astronaut\'s motion if they lose contact with the hull. One set of attachment points shows wear -- repeated clipping and unclipping of tether carabiners.');
add('airlock_outer', 'tethers', et.airlock_outer?.['tether points'] || 'Tether attachment points on the outer door frame.');
add('airlock_outer', 'status displays', 'Flanking the outer door, status displays show external conditions with clinical precision: temperature -270.4 Celsius, pressure 0.000 atmospheres, radiation nominal. The numbers are abstract until the outer door opens and they become your environment. Between the numbers and the void, there is only the suit.');
add('airlock_outer', 'external conditions', et.airlock_outer?.['status displays'] || 'External condition readouts.');
add('airlock_outer', 'suit', 'Your EVA suit encloses you completely -- a self-contained environment of oxygen, thermal regulation, and radiation shielding. The heads-up display shows vitals, oxygen reserves, and tether status. Inside the suit, you are alive. Outside it, you would not be, in approximately four seconds.');
add('airlock_outer', 'vitals', 'The suit\'s heads-up display shows your vitals in real time: heart rate, respiration, O2 saturation, core temperature. The numbers are elevated -- your body knows where it is even if your mind is processing the view. Oxygen reserves are full. Tether status: connected.');
add('airlock_outer', 'hud', et.airlock_outer?.['vitals'] || 'The suit\'s heads-up display.');

// =============================================================================
// HULL EXTERIOR
// =============================================================================
add('hull_exterior', 'hull plating', 'The hull plating beneath your magnetic boots is scarred by nineteen years of micrometeorite impacts -- tiny craters, most no larger than a pinhead, that document the violence of traveling through space that only appears empty. Each crater is a collision at 36,000 kilometers per second. The plating has held.');
add('hull_exterior', 'micrometeorite impacts', 'Tiny craters pock the hull surface, each one the aftermath of a collision with an interstellar dust grain at 12% of lightspeed. At that velocity, even particles smaller than sand grains carry destructive kinetic energy. The craters are small, the hull intact, but nineteen years of accumulated impacts have textured the surface like sandpaper.');
add('hull_exterior', 'craters', et.hull_exterior?.['micrometeorite impacts'] || 'Micrometeorite impact craters on the hull.');
add('hull_exterior', 'magnetic boots', 'Your magnetic boots hold you to the hull with a satisfying clunk at each step. The magnets cycle with your gait -- one foot releases as the other locks, creating a slow, deliberate walk across the ship\'s outer surface. Without them, a single push would send you away from the ship forever.');
add('hull_exterior', 'boots', et.hull_exterior?.['magnetic boots'] || 'Magnetic boots holding you to the hull.');
add('hull_exterior', 'tether', 'The tether runs from your suit\'s waist attachment to the anchor point at the airlock frame, paying out as you move along the hull. It is your lifeline in the most literal sense -- if your boots fail, the tether is the only thing preventing you from drifting into interstellar space. The line is taut, the carabiner secure.');
add('hull_exterior', 'stars', 'The stars do not twinkle. Without atmosphere to scatter their light, they are steady, sharp, merciless points in every direction -- so numerous that constellations dissolve into a continuous field of ancient fire. Each one a sun, each one impossibly far. You are between them, in the space that separates everything from everything else.');
add('hull_exterior', 'sun', 'The sun is behind you, indistinguishable from any other star at this distance. Nineteen light-years away, it is just another point of light -- no brighter, no warmer, no more special than any of the thousands surrounding it. Your home star. Anonymous.');
add('hull_exterior', 'silence', 'The silence has texture. Not the absence of sound but the absence of the medium that carries it -- no air, no vibration, nothing for sound to travel through. Your own breathing inside the helmet is the loudest thing in existence. The universe is vast and it is quiet.');
add('hull_exterior', 'void', 'The void is not empty darkness. It is the absence of everything -- matter, energy, warmth, sound. It presses against the ship from every direction, patient and absolute. Between the stars, it goes on forever. You are looking at infinity, and infinity is looking back.');
add('hull_exterior', 'cavity', 'A section of hull plating has been removed, revealing a cavity between the outer hull and the pressure vessel. Inside, where there should be only insulation and structural members, someone has installed equipment -- a hand-built antenna array, fabricated from machined components, wired into the ship\'s power grid.');
add('hull_exterior', 'insulation', 'Multi-layer insulation fills the space between the outer hull and the pressure vessel -- reflective foil and spacer material designed to minimize heat transfer between the ship\'s interior and the cold of space. In the modified section, the insulation has been carefully cut away to make room for the antenna installation.');
add('hull_exterior', 'structural members', 'The ship\'s structural skeleton is visible where the hull plate has been removed -- titanium ribs and cross-braces that give the hull its shape and strength. The structural members have not been cut or modified; the antenna installation works around them, attached with custom brackets.');
add('hull_exterior', 'wiring', 'The antenna array is wired into the ship\'s power bus through a splice so clean it would pass inspection -- professionally done, the work of someone with engineering training and steady hands. The cable runs from the antenna through a sealed hull penetration, following the structural members to avoid detection during routine inspections.');
add('hull_exterior', 'splice', et.hull_exterior?.['wiring'] || 'A clean splice into the ship\'s power bus.');

// === OUTPUT SUMMARY ===
process.stdout.write('=== Scenery entries added per room ===\n');
const sortedRooms = Object.entries(perRoom).sort(([a], [b]) => a.localeCompare(b));
for (const [room, n] of sortedRooms) {
  process.stdout.write(`  ${room}: ${n}\n`);
}
process.stdout.write(`\nTotal new entries: ${count}\n`);

// === WRITE ===
fs.writeFileSync(sceneryFp, JSON.stringify(encodeObject(sceneryData), null, 2) + '\n', 'utf-8');
process.stdout.write('Wrote scenery.json\n');

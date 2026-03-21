/**
 * Automated playtest — sends commands, checks for bugs.
 * Reports ONLY bugs and stats, no story content.
 */

const PORT = 3999;
const BASE = `http://localhost:${PORT}/api/test`;

interface Bug {
  command: string;
  issue: string;
  responseType: string;
}

const bugs: Bug[] = [];
let commandCount = 0;
let roomsVisited = new Set<string>();

async function send(cmd: string): Promise<{ text: string; room: string; type: string }> {
  commandCount++;
  const url = cmd ? `${BASE}?cmd=${encodeURIComponent(cmd)}` : BASE;
  const res = await fetch(url);
  const text = await res.text();

  // Extract room from [Room: xxx] tag
  const roomMatch = text.match(/\[Room: (\w+)/);
  const room = roomMatch ? roomMatch[1] : 'unknown';
  roomsVisited.add(room);

  // Detect response type from content patterns
  let type = 'ok';
  if (text.includes("You can't do that here")) type = 'unknown';
  if (text.includes("You don't see")) type = 'not_found';
  if (text.includes("Nothing lies")) type = 'move_failed';
  if (text.includes("not carrying")) type = 'not_carrying';

  return { text, room, type };
}

function bug(cmd: string, issue: string, type: string) {
  bugs.push({ command: cmd, issue, responseType: type });
}

async function run() {
  // Start new game
  await send('');

  // === BASIC MOVEMENT ===
  const r1 = await send('look');
  const r2 = await send('s'); // should go aft
  if (r2.type === 'move_failed') bug('s', 'Cannot move aft from starting room', r2.type);

  await send('n'); // back
  const r3 = await send('fore');
  if (r3.type === 'move_failed') bug('fore', 'Cannot move fore from starting room', r3.type);

  await send('aft'); // back

  // === EXAMINE THINGS ===
  const examTests = ['pod', 'pods', 'floor', 'alarm', 'viewport', 'gel', 'ice'];
  for (const target of examTests) {
    const r = await send(`examine ${target}`);
    if (r.type === 'unknown' || r.type === 'not_found') {
      bug(`examine ${target}`, `Cannot examine "${target}" in starting room`, r.type);
    }
  }

  // === TAKE/DROP ===
  await send('search'); // find hidden items
  const r4 = await send('take datapad');
  if (r4.type === 'not_found') bug('take datapad', 'Cannot take datapad', r4.type);

  await send('inventory');

  // === MOVEMENT THROUGH SHIP ===
  await send('s'); // corridor_d
  await send('n'); // corridor_c? or up?

  // Try navigating around
  const moves = ['up', 'port', 'starboard', 'fore', 'aft', 'down'];
  for (const dir of moves) {
    const r = await send(dir);
    // Just record rooms, don't flag failed moves as bugs (might be valid)
  }

  // Get back to a known room
  await send('look');

  // === SPELLING CORRECTION ===
  const r5 = await send('loko'); // should correct to look
  if (r5.type === 'unknown') bug('loko', 'Spelling correction failed for "loko"', r5.type);

  const r6 = await send('examin datapad'); // should correct to examine
  if (r6.type === 'unknown') bug('examin datapad', 'Spelling correction failed', r6.type);

  // === REJECTED VERBS ===
  const rejects = ['dance', 'sing', 'attack', 'teleport', 'xyzzy', 'kill'];
  for (const verb of rejects) {
    const r = await send(verb);
    if (r.type === 'unknown') {
      bug(verb, `Rejected verb "${verb}" returned unknown instead of flavor text`, r.type);
    }
  }

  // === META COMMANDS ===
  await send('help');
  await send('status');
  await send('date');
  await send('systems');
  await send('m'); // map
  await send('i'); // inventory

  // === SAVE/LOAD ===
  await send('save playtest');
  await send('saves');
  await send('load playtest');

  // === WHERE QUERY ===
  await send('drop datapad');
  const r7 = await send('where datapad');
  if (r7.text.includes("You can't do that") || r7.type === 'unknown') {
    bug('where datapad', '"where" query failed for dropped item', r7.type);
  }
  await send('take datapad'); // pick it back up

  // === EDGE CASES ===
  const r8 = await send(''); // empty command
  const r9 = await send('a'); // single char 'a' = aft
  const r10 = await send('?'); // help
  const r11 = await send('1'); // number (disambiguation)
  const r12 = await send('the'); // just an article

  // === MULTI-WORD COMMANDS ===
  await send('look around');
  await send('pick up datapad');
  await send('what is this place');

  // === NAVIGATE MORE ROOMS ===
  // Try to visit many rooms
  const paths = [
    's', 'up', 'port', 'look', 'aft', 'look', 'fore', 'starboard', 'look',
    'down', 'fore', 'look', 'aft', 'port', 'look', 'starboard',
    'up', 'fore', 'look', 'aft', 'starboard', 'look', 'port',
  ];
  for (const cmd of paths) {
    await send(cmd);
  }

  // === EXAMINE IN VARIOUS ROOMS ===
  await send('look');
  await send('examine panel');
  await send('examine door');
  await send('examine wall');
  await send('examine console');

  // === CHECK FOR LONG RESPONSES (Haiku being called) ===
  // We can't easily detect this via text, but check for very long responses
  const r13 = await send('examine the mysterious void');
  const startTime = Date.now();
  const r14 = await send('what color is the hull');
  const elapsed = Date.now() - startTime;
  if (elapsed > 5000) {
    bug('what color is the hull', `Response took ${elapsed}ms — likely Haiku call`, 'slow');
  }

  // === REPORT ===
  process.stdout.write(`\n=== PLAYTEST RESULTS ===\n`);
  process.stdout.write(`Commands sent: ${commandCount}\n`);
  process.stdout.write(`Rooms visited: ${roomsVisited.size} (${[...roomsVisited].join(', ')})\n`);
  process.stdout.write(`\nBugs found: ${bugs.length}\n`);
  for (const b of bugs) {
    process.stdout.write(`  BUG: "${b.command}" → ${b.issue} [${b.responseType}]\n`);
  }
  if (bugs.length === 0) {
    process.stdout.write(`  No bugs found!\n`);
  }
  process.stdout.write(`\n`);
}

run().catch(err => {
  process.stderr.write(`Playtest error: ${err.message}\n`);
  process.exit(1);
});

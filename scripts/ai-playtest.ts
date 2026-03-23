/**
 * AI Playtest — uses simple heuristics to play the game like a naive player.
 * Explores rooms, examines things mentioned in descriptions, picks up items,
 * tries logical actions. Reports bugs at the end.
 */
const PORT = 3999;
const BASE = `http://localhost:${PORT}/api/test`;

interface Bug { cmd: string; issue: string; }
const bugs: Bug[] = [];
const visited = new Set<string>();
const inventory: string[] = [];
let cmdCount = 0;
let currentRoom = '';

async function cmd(input: string): Promise<string> {
  cmdCount++;
  const url = input ? `${BASE}?cmd=${encodeURIComponent(input)}` : BASE;
  const res = await fetch(url);
  const text = await res.text();

  // Extract room
  const rm = text.match(/\[Room: (\w+)/);
  if (rm) { currentRoom = rm[1]; visited.add(currentRoom); }

  // Detect bugs
  if (text.includes("You can't do that here") && !['dance','sing','attack','xyzzy','teleport','kill'].includes(input.split(' ')[0])) {
    bugs.push({ cmd: input, issue: 'Got "can\'t do that" for a reasonable command' });
  }

  return text;
}

// Extract examinable nouns from text (after "the/a/an")
function extractNouns(text: string): string[] {
  const nouns: string[] = [];
  const matches = text.matchAll(/\b(?:the|a|an)\s+(\w+)/gi);
  for (const m of matches) {
    const word = m[1].toLowerCase();
    if (word.length > 3 && !['this','that','your','room','ship','time','ones','from','into'].includes(word))
      nouns.push(word);
  }
  return [...new Set(nouns)].slice(0, 3); // max 3 per room
}

// Extract items from "You can see: X, Y, Z."
function extractItems(text: string): string[] {
  const m = text.match(/You can see: (.+?)\./);
  if (!m) return [];
  return m[1].split(',').map(s => s.trim());
}

// Extract exits from "Exits: X, Y."
function extractExits(text: string): string[] {
  const m = text.match(/Exits: (.+?)\./);
  if (!m) return [];
  return m[1].split(',').map(s => s.trim());
}

async function play() {
  // Start game
  const intro = await cmd('');
  process.stdout.write(`Started game. Room: ${currentRoom}\n`);

  // Look around
  let text = await cmd('look');

  // Play loop — explore methodically
  const dirQueue: string[] = [];
  const roomsToExplore = new Set<string>();

  for (let turn = 0; turn < 100; turn++) {
    // Look at current room
    if (turn > 0) text = await cmd('look');

    const exits = extractExits(text);
    const items = extractItems(text);
    const nouns = extractNouns(text);

    // Examine interesting things
    for (const noun of nouns.slice(0, 2)) {
      await cmd(`examine ${noun}`);
    }

    // Try to take visible items
    for (const item of items.slice(0, 2)) {
      const firstName = item.split(' ').pop()!.toLowerCase();
      const r = await cmd(`take ${firstName}`);
      if (!r.includes("don't see") && !r.includes("can't take") && !r.includes("too heavy")) {
        inventory.push(firstName);
      }
    }

    // Try status/meta commands occasionally
    if (turn % 10 === 5) await cmd('status');
    if (turn % 15 === 7) await cmd('m');
    if (turn % 20 === 10) await cmd('i');
    if (turn === 25) await cmd('save playtest');

    // Try misspelled commands
    if (turn === 12) await cmd('loko');
    if (turn === 30) await cmd('examin pod');

    // Try rejected verbs
    if (turn === 15) { const r = await cmd('dance'); if (r.includes("can't do that")) bugs.push({cmd:'dance',issue:'rejected verb got generic error'}); }
    if (turn === 35) await cmd('xyzzy');
    if (turn === 45) await cmd('sing');

    // Try "where" for dropped items
    if (turn === 40 && inventory.length > 0) {
      const item = inventory[0];
      await cmd(`drop ${item}`);
      // Move away
      if (exits.length > 0) await cmd(exits[0]);
      const wr = await cmd(`where ${item}`);
      if (wr.includes("can't do that")) bugs.push({cmd:`where ${item}`,issue:'where query failed'});
      // Go back
      await cmd('look'); // orient
    }

    // Move to an unexplored exit
    let moved = false;
    for (const exit of exits) {
      // Try this direction
      const before = currentRoom;
      const moveResult = await cmd(exit);
      if (currentRoom !== before) {
        moved = true;
        break;
      }
    }

    // If stuck, try random exits
    if (!moved && exits.length > 0) {
      const randomExit = exits[Math.floor(Math.random() * exits.length)];
      await cmd(randomExit);
    }

    // If we've visited many rooms, start backtracking
    if (visited.size > 10 && turn > 50) {
      // Try to find new rooms by going in different directions
      const allDirs = ['fore', 'aft', 'port', 'starboard', 'up', 'down'];
      for (const d of allDirs) {
        const before = currentRoom;
        await cmd(d);
        if (currentRoom !== before) break;
      }
    }
  }

  // Final report
  process.stdout.write(`\n=== AI PLAYTEST REPORT ===\n`);
  process.stdout.write(`Commands: ${cmdCount}\n`);
  process.stdout.write(`Rooms visited: ${visited.size}\n`);
  process.stdout.write(`Items collected: ${inventory.length}\n`);
  process.stdout.write(`\nBugs (${bugs.length}):\n`);
  for (const b of bugs) {
    process.stdout.write(`  BUG: "${b.cmd}" → ${b.issue}\n`);
  }
  if (bugs.length === 0) process.stdout.write(`  None found.\n`);
}

play().catch(e => { process.stderr.write(`Error: ${e.message}\n`); process.exit(1); });

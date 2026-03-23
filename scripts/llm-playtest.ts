/**
 * LLM Playtest — uses Claude CLI (Haiku) to play the game.
 * Haiku reads the game response, reasons about what to do, and sends the next command.
 */
import { execSync } from 'child_process';

const PORT = 3999;
const BASE = `http://localhost:${PORT}/api/test`;
const MAX_TURNS = 80;

let history: string[] = [];

function gameCmd(input?: string): string {
  const url = input ? `${BASE}?cmd=${encodeURIComponent(input)}` : BASE;
  const resp = execSync(`curl -s "${url}"`, { encoding: 'utf-8', timeout: 10000 });
  return resp.trim();
}

function askHaiku(gameResponse: string): string {
  const recentHistory = history.slice(-10).join('\n');

  const prompt = `You are playing a text adventure game. You are an explorer on a spaceship.

RECENT HISTORY:
${recentHistory}

CURRENT GAME RESPONSE:
${gameResponse}

Based on what you see, decide your next command. Think briefly about what seems interesting or important, then give ONE command.

Rules:
- Movement: fore, aft, port, starboard, up, down
- Actions: look, examine [thing], take [thing], drop [thing], use [item], combine [a] with [b], read [thing], open [thing], search
- Meta: i (inventory), status, m (map), save [name], help
- Examine things mentioned in descriptions
- Pick up useful items
- Explore methodically - try to visit new rooms
- If you hit a wall, try a different direction

Respond with ONLY the command, nothing else. Just the command text.`;

  try {
    const result = execSync('claude -p --model haiku --no-session-persistence', {
      input: prompt,
      encoding: 'utf-8',
      timeout: 30000,
      windowsHide: true,
      maxBuffer: 1024 * 128
    }).trim();

    // Clean up — Haiku sometimes wraps in quotes or adds explanation
    let cmd = result.split('\n')[0].trim();
    cmd = cmd.replace(/^["'`]|["'`]$/g, '');
    cmd = cmd.replace(/^>?\s*/, '');
    if (cmd.length > 60) cmd = cmd.substring(0, 60); // safety
    return cmd;
  } catch {
    return 'look';
  }
}

async function play() {
  process.stdout.write('=== LLM PLAYTEST (Haiku) ===\n\n');

  // Start game
  let response = gameCmd();
  process.stdout.write(`[START] ${response.substring(0, 80)}...\n\n`);
  history.push('> (new game)');
  history.push(response.substring(0, 200));

  const rooms = new Set<string>();
  let turn = 0;

  for (turn = 0; turn < MAX_TURNS; turn++) {
    // Ask Haiku what to do
    const command = askHaiku(response);
    process.stdout.write(`[${turn + 1}] > ${command}`);

    // Send command
    response = gameCmd(command);

    // Extract room
    const rm = response.match(/\[Room: (\w+)/);
    if (rm) rooms.add(rm[1]);

    // Extract turn/hp
    const turnMatch = response.match(/Turn: (\d+)/);
    const hpMatch = response.match(/HP: (\d+)/);

    // Brief status
    const brief = response.split('\n')[0].substring(0, 60);
    process.stdout.write(` → ${brief}`);
    if (turnMatch) process.stdout.write(` [T${turnMatch[1]}]`);
    if (hpMatch) process.stdout.write(` [${hpMatch[1]}%]`);
    process.stdout.write('\n');

    // Track history
    history.push(`> ${command}`);
    history.push(response.substring(0, 200));

    // Check for death
    if (hpMatch && parseInt(hpMatch[1]) <= 0) {
      process.stdout.write('\n[DIED]\n');
      break;
    }
  }

  process.stdout.write(`\n=== RESULTS ===\n`);
  process.stdout.write(`Turns played: ${turn}\n`);
  process.stdout.write(`Rooms visited: ${rooms.size}\n`);
  process.stdout.write(`Rooms: ${[...rooms].join(', ')}\n`);
}

play().catch(e => { process.stderr.write(`Error: ${e.message}\n`); process.exit(1); });

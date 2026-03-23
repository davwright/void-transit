/**
 * Claude Tournament — Claude models compete via CLI.
 * Uses claude -p --model <model> --no-session-persistence
 *
 * Usage: npx ts-node scripts/claude-tournament.ts
 */
import { execSync } from 'child_process';

const PORT = process.env.PORT || 3000;
const MAX_TURNS = 60;

const MODELS = [
  { id: 'haiku', name: 'Haiku' },
  { id: 'sonnet', name: 'Sonnet' },
  { id: 'opus', name: 'Opus' },
];

interface Stats {
  model: string;
  name: string;
  turns: number;
  rooms: Set<string>;
  items: number;
  movesOk: number;
  movesFail: number;
  errors: number;
  loops: number;
  deaths: number;
  commands: string[];
}

function askClaude(model: string, prompt: string): string {
  try {
    const result = execSync(`claude -p --model ${model} --no-session-persistence`, {
      input: prompt,
      encoding: 'utf-8',
      timeout: 60000,
      windowsHide: true,
      maxBuffer: 1024 * 128,
    }).trim();

    // Clean up — extract just the command
    let cmd = result.split('\n')[0].trim();
    cmd = cmd.replace(/^["'`>*\-]|["'`]$/g, '').trim();
    cmd = cmd.replace(/^(Command|Action|I'll|Let me|My command|I would|I want to):\s*/i, '');
    cmd = cmd.replace(/^(I |Let's |We should )/i, '');
    if (cmd.length > 80) cmd = cmd.substring(0, 80);
    return cmd || 'look';
  } catch {
    return 'look';
  }
}

async function gameCmd(sessionId: string, input: string): Promise<any> {
  const url = `http://localhost:${PORT}/api/command`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, input }),
  });
  return res.json();
}

async function newGame(): Promise<{ sessionId: string; roomId: string; description: string }> {
  const res = await fetch(`http://localhost:${PORT}/api/new`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  return res.json() as any;
}

async function playSession(model: typeof MODELS[0]): Promise<Stats> {
  const stats: Stats = {
    model: model.id, name: model.name,
    turns: 0, rooms: new Set(), items: 0,
    movesOk: 0, movesFail: 0, errors: 0, loops: 0, deaths: 0,
    commands: [],
  };

  const game = await newGame();
  const sessionId = game.sessionId;
  stats.rooms.add(game.roomId);

  let lastResponse = game.description || '';
  let lastCommand = '';
  let repeatCount = 0;
  const history: string[] = [];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    stats.turns = turn + 1;

    const historyText = history.slice(-8).join('\n');
    const prompt = `You are playing a text adventure game on a spaceship. Explore, examine interesting things, collect items, solve problems.

RECENT HISTORY:
${historyText}

GAME RESPONSE:
${lastResponse}

RULES:
- Movement: fore, aft, port, starboard, up, down
- Actions: look, examine [thing], take [thing], drop [thing], use [item], read [thing], open [thing], search, i, status, m
- You MUST reply with ONLY a single game command — no explanation, no reasoning
- Do NOT repeat the same command more than twice
- If you've been examining things, try moving to a new room
- Try to TAKE items you find
${repeatCount > 2 ? '- WARNING: You are stuck in a loop! Move to a DIFFERENT room NOW. Try: fore, aft, port, starboard, up, or down' : ''}

YOUR COMMAND:`;

    const command = askClaude(model.id, prompt);

    // Loop detection
    if (command === lastCommand) {
      repeatCount++;
      stats.loops++;
      if (repeatCount > 4) {
        // Force a different move
        const forceDirs = ['fore', 'aft', 'port', 'starboard', 'up', 'down'];
        const forceCmd = forceDirs[turn % forceDirs.length];
        process.stdout.write(`  [${turn + 1}] ${command} → LOOP, forcing: ${forceCmd}\n`);
        const data = await gameCmd(sessionId, forceCmd);
        lastResponse = data.prose || '';
        if (data.roomId) stats.rooms.add(data.roomId);
        if (data.type === 'move_success') stats.movesOk++;
        history.push(`> ${forceCmd}`);
        history.push(lastResponse.substring(0, 150));
        lastCommand = forceCmd;
        repeatCount = 0;
        continue;
      }
    } else {
      repeatCount = 0;
    }
    lastCommand = command;
    stats.commands.push(command);

    // Send command
    const data = await gameCmd(sessionId, command);
    lastResponse = data.prose || '';

    // Brief progress
    const brief = lastResponse.split('\n')[0].substring(0, 50);
    process.stdout.write(`  [${turn + 1}] ${command.padEnd(25)} → ${data.type}\n`);

    // Track
    history.push(`> ${command}`);
    history.push(lastResponse.substring(0, 150));
    if (data.roomId) stats.rooms.add(data.roomId);
    if (data.type === 'move_success') stats.movesOk++;
    if (data.type === 'move_failed') stats.movesFail++;
    if (data.type === 'take_success') stats.items++;
    if (data.type === 'unknown') stats.errors++;
    if (data.health !== undefined && data.health <= 0) { stats.deaths++; break; }
  }

  return stats;
}

async function tournament() {
  process.stdout.write('═══ CLAUDE TOURNAMENT ═══\n\n');
  process.stdout.write(`Models: ${MODELS.map(m => m.name).join(', ')}\n`);
  process.stdout.write(`Max turns: ${MAX_TURNS}\n\n`);

  const results: Stats[] = [];

  for (const model of MODELS) {
    process.stdout.write(`\n─── ${model.name} (${model.id}) ───\n`);
    try {
      const stats = await playSession(model);
      results.push(stats);

      process.stdout.write(`\n  Result: ${stats.turns} turns, ${stats.rooms.size} rooms, ${stats.items} items\n`);
      process.stdout.write(`  Moves: ${stats.movesOk} ok / ${stats.movesFail} fail\n`);
      process.stdout.write(`  Errors: ${stats.errors} parse, ${stats.loops} loops, ${stats.deaths} deaths\n`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stdout.write(`  FAILED: ${msg}\n`);
    }
  }

  // Leaderboard
  process.stdout.write('\n═══ LEADERBOARD ═══\n\n');
  const scored = results.map(r => ({
    ...r,
    score: r.rooms.size * 10 + r.items * 5 + r.movesOk * 2 - r.errors * 3 - r.loops - r.deaths * 20,
  })).sort((a, b) => b.score - a.score);

  process.stdout.write(
    'Rank | Model    | Score | Rooms | Items | Moves | Errors | Loops | Deaths\n' +
    '-----|----------|-------|-------|-------|-------|--------|-------|-------\n'
  );
  for (let i = 0; i < scored.length; i++) {
    const r = scored[i];
    process.stdout.write(
      `  ${i + 1}  | ${r.name.padEnd(8)} | ${String(r.score).padStart(5)} | ${String(r.rooms.size).padStart(5)} | ${String(r.items).padStart(5)} | ${String(r.movesOk).padStart(5)} | ${String(r.errors).padStart(6)} | ${String(r.loops).padStart(5)} | ${String(r.deaths).padStart(6)}\n`
    );
  }
}

tournament().catch(e => { process.stderr.write(`Error: ${e.message}\n`); process.exit(1); });

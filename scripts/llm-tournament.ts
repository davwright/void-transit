/**
 * LLM Tournament — multiple free-tier models play VOID TRANSIT simultaneously.
 * Evaluates: rooms explored, items collected, puzzles advanced, deaths, parse errors.
 * Uses OpenRouter free/cheap models.
 *
 * Usage: OPENROUTER_KEY=sk-or-... npx ts-node scripts/llm-tournament.ts
 */

const PORT = process.env.PORT || 3999;
const BASE = `http://localhost:${PORT}/api/test`;
const API_KEY = process.env.OPENROUTER_KEY || '';
const MAX_TURNS = 60;

// Free/ultra-cheap models to test
const MODELS = [
  { id: 'qwen/qwen3-8b:free', name: 'Qwen3-8B' },
  { id: 'mistralai/mistral-small-3.1-24b-instruct:free', name: 'Mistral-Small' },
  { id: 'google/gemma-3-4b-it:free', name: 'Gemma-3-4B' },
  { id: 'meta-llama/llama-4-scout:free', name: 'Llama-4-Scout' },
  { id: 'deepseek/deepseek-chat-v3-0324:free', name: 'DeepSeek-V3' },
];

interface PlayerStats {
  model: string;
  name: string;
  turns: number;
  rooms: Set<string>;
  items: string[];
  deaths: number;
  parseErrors: number;
  examineLoops: number;
  movesFailed: number;
  movesSucceeded: number;
  commands: string[];
}

async function askModel(modelId: string, prompt: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'HTTP-Referer': 'void-transit-tournament',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 100,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`${response.status}: ${err}`);
  }

  const data = await response.json();
  let text = data.choices?.[0]?.message?.content?.trim() || 'look';
  // Clean up
  text = text.split('\n')[0].replace(/^["'`>]|["'`]$/g, '').trim();
  if (text.length > 80) text = text.substring(0, 80);
  return text || 'look';
}

async function gameCmd(input?: string): Promise<string> {
  const url = input ? `${BASE}?cmd=${encodeURIComponent(input)}` : BASE;
  const res = await fetch(url);
  return (await res.text()).trim();
}

async function playSession(model: typeof MODELS[0]): Promise<PlayerStats> {
  const stats: PlayerStats = {
    model: model.id, name: model.name,
    turns: 0, rooms: new Set(), items: [],
    deaths: 0, parseErrors: 0, examineLoops: 0,
    movesFailed: 0, movesSucceeded: 0, commands: [],
  };

  // Each player gets a fresh game via the shared test endpoint
  // We need separate sessions — use the POST API instead
  const newGameRes = await fetch(`http://localhost:${PORT}/api/new`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const newGame = await newGameRes.json();
  const sessionId = newGame.sessionId;
  stats.rooms.add(newGame.roomId);

  let lastResponse = newGame.description || '';
  let lastCommand = '';
  let repeatCount = 0;
  const history: string[] = [];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    stats.turns = turn + 1;

    // Ask the model what to do
    const historyText = history.slice(-6).join('\n');
    const prompt = `You are playing a text adventure on a spaceship. Explore, examine things, collect items, solve problems.

RECENT:
${historyText}

GAME:
${lastResponse}

Give ONE command. Movement: fore, aft, port, starboard, up, down. Actions: look, examine [thing], take [thing], use [item], read [thing], i, status, m.
${repeatCount > 2 ? 'WARNING: You are repeating yourself. Try something DIFFERENT — move to another room or examine something new.' : ''}
Command:`;

    let command: string;
    try {
      command = await askModel(model.id, prompt);
    } catch (err) {
      command = 'look';
      stats.parseErrors++;
    }

    // Detect loops
    if (command === lastCommand) {
      repeatCount++;
      stats.examineLoops++;
      if (repeatCount > 4) command = 'aft'; // force movement
    } else {
      repeatCount = 0;
    }
    lastCommand = command;
    stats.commands.push(command);

    // Send command via POST API
    const cmdRes = await fetch(`http://localhost:${PORT}/api/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, input: command }),
    });
    const cmdData = await cmdRes.json();

    lastResponse = cmdData.prose || '';
    history.push(`> ${command}`);
    history.push(lastResponse.substring(0, 150));

    // Track stats
    if (cmdData.roomId) stats.rooms.add(cmdData.roomId);
    if (cmdData.type === 'move_success') stats.movesSucceeded++;
    if (cmdData.type === 'move_failed') stats.movesFailed++;
    if (cmdData.type === 'take_success') stats.items.push(command);
    if (cmdData.type === 'unknown') stats.parseErrors++;
    if (cmdData.health !== undefined && cmdData.health <= 0) { stats.deaths++; break; }

    // Small delay to respect rate limits
    await new Promise(r => setTimeout(r, 1500));
  }

  return stats;
}

async function tournament() {
  if (!API_KEY) {
    process.stderr.write('Set OPENROUTER_KEY env var\n');
    process.exit(1);
  }

  process.stdout.write('═══ VOID TRANSIT LLM TOURNAMENT ═══\n\n');
  process.stdout.write(`Models: ${MODELS.map(m => m.name).join(', ')}\n`);
  process.stdout.write(`Max turns: ${MAX_TURNS}\n\n`);

  const results: PlayerStats[] = [];

  // Play each model sequentially (to avoid rate limits)
  for (const model of MODELS) {
    process.stdout.write(`\n--- ${model.name} (${model.id}) ---\n`);
    try {
      const stats = await playSession(model);
      results.push(stats);

      process.stdout.write(`  Turns: ${stats.turns}\n`);
      process.stdout.write(`  Rooms: ${stats.rooms.size} (${[...stats.rooms].join(', ')})\n`);
      process.stdout.write(`  Items: ${stats.items.length}\n`);
      process.stdout.write(`  Moves: ${stats.movesSucceeded} ok, ${stats.movesFailed} failed\n`);
      process.stdout.write(`  Errors: ${stats.parseErrors} parse, ${stats.examineLoops} loops\n`);
      process.stdout.write(`  Deaths: ${stats.deaths}\n`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stdout.write(`  FAILED: ${msg}\n`);
    }
  }

  // Leaderboard
  process.stdout.write('\n═══ LEADERBOARD ═══\n\n');
  const scored = results.map(r => ({
    ...r,
    score: r.rooms.size * 10 + r.items.length * 5 + r.movesSucceeded * 2 - r.parseErrors * 3 - r.examineLoops - r.deaths * 20,
  })).sort((a, b) => b.score - a.score);

  process.stdout.write(
    'Rank | Model            | Score | Rooms | Items | Moves | Errors | Loops | Deaths\n' +
    '-----|------------------|-------|-------|-------|-------|--------|-------|-------\n'
  );
  for (let i = 0; i < scored.length; i++) {
    const r = scored[i];
    process.stdout.write(
      `  ${i + 1}  | ${r.name.padEnd(16)} | ${String(r.score).padStart(5)} | ${String(r.rooms.size).padStart(5)} | ${String(r.items.length).padStart(5)} | ${String(r.movesSucceeded).padStart(5)} | ${String(r.parseErrors).padStart(6)} | ${String(r.examineLoops).padStart(5)} | ${String(r.deaths).padStart(6)}\n`
    );
  }
}

tournament().catch(e => { process.stderr.write(`Error: ${e.message}\n`); process.exit(1); });

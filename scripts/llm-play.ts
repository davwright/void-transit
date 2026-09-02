/**
 * LLM PLAYTEST — a model plays VOID TRANSIT blind, seeing only what a player sees.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx ts-node scripts/llm-play.ts [--model claude-haiku-4-5-20251001] [--turns 150] [--quiet]
 *
 * Prints a transcript and a summary (acts reached, puzzles solved, beats seen, ending).
 * Useful for finding places where the game is unfair or under-signposted: if a capable
 * model can't progress, a human probably can't either.
 */
import GameEngine from '../src/engine/GameEngine';
import { parse } from '../src/nlp/Parser';
import { buildFallbackProse } from '../src/nlp/ProseGenerator';
import { ActionResult } from '../src/types';

const args = process.argv.slice(2);
const opt = (name: string, dflt: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : dflt; };
const MODEL = opt('model', 'claude-haiku-4-5-20251001');
const TURNS = parseInt(opt('turns', '150'), 10);
const QUIET = args.includes('--quiet');
const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error('ANTHROPIC_API_KEY is not set.'); process.exit(2); }

const SYSTEM = `You are playing a hard science-fiction text adventure. You will be shown the game's output after each command.
Respond with exactly ONE command on a single line and nothing else — no commentary, no quotes.
Useful commands: look, examine <thing>, take <thing>, drop <thing>, wear <thing>, use <thing>, search, inventory, status, help,
movement: fore, aft, port, starboard, up, down, in, out.
When the game presents a problem ("── PROBLEM ──" or a hint), work it step by step with concrete actions and numbers
(e.g. "calculate 5.2", "install cartridge", "program burn 2847 247.3"). Read what the game tells you; the answers are in the text.
Do not repeat a command that just failed with the same wording — try a different verb or gather what you are missing.`;

type Msg = { role: 'user' | 'assistant'; content: string };

async function ask(history: Msg[]): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': KEY!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 40, system: SYSTEM, messages: history }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const data = await res.json() as { content: Array<{ type: string; text?: string }> };
  const text = data.content.filter(c => c.type === 'text').map(c => c.text || '').join('').trim();
  return text.split('\n')[0].replace(/^["'`>]+|["'`]+$/g, '').trim().slice(0, 80);
}

function render(r: ActionResult): string {
  let prose = buildFallbackProse(r);
  for (const e of r.systemEvents || []) prose += `\n[${e.type.toUpperCase()}] ${e.message}`;
  for (const b of r.storyBeats || []) prose += `\n\n${b.text}`;
  if (r.actTransition) prose += `\n\n═══ ${r.actTransition.name} ═══`;
  for (const e of r.globalEvents || []) prose += `\n\n${e.text}`;
  if (r.ending) prose += `\n\n═══ ENDING ═══\n${r.ending.text}`;
  return prose;
}

async function main() {
  const engine = new GameEngine();
  const SID = 'llm';
  const start = engine.newGame(SID);
  const history: Msg[] = [{ role: 'user', content: `${start.intro || ''}\n\n${render(start)}`.trim() }];
  const beats = new Set<string>();
  const acts: string[] = [];
  let ending: string | null = null;
  const failures: Record<string, number> = {};

  for (let t = 1; t <= TURNS; t++) {
    const command = await ask(history.slice(-40));
    const r = engine.processCommand(SID, parse(command));
    const out = render(r);
    r.storyBeats?.forEach(b => beats.add(b.id));
    if (r.actTransition) acts.push(r.actTransition.name);
    if (r.type.includes('fail') || r.type === 'unknown') failures[r.type] = (failures[r.type] || 0) + 1;
    if (!QUIET) console.log(`\n> ${command}\n${out}`);
    history.push({ role: 'assistant', content: command }, { role: 'user', content: out.slice(0, 3000) });
    if (r.ending) { ending = r.ending.id; break; }
    const st = engine.getState(SID)!;
    if (st.playerHealth <= 0) { ending = 'death'; break; }
  }

  const s = engine.getState(SID)!;
  const solved = Object.entries(s.puzzleStates).filter(([, v]) => v === 'solved').map(([k]) => k);
  const active = Object.entries(s.puzzleStates).filter(([, v]) => v !== 'solved').map(([k, v]) => `${k}:${v}@${s.puzzleProgress[k] || 0}`);
  console.log('\n═══ LLM PLAYTEST SUMMARY ═══');
  console.log(`Model: ${MODEL}   Turns: ${s.turnCount}   Health: ${s.playerHealth}`);
  console.log(`Act: ${s.currentAct}   Transitions: ${acts.join(' → ') || 'none'}`);
  console.log(`Rooms visited: ${s.visitedRooms.size}   Inventory: ${s.inventory.length}`);
  console.log(`Puzzles solved: ${solved.join(', ') || 'none'}`);
  console.log(`Puzzles open: ${active.join(', ') || 'none'}`);
  console.log(`Story beats seen: ${beats.size}`);
  console.log(`Failed/unknown commands: ${JSON.stringify(failures)}`);
  console.log(`Ending: ${ending || 'none reached'}`);
}

main().catch(err => { console.error(err); process.exit(1); });

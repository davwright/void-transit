# VOID TRANSIT

### A Hard Science Fiction Text Adventure

```
═══════════════════════════════════════════════════════════════
                  V O I D   T R A N S I T
                       PART ONE
═══════════════════════════════════════════════════════════════
```

You wake up. You shouldn't be awake.

The ISV Kepler's Promise is 19.3 years into a 42-year journey between stars. 2,847 colonists sleep in cryo. The ship hums with the patience of a machine that has been running for two decades without complaint.

But something is wrong. The alarms say so. The empty cryo pod four rows down says so. The half-eaten meal in the mess hall, months old and untouched, says so.

Someone was here before you. Someone who woke alone, worked alone, and made decisions that echo through every system on the ship. Decisions you will need to understand before you can undo them. Or honour them.

The ship is breaking. The air is thinning. And the universe, vast and indifferent, does not care whether you figure it out in time.

**Examine everything. Trust nothing. The answers are in the details.**

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Install & Run

```bash
npm install
npm run build
npm start
```

Open **http://localhost:3000** in your browser.

### Development Mode (TypeScript, auto-restart)

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

---

## How to Play

Type commands in natural language or classic adventure syntax:

| Command | What it does |
|---|---|
| `look` | Describe your surroundings |
| `north`, `south`, `east`, `west`, `up`, `down` | Move (also: `n`, `s`, `port`, `starboard`, `fore`, `aft`) |
| `examine <thing>` | Look closely at something (abbreviations work: `exa panel`) |
| `take <item>` | Pick up an item |
| `drop <item>` | Put down an item |
| `inventory` or `i` | See what you're carrying |
| `use <item>` | Use an item |
| `use <item> on <target>` | Use an item on something |
| `combine <item> with <item>` | Combine two items |
| `status` | Check your health and radiation exposure |
| `systems` | View ship system status |
| `map` | See rooms you've visited |
| `save <name>` | Save your game |
| `load <name>` | Load a saved game |
| `help` | Show available commands |

**Pro tip:** You don't need to type full words. `exa`, `inv`, `sta` all work.

---

## Features

- **Hard science puzzles** -- real physics, real chemistry, real engineering. No magic, no handwaving.
- **Ship systems simulation** -- CO2 rises, batteries drain, radiation accumulates. The ship doesn't wait for you.
- **Literary prose** -- powered by Claude Haiku for atmospheric, context-aware descriptions (falls back to built-in prose when offline).
- **Save anywhere** -- your progress persists between sessions.
- **CRT terminal aesthetic** -- because some interfaces were better in phosphor green.

---

## Haiku NLP

By default, the game uses Claude Haiku (via the `claude` CLI) for natural language parsing and atmospheric prose generation. Set `USE_HAIKU=false` in your environment to use the built-in regex parser instead:

```bash
USE_HAIKU=false npm start
```

---

## Architecture

```
src/
  engine/          Game logic (navigation, inventory, puzzles, story, save/load)
  engine/InteractionLogger.ts   Interaction & Haiku call logger
  nlp/             NLP layer (Haiku parser, prose generator, fallback parser)
  data/            Game content (rooms, items, puzzles, story, ship systems)
  frontend/        Browser UI (terminal-style interface)
  server.ts        Express API server
  debug.ts         Debug console (development only)
logs/              Auto-generated JSONL log files (gitignored)
```

---

## Data Management & Story Improvement

Every game session generates structured log data that feeds back into story quality. Two JSONL log files are written to `logs/`, rotated daily:

### Haiku Dataset (`logs/haiku-YYYY-MM-DD.jsonl`)

Every call to Claude Haiku is captured as a training/evaluation record:

| Field | Description |
|---|---|
| `callType` | `parse` (NLP parsing), `scenery` (freeform questions), or `prose` (narration) |
| `prompt` | Full prompt including tone directives and system instructions |
| `response` | Haiku's complete output |
| `durationMs` | Response latency |
| `room`, `turnCount` | Game context at time of call |
| `error` | Failure details if the call failed |

This captures the tone and style guidance sent to Haiku alongside each response, so you can audit whether the prose matches the intended voice, identify drift, and build evaluation sets.

### Interaction Log (`logs/interactions-YYYY-MM-DD.jsonl`)

Every player command is logged end-to-end:

| Field | Description |
|---|---|
| `rawInput` | Exactly what the player typed |
| `parsedIntent` | Action, target, confidence score, whether alternatives existed |
| `parseMethod` | `local` (deterministic parser) or `haiku` (LLM fallback) |
| `resultType` | Engine result (e.g. `move_success`, `examine_failed`, `unknown`) |
| `proseSource` | Whether the displayed text came from Haiku or built-in fallback |
| `storyContext` | Current act, tension level at time of interaction |

### Using the Logs

**Find parser failures:**
```bash
# Commands the parser couldn't handle
grep '"resultType":"unknown"' logs/interactions-*.jsonl
```

**Find story inconsistencies:**
```bash
# All scenery responses — check for contradictions in the same room
grep '"callType":"scenery"' logs/haiku-*.jsonl | jq '{room, prompt, response}'
```

**Audit tone/quality:**
```bash
# Review all Haiku prose with the full system prompt that generated it
grep '"callType":"prose"' logs/haiku-*.jsonl | jq '{prompt, response}'
```

**Measure Haiku reliability:**
```bash
# Error rate and latency
grep '"error"' logs/haiku-*.jsonl
grep -o '"durationMs":[0-9]*' logs/haiku-*.jsonl | sort -t: -k2 -n
```

**Programmatic access** (for tests or analysis scripts):
```typescript
import { logger } from './engine/InteractionLogger';

const haikuCalls = logger.readHaikuLogs();      // all haiku prompt/response pairs
const interactions = logger.readInteractionLogs(); // all player interactions

// Find scenery responses that might contradict each other
const sceneryByRoom = new Map<string, typeof haikuCalls>();
for (const entry of haikuCalls.filter(e => e.callType === 'scenery')) {
  const list = sceneryByRoom.get(entry.room) || [];
  list.push(entry);
  sceneryByRoom.set(entry.room, list);
}
```

### Improvement Workflow

1. **Play the game** — logs accumulate automatically
2. **Review failures** — filter for `unknown`, `examine_failed`, `take_failed` to find gaps in parser coverage or missing game content
3. **Audit Haiku output** — compare scenery responses within the same room for contradictions; check tone against the style guide
4. **Build regression tests** — use logged prompt/response pairs as expected baselines in test suites
5. **Expand game data** — when players consistently ask about something missing, add it to `scenery.json` or `items.json`

---

*The void is patient. It has been waiting for you.*

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
  nlp/             NLP layer (Haiku parser, prose generator, fallback parser)
  data/            Game content (rooms, items, puzzles, story, ship systems)
  frontend/        Browser UI (terminal-style interface)
  server.ts        Express API server
  debug.ts         Debug console (development only)
```

---

*The void is patient. It has been waiting for you.*

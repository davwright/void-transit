# VOID TRANSIT

### A Hard Science Fiction Text Adventure

**Play now:** https://davwright.github.io/void-transit/

```
═══════════════════════════════════════════════════════════════
                  V O I D   T R A N S I T
                       PART ONE
═══════════════════════════════════════════════════════════════
```

You wake up. You shouldn't be awake.

The ISV Kepler's Promise is 19.3 years into a 42-year journey to 82 Eridani. 2,847 colonists sleep in cryo. The ship hums with the patience of a machine that has been running for two decades without complaint.

But something is wrong. The alarms say so. The empty cryo pod four rows down says so. The half-eaten meal in the mess hall, months old and untouched, says so.

Someone was here before you. Someone who woke alone, worked alone, and made decisions that echo through every system on the ship.

The ship is breaking. The air is thinning. And the universe, vast and indifferent, does not care whether you figure it out in time.

**Examine everything. Trust nothing. The answers are in the details.**

---

## Play

The game runs entirely in the browser — no server needed.

**https://davwright.github.io/void-transit/**

---

## How to Play

Type commands. The ship responds.

| Command | Example |
|---|---|
| Look around | `look` |
| Move | `fore`, `aft`, `port`, `starboard`, `up`, `down` |
| Examine | `examine panel`, `check leads`, `look at viewport` |
| Take / Drop | `take towel`, `drop all` |
| Use | `use towel`, `drink water`, `eat ration` |
| Wear / Remove | `wear suit`, `take off suit` |
| Inventory | `i` |
| Status | `status` |
| Help | `help` |

Abbreviations work: `exa`, `inv`, `sta`, `f`, `a`, `p`, `sb`.

The ship uses nautical orientation. There is no north out here.

---

## What Makes This Different

- **Real physics** — the ship rotates at 2 RPM for gravity. Cryo is in the spine because zero-g eliminates pressure sores. Fluids form spheres. Dropped objects drift. The math is real and the puzzles use it.
- **Seven science puzzles** — pharmacokinetics, Dalton's law, Ohm's law, inverse square radiation, EVA mechanics, the Tsiolkovsky rocket equation, signal analysis. Every answer is derivable from information the game gives you.
- **A mystery** — someone was awake before you. What did they do? Why? The clues are everywhere.
- **Consequences** — the cold will kill you if you don't dress. The CO2 is rising. The ship doesn't wait.
- **Data-driven engine** — all game behavior is defined in JSON. Room physics, item interactions, state transitions, system thresholds. The engine evaluates rules; it doesn't contain story.

---

## Development

### Prerequisites
- Node.js 18+

### Install & Run locally

```bash
npm install
npm start            # builds + starts server at localhost:3000
```

### Browser build (GitHub Pages)

```bash
npm run build:browser   # outputs to docs/
```

### Tests

```bash
npm test             # 154 tests including a complete, command-only playthrough (tests/story.test.ts)
```

### LLM playtest

```
ANTHROPIC_API_KEY=... npx ts-node scripts/llm-play.ts --model claude-haiku-4-5-20251001 --turns 150
```

A model plays the game blind through the real engine and prints a summary (acts reached, puzzles solved, ending). If a capable model gets stuck, a human probably will too.

### Data editing workflow

```bash
npm run decode       # src/data/*.json → data-plain/*.json (readable)
# edit data-plain/*.json
npm run encode       # data-plain/*.json → src/data/*.json (base64)
npm test             # verify
```

Story data is base64-encoded at rest to avoid casual spoilers.

---

## Architecture

```
src/
  engine/          Game engine — state, commands, rules, puzzles, story
    RuleEngine.ts  Data-driven behavior (conditions → effects → messages)
    GameEngine.ts  Tick systems, state management, save/load
  nlp/             Parser pipeline (deterministic + statistical + Haiku fallback)
  data/            Game content (rooms, items, puzzles, story, rules, ship systems)
  browser/         Browser entry point (Vite)
  frontend/        Terminal UI (HTML/CSS/JS)
design/
  SHIP-GEOMETRY.md Engineering spec — rotation, gravity, propulsion, shielding
  CHARACTERS.md    Character reference
  STORY-PLAN.md    Story arc and puzzle design (SPOILERS)
  STORY-REVIEW.md  Craft review + improvement log (SPOILERS)
```

---

## Design Documents

The ship is engineered from first principles:

- **Rotation**: Whole ship spins at 2 RPM as rigid body. Ring at r=157m gives 0.7g.
- **Propulsion**: Laser sail acceleration from Sol + D-³He fusion deceleration. Mass ratio 20:1.
- **Shielding**: Fuel tanks + 0.5m water jacket + Gd-doped cryoprotectant.
- **Reactor**: Field-Reversed Configuration (FRC), not tokamak. Langmuir Compensators for charge neutralisation.

See `design/SHIP-GEOMETRY.md` for full derivations with working.

---

*The void is patient. It has been waiting for you.*

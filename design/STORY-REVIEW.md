# VOID TRANSIT — Story Review & Improvement Plan

**⚠ SPOILERS. This document discusses the full plot, all endings, and the Part 2 hook.**
**Do not read if you intend to play Part 1 blind.**

Reviewed against `.claude/skills/story-craft.md` (Niven physics-as-plot, Asimov paradigm shift,
Clarke awe/dread, Weir crisis cascade, environmental storytelling, foreshadowing, cliffhangers,
strong characters) plus a direct read of `story.json`, `puzzles.json`, `rooms.json`, `items.json`,
`rules.json`, `STORY-PLAN.md`, and `CHARACTERS.md`. Date: 2026-09-02.

---

## 0. The headline: the story is written, but it is not wired to the engine

Before any craft discussion, the single most important finding. Empirically (fresh engine, real
parsed commands: wake, dress, leave pod, examine the empty pod, walk two rooms, examine a terminal):

```
act: act1_awakening   beats fired: []   global events: []   puzzles active: {}
```

Nothing in the narrative layer fires in real play. Specifically:

| Layer | Authored schema | What the engine understands | Result |
|---|---|---|---|
| Story beats (`story.json`) | `type: room_visit / player_enters / player_action / timer / state_check / state_change / act_start / puzzle_complete` | `room`, `flag_*`, `puzzle_*`, `has_*`, `visited_*`, `turnCount_gte`, `health_below`; **any unknown key → false** | 0 of 27 beats can fire |
| Act transitions | same authored schema | same | game never leaves Act 1 |
| Global events | `timer`, `random`, `location` | same | never fire |
| Endings | `choice`, `chen_woken`, `signal_sent`, `cause` | same | no ending is reachable |
| Puzzle activation | `PuzzleEngine.checkPuzzleTriggers` looks for `puzzle.triggerRoom` | no puzzle in `puzzles.json` has `triggerRoom` | no puzzle ever activates |
| Puzzle step effects | `stateChange: { set, unlock, add_item, remove_items, start_timer, modify_item }` | `_applyStateChanges` only reads `flag_*`, `system_*`, `item_reveal_*`, `item_location_*` | `life_support_calibrated`, `course_corrected`, `transmission_decoded` etc. are never set even when a puzzle is "solved" |
| Puzzle step validation | `item_use, interaction, sequence, timed_action, input_values, state_check, item_search, item_retrieval, equipment_check, crafting, navigation, system_interaction, item_check` | only `exact, numeric/calculation, item_present, action_match, any` are implemented; **all others return valid** | once active, every non-numeric step is solved by typing anything (the god-run test comments say so: "any input works") |
| Final choice | `player_choice: final_decision` | no command, rule, or handler exists for "wake chen" / "send signal" | the climax cannot be reached |

The 153 passing tests don't catch this because `godrun.test.ts` sets `puzzleStates[id] = 'active'`
by hand and never asserts on acts, beats, flags, or endings.

**Consequence for the player:** VOID TRANSIT as deployed is a very good prologue (the pod, dressing,
the cold, the first walk) followed by an open-world ship with seven unreachable puzzles and no story.
Everything below about pacing and tension is moot until this is fixed, so it is Priority 0.

---

## 1. What is working (keep it)

- **The Absent Expert (guide §9) is executed well.** Chen is never on screen and is the strongest
  character in the game: self-elevated clearance, hand-built antenna, reactor modifications, the
  chess game she plays to lose, the meal she abandoned, the worn ladder rungs. Her competence and
  loneliness are both shown through evidence. Her final log entry ("DO NOT correct the course") is a
  genuinely good piece of writing.
- **Physics-as-plot (guide §1) is real, not decorative.** The brown dwarf at apoapsis during the
  survey is a legitimate "hidden implication of known information" (guide §2): nobody lied, the
  system was simply sampled at its most benign moment in a 2,100-year cycle. That is Asimov-grade.
- **The naive model vs. true model (guide §2) is structurally correct.** Naive: Chen is a saboteur.
  True: Chen is a prophet. The player is *invited* to hold the naive model by the game's own
  vocabulary (`saboteur_identified`, "sabotage pattern") and then has it demolished.
- **The Part 2 hook (guide §8 "Escalation") is the right kind.** Answer one question (why Chen did
  it) while opening two bigger ones (what is at L2, and why did it ping *this* ship). The 400-million-
  year-old object at 3 K above CMB is a concrete, visceral final image.
- **Environmental storytelling density is high.** `scenery.json` is 276 KB; rooms have three-level
  descriptions; the ship has a voice (fan bearing chirps, thermal ticking). The "absence as narrative"
  technique is used repeatedly and well.
- **Prose rhythm varies with tension** in the act texts (long lyrical sentences in Act 2, fragments in
  the pod).

---

## 2. Chekhov's guns — planted, and whether they fire

| Gun | Planted | Fires? | Assessment |
|---|---|---|---|
| Empty pod C-447 | Act 1 | Yes — Act 5 (B-221, why she didn't reuse her pod) | ✅ Excellent |
| Half-eaten meal | Act 2 | Yes — Chen's log | ✅ |
| Chess game, white losing | Act 2 | Yes — Chen's log, and the final image of `ending_do_nothing` | ✅ Best payoff in the game |
| Coolant smell in corridor C | Act 2 | Payoff text exists but no beat delivers it | ⚠ Payoff is orphaned in `foreshadowing[]`; nothing displays it |
| Star chart in the lab (Tau Ceti "VIABLE") | Act 2 | Yes — captain's quarters | ✅ This is the fair-play clue for the twist. Keep it early. |
| Maintenance logs | Act 2 | Yes | ✅ |
| **Chen's jumpsuit & photo in the player's pod** | Act 1 | **No.** `CHARACTERS.md` says the patch reads CHEN; `items.json` says it reads UNIT 37 and "you must have broken it in". The mystery of why the player was woken is never touched again. | ❌ The biggest unfired gun. Also an internal contradiction. |
| **Warm spot in corridor D** | STORY-PLAN calls it "the first physical clue" | Mentioned once in scenery; nothing connects it to the antenna power feed | ❌ Unfired |
| Captain's keycard | Bridge | Yes — unlocks quarters | ✅ |
| Navigation chair adjusted for someone shorter / black hair / worn rungs | Various | Atmospheric only | ✅ Fine as texture |
| Player's identity ("revealed through Chen's logs") | CHARACTERS.md | **No.** Chen's log never mentions the player. The datapad "recognizes your command-level clearance" but the bridge says "junior crew". | ❌ Contradiction + unfired |
| JANUS "pinged you 11 hours ago" | Act 5 | Fires in every ending | ✅ but see §6 on repetition |

---

## 3. Pacing

**Act 1 (pod → stimulant): good.** Claustrophobic, physical, short. The 120-second alarm beat is
the right instinct (make the player *feel* the clock before any puzzle).

**Act 2 → Act 3 boundary is mushy.** Act 2 ends on "any two of life_support / circuits / atmosphere"
but `atmosphere_analyzed` and `life_support_calibrated` are steps 2 and 5 of the *same* puzzle, so a
player who only does life support is already in Act 3 without having seen the electrical or reactor
problems that Act 3's opening alarm describes. Recommend: `any_two_of` → `all_of: [life_support_
calibrated, circuits_diagnosed]`.

**Act 3 has no cascade (guide §4).** The Weir formula is crisis → solution → *complication*. Here the
crises all exist from turn 1 and are just unveiled. Cheap, high-impact fix: make the hull breach a
*consequence* of the reactor work — the shielding panel is aft of Frame 47; torquing it to 45 Nm in
0.55 g transmits a shock through the hull stringer and opens the micro-fracture Chen's EVA had
already stressed. Then `hull_breach_detected` is set by completing `reactor_shielding`, the alarm
beat fires the moment the player feels safe, and the guide's "quiet before escalation" (§6) is
satisfied for free.

**Act 4 has a Chekhov ordering bug that breaks the twist.** `comms_restoration` only requires
`electrical_reroute`. A player can decode Chen's message *before* burning 88.7% of the fuel. Every
Act 4/5 beat (`beat_comms_revelation`, `beat_the_weight`, `beat_find_chen`, all endings) is written
assuming burn-first: "*And you have just spent nearly all the remaining fuel to steer the ship back
toward it.*" Worse, a comms-first player is then *forced* to do the burn anyway to leave Act 4 — the
game makes them knowingly fly 2,847 people into a doomed system. Fix: make `navigation_correction`
a prerequisite of `comms_restoration`, with an in-fiction reason that is real physics: **you cannot
point a high-gain antenna at a 0.3 ly target without a corrected navigation fix.** The tragic irony
then becomes airtight *and* fair, because the lab star chart was available since Act 2.

**Act 5 is under-directed.** After reading the log the player needs to (a) search the cryo bay for
Chen and (b) return to the comms room for the choice. Neither is signposted. `beat_the_weight` and
`beat_find_chen` need one sentence each pointing at the next location.

---

## 4. Puzzles

All seven are the right *kind* of puzzle for this guide — every answer is derivable, and the science
is load-bearing. Issues:

- **Solvability is currently binary: numeric steps or nothing.** With validation implemented,
  each non-numeric step should require the *right kind of action* (install ≠ calculate), the right
  items, and the right room — not a 7-item exact sequence the player can't know.
- **`ls_step_5` (recalibrate)** asks for four numbers summing to 101.3 kPa. That is fair *only* if the
  fixed values (argon 0.93, water 0.5, trace 0.1) are shown to the player. Make the step text list them.
- **`nc_step_4` (program burn)** wants Δv, angle, and fuel mass — all three were computed in earlier
  steps, so this should accept any two.
- **The 14-hour burn and the 2-hour scrubber** are timers. There is no time model. Recommend:
  1 turn = 5 ship-minutes; the `verify` step fast-forwards a pending timer ("Fourteen hours later…" is
  already in the text).
- **Difficulty curve is flat-then-cliff.** Cryo dosage (one multiplication) → Dalton's law (three
  steps) → Ohm's law → inverse square → EVA (no math) → Tsiolkovsky (hard) → signal geometry. Fine,
  but the EVA puzzle is the emotional peak of Act 3 and has the least *thinking*. Its lethal failure
  mode (no tether) is the best-written failure in the game and is currently unreachable.
- **Hidden items** (`antenna_component` in cargo, `captains_key` in med bay per items.json but on the
  bridge per rooms.json) need one canonical location.

---

## 5. Escalation, tension, and the universe as antagonist

- **CO₂ as cognitive decline (guide §10 Tier 3) is set up and not used.** `event_co2_warning` has a
  cumulative cognition penalty in its data. Nothing reads it. Even a cosmetic use — dropping the
  parser's spelling-correction tolerance or occasionally garbling a room description while CO₂ is
  high — would be the single most on-brand tension mechanic the game could have.
- **Radiation is the best-implemented hazard** (inverse-square, per-session exposure). Keep.
- **The correction burn should feel like the point of no return (guide §8 "Threshold").** Currently
  it is a step result. It deserves a confirmation prompt: the game should make the player type
  `confirm burn` after showing the fuel remaining, so the choice is theirs.
- **Tension score (`_calculateTension`) exists and is never surfaced.** Feed it to the status bar
  colour or to the ambient event probability.

---

## 6. Prose and consistency

- **Colonist count.** README and items say **2,847**; `story.json` says "four thousand" 14 times and
  "4,000" once; `puzzles.json` says "four thousand" 7 times. Pick one. (Standardised to 2,847 /
  "nearly three thousand" in this pass.)
- **Speed vs distance.** 82 Eridani is ~19.7 ly. At 0.12 c a 42-year transit covers ~5 ly. The
  existential beat says the ship is 12.2 ly from Earth at year 19.3. `SHIP-GEOMETRY.md` may reconcile
  this with a sail-boost profile; if so, the story text should say "peak 0.47 c" somewhere, or drop
  the 0.12 c figure. Hard-SF readers will do this arithmetic.
- **The pod jumpsuit** (see §2): decide whose it is. Recommendation: it is Chen's, patch reads CHEN,
  and her final log gets one line — "*I left my jumpsuit in Unit 37. Whoever wakes first will wake
  cold.*" — which fires the gun *without* answering why Unit 37 (that is Part 2).
- **`beat_the_weight`** has a self-correcting stumble ("Chen is in Pod C-447 -- no, Pod C-447 is open
  and empty") that reads as a draft note. Cut.
- **The JANUS paragraph** is pasted near-verbatim into six endings. As a motif it works once or twice;
  by the sixth the reader skims the best image in the game. Vary the framing per ending (who reads
  it, or doesn't; what they see first).
- **`personal_datapad.readText`** says it is locked with the captain's biometrics; `beat_captains_
  quarters` says it unlocks to the player's command clearance. Pick the first (it is better — the
  player using *guest mode* like Chen did is a nice echo).

---

## 7. Implementation plan (this pass)

Priority 0 — wire the story (engine)
- [x] `StoryManager._checkTrigger`: support the authored trigger schema (`room_visit`, `player_enters`,
      `first_room_change`, `player_action` w/ target aliases, `puzzle_complete`, `act_start`,
      `state_check` any_of/any_two_of/all_of, `state_change`, `timer` w/ condition expressions,
      `random` w/ cooldown, `location`, `player_choice`) and ending keys (`choice`, `cause`, flag names).
- [x] `GameState`: `lastIntent`, `actStartTurn`, `eventLastFired`, `timers`.
- [x] `GameEngine`: re-check beats after an act transition (so `act_start` beats fire on the same turn);
      tick timers.
- [x] `PuzzleEngine._applyStateChanges`: `set`, `unlock`, `add_item`, `remove_items`, `modify_item`,
      `start_timer`.
- [x] `PuzzleEngine._validateAction`: real semantics for all authored validation types (items, room,
      required state, action keywords, `input_values` numeric matching, `state_check` timer fast-forward).
- [x] `PuzzleEngine.checkPuzzleTriggers`: honour `prerequisitePuzzles`.
- [x] Final choice: data-driven rules for `wake chen`, `send signal`, `both`, `return to cryo`.
- [x] Found while running the happy path: scenery examines skipped story checks (so `examine
      navigation display` could never fire its beat); beats were only live in their own act (an
      Act 3 beat could never fire once Act 4 began); inventory resolution took the *first* alias
      match, so `wear eva suit` re-equipped the jumpsuit; puzzle fallback passed the noun instead
      of the full input. All fixed. Foreshadowing plants, puzzle activation and global events are
      now rendered in the no-LLM prose path (they were built but never displayed).
- [x] `tests/godrun.test.ts` removed — it hand-activated puzzles and asserted "any input works";
      `tests/story.test.ts` is the canonical playthrough.

Priority 1 — story fixes (data)
- [x] `triggerRoom` on all seven puzzles.
- [x] `comms_restoration` requires `navigation_correction` (Chekhov ordering).
- [x] Hull breach becomes a consequence of the reactor repair (cascade).
- [x] Act 2 exit condition tightened.
- [x] `chen_log_read`, `chen_found`, `hull_breach_detected` set by beats.
- [x] Signposting sentences for Act 5.
- [x] Colonist count standardised.
- [x] `beat_the_weight` stumble cut.
- [x] Jumpsuit gun fired in Chen's final log entry.

Priority 2 — tests
- [x] `tests/story.test.ts`: full happy path with *no* manual state poking; asserts every act
      transition, key beats, all flags, and a reachable ending.
- [x] `scripts/llm-play.ts`: an LLM agent plays the game blind (see §8).

Not done in this pass (recommended next)
- CO₂ cognitive-decline mechanic; burn confirmation prompt; tension → UI; ending-text variation;
  speed/distance reconciliation; canonical hidden-item locations; `no_tether` failure path reachable.

---

## 8. "Dumb Haiku" playtest

`scripts/llm-play.ts` drives `GameEngine` with an LLM that sees only what a player would see. Run:

```
ANTHROPIC_API_KEY=... npx ts-node scripts/llm-play.ts --model claude-haiku-4-5 --turns 150
```

It prints a transcript and a summary (rooms, puzzles, act reached, flags). It requires network access
to `api.anthropic.com` and a key; neither was available in the environment where this review was
produced, so no Haiku result is recorded here. Record results in `docs/PLAYTESTS.md`.

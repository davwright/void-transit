# Entity State Engine — Unified Data-Driven Behavior

## Problem

Behavior is scattered across multiple mechanisms, each with its own condition-checking and effect-applying pattern:

| Mechanism | Where | What it does |
|---|---|---|
| `StateTransitionEngine` | `state-transitions.json` | Posture transitions only |
| `openTargets` | `rooms.json` | Set flags, reveal items on "open X" |
| `conditionalDescriptions` | `rooms.json` | Append text to room desc based on flags |
| `lookOverrides` | `state-transitions.json` | Replace room desc based on flags |
| `_tickSystems` | Hardcoded in `GameEngine.ts` | CO2, battery, radiation per-turn |
| `usableWith` | `items.json` | Item interactions with conditions |
| `revealsOnExamine` | `rooms.json` | Reveal items when scenery examined |
| `cantTake` | `rooms.json`/`scenery.json` | Custom "can't take" messages |
| Exit conditions | `rooms.json` | Block movement with messages |

These are all the same pattern: **condition → trigger → effects → message**. They should be one system.

## Design: Universal Rule Engine

### Core concept: Rules

A **Rule** is a data-driven unit of behavior:

```json
{
  "id": "cryo_remove_leads",
  "trigger": {
    "action": ["open", "remove", "pull", "take_off"],
    "target": ["leads", "patches", "adhesive patches", "monitoring leads", "wires"],
    "room": "cryo_pod"
  },
  "conditions": {
    "flag_posture": "sitting",
    "flag_leads_removed": false
  },
  "effects": {
    "setFlags": { "leads_removed": true },
    "revealItems": ["some_item_id"],
    "removeItems": ["some_item_id"],
    "moveItems": { "item_id": "room_id" },
    "setItemProperty": { "item_id": { "prop": "value" } },
    "systemChange": { "path.to.value": 123 },
    "damage": 5,
    "heal": 10
  },
  "message": "You peel the adhesive patches from your chest...",
  "priority": 10
}
```

### Trigger types

Rules trigger on different events. The `trigger` field specifies when:

- **`action` + `target`** — player command (replaces openTargets, posture, cantTake, usableWith)
- **`onLook`** — room look override (replaces lookOverrides)
- **`onEnter`** — entering a room (replaces firstVisit conditional logic)
- **`onTick`** — every turn (replaces _tickSystems hardcoded logic)
- **`onExamine`** — examining scenery (replaces revealsOnExamine)
- **`passive`** — checked continuously, fires once when conditions met (replaces story beats)

### Conditions (unchanged from current `checkCondition`)

The existing condition prefix system works well and stays:
- `flag_X` — check gameState.flags
- `has_X` — check inventory
- `equipped_X` — check equipped
- `puzzle_X` — check puzzle state
- `system_X.Y.Z` — check ship system value
- `room` — current room (shorthand in trigger)

New additions:
- `not_flag_X` — negation (currently awkward with `false` values)
- `turn_gte_N` / `turn_lte_N` — turn count thresholds
- `health_lte_N` / `health_gte_N` — health thresholds

### Effects (unified)

All current side effects collapse into one effects system:
- `setFlags` — set flags (replaces `openTargets.flags`, `transition.newFlags`, `readReveals`, etc.)
- `revealItems` — unhide items (replaces `revealsItem`, `revealsItems`, `openReveals`, `revealsOnExamine`)
- `message` — response text (replaces all the scattered message fields)
- `systemChange` — modify ship systems
- `damage` / `heal` — health changes
- `consumeItems` — remove from inventory
- `grantItems` — add to inventory
- `moveItems` — relocate items to rooms
- `blockMessage` — for rules that PREVENT an action (replaces `blockedMessage`, `cantTake`)

### Priority & specificity

Rules are evaluated in priority order (higher first). First matching rule wins. This replaces the current implicit ordering where openTargets are checked before items, posture is checked before commands, etc.

Default priorities:
- 100: Block rules (can't do X because Y)
- 50: State transitions (posture changes, interactions)
- 10: Descriptions (look overrides, conditional text)
- 1: Tick rules (per-turn system changes)

## Implementation Plan

### Phase 1: Rule data format + engine (no behavior change)

1. **Create `src/data/rules.json`** (in `data-plain/`) with rules that replicate ALL current behavior:
   - Convert `state-transitions.json` transitions → action rules
   - Convert `state-transitions.json` lookOverrides → onLook rules
   - Convert all `openTargets` from rooms → action rules
   - Convert `cantTake` entries → block rules
   - Convert `revealsOnExamine` → onExamine rules
   - Convert exit `blockedMessage` → block rules
   - Convert `_tickSystems` → onTick rules
   - Convert `conditionalDescriptions` → onLook rules (append mode)

2. **Create `src/engine/RuleEngine.ts`**:
   - Load rules from `rules.json`
   - `matchAction(intent, gameState)` → finds matching action/block rule
   - `matchLook(roomId, gameState)` → finds look override/append rules
   - `matchTick(gameState)` → finds applicable tick rules
   - `matchEnter(roomId, gameState)` → finds enter rules
   - `applyEffects(rule, gameState)` → unified effect application
   - `checkConditions(conditions, gameState)` → reuse NavigationManager.checkCondition

3. **Wire into CommandProcessor**:
   - Before each handler, check `ruleEngine.matchAction()` — if a rule matches, apply it and return, skipping the hardcoded handler
   - In `_handleLook`, check `ruleEngine.matchLook()` before current logic
   - In `GameEngine._tickSystems`, check `ruleEngine.matchTick()`

4. **Tests**: Ensure all 137 existing tests still pass — behavior must be identical.

### Phase 2: Migrate existing data (remove old mechanisms)

5. **Remove `state-transitions.json`** — all transitions now in `rules.json`
6. **Remove `openTargets` from rooms** — all in rules
7. **Remove `cantTake` from rooms/scenery** — all in rules
8. **Remove `conditionalDescriptions` from rooms** — all in rules
9. **Remove hardcoded `_tickSystems`** — all in rules
10. **Remove `StateTransitionEngine.ts`** — replaced by RuleEngine
11. **Remove `_handlePosture` from CommandProcessor** — handled by rule matching
12. **Clean up types** — remove old interfaces, add Rule types

### Phase 3: New capabilities (the payoff)

13. **Telemetry issues from today**:
    - "get leads" after removal → block rule with better message
    - "use towel" self-use → action rule: dry off
    - "enter pod" from bay → block rule with narrative
    - Look after leads removed → onLook rule with updated description
    - "drop all" / "get all" → bulk commands (separate from rules, but enabled by cleaner CommandProcessor)

14. **Cold/exposure system** → onTick rules checking `not equipped_jumpsuit` in cold rooms
15. **Lighting affects visibility** → onLook rules that gate description detail on room light state

## What stays in code vs data

**In data (rules.json)**:
- All room interactions (open, remove, take blockers)
- All state transitions (posture, item states)
- All look overrides and conditional descriptions
- All per-turn system ticking
- All entry/exit conditions and messages

**In code (engine)**:
- Rule evaluation logic (match, apply)
- Core mechanics (inventory weight, movement, parsing)
- Save/load
- Prose generation (Haiku integration)

## Files changed

- NEW: `data-plain/rules.json` (and encoded `src/data/rules.json`)
- NEW: `src/engine/RuleEngine.ts`
- NEW: `src/types.ts` — Rule, RuleTrigger, RuleEffect interfaces
- MODIFIED: `src/engine/CommandProcessor.ts` — check rules before handlers
- MODIFIED: `src/engine/GameEngine.ts` — load rules, wire RuleEngine
- MODIFIED: `src/engine/NavigationManager.ts` — minor (rules handle some conditions)
- DELETED (Phase 2): `src/engine/StateTransitionEngine.ts`
- DELETED (Phase 2): `src/data/state-transitions.json`
- MODIFIED: `scripts/decode-data.ts`, `scripts/encode-from-plain.ts` — add rules.json to file list

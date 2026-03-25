# Phase 2: Data-Driven Engine

## Principle

Every game behavior should be expressible in data. The engine should be a generic evaluator — it reads rules, checks conditions, applies effects. If you can't change a behavior by editing JSON, it's a bug.

## What moves where

### rooms.json — per-room physics properties

Add to each room definition:

```json
{
  "id": "cryo_pod",
  "gravity": 0.0,
  "temperature": "freezing",
  "lighting": "emergency",
  "confinesPosture": true,
  ...existing fields...
}
```

- `gravity`: 0.0 | 0.55 | 0.65 | 0.70 — replaces ZERO_G_ROOMS, LOW_G_ROOMS sets
- `temperature`: "freezing" | "cold" | "cool" | "nominal" — replaces coldRooms, freezingRooms sets
- `lighting`: "dark" | "emergency" | "industrial" | "warm" | "nightwatch" — future visibility system
- `confinesPosture`: true — replaces the hardcoded posture-reset-on-exit logic

### ship-systems.json — thresholds and reveal conditions

Extend each subsystem with thresholds and discovery info:

```json
"co2_scrubbers": {
  ...existing fields...,
  "thresholds": [
    { "field": "co2_ppm", "above": 25000, "flag": "co2_warning_given", "event": "warning", "messageKey": "co2_warning" },
    { "field": "co2_ppm", "above": 40000, "flag": "co2_critical_given", "event": "critical", "messageKey": "co2_critical", "damage": 5 },
    { "field": "co2_ppm", "above": 50000, "event": "fatal", "messageKey": "co2_fatal", "kill": true }
  ],
  "tickEffect": { "field": "co2_ppm", "delta": "+150", "condition": "status != nominal", "scale": "1 - efficiency" },
  "revealRooms": ["life_support"]
}
```

### messages.json — all player-facing strings

Move ALL hardcoded messages here:
- `navigation.noExit.*` — direction-specific no-exit messages
- `help` — full help text
- `posture.*` — posture failure messages
- `cold.*` — cold exposure message arrays (dry and wet tracks)
- `survival.*` — hunger/thirst messages

### game-config section (top of rooms.json or new bootstrap field)

```json
"bootstrap": {
  "startRoom": "cryo_pod",
  "initialFlags": { "posture": "lying" },
  "initialHealth": 65,
  "initialAct": "act1_awakening"
}
```

### inventory config (in ship-systems.json or standalone)

```json
"inventory": {
  "baseCarryWeight": 25,
  "baseGravity": 0.7,
  "zeroGLimit": 999
}
```

## Implementation order

The issues below are ordered so each one is independently shippable and testable.

### Batch 1: Room properties (eliminates hardcoded room lists)

1. **Add gravity/temperature/lighting to rooms.json** — Per-room physics properties. Engine reads from room data instead of hardcoded Sets.
2. **InventoryManager reads gravity from room data** — Remove ZERO_G_ROOMS/LOW_G_ROOMS. getGravity() looks up room.gravity.
3. **Cold system reads temperature from room data** — Remove coldRooms/freezingRooms Sets. _tickSystems reads room.temperature.

### Batch 2: System thresholds (eliminates hardcoded tick logic)

4. **System thresholds in ship-systems.json** — Each subsystem declares its own warning/critical/fatal thresholds, tick effects, and damage.
5. **Generic tick evaluator** — _tickSystems becomes a loop over system thresholds: check condition, apply delta, check thresholds, emit events. No system-specific code.
6. **Cold/survival as tick systems** — Cold exposure and hunger/thirst become entries in the threshold system, not special-cased code.

### Batch 3: Messages and config (eliminates hardcoded strings)

7. **All messages in messages.json** — Navigation no-exit, help text, posture failures, cold warnings, hunger/thirst.
8. **Game bootstrap config** — Starting room, initial flags, health, act. Loaded from data, not hardcoded.
9. **Status display driven by system reveal conditions** — Each system in ship-systems.json declares which rooms reveal it. Status handler reads this instead of hardcoded room checks.

### Batch 4: Cleanup

10. **Remove StateTransitionEngine.ts** — All transitions now handled by RuleEngine.
11. **Remove state-transitions.json** — All data now in rules.json.
12. **Remove openTargets/cantTake from rooms** — All handled by rules.

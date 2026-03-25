# VOID TRANSIT — Story Plan (SPOILERS)

**DO NOT SHARE WITH PLAYER. This is the author's reference.**

## Story audit result

All 7 puzzles solvable. All 5 acts reachable. All endings work. Item chains verified. No dead ends. Part 1 is structurally complete.

## Puzzle physics alignment with SHIP-GEOMETRY.md

Each puzzle should leverage the ship's real physics:

### Puzzle 1: Cryo Recovery
- Zero-g medical procedure. Injecting a stimulant in zero-g means the liquid doesn't settle — dosage calculation matters because distribution is different without gravity.
- The player is floating, shivering, fumbling. The cold system adds urgency.

### Puzzle 2: Life Support (Dalton's Law)
- CO2 scrubber replacement in Deck C (0.55g). Lighter gravity means the cartridge is easier to handle but the reduced gravity affects how gases mix — convection is weaker, CO2 doesn't rise away from you, it accumulates around your face.
- Without convection, the atmosphere sample collection matters — you need to sample from multiple points, not just one.

### Puzzle 3: Electrical Reroute (Ohm's Law)
- Deck C, 0.55g. Cable routing in reduced gravity — the cable spool doesn't stay put, it drifts. Soldering in reduced gravity — solder behaves differently, surface tension dominates.
- The Bus B failure is on Deck C where gravity is low — this affects which repair approaches work.

### Puzzle 4: Reactor Shielding
- Deck C, 0.55g, radiation hazard. The shielding panel is heavy (high mass) but weighs less in 0.55g — you can carry it here but couldn't on Deck B. This is the first inertia puzzle: the panel is movable but has momentum when you push it.
- Timed exposure windows based on inverse square law — distance from reactor matters.

### Puzzle 5: Hull Breach Repair (EVA)
- Zero-g, vacuum. The sealant gun has recoil (Newton's third law) — without a tether, the reaction force pushes you away from the hull. This is the lethal failure mode.
- Welding in vacuum — no convection cooling, heat accumulates. The weld puddle forms a sphere.
- Pressure differential pushes the patch outward — you must apply from outside, not inside.

### Puzzle 6: Navigation Correction (Tsiolkovsky)
- Bridge, 0g (spine). The burn itself produces thrust along the spine axis. During the burn, the ship experiences acceleration — suddenly there IS gravity on Deck D, pushing toward aft. Objects in the cryo bay that were floating will crash. The player needs to secure things before the burn.
- Fuel calculation: mass ratio matters. The ship gets lighter as fuel burns, so later fuel is more efficient. Tsiolkovsky captures this.

### Puzzle 7: Comms Restoration
- Hull exterior EVA again. The antenna Chen built is aimed at specific coordinates. Realigning it or adding the missing component requires understanding why Chen aimed it where she did.
- Signal roundtrip: whatever Chen contacted is 0.3 light-years away. The response arrived in months, not years. This means the object is MOVING TOWARD the ship. This is the Act 5 revelation.

## New puzzle opportunities from physics engine

### Inertia puzzles (Deck D, zero-g)
- Push a heavy cargo container to block a breach temporarily
- Use momentum transfer: throw a tool to propel yourself
- Redirect a drifting object before it damages something
- The deceleration burn creates temporary gravity — use it to move things that were impossible to position in zero-g

### Temperature puzzles
- Something needs to be warm to work (electronics, adhesives) but the room is freezing — find a heat source or carry it from a warm deck
- Cryoprotectant gel as a thermal interface — it's viscous and cold but conductive
- The warm spot anomaly in corridor_d — what's behind that panel? Something generating heat that shouldn't be there

### Gravity transition puzzles
- Carry something heavy from Deck D (weightless, easy) up the spoke to Deck B (0.7g, too heavy) — need to find a way to get it there (winch? counterweight? ask the player to think about it)
- Coriolis effect in the spoke — throw something straight and it curves. Use this to reach something around a corner

### Atmospheric puzzles
- In zero-g, CO2 pools around your face — ventilation failure in Deck D means suffocation risk. Fan something to create airflow.
- Fire behaves as a sphere in zero-g — can't be smothered conventionally. Cut off oxygen supply instead.

## Chen's story — the hidden narrative

Chen Wei-Lin woke at Year 17.4. She discovered the gravitational anomaly at 82 Eridani and realized it was artificial. She spent 17 months alone on the ship:

1. First weeks: confusion, fear, cryo sickness recovery
2. Months 1-3: explored the ship, found the anomaly data, began analysis
3. Months 4-8: built the hull antenna to get better data, modified reactor for more power
4. Months 9-12: sent encrypted transmissions to the anomaly coordinates
5. Months 13-17: received responses, grew increasingly certain it was artificial
6. Month 17: something changed. She placed items in the player's pod, sealed her logs, returned to cryo in Pod B-221 (not her own pod). Why?

The key mystery: why did she wake the PLAYER specifically? The emergency revival of Unit 37 was triggered by something — was it Chen's doing before she went back to sleep? Or was it the ship responding to the JANUS signal?

The warm spot in corridor_d is the first physical clue that Chen's antenna has a power feed running through the hull — heat from the cabling.

## Act structure notes

- Act 1 should feel claustrophobic — the pod, the cold, the confusion
- Act 2 should feel like exploration and wonder — the ship is beautiful and broken
- Act 3 should feel like crisis — cascading failures, time pressure
- Act 4 should feel like mastery — the player knows the ship, solves hard problems
- Act 5 should feel like revelation and choice — the truth changes everything

## Part 2 setup

Part 1 ends with the revelation of the L2 structure. Part 2 would cover:
- The approach to 82 Eridani
- Waking other crew/colonists
- The brown dwarf and its impossible companion
- First contact with whatever built JANUS station
- Chen's full story and the player's identity revealed

## Consistency rules for story implementation

1. Never give the player information they haven't earned through gameplay
2. Chen's clues should be discoverable in any order — no forced sequence
3. Every puzzle solution should be derivable from real physics
4. The cold/hunger/thirst systems should create urgency without punishment
5. The player's identity is revealed through Chen's logs, not exposition
6. The brown dwarf mystery should deepen with each clue, never simplify

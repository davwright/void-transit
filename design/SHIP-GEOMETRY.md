# ISV Kepler's Promise — Ship Geometry & Physics Reference

## 1. Overall Configuration

The Kepler's Promise is a **rotating-section interstellar colony vessel**. It has two primary structural elements:

1. **The Spine** — a long, narrow pressurised cylinder running the full length of the ship along the rotation/thrust axis. ~400m long, ~8m diameter. The hull IS the spine wall — Deck D is right against the outer hull, with only insulation between the corridor and interstellar vacuum. Contains the fusion drive (aft), fuel tanks (external pods), cryo bay (largest section, banks of pods along the length), airlock, and the structural keel. Near-zero gravity on the axis — centripetal acceleration is negligible at <4m from the axis.

2. **The Ring** — a toroidal habitat section mounted at roughly the 60% mark (fore-of-center) of the spine, connected by a single rigid spoke shaft. Outer radius ~120m, ~15m torus cross-section. Contains all habitable spaces arranged around the torus. Each deck (A, B, C) is a level within the torus cross-section.

### Rotation: the whole ship spins

The **entire ship** rotates as a rigid body at ~2.3 rpm. There is no bearing between the ring and spine — they are structurally one piece. This eliminates:
- Bearing wear over 42 years (catastrophic failure mode avoided)
- Pressure seals at rotation joints
- The need to "quickly enter" a spinning spoke

**Centripetal acceleration at the ring rim (derivation):**
```
a = ω²r
ω = 2.3 rpm × 2π/60 = 0.2409 rad/s
r = 120 m (outer ring radius)

a = (0.2409)² × 120
a = 0.05803 × 120
a = 6.96 m/s²
a = 0.71g ✓
```

**On the spine (r ≈ 4m from axis):**
```
a = (0.2409)² × 4 = 0.232 m/s² = 0.024g
```
Effectively weightless — a dropped object drifts very slowly toward the "wall" over several seconds. Not true zero-g, but close enough that you move by pushing off surfaces and drifting.

**Sensors/antenna**: mounted on a small counter-rotating platform at the fore tip of the spine. Only this platform needs a bearing — much smaller, simpler, and replaceable than spinning an entire habitat ring.

**Directions on the rotating ship:**
- "Up" = toward the ring (away from the spin axis, toward more gravity)
- "Down" = toward the spine (toward the axis, toward less gravity)
- "Fore" = toward the bow, antenna, bridge
- "Aft" = toward the engine
- Port/Starboard = left/right facing fore (these rotate with the ship)

```
                    FORE (toward 82 Eridani)
                         │
                    ┌────┤ Antenna/Sensors/Bridge
                    │    │
                    │  ══╪══ SPINE (8m diameter cylinder, 0g) ══
                    │    │   Hull is RIGHT HERE — centimetres away
                    │    │
                    │    ├── Spoke Shaft (single, with rotation bearing)
                    │    │         │
               ┌────────────────┐ │
               │   THE RING     │ │  ← Rotating habitat torus
               │  Decks A-C     │ │     ~0.7g at rim
               │  (rooms around │ │     Each deck is a level in
               │   the torus)   │ │     the torus cross-section
               └────────────────┘ │
                    │    ├─────────┘
                    │    │
                    │  Cryo Bay (largest spine section)
                    │    │   Pods in banks along the cylinder
                    │    │
                    │  Corridor D (spine passage)
                    │    │
                    │  ──┼── Fuel (external pods)
                    │    │
                    │  Airlock
                    │    │
                    │  Engine Room
                    │  Fusion Drive Nozzle
                    │    │
                    └────┘
                         │
                    AFT (away from 82 Eridani)
```

### Why this shape?

- **Cryo in the spine**: Zero-g eliminates pressure sores on bodies immobile for 42 years. No circulatory pooling. Cryoprotectant distributes evenly around the body instead of settling by gravity. The cooling system works more efficiently without convective currents — heat transfer is purely conductive/radiative, which is more predictable over decades.

- **Ring for habitation**: Humans need gravity for bone density, cardiovascular health, spatial orientation, and sanity. The ring provides this for the small crew doing maintenance rotations (pre-cryo) and for the post-arrival colony phase.

- **Engine aft on spine**: Thrust must be along the spin axis or the ship would tumble. The massive drive assembly also acts as a radiation shadow shield — the bulk of the reactor and drive shielding protects the cryo bay and ring from the engine's radiation during burns.

- **Single spoke**: One rigid pressurised shaft connects the ring to the spine. No bearing — the whole ship rotates together. This is a structural chokepoint: if the spoke is blocked, the ring is cut off from the spine. Gameplay opportunity. As you climb the spoke from the ring toward the spine, gravity fades continuously (you're moving toward the axis). The Coriolis effect increases as you approach the axis — objects thrown "straight" curve more noticeably.

- **Bridge fore on spine**: Needs unobstructed forward view. Sensor arrays and the deep-space antenna are mounted on the fore hull. The bridge is in the non-rotating spine but accessed via the spoke from Deck A of the ring.

## 2. Gravity Profile

Gravity varies continuously across the ship:

| Location | Effective gravity | Why |
|----------|------------------|-----|
| Ring rim (Deck B) | 0.70g | r=120m, full centripetal acceleration |
| Deck A (upper ring) | 0.65g | r≈112m, slightly closer to axis |
| Deck C (lower ring) | 0.55g | r≈95m, approaching spoke |
| Spoke shaft | 0.55g → ~0g | Gravity fades continuously as r decreases |
| Spine (Deck D) | ~0.02g | r≈4m from axis — effectively weightless |
| Bridge (fore spine) | ~0.02g | On the axis, same as Deck D |

### Implications for gameplay

- **Deck D**: Everything floats. Dropped items don't fall — they drift. Fluids form spheres. You move by pushing off surfaces. Tools must be tethered. The cryo fluid that coats you after waking doesn't drip — it clings and slowly drifts off in droplets.

- **Spoke transition (Deck C → D)**: Gravity fades as you descend. The ladder becomes unnecessary — at some point you're just pulling yourself along handholds. The Coriolis effect is noticeable: objects thrown "straight" curve. This is disorienting for someone just waking from cryo.

- **The Ring**: "Down" is always away from the spin axis (outward). "Up" is toward the axis. North/South/East/West have no meaning — the ship's convention is fore/aft/port/starboard relative to the ship's thrust axis, not relative to the ring's rotation.

## 3. Temperature Profile

The ship is cold. Temperature control is degraded (60% heating capacity due to Bus B power failure).

| Location | Temperature | Notes |
|----------|-------------|-------|
| Cryo bay | -8°C to +2°C | Deliberately cold. Cryo systems keep it near freezing. |
| Cryo pod interior | -2°C (thawing) | Was -196°C during suspension. Warming slowly. |
| Spine corridor (D) | 4°C | Minimal insulation from void. Hull at -270°C outside. |
| Engine room | 12°C | Waste heat from standby reactor warms it slightly. |
| Fuel storage | -15°C | Fuel tanks are external; this room is barely pressurized. |
| Airlock inner | 2°C | Next to hull. Thermal bridge to void. |
| Deck C (engineering) | 10-14°C | Reduced heating due to Bus B failure. |
| Deck B (habitation) | 14-16°C | Best the heating system can manage at 60%. |
| Deck A (bridge) | 12°C | Heated, but the bridge forward viewport is a massive thermal sink. |

### Implications

- The player wakes naked and wet at -2°C in zero-g. This is immediately dangerous.
- Cryoprotectant doesn't drip off in zero-g — it clings and evaporates slowly, stealing body heat through evaporative cooling. It's worse than being dry-naked.
- Drying off (towel) helps. Putting on the jumpsuit helps more. Neither makes you warm — they reduce heat loss.
- The cold is a constant pressure that drives the player to solve problems: get dressed, get to warmer areas, eventually fix the heating system.

## 4. Atmosphere

Single shared atmosphere throughout the pressurized hull. Standard nitrogen-oxygen mix at sea-level pressure.

- CO2 scrubbers failing → CO2 rising globally (21,000 ppm and climbing, vs 400 ppm Earth normal)
- O2 generation working but strained
- The chemical tang mentioned in many room descriptions is likely outgassing from overheated electronics (Bus B failure causing power irregularities) plus trace cryoprotectant fumes

Air moves by convection in the ring (warm air rises toward axis, cold air sinks toward rim) but NOT in the spine — in zero-g, there's no convection. Air in the spine is moved purely by the ventilation system. If the ventilation fails in the spine, CO2 pools around your face as you exhale and you suffocate in a bubble of your own breath.

## 5. Light

| Location | Lighting | Notes |
|----------|----------|-------|
| Cryo bay/pod | Amber emergency | Pulsing. Designed for post-revival eye adaptation. |
| Spine (D) | Harsh fluorescent | Industrial. No attempt at comfort. |
| Deck C | Industrial white | Engineering spaces. |
| Deck B | Solar-spectrum warm | Habitation. Circadian-aware. Currently degraded. |
| Deck A | Blue-shift nightwatch | Someone changed the setting. Eerie. |
| Bridge | Blue nightwatch + screen glow | Screens are the primary light source. |

In zero-g, light behaves the same but dust and particles float in the beams instead of settling, creating visible light shafts. Useful visual cue for the player that they're in zero-g.

## 6. Movement & Navigation Conventions

### Directional system

The ship uses **nautical orientation** aligned with the thrust axis:
- **Fore/Forward**: Toward 82 Eridani (direction of travel)
- **Aft**: Away from 82 Eridani (toward drive)
- **Port**: Left when facing fore
- **Starboard**: Right when facing fore
- **Up/Down**: Toward/away from spin axis in the ring; toward fore/aft has no vertical meaning in the spine

Cardinal directions (north/south/east/west) are meaningless. The ship is 9.6 light-years from any magnetic field. The ring rotates, so compass directions would spin. The convention is nautical because ships have always used it.

### In the ring (Decks A-C)

Normal walking. Gravity is sufficient for standard locomotion. Corridors are horizontal. Ladders connect decks vertically (toward/away from spin axis). You might notice the Coriolis effect if you drop something — it doesn't fall straight down, it curves slightly in the direction of rotation. This is subtle at 0.7g but perceptible.

### In the spine (Deck D)

Zero-g movement. No walking — you pull yourself along handrails. Push off walls. Catch yourself on grab bars. Every movement follows Newton's third law literally. If you push off a wall, you drift until you hit something else. If you throw something, you move backward.

Free-floating items are a hazard. A dropped tool doesn't fall to the floor — it drifts, potentially into equipment or your face. Fluids form spheres. Your own sweat doesn't drip — it accumulates and eventually launches off in globules.

### The spoke transition

Descending from Deck C to Deck D, you pass through the spoke shafts. Gravity fades progressively. At some point the ladder rungs become handholds. The Coriolis effect intensifies as you approach the axis — objects curve more dramatically. For someone just out of cryo, this is profoundly disorienting.

## 7. Room Map & Exit Consistency

### Internal direction mapping

The game uses `n/s/e/w` as abstract exit keys in the data, mapped to nautical display names:

| Key | Display | Physical meaning in ring | Physical meaning in spine |
|-----|---------|------------------------|--------------------------|
| n | Fore | Toward bow of ship | Toward bow of ship |
| s | Aft | Toward stern of ship | Toward stern of ship |
| e | Starboard | Right facing fore | Right facing fore |
| w | Port | Left facing fore | Left facing fore |
| up | Up | Toward spin axis | Toward ring (via spoke) |
| down | Down | Away from spin axis | N/A (already on axis) |
| in/out | In/Out | Enter/exit enclosed space | Enter/exit enclosed space |

### Topology validation

```
DECK A (Ring, upper level, ~0.65g):
  bridge ←[aft]→ corridor_a ←[starboard]→ captains_quarters
                             ←[port]→ comms_room
                             ←[down]→ corridor_b

DECK B (Ring, main level, ~0.70g):
  med_bay ←[aft]→ corridor_b ←[starboard]→ lab
  mess_hall ←[fore]→         ←[port]→ crew_quarters
  hydroponics ←[fore]→ mess_hall
  rec_room ←[fore]→ crew_quarters
                     corridor_b ←[down]→ corridor_c

DECK C (Ring, lower level, ~0.55g):
  reactor_room ←[aft]→ corridor_c ←[starboard]→ life_support
  machine_shop ←[fore]→           ←[port]→ electrical
  cargo_bay ←[fore]→ machine_shop
                       corridor_c ←[down]→ corridor_d

DECK D (Spine, 0.0g):
  cryo_bay ←[aft]→ corridor_d ←[starboard]→ fuel_storage
  engine_room ←[fore]→        ←[port]→ airlock_inner
                               corridor_d ←[up]→ corridor_c
  airlock_inner ←[out]→ airlock_outer ←[out]→ hull_exterior
  cryo_pod ←[out]→ cryo_bay
```

### Known issue: Deck orientation inversion

In the ring, "down" means away from the spin axis (toward higher radius = more gravity). But "down" from corridor_c goes to corridor_d, which is toward the spin axis (less gravity). This is physically correct — you're descending from the ring into the spoke, moving toward the axis. But it means "down" in the ring means "outward" while "down" through the spoke means "inward." This matches real rotating-habitat physics but could confuse players. The transitional description in corridor_c should make this clear.

## 8. Mass, Weight, and Inertia

**Weight depends on gravity. Mass does not. Inertia does not.**

An object that weighs 10kg on Deck B (0.7g) weighs 0kg on Deck D (0g). But its mass is always 10kg, and its inertia is always 10kg. You can push a 200kg cargo container in zero-g with one hand — but once it's moving, it takes 200kg of force to stop it. This is both useful and dangerous.

### Carry weight by deck

| Deck | Gravity | Effective carry limit | Notes |
|------|---------|----------------------|-------|
| A | 0.65g | ~28kg (things feel lighter) | Slightly easier than Deck B |
| B | 0.70g | 25kg (baseline) | Standard human carry capacity at 0.7g |
| C | 0.55g | ~32kg (things feel lighter) | Engineering tools easier to carry |
| D | 0.00g | No weight limit — but inertia! | Can push anything, can't stop it easily |

### Zero-g inertia as gameplay

In zero-g (Deck D), weight limits don't apply — you can carry or push anything. But:
- **Starting** a heavy object moving takes effort proportional to its mass
- **Stopping** a heavy object takes equal effort — Newton's third law
- **Turning** with heavy cargo is difficult — angular momentum
- **Collisions** hurt proportional to momentum (mass × velocity)

This creates puzzle opportunities:
- Move a heavy object from Deck D (where you can push it) up the spoke to Deck C (where it suddenly has weight and you can't carry it) — you need a different solution
- Use a heavy object's momentum to break through something
- Stack cargo against a hull breach to seal it
- The player themselves becomes a projectile if they push off a wall too hard

### Coriolis in the spoke transition

Moving between the ring (rotating) and spine (non-rotating) involves passing through a bearing/airlock where relative rotation is handled by the ship's architecture. But within the ring, the Coriolis effect is real:
- Objects thrown "straight" across a room curve ~2-3cm per meter at 0.7g/2.3rpm
- Dropped objects land slightly to one side of where you'd expect
- This is subtle enough to be disorienting but not enough to prevent normal movement
- Poured liquids spiral slightly

## 9. Consistency Rules

These rules should be checked whenever adding rooms, descriptions, or behaviors:

1. **No gravity references in Deck D** — nothing falls, drips, pools on the floor, or settles. Use: drifts, clings, floats, adheres, disperses.
2. **No cardinal directions anywhere** — always fore/aft/port/starboard.
3. **Temperature decreases toward hull** — Deck D is colder than Deck C, which is colder than Deck B.
4. **Light quality changes with deck** — warm spectrum in habitation, cold industrial in engineering/spine.
5. **Sounds change with medium** — In low-g areas, airborne sounds are fainter because convection doesn't carry them as well. Structure-borne sounds (vibrations through walls/floors) carry everywhere.
6. **Coriolis effect in ring** — Subtle but present. Things don't fall quite straight. Thrown objects curve.
7. **Air doesn't convect in zero-g** — Smoke, steam, gas all form expanding spheres. CO2 pools around your face unless ventilation moves it.
8. **Fluids form spheres in zero-g** — Water, cryoprotectant, blood. They cling to surfaces by adhesion and wobble when disturbed.
9. **Movement in zero-g is deliberate** — No casual walking. Always specify HOW the player moves: pushes off, pulls along, catches, redirects.

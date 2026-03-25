# ISV Kepler's Promise — Ship Geometry & Physics Reference

## 1. Overall Configuration

The Kepler's Promise is a **rotating-section interstellar colony vessel**. It has two primary structural elements:

1. **The Spine** — a non-rotating cylindrical hull running the full length of the ship along the thrust axis. ~400m long, ~12m diameter. Contains the fusion drive (aft), fuel tanks, cryo bay, airlock, and the central structural keel. Zero gravity throughout.

2. **The Ring** — a toroidal habitat section mounted at roughly the 60% mark (fore-of-center) of the spine, connected by four spoke shafts. Rotates at ~2.3 rpm to produce 0.7g at the rim. ~80m outer radius, ~15m torus cross-section. Contains all habitable spaces: bridge, quarters, labs, mess, medical, engineering.

```
                    FORE (toward 82 Eridani)
                         │
                    ┌────┤ Antenna/Sensors
                    │    │
                    │  Bridge (A)
                    │  Corridor A
                    │    │
                    ├────┤ ← Spoke Shaft (×4)
               ┌────────────────┐
               │   THE RING     │  ← Rotating habitat torus
               │  Decks A-C     │     ~0.7g at rim
               │  (cross-section│     Gravity ⊥ to spin axis
               │   is circular) │
               └────────────────┘
                    ├────┤ ← Spoke Shaft (×4)
                    │    │
                    │  Corridor D (Spine)  ← 0g
                    │  Cryo Bay
                    │  Airlock
                    │  Fuel Storage
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

- **Bridge fore on spine**: Needs unobstructed forward view. Sensor arrays and the deep-space antenna are mounted on the fore hull. The bridge is technically in the spine (non-rotating) but is connected to the ring via the upper spoke shafts, so crew can reach it from Deck A.

## 2. Gravity Profile

Gravity varies continuously across the ship:

| Location | Effective gravity | Why |
|----------|------------------|-----|
| Ring rim (Deck B outer) | 0.70g | Centrifugal force at max radius |
| Ring inner (Deck B hub) | 0.70g | Hub is at rim level in this design — the "decks" are floors within the torus cross-section, not radial layers |
| Deck A (upper ring) | 0.65g | Slightly closer to spin axis |
| Deck C (lower ring) | 0.55g | Approaching the spoke transition |
| Spoke shafts | 0.55g → 0.0g | Gravity fades as you climb toward the axis |
| Spine (Deck D) | 0.0g | On the spin axis, no centrifugal force |
| Bridge | 0.0g | Fore spine, non-rotating |

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

## 8. Consistency Rules

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

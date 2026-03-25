# ISV Kepler's Promise — Ship Geometry & Physics Reference

## 1. Overall Configuration

The Kepler's Promise is a **rotating-section interstellar colony vessel**. It has two primary structural elements:

1. **The Spine** — a long, narrow pressurised cylinder running the full length of the ship along the rotation/thrust axis. ~400m long, ~8m diameter. The hull IS the spine wall — Deck D is right against the outer hull, with only insulation between the corridor and interstellar vacuum. Contains the fusion drive (aft), fuel tanks (external pods), cryo bay (largest section, banks of pods along the length), airlock, and the structural keel. Near-zero gravity on the axis — centripetal acceleration is negligible at <4m from the axis.

2. **The Ring** — a toroidal habitat section mounted at roughly the 60% mark (fore-of-center) of the spine, connected by a single rigid spoke shaft. Outer radius ~120m, ~15m torus cross-section. Contains all habitable spaces arranged around the torus. Each deck (A, B, C) is a level within the torus cross-section.

### Rotation: the whole ship spins

The **entire ship** rotates as a rigid body at **2 rpm**. There is no bearing between the ring and spine — they are structurally one piece. This eliminates:
- Bearing wear over 42 years (catastrophic failure mode avoided)
- Pressure seals at rotation joints
- The need to "quickly enter" a spinning spoke

2 rpm is below the Coriolis comfort threshold (research: ≤2 rpm eliminates motion sickness from head movements; up to 6 rpm tolerable with adaptation). The stars wheel past the bridge viewport once every 30 seconds — noticeable, beautiful, not disorienting. Navigation displays compensate.

**Centripetal acceleration at the ring rim (derivation):**
```
a = ω²r

ω = 2.0 rpm × 2π/60 = 0.2094 rad/s
Target: a = 0.7g = 6.867 m/s²

Solving for r:
r = a / ω²
r = 6.867 / (0.2094)²
r = 6.867 / 0.04385
r = 156.6 m

Ring outer radius ≈ 157m
Ring diameter ≈ 314m
```

**On the spine (r ≈ 4m from axis):**
```
a = (0.2094)² × 4 = 0.175 m/s² = 0.018g
```
Effectively weightless — a dropped object drifts very slowly toward the "wall" over many seconds. Not true zero-g, but close enough that you move by pushing off surfaces and drifting. This micro-gravity is actually beneficial: cryo patients don't float completely free, they settle very gently against the pod wall, reducing the need for restraints.

**Sensors/antenna**: mounted on a small counter-rotating platform at the fore tip of the spine. Only this platform needs a bearing — much smaller, simpler, and replaceable than spinning an entire habitat.

**Directions on the rotating ship:**
- "Up" = toward the ring (away from the spin axis, toward more gravity)
- "Down" = toward the spine (toward the axis, toward less gravity)
- "Fore" = toward the bow, antenna, bridge
- "Aft" = toward the engine
- Port/Starboard = left/right facing fore (these rotate with the ship)

### Spoke structure

Multiple spokes (4) connect the ring to the spine for structural rigidity. The ship is a rigid rotating body — any asymmetry or flex would create vibrations that compound over 42 years. Four spokes, evenly spaced at 90° around the spine, provide redundancy and distribute loads. Only one spoke is pressurised (the crew access shaft). The other three are structural members carrying power, data, and coolant lines.

### Mass balance and fuel geometry

The ship must be balanced around its spin axis. Asymmetric mass = wobble = structural fatigue over decades.

**Fuel**: stored in tanks arranged **symmetrically around the engine** at the aft end of the spine. Not to one side — that would unbalance the ship. The fuel storage room accessible to the player is the **fuel monitoring and control station**, located to starboard of corridor_d. The actual fuel tanks are external, wrapped around the aft spine section.

**Mass balance pairs** (items on opposite sides of the spine):
- Port: Airlock / Starboard: Fuel control station (similar mass)
- The cryo bay runs along the spine axis — inherently balanced
- The ring is symmetric by construction (torus)

### Radiation shielding: water jacket around cryo bay

The cryo bay is the most radiation-sensitive section — 2,847 sleeping humans for 42 years in interstellar space with no planetary magnetic field for protection.

**The threat: Galactic Cosmic Rays (GCR)**
```
Unshielded GCR dose in deep space: ~500 mSv/year
Over 42 years: 21,000 mSv (21 Sv) — lethal many times over
Target: ≤50 mSv/year (radiation worker annual limit)
Needed reduction: 90% of incident dose
```

**The solution: water jacket**

A 1.5m-thick layer of water surrounds the cryo bay section of the spine. Water is an excellent radiation shield — hydrogen-rich, effective at moderating neutrons, and it's cargo the colony needs anyway.

```
Shielding effectiveness:
  Water density: 1 g/cm³
  150 cm of water = 150 g/cm²
  At 150 g/cm², GCR dose reduction: ~85-90%
  (diminishing returns above 200 g/cm² due to secondary neutrons)

  Residual dose: 500 × 0.12 ≈ 60 mSv/year
  Over 42 years: ~2,500 mSv — high but survivable for
  cryo patients with suppressed cellular metabolism
```

```
Water jacket volume:
  Spine inner radius: 4m
  Water jacket outer radius: 4 + 1.5 = 5.5m
  Cryo bay length: ~100m

  V = π(R² - r²) × L
  V = π(5.5² - 4²) × 100
  V = π(30.25 - 16) × 100
  V = π × 14.25 × 100
  V ≈ 4,477 m³ = 4,477 tonnes of water
```

**Dual purpose**: This water is the colony's fresh water reserve for establishing the settlement at 82 Eridani. ~2,847 m³ at 1,000 litres per colonist, plus margin. During transit, it shields them. On arrival, it sustains them. The ship consumes its own shielding as it decelerates and the colonists wake.

The water jacket also provides:
- **Thermal mass**: temperature stability for the cryo system
- **Neutron moderation**: hydrogen atoms slow secondary neutrons
- **Structural dampening**: water mass reduces vibration from the engine

The fuel tanks at the aft end provide additional shielding from the engine direction.

**Cryoprotectant as secondary shielding**

The glycerol-based cryoprotectant circulated through the pod system contains a suspension of gadolinium nanoparticles — a neutron capture agent. Gadolinium has the highest thermal neutron capture cross-section of any stable element (49,000 barns for Gd-157). The cryoprotectant serves triple duty:

1. **Thermal interface**: conducts heat away from the body during freezing
2. **Physical immobiliser**: viscous gel prevents drift in micro-gravity
3. **Neutron capture medium**: Gd nanoparticles absorb secondary neutrons that penetrate the water jacket, converting them to low-energy gamma rays absorbed by the surrounding water

The cryoprotectant is continuously circulated through the pod array, filtered, and re-chilled. This circulation means the Gd particles are evenly distributed and any activated isotopes are swept to the filtration system rather than accumulating near sleeping colonists.

**Future story potential** (do not implement in Part 1):
- The water jacket is stored as ice during transit (cryo temperatures). Cutting ice from the jacket for emergency use (drinking water, coolant, radiation emergency patching).
- A catastrophic event melts the jacket — zero-g swimming through the spine in 4,477 tonnes of water.
- Cryoprotectant circulation failure exposes colonists to secondary neutron flux — the Gd particles settle out and stop capturing.
- The player could repurpose cryoprotectant as emergency radiation shielding during a reactor puzzle (Gd absorbs neutrons from the leaking reactor).

Sources:
- [NASA TM-4167: Estimates of GCR Shielding](https://ntrs.nasa.gov/api/citations/19900008219/downloads/19900008219.pdf)
- [NASA TP-3682: GCR Shielding in Deep Space](https://ntrs.nasa.gov/api/citations/19980006777/downloads/19980006777.pdf)
- [Health threat from cosmic rays - Wikipedia](https://en.wikipedia.org/wiki/Health_threat_from_cosmic_rays)

## Propulsion: D-³He fusion drive

### Propulsion: hybrid laser-sail + fusion deceleration

The Kepler's Promise uses a two-stage propulsion architecture:

**Stage 1 — Laser sail acceleration (Sol-based)**

A ground/orbital laser array at Sol pushes the ship to 0.12c. The ship carries a deployable reflective sail (retracted after acceleration phase). The laser array is a shared infrastructure investment — it launches multiple colony ships over decades, amortising the enormous cost.

This eliminates the need to carry acceleration fuel, which is the single biggest mass saving possible in interstellar flight.

**Stage 2 — D-³He fusion drive for deceleration**

Deuterium-helium-3 fusion with magnetic nozzle, using a **Field-Reversed Configuration (FRC)** reactor. Not a tokamak — the FRC is a linear solenoid geometry: a cigar-shaped plasma confined by external coils, with one sealed mirror end and one open end feeding the magnetic nozzle. The FRC has the highest plasma pressure (β) for a given magnet mass of any confinement scheme, making it the lightest fusion reactor design for spacecraft.

D + ³He → ⁴He + p produces only charged particles — no neutron radiation from the primary reaction. The fusion products ARE the exhaust: protons and alpha particles at ~4% c, directed by the magnetic nozzle. Not an ion drive — no separate propellant, no ionisation grid, no neutralisation of propellant.

```
Drive specs:
  Exhaust velocity (v_e):  12,000 km/s (4% of c)
  Specific impulse (Isp):  ~1,200,000 seconds
  Drive type:              Direct fusion, magnetic nozzle
  Fuel:                    Deuterium + Helium-3 (cryogenic)
  Purpose:                 DECELERATION ONLY
```

**Charge neutralisation: the Langmuir Compensators**

The D + ³He reaction ejects charged particles: protons (+1e) and alpha particles (+2e). Each reaction sends +3e out the nozzle. Without compensation, the ship accumulates negative charge.

```
Charge flux calculation:
  Reactor output: 4.2 GW
  Energy per reaction: 18.3 MeV = 2.93 × 10⁻¹² J
  Reactions/sec: 4.2 × 10⁹ / 2.93 × 10⁻¹² = 1.43 × 10²¹ /s
  Charge ejected: 1.43 × 10²¹ × 3e = 4.3 × 10²¹ e/s
  Current: 4.3 × 10²¹ × 1.6 × 10⁻¹⁹ = 687 amperes
```

Two **Langmuir Compensators** mounted symmetrically on opposite sides of the magnetic nozzle housing emit a matched electron flux into the exhaust stream. Each carries ~344A. They must be precisely co-aligned with the ion beam axis — misalignment creates electromagnetic torque on the ship.

```
Torque from 1° misalignment at 687A in a 0.1T field:
  F = BIL sin(θ) — significant enough to spin the ship
  The compensators are calibrated to ±0.01° by the flight computer
  Compensator health is a critical system status item
```

If a Langmuir Compensator fails or drifts out of alignment, the ship charges up and the exhaust beam curves. This is a potential puzzle/crisis: one compensator drifting, causing the ship to yaw during deceleration burn.

### Laser sail

A deployable reflective sail, stowed in the fore spine section during coast. Deployed during the acceleration phase (first ~15 years at Sol).

```
Ship mass at departure (with fuel): 116,633 tonnes
Acceleration: 0.003g (very gentle, over ~13 years to reach 0.12c)

  0.003g × 13 years:
  a = 0.0294 m/s²
  t = 13 × 3.15 × 10⁷ = 4.1 × 10⁸ s
  v = at = 0.0294 × 4.1 × 10⁸ = 12,054 km/s ≈ not enough

  Need 35,975 km/s. At 0.003g:
  t = 35,975,000 / 0.0294 = 1.22 × 10⁹ s = 38.8 years — too long

  At 0.01g (more aggressive):
  t = 35,975,000 / 0.098 = 3.67 × 10⁸ s = 11.6 years ✓
```

At 0.01g for 11.6 years:
```
Force: F = ma = 1.17 × 10⁸ × 0.098 = 1.15 × 10⁷ N
Laser power: P = Fc/2 = 1.72 × 10¹⁵ W = 1,720 TW

Beam distance (acceleration range):
  d = ½at² = 0.5 × 0.098 × (3.67 × 10⁸)² = 6.6 × 10¹⁵ m = 0.7 ly

Sail diameter for beam capture at 0.7 ly (with 10km array, λ=1μm):
  θ = 2.44λ/D = 2.44 × 10⁻⁶/10⁴ = 2.44 × 10⁻¹⁰ rad
  Beam width at 0.7 ly: 2.44 × 10⁻¹⁰ × 6.6 × 10¹⁵ = 1.6 × 10⁶ m = 1,600 km

  Sail must be ~1,600 km diameter to capture beam at max range.
  That's impractical.
```

**Resolution**: the laser array tracks the ship and adjusts focus. The sail doesn't need to capture the entire beam — it intercepts a fraction, with the laser compensating by increasing power as range grows. The practical sail is much smaller:

```
Sail diameter: ~50 km (reasonable for 22nd-century materials)
Sail area: π × 25² = 1,963 km² = 1.96 × 10⁹ m²
Sail mass at 1 g/m² (aluminised carbon nanotube film): 1,963 tonnes
(included in dry mass budget)

The laser array compensates for beam spread by increasing power
as the ship recedes. Peak power at max range: ~10,000 TW
(a civilisation-scale energy project — this is why it's shared
infrastructure that launches multiple colony ships).

The sail is jettisoned after acceleration phase or folded and
stowed for potential use as a solar collector at 82 Eridani.
```

### Mission parameters

```
Distance to 82 Eridani:    19.7 light-years
Coast velocity:             0.12c = 35,975 km/s
Acceleration:               Laser sail (Sol-based array)
Deceleration:               Onboard D-³He fusion drive
Transit time:               ~42 years
```

### Mass budget

```
Dry mass (structure, ring, spine, sail):    2,500 tonnes
Water jacket (0.5m, neutron moderation):    1,335 tonnes
Cryo pods + colonists (2,847 × ~100kg):      285 tonnes
Cargo (colony supplies, equipment):         1,500 tonnes
Crew systems, consumables:                    200 tonnes
                                           ─────────────
Payload mass (m_f):                         5,820 tonnes
```

### Tsiolkovsky: deceleration only

```
Δv = v_e × ln(m_0 / m_f)

Δv for deceleration: 35,975 km/s (0.12c → 0)

35,975 / 12,000 = ln(m_0 / m_f)
2.998 = ln(m_0 / m_f)
m_0 / m_f = e^2.998 = 20.04

m_0 = 20.04 × 5,820 = 116,633 tonnes
Fuel = 116,633 - 5,820 = 110,813 tonnes
```

Mass ratio 20:1 instead of 401:1. **Thirty times less fuel** than carrying acceleration fuel. This is the difference between "implausible" and "hard but buildable."

### Comparison: with vs without laser sail

```
Both accel + decel (fusion only):
  Fuel: 3,388,000 tonnes.  Mass ratio: 401:1

Laser accel + fusion decel:
  Fuel: 110,813 tonnes.    Mass ratio: 20:1

Saving: 3,277,000 tonnes of fuel not carried.
```

### Radiation shielding from fuel

The 110,813 tonnes of D-³He fuel stored around the aft spine section provides substantial radiation shielding from the aft direction. Combined with the 0.5m water jacket (1,335 tonnes) for neutron moderation, total shielding mass around the cryo bay is ~112,000 tonnes — far more than adequate for GCR protection.

As fuel is consumed during deceleration, shielding thins — but by then the ship is approaching 82 Eridani, where the star's heliosphere provides increasing magnetic protection.

```
Thin water jacket (neutron moderation):
  0.5m thick, V = π(4.5² - 4²) × 100 = 1,335 m³ = 1,335 tonnes
  50 g/cm² — effective for secondary neutron capture
  Combined with Gd-doped cryoprotectant circulation

Fuel as primary GCR shield:
  110,813 tonnes wrapped around aft spine
  Cryogenic D-³He is hydrogen-rich — excellent radiation absorber
  Consumed during deceleration (last ~5 years of transit)
```

### Fuel storage

```
D-³He cryogenic density: ~160 kg/m³
Volume: 110,813 / 160 ≈ 692,600 m³

Stored symmetrically around aft spine section:
  Tank radius: 15m, spine clearance 5m inner
  Tank cross-section: π(15² - 5²) = π × 200 = 628 m²
  Length needed: 692,600 / 628 = 1,103m

  Or: 6 tanks of radius 10m, length 200m each
  (wrapped around spine, mass-balanced)
```

### In-game fuel status at Year 19.3

The ship is in coast phase — no fuel has been consumed since the laser sail pushed it to 0.12c. All fuel is reserved for deceleration. So why does Tank 6 show a discrepancy?

```
100% fuel = 110,813 tonnes (all for deceleration)
Tank 6 reads 87.3% vs expected 100% (no fuel should be used yet)
Discrepancy: 12.7% of one tank ≈ 2,346 tonnes

Chen used fuel. During coast phase. The reactor was running at
elevated output for months (powering her hull antenna and
unauthorized transmissions). The fuel consumption shows up in
Tank 6 because she manually routed reactor feed from that tank.

Remaining after Chen's use: ~108,467 tonnes
Needed for full deceleration: 110,813 tonnes
SHORTFALL: ~2,346 tonnes

The player must account for this in the navigation puzzle.
The deceleration burn will come up short unless the trajectory
is adjusted to compensate — arrive at a higher velocity and use
82 Eridani's gravity for the final braking, or accept a longer
deceleration with less thrust.
```

This is a critical story moment: Chen's actions have real consequences that the player must solve with physics.

### Reactor operating modes

The FRC reactor has two modes:

**Coast mode (current)**: Low-power electrical generation only. The reactor runs at ~4.2 GW thermal, converted to ~1 GW electrical for ship systems: life support, cryo cooling, heating, navigation, communications, lighting. The magnetic nozzle is sealed — no exhaust, no thrust, no Langmuir Compensator operation. Fuel consumption is minimal (~0.5 tonnes/year for electrical generation alone).

Chen ran the reactor at elevated output (~2 GW electrical) for months to power her hull antenna transmissions. This accounts for the Tank 6 discrepancy — she consumed ~2,346 tonnes over her 17 months awake, roughly 10× the normal coast consumption rate.

**Deceleration mode**: Full power. The nozzle opens, Langmuir Compensators activate, and the drive fires at maximum thrust. Fuel consumption rate: ~5,000 tonnes/year at full thrust. The deceleration burn lasts ~22 years (the ship began decelerating at the midpoint and should arrive at near-zero velocity).

**Aft shielding**: During coast, the nozzle is sealed and the reactor is shielded in all directions by the standard compartment shielding panels. During deceleration burns, the exhaust stream itself is directed aft through the nozzle — the crew areas are all fore of the reactor, shielded by the reactor's own mass and the remaining fuel tanks. No additional aft shield structure is needed because the exhaust is charged particles guided by magnetic fields — they never touch the nozzle housing.

Sources:
- [Tsiolkovsky rocket equation](https://en.wikipedia.org/wiki/Tsiolkovsky_rocket_equation)
- [Fusion rocket](https://en.wikipedia.org/wiki/Fusion_rocket)
- [Atomic Rockets: Engine Theory](https://www.projectrho.com/public_html/rocket/engines.php)
- [Breakthrough Starshot](https://en.wikipedia.org/wiki/Breakthrough_Starshot)
- [Solar One: Crewed Interstellar Spacecraft](https://arxiv.org/pdf/2007.11474)
- [82 G. Eridani](https://en.wikipedia.org/wiki/82_G._Eridani)
- [NASA Artificial Gravity](https://ntrs.nasa.gov/api/citations/20070001008/downloads/20070001008.pdf)
- [Artificial Gravity - Atomic Rockets](https://www.projectrho.com/public_html/rocket/artificialgrav.php)
- [SpinCalc](https://www.artificial-gravity.com/sw/SpinCalc/)
- [PMC: Artificial gravity](https://pmc.ncbi.nlm.nih.gov/articles/PMC4470275/)

### Bridge location

The bridge is on **Deck A** (upper ring level), NOT on the spine. It rotates with the ship at 2 rpm. Through the forward viewport, the stars wheel slowly — one rotation every 30 seconds. This is beautiful and slightly eerie but not disorienting at this rate. The navigation computer compensates for rotation in all displays and sensor readings.

The bridge is at the highest point of the ring (closest to fore), giving it the best structural position for forward sensor feeds routed down the fore spoke.

Sources:
- [NASA Physics of Artificial Gravity](https://ntrs.nasa.gov/api/citations/20070001008/downloads/20070001008.pdf)
- [Artificial Gravity - Atomic Rockets](https://www.projectrho.com/public_html/rocket/artificialgrav.php)
- [SpinCalc - Artificial Gravity Calculator](https://www.artificial-gravity.com/sw/SpinCalc/)
- [PMC: Artificial gravity as countermeasure](https://pmc.ncbi.nlm.nih.gov/articles/PMC4470275/)

```
                    FORE (toward 82 Eridani)
                         │
                    ┌────┤ Counter-rotating sensor platform
                    │    │   (only bearing on the ship)
                    │    │
                    │  ══╪══ SPINE (8m Ø, ~0.02g) ═══════════
                    │    │   Hull is RIGHT HERE
                    │    │
                    │    ├── Spoke ×4 (1 pressurised, 3 structural)
                    │    │         │
               ┌─────────────────────────┐
               │      THE RING           │  ← r=157m, 0.7g at rim
               │   Deck A (bridge, comms)│     2 rpm, whole ship
               │   Deck B (hab, med, lab)│     rotates as rigid body
               │   Deck C (eng, power)   │
               └─────────────────────────┘
                    │    │
                    │    ├── Spoke junction
                    │    │
                    │  Cryo Bay (longest spine section)
                    │    │   Pods in banks along the cylinder
                    │    │
                    │  Corridor D (spine passage)
                    │    │
                    │  ──┼── Port: Airlock
                    │    │   Starboard: Fuel control station
                    │    │   (actual fuel tanks wrap around aft
                    │    │    spine symmetrically)
                    │    │
                    │  ╔═╧═══════════╗
                    │  ║ FUEL TANKS  ║  ← Symmetric around spine
                    │  ║ (external)  ║
                    │  ╚═╤═══════════╝
                    │    │
                    │  Engine Room
                    │  Fusion Drive Nozzle
                    │    │
                    └────┘
                         │
                    AFT (away from 82 Eridani)

    Entire structure rotates at 2 rpm around the spine axis.
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
| Deck A (ground floor, outermost) | 0.70g | r=157m, full centripetal acceleration |
| Deck B (middle floor) | 0.65g | r≈146m, one level inward |
| Deck C (top floor, innermost) | 0.55g | r≈125m, closest to spoke junction |
| Spoke shaft | 0.55g → ~0g | Gravity fades continuously as r decreases |
| Spine (Deck D) | ~0.02g | r≈4m from axis — effectively weightless |
| Bridge (Deck A) | 0.65g | In the ring, rotates with everything |

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

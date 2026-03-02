# Story Craft — Principles for Engaging Sci-Fi Interactive Fiction

## Research-Based Guide for Writing Compelling Text Adventure Narratives

Compiled from analysis of: Asimov, Niven, Clarke, Andy Weir, classic Infocom games, modern IF (Anchorhead, Photopia, Shade), and Pitch Black/Riddick films.

---

## 1. THE PHYSICS-AS-PLOT FORMULA (Niven)

The gold standard: a single real scientific principle IS the plot, not decoration.

**Structure:**
1. **Anomaly** — Something happens that shouldn't be possible under known conditions
2. **Stakes** — Someone must enter the same dangerous conditions
3. **False Explanations** — Characters propose solutions from incomplete understanding
4. **The Physics Insight** — Real explanation from deeper understanding of ONE principle
5. **Application Under Pressure** — Insight must be acted on immediately to survive

**Key rule:** Remove the science and there is no story. The physics is the mystery, the danger, AND the solution.

**Examples of physics-as-mystery:**
- Tidal forces (Niven's "Neutron Star") — gravity passes through everything, no shielding possible
- Orbital mechanics driving cyclical disasters (Asimov's "Nightfall", Pitch Black)
- Atmospheric chemistry in closed systems (The Martian)
- Thermal dynamics in vacuum — ships overheat from waste heat, not freeze

---

## 2. THE PARADIGM SHIFT (Asimov)

Construct situations where characters operate under a complete-seeming understanding, then reveal ONE scientific fact that demolishes their entire framework.

**Formula:**
1. **Establish the "rules"** — make reader feel they understand completely
2. **Present an impossible event** within those rules
3. **Characters investigate** using known rules
4. **Revelation from deeper understanding** — not breaking rules, but finding implications nobody considered
5. **Recontextualization** — reader realizes clues were there all along

**Critical rule:** Never cheat. The solution must be logically derivable from information the reader has. The mystery isn't hidden information — it's hidden *implications* of known information.

**The Single-Revelation Recontextualization:**
- Choose the real scientific fact that will be the revelation
- Construct a "naive model" that characters naturally adopt
- Plant evidence supporting BOTH models
- Create anomalies that almost fit the naive model but not quite
- The revelation moment: one piece of evidence only explainable under the true model
- The cascade: everything recontextualizes in an instant

---

## 3. AWE MIXED WITH DREAD (Clarke)

Tension from systematic exploration of something incomprehensibly vast or alien.

**Techniques:**
- **Scale as horror** — exact measurements reinforce how alien/enormous things are
- **Methodical exploration as narrative engine** — tension from not knowing what anything is for
- **The indifferent alien** — true alien-ness is not hostility but irrelevance. More terrifying than any villain.
- **Answer nothing fully** — the mystery's power is in the question, not the answer

---

## 4. THE CASCADE OF CRISES (Weir)

Each solution creates new constraints generating the next problem.

**Structure per chapter/section:**
1. **Crisis** — specific, concrete, measurable problem
2. **Analysis** — break down into physics/chemistry/engineering components
3. **Solution design** — plan using available resources
4. **Execution** — tension around margins of error
5. **Complication** — solution works but creates/reveals new problem
6. **Repeat** — each cycle raises stakes and reduces resources

**Key insight:** Competence is compelling. Watching smart people solve lethal problems with real science is inherently gripping.

---

## 5. ENVIRONMENTAL STORYTELLING IN IF

### Room Description Hierarchy
```
ROOM DESCRIPTION (atmosphere, obvious features)
  -> EXAMINE [object] (closer look, reveals details)
    -> EXAMINE [sub-detail] (deeper investigation, reveals story)
      -> SEARCH / LOOK UNDER (rewards persistence)
```

### Core Techniques
- **Absence as narrative** — what's missing tells story (empty chair, gap in photos, abandoned meal)
- **Forensic detail** — describe like a detective reads a scene
- **Temporal layers** — fresh flowers on dusty table; new lock on ancient door
- **Sensory specificity** — sound, smell, touch, taste, temperature, not just sight
- **The lived-in world** — books have marginalia, handles are worn, paths are beaten down
- **Cross-referencing** — details in one room illuminated by details in another

### Show Don't Tell in Text
- **BAD:** "You feel terrified entering the dark room"
- **GOOD:** "Your hand finds the wall — cold, slick. Something drips in the far corner at intervals that aren't quite regular."
- Let objects carry emotional weight
- Use physical reactions instead of emotional labels ("your mouth floods with saliva" not "you feel sick")
- Let the player draw conclusions from evidence

---

## 6. BUILDING DREAD

- **Accumulation, not shock** — each detail is a small weight added to a scale
- **The Slow Reveal** — Day 1 quiet exploration, Day 2 escalation, Day 3 crisis
- **Unreliable environment** — things you examined before have changed when you return
- **Asymmetric information** — player knows something terrible is coming but not what
- **Vary prose rhythm** — calm moments use longer sentences; tension uses fragments. Clipped. Sharp.
- **Quiet before escalation** — a beautiful description right before horror hits harder

---

## 7. FORESHADOWING IN IF

### Types
- **Object** — seemingly decorative item whose significance emerges later
- **Environmental** — claw marks, water stains, inexplicable warmth hint at what's coming
- **NPC** — "I hope you'll still visit after everything changes"
- **Structural** — game mechanics teach patterns that carry tension later
- **Textual** — recurring words/images accumulate meaning across the game

### Rules
1. Plant at least three layers deep (atmosphere → hint → confirmation)
2. Foreshadow secondary events too, not just the main twist
3. Use EXAMINE responses for deep foreshadowing (optional = rewarding)
4. Echo early descriptions in late descriptions with new context

---

## 8. CLIFFHANGER ENDINGS

### Types That Work
- **Revelation** — end AT the moment of shattering understanding, not after processing
- **Threshold** — end at the point of no return, don't show other side
- **Recontextualization** — final info forces re-evaluation of entire game
- **Escalation** — you solved the local problem but glimpsed something vastly larger

### Maximum Impact Rules
1. **Earn it** — spend the entire game building investment in characters and mysteries
2. **Answer one question while opening two bigger ones** — satisfaction plus dread
3. **Make the final image specific and visceral** — not "darkness was coming" but a concrete detail
4. **Use the medium** — IF can break the fourth wall, take away player's ability to act, change the narrator's voice
5. **Plant a seed that works even without a sequel** — the question itself is a complete emotional experience

---

## 9. STRONG CHARACTERS (Not Damsels)

Great sci-fi characters — especially women — must have:
- **Agency** — they make decisions that matter, drive plot, aren't rescued
- **Competence** — they're critical to success through skill, intelligence, knowledge
- **Complexity** — they have their own goals, conflicts, and moral dilemmas independent of the protagonist
- **Presence** — they shape the story whether present or absent (through evidence, logs, consequences of their actions)

**The Absent Expert pattern:** A character who acted alone before the player arrived. Their competence is shown through evidence — maintenance logs, clever repairs, calculated risks. The player follows in their footsteps and understands they were brilliant, resourceful, and faced impossible choices. The mystery of WHY they acted as they did drives the narrative.

**Avoid:**
- Women as prizes, rewards, or motivation objects
- Beauty described before competence
- Characters who need rescuing despite established expertise
- Romance that undermines agency

**Aspire to:** Ripley (Alien), Shaw (Prometheus concept), Watney-level competence regardless of gender, characters whose absence creates more mystery than their presence could.

---

## 10. SCIENTIFIC PHENOMENA FOR DEEP-SPACE THRILLER MYSTERIES

### Tier 1: Stellar
- Variable star cycles (periodic lethal radiation)
- Magnetars (magnetic fields disrupting electronics, blood iron)
- Nova precursors (the star is about to explode)

### Tier 2: Relativistic
- Time dilation (station crew's days = outside years)
- Light delay (all information is outdated)
- Relativistic observation (approaching objects nearly invisible until impact)

### Tier 3: Closed Environment
- Atmospheric composition drift (trace VOCs causing cognitive impairment)
- Biofilm evolution (microbes evolving to corrode hull alloys)
- CO2 scrubber depletion (getting stupider as the problem gets more urgent)

### Tier 4: Gravitational
- Tidal forces near compact objects
- Gravitational lensing (navigation becomes unreliable — stars aren't where they appear)
- Orbital instability at Lagrange points

### Tier 5: Thermal
- Vacuum flask problem (ships overheat, not freeze)
- Thermal cycling stress (sun/shadow transitions crack seals)

---

## 11. THE UNIVERSE AS ANTAGONIST

The most powerful element across ALL great hard SF:

> The danger is impersonal. A neutron star doesn't want to kill you. A nova doesn't target you. Physics doesn't negotiate. You can only understand it — or die.

This is more frightening than any villain because there is no reasoning with it, no appealing to it, no defeating it. The universe is indifferent. The only weapon is understanding.

---

## 12. MASTER CHECKLIST FOR EACH SCENE

- [ ] Does this scene have at least one sensory detail beyond sight?
- [ ] Does the room description work on three levels (spatial, atmospheric, narrative)?
- [ ] Is there at least one examinable object with a deeper story?
- [ ] Does this advance or complicate the central mystery?
- [ ] Is there foreshadowing the attentive player will notice?
- [ ] Does the prose rhythm match the tension level?
- [ ] Would a returning player see this differently after later revelations?
- [ ] Is the science accurate and integral (not decorative)?
- [ ] Does the character evidence show competence and agency?
- [ ] Does this scene SHOW rather than TELL?

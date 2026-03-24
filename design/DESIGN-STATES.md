# Entity State System

## Core Concept

Entities (items, room features, player) have **state machines** — named states
with transitions triggered by player actions. States affect descriptions,
available actions, item reveals, and visibility.

## Player States (concurrent dimensions)

posture:   lying → sitting → standing → crouching
awareness: confused → groggy → alert → focused
health:    cryo_sick → recovering → healthy | irradiated | injured
suit:      none → partial → full → damaged

## Room States (environmental)

lighting:  dark → dim → lit → bright (affects what you can examine)
pressure:  vacuum → depressurized → pressurized
temperature: freezing → cold → nominal → hot

## Item States (per-item workflows)

door: locked → unlocked → open → closed
scrubber: nominal → degraded → failed → replaced → calibrated
container: sealed → open → empty
pod: sealed → revival → open

## Opening Sequence

posture=lying: look shows pod ceiling only. "stand"→sitting.
posture=sitting: look shows pod interior. "get out"→standing, REVEALS belongings.
posture=standing: full room. Normal gameplay.

## Lighting affects visibility

dark room: "You can't see anything." Only feel/sound descriptions.
equip lamp → room becomes lit → full descriptions available.
Flood light → bright → reveals extra details not visible in dim.

## Implementation: gameState additions

entityStates: Record<string, string>  — entity_id → current state
playerStates: Record<string, string>  — dimension → value
roomStates: Record<string, Record<string, string>>  — room_id → dimension → value

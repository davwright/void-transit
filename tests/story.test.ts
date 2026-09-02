import { describe, it, expect, beforeEach } from 'vitest';
import GameEngine from '../src/engine/GameEngine';
import { parse } from '../src/nlp/Parser';
import { GameState, ActionResult } from '../src/types';

/**
 * HAPPY PATH — the whole story, played only through parsed commands.
 *
 * Unlike godrun.test.ts, nothing here pokes engine state. Puzzles must activate
 * from rooms, story beats must fire from triggers, acts must transition from
 * state, and an ending must be reachable from the final choice. This is the test
 * that proves the narrative layer is actually wired to the engine.
 */
describe('Story — full happy path', () => {
  let engine: GameEngine;
  const SID = 'story';
  const log: string[] = [];
  const beatsSeen = new Set<string>();
  const eventsSeen = new Set<string>();
  const actsSeen: string[] = [];
  let ending: ActionResult['ending'] = null;

  function s(): GameState { return engine.getState(SID)!; }

  function cmd(input: string): ActionResult {
    const r = engine.processCommand(SID, parse(input));
    r.storyBeats?.forEach(b => beatsSeen.add(b.id));
    r.globalEvents?.forEach(e => eventsSeen.add(e.id));
    if (r.actTransition) actsSeen.push(r.actTransition.name);
    if (r.ending) ending = r.ending;
    log.push(`[${s().currentRoom}] ${input} → ${r.type}${r.type.includes('fail') ? ` "${r.message || r.reason}"` : ''}`);
    return r;
  }

  function must(input: string, type: RegExp | string = /success|look|move/) {
    const r = cmd(input);
    const ok = typeof type === 'string' ? r.type === type : type.test(r.type);
    if (!ok) throw new Error(`"${input}" → ${r.type}: ${r.message || r.reason}\n` + log.slice(-8).join('\n'));
    return r;
  }

  beforeEach(() => {
    engine = new GameEngine();
    engine.story.random = () => 0.99; // no random ambient events — keep the run deterministic
    engine.newGame(SID);
    log.length = 0; beatsSeen.clear(); eventsSeen.clear(); actsSeen.length = 0; ending = null;
  });

  it('plays from the pod to an ending with acts, beats and flags all firing from data', () => {
    // ── Act 1: the pod ─────────────────────────────────────────────
    expect(s().currentAct).toBe('act1_awakening');
    must('open compartment');
    must('get towel'); must('use towel');
    must('remove leads');
    must('get jumpsuit'); must('wear jumpsuit', 'equip_success');
    must('get pad'); must('get photo'); must('read pad', 'read_success');
    must('out', 'move_success');
    expect(s().currentRoom).toBe('cryo_bay');
    expect(beatsSeen.has('beat_wake')).toBe(true);
    expect(s().puzzleStates.cryo_recovery).toBe('active');   // activated by entering the bay

    cmd('look');
    expect(beatsSeen.has('beat_cryo_bay_observe')).toBe(true);
    cmd('examine empty pod');
    expect(beatsSeen.has('beat_empty_pod')).toBe(true);

    // Fetch medical supplies
    must('aft'); must('down'); must('down'); must('fore');
    expect(s().currentRoom).toBe('med_bay');
    must('get stimulant_injector'); must('get medical_kit');
    must('aft'); must('up'); must('up'); must('fore');
    expect(s().currentRoom).toBe('cryo_bay');
    expect(beatsSeen.has('beat_first_alarm')).toBe(true);    // timer beat: 2 turns after game start

    // Cryo recovery — wrong kind of action is rejected, right one accepted
    expect(cmd('calculate 5.2').type).toBe('puzzle_failed');
    must('examine diagnostic panel', 'puzzle_success');
    expect(cmd('administer stimulant').type).toBe('puzzle_failed');  // still need the dose
    must('calculate 5.2', 'puzzle_success');
    must('administer stimulant', 'puzzle_success');
    expect(s().puzzleStates.cryo_recovery).toBe('solved');
    expect(s().flags.cryo_sickness_treated).toBe(true);
    expect(beatsSeen.has('beat_act1_complete')).toBe(true);
    expect(s().currentAct).toBe('act2_discovery');

    // ── Act 2: discovery ────────────────────────────────────────────
    // Sweep the lower decks for parts first (Deck D/C stores), then fix life support.
    must('aft');
    expect(beatsSeen.has('beat_ship_exploration')).toBe(true);
    must('down'); must('aft');
    expect(s().currentRoom).toBe('machine_shop');
    must('get torque_wrench'); must('get epoxy_resin'); must('get welding_torch');
    must('aft');
    expect(s().currentRoom).toBe('cargo_bay');
    must('get co2_scrubber_cartridge');
    cmd('search'); cmd('search');
    must('get fuel_cell'); must('get antenna_component');
    must('fore'); must('fore'); must('down'); must('starboard');
    expect(s().currentRoom).toBe('lab');
    must('get spectrometer'); must('get sample_container');
    must('port'); must('up'); must('starboard');
    expect(s().currentRoom).toBe('life_support');
    expect(s().puzzleStates.life_support_repair).toBe('active');
    must('get oxygen_tank');
    must('collect sample', 'puzzle_success');
    must('analyze atmosphere', 'puzzle_success');
    must('calculate 2.05', 'puzzle_success');
    must('install cartridge', 'puzzle_success');
    expect(cmd('calibrate system').type).toBe('puzzle_failed');       // needs numbers
    must('calibrate 21.2 0.04 79', 'puzzle_success');
    expect(s().puzzleStates.life_support_repair).toBe('solved');
    expect(s().flags.life_support_calibrated).toBe(true);
    expect(s().timers?.some(t => t.id === 'co2_scrubbing')).toBe(true);

    must('port'); must('port');
    expect(s().currentRoom).toBe('electrical');
    expect(s().puzzleStates.electrical_reroute).toBe('active');
    must('get circuit_tester'); must('get cable_spool'); must('get insulation_tape');
    must('diagnose circuits', 'puzzle_success');
    must('calculate 1.887', 'puzzle_success');
    must('prepare cable', 'puzzle_success');
    expect(s().inventory).toContain('insulated_cable');
    expect(s().inventory).not.toContain('cable_spool');
    must('reroute power', 'puzzle_success');
    expect(s().flags.power_rerouted).toBe(true);
    expect(s().currentAct).toBe('act3_crisis');
    expect(beatsSeen.has('beat_act2_complete')).toBe(true);
    expect(beatsSeen.has('beat_cascade_warning')).toBe(true);

    // ── Act 3: crisis ───────────────────────────────────────────────
    must('starboard');
    expect(s().currentRoom).toBe('corridor_c');
    expect(s().puzzleStates.reactor_shielding).toBe('active');
    must('get radiation_badge');
    must('assess 3.75', 'puzzle_success');                     // safe-exposure calc before entering
    // The shield panel is 28 kg; at 0.55 g you can carry ~32. Leave the kit in the corridor.
    must('drop all');
    must('get torque_wrench'); must('get radiation_badge');
    must('fore');
    expect(s().currentRoom).toBe('reactor_room');
    expect(beatsSeen.has('beat_radiation_discovery')).toBe(true);
    must('get radiation_shield_panel');
    must('remove panel', 'puzzle_success');
    expect(cmd('install panel torque 20').type).toBe('puzzle_failed');  // wrong torque
    must('install panel torque 45', 'puzzle_success');
    expect(s().flags.hull_breach_detected).toBe(true);        // the cascade: reactor work opened the hull
    expect(beatsSeen.has('beat_hull_alert')).toBe(true);
    must('verify shielding', 'puzzle_success');
    expect(s().puzzleStates.reactor_shielding).toBe('solved');
    must('aft');
    expect(s().currentRoom).toBe('corridor_c');
    must('take all');
    expect(s().inventory).toContain('welding_torch');

    // EVA gear — the airlock is on Deck D
    must('up'); must('port');
    expect(s().currentRoom).toBe('airlock_inner');
    expect(s().puzzleStates.hull_breach_repair).toBe('active');
    must('get eva_suit'); must('get sealant_gun'); must('get tether_line');
    must('wear eva suit', 'equip_success');
    must('prepare eva', 'puzzle_success');
    must('out'); must('out');
    expect(s().currentRoom).toBe('hull_exterior');
    must('attach tether', 'puzzle_success');
    must('apply sealant', 'puzzle_success');
    must('weld hull', 'puzzle_success');
    expect(s().flags.hull_breach_repaired).toBe(true);
    must('return to airlock', 'puzzle_success');
    expect(s().puzzleStates.hull_breach_repair).toBe('solved');
    expect(s().currentAct).toBe('act4_resolution');
    expect(beatsSeen.has('beat_act3_complete')).toBe(true);

    // ── Act 4: resolution ───────────────────────────────────────────
    must('in'); must('in');
    if (s().currentRoom === 'airlock_inner') { /* stay */ } else must('in');
    expect(s().currentRoom).toBe('airlock_inner');
    // Shed the EVA kit — Deck A is 0.7 g and the suit is heavy
    must('take off eva suit'); must('drop eva suit'); must('drop oxygen tank'); must('drop sealant gun'); cmd('drop tether_line');
    must('starboard');
    must('down'); must('down'); must('down'); must('fore');
    expect(s().currentRoom).toBe('bridge');
    expect(beatsSeen.has('beat_navigation_weight')).toBe(true);
    expect(s().puzzleStates.navigation_correction).toBe('active');
    expect(s().puzzleStates.comms_restoration ?? 'undiscovered').toBe('undiscovered');
    must('get captains_key', 'take_success');
    cmd('examine navigation display');
    expect(beatsSeen.has('beat_trajectory_revelation')).toBe(true);
    must('extract chip', 'puzzle_success');
    expect(s().inventory).toContain('navigation_chip');
    // The trajectory analysis runs on the lab's terminal (Deck B)
    must('aft'); must('up'); must('starboard');
    expect(s().currentRoom).toBe('lab');
    must('analyze trajectory', 'puzzle_success');
    must('calculate 221714', 'puzzle_success');
    expect(beatsSeen.has('beat_fuel_dilemma')).toBe(true);
    must('port'); must('down'); must('fore');
    expect(s().currentRoom).toBe('bridge');
    expect(cmd('program burn').type).toBe('puzzle_failed');            // no parameters
    must('program burn 2847 247.3', 'puzzle_success');
    expect(s().flags.correction_burn_active).toBe(true);
    expect(beatsSeen.has('beat_burn_execution')).toBe(true);
    must('verify trajectory', 'puzzle_success');                       // fast-forwards the 14h burn
    expect(s().flags.course_corrected).toBe(true);
    expect(s().puzzleStates.navigation_correction).toBe('solved');

    // Comms only becomes available after the burn (Chekhov ordering)
    must('aft'); must('port');
    expect(s().currentRoom).toBe('comms_room');
    expect(s().puzzleStates.comms_restoration).toBe('active');
    if (!s().inventory.includes('antenna_component')) {
      // component is in the cargo bay; the search step finds it there
      must('starboard'); must('up'); must('up'); must('up'); must('aft'); must('aft'); must('aft');
      expect(s().currentRoom).toBe('cargo_bay');
      must('search for antenna', 'puzzle_success');
      must('fore'); must('fore'); must('fore'); must('down'); must('down'); must('down'); must('port');
    } else {
      must('search for antenna', 'puzzle_success');
    }
    expect(s().inventory).toContain('antenna_component');
    must('install component', 'puzzle_success');
    must('realign 15.4', 'puzzle_success');
    expect(s().flags.comms_operational).toBe(true);
    must('decode transmission', 'puzzle_success');
    expect(s().flags.transmission_decoded).toBe(true);
    expect(beatsSeen.has('beat_comms_revelation')).toBe(true);
    expect(beatsSeen.has('beat_act4_complete')).toBe(true);
    expect(s().currentAct).toBe('act5_revelation');

    // ── Act 5: revelation ───────────────────────────────────────────
    must('starboard');                     // corridor_a
    must('starboard');                     // captains_quarters (keycard held)
    expect(s().currentRoom).toBe('captains_quarters');
    expect(beatsSeen.has('beat_captains_quarters')).toBe(true);
    cmd('examine star charts');
    expect(beatsSeen.has('beat_star_chart_revelation')).toBe(true);
    cmd('examine datapad');
    expect(beatsSeen.has('beat_chen_personal_log')).toBe(true);
    expect(s().flags.chen_log_read).toBe(true);
    expect(beatsSeen.has('beat_the_weight')).toBe(true);

    // Find Chen
    must('port'); must('up'); must('up'); must('up'); must('fore');
    expect(s().currentRoom).toBe('cryo_bay');
    cmd('search pods');
    expect(beatsSeen.has('beat_find_chen')).toBe(true);
    expect(s().flags.chen_found).toBe(true);

    // The choice, at the transmitter
    must('aft'); must('down'); must('down'); must('down'); must('port');
    expect(s().currentRoom).toBe('comms_room');
    expect(beatsSeen.has('beat_final_choice')).toBe(true);
    cmd('wake chen and send the signal');
    expect(s().flags.final_choice).toBe('both');
    expect(ending?.id).toBe('ending_wake_and_signal');

    // Summary
    expect(actsSeen).toEqual(['Discovery', 'Crisis', 'Resolution', 'Revelation']);
    console.log(`\n═══ STORY HAPPY PATH ═══\nTurns: ${s().turnCount}  Health: ${s().playerHealth}\nBeats: ${beatsSeen.size}  Events: ${[...eventsSeen].join(', ') || 'none'}\nEnding: ${ending?.id}\n`);
  });

  it('reaches each of the four choice endings', () => {
    const choices: Array<[string, string]> = [
      ['wake chen', 'ending_wake_chen'],
      ['send signal', 'ending_send_signal'],
      ['do nothing', 'ending_do_nothing'],
    ];
    for (const [input, id] of choices) {
      engine = new GameEngine(); engine.newGame(SID);
      // Short-cut: set the state the final beat requires and go to the comms room
      const st = s();
      Object.assign(st.flags, { chen_log_read: true, course_corrected: true, comms_operational: true, chen_found: true });
      st.currentAct = 'act5_revelation';
      st.currentRoom = 'corridor_a';
      ending = null;
      cmd('port');
      expect(s().currentRoom).toBe('comms_room');
      expect(s().flags.final_choice_available).toBe(true);
      cmd(input);
      expect(ending?.id).toBe(id);
    }
  });
});

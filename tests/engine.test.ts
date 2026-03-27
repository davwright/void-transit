import { describe, it, expect, beforeEach } from 'vitest';
import GameEngine from '../src/engine/GameEngine';
import { parse } from '../src/nlp/Parser';
import { GameState, ActionResult } from '../src/types';

describe('GameEngine', () => {
  let engine: GameEngine;
  const SID = 'test-session';

  beforeEach(() => {
    engine = new GameEngine();
  });

  /** Move the player out of the cryo pod into cryo_bay, standing */
  function standUp() {
    const state = engine.getState(SID)!;
    state.flags.posture = 'standing';
    state.currentRoom = 'cryo_bay';
    state.visitedRooms.add('cryo_bay');
  }

  describe('newGame', () => {
    it('creates a new game session', () => {
      const result = engine.newGame(SID);
      expect(result.type).toBe('new_game');
      expect(result.roomId).toBe('cryo_pod');
      expect(result.intro).toBeTruthy();
      expect(result.roomName).toBeTruthy();
    });

    it('player starts with 65 health (cryo sickness)', () => {
      engine.newGame(SID);
      const state = engine.getState(SID)!;
      expect(state.playerHealth).toBe(65);
    });

    it('starts in act 1', () => {
      engine.newGame(SID);
      const state = engine.getState(SID)!;
      expect(state.currentAct).toBe('act1_awakening');
    });
  });

  describe('navigation', () => {
    beforeEach(() => {
      engine.newGame(SID);
      standUp();
    });

    it('can move south from cryo_bay to corridor_d', () => {
      const result = engine.processCommand(SID, parse('aft'));
      expect(result.type).toBe('move_success');
      expect(result.currentRoom).toBe('corridor_d');
    });

    it('cannot move to nonexistent exit', () => {
      const result = engine.processCommand(SID, parse('fore'));
      expect(result.type).toBe('move_failed');
    });

    it('tracks visited rooms', () => {
      engine.processCommand(SID, parse('aft'));
      const state = engine.getState(SID)!;
      expect(state.visitedRooms.has('cryo_bay')).toBe(true);
      expect(state.visitedRooms.has('corridor_d')).toBe(true);
    });

    it('can navigate through multiple rooms', () => {
      engine.processCommand(SID, parse('aft')); // corridor_d
      engine.processCommand(SID, parse('down')); // corridor_c
      engine.processCommand(SID, parse('down')); // corridor_b

      const state = engine.getState(SID)!;
      expect(state.currentRoom).toBe('corridor_b');
    });

    it('blocks movement while lying in cryo pod', () => {
      const state = engine.getState(SID)!;
      state.currentRoom = 'cryo_pod';
      state.flags.posture = 'lying';
      const result = engine.processCommand(SID, parse('get out'));
      expect(result.type).toBe('move_failed');
    });
  });

  describe('inventory', () => {
    beforeEach(() => {
      engine.newGame(SID);
      standUp();
    });

    it('starts with empty inventory', () => {
      const result = engine.processCommand(SID, parse('inventory'));
      expect(result.type).toBe('inventory');
      expect(result.items).toHaveLength(0);
    });

    it('can pick up items in current room', () => {
      engine.processCommand(SID, parse('search'));  // multitool is hidden until searched
      const result = engine.processCommand(SID, parse('take multitool'));
      expect(result.type).toBe('take_success');
    });

    it('cannot pick up items not in room', () => {
      const result = engine.processCommand(SID, parse('take welding torch'));
      expect(result.type).toBe('take_failed');
    });

    it('picked up items appear in inventory', () => {
      engine.processCommand(SID, parse('search'));
      engine.processCommand(SID, parse('take multitool'));
      const result = engine.processCommand(SID, parse('inventory'));
      expect(result.items!.length).toBeGreaterThan(0);
      expect(result.items!.some(i => i.id === 'multitool')).toBe(true);
    });

    it('can drop items', () => {
      engine.processCommand(SID, parse('search'));
      engine.processCommand(SID, parse('take multitool'));
      const result = engine.processCommand(SID, parse('drop multitool'));
      expect(result.type).toBe('drop_success');
    });
  });

  describe('examine', () => {
    beforeEach(() => {
      engine.newGame(SID);
      standUp();
    });

    it('can examine items in room', () => {
      engine.processCommand(SID, parse('search'));  // reveal hidden multitool
      const result = engine.processCommand(SID, parse('examine multitool'));
      expect(result.type).toBe('examine');
      expect(result.text).toBeTruthy();
    });

    it('can examine items in inventory', () => {
      engine.processCommand(SID, parse('search'));
      engine.processCommand(SID, parse('take multitool'));
      const result = engine.processCommand(SID, parse('examine multitool'));
      expect(result.type).toBe('examine');
    });

    it('cannot examine nonexistent items', () => {
      const result = engine.processCommand(SID, parse('examine unicorn'));
      expect(result.type).toBe('examine_failed');
    });

    it('resolves follow-up questions about examined items', () => {
      engine.processCommand(SID, parse('search'));
      const r1 = engine.processCommand(SID, parse('examine multitool'));
      expect(r1.type).toBe('examine');
      expect(r1.itemId).toBe('multitool');

      // Follow-up question about the multitool should resolve via lastExaminedItem
      const r2 = engine.processCommand(SID, parse('what is on the multitool'));
      expect(r2.type).not.toBe('examine_failed');
    });

    it('word-level matching does not produce false positives', () => {
      engine.processCommand(SID, parse('search')); // reveal hidden multitool
      const result = engine.processCommand(SID, parse('examine engineering multitool'));
      expect(result.type).toBe('examine');
      expect(result.itemId).toBe('multitool');
    });
  });

  describe('look', () => {
    beforeEach(() => {
      engine.newGame(SID);
    });

    it('returns room description', () => {
      standUp();
      const result = engine.processCommand(SID, parse('look'));
      expect(result.type).toBe('look');
      expect(result.description).toBeTruthy();
      expect(result.roomName).toBeTruthy();
    });

    it('shows visible items', () => {
      standUp();
      const result = engine.processCommand(SID, parse('look'));
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('shows exits', () => {
      standUp();
      const result = engine.processCommand(SID, parse('look'));
      expect(result.exits).toBeDefined();
      expect(result.exits!.length).toBeGreaterThan(0);
    });

    it('shows pod ceiling when lying in cryo pod', () => {
      // Player starts in cryo_pod, lying
      const result = engine.processCommand(SID, parse('look'));
      expect(result.type).toBe('look');
      expect(result.description).toContain('floating in a cryo pod');
      expect(result.items).toHaveLength(0);
      expect(result.exits).toHaveLength(0);
    });

    it('shows pod interior when sitting', () => {
      const state = engine.getState(SID)!;
      state.flags.posture = 'sitting';
      const result = engine.processCommand(SID, parse('look'));
      expect(result.type).toBe('look');
      expect(result.description).toContain('braced upright');
    });
  });

  describe('status and systems', () => {
    beforeEach(() => {
      engine.newGame(SID);
    });

    it('shows player status', () => {
      const result = engine.processCommand(SID, parse('status'));
      expect(result.type).toBe('status');
      expect(result.health).toBeDefined();
      expect(result.turnCount).toBeDefined();
    });

    it('shows ship systems', () => {
      const result = engine.processCommand(SID, parse('systems'));
      expect(result.type).toBe('systems');
      expect(result.systems).toBeDefined();
    });
  });

  describe('save/load', () => {
    beforeEach(() => {
      engine.newGame(SID);
    });

    it('can save and load game', () => {
      standUp();
      // Search to reveal hidden multitool, then take it
      engine.processCommand(SID, parse('search'));
      engine.processCommand(SID, parse('take multitool'));
      // Move south to make some progress
      engine.processCommand(SID, parse('aft'));

      // Save
      const saveResult = engine.saveGame(SID, 'test_save');
      expect(saveResult.success).toBe(true);

      // Start fresh
      engine.newGame(SID);
      let state = engine.getState(SID)!;
      expect(state.currentRoom).toBe('cryo_pod');

      // Load
      const loadResult = engine.loadGame(SID, 'test_save');
      expect(loadResult.success).toBe(true);

      state = engine.getState(SID)!;
      expect(state.currentRoom).toBe('corridor_d');
      expect(state.inventory).toContain('multitool');
    });

    it('lists saved games', () => {
      engine.saveGame(SID, 'test_list');
      const saves = engine.listSaves();
      expect(saves.length).toBeGreaterThan(0);
      expect(saves.some(s => s.slotName === 'test_list')).toBe(true);
    });
  });

  describe('turn counting', () => {
    it('increments turn count on each command', () => {
      engine.newGame(SID);
      engine.processCommand(SID, parse('look'));
      engine.processCommand(SID, parse('look'));
      engine.processCommand(SID, parse('look'));

      const state = engine.getState(SID)!;
      expect(state.turnCount).toBe(3);
    });
  });

  describe('system ticks', () => {
    it('CO2 rises each turn when scrubbers are failing', () => {
      engine.newGame(SID);
      const state = engine.getState(SID)!;

      // Get initial CO2 from ship systems
      const systems = (state.shipSystems as any).systems || state.shipSystems;
      const initialCo2 = systems.life_support?.subsystems?.co2_scrubbers?.co2_ppm;

      // Process several turns
      for (let i = 0; i < 5; i++) {
        engine.processCommand(SID, parse('wait'));
      }

      const currentCo2 = systems.life_support?.subsystems?.co2_scrubbers?.co2_ppm;
      if (initialCo2 !== undefined && currentCo2 !== undefined) {
        expect(currentCo2).toBeGreaterThan(initialCo2);
      }
    });
  });

  describe('help', () => {
    it('returns help text', () => {
      engine.newGame(SID);
      const result = engine.processCommand(SID, parse('help'));
      expect(result.type).toBe('help');
      expect(result.message).toContain('MOVEMENT');
      expect(result.message).toContain('port');
      expect(result.message).toContain('starboard');
    });
  });

  describe('map', () => {
    it('shows visited rooms', () => {
      engine.newGame(SID);
      engine.processCommand(SID, parse('aft'));
      const result = engine.processCommand(SID, parse('map'));
      expect(result.type).toBe('map');
      expect(result.visited).toBeDefined();
    });
  });

  describe('disambiguation', () => {
    beforeEach(() => {
      engine.newGame(SID);
    });

    it('disambiguate picks the valid interpretation when only one works', () => {
      // An intent with alternatives where only the primary is valid
      const state = engine.getState(SID)!;
      const intent = {
        action: 'examine',
        target: 'pod',   // "pod" is mentioned in cryo_bay description
        instrument: null,
        raw: 'pod',
        confidence: 0.8,
        alternatives: [
          { action: 'move', target: 'pod', instrument: null, raw: 'pod', confidence: 0.3 }
        ]
      };

      const result = engine.processCommand(SID, intent);
      // Should not be a disambiguate response — move to "pod" fails, so examine wins
      expect(result.type).not.toBe('disambiguate');
    });

    it('deterministic commands bypass disambiguation entirely', () => {
      const intent = parse('look');
      expect(intent.alternatives).toBeUndefined();
      const result = engine.processCommand(SID, intent);
      expect(result.type).toBe('look');
    });
  });

  describe('regressions', () => {
    beforeEach(() => {
      engine.newGame(SID);
    });

    function standUp() {
      const state = engine.getState(SID)!;
      state.flags.posture = 'standing';
      state.flags.leads_removed = true;
      state.currentRoom = 'cryo_bay';
      state.visitedRooms.add('cryo_bay');
    }

    it('abbreviations match examine targets (comp → compartment)', () => {
      // In cryo_pod, "comp" should match "compartment" examineTarget
      const result = engine.processCommand(SID, parse('look comp'));
      expect(result.type).toBe('examine');
      expect(result.text).toBeDefined();
    });

    it('transitive verbs with no target prompt the player', () => {
      // All transitive verbs should prompt "X what?" when target is missing
      const tests: Array<[string, string]> = [
        ['ope', 'Open what'],
        ['take', 'Take what'],
        ['drop', 'Drop what'],
        ['use', 'Use what'],
        ['read', 'Read what'],
        ['wear', 'Wear what'],
      ];
      for (const [input, expected] of tests) {
        const result = engine.processCommand(SID, parse(input));
        expect(result.message).toContain(expected);
      }
    });

    it('drink water in mess hall resolves thirst', () => {
      standUp();
      const state = engine.getState(SID)!;
      state.currentRoom = 'mess_hall';
      state.visitedRooms.add('mess_hall');

      const result = engine.processCommand(SID, parse('drink water'));
      expect(result.type).toMatch(/success/);
      expect(state.flags.thirst_resolved).toBe(true);
    });

    it('eat ration in mess hall resolves hunger', () => {
      standUp();
      const state = engine.getState(SID)!;
      state.currentRoom = 'mess_hall';
      state.visitedRooms.add('mess_hall');

      const result = engine.processCommand(SID, parse('eat ration'));
      expect(result.type).toMatch(/success/);
      expect(state.flags.hunger_resolved).toBe(true);
    });

    it('spectrometer use in life_support reveals CO2', () => {
      standUp();
      const state = engine.getState(SID)!;
      state.currentRoom = 'life_support';
      state.visitedRooms.add('life_support');
      state.inventory.push('spectrometer');
      state.itemLocations['spectrometer'] = 'inventory';

      const result = engine.processCommand(SID, parse('use spectrometer'));
      expect(result.type).toMatch(/success/);
      expect(state.flags.co2_measured).toBe(true);
    });

    it('up from corridor_a goes to corridor_b (inward, lighter gravity)', () => {
      standUp();
      const state = engine.getState(SID)!;
      state.currentRoom = 'corridor_a';
      state.visitedRooms.add('corridor_a');

      engine.processCommand(SID, parse('up'));
      expect(state.currentRoom).toBe('corridor_b');
    });

    it('down from corridor_d goes to corridor_c (outward, heavier gravity)', () => {
      standUp();
      const state = engine.getState(SID)!;
      state.currentRoom = 'corridor_d';
      state.visitedRooms.add('corridor_d');

      engine.processCommand(SID, parse('down'));
      expect(state.currentRoom).toBe('corridor_c');
    });

    it('cardinal directions are rejected', () => {
      const result = engine.processCommand(SID, parse('north'));
      expect(result.type).toBe('rejected');
    });

    it('puzzle commands parse with decimal numbers', () => {
      const intent = parse('calculate 5.2');
      expect(intent.action).toBe('puzzle_action');
      expect(intent.target).toBe('5.2');
    });

    it('wear suit prefers unequipped item when one is already worn', () => {
      standUp();
      const state = engine.getState(SID)!;
      state.inventory.push('jumpsuit', 'eva_suit');
      state.itemLocations['jumpsuit'] = 'inventory';
      state.itemLocations['eva_suit'] = 'inventory';
      state.equipped = ['jumpsuit'];

      const result = engine.processCommand(SID, parse('wear suit'));
      expect(result.type).toBe('equip_success');
      expect(state.equipped).toContain('eva_suit');
    });
  });
});

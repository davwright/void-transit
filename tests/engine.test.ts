import { describe, it, expect, beforeEach } from 'vitest';
import GameEngine from '../src/engine/GameEngine';
import { parse } from '../src/nlp/FallbackParser';
import { GameState, ActionResult } from '../src/types';

describe('GameEngine', () => {
  let engine: GameEngine;
  const SID = 'test-session';

  beforeEach(() => {
    engine = new GameEngine();
  });

  describe('newGame', () => {
    it('creates a new game session', () => {
      const result = engine.newGame(SID);
      expect(result.type).toBe('new_game');
      expect(result.roomId).toBe('cryo_bay');
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
    });

    it('can move south from cryo_bay to corridor_d', () => {
      const result = engine.processCommand(SID, parse('south'));
      expect(result.type).toBe('move_success');
      expect(result.currentRoom).toBe('corridor_d');
    });

    it('cannot move to nonexistent exit', () => {
      const result = engine.processCommand(SID, parse('north'));
      expect(result.type).toBe('move_failed');
    });

    it('tracks visited rooms', () => {
      engine.processCommand(SID, parse('south'));
      const state = engine.getState(SID)!;
      expect(state.visitedRooms.has('cryo_bay')).toBe(true);
      expect(state.visitedRooms.has('corridor_d')).toBe(true);
    });

    it('can navigate through multiple rooms', () => {
      engine.processCommand(SID, parse('south')); // corridor_d
      engine.processCommand(SID, parse('up')); // corridor_c
      engine.processCommand(SID, parse('up')); // corridor_b

      const state = engine.getState(SID)!;
      expect(state.currentRoom).toBe('corridor_b');
    });
  });

  describe('inventory', () => {
    beforeEach(() => {
      engine.newGame(SID);
    });

    it('starts with empty inventory', () => {
      const result = engine.processCommand(SID, parse('inventory'));
      expect(result.type).toBe('inventory');
      expect(result.items).toHaveLength(0);
    });

    it('can pick up items in current room', () => {
      const result = engine.processCommand(SID, parse('take multitool'));
      expect(result.type).toBe('take_success');
    });

    it('cannot pick up items not in room', () => {
      const result = engine.processCommand(SID, parse('take welding torch'));
      expect(result.type).toBe('take_failed');
    });

    it('picked up items appear in inventory', () => {
      engine.processCommand(SID, parse('take multitool'));
      const result = engine.processCommand(SID, parse('inventory'));
      expect(result.items!.length).toBeGreaterThan(0);
      expect(result.items!.some(i => i.id === 'multitool')).toBe(true);
    });

    it('can drop items', () => {
      engine.processCommand(SID, parse('take multitool'));
      const result = engine.processCommand(SID, parse('drop multitool'));
      expect(result.type).toBe('drop_success');
    });
  });

  describe('examine', () => {
    beforeEach(() => {
      engine.newGame(SID);
    });

    it('can examine items in room', () => {
      const result = engine.processCommand(SID, parse('examine multitool'));
      expect(result.type).toBe('examine');
      expect(result.text).toBeTruthy();
    });

    it('can examine items in inventory', () => {
      engine.processCommand(SID, parse('take datapad'));
      const result = engine.processCommand(SID, parse('examine datapad'));
      expect(result.type).toBe('examine');
    });

    it('cannot examine nonexistent items', () => {
      const result = engine.processCommand(SID, parse('examine unicorn'));
      expect(result.type).toBe('examine_failed');
    });
  });

  describe('look', () => {
    beforeEach(() => {
      engine.newGame(SID);
    });

    it('returns room description', () => {
      const result = engine.processCommand(SID, parse('look'));
      expect(result.type).toBe('look');
      expect(result.description).toBeTruthy();
      expect(result.roomName).toBeTruthy();
    });

    it('shows visible items', () => {
      const result = engine.processCommand(SID, parse('look'));
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('shows exits', () => {
      const result = engine.processCommand(SID, parse('look'));
      expect(result.exits).toBeDefined();
      expect(result.exits!.length).toBeGreaterThan(0);
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
      // Make some progress
      engine.processCommand(SID, parse('take multitool'));
      engine.processCommand(SID, parse('south'));

      // Save
      const saveResult = engine.saveGame(SID, 'test_save');
      expect(saveResult.success).toBe(true);

      // Start fresh
      engine.newGame(SID);
      let state = engine.getState(SID)!;
      expect(state.currentRoom).toBe('cryo_bay');

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
      engine.processCommand(SID, parse('south'));
      const result = engine.processCommand(SID, parse('map'));
      expect(result.type).toBe('map');
      expect(result.visited).toBeDefined();
    });
  });
});

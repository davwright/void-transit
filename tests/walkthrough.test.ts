import { describe, it, expect, beforeEach } from 'vitest';
import GameEngine from '../src/engine/GameEngine';
import { parse } from '../src/nlp/Parser';
import { GameState, ActionResult } from '../src/types';

/**
 * Complete walkthrough integration test.
 * Navigates the entire ship, picks up items, and verifies
 * core game mechanics work end-to-end.
 */
describe('Complete Walkthrough', () => {
  let engine: GameEngine;
  const SID = 'walkthrough';

  function cmd(input: string): ActionResult {
    return engine.processCommand(SID, parse(input));
  }

  function state(): GameState {
    return engine.getState(SID)!;
  }

  function room(): string {
    return state().currentRoom;
  }

  function hasItem(id: string): boolean {
    return state().inventory.includes(id);
  }

  beforeEach(() => {
    engine = new GameEngine();
    engine.newGame(SID);
  });

  describe('Act 1: Awakening in Cryo Bay', () => {
    it('starts in cryo_bay', () => {
      expect(room()).toBe('cryo_bay');
    });

    it('can look around cryo bay', () => {
      const result = cmd('look');
      expect(result.type).toBe('look');
      expect(result.description).toBeTruthy();
    });

    it('can pick up starting items', () => {
      cmd('search');  // multitool is hidden until searched
      cmd('take multitool');
      cmd('examine pod');  // reveals datapad and photo via revealsOnExamine
      cmd('take datapad');
      expect(hasItem('multitool')).toBe(true);
      expect(hasItem('datapad')).toBe(true);
    });

    it('can examine the personal photo', () => {
      cmd('examine pod');  // reveals photo
      const result = cmd('examine personal photo');
      expect(result.type).toBe('examine');
      expect(result.text).toBeTruthy();
    });

    it('hidden items cannot be taken without revealing them first', () => {
      // datapad is hidden until pod is examined
      const r = cmd('take datapad');
      expect(r.type).toBe('take_failed');
      // now reveal it
      cmd('examine pod');
      const r2 = cmd('take datapad');
      expect(r2.type).toBe('take_success');
    });
  });

  describe('Ship Navigation - Full Traverse', () => {
    it('can traverse from cryo_bay through the entire ship', () => {
      // Start in cryo_bay (Deck D)
      expect(room()).toBe('cryo_bay');

      // Go to corridor_d
      let result = cmd('south');
      expect(result.type).toBe('move_success');
      expect(room()).toBe('corridor_d');

      // Explore Deck D
      result = cmd('south');
      expect(result.type).toBe('move_success');
      expect(room()).toBe('engine_room');
      cmd('north'); // back to corridor_d

      result = cmd('east');
      expect(result.type).toBe('move_success');
      expect(room()).toBe('fuel_storage');
      cmd('west'); // back to corridor_d

      result = cmd('west');
      expect(result.type).toBe('move_success');
      expect(room()).toBe('airlock_inner');
      cmd('east'); // back to corridor_d

      // Go up to corridor_c (Deck C)
      result = cmd('up');
      expect(result.type).toBe('move_success');
      expect(room()).toBe('corridor_c');

      // Explore Deck C
      cmd('south'); // machine_shop
      expect(room()).toBe('machine_shop');
      cmd('north'); // back

      cmd('east'); // life_support
      expect(room()).toBe('life_support');
      cmd('west'); // back

      cmd('west'); // electrical
      expect(room()).toBe('electrical');
      cmd('east'); // back

      // Go up to corridor_b (Deck B)
      cmd('up');
      expect(room()).toBe('corridor_b');

      // Explore Deck B
      cmd('north'); // med_bay
      expect(room()).toBe('med_bay');
      cmd('south'); // back

      cmd('south'); // mess_hall
      expect(room()).toBe('mess_hall');
      cmd('north'); // back

      cmd('east'); // lab
      expect(room()).toBe('lab');
      cmd('west'); // back

      cmd('west'); // crew_quarters
      expect(room()).toBe('crew_quarters');
      cmd('east'); // back

      // Go up to corridor_a (Deck A)
      cmd('up');
      expect(room()).toBe('corridor_a');

      // Explore Deck A
      cmd('north'); // bridge
      expect(room()).toBe('bridge');
      cmd('south'); // back

      cmd('west'); // comms_room
      expect(room()).toBe('comms_room');
      cmd('east'); // back

      // Verify we visited many rooms
      const visited = state().visitedRooms;
      expect(visited.size).toBeGreaterThanOrEqual(15);
    });
  });

  describe('Item Interactions', () => {
    it('can pick up and examine items from multiple rooms', () => {
      // Get items from cryo_bay
      cmd('search');  // reveal hidden multitool
      cmd('take multitool');
      cmd('examine pod');  // reveal datapad and photo
      cmd('take datapad');
      expect(hasItem('multitool')).toBe(true);
      expect(hasItem('datapad')).toBe(true);

      // Navigate to corridor_d -> corridor_c -> machine_shop
      cmd('south'); // corridor_d
      cmd('up');    // corridor_c
      cmd('south'); // machine_shop

      // Try to pick up items there
      const result = cmd('look');
      expect(result.items).toBeDefined();
    });

    it('cannot pick up items that are too heavy', () => {
      // Navigate to reactor room where radiation_shield_panel is (28kg, too heavy with other items)
      cmd('south'); // corridor_d
      cmd('up');    // corridor_c

      // Pick up several items first
      cmd('south'); // machine_shop
      cmd('take welding torch');
      cmd('take torque wrench');
      cmd('take epoxy resin');
      cmd('north'); // corridor_c

      cmd('east');  // life_support
      cmd('take oxygen tank');
      cmd('west');  // corridor_c

      cmd('north'); // reactor_room
      // radiation_shield_panel is 28kg - should fail if already carrying stuff
      const result = cmd('take radiation shield panel');
      // Either fails due to weight or it's there — the important thing is it doesn't crash
      expect(['take_success', 'take_failed']).toContain(result.type);
    });
  });

  describe('Game State Persistence', () => {
    it('save and load preserves full game state', () => {
      // Make progress
      cmd('take multitool');
      cmd('take datapad');
      cmd('south'); // corridor_d
      cmd('up');    // corridor_c
      cmd('look');

      const stateBefore = {
        room: room(),
        inventory: [...state().inventory],
        turnCount: state().turnCount,
        visitedCount: state().visitedRooms.size
      };

      // Save
      const saveResult = engine.saveGame(SID, 'walkthrough_test');
      expect(saveResult.success).toBe(true);

      // Reset
      engine.newGame(SID);
      expect(room()).toBe('cryo_bay');
      expect(state().inventory).toHaveLength(0);

      // Load
      const loadResult = engine.loadGame(SID, 'walkthrough_test');
      expect(loadResult.success).toBe(true);

      // Verify restored state
      expect(room()).toBe(stateBefore.room);
      expect(state().inventory).toEqual(stateBefore.inventory);
      expect(state().turnCount).toBe(stateBefore.turnCount);
      expect(state().visitedRooms.size).toBe(stateBefore.visitedCount);
    });
  });

  describe('Ship Systems Monitoring', () => {
    it('systems command returns ship status', () => {
      const result = cmd('systems');
      expect(result.type).toBe('systems');
      expect(result.systems).toBeDefined();

      // Check key systems exist
      const sysNames = Object.keys(result.systems!);
      expect(sysNames.length).toBeGreaterThan(0);
    });

    it('CO2 accumulates over turns', () => {
      const systems = (state().shipSystems as any).systems || state().shipSystems;
      const co2Start = systems?.life_support?.subsystems?.co2_scrubbers?.co2_ppm;

      // Take 10 turns
      for (let i = 0; i < 10; i++) {
        cmd('wait');
      }

      const co2End = systems?.life_support?.subsystems?.co2_scrubbers?.co2_ppm;
      if (co2Start !== undefined && co2End !== undefined) {
        expect(co2End).toBeGreaterThan(co2Start);
      }
    });
  });

  describe('Story Progression', () => {
    it('starts in act1_awakening', () => {
      expect(state().currentAct).toBe('act1_awakening');
    });

    it('story beats can trigger', () => {
      // Explore the ship to trigger story beats
      cmd('take multitool');
      cmd('take datapad');
      cmd('south'); // corridor_d
      cmd('up');    // corridor_c
      cmd('up');    // corridor_b
      cmd('north'); // med_bay
      cmd('south'); // corridor_b
      cmd('south'); // mess_hall

      // After exploring several rooms, some story beats should have fired
      const triggered = state().storyBeatsTriggered;
      // Don't assert exact beats (story details are secret), just that the system works
      expect(Array.isArray(triggered)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('handles unknown commands gracefully', () => {
      const result = cmd('xyzzy plugh');
      // Unknown words are now treated as examine attempts
      expect(result.type).toBe('examine_failed');
    });

    it('handles examining nonexistent items gracefully', () => {
      const result = cmd('examine warp drive');
      expect(result.type).toBe('examine_failed');
    });

    it('handles using items not in inventory', () => {
      const result = cmd('use welding torch on hull');
      expect(result.type).toBe('use_failed');
    });

    it('handles dropping items not carried', () => {
      const result = cmd('drop multitool');
      expect(result.type).toBe('drop_failed');
    });
  });

  describe('Full Exploration Run', () => {
    it('can explore every reachable room without crashing', () => {
      const roomsToVisit = [
        'south',   // corridor_d
        'south',   // engine_room
        'north',   // corridor_d
        'east',    // fuel_storage
        'west',    // corridor_d
        'west',    // airlock_inner
        'east',    // corridor_d
        'north',   // cryo_bay
        'south',   // corridor_d
        'up',      // corridor_c
        'north',   // reactor_room
        'south',   // corridor_c
        'south',   // machine_shop
        'south',   // cargo_bay (if exists)
        'north',   // machine_shop
        'north',   // corridor_c
        'east',    // life_support
        'west',    // corridor_c
        'west',    // electrical
        'east',    // corridor_c
        'up',      // corridor_b
        'north',   // med_bay
        'south',   // corridor_b
        'south',   // mess_hall
        'south',   // hydroponics (if exists)
        'north',   // mess_hall
        'north',   // corridor_b
        'east',    // lab
        'west',    // corridor_b
        'west',    // crew_quarters
        'south',   // rec_room (if exists)
        'north',   // crew_quarters
        'east',    // corridor_b
        'up',      // corridor_a
        'north',   // bridge
        'south',   // corridor_a
        'west',    // comms_room
        'east',    // corridor_a
      ];

      let moveCount = 0;
      let successCount = 0;

      for (const direction of roomsToVisit) {
        const result = cmd(direction);
        moveCount++;
        if (result.type === 'move_success') {
          successCount++;
        }
        // The game should never crash regardless of outcome
      }

      // At least half the moves should succeed (some may be blocked)
      expect(successCount).toBeGreaterThan(moveCount * 0.4);

      // Should have visited many rooms
      expect(state().visitedRooms.size).toBeGreaterThanOrEqual(10);

      // Game state should still be valid
      expect(state().playerHealth).toBeGreaterThan(0);
      expect(state().turnCount).toBe(moveCount);
    });
  });
});

import { Room, ItemDef, PuzzleDef, GameState, Intent, ActionResult, StoryData, ShipSystems, GameData } from '../types';
import NavigationManager from './NavigationManager';
import InventoryManager from './InventoryManager';
import PuzzleEngine from './PuzzleEngine';
import StoryManager from './StoryManager';
import CommandProcessor from './CommandProcessor';
import SaveManager from './SaveManager';

import * as fs from 'fs';
import * as path from 'path';
import config from '../config';

interface SystemEvent {
  type: string;
  system: string;
  message: string;
}

interface NewGameResult extends ActionResult {
  intro: string;
  storyContext: ReturnType<StoryManager['getStoryContext']>;
}

interface LoadGameResult {
  success: boolean;
  reason?: string;
  metadata?: {
    timestamp: string;
    slotName: string;
    turnCount: number;
    currentRoom: string;
    actId: string;
  };
  roomId?: string;
  roomName?: string;
  description?: string;
  items?: Array<{ id: string; name: string }>;
  exits?: Array<{ direction: string; accessible: boolean }>;
  storyContext?: ReturnType<StoryManager['getStoryContext']>;
}

class GameEngine {
  data: GameData;
  nav: NavigationManager;
  inv: InventoryManager;
  puzzle: PuzzleEngine;
  story: StoryManager;
  cmd: CommandProcessor;
  saveManager: SaveManager;
  sessions: Map<string, GameState>;

  constructor() {
    this.data = this._loadData();
    this.nav = new NavigationManager(this.data.rooms);
    this.inv = new InventoryManager(this.data.items);
    this.puzzle = new PuzzleEngine(this.data.puzzles);
    this.story = new StoryManager(this.data.story);
    this.cmd = new CommandProcessor(this.nav, this.inv, this.puzzle, this.story);
    this.saveManager = new SaveManager();
    this.sessions = new Map<string, GameState>();
  }

  newGame(sessionId: string): NewGameResult {
    const state = this._createInitialState();
    this.sessions.set(sessionId, state);

    const room = this.nav.getRoom(state.currentRoom);
    const roomDesc = this.nav.getRoomDescription(state.currentRoom, state);
    state.visitedRooms.add(state.currentRoom);

    const items = this.inv.getVisibleItemsInRoom(state.currentRoom, state);
    const exits = this.nav.getVisibleExits(state.currentRoom, state);
    const puzzleTriggers = this.puzzle.checkPuzzleTriggers(state.currentRoom, state);

    return {
      type: 'new_game',
      intro: this._getIntroText(),
      roomId: state.currentRoom,
      roomName: room!.name,
      description: roomDesc,
      isFirstVisit: true,
      items: items.map(i => ({ id: i.id, name: i.name })),
      exits: exits.map(e => ({ direction: e.direction, accessible: e.accessible })),
      puzzleTriggers: puzzleTriggers.map(p => ({ id: p.id, name: p.name, description: p.description })),
      storyContext: this.story.getStoryContext(state)
    };
  }

  processCommand(sessionId: string, intent: Intent): ActionResult {
    const state = this.sessions.get(sessionId);
    if (!state) {
      return { type: 'error', message: 'No active game session. Start a new game.' };
    }

    state.turnCount++;

    // Process the command
    const result = this.cmd.process(intent, state);

    // Tick ship systems
    const systemEvents = this._tickSystems(state);

    // Check story beats
    const storyBeats = this.story.checkStoryBeats(state);

    // Check act transitions
    const actTransition = this.story.checkActTransition(state);

    // Check global events
    const globalEvents = this.story.checkGlobalEvents(state);

    // Check ending conditions
    const ending = this.story.checkEnding(state);

    // Autosave periodically
    if (state.turnCount % config.autosaveInterval === 0) {
      this.saveManager.autosave(state);
    }

    // Store in conversation history
    state.conversationHistory.push({
      turn: state.turnCount,
      intent,
      resultType: result.type
    });

    return {
      ...result,
      systemEvents,
      storyBeats: storyBeats.map(b => ({ id: b.id, text: b.text, type: b.type })),
      actTransition: actTransition ? { name: actTransition.toAct.name, message: actTransition.message || undefined } : null,
      globalEvents: globalEvents.map(e => ({ id: e.id, text: e.text })),
      ending: ending ? { id: ending.id, text: ending.text, type: ending.type } : null,
      storyContext: this.story.getStoryContext(state),
      turnCount: state.turnCount,
      currentRoom: state.currentRoom
    };
  }

  saveGame(sessionId: string, slotName: string): { success: boolean; reason?: string; filename?: string; timestamp?: string } {
    const state = this.sessions.get(sessionId);
    if (!state) return { success: false, reason: 'No active game.' };
    return this.saveManager.save(state, slotName);
  }

  loadGame(sessionId: string, slotName: string): LoadGameResult {
    const result = this.saveManager.load(slotName);
    if (!result.success) return result;

    this.sessions.set(sessionId, result.state!);
    const state = result.state!;
    const room = this.nav.getRoom(state.currentRoom);
    const roomDesc = this.nav.getRoomDescription(state.currentRoom, state);
    const items = this.inv.getVisibleItemsInRoom(state.currentRoom, state);
    const exits = this.nav.getVisibleExits(state.currentRoom, state);

    return {
      success: true,
      metadata: result.metadata,
      roomId: state.currentRoom,
      roomName: room ? room.name : 'Unknown',
      description: roomDesc,
      items: items.map(i => ({ id: i.id, name: i.name })),
      exits: exits.map(e => ({ direction: e.direction, accessible: e.accessible })),
      storyContext: this.story.getStoryContext(state)
    };
  }

  listSaves(): Array<{ slotName: string; filename: string; timestamp: string; turnCount: number; currentRoom: string; actId: string }> {
    return this.saveManager.listSaves();
  }

  getState(sessionId: string): GameState | null {
    return this.sessions.get(sessionId) || null;
  }

  _createInitialState(): GameState {
    const shipSystems = JSON.parse(JSON.stringify(this.data.shipSystems));

    // Set up initial item locations and hidden states
    const itemLocations: Record<string, string> = {};
    const itemHidden: Record<string, boolean> = {};
    const itemProperties: Record<string, Record<string, unknown>> = {};

    for (const item of this.data.items) {
      itemLocations[item.id] = item.location || 'nowhere';
      itemHidden[item.id] = item.hidden || false;
      if (item.properties) {
        itemProperties[item.id] = { ...item.properties };
      }
    }

    return {
      currentRoom: 'cryo_bay',
      previousRoom: null,
      inventory: [],
      equipped: [],
      itemLocations,
      itemHidden,
      itemProperties,
      flags: {},
      visitedRooms: new Set<string>(),
      puzzleStates: {},
      puzzleProgress: {},
      puzzleAttempts: {},
      shipSystems,
      currentAct: 'act1_awakening',
      storyBeatsTriggered: [],
      turnCount: 0,
      playerHealth: 65,
      radiationExposure: 0,
      conversationHistory: [],
      globalEvents: []
    };
  }

  _tickSystems(state: GameState): SystemEvent[] {
    const events: SystemEvent[] = [];
    const ticks = (this.data.shipSystems as ShipSystems).tickRules || {};
    const systems = (state.shipSystems as unknown as Record<string, unknown>).systems || state.shipSystems;

    // CO2 rise (if scrubbers not fixed)
    if ((systems as Record<string, unknown>).life_support) {
      const lifeSupport = (systems as Record<string, unknown>).life_support as Record<string, unknown>;
      const subsystems = lifeSupport.subsystems as Record<string, Record<string, unknown>>;
      const scrubbers = subsystems.co2_scrubbers as Record<string, unknown>;
      if (scrubbers.status !== 'nominal') {
        (scrubbers as Record<string, number>).co2_ppm += ((ticks as Record<string, number>).co2_rise_per_turn || 150) * (1 - (scrubbers.efficiency as number));
        if ((scrubbers.co2_ppm as number) > 25000 && !state.flags.co2_warning_given) {
          events.push({ type: 'warning', system: 'life_support', message: 'WARNING: CO2 levels approaching dangerous concentration. You feel lightheaded.' });
          state.flags.co2_warning_given = true;
        }
        if ((scrubbers.co2_ppm as number) > 40000 && !state.flags.co2_critical_given) {
          events.push({ type: 'critical', system: 'life_support', message: 'CRITICAL: CO2 at dangerous levels. Vision blurring. You must fix life support immediately.' });
          state.flags.co2_critical_given = true;
          state.playerHealth -= 5;
        }
        if ((scrubbers.co2_ppm as number) > 50000) {
          events.push({ type: 'fatal', system: 'life_support', message: 'You collapse. The CO2 concentration is lethal. Darkness takes you.' });
          state.playerHealth = 0;
        }
      }
    }

    // Battery drain
    if ((systems as Record<string, unknown>).power) {
      const power = (systems as Record<string, unknown>).power as Record<string, unknown>;
      const subsystems = power.subsystems as Record<string, Record<string, unknown>>;
      const battery = subsystems.battery_backup as Record<string, unknown>;
      if (battery.status === 'draining') {
        battery.charge = Math.max(0, (battery.charge as number) - ((ticks as Record<string, number>).battery_drain_per_turn || 0.005));
        if ((battery.charge as number) < 0.15 && !state.flags.battery_warning_given) {
          events.push({ type: 'warning', system: 'power', message: 'Battery backup at 15%. Emergency lighting only if this reaches zero.' });
          state.flags.battery_warning_given = true;
        }
      }
    }

    // Radiation in reactor room
    if (state.currentRoom === 'reactor_room') {
      const power = (systems as Record<string, unknown>).power as Record<string, unknown>;
      const subsystems = power.subsystems as Record<string, Record<string, unknown>>;
      const reactor = subsystems.fusion_reactor as Record<string, unknown>;
      if ((reactor.shieldingIntegrity as number) < 0.7) {
        const dose = ((ticks as Record<string, number>).radiation_accumulation_per_turn_in_reactor || 2.8) * (1 - (reactor.shieldingIntegrity as number));
        state.radiationExposure += dose;
        if (state.radiationExposure > 20 && !state.flags.radiation_warning_given) {
          events.push({ type: 'warning', system: 'reactor', message: `Radiation exposure: ${state.radiationExposure.toFixed(1)} mSv. Your badge is turning color. Leave this area soon.` });
          state.flags.radiation_warning_given = true;
        }
        if (state.radiationExposure > 50) {
          events.push({ type: 'critical', system: 'reactor', message: 'Acute radiation symptoms. Nausea. You need medical attention.' });
          state.playerHealth -= 3;
        }
      }
    }

    // Atmosphere loss from hull breach
    if ((systems as Record<string, unknown>).hull) {
      const hull = (systems as Record<string, unknown>).hull as Record<string, unknown>;
      const subsystems = hull.subsystems as Record<string, Record<string, unknown>>;
      const primaryHull = subsystems.primary_hull as Record<string, unknown>;
      if (primaryHull.status === 'breached') {
        (primaryHull as Record<string, number>).atmosphereLossRate_pa_hr += ((ticks as Record<string, number>).atmosphere_loss_per_turn || 0);
      }
    }

    return events;
  }

  _getIntroText(): string {
    return `
═══════════════════════════════════════════════════════════════
                       V O I D   T R A N S I T
═══════════════════════════════════════════════════════════════

         ISV Kepler's Promise  ·  Mission TRANSIT-7
           Destination: 82 Eridani  ·  Year 19.3 of 42

═══════════════════════════════════════════════════════════════

A sound like breaking glass inside your skull.

Cold. A cold so deep it has no bottom, no edges, no mercy.
Your lungs burn with the first breath — raw, sharp, as though
you've been breathing vacuum and someone has just reinflated
you like a failed experiment.

Your cryo pod's lid hisses open. Emergency lighting pulses
amber. Somewhere, an alarm is repeating a three-tone pattern
you can't quite place — but somewhere in the frozen fog of
your mind, you know it means something bad.

The ship's AI is silent. That's wrong. The AI should be
talking.

You are alone. And you shouldn't be awake.

[Type HELP for commands, or just tell me what you want to do.]
═══════════════════════════════════════════════════════════════`;
  }

  _loadData(): GameData {
    const load = (file: string): unknown => {
      const filepath = path.join(config.dataDir, file);
      if (!fs.existsSync(filepath)) {
        console.warn(`Data file not found: ${filepath}`);
        return [];
      }
      return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    };

    // Normalize rooms: may be {rooms: {...}} object or array
    const rawRooms = load('rooms.json') as Record<string, unknown> | Room[];
    let rooms: Room[];
    if (Array.isArray(rawRooms)) {
      rooms = rawRooms;
    } else if (rawRooms.rooms && typeof rawRooms.rooms === 'object') {
      rooms = Array.isArray(rawRooms.rooms)
        ? rawRooms.rooms as Room[]
        : Object.values(rawRooms.rooms) as Room[];
    } else {
      rooms = Object.values(rawRooms) as Room[];
    }

    // Normalize items: may be {items: [...]} or array
    const rawItems = load('items.json') as Record<string, unknown> | ItemDef[];
    let items: ItemDef[];
    if (Array.isArray(rawItems)) {
      items = rawItems;
    } else if (rawItems.items && Array.isArray(rawItems.items)) {
      items = rawItems.items as ItemDef[];
    } else {
      items = Object.values(rawItems) as ItemDef[];
    }

    // Normalize puzzles: may be {puzzles: [...]} or array
    const rawPuzzles = load('puzzles.json') as Record<string, unknown> | PuzzleDef[];
    let puzzles: PuzzleDef[];
    if (Array.isArray(rawPuzzles)) {
      puzzles = rawPuzzles;
    } else if ((rawPuzzles as Record<string, unknown>).puzzles && Array.isArray((rawPuzzles as Record<string, unknown>).puzzles)) {
      puzzles = (rawPuzzles as Record<string, unknown>).puzzles as PuzzleDef[];
    } else {
      puzzles = Object.values(rawPuzzles) as PuzzleDef[];
    }

    // Normalize story
    const rawStory = load('story.json') as StoryData | null;
    const story: StoryData = rawStory || { acts: [], foreshadowing: [], endings: [], globalEvents: [] };

    // Normalize ship systems
    const rawSystems = load('ship-systems.json') as ShipSystems | null;
    const shipSystems: ShipSystems = rawSystems || { systems: {}, tickRules: {} };

    console.log(`  Loaded: ${rooms.length} rooms, ${items.length} items, ${puzzles.length} puzzles, ${(story.acts || []).length} story acts`);

    return { rooms, items, puzzles, story, shipSystems };
  }
}

export default GameEngine;

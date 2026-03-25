import { Room, ItemDef, PuzzleDef, GameState, Intent, ActionResult, StoryData, ShipSystems, GameData, StateTransitionData, RulesData } from '../types';
import NavigationManager from './NavigationManager';
import InventoryManager from './InventoryManager';
import PuzzleEngine from './PuzzleEngine';
import StoryManager from './StoryManager';
import CommandProcessor from './CommandProcessor';
import StateTransitionEngine from './StateTransitionEngine';
import RuleEngine from './RuleEngine';
import SaveManager from './SaveManager';

import * as fs from 'fs';
import * as path from 'path';
import config from '../config';
import { decodeObject } from '../encoding';

/** Human-readable description of an intent for disambiguation prompts */
function describeIntent(intent: Intent): string {
  const parts = [intent.action];
  if (intent.target) parts.push(intent.target);
  if (intent.instrument) parts.push('with', intent.instrument);
  return parts.join(' ');
}

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
  messages: {
    systemEvents: Record<string, string>;
    intro: string;
  };

  constructor(injectedData?: {
    gameData: GameData;
    messages: { systemEvents: Record<string, string>; intro: string };
    saveManager?: SaveManager;
  }) {
    if (injectedData) {
      this.data = injectedData.gameData;
      this.messages = injectedData.messages;
      this.saveManager = injectedData.saveManager || new SaveManager();
    } else {
      this.data = this._loadData();
      this.messages = this._loadMessages();
      this.saveManager = new SaveManager();
    }
    this.nav = new NavigationManager(this.data.rooms);
    this.inv = new InventoryManager(this.data.items);
    this.puzzle = new PuzzleEngine(this.data.puzzles);
    this.story = new StoryManager(this.data.story);
    const stateEngine = this.data.stateTransitions
      ? new StateTransitionEngine(this.data.stateTransitions, this.nav)
      : undefined;
    const ruleEngine = this.data.rules
      ? new RuleEngine(this.data.rules, this.nav)
      : undefined;
    this.cmd = new CommandProcessor(this.nav, this.inv, this.puzzle, this.story, stateEngine, ruleEngine);
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

    // Disambiguate: if the parser produced alternatives, evaluate each against
    // game state and pick the one that works. If multiple valid interpretations
    // exist, the best one wins but the response may note the ambiguity.
    if (intent.alternatives?.length) {
      intent = this.cmd.disambiguate(intent, state);

      // If there are still multiple valid alternatives after disambiguation,
      // and they represent meaningfully different actions, ask the player
      if (intent.alternatives?.length && intent.confidence && intent.confidence < 0.9) {
        const alt = intent.alternatives[0];
        if (alt.action !== intent.action) {
          return {
            type: 'disambiguate',
            message: `Did you mean "${describeIntent(intent)}" or "${describeIntent(alt)}"?`,
            candidates: [intent, alt],
          };
        }
      }
    }

    // Process the command
    const result = this.cmd.process(intent, state);

    // Scenery questions are free — no turn cost, no side effects
    if (result.type === 'examine_scenery') {
      return {
        ...result,
        storyContext: this.story.getStoryContext(state),
        turnCount: state.turnCount,
        currentRoom: state.currentRoom
      };
    }

    state.turnCount++;

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
      currentRoom: 'cryo_pod',
      previousRoom: null,
      inventory: [],
      equipped: [],
      itemLocations,
      itemHidden,
      itemProperties,
      flags: { posture: 'lying' },
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
      globalEvents: [],
      worldLore: {}
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
          events.push({ type: 'warning', system: 'life_support', message: this.messages.systemEvents.co2_warning });
          state.flags.co2_warning_given = true;
        }
        if ((scrubbers.co2_ppm as number) > 40000 && !state.flags.co2_critical_given) {
          events.push({ type: 'critical', system: 'life_support', message: this.messages.systemEvents.co2_critical });
          state.flags.co2_critical_given = true;
          state.playerHealth -= 5;
        }
        if ((scrubbers.co2_ppm as number) > 50000) {
          events.push({ type: 'fatal', system: 'life_support', message: this.messages.systemEvents.co2_fatal });
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
          events.push({ type: 'warning', system: 'power', message: this.messages.systemEvents.battery_warning });
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
          events.push({ type: 'warning', system: 'reactor', message: `${this.messages.systemEvents.radiation_warning_prefix}${state.radiationExposure.toFixed(1)}${this.messages.systemEvents.radiation_warning_suffix}` });
          state.flags.radiation_warning_given = true;
        }
        if (state.radiationExposure > 50) {
          events.push({ type: 'critical', system: 'reactor', message: this.messages.systemEvents.radiation_critical });
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

    // Cold exposure — unprotected in cold rooms
    const coldRooms = new Set(['cryo_pod', 'cryo_bay', 'corridor_d', 'engine_room', 'fuel_storage', 'airlock_inner']);
    const freezingRooms = new Set(['cryo_pod', 'cryo_bay']);
    const hasJumpsuit = (state.equipped || []).includes('jumpsuit');
    const isDry = !!state.flags.dried_off;

    if (coldRooms.has(state.currentRoom) && !hasJumpsuit) {
      const isFreezing = freezingRooms.has(state.currentRoom);
      const exposure = (state.flags.cold_exposure as unknown as number) || 0;
      const newExposure = exposure + (isFreezing ? 2 : 1);
      (state.flags as Record<string, unknown>).cold_exposure = newExposure;

      if (newExposure >= 3 && !state.flags.cold_warning_given) {
        events.push({ type: 'warning', system: 'exposure',
          message: isDry
            ? 'You\'re shivering. The ship is cold and you\'re not dressed for it.'
            : 'You\'re shivering violently. The cryoprotectant on your skin is evaporating, pulling heat from your body faster than you can generate it.'
        });
        state.flags.cold_warning_given = true;
      }
      if (newExposure >= 6 && !state.flags.cold_critical_given) {
        events.push({ type: 'critical', system: 'exposure',
          message: 'Your fingers are going numb. Your thinking is getting sluggish. You need to get dressed or get somewhere warm.'
        });
        state.flags.cold_critical_given = true;
      }
      if (newExposure >= 8) {
        state.playerHealth -= (isFreezing ? 3 : 1);
        if (newExposure % 3 === 0) {
          events.push({ type: 'critical', system: 'exposure',
            message: 'The cold is killing you. Slowly, but it is killing you.'
          });
        }
      }
    } else if (hasJumpsuit) {
      // Recovery when dressed
      if ((state.flags.cold_exposure as unknown as number) > 0) {
        (state.flags as Record<string, unknown>).cold_exposure = Math.max(0, (state.flags.cold_exposure as unknown as number) - 2);
      }
    }

    // Hunger/thirst — gradual onset after several turns
    const hungerOnset = 25;
    const thirstOnset = 15;

    if (state.turnCount >= thirstOnset && !state.flags.thirst_warning_given) {
      events.push({ type: 'warning', system: 'survival',
        message: 'Your mouth is dry. The cryo revival process leaves you dehydrated — you should find water.'
      });
      state.flags.thirst_warning_given = true;
    }
    if (state.turnCount >= hungerOnset && !state.flags.hunger_warning_given) {
      events.push({ type: 'warning', system: 'survival',
        message: 'Your stomach clenches. Nineteen years without food — your body is remembering what it needs.'
      });
      state.flags.hunger_warning_given = true;
    }
    if (state.turnCount >= thirstOnset + 20 && !state.flags.thirst_critical_given) {
      events.push({ type: 'critical', system: 'survival',
        message: 'Your head is pounding. Dehydration is setting in. You need to find the mess hall or medical bay.'
      });
      state.flags.thirst_critical_given = true;
    }
    if (state.turnCount >= hungerOnset + 30 && !state.flags.hunger_critical_given) {
      events.push({ type: 'critical', system: 'survival',
        message: 'The hunger is a constant ache now. Your hands are unsteady. You need food.'
      });
      state.flags.hunger_critical_given = true;
    }

    return events;
  }

  _getIntroText(): string {
    return this.messages.intro;
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

    // Decode base64 immediately on load, before any normalization
    const rawRooms = decodeObject(load('rooms.json')) as Record<string, unknown> | Room[];
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

    const rawItems = decodeObject(load('items.json')) as Record<string, unknown> | ItemDef[];
    let items: ItemDef[];
    if (Array.isArray(rawItems)) {
      items = rawItems;
    } else if (rawItems.items && Array.isArray(rawItems.items)) {
      items = rawItems.items as ItemDef[];
    } else {
      items = Object.values(rawItems) as ItemDef[];
    }

    const rawPuzzles = decodeObject(load('puzzles.json')) as Record<string, unknown> | PuzzleDef[];
    let puzzles: PuzzleDef[];
    if (Array.isArray(rawPuzzles)) {
      puzzles = rawPuzzles;
    } else if ((rawPuzzles as Record<string, unknown>).puzzles && Array.isArray((rawPuzzles as Record<string, unknown>).puzzles)) {
      puzzles = (rawPuzzles as Record<string, unknown>).puzzles as PuzzleDef[];
    } else {
      puzzles = Object.values(rawPuzzles) as PuzzleDef[];
    }

    // Load scenery data and merge into rooms
    const rawScenery = decodeObject(load('scenery.json')) as Record<string, unknown> | null;
    if (rawScenery) {
      const examineTargets = (rawScenery.examineTargets || {}) as Record<string, Record<string, string>>;
      const cantTake = (rawScenery.cantTake || {}) as Record<string, Record<string, string>>;
      for (const room of rooms) {
        if (examineTargets[room.id]) {
          room.examineTargets = { ...(room.examineTargets || {}), ...examineTargets[room.id] };
        }
        if (cantTake[room.id]) {
          room.cantTake = { ...(room.cantTake || {}), ...cantTake[room.id] };
        }
      }
    }

    const rawStory = decodeObject(load('story.json')) as StoryData | null;
    const story: StoryData = rawStory || { acts: [], foreshadowing: [], endings: [], globalEvents: [] };

    const rawSystems = decodeObject(load('ship-systems.json')) as ShipSystems | null;
    const shipSystems: ShipSystems = rawSystems || { systems: {}, tickRules: {} };

    const rawTransitions = decodeObject(load('state-transitions.json')) as StateTransitionData | null;
    const stateTransitions = rawTransitions || undefined;

    const rawRules = decodeObject(load('rules.json')) as RulesData | null;
    const rules = rawRules || undefined;

    return { rooms, items, puzzles, story, shipSystems, stateTransitions, rules };
  }

  _loadMessages(): { systemEvents: Record<string, string>; intro: string } {
    const filepath = path.join(config.dataDir, 'messages.json');
    if (!fs.existsSync(filepath)) {
      return { systemEvents: {}, intro: '' };
    }
    return decodeObject(JSON.parse(fs.readFileSync(filepath, 'utf-8'))) as { systemEvents: Record<string, string>; intro: string };
  }
}

export default GameEngine;

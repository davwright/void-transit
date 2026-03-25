import { Room, ItemDef, PuzzleDef, GameState, Intent, ActionResult, StoryData, ShipSystems, GameData, GameBootstrap, RulesData } from '../types';
import NavigationManager from './NavigationManager';
import InventoryManager from './InventoryManager';
import PuzzleEngine from './PuzzleEngine';
import StoryManager from './StoryManager';
import CommandProcessor from './CommandProcessor';
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
    navigation?: { noExit: Record<string, string> };
    posture?: Record<string, string>;
    help?: string;
    cold?: { dry: Array<{ at: number; type: string; msg: string }>; wet: Array<{ at: number; type: string; msg: string }>; freezingRate?: number; coldRate?: number; damageThreshold?: number; freezingDamage?: number; coldDamage?: number; recoveryRate?: number };
    survival?: { thirstWarning: string; hungerWarning: string; thirstCritical: string; hungerCritical: string; thirstOnsetTurn: number; hungerOnsetTurn: number; thirstCriticalDelay: number; hungerCriticalDelay: number };
  };

  constructor(injectedData?: {
    gameData: GameData;
    messages: GameEngine['messages'];
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
    this.nav = new NavigationManager(this.data.rooms, this.messages.navigation?.noExit);
    this.inv = new InventoryManager(this.data.items, this.data.rooms);
    this.puzzle = new PuzzleEngine(this.data.puzzles);
    this.story = new StoryManager(this.data.story);
    const ruleEngine = this.data.rules
      ? new RuleEngine(this.data.rules, this.nav)
      : undefined;
    this.cmd = new CommandProcessor(this.nav, this.inv, this.puzzle, this.story, ruleEngine, { help: this.messages.help, posture: this.messages.posture });
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

    // Check ending conditions — health death takes priority
    let ending = this.story.checkEnding(state);
    if (!ending && state.playerHealth <= 0) {
      // Score based on observations and state changes
      let score = 0;
      const achievements: string[] = [];

      // Exploration (1 point per room)
      score += state.visitedRooms.size;

      // Actions and state changes (from flags)
      const flagScores: Record<string, [number, string]> = {
        leads_removed: [5, 'Freed yourself from the monitoring leads'],
        compartment_opened: [5, 'Found the storage compartment'],
        dried_off: [5, 'Dried off the cryoprotectant'],
        read_datapad_briefing: [10, 'Read the mission briefing'],
      };
      for (const [flag, [pts, desc]] of Object.entries(flagScores)) {
        if (state.flags[flag]) { score += pts; achievements.push(desc); }
      }

      // Equipment
      if ((state.equipped || []).includes('jumpsuit')) { score += 10; achievements.push('Got dressed'); }

      // Items examined (conversation history)
      const examines = new Set(state.conversationHistory.filter(h => h.resultType === 'examine').map(h => h.intent.target)).size;
      score += examines * 2;

      // Puzzles (50 points each)
      const puzzlesSolved = Object.values(state.puzzleStates).filter(s => s === 'solved').length;
      score += puzzlesSolved * 50;
      if (puzzlesSolved > 0) achievements.push('Solved ' + puzzlesSolved + ' problem' + (puzzlesSolved > 1 ? 's' : ''));

      // Items collected
      score += state.inventory.length * 3;

      const scoreText = '\n\nScore: ' + score
        + (achievements.length > 0 ? '\n  ' + achievements.join('\n  ') : '')
        + '\n  Explored ' + state.visitedRooms.size + ' location' + (state.visitedRooms.size !== 1 ? 's' : '')
        + '\n  Examined ' + examines + ' thing' + (examines !== 1 ? 's' : '')
        + '\n  ' + state.turnCount + ' turns';

      ending = { id: 'ending_death', conditions: {}, text: scoreText, type: 'bad' as const };
    }

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

    const boot = this.data.bootstrap;

    return {
      currentRoom: boot?.startRoom || 'cryo_pod',
      previousRoom: null,
      inventory: [],
      equipped: [],
      itemLocations,
      itemHidden,
      itemProperties,
      flags: boot?.initialFlags ? { ...boot.initialFlags } : { posture: 'lying' },
      visitedRooms: new Set<string>(),
      puzzleStates: {},
      puzzleProgress: {},
      puzzleAttempts: {},
      shipSystems,
      currentAct: boot?.initialAct || 'act1_awakening',
      storyBeatsTriggered: [],
      turnCount: 0,
      playerHealth: boot?.initialHealth ?? 65,
      radiationExposure: boot?.initialRadiation ?? 0,
      conversationHistory: [],
      globalEvents: [],
      worldLore: {}
    };
  }

  _tickSystems(state: GameState): SystemEvent[] {
    const events: SystemEvent[] = [];

    // Generic tick evaluator — processes all tick definitions from ship-systems.json
    const tickDefs = (this.data.shipSystems as unknown as Record<string, unknown>).ticks as Array<Record<string, unknown>> || [];

    for (const tick of tickDefs) {
      // Check room condition
      const cond = tick.condition as Record<string, unknown> | undefined;
      if (cond?.room && cond.room !== state.currentRoom) continue;

      // Check path condition (equals/notEquals/below)
      if (cond?.path) {
        const condVal = this._getSystemValue(state, cond.path as string);
        if (cond.equals !== undefined && condVal !== cond.equals) continue;
        if (cond.notEquals !== undefined && condVal === cond.notEquals) continue;
        if (cond.below !== undefined && (condVal as number) >= (cond.below as number)) continue;
      }

      // Calculate delta with optional scale
      let delta = tick.delta as number;
      if (tick.scale) {
        const s = tick.scale as Record<string, unknown>;
        const scaleVal = this._getSystemValue(state, s.path as string) as number;
        if (s.formula === '1 - value') delta *= (1 - scaleVal);
      }

      // Apply delta to target
      const targetPath = tick.path as string | undefined;
      const targetField = tick.target as string | undefined;

      if (targetField === 'radiationExposure') {
        state.radiationExposure += delta;
      } else if (targetPath) {
        const current = this._getSystemValue(state, targetPath) as number;
        let newVal = current + delta;
        if (tick.min !== undefined) newVal = Math.max(tick.min as number, newVal);
        if (tick.max !== undefined) newVal = Math.min(tick.max as number, newVal);
        this._setSystemValue(state, targetPath, newVal);
      }

      // Check thresholds
      const thresholds = tick.thresholds as Array<Record<string, unknown>> || [];
      const currentVal = targetField === 'radiationExposure'
        ? state.radiationExposure
        : (targetPath ? this._getSystemValue(state, targetPath) as number : 0);

      for (const t of thresholds) {
        const triggered = t.above !== undefined
          ? currentVal > (t.above as number)
          : t.below !== undefined
            ? currentVal < (t.below as number)
            : false;

        if (!triggered) continue;
        if (t.flag && state.flags[t.flag as string]) continue; // Already fired

        const msg = this.messages.systemEvents[t.messageKey as string] || '';
        events.push({ type: t.event as string, system: tick.id as string, message: msg });

        if (t.flag) state.flags[t.flag as string] = true;
        if (t.damage) state.playerHealth -= t.damage as number;
        if (t.kill) state.playerHealth = 0;
      }
    }

    // Cold exposure — unprotected in cold/freezing rooms
    const currentRoom = this.nav.getRoom(state.currentRoom);
    const roomTemp = currentRoom?.temperature || 'nominal';
    const isCold = roomTemp === 'cold' || roomTemp === 'freezing' || roomTemp === 'vacuum';
    const isFreezing = roomTemp === 'freezing' || roomTemp === 'vacuum';
    const hasJumpsuit = (state.equipped || []).includes('jumpsuit');
    const isDry = !!state.flags.dried_off;

    const coldCfg = this.messages.cold;
    const wetInSuit = hasJumpsuit && !isDry && isCold;
    if (isCold && (!hasJumpsuit || wetInSuit)) {
      const exposure = (state.flags.cold_exposure as unknown as number) || 0;
      // Wet in suit: slow accumulation (cryoprotectant evaporating inside suit). Naked: full rate.
      const rate = wetInSuit ? 0.5 : (isFreezing ? (coldCfg?.freezingRate ?? 1) : (coldCfg?.coldRate ?? 1));
      const newExposure = exposure + rate;
      (state.flags as Record<string, unknown>).cold_exposure = newExposure;

      // Escalating cold warnings from messages.json
      const coldMsgData = this.messages.cold;
      const coldMessages = coldMsgData
        ? (isDry ? coldMsgData.dry : coldMsgData.wet)
        : [{ at: 2, type: 'warning', msg: 'You are very cold.' }];

      // Show the highest applicable message
      for (let i = coldMessages.length - 1; i >= 0; i--) {
        if (newExposure >= coldMessages[i].at) {
          events.push({ type: coldMessages[i].type, system: 'exposure', message: coldMessages[i].msg });
          break;
        }
      }

      // Health damage — escalates with exposure
      const dmgThreshold = coldCfg?.damageThreshold ?? 12;
      if (newExposure >= dmgThreshold) {
        const baseDmg = isFreezing ? (coldCfg?.freezingDamage ?? 3) : (coldCfg?.coldDamage ?? 1);
        const escalation = Math.floor((newExposure - dmgThreshold) / 3) + 1;
        state.playerHealth = Math.max(0, state.playerHealth - baseDmg * escalation);
      }
    } else if (hasJumpsuit) {
      // Recovery when dressed
      if ((state.flags.cold_exposure as unknown as number) > 0) {
        (state.flags as Record<string, unknown>).cold_exposure = Math.max(0, (state.flags.cold_exposure as unknown as number) - (coldCfg?.recoveryRate ?? 2));
      }
    }

    // Hunger/thirst — gradual onset after several turns (config from messages.json)
    const surv = this.messages.survival;
    const hungerOnset = surv?.hungerOnsetTurn ?? 25;
    const thirstOnset = surv?.thirstOnsetTurn ?? 15;

    if (state.turnCount >= thirstOnset && !state.flags.thirst_warning_given) {
      events.push({ type: 'warning', system: 'survival', message: surv?.thirstWarning || 'You are thirsty.' });
      state.flags.thirst_warning_given = true;
    }
    if (state.turnCount >= hungerOnset && !state.flags.hunger_warning_given) {
      events.push({ type: 'warning', system: 'survival', message: surv?.hungerWarning || 'You are hungry.' });
      state.flags.hunger_warning_given = true;
    }
    if (state.turnCount >= thirstOnset + (surv?.thirstCriticalDelay ?? 20) && !state.flags.thirst_critical_given) {
      events.push({ type: 'critical', system: 'survival', message: surv?.thirstCritical || 'Severe dehydration.' });
      state.flags.thirst_critical_given = true;
    }
    if (state.turnCount >= hungerOnset + (surv?.hungerCriticalDelay ?? 30) && !state.flags.hunger_critical_given) {
      events.push({ type: 'critical', system: 'survival', message: surv?.hungerCritical || 'Severe hunger.' });
      state.flags.hunger_critical_given = true;
    }

    // Death check — contextual message based on cause
    if (state.playerHealth <= 0) {
      const coldExp = (state.flags.cold_exposure as unknown as number) || 0;
      const hasJumpsuit = (state.equipped || []).includes('jumpsuit');
      let deathMsg: string;

      if (coldExp >= 10 && !hasJumpsuit) {
        deathMsg = 'The shivering stopped a while ago. That was the last warning your body could give. The cold takes you quietly — a narrowing, a dimming, and then nothing at all.';
      } else if (state.radiationExposure > 50) {
        deathMsg = 'The nausea hasn\'t stopped for hours. Your vision swims. Your body has absorbed more than it can repair. The reactor\'s invisible fire has done its work.';
      } else if ((this._getSystemValue(state, 'life_support.subsystems.co2_scrubbers.co2_ppm') as number) > 50000) {
        deathMsg = 'You can\'t think. Can\'t breathe. The air itself has turned against you — too much of what you exhale, not enough of what you need. You sit down. You don\'t get up.';
      } else {
        deathMsg = 'Your body has given everything it had. The ship hums on around you, indifferent. 2,847 colonists sleep in their pods, unaware that the one person who could help them is gone.';
      }

      events.push({ type: 'fatal', system: 'death', message: deathMsg });
    }

    return events;
  }

  _getSystemValue(state: GameState, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = (state.shipSystems as unknown as Record<string, unknown>).systems || state.shipSystems;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return current;
  }

  _setSystemValue(state: GameState, path: string, value: unknown): void {
    const parts = path.split('.');
    let current: unknown = (state.shipSystems as unknown as Record<string, unknown>).systems || state.shipSystems;
    for (let i = 0; i < parts.length - 1; i++) {
      if (current && typeof current === 'object' && parts[i] in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[parts[i]];
      } else {
        return;
      }
    }
    if (current && typeof current === 'object') {
      (current as Record<string, unknown>)[parts[parts.length - 1]] = value;
    }
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
    let bootstrap: GameBootstrap | undefined;
    if (Array.isArray(rawRooms)) {
      rooms = rawRooms;
    } else if (rawRooms.rooms && typeof rawRooms.rooms === 'object') {
      rooms = Array.isArray(rawRooms.rooms)
        ? rawRooms.rooms as Room[]
        : Object.values(rawRooms.rooms) as Room[];
      // Extract bootstrap config from meta
      const meta = rawRooms.meta as Record<string, unknown> | undefined;
      if (meta?.bootstrap) {
        const b = meta.bootstrap as Record<string, unknown>;
        bootstrap = {
          startRoom: (meta.start_room as string) || 'cryo_pod',
          initialFlags: (b.initialFlags as Record<string, boolean | string>) || {},
          initialHealth: (b.initialHealth as number) || 100,
          initialAct: (b.initialAct as string) || 'act1_awakening',
          initialRadiation: (b.initialRadiation as number) || 0,
        };
      }
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

    const rawRules = decodeObject(load('rules.json')) as RulesData | null;
    const rules = rawRules || undefined;

    return { rooms, items, puzzles, story, shipSystems, rules, bootstrap };
  }

  _loadMessages(): GameEngine['messages'] {
    const filepath = path.join(config.dataDir, 'messages.json');
    if (!fs.existsSync(filepath)) {
      return { systemEvents: {}, intro: '' };
    }
    return decodeObject(JSON.parse(fs.readFileSync(filepath, 'utf-8'))) as { systemEvents: Record<string, string>; intro: string };
  }
}

export default GameEngine;

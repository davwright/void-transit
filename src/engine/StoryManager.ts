import { StoryData, StoryAct, StoryBeat, Foreshadowing, StoryEnding, GlobalEvent, GameState, StoryContext } from '../types';

interface ActTransitionResult {
  transitioned: boolean;
  fromAct: StoryAct;
  toAct: StoryAct;
  message: string | null;
}

interface ForeshadowingHint {
  type: string;
  id: string;
  plantedIn: string;
  plantText: string;
  payoffIn: string;
  payoffText: string;
}

class StoryManager {
  acts: StoryAct[];
  foreshadowing: Foreshadowing[];
  endings: StoryEnding[];
  globalEvents: GlobalEvent[];

  constructor(storyData: StoryData) {
    this.acts = storyData.acts || [];
    this.foreshadowing = storyData.foreshadowing || [];
    this.endings = storyData.endings || [];
    this.globalEvents = storyData.globalEvents || [];
  }

  getCurrentAct(gameState: GameState): StoryAct | undefined {
    return this.acts.find(a => a.id === gameState.currentAct) || this.acts[0];
  }

  checkActTransition(gameState: GameState): ActTransitionResult | null {
    const currentAct = this.getCurrentAct(gameState);
    if (!currentAct) return null;

    const currentIdx = this.acts.indexOf(currentAct);
    if (currentIdx < 0 || currentIdx >= this.acts.length - 1) return null;

    const nextAct = this.acts[currentIdx + 1];
    if (nextAct.triggers && nextAct.triggers.start) {
      if (this._checkTrigger(nextAct.triggers.start, gameState, nextAct.id)) {
        gameState.currentAct = nextAct.id;
        gameState.actStartTurn = gameState.turnCount;
        return {
          transitioned: true,
          fromAct: currentAct,
          toAct: nextAct,
          message: nextAct.transitionText || null
        };
      }
    }

    return null;
  }

  checkStoryBeats(gameState: GameState): StoryBeat[] {
    const currentAct = this.getCurrentAct(gameState);
    if (!currentAct) return [];

    // Beats from the current act and every earlier act remain live: a player who examines
    // the navigation display for the first time in Act 4 still deserves the Act 3 beat.
    const currentIdx = this.acts.indexOf(currentAct);
    const liveBeats = this.acts.slice(0, currentIdx + 1).flatMap(a => a.beats || []);

    const triggered: StoryBeat[] = [];
    for (const beat of liveBeats) {
      if (gameState.storyBeatsTriggered.includes(beat.id)) continue;

      if (beat.location && beat.location !== 'any_terminal' && gameState.currentRoom !== beat.location) continue;
      if (this._checkTrigger(beat.trigger, gameState, beat.id)) {
        gameState.storyBeatsTriggered.push(beat.id);
        triggered.push(beat);

        if (beat.effects) {
          this._applyEffects(beat.effects, gameState);
        }
      }
    }

    return triggered;
  }

  checkForeshadowing(roomId: string, gameState: GameState): ForeshadowingHint[] {
    const hints: ForeshadowingHint[] = [];
    for (const fs of this.foreshadowing) {
      if (fs.plantedIn === roomId && !gameState.flags[`foreshadow_${fs.id}_planted`]) {
        gameState.flags[`foreshadow_${fs.id}_planted`] = true;
        hints.push({ type: 'plant', ...fs });
      }
      if (fs.payoffIn === roomId && gameState.flags[`foreshadow_${fs.id}_planted`] && !gameState.flags[`foreshadow_${fs.id}_paid`]) {
        gameState.flags[`foreshadow_${fs.id}_paid`] = true;
        hints.push({ type: 'payoff', ...fs });
      }
    }
    return hints;
  }

  checkGlobalEvents(gameState: GameState): GlobalEvent[] {
    const triggered: GlobalEvent[] = [];
    for (const event of this.globalEvents) {
      const recurring = !!(event.trigger.recurring || event.trigger.type === 'random');
      if (!recurring && gameState.globalEvents.includes(event.id)) continue;

      if (this._checkTrigger(event.trigger, gameState, event.id)) {
        if (!gameState.globalEvents.includes(event.id)) gameState.globalEvents.push(event.id);
        gameState.eventLastFired = gameState.eventLastFired || {};
        gameState.eventLastFired[event.id] = gameState.turnCount;
        if (event.effect && (event.effect.flags || event.effect.damage || event.effect.heal || event.effect.revealItem)) {
          this._applyEffects(event.effect, gameState);
        }
        const text = Array.isArray(event.text)
          ? event.text[Math.floor(this.random() * event.text.length)]
          : event.text;
        triggered.push({ ...event, text });
      }
    }
    return triggered;
  }

  checkEnding(gameState: GameState): StoryEnding | null {
    for (const ending of this.endings) {
      if (this._checkTrigger(ending.conditions, gameState)) {
        return ending;
      }
    }
    return null;
  }

  getStoryContext(gameState: GameState): StoryContext {
    const act = this.getCurrentAct(gameState);
    const solvedPuzzles = Object.entries(gameState.puzzleStates)
      .filter(([, s]) => s === 'solved').map(([id]) => id);
    const activePuzzles = Object.entries(gameState.puzzleStates)
      .filter(([, s]) => s === 'active' || s === 'in_progress').map(([id]) => id);

    return {
      actId: act ? act.id : 'unknown',
      actName: act ? act.name : 'Unknown',
      actTone: act ? act.tone : 'neutral',
      solvedPuzzles,
      activePuzzles,
      turnCount: gameState.turnCount,
      playerHealth: gameState.playerHealth,
      knownClues: Object.keys(gameState.flags).filter(f => f.startsWith('clue_')),
      tension: this._calculateTension(gameState)
    };
  }

  _calculateTension(gameState: GameState): number {
    let tension = 0;
    const co2 = this._getSystemValue('life_support.subsystems.co2_scrubbers.co2_ppm', gameState);
    if (co2 > 15000) tension += 2;
    if (co2 > 30000) tension += 3;

    const radiation = gameState.radiationExposure || 0;
    if (radiation > 20) tension += 2;
    if (radiation > 50) tension += 3;

    const health = gameState.playerHealth || 100;
    if (health < 70) tension += 1;
    if (health < 40) tension += 3;

    const battery = this._getSystemValue('power.subsystems.battery_backup.charge', gameState);
    if (battery < 0.2) tension += 2;

    const activePuzzles = Object.values(gameState.puzzleStates).filter(s => s === 'active').length;
    tension += activePuzzles;

    return Math.min(10, tension);
  }

  _getSystemValue(path: string, gameState: GameState): number {
    const parts = path.split('.');
    let current: unknown = gameState.shipSystems;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return 0;
      }
    }
    return typeof current === 'number' ? current : 0;
  }

  /** Minutes of ship time that pass per player turn (used for timer triggers). */
  static readonly MINUTES_PER_TURN = 5;

  /**
   * Evaluate a trigger against game state.
   *
   * Two schemas are supported:
   *  - the compact engine schema (`room`, `flag_*`, `puzzle_*`, `has_*`, `visited_*`,
   *    `turnCount_gte`, `health_below`, `and`, `or`)
   *  - the authored story schema from story.json, dispatched on `type`
   *    (room_visit, player_enters, location, first_room_change, player_action, puzzle_complete,
   *    act_start, state_check, state_change, timer, random, player_choice, game_start)
   *  Ending conditions may also use `choice`, `cause`, and bare flag names.
   * Unknown keys fail closed so authoring mistakes never silently fire.
   */
  _checkTrigger(trigger: Record<string, unknown>, gameState: GameState, ownerId?: string): boolean {
    if (!trigger) return false;

    const type = trigger.type as string | undefined;
    if (type && type !== 'game_start' && StoryManager.TYPED_TRIGGERS.has(type)) {
      return this._checkTypedTrigger(type, trigger, gameState, ownerId);
    }

    for (const [key, value] of Object.entries(trigger)) {
      if (key === 'and') {
        if (!(value as Record<string, unknown>[]).every(t => this._checkTrigger(t, gameState, ownerId))) return false;
      } else if (key === 'or') {
        if (!(value as Record<string, unknown>[]).some(t => this._checkTrigger(t, gameState, ownerId))) return false;
      } else if (key === 'type' && value === 'game_start') {
        if (gameState.turnCount > 1) return false;
      } else if (key === 'condition' && (value === 'always' || value === undefined)) {
        continue;
      } else if (key === 'room' || key === 'location') {
        if (gameState.currentRoom !== value) return false;
      } else if (key === 'turnCount_gte') {
        if (gameState.turnCount < (value as number)) return false;
      } else if (key.startsWith('flag_')) {
        if (gameState.flags[key.substring(5)] !== value) return false;
      } else if (key.startsWith('puzzle_')) {
        if (gameState.puzzleStates[key.substring(7)] !== value) return false;
      } else if (key.startsWith('has_')) {
        if (gameState.inventory.includes(key.substring(4)) !== value) return false;
      } else if (key.startsWith('visited_')) {
        if (gameState.visitedRooms.has(key.substring(8)) !== value) return false;
      } else if (key === 'health_below') {
        if ((gameState.playerHealth || 100) >= (value as number)) return false;
      } else if (key === 'choice') {
        if (gameState.flags.final_choice !== value) return false;
      } else if (key === 'cause') {
        if (gameState.flags.death_cause !== value) return false;
      } else if (key === 'chen_woken' || key === 'signal_sent') {
        if ((gameState.flags[key] === true) !== (value === true)) return false;
      } else if (key !== 'type') {
        // Unknown trigger key — fail safe, don't silently match
        return false;
      }
    }
    return true;
  }

  static readonly TYPED_TRIGGERS = new Set([
    'room_visit', 'player_enters', 'location', 'first_room_change', 'player_action',
    'puzzle_complete', 'act_start', 'state_check', 'state_change', 'timer', 'random', 'player_choice'
  ]);

  _checkTypedTrigger(type: string, t: Record<string, unknown>, gs: GameState, ownerId?: string): boolean {
    const room = (t.room ?? t.location) as string | undefined;
    switch (type) {
      case 'room_visit':
      case 'player_enters':
      case 'location': {
        if (room && gs.currentRoom !== room) return false;
        if (type !== 'location' && gs.lastIntent && !StoryManager.MOVE_ACTIONS.has(gs.lastIntent.action)) return false;
        return this._checkConditionExpr(t.condition, gs);
      }
      case 'first_room_change':
        return gs.previousRoom === t.from && gs.currentRoom !== t.from
          && !!gs.lastIntent && StoryManager.MOVE_ACTIONS.has(gs.lastIntent.action);
      case 'player_action': {
        if (room && room !== 'any_terminal' && gs.currentRoom !== room) return false;
        return this._intentMatches(t.action as string, t.target as string | undefined, t.targetAliases as string[] | undefined, gs);
      }
      case 'puzzle_complete':
        return gs.puzzleStates[t.puzzleId as string] === 'solved';
      case 'act_start':
        return gs.currentAct === t.actId;
      case 'state_check':
        return this._checkConditions(t.conditions as Record<string, unknown>, gs);
      case 'state_change':
        return gs.flags[t.state as string] === (t.value as boolean | string);
      case 'timer': {
        if (!this._checkConditionExpr(t.condition, gs)) return false;
        const mpt = StoryManager.MINUTES_PER_TURN;
        if (t.recurring) {
          const interval = Math.max(1, Math.round(((t.interval_minutes as number) || 10) / mpt));
          const last = gs.eventLastFired?.[ownerId || ''] ?? (gs.actStartTurn || 0);
          return gs.turnCount - last >= interval;
        }
        const delayTurns = Math.max(1, Math.round(((t.delay_seconds as number) || 60) / 60 / mpt));
        return gs.turnCount - (gs.actStartTurn || 0) >= delayTurns;
      }
      case 'random': {
        if (!this._checkConditionExpr(t.condition, gs)) return false;
        const cooldown = Math.max(1, Math.round(((t.cooldown_minutes as number) || 5) / StoryManager.MINUTES_PER_TURN));
        const last = gs.eventLastFired?.[ownerId || ''];
        if (last !== undefined && gs.turnCount - last < cooldown) return false;
        return this.random() < ((t.probability as number) ?? 0.1);
      }
      case 'player_choice':
        return typeof gs.flags.final_choice === 'string' && gs.flags.final_choice !== '';
    }
    return false;
  }

  /** Injectable for deterministic tests. */
  random: () => number = Math.random;

  static readonly MOVE_ACTIONS = new Set(['move', 'go', 'exit', 'enter', 'climb', 'out', 'in']);

  /** Actions the story refers to, mapped to parser actions. */
  static readonly ACTION_ALIASES: Record<string, string[]> = {
    look_around: ['look'],
    look_out_viewport: ['look', 'examine'],
    examine: ['examine', 'read', 'look', 'search', 'use'],
    search: ['search', 'examine', 'look'],
  };

  _intentMatches(action: string, target: string | undefined, aliases: string[] | undefined, gs: GameState): boolean {
    const intent = gs.lastIntent;
    if (!intent) return false;
    const wanted = StoryManager.ACTION_ALIASES[action] || [action];
    if (!wanted.includes(intent.action)) return false;
    if (action === 'look_around') return !intent.target || intent.target === 'around' || intent.target === 'room';
    if (action === 'look_out_viewport') return this._targetMatches(intent.target, 'viewport', ['viewport', 'window', 'stars', 'out']);
    if (!target) return true;
    return this._targetMatches(intent.target, target, aliases);
  }

  _targetMatches(actual: string | null, wanted: string, aliases?: string[]): boolean {
    if (!actual) return false;
    const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, '');
    const a = norm(actual);
    if (a.length < 3) return false;
    const candidates = [wanted, ...(aliases || [])].map(norm);
    return candidates.some(c => c === a || c.includes(a) || a.includes(c));
  }

  /** conditions: { all_of: [...], any_of: [...], any_two_of: [...], none_of: [...] } where entries are flag names (or "flag == value"). */
  _checkConditions(conds: Record<string, unknown> | undefined, gs: GameState): boolean {
    if (!conds) return true;
    const truthy = (expr: string) => this._checkConditionExpr(expr, gs);
    for (const [k, v] of Object.entries(conds)) {
      const list = (v as string[]) || [];
      const count = list.filter(truthy).length;
      if (k === 'all_of' && count !== list.length) return false;
      if (k === 'any_of' && count < 1) return false;
      if (k === 'any_two_of' && count < 2) return false;
      if (k === 'none_of' && count > 0) return false;
    }
    return true;
  }

  /** "a == false && b == true", "x", "act1_active", "always" */
  _checkConditionExpr(expr: unknown, gs: GameState): boolean {
    if (expr === undefined || expr === null || expr === 'always' || expr === '') return true;
    if (typeof expr !== 'string') return false;
    return expr.split('&&').every(part => {
      const clause = part.trim();
      if (!clause) return true;
      const actMatch = clause.match(/^act(\d)_active$/);
      if (actMatch) return gs.currentAct.startsWith(`act${actMatch[1]}_`);
      const m = clause.match(/^(\w+)\s*(==|!=)\s*(\w+)$/);
      const flagVal = (name: string) => {
        const f = gs.flags[name];
        if (f !== undefined) return f;
        if (gs.puzzleStates[name] === 'solved') return true;
        return false;
      };
      if (!m) return flagVal(clause) === true || (typeof flagVal(clause) === 'string' && flagVal(clause) !== '');
      const [, name, op, rawVal] = m;
      const val = rawVal === 'true' ? true : rawVal === 'false' ? false : rawVal;
      const actual = flagVal(name);
      return op === '==' ? actual === val : actual !== val;
    });
  }

  _applyEffects(effects: { flags?: Record<string, boolean>; revealItem?: string; damage?: number; heal?: number }, gameState: GameState): void {
    if (effects.flags) Object.assign(gameState.flags, effects.flags);
    if (effects.revealItem) {
      gameState.itemHidden[effects.revealItem] = false;
    }
    if (effects.damage) {
      gameState.playerHealth = Math.max(0, (gameState.playerHealth || 100) - effects.damage);
    }
    if (effects.heal) {
      gameState.playerHealth = Math.min(100, (gameState.playerHealth || 100) + effects.heal);
    }
  }
}

export default StoryManager;

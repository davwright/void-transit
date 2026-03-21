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
      if (this._checkTrigger(nextAct.triggers.start, gameState)) {
        gameState.currentAct = nextAct.id;
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
    if (!currentAct || !currentAct.beats) return [];

    const triggered: StoryBeat[] = [];
    for (const beat of currentAct.beats) {
      if (gameState.storyBeatsTriggered.includes(beat.id)) continue;

      if (this._checkTrigger(beat.trigger, gameState)) {
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
      if (gameState.globalEvents.includes(event.id)) continue;

      if (this._checkTrigger(event.trigger, gameState)) {
        gameState.globalEvents.push(event.id);
        if (event.effect) {
          this._applyEffects(event.effect, gameState);
        }
        triggered.push(event);
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

  _checkTrigger(trigger: Record<string, unknown>, gameState: GameState): boolean {
    if (!trigger) return false;

    for (const [key, value] of Object.entries(trigger)) {
      if (key === 'and') {
        if (!(value as Record<string, unknown>[]).every(t => this._checkTrigger(t, gameState))) return false;
      } else if (key === 'or') {
        if (!(value as Record<string, unknown>[]).some(t => this._checkTrigger(t, gameState))) return false;
      } else if (key === 'type' && value === 'game_start') {
        // game_start triggers on the first turn only
        if (gameState.turnCount > 1) return false;
      } else if (key === 'room') {
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
      } else if (key !== 'type') {
        // Unknown trigger key — fail safe, don't silently match
        return false;
      }
    }
    return true;
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

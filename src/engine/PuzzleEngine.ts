import { PuzzleDef, PuzzleStep, GameState, GameTimer } from '../types';

interface PuzzleAttemptResult {
  success: boolean;
  soft?: boolean;
  reason?: string;
  hint?: string | null;
  consequence?: string | null;
  completed?: boolean;
  message?: string;
  reward?: unknown;
  nextStep?: PuzzleStep;
}

interface ValidationResult {
  valid: boolean;
  /** True when the input simply wasn't aimed at this step (no verb match) — callers may ignore it. */
  soft?: boolean;
  reason?: string;
}

interface ActivePuzzle extends PuzzleDef {
  state: string;
  currentStep: number;
}

interface DiscoverResult {
  discovered: boolean;
  puzzle: PuzzleDef;
}

class PuzzleEngine {
  puzzles: Map<string, PuzzleDef>;

  constructor(puzzleDefs: PuzzleDef[]) {
    this.puzzles = new Map<string, PuzzleDef>();
    for (const puzzle of puzzleDefs) {
      this.puzzles.set(puzzle.id, puzzle);
    }
  }

  getPuzzle(puzzleId: string): PuzzleDef | null {
    return this.puzzles.get(puzzleId) || null;
  }

  getPuzzleState(puzzleId: string, gameState: GameState): string {
    return gameState.puzzleStates[puzzleId] || 'undiscovered';
  }

  getActivePuzzles(gameState: GameState): ActivePuzzle[] {
    const active: ActivePuzzle[] = [];
    for (const [id, puzzle] of this.puzzles) {
      const state = gameState.puzzleStates[id];
      if (state === 'active' || state === 'in_progress') {
        active.push({ ...puzzle, state, currentStep: gameState.puzzleProgress[id] || 0 });
      }
    }
    return active;
  }

  discoverPuzzle(puzzleId: string, gameState: GameState): DiscoverResult | null {
    if (!gameState.puzzleStates[puzzleId] || gameState.puzzleStates[puzzleId] === 'undiscovered') {
      gameState.puzzleStates[puzzleId] = 'active';
      gameState.puzzleProgress[puzzleId] = 0;
      const puzzle = this.puzzles.get(puzzleId);
      return puzzle ? { discovered: true, puzzle } : null;
    }
    return null;
  }

  attemptStep(puzzleId: string, action: string, gameState: GameState): PuzzleAttemptResult {
    const puzzle = this.puzzles.get(puzzleId);
    if (!puzzle) return { success: false, reason: 'Unknown puzzle.' };

    const state = gameState.puzzleStates[puzzleId];
    if (state === 'solved') return { success: false, reason: "You've already resolved this." };
    if (state !== 'active' && state !== 'in_progress') {
      return { success: false, reason: "You haven't encountered this problem yet." };
    }

    const currentStep = gameState.puzzleProgress[puzzleId] || 0;
    const step = puzzle.steps[currentStep];
    if (!step) return { success: false, reason: 'Puzzle state error.' };

    if (step.requiredItems) {
      for (const itemId of step.requiredItems) {
        if (!gameState.inventory.includes(itemId) && !(gameState.equipped || []).includes(itemId)) {
          return {
            success: false,
            reason: `You don't have everything you need for this.`,
            hint: step.hint
          };
        }
      }
    }

    if (step.requiredLocation && gameState.currentRoom !== step.requiredLocation) {
      return {
        success: false,
        reason: `You're not in the right place to do this.`,
        hint: step.hint
      };
    }

    const validation = this._validateAction(action, step, gameState);
    if (!validation.valid) {
      gameState.puzzleAttempts = gameState.puzzleAttempts || {};
      gameState.puzzleAttempts[puzzleId] = (gameState.puzzleAttempts[puzzleId] || 0) + 1;

      const attempts = gameState.puzzleAttempts[puzzleId];
      let hint: string | null = null;
      if (attempts >= 3 && step.hint) hint = step.hint;
      if (attempts >= 5 && step.strongHint) hint = step.strongHint;

      if (step.failureConsequence) {
        this._applyConsequence(step.failureConsequence, gameState);
      }

      return {
        success: false,
        soft: validation.soft,
        reason: validation.reason || 'That doesn\'t work.',
        hint,
        consequence: step.failureConsequence ? (step.failureConsequenceText || null) : null
      };
    }

    gameState.puzzleStates[puzzleId] = 'in_progress';
    gameState.puzzleProgress[puzzleId] = currentStep + 1;

    if (step.stateChange) {
      this._applyStateChanges(step.stateChange, gameState);
    }

    if (step.consumesItems) {
      for (const itemId of step.consumesItems) {
        gameState.inventory = gameState.inventory.filter(id => id !== itemId);
        gameState.itemLocations[itemId] = 'consumed';
      }
    }

    if (currentStep + 1 >= puzzle.steps.length) {
      gameState.puzzleStates[puzzleId] = 'solved';
      if (puzzle.reward) {
        this._grantReward(puzzle.reward, gameState);
      }
      return {
        success: true,
        completed: true,
        message: step.result,
        reward: puzzle.reward
      };
    }

    return {
      success: true,
      completed: false,
      message: step.result,
      nextStep: puzzle.steps[currentStep + 1]
    };
  }

  /** Room the current step of a puzzle must be performed in, if it declares one. */
  stepLocation(puzzleId: string, gameState: GameState): string | undefined {
    const puzzle = this.puzzles.get(puzzleId);
    const step = puzzle?.steps[gameState.puzzleProgress[puzzleId] || 0];
    const v = step?.validation;
    return step?.requiredLocation || v?.requiredLocation || v?.location || puzzle?.location;
  }

  getHint(puzzleId: string, gameState: GameState): string | null {
    const puzzle = this.puzzles.get(puzzleId);
    if (!puzzle) return null;

    const currentStep = gameState.puzzleProgress[puzzleId] || 0;
    const step = puzzle.steps[currentStep];
    if (!step) return null;

    return step.hint || `Think about the ${puzzle.scienceDomain} involved.`;
  }

  checkPuzzleTriggers(roomId: string, gameState: GameState): PuzzleDef[] {
    const triggered: PuzzleDef[] = [];
    for (const [id, puzzle] of this.puzzles) {
      if (puzzle.triggerRoom === roomId) {
        const state = gameState.puzzleStates[id];
        if (!state || state === 'undiscovered') {
          if (this._checkTriggerConditions(puzzle, gameState)) {
            this.discoverPuzzle(id, gameState);
            triggered.push(puzzle);
          }
        }
      }
    }
    return triggered;
  }

  validateNumericAnswer(playerAnswer: string, correctAnswer: number, tolerancePercent: number = 10): boolean {
    const num = parseFloat(playerAnswer);
    if (isNaN(num)) return false;
    const tolerance = Math.abs(correctAnswer) * (tolerancePercent / 100);
    return Math.abs(num - correctAnswer) <= tolerance;
  }

  _validateAction(action: string, step: PuzzleStep, gameState: GameState): ValidationResult {
    if (!step.validation) return { valid: true };

    const v = step.validation;

    if (v.type === 'exact') {
      if (action.toLowerCase().trim() === String(v.answer).toLowerCase().trim()) {
        return { valid: true };
      }
      return { valid: false, reason: v.failMessage };
    }

    if (v.type === 'numeric' || v.type === 'calculation') {
      const answer = v.correctAnswer ?? v.answer;
      if (this.validateNumericAnswer(action, answer as number, v.tolerance || 10)) {
        return { valid: true };
      }
      return { valid: false, reason: v.failMessage || 'The numbers don\'t add up.' };
    }

    if (v.type === 'item_present') {
      if (gameState.inventory.includes(v.itemId!) || (gameState.equipped || []).includes(v.itemId!)) {
        return { valid: true };
      }
      return { valid: false, reason: v.failMessage || 'You need a specific item.' };
    }

    if (v.type === 'action_match') {
      const keywords = v.keywords || [];
      const actionLower = action.toLowerCase();
      if (keywords.some(kw => actionLower.includes(kw))) {
        return { valid: true };
      }
      return { valid: false, reason: v.failMessage || 'That\'s not quite right.' };
    }

    if (v.type === 'any') {
      return { valid: true };
    }

    return this._validateAuthored(action, step, gameState);
  }

  /** Words that carry no meaning when matching a step's action id against player input. */
  static readonly STOPWORDS = new Set(['the', 'a', 'an', 'to', 'and', 'of', 'with', 'for', 'in', 'on', 'at', 'new', 'previous', 'data', 'system', 'levels', 'requirements', 'component']);

  /**
   * Authored validation types (item_use, interaction, sequence, timed_action, input_values,
   * state_check, item_search, item_retrieval, equipment_check, crafting, navigation,
   * system_interaction, item_check). Common semantics:
   *   - required items must be in inventory or equipped
   *   - required location / state must hold
   *   - the player's input must contain at least one meaningful word from the step's action
   *     (or from `keywords`), so "calculate" can't complete "install cartridge"
   *   - numeric fields (input_values, torqueValue) must match when the step has them
   */
  _validateAuthored(action: string, step: PuzzleStep, gameState: GameState): ValidationResult {
    const v = step.validation!;
    // Items may exist as upgraded variants (eva_suit → eva_suit_full, welding_torch → welding_torch_powered)
    const has = (id: string) => [...gameState.inventory, ...(gameState.equipped || [])].some(e => e === id || e.startsWith(id + '_'));
    const items = ([] as string[]).concat(v.requiredItems || [], v.item ? [v.item] : []);

    const room = v.requiredLocation || (v.type === 'item_search' || v.type === 'item_retrieval' ? undefined : v.location);
    if (room && gameState.currentRoom !== room) {
      return { valid: false, reason: v.failMessage || "You're not in the right place to do this." };
    }

    if (v.requiredState && typeof v.requiredState === 'object') {
      for (const [flag, want] of Object.entries(v.requiredState)) {
        let actual = gameState.flags[flag];
        if (actual !== want && v.type === 'state_check' && this._fastForwardTimerFor(flag, gameState)) {
          actual = gameState.flags[flag];
        }
        if (actual !== want) {
          return { valid: false, reason: v.failMessage || 'Not yet. The conditions aren\'t right for that.' };
        }
      }
    }

    // item_search / item_retrieval: the step *finds* the item — it must be in this room (or already held)
    if (v.type === 'item_search' || v.type === 'item_retrieval') {
      const id = v.item!;
      if (!has(id)) {
        const where = v.location;
        if (where && gameState.currentRoom !== where) {
          return { valid: false, reason: v.failMessage || "It isn't here. Think about where something like that would be stored." };
        }
      }
    } else {
      for (const id of items) {
        if (!has(id)) return { valid: false, reason: v.failMessage || "You don't have everything you need for this." };
      }
      if (v.type === 'equipment_check' && v.allMustBeEquipped) {
        // The suit must actually be worn; tools may be carried.
        const suit = items.find(i => i.includes('suit'));
        if (suit && !(gameState.equipped || []).some(e => e === suit || e.startsWith(suit + '_'))) {
          return { valid: false, reason: v.failMessage || 'You need to be wearing the suit, not carrying it.' };
        }
      }
    }

    // Action keyword match
    const input = action.toLowerCase();
    const words = new Set(input.split(/[^a-z0-9.]+/).filter(Boolean));
    const keywords = (v.keywords as string[] | undefined) || step.action.split('_').filter(w => !PuzzleEngine.STOPWORDS.has(w));
    const stem = (w: string) => w.replace(/(ing|ed|es|s)$/,'');
    const stems = new Set([...words].map(stem));
    const matched = keywords.some(kw => {
      const k = stem(kw.toLowerCase());
      return stems.has(k) || [...stems].some(w => w.length > 3 && (w.startsWith(k) || k.startsWith(w)));
    });
    // A bare number (from `calculate 5.2`) shouldn't complete a non-numeric step
    if (!matched) return { valid: false, soft: true, reason: v.failMessage || "That's not what this problem needs right now." };

    // Numeric fields
    const nums = (input.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    if (v.type === 'input_values' && v.requiredValues) {
      const req = Object.values(v.requiredValues);
      const need = Math.min(req.length, 2); // any two of the authored values is enough
      const hits = req.filter(r => nums.some(n => Math.abs(n - r.value) <= (r.tolerance ?? Math.abs(r.value) * 0.02))).length;
      if (nums.length === 0) return { valid: false, reason: v.failMessage || 'The console is waiting for numbers.' };
      if (hits < need) return { valid: false, reason: v.failMessage || 'The values are rejected. Check your figures.' };
    }
    if (v.torqueValue && nums.length) {
      const { target, tolerance = 5 } = v.torqueValue;
      if (!nums.some(n => Math.abs(n - target) <= tolerance)) {
        return { valid: false, reason: v.failMessage || 'The torque is wrong. Too loose and it shifts; too tight and the bolt shears.' };
      }
    }

    // Side effects that the step's stateChange doesn't cover: finding an item puts it in hand
    if ((v.type === 'item_search' || v.type === 'item_retrieval') && v.item) this._grantItem(v.item, gameState);

    return { valid: true };
  }

  _applyStateChanges(changes: Record<string, unknown>, gameState: GameState): void {
    for (const [key, value] of Object.entries(changes)) {
      if (key === 'set' && value && typeof value === 'object') {
        // Authored schema: { set: { flag: value, ... } } — scalar values become flags
        for (const [flag, v] of Object.entries(value as Record<string, unknown>)) {
          if (typeof v === 'boolean' || typeof v === 'string') gameState.flags[flag] = v;
          else if (typeof v === 'number') gameState.flags[flag] = String(v);
          else gameState.worldLore[flag] = JSON.stringify(v);
        }
      } else if (key === 'unlock' && Array.isArray(value)) {
        for (const u of value as string[]) gameState.flags[`unlock_${u}`] = true;
      } else if (key === 'add_item' && value && typeof value === 'object') {
        const item = value as { id: string; name?: string; description?: string };
        this._grantItem(item.id, gameState);
        if (item.name || item.description) {
          gameState.itemProperties[item.id] = { ...(gameState.itemProperties[item.id] || {}), ...(item.name ? { name: item.name } : {}), ...(item.description ? { description: item.description } : {}) };
        }
      } else if ((key === 'remove_items' || key === 'remove_item') && value) {
        for (const id of ([] as string[]).concat(value as string | string[])) {
          gameState.inventory = gameState.inventory.filter(i => i !== id);
          gameState.equipped = (gameState.equipped || []).filter(i => i !== id);
          gameState.itemLocations[id] = 'consumed';
        }
      } else if (key === 'modify_item' && value && typeof value === 'object') {
        for (const [id, props] of Object.entries(value as Record<string, Record<string, unknown>>)) {
          gameState.itemProperties[id] = { ...(gameState.itemProperties[id] || {}), ...props };
        }
      } else if (key === 'start_timer' && value && typeof value === 'object') {
        const t = value as { id: string; duration_minutes?: number; on_complete?: { set?: Record<string, unknown> } };
        gameState.timers = gameState.timers || [];
        gameState.timers.push({ id: t.id, remainingMinutes: t.duration_minutes || 60, onComplete: t.on_complete });
      } else if (key.startsWith('flag_')) {
        gameState.flags[key.substring(5)] = value as boolean | string;
      } else if (key.startsWith('system_')) {
        this._setSystemValue(key.substring(7), value, gameState);
      } else if (key.startsWith('item_reveal_')) {
        const itemId = key.substring(12);
        gameState.itemHidden[itemId] = false;
      } else if (key.startsWith('item_location_')) {
        const itemId = key.substring(14);
        gameState.itemLocations[itemId] = value as string;
      }
    }
  }

  _grantItem(id: string, gameState: GameState): void {
    if (!gameState.inventory.includes(id)) gameState.inventory.push(id);
    gameState.itemLocations[id] = 'inventory';
    gameState.itemHidden[id] = false;
  }

  /** Apply a timer's completion effects and drop it from the state. */
  completeTimer(timer: GameTimer, gameState: GameState): void {
    if (timer.onComplete) this._applyStateChanges(timer.onComplete as Record<string, unknown>, gameState);
    gameState.timers = (gameState.timers || []).filter(t => t !== timer);
  }

  /** Complete any pending timer whose on_complete would satisfy `flagName`. Returns true if one was found. */
  _fastForwardTimerFor(flagName: string, gameState: GameState): boolean {
    const timer = (gameState.timers || []).find(t => t.onComplete?.set && flagName in t.onComplete.set);
    if (!timer) return false;
    this.completeTimer(timer, gameState);
    return true;
  }

  _setSystemValue(path: string, value: unknown, gameState: GameState): void {
    const parts = path.split('.');
    let current: Record<string, unknown> = gameState.shipSystems as unknown as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) {
      if ((current as Record<string, unknown>)[parts[i]] === undefined) (current as Record<string, unknown>)[parts[i]] = {};
      current = (current as Record<string, unknown>)[parts[i]] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }

  _applyConsequence(consequence: { damage?: number; stateChange?: Record<string, unknown> }, gameState: GameState): void {
    if (consequence.damage) {
      gameState.playerHealth = Math.max(0, (gameState.playerHealth || 100) - consequence.damage);
    }
    if (consequence.stateChange) {
      this._applyStateChanges(consequence.stateChange, gameState);
    }
  }

  _grantReward(reward: { item?: string; flags?: Record<string, boolean>; stateChange?: Record<string, unknown> }, gameState: GameState): void {
    if (reward.item) {
      gameState.inventory.push(reward.item);
      gameState.itemLocations[reward.item] = 'inventory';
    }
    if (reward.flags) {
      Object.assign(gameState.flags, reward.flags);
    }
    if (reward.stateChange) {
      this._applyStateChanges(reward.stateChange, gameState);
    }
  }

  _checkTriggerConditions(puzzle: PuzzleDef, gameState: GameState): boolean {
    for (const prereq of puzzle.prerequisitePuzzles || []) {
      if (gameState.puzzleStates[prereq] !== 'solved') return false;
    }
    if (!puzzle.triggerConditions) return true;
    for (const [key, value] of Object.entries(puzzle.triggerConditions)) {
      if (key.startsWith('flag_')) {
        if (gameState.flags[key.substring(5)] !== value) return false;
      } else if (key.startsWith('puzzle_')) {
        if (gameState.puzzleStates[key.substring(7)] !== value) return false;
      }
    }
    return true;
  }
}

export default PuzzleEngine;

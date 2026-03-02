import { PuzzleDef, PuzzleStep, GameState } from '../types';

interface PuzzleAttemptResult {
  success: boolean;
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

    if (v.type === 'numeric') {
      if (this.validateNumericAnswer(action, v.answer as number, v.tolerance || 10)) {
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

    return { valid: true };
  }

  _applyStateChanges(changes: Record<string, unknown>, gameState: GameState): void {
    for (const [key, value] of Object.entries(changes)) {
      if (key.startsWith('flag_')) {
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

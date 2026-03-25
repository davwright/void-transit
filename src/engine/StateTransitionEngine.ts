import { GameState, Intent, StateTransitionData, StateTransition, LookOverride } from '../types';
import NavigationManager from './NavigationManager';

class StateTransitionEngine {
  private data: StateTransitionData;
  private nav: NavigationManager;

  constructor(data: StateTransitionData, nav: NavigationManager) {
    this.data = data;
    this.nav = nav;
  }

  /**
   * Find a matching state transition for the given intent and game state.
   * Matches against triggers (full phrases) first, then actionKeywords (individual words).
   */
  checkTransition(intent: Intent, gameState: GameState): StateTransition | null {
    const raw = intent.raw.toLowerCase().trim();

    for (const transition of this.data.transitions) {
      // Check room constraint
      if (transition.room && transition.room !== gameState.currentRoom) continue;

      // Check all conditions
      if (!this._matchesConditions(transition.condition, gameState)) continue;

      // Check triggers (full phrase match)
      if (transition.triggers.some(t => t === raw || raw.includes(t))) {
        return transition;
      }

      // Fallback: check actionKeywords against individual words in raw input
      const words = raw.split(/\s+/);
      if (transition.actionKeywords.some(kw => words.includes(kw))) {
        return transition;
      }
    }

    return null;
  }

  /**
   * Check if a look override applies for the given room and game state.
   * Returns the override description, or null if no override matches.
   */
  getLookOverride(roomId: string, gameState: GameState): string | null {
    if (!this.data.lookOverrides) return null;
    const overrides = this.data.lookOverrides[roomId];
    if (!overrides) return null;

    for (const override of overrides) {
      if (this._matchesConditions(override.condition, gameState)) {
        return override.description;
      }
    }

    return null;
  }

  private _matchesConditions(conditions: Record<string, boolean | string>, gameState: GameState): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      if (!this.nav.checkCondition(key, value, gameState)) {
        return false;
      }
    }
    return true;
  }
}

export default StateTransitionEngine;

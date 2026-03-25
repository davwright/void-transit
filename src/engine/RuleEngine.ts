import { GameState, Intent, Rule, RuleEffects, RulesData } from '../types';
import NavigationManager from './NavigationManager';

class RuleEngine {
  private rules: Rule[];
  private nav: NavigationManager;

  constructor(data: RulesData, nav: NavigationManager) {
    // Sort rules by priority descending (higher priority evaluated first)
    this.rules = [...data.rules].sort((a, b) => (b.priority || 50) - (a.priority || 50));
    this.nav = nav;
  }

  /**
   * Find a matching action rule for the given intent and game state.
   * Returns the first matching rule, or null if no rule matches.
   */
  matchAction(intent: Intent, gameState: GameState): Rule | null {
    const raw = intent.raw.toLowerCase().trim();
    const action = intent.action;
    const target = intent.target?.toLowerCase() || '';

    for (const rule of this.rules) {
      if (rule.trigger.type !== 'action') continue;

      // Room constraint
      if (!this._roomMatches(rule.trigger.room, gameState.currentRoom)) continue;

      // Check all conditions
      if (!this._matchesConditions(rule.conditions, gameState)) continue;

      // Check trigger match: phrases first, then action+target
      let matched = false;

      // Phrase match (full input contains the phrase)
      if (rule.trigger.phrases?.length) {
        if (rule.trigger.phrases.some(p => raw === p || raw.includes(p))) {
          matched = true;
        }
      }

      // Action + target match
      if (!matched && rule.trigger.actions?.length) {
        const actionMatch = rule.trigger.actions.includes(action);
        if (actionMatch) {
          if (!rule.trigger.targets?.length) {
            // Action-only rule (no target required)
            matched = true;
          } else if (target && rule.trigger.targets.some(t => target === t || target.includes(t) || t.includes(target))) {
            matched = true;
          }
        }
      }

      // Fallback: check individual words in raw input against targets
      if (!matched && rule.trigger.targets?.length) {
        const words = raw.split(/\s+/);
        if (rule.trigger.targets.some(t => words.includes(t))) {
          // Also need action match or no action constraint
          if (!rule.trigger.actions?.length || rule.trigger.actions.includes(action)) {
            matched = true;
          }
        }
      }

      if (matched) return rule;
    }

    return null;
  }

  /**
   * Find matching look rules for the given room and game state.
   * Returns { replace?: string, appends: string[] } — the override description
   * and/or additional text to append.
   */
  matchLook(roomId: string, gameState: GameState): { replace?: string; appends: string[] } | null {
    const result: { replace?: string; appends: string[] } = { appends: [] };
    let found = false;

    for (const rule of this.rules) {
      if (rule.trigger.type !== 'look') continue;
      if (!this._roomMatches(rule.trigger.room, roomId)) continue;
      if (!this._matchesConditions(rule.conditions, gameState)) continue;

      if (rule.lookMode === 'append') {
        result.appends.push(rule.message);
        found = true;
      } else {
        // Replace mode — first matching replace wins
        if (!result.replace) {
          result.replace = rule.message;
          found = true;
        }
      }
    }

    return found ? result : null;
  }

  /**
   * Find matching tick rules and return their effects.
   */
  matchTick(gameState: GameState): Rule[] {
    const matched: Rule[] = [];
    for (const rule of this.rules) {
      if (rule.trigger.type !== 'tick') continue;
      if (rule.trigger.room && !this._roomMatches(rule.trigger.room, gameState.currentRoom)) continue;
      if (!this._matchesConditions(rule.conditions, gameState)) continue;
      matched.push(rule);
    }
    return matched;
  }

  /**
   * Apply a rule's effects to game state.
   */
  applyEffects(effects: RuleEffects, gameState: GameState): void {
    if (effects.setFlags) {
      for (const [key, value] of Object.entries(effects.setFlags)) {
        gameState.flags[key] = value;
      }
    }

    if (effects.revealItems) {
      for (const itemId of effects.revealItems) {
        if (itemId in gameState.itemHidden) {
          gameState.itemHidden[itemId] = false;
          // Also move item to current room if it's not already accessible
          if (gameState.itemLocations[itemId] && gameState.itemLocations[itemId] !== gameState.currentRoom
              && !gameState.inventory.includes(itemId)) {
            gameState.itemLocations[itemId] = gameState.currentRoom;
          }
        }
      }
    }

    if (effects.hideItems) {
      for (const itemId of effects.hideItems) {
        if (itemId in gameState.itemHidden) {
          gameState.itemHidden[itemId] = true;
        }
      }
    }

    if (effects.moveItems) {
      for (const [itemId, roomId] of Object.entries(effects.moveItems)) {
        gameState.itemLocations[itemId] = roomId;
      }
    }

    if (effects.grantItems) {
      for (const itemId of effects.grantItems) {
        if (!gameState.inventory.includes(itemId)) {
          gameState.inventory.push(itemId);
          gameState.itemLocations[itemId] = 'inventory';
          gameState.itemHidden[itemId] = false;
        }
      }
    }

    if (effects.consumeItems) {
      for (const itemId of effects.consumeItems) {
        const idx = gameState.inventory.indexOf(itemId);
        if (idx !== -1) gameState.inventory.splice(idx, 1);
        gameState.itemLocations[itemId] = 'consumed';
      }
    }

    if (effects.damage) {
      gameState.playerHealth = Math.max(0, gameState.playerHealth - effects.damage);
    }

    if (effects.heal) {
      gameState.playerHealth = Math.min(100, gameState.playerHealth + effects.heal);
    }

    if (effects.setItemProperty) {
      for (const [itemId, props] of Object.entries(effects.setItemProperty)) {
        if (!gameState.itemProperties[itemId]) {
          gameState.itemProperties[itemId] = {};
        }
        Object.assign(gameState.itemProperties[itemId], props);
      }
    }

    // Handle once-firing rules
  }

  private _roomMatches(roomConstraint: string | string[] | undefined, currentRoom: string): boolean {
    if (!roomConstraint) return true;
    if (Array.isArray(roomConstraint)) return roomConstraint.includes(currentRoom);
    return roomConstraint === currentRoom;
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

export default RuleEngine;

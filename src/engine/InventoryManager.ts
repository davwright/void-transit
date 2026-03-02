import { ItemDef, ItemUse, ItemCombination, GameState } from '../types';

interface PickUpCheck {
  allowed: boolean;
  reason?: string;
}

interface PickUpResult {
  allowed: boolean;
  reason?: string;
  item?: ItemDef;
  message?: string;
}

interface DropResult {
  allowed: boolean;
  reason?: string;
  item?: ItemDef;
  message?: string;
}

interface ExamineResult {
  allowed: boolean;
  reason?: string;
  text?: string;
  item?: ItemDef;
}

interface UseResult {
  allowed: boolean;
  reason?: string;
  message?: string;
  systemChange?: Record<string, unknown>;
}

interface CombineResult {
  allowed: boolean;
  reason?: string;
  message?: string;
  created?: ItemDef | null;
}

interface EquipResult {
  allowed: boolean;
  reason?: string;
  message?: string;
}

class InventoryManager {
  itemDefs: Map<string, ItemDef>;

  constructor(itemDefs: ItemDef[]) {
    this.itemDefs = new Map<string, ItemDef>();
    for (const item of itemDefs) {
      this.itemDefs.set(item.id, item);
    }
  }

  getItemDef(itemId: string): ItemDef | null {
    return this.itemDefs.get(itemId) || null;
  }

  getItemsInRoom(roomId: string, gameState: GameState): (ItemDef & { hidden: boolean })[] {
    const items: (ItemDef & { hidden: boolean })[] = [];
    for (const [id, def] of this.itemDefs) {
      const loc = gameState.itemLocations[id];
      if (loc === roomId) {
        const hidden = gameState.itemHidden[id];
        items.push({ ...def, hidden: hidden !== undefined ? hidden : def.hidden });
      }
    }
    return items;
  }

  getVisibleItemsInRoom(roomId: string, gameState: GameState): (ItemDef & { hidden: boolean })[] {
    return this.getItemsInRoom(roomId, gameState).filter(i => !i.hidden);
  }

  getInventory(gameState: GameState): ItemDef[] {
    return gameState.inventory.map(id => this.itemDefs.get(id)).filter(Boolean) as ItemDef[];
  }

  getCarryWeight(gameState: GameState): number {
    return gameState.inventory.reduce((sum: number, id: string) => {
      const def = this.itemDefs.get(id);
      return sum + (def ? def.weight || 0 : 0);
    }, 0);
  }

  canPickUp(itemId: string, gameState: GameState): PickUpCheck {
    const def = this.itemDefs.get(itemId);
    if (!def) return { allowed: false, reason: "That doesn't exist." };
    if (!def.portable) return { allowed: false, reason: `You can't carry the ${def.name}.` };

    const itemLoc = gameState.itemLocations[itemId];
    if (itemLoc !== gameState.currentRoom) {
      return { allowed: false, reason: "You don't see that here." };
    }

    if (gameState.itemHidden[itemId]) {
      return { allowed: false, reason: "You don't see that here." };
    }

    if (gameState.inventory.includes(itemId)) {
      return { allowed: false, reason: "You already have that." };
    }

    const maxWeight = 25;
    const currentWeight = this.getCarryWeight(gameState);
    if (currentWeight + (def.weight || 0) > maxWeight) {
      return { allowed: false, reason: `That's too heavy. You're carrying ${currentWeight.toFixed(1)}kg of ${maxWeight}kg max.` };
    }

    return { allowed: true };
  }

  pickUp(itemId: string, gameState: GameState): PickUpResult {
    const check = this.canPickUp(itemId, gameState);
    if (!check.allowed) return { allowed: false, reason: check.reason };

    const def = this.itemDefs.get(itemId)!;
    gameState.inventory.push(itemId);
    gameState.itemLocations[itemId] = 'inventory';
    return { allowed: true, item: def, message: `You pick up the ${def.name}.` };
  }

  drop(itemId: string, gameState: GameState): DropResult {
    const idx = gameState.inventory.indexOf(itemId);
    if (idx === -1) return { allowed: false, reason: "You're not carrying that." };

    const def = this.itemDefs.get(itemId);
    gameState.inventory.splice(idx, 1);
    gameState.itemLocations[itemId] = gameState.currentRoom;

    if (gameState.equipped && gameState.equipped.includes(itemId)) {
      gameState.equipped = gameState.equipped.filter(e => e !== itemId);
    }

    return { allowed: true, item: def || undefined, message: `You set down the ${def?.name}.` };
  }

  examine(itemId: string, gameState: GameState): ExamineResult {
    const def = this.itemDefs.get(itemId);
    if (!def) return { allowed: false, reason: "That doesn't exist." };

    const inInventory = gameState.inventory.includes(itemId);
    const inRoom = gameState.itemLocations[itemId] === gameState.currentRoom && !gameState.itemHidden[itemId];

    if (!inInventory && !inRoom) {
      return { allowed: false, reason: "You don't see that here." };
    }

    let text = def.description;
    if (def.examineDetail) {
      text += '\n\n' + def.examineDetail;
    }

    if (def.properties) {
      const props = gameState.itemProperties[itemId] || def.properties;
      text += this._describeProperties(def, props);
    }

    if (def.revealsOnExamine) {
      for (const revealId of def.revealsOnExamine) {
        if (gameState.itemHidden[revealId]) {
          gameState.itemHidden[revealId] = false;
          const revealDef = this.itemDefs.get(revealId);
          if (revealDef) {
            text += `\n\nYou notice something: ${revealDef.name}.`;
          }
        }
      }
    }

    if (def.revealsFlag) {
      for (const [flag, value] of Object.entries(def.revealsFlag)) {
        gameState.flags[flag] = value;
      }
    }

    return { allowed: true, text, item: def };
  }

  useItem(itemId: string, targetId: string, gameState: GameState): UseResult {
    const def = this.itemDefs.get(itemId);
    if (!def) return { allowed: false, reason: "That doesn't exist." };

    if (!gameState.inventory.includes(itemId)) {
      return { allowed: false, reason: "You're not carrying that." };
    }

    if (def.usableWith) {
      const use = def.usableWith.find(u => u.target === targetId);
      if (use) {
        return this._executeUse(itemId, def, use, gameState);
      }
    }

    return { allowed: false, reason: `You can't use the ${def.name} with that.` };
  }

  combine(itemId1: string, itemId2: string, gameState: GameState): CombineResult {
    const def1 = this.itemDefs.get(itemId1);
    const def2 = this.itemDefs.get(itemId2);
    if (!def1 || !def2) return { allowed: false, reason: "That doesn't exist." };

    if (!gameState.inventory.includes(itemId1) || !gameState.inventory.includes(itemId2)) {
      return { allowed: false, reason: "You need to be carrying both items." };
    }

    let combo: ItemCombination | null = null;
    if (def1.combinable) {
      combo = def1.combinable.find(c => c.with === itemId2) || null;
    }
    if (!combo && def2.combinable) {
      combo = def2.combinable.find(c => c.with === itemId1) || null;
    }

    if (!combo) {
      return { allowed: false, reason: `The ${def1.name} and ${def2.name} can't be combined.` };
    }

    gameState.inventory = gameState.inventory.filter(id => id !== itemId1 && id !== itemId2);
    gameState.itemLocations[itemId1] = 'consumed';
    gameState.itemLocations[itemId2] = 'consumed';

    const newDef = this.itemDefs.get(combo.creates);
    if (newDef) {
      gameState.inventory.push(combo.creates);
      gameState.itemLocations[combo.creates] = 'inventory';
      if (newDef.properties) {
        gameState.itemProperties[combo.creates] = { ...newDef.properties };
      }
    }

    if (combo.flags) {
      Object.assign(gameState.flags, combo.flags);
    }

    return {
      allowed: true,
      message: combo.description || `You combine the ${def1.name} and ${def2.name}.`,
      created: newDef || null
    };
  }

  equip(itemId: string, gameState: GameState): EquipResult {
    const def = this.itemDefs.get(itemId);
    if (!def) return { allowed: false, reason: "That doesn't exist." };
    if (!gameState.inventory.includes(itemId)) return { allowed: false, reason: "You're not carrying that." };
    if (!def.equippable) return { allowed: false, reason: `You can't wear or equip the ${def.name}.` };

    if (!gameState.equipped) gameState.equipped = [];
    if (gameState.equipped.includes(itemId)) return { allowed: false, reason: `You're already wearing the ${def.name}.` };

    gameState.equipped.push(itemId);
    return { allowed: true, message: `You put on the ${def.name}.` };
  }

  unequip(itemId: string, gameState: GameState): EquipResult {
    if (!gameState.equipped || !gameState.equipped.includes(itemId)) {
      return { allowed: false, reason: "You're not wearing that." };
    }
    const def = this.itemDefs.get(itemId);
    gameState.equipped = gameState.equipped.filter(e => e !== itemId);
    return { allowed: true, message: `You remove the ${def?.name}.` };
  }

  revealItem(itemId: string, gameState: GameState): void {
    gameState.itemHidden[itemId] = false;
  }

  _executeUse(itemId: string, def: ItemDef, use: ItemUse, gameState: GameState): UseResult {
    const result: UseResult = { allowed: true, message: use.message || `You use the ${def.name}.` };

    if (use.requiresCondition) {
      for (const [key, val] of Object.entries(use.requiresCondition)) {
        if (key.startsWith('has_')) {
          if (!gameState.inventory.includes(key.substring(4))) {
            return { allowed: false, reason: use.failMessage || `You need something else first.` };
          }
        } else if (gameState.flags[key] !== val) {
          return { allowed: false, reason: use.failMessage || `That doesn't work right now.` };
        }
      }
    }

    if (use.setsFlags) Object.assign(gameState.flags, use.setsFlags);
    if (use.consumesItem) {
      gameState.inventory = gameState.inventory.filter(id => id !== itemId);
      gameState.itemLocations[itemId] = 'consumed';
    }
    if (use.grantsItem) {
      gameState.inventory.push(use.grantsItem);
      gameState.itemLocations[use.grantsItem] = 'inventory';
    }
    if (use.systemChange) {
      result.systemChange = use.systemChange;
    }

    return result;
  }

  _describeProperties(def: ItemDef, props: Record<string, unknown>): string {
    let text = '';
    if (props.powered !== undefined) {
      text += props.powered ? ' It is powered on.' : ' It is not powered.';
    }
    if (props.charged !== undefined) {
      text += ` Charge level: ${Math.round(props.charged as number * 100)}%.`;
    }
    if (props.temperature !== undefined) {
      text += ` Temperature: ${props.temperature}°C.`;
    }
    return text;
  }
}

export default InventoryManager;

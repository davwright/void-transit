import { GameState, Intent, ActionResult, ItemDef } from '../types';
import NavigationManager from './NavigationManager';
import InventoryManager from './InventoryManager';
import PuzzleEngine from './PuzzleEngine';
import StoryManager from './StoryManager';
import { levenshtein } from '../nlp/StatisticalTagger';

class CommandProcessor {
  nav: NavigationManager;
  inv: InventoryManager;
  puzzle: PuzzleEngine;
  story: StoryManager;

  constructor(navigationManager: NavigationManager, inventoryManager: InventoryManager, puzzleEngine: PuzzleEngine, storyManager: StoryManager) {
    this.nav = navigationManager;
    this.inv = inventoryManager;
    this.puzzle = puzzleEngine;
    this.story = storyManager;
  }

  process(intent: Intent, gameState: GameState): ActionResult {
    const action = intent.action;
    const target = intent.target;
    const instrument = intent.instrument;

    switch (action) {
      case 'move': return this._handleMove(target, gameState);
      case 'look': return this._handleLook(target, gameState, intent.raw);
      case 'examine': return this._handleExamine(target, gameState, intent.raw);
      case 'take': case 'get': case 'pick_up': return this._handleTake(target, gameState);
      case 'drop': return this._handleDrop(target, gameState);
      case 'inventory': return this._handleInventory(gameState);
      case 'use': case 'activate': case 'deactivate': return this._handleUse(target, instrument, gameState);
      case 'combine': return this._handleCombine(target, instrument, gameState);
      case 'equip': case 'wear': case 'put_on': return this._handleEquip(target, gameState);
      case 'unequip': case 'remove': return this._handleUnequip(target, gameState);
      case 'open': return this._handleOpen(target, gameState);
      case 'read': return this._handleRead(target, gameState);
      case 'status': return this._handleStatus(gameState);
      case 'help': return this._handleHelp();
      case 'systems': return this._handleSystems(gameState);
      case 'hint': return this._handleHint(gameState);
      case 'wait': return this._handleWait(gameState);
      case 'puzzle_action': return this._handlePuzzleAction(target, intent.value || null, gameState);
      case 'talk': return this._handleTalk(target, gameState);
      case 'search': return this._handleSearch(target, gameState, intent.raw);
      case 'map': return this._handleMap(gameState);
      case 'rejected': return { type: 'rejected', message: intent.value || 'That won\'t help you here.' };
      default: return this._handleUnknown(intent, gameState);
    }
  }

  _handleMove(direction: string | null, gameState: GameState): ActionResult {
    const dir = direction || '';
    const result = this.nav.move(gameState.currentRoom, dir, gameState);

    if (!result.allowed) {
      return { type: 'move_failed', message: result.reason };
    }

    gameState.previousRoom = gameState.currentRoom;
    gameState.currentRoom = result.roomId!;

    const roomDesc = this.nav.getRoomDescription(result.roomId!, gameState);
    const items = this.inv.getVisibleItemsInRoom(result.roomId!, gameState);
    const exits = this.nav.getVisibleExits(result.roomId!, gameState);
    const puzzleTriggers = this.puzzle.checkPuzzleTriggers(result.roomId!, gameState);
    const foreshadowing = this.story.checkForeshadowing(result.roomId!, gameState);

    return {
      type: 'move_success',
      roomId: result.roomId,
      roomName: result.room!.name,
      description: roomDesc,
      isFirstVisit: result.isFirstVisit,
      items: items.map(i => ({ id: i.id, name: i.name })),
      exits: exits.map(e => ({ direction: e.direction, accessible: e.accessible })),
      puzzleTriggers: puzzleTriggers.map(p => ({ id: p.id, name: p.name, description: p.description })),
      foreshadowing
    };
  }

  _handleLook(target: string | null, gameState: GameState, rawInput?: string): ActionResult {
    if (!target || target === 'around' || target === 'room') {
      const room = this.nav.getRoom(gameState.currentRoom);
      const roomDesc = this.nav.getRoomDescription(gameState.currentRoom, gameState);
      const items = this.inv.getVisibleItemsInRoom(gameState.currentRoom, gameState);
      const exits = this.nav.getVisibleExits(gameState.currentRoom, gameState);

      return {
        type: 'look',
        roomId: gameState.currentRoom,
        roomName: room ? room.name : 'Unknown',
        description: roomDesc,
        items: items.map(i => ({ id: i.id, name: i.name })),
        exits: exits.map(e => ({ direction: e.direction, accessible: e.accessible }))
      };
    }

    return this._handleExamine(target, gameState, rawInput);
  }

  _handleExamine(target: string | null, gameState: GameState, rawInput?: string): ActionResult {
    // Check scenery FIRST (exact match) before fuzzy item resolution
    if (target) {
      const room = this.nav.getRoom(gameState.currentRoom);
      const normalizedTarget = target.toLowerCase();
      if (room?.examineTargets?.[normalizedTarget]) {
        return {
          type: 'examine',
          target,
          text: room.examineTargets[normalizedTarget]
        };
      }
    }

    let itemId = this._resolveItemId(target, gameState);

    // If we can't resolve the target, try the last-examined item as context
    // (e.g. player examines photo, then asks "who is the person in the photo")
    if (!itemId && gameState.lastExaminedItem) {
      const lastDef = this.inv.getItemDef(gameState.lastExaminedItem);
      if (lastDef && target) {
        const lastText = (lastDef.examineDetail || lastDef.description || '').toLowerCase();
        const targetWords = target.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
        if (targetWords.some(w => lastText.includes(w))) {
          itemId = gameState.lastExaminedItem;
        }
      }
    }

    if (!itemId) {
      const room = this.nav.getRoom(gameState.currentRoom);
      if (room && room.examineTargets && room.examineTargets[target!]) {
        return {
          type: 'examine',
          target: target || undefined,
          text: room.examineTargets[target!]
        };
      }

      // Check if the target is mentioned in the room description — scenery the player can ask about
      if (target && room) {
        // Check against full description (including firstVisit) for matching
        const fullDesc = this.nav.getRoomDescription(room.id, gameState);
        const fullDescLower = fullDesc.toLowerCase();
        const normalizedTarget = target.toLowerCase();

        // Try exact match first, then individual significant words (3+ chars)
        const targetWords = normalizedTarget.split(/\s+/).filter(w => w.length >= 3);
        const mentioned = fullDescLower.includes(normalizedTarget) ||
          targetWords.some(w => fullDescLower.includes(w));

        if (mentioned) {
          // Pass only the base room.description to Haiku — NOT the firstVisit narration
          return {
            type: 'examine_scenery',
            target: target,
            originalInput: rawInput || target,
            roomDescription: room.description,
            roomName: room.name,
            message: `You look more closely at the ${target}.`
          };
        }
      }

      return { type: 'examine_failed', message: `You don't see any ${target} here.` };
    }

    const result = this.inv.examine(itemId, gameState);
    if (!result.allowed) {
      return { type: 'examine_failed', message: result.reason };
    }

    // Track what was last examined for follow-up questions
    gameState.lastExaminedItem = itemId;

    // If the player asked a question about the item (not just "examine X"), route to Haiku
    if (rawInput && /^(who|what|why|how|where|when|is |are |can |could |does |do |was |were |tell )/i.test(rawInput)) {
      const room = this.nav.getRoom(gameState.currentRoom);
      return {
        type: 'examine_scenery',
        target: result.item!.name,
        originalInput: rawInput,
        roomDescription: result.text || '',
        roomName: room?.name || '',
        message: result.text || `You look at the ${result.item!.name}.`
      };
    }

    return { type: 'examine', target: result.item!.name, text: result.text, itemId };
  }

  _handleTake(target: string | null, gameState: GameState): ActionResult {
    // Check cantTake scenery first — things described in room that can't be picked up
    if (target) {
      const room = this.nav.getRoom(gameState.currentRoom);
      if (room?.cantTake) {
        const normalized = target.toLowerCase();
        const cantMsg = room.cantTake[normalized];
        if (cantMsg) return { type: 'take_failed', message: cantMsg };
      }
    }

    const itemId = this._resolveItemId(target, gameState);
    if (!itemId) return { type: 'take_failed', message: `You don't see any ${target} here.` };

    const result = this.inv.pickUp(itemId, gameState);
    return result.allowed
      ? { type: 'take_success', itemId, itemName: result.item!.name, message: result.message }
      : { type: 'take_failed', message: result.reason };
  }

  _handleDrop(target: string | null, gameState: GameState): ActionResult {
    const itemId = this._resolveInventoryItem(target, gameState);
    if (!itemId) return { type: 'drop_failed', message: `You're not carrying "${target}".` };

    const result = this.inv.drop(itemId, gameState);
    return result.allowed
      ? { type: 'drop_success', itemId, message: result.message }
      : { type: 'drop_failed', message: result.reason };
  }

  _handleInventory(gameState: GameState): ActionResult {
    const items = this.inv.getInventory(gameState);
    const weight = this.inv.getCarryWeight(gameState);
    const equipped = (gameState.equipped || []).map(id => this.inv.getItemDef(id)).filter(Boolean) as ItemDef[];

    return {
      type: 'inventory',
      items: items.map(i => ({ id: i.id, name: i.name, weight: i.weight })),
      equipped: equipped.map(i => ({ id: i.id, name: i.name })),
      totalWeight: weight,
      maxWeight: 25
    };
  }

  _handleUse(target: string | null, instrument: string | null, gameState: GameState): ActionResult {
    const itemId = this._resolveInventoryItem(target, gameState);
    if (!itemId) return { type: 'use_failed', message: `You're not carrying "${target}".` };

    if (instrument) {
      const targetId = this._resolveItemId(instrument, gameState) || instrument;
      const result = this.inv.useItem(itemId, targetId, gameState);
      return result.allowed
        ? { type: 'use_success', message: result.message, systemChange: result.systemChange }
        : { type: 'use_failed', message: result.reason };
    }

    const roomId = gameState.currentRoom;
    const result = this.inv.useItem(itemId, roomId, gameState);
    return result.allowed
      ? { type: 'use_success', message: result.message, systemChange: result.systemChange }
      : { type: 'use_failed', message: result.reason };
  }

  _handleCombine(item1: string | null, item2: string | null, gameState: GameState): ActionResult {
    const id1 = this._resolveInventoryItem(item1, gameState);
    const id2 = this._resolveInventoryItem(item2, gameState);
    if (!id1) return { type: 'combine_failed', message: `You're not carrying "${item1}".` };
    if (!id2) return { type: 'combine_failed', message: `You're not carrying "${item2}".` };

    const result = this.inv.combine(id1, id2, gameState);
    return result.allowed
      ? { type: 'combine_success', message: result.message, created: result.created ? result.created.name : null }
      : { type: 'combine_failed', message: result.reason };
  }

  _handleEquip(target: string | null, gameState: GameState): ActionResult {
    const itemId = this._resolveInventoryItem(target, gameState);
    if (!itemId) return { type: 'equip_failed', message: `You're not carrying "${target}".` };

    const result = this.inv.equip(itemId, gameState);
    return result.allowed
      ? { type: 'equip_success', message: result.message }
      : { type: 'equip_failed', message: result.reason };
  }

  _handleUnequip(target: string | null, gameState: GameState): ActionResult {
    const itemId = this._resolveInventoryItem(target, gameState);
    if (!itemId) return { type: 'unequip_failed', message: `You're not wearing "${target}".` };

    const result = this.inv.unequip(itemId, gameState);
    return result.allowed
      ? { type: 'unequip_success', message: result.message }
      : { type: 'unequip_failed', message: result.reason };
  }

  _handleOpen(target: string | null, gameState: GameState): ActionResult {
    const room = this.nav.getRoom(gameState.currentRoom);
    if (room && room.openTargets && room.openTargets[target!]) {
      const openResult = room.openTargets[target!];
      if (openResult.revealsItem) {
        gameState.itemHidden[openResult.revealsItem] = false;
      }
      if (openResult.flags) {
        Object.assign(gameState.flags, openResult.flags);
      }
      return { type: 'open_success', message: openResult.message };
    }

    const itemId = this._resolveItemId(target, gameState);
    if (itemId) {
      const def = this.inv.getItemDef(itemId);
      if (def && def.openable) {
        if (def.openReveals) {
          for (const revealId of def.openReveals) {
            gameState.itemHidden[revealId] = false;
          }
        }
        return { type: 'open_success', message: def.openMessage || `You open the ${def.name}.` };
      }
    }

    return { type: 'open_failed', message: `You can't open "${target}".` };
  }

  _handleRead(target: string | null, gameState: GameState): ActionResult {
    const itemId = this._resolveItemId(target, gameState);
    if (!itemId) return { type: 'read_failed', message: `You don't see any ${target} to read.` };

    const def = this.inv.getItemDef(itemId);
    if (!def) return { type: 'read_failed', message: "That doesn't exist." };

    if (def.readable) {
      if (def.readReveals) {
        Object.assign(gameState.flags, def.readReveals);
      }
      return { type: 'read_success', text: def.readText || def.examineDetail || def.description, itemName: def.name };
    }

    return { type: 'read_failed', message: `There's nothing to read on the ${def.name}.` };
  }

  _handleStatus(gameState: GameState): ActionResult {
    return {
      type: 'status',
      health: gameState.playerHealth || 100,
      radiation: gameState.radiationExposure || 0,
      location: gameState.currentRoom,
      act: gameState.currentAct,
      turnCount: gameState.turnCount,
      co2Level: this._getShipValue(gameState, 'life_support.subsystems.co2_scrubbers.co2_ppm') as number | null,
      powerLevel: this._getShipValue(gameState, 'power.subsystems.battery_backup.charge') as number | null,
      hullIntegrity: this._getShipValue(gameState, 'hull.primary_hull.status') as string | null
    };
  }

  _handleSystems(gameState: GameState): ActionResult {
    const systems = gameState.shipSystems;
    const summary: Record<string, { name: string; status: string }> = {};
    for (const [key, sys] of Object.entries((systems as unknown as Record<string, unknown>).systems || systems)) {
      if (typeof sys === 'object' && sys !== null && 'name' in (sys as Record<string, unknown>)) {
        const s = sys as { name: string; status: string };
        summary[key] = { name: s.name, status: s.status };
      }
    }
    return { type: 'systems', systems: summary };
  }

  _handleHint(gameState: GameState): ActionResult {
    const activePuzzles = this.puzzle.getActivePuzzles(gameState);
    if (activePuzzles.length === 0) {
      return { type: 'hint', message: 'Look around. Examine everything. The ship will tell you what needs fixing.' };
    }
    const hints = activePuzzles.map(p => ({
      puzzleName: p.name,
      hint: this.puzzle.getHint(p.id, gameState)
    }));
    return { type: 'hint', hints };
  }

  _handleWait(gameState: GameState): ActionResult {
    return { type: 'wait', message: 'Time passes...' };
  }

  _handlePuzzleAction(puzzleId: string | null, value: string | null, gameState: GameState): ActionResult {
    const result = this.puzzle.attemptStep(puzzleId!, value || '', gameState);
    return {
      type: result.success ? 'puzzle_success' : 'puzzle_failed',
      puzzleId: puzzleId || undefined,
      ...result
    };
  }

  _handleSearch(target: string | null, gameState: GameState, rawInput?: string): ActionResult {
    if (!target || target === 'room' || target === 'around') {
      const items = this.inv.getItemsInRoom(gameState.currentRoom, gameState);
      const hiddenItems = items.filter(i => i.hidden);

      if (hiddenItems.length > 0) {
        const revealed = hiddenItems[0];
        gameState.itemHidden[revealed.id] = false;
        return {
          type: 'search_success',
          message: `You search carefully and find: ${revealed.name}.`,
          foundItem: revealed.name
        };
      }
      return { type: 'search_nothing', message: "You search thoroughly but find nothing new." };
    }

    // "where X" — check if it's in inventory, current room, or a visited room
    const itemId = this._resolveItemId(target, gameState);
    if (itemId) {
      // In inventory?
      if (gameState.inventory.includes(itemId)) {
        const item = this.inv.getItemDef(itemId);
        return { type: 'search_success', message: `You have the ${item?.name || target} in your inventory.` };
      }
      // In current room?
      const loc = gameState.itemLocations[itemId];
      if (loc === gameState.currentRoom) {
        const item = this.inv.getItemDef(itemId);
        return { type: 'search_success', message: `The ${item?.name || target} is here.` };
      }
      // In a visited room?
      if (loc && gameState.visitedRooms.has(loc)) {
        const item = this.inv.getItemDef(itemId);
        const room = this.nav.getRoom(loc);
        return { type: 'search_success', message: `You left the ${item?.name || target} in the ${room?.name || loc}.` };
      }
    }

    return this._handleExamine(target, gameState, rawInput);
  }

  _handleTalk(target: string | null, gameState: GameState): ActionResult {
    return { type: 'talk', message: "There's no one here to talk to. The ship is silent.", target: target || undefined };
  }

  _handleMap(gameState: GameState): ActionResult {
    const visited = [...gameState.visitedRooms];
    const rooms = visited.map(id => {
      const room = this.nav.getRoom(id);
      return room ? { id, name: room.name, deck: room.deck } : null;
    }).filter(Boolean) as Array<{ id: string; name: string; deck: string }>;

    const deckMap: Record<string, Array<{ id: string; name: string; deck: string }>> = {};
    for (const room of rooms) {
      if (!deckMap[room.deck]) deckMap[room.deck] = [];
      deckMap[room.deck].push(room);
    }

    // Build mapRooms with exit data for spatial rendering
    const mapRooms: Array<{ id: string; name: string; deck: string; exits: Record<string, string> }> = [];
    for (const id of visited) {
      const room = this.nav.getRoom(id);
      if (!room) continue;
      const exits: Record<string, string> = {};
      for (const [dir, exit] of Object.entries(room.exits)) {
        const hidden = typeof exit === 'object' && exit.hidden;
        if (!hidden || gameState.flags[`revealed_${id}_${dir}`]) {
          exits[dir] = typeof exit === 'string' ? exit : exit.roomId;
        }
      }
      mapRooms.push({ id, name: room.name, deck: room.deck, exits });
    }

    return {
      type: 'map',
      currentRoom: gameState.currentRoom,
      visited: deckMap,
      mapRooms
    };
  }

  _handleHelp(): ActionResult {
    return {
      type: 'help',
      message: `Available commands:
MOVEMENT: fore/f, aft/a, port/p, starboard/sb, up/u, down/d, in, out
LOOK:     look, examine [thing], read [document], search
ITEMS:    take [item], drop [item], inventory/i, equip [item]
USE:      use [item] on [target], combine [item] with [item]
          open [thing], turn on/off [thing]
INFO:     status, date, systems, map/m, hint
GAME:     save [name], load [name], saves, help, wait
AUDIO:    audio (toggle), volume [0-100]

Tips:
  Examine everything — descriptions contain clues.
  Items can be combined together or used on things in the room.
  Search rooms carefully — not everything is visible at first.
  Some problems need the right tool. Check your inventory.
  If something looks broken, you might have what you need to fix it.
  Commands can be abbreviated: exa, inv, sta, sys, etc.
  You can ask questions: "where wrench", "what is this"`
    };
  }

  _handleUnknown(intent: Intent, gameState: GameState): ActionResult {
    // Try to be helpful — look for any noun-like word that matches something in the room or inventory
    if (intent.raw) {
      const words = intent.raw.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
      for (const word of words) {
        const itemId = this._resolveItemId(word, gameState);
        if (itemId) {
          return this._handleExamine(word, gameState);
        }
      }
    }

    return {
      type: 'unknown',
      message: "You can't do that here. Try 'look' to see your surroundings, or 'help' for available commands.",
      originalInput: intent.raw
    };
  }

  _resolveItemId(name: string | null, gameState: GameState): string | null {
    if (!name) return null;
    const normalized = name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

    // Score inventory matches to find the best one
    let bestInvMatch: { id: string; score: number } | null = null;
    for (const id of gameState.inventory) {
      const def = this.inv.getItemDef(id);
      if (!def) continue;
      const score = this._nameMatchScore(normalized, def);
      if (score > 0 && (!bestInvMatch || score > bestInvMatch.score)) {
        bestInvMatch = { id, score };
      }
    }

    // Check all room items — hidden items are findable by name (described in room text)
    // but they get auto-revealed when the player explicitly references them
    // Score matches to pick the best one (more matching words = better)
    const roomItems = this.inv.getItemsInRoom(gameState.currentRoom, gameState);
    let bestRoomMatch: { id: string; score: number } | null = null;
    for (const item of roomItems) {
      const score = this._nameMatchScore(normalized, item);
      if (score > 0 && (!bestRoomMatch || score > bestRoomMatch.score)) {
        bestRoomMatch = { id: item.id, score };
      }
    }
    // Return the best match — room wins over inventory if better score
    if (bestRoomMatch && bestInvMatch) {
      if (bestRoomMatch.score >= bestInvMatch.score) {
        const item = roomItems.find(i => i.id === bestRoomMatch!.id)!;
        if (item.hidden) gameState.itemHidden[item.id] = false;
        return bestRoomMatch.id;
      }
      return bestInvMatch.id;
    }
    if (bestRoomMatch) {
      const item = roomItems.find(i => i.id === bestRoomMatch!.id)!;
      if (item.hidden) gameState.itemHidden[item.id] = false;
      return bestRoomMatch.id;
    }
    if (bestInvMatch) return bestInvMatch.id;

    if (this.inv.getItemDef(normalized)) return normalized;
    const underscored = normalized.replace(/ /g, '_');
    if (this.inv.getItemDef(underscored)) return underscored;

    // Spelling correction: check inventory first, then room items.
    // A better match in the room wins over a poorer match in inventory.
    if (normalized.length >= 3) {
      let bestId: string | null = null;
      let bestDist = Infinity;

      // Max allowed distance scales with word length: 1 for short words, 2 for longer
      const maxDist = normalized.length <= 5 ? 1 : 2;

      // Check inventory first, then room items
      const invCandidates = gameState.inventory;
      const roomCandidates = roomItems.map(i => i.id);

      for (const candidateList of [invCandidates, roomCandidates]) {
        for (const id of candidateList) {
          const def = this.inv.getItemDef(id);
          if (!def) continue;
          const names = [def.id, def.name.toLowerCase(), ...(def.aliases || []).map(a => a.toLowerCase())];
          for (const n of names) {
            // Only compare words of similar length (avoid matching "gel" to "medical kit")
            if (Math.abs(normalized.length - n.length) > maxDist) continue;
            const dist = levenshtein(normalized, n);
            if (dist > 0 && dist <= maxDist && dist < bestDist) {
              bestDist = dist;
              bestId = id;
            }
          }
        }
      }
      if (bestId) return bestId;
    }

    return null;
  }

  _resolveInventoryItem(name: string | null, gameState: GameState): string | null {
    if (!name) return null;
    const normalized = name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

    for (const id of gameState.inventory) {
      const def = this.inv.getItemDef(id);
      if (def && this._nameMatches(normalized, def)) return id;
    }

    return null;
  }

  _nameMatches(input: string, itemDef: ItemDef): boolean {
    return this._nameMatchScore(input, itemDef) > 0;
  }

  /** Score how well an input matches an item. Higher = better. 0 = no match. */
  _nameMatchScore(input: string, itemDef: ItemDef): number {
    const id = itemDef.id.toLowerCase();
    const name = itemDef.name.toLowerCase();
    const aliases = (itemDef.aliases || []).map(a => a.toLowerCase());

    // Exact match on name or alias — highest score
    if (input === name) return 100;
    if (aliases.some(a => a === input)) return 95;
    if (input === id || input.replace(/ /g, '_') === id) return 90;

    // Input is a substring of name/alias or vice versa
    if (name.includes(input)) return 80;
    if (aliases.some(a => a.includes(input))) return 75;
    if (id.includes(input)) return 70;

    // Word-level matching: count how many input words match item words
    const inputWords = input.split(/[\s_]+/).filter(w => w.length >= 3);
    if (inputWords.length === 0) return 0;

    const nameWords = name.split(/[\s_]+/).filter(w => w.length >= 3);
    const idWords = id.split(/[\s_]+/).filter(w => w.length >= 3);
    const aliasWords = aliases.flatMap(a => a.split(/[\s_]+/).filter(w => w.length >= 3));
    const allItemWords = new Set([...nameWords, ...idWords, ...aliasWords]);

    const matchCount = inputWords.filter(iw => allItemWords.has(iw)).length;
    if (matchCount === 0) return 0;

    // Score based on proportion of input words that matched
    // "personal photograph" matching "Personal Photograph" = 2/2 = 50
    // "personal photograph" matching "Personal Datapad" = 1/2 = 25
    return Math.round((matchCount / inputWords.length) * 50);
  }

  /**
   * Evaluate an intent against game state WITHOUT side effects.
   * Returns true if this intent would produce a successful result.
   * Used for disambiguation: test all candidate interpretations against
   * the current game state, keep only the ones that work.
   */
  wouldSucceed(intent: Intent, gameState: GameState): boolean {
    const action = intent.action;
    const target = intent.target;

    switch (action) {
      case 'move': {
        if (!target) return false;
        const result = this.nav.canMove(gameState.currentRoom, target, gameState);
        return result.allowed;
      }
      case 'examine': {
        if (!target) return true; // bare "look" always succeeds
        // Check item in room/inventory
        const itemId = this._resolveItemId(target, { ...gameState, itemHidden: { ...gameState.itemHidden } });
        if (itemId) return true;
        // Check examineTargets
        const room = this.nav.getRoom(gameState.currentRoom);
        if (room?.examineTargets?.[target]) return true;
        // Check scenery (mentioned in room description)
        if (room) {
          const desc = this.nav.getRoomDescription(room.id, gameState).toLowerCase();
          const targetLower = target.toLowerCase();
          if (desc.includes(targetLower) || targetLower.split(/\s+/).filter(w => w.length >= 3).some(w => desc.includes(w))) {
            return true;
          }
        }
        return false;
      }
      case 'take': case 'get': case 'pick_up': {
        if (!target) return false;
        const itemId = this._resolveItemId(target, { ...gameState, itemHidden: { ...gameState.itemHidden } });
        return itemId !== null;
      }
      case 'use': case 'activate': case 'deactivate': {
        if (!target) return false;
        // Check if target is in inventory or room
        const itemId = this._resolveItemId(target, { ...gameState, itemHidden: { ...gameState.itemHidden } });
        return itemId !== null;
      }
      case 'look': return true;
      case 'inventory': case 'status': case 'help': case 'systems':
      case 'hint': case 'wait': case 'map': case 'saves':
        return true;
      case 'save': case 'load':
        return true;
      default:
        return false;
    }
  }

  /**
   * Given an intent with alternatives, evaluate all candidates against game state.
   * Returns the best valid intent, or the primary if none are clearly better.
   * If multiple alternatives are valid, attaches them for potential disambiguation.
   */
  disambiguate(intent: Intent, gameState: GameState): Intent {
    if (!intent.alternatives?.length) return intent;

    const allCandidates = [intent, ...intent.alternatives];
    const valid: Intent[] = [];

    for (const candidate of allCandidates) {
      if (this.wouldSucceed(candidate, gameState)) {
        valid.push(candidate);
      }
    }

    if (valid.length === 0) {
      // Nothing works — return primary for error message, strip alternatives
      const { alternatives: _, ...primary } = intent;
      return primary as Intent;
    }

    if (valid.length === 1) {
      // Exactly one works — use it, strip alternatives (unambiguous)
      const { alternatives: _, ...resolved } = valid[0];
      return resolved as Intent;
    }

    // Multiple valid interpretations — return highest confidence, attach rest as alternatives
    valid.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    const best = { ...valid[0] };
    best.alternatives = valid.slice(1);
    return best;
  }

  _getShipValue(gameState: GameState, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = gameState.shipSystems;
    if (current && typeof current === 'object' && 'systems' in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>).systems;
    }
    for (const part of parts) {
      if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return null;
      }
    }
    return current;
  }
}

export default CommandProcessor;

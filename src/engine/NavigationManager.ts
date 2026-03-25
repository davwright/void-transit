import { Room, RoomExit, GameState, MoveResult } from '../types';

interface ExitInfo {
  direction: string;
  targetId: string;
  accessible: boolean;
}

class NavigationManager {
  rooms: Map<string, Room>;

  constructor(rooms: Room[]) {
    this.rooms = new Map<string, Room>();
    for (const room of rooms) {
      this.rooms.set(room.id, room);
    }
  }

  getRoom(roomId: string): Room | null {
    return this.rooms.get(roomId) || null;
  }

  canMove(fromRoomId: string, direction: string, gameState: GameState): MoveResult {
    const room = this.rooms.get(fromRoomId);
    if (!room) return { allowed: false, reason: 'You are nowhere.' };

    // Try full direction name first, then short alias
    let exit: string | RoomExit | undefined = room.exits[direction];
    if (!exit) {
      const short = this._shortDir(direction);
      if (short && short !== direction) exit = room.exits[short];
    }
    if (!exit) {
      const long = this._longDir(direction);
      if (long && long !== direction) exit = room.exits[long];
    }
    if (!exit) {
      return { allowed: false, reason: this._noExitMessage(direction) };
    }

    const targetId = typeof exit === 'string' ? exit : exit.roomId;
    const conditions = typeof exit === 'object' ? exit.conditions : null;

    if (conditions) {
      for (const [key, value] of Object.entries(conditions)) {
        if (!this.checkCondition(key, value, gameState)) {
          const blockMessage = typeof exit === 'object' && exit.blockedMessage
            ? exit.blockedMessage
            : `You can't go that way right now.`;
          return { allowed: false, reason: blockMessage };
        }
      }
    }

    const targetRoom = this.rooms.get(targetId);
    if (!targetRoom) return { allowed: false, reason: 'That way leads nowhere.' };

    if (targetRoom.conditions && targetRoom.conditions.enter) {
      for (const [key, value] of Object.entries(targetRoom.conditions.enter)) {
        if (!this.checkCondition(key, value, gameState)) {
          const msg = targetRoom.conditions.enterBlockedMessage || `Something prevents you from entering.`;
          return { allowed: false, reason: msg };
        }
      }
    }

    return { allowed: true, targetId, targetRoom };
  }

  move(fromRoomId: string, direction: string, gameState: GameState): MoveResult {
    const check = this.canMove(fromRoomId, direction, gameState);
    if (!check.allowed) return check;

    const isFirstVisit = !gameState.visitedRooms.has(check.targetId!);
    if (isFirstVisit) {
      gameState.visitedRooms.add(check.targetId!);
    }

    return {
      allowed: true,
      roomId: check.targetId,
      room: check.targetRoom,
      isFirstVisit
    };
  }

  getExits(roomId: string): string[] {
    const room = this.rooms.get(roomId);
    if (!room || !room.exits) return [];
    return Object.keys(room.exits);
  }

  getVisibleExits(roomId: string, gameState: GameState): ExitInfo[] {
    const room = this.rooms.get(roomId);
    if (!room || !room.exits) return [];

    const exits: ExitInfo[] = [];
    for (const [dir, exit] of Object.entries(room.exits)) {
      const targetId = typeof exit === 'string' ? exit : exit.roomId;
      const hidden = typeof exit === 'object' && exit.hidden;
      const displayDir = this._longDir(dir);
      if (!hidden || (hidden && gameState.flags[`revealed_${roomId}_${dir}`])) {
        exits.push({ direction: displayDir, targetId, accessible: this.canMove(roomId, displayDir, gameState).allowed });
      }
    }
    return exits;
  }

  getRoomDescription(roomId: string, gameState: GameState): string {
    const room = this.rooms.get(roomId);
    if (!room) return 'You are in an undefined space.';

    let desc = room.description;
    const isFirstVisit = !gameState.visitedRooms.has(roomId);
    if (isFirstVisit && room.firstVisit) {
      desc = room.firstVisit + '\n\n' + desc;
    }

    if (room.conditionalDescriptions) {
      for (const cd of room.conditionalDescriptions) {
        if (this.checkCondition(cd.condition.key, cd.condition.value, gameState)) {
          desc += '\n\n' + cd.text;
        }
      }
    }

    return desc;
  }

  checkCondition(key: string, value: boolean | string, gameState: GameState): boolean {
    if (key.startsWith('has_')) {
      const itemId = key.substring(4);
      return gameState.inventory.includes(itemId) === value;
    }
    if (key.startsWith('equipped_')) {
      const itemId = key.substring(9);
      return (gameState.equipped || []).includes(itemId) === value;
    }
    if (key.startsWith('flag_')) {
      const flag = key.substring(5);
      return (gameState.flags[flag] || false) === value;
    }
    if (key.startsWith('puzzle_')) {
      const puzzleId = key.substring(7);
      return (gameState.puzzleStates[puzzleId] === 'solved') === value;
    }
    if (key.startsWith('system_')) {
      return this._checkSystemCondition(key.substring(7), value, gameState);
    }
    return gameState.flags[key] === value;
  }

  _checkSystemCondition(path: string, value: boolean | string, gameState: GameState): boolean {
    const parts = path.split('.');
    let current: unknown = gameState.shipSystems;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return false;
      }
    }
    return current === value;
  }

  _noExitMessage(direction: string): string {
    const display = this._longDir(direction) || direction;
    const messages: Record<string, string> = {
      fore: 'Nothing lies fore.',
      aft: 'Nothing lies aft.',
      port: 'Nothing lies to port.',
      starboard: 'Nothing lies to starboard.',
      up: 'There is nothing above you.',
      down: 'There is nothing below you.',
      in: 'There is nothing to enter here.',
      out: 'There is no way out in that direction.'
    };
    return messages[display] || `You can't go ${direction}.`;
  }

  // Direction display helpers — room data uses 'n','s','e','w', display uses nautical
  _shortDir(dir: string): string {
    const map: Record<string, string> = { north: 'n', south: 's', east: 'e', west: 'w', fore: 'n', aft: 's', port: 'w', starboard: 'e', up: 'up', down: 'down', in: 'in', out: 'out' };
    return map[dir] || dir;
  }

  _longDir(dir: string): string {
    const map: Record<string, string> = { n: 'fore', s: 'aft', e: 'starboard', w: 'port', north: 'fore', south: 'aft', east: 'starboard', west: 'port', u: 'up', d: 'down' };
    return map[dir] || dir;
  }
}

export default NavigationManager;

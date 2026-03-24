/**
 * Browser save manager — uses localStorage instead of filesystem.
 * Same interface as SaveManager for the engine.
 */

import { GameState } from '../types';
import { encodeObject, decodeObject } from '../encoding';

const SAVE_PREFIX = 'vt_save_';

interface SaveData {
  version: number;
  timestamp: string;
  slotName: string;
  turnCount: number;
  currentRoom: string;
  actId: string;
  state: SerializedState;
}

interface SerializedState {
  currentRoom: string;
  previousRoom: string | null;
  inventory: string[];
  equipped: string[];
  itemLocations: Record<string, string>;
  itemHidden: Record<string, boolean>;
  itemProperties: Record<string, Record<string, unknown>>;
  flags: Record<string, boolean | string>;
  visitedRooms: string[];
  puzzleStates: Record<string, string>;
  puzzleProgress: Record<string, number>;
  puzzleAttempts: Record<string, number>;
  shipSystems: unknown;
  currentAct: string;
  storyBeatsTriggered: string[];
  turnCount: number;
  playerHealth: number;
  radiationExposure: number;
  conversationHistory: Array<{ turn: number; intent: unknown; resultType: string }>;
  globalEvents: string[];
  worldLore: Record<string, string>;
}

class BrowserSaveManager {
  save(gameState: GameState, slotName: string): { success: boolean; reason?: string; filename?: string; timestamp?: string } {
    const saveData: SaveData = {
      version: 1,
      timestamp: new Date().toISOString(),
      slotName,
      turnCount: gameState.turnCount,
      currentRoom: gameState.currentRoom,
      actId: gameState.currentAct,
      state: this._serializeState(gameState),
    };

    const key = SAVE_PREFIX + this._sanitize(slotName);
    const encoded = encodeObject(saveData);
    localStorage.setItem(key, JSON.stringify(encoded));

    return { success: true, filename: key, timestamp: saveData.timestamp };
  }

  load(slotName: string): { success: boolean; reason?: string; state?: GameState; metadata?: any } {
    const key = SAVE_PREFIX + this._sanitize(slotName);
    const raw = localStorage.getItem(key);

    if (!raw) return { success: false, reason: `Save "${slotName}" not found.` };

    const parsed = JSON.parse(raw);
    // Detect old vs new format
    const isEncoded = !('version' in parsed) && !('state' in parsed);
    const saveData: SaveData = isEncoded ? decodeObject(parsed) : parsed;

    return {
      success: true,
      state: this._deserializeState(saveData.state),
      metadata: {
        timestamp: saveData.timestamp,
        slotName: saveData.slotName,
        turnCount: saveData.turnCount,
        currentRoom: saveData.currentRoom,
        actId: saveData.actId,
      },
    };
  }

  autosave(gameState: GameState) {
    return this.save(gameState, '_autosave');
  }

  listSaves(): Array<{ slotName: string; filename: string; timestamp: string; turnCount: number; currentRoom: string; actId: string }> {
    const saves: Array<{ slotName: string; filename: string; timestamp: string; turnCount: number; currentRoom: string; actId: string }> = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(SAVE_PREFIX)) continue;

      try {
        const raw = localStorage.getItem(key)!;
        const parsed = JSON.parse(raw);
        const isEncoded = !('version' in parsed) && !('state' in parsed);
        const data: SaveData = isEncoded ? decodeObject(parsed) : parsed;

        saves.push({
          slotName: data.slotName,
          filename: key,
          timestamp: data.timestamp,
          turnCount: data.turnCount,
          currentRoom: data.currentRoom,
          actId: data.actId,
        });
      } catch { /* skip bad entries */ }
    }

    return saves.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  deleteSave(slotName: string): { success: boolean } {
    const key = SAVE_PREFIX + this._sanitize(slotName);
    localStorage.removeItem(key);
    return { success: true };
  }

  _serializeState(gameState: GameState): SerializedState {
    return {
      currentRoom: gameState.currentRoom,
      previousRoom: gameState.previousRoom,
      inventory: [...gameState.inventory],
      equipped: [...(gameState.equipped || [])],
      itemLocations: { ...gameState.itemLocations },
      itemHidden: { ...gameState.itemHidden },
      itemProperties: JSON.parse(JSON.stringify(gameState.itemProperties || {})),
      flags: { ...gameState.flags },
      visitedRooms: [...gameState.visitedRooms],
      puzzleStates: { ...gameState.puzzleStates },
      puzzleProgress: { ...gameState.puzzleProgress },
      puzzleAttempts: { ...(gameState.puzzleAttempts || {}) },
      shipSystems: JSON.parse(JSON.stringify(gameState.shipSystems)),
      currentAct: gameState.currentAct,
      storyBeatsTriggered: [...(gameState.storyBeatsTriggered || [])],
      turnCount: gameState.turnCount,
      playerHealth: gameState.playerHealth,
      radiationExposure: gameState.radiationExposure || 0,
      conversationHistory: (gameState.conversationHistory || []).slice(-20),
      globalEvents: [...(gameState.globalEvents || [])],
      worldLore: { ...(gameState.worldLore || {}) },
    };
  }

  _deserializeState(saved: SerializedState): GameState {
    return {
      ...saved,
      visitedRooms: new Set(saved.visitedRooms),
      conversationHistory: saved.conversationHistory || [],
      worldLore: saved.worldLore || {},
    } as GameState;
  }

  _sanitize(name: string): string {
    return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
  }
}

export default BrowserSaveManager;

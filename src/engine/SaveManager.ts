import { GameState } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import config from '../config';
import { encodeObject, decodeObject } from '../encoding';

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

interface SaveResult {
  success: boolean;
  reason?: string;
  filename?: string;
  timestamp?: string;
}

interface LoadResult {
  success: boolean;
  reason?: string;
  state?: GameState;
  metadata?: {
    timestamp: string;
    slotName: string;
    turnCount: number;
    currentRoom: string;
    actId: string;
  };
}

interface SaveListEntry {
  slotName: string;
  filename: string;
  timestamp: string;
  turnCount: number;
  currentRoom: string;
  actId: string;
}

class SaveManager {
  savesDir: string;

  constructor() {
    this.savesDir = config.savesDir;
    this._ensureDir();
  }

  _ensureDir(): void {
    if (!fs.existsSync(this.savesDir)) {
      fs.mkdirSync(this.savesDir, { recursive: true });
    }
  }

  save(gameState: GameState, slotName: string): SaveResult {
    const saveData: SaveData = {
      version: 1,
      timestamp: new Date().toISOString(),
      slotName,
      turnCount: gameState.turnCount,
      currentRoom: gameState.currentRoom,
      actId: gameState.currentAct,
      state: this._serializeState(gameState)
    };

    const filename = `${this._sanitize(slotName)}.json`;
    const filepath = path.join(this.savesDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(encodeObject(saveData), null, 2), 'utf-8');

    return { success: true, filename, timestamp: saveData.timestamp };
  }

  load(slotName: string): LoadResult {
    const filename = `${this._sanitize(slotName)}.json`;
    const filepath = path.join(this.savesDir, filename);

    if (!fs.existsSync(filepath)) {
      return { success: false, reason: `Save file "${slotName}" not found.` };
    }

    const raw = fs.readFileSync(filepath, 'utf-8');
    const parsed = JSON.parse(raw);
    // Detect old (plaintext) vs new (encoded) save format
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
        actId: saveData.actId
      }
    };
  }

  autosave(gameState: GameState): SaveResult {
    return this.save(gameState, '_autosave');
  }

  listSaves(): SaveListEntry[] {
    this._ensureDir();
    const files: string[] = fs.readdirSync(this.savesDir).filter((f: string) => f.endsWith('.json'));
    const saves: SaveListEntry[] = [];

    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(this.savesDir, file), 'utf-8');
        const parsed = JSON.parse(raw);
        const isEncoded = !('version' in parsed) && !('state' in parsed);
        const data: SaveData = isEncoded ? decodeObject(parsed) : parsed;
        saves.push({
          slotName: data.slotName,
          filename: file,
          timestamp: data.timestamp,
          turnCount: data.turnCount,
          currentRoom: data.currentRoom,
          actId: data.actId
        });
      } catch {
        // Skip corrupted save files
      }
    }

    return saves.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  deleteSave(slotName: string): { success: boolean; reason?: string } {
    const filename = `${this._sanitize(slotName)}.json`;
    const filepath = path.join(this.savesDir, filename);

    if (!fs.existsSync(filepath)) {
      return { success: false, reason: 'Save not found.' };
    }

    fs.unlinkSync(filepath);
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
      conversationHistory: (gameState.conversationHistory || []).slice(-config.maxTurnHistory),
      globalEvents: [...(gameState.globalEvents || [])],
      worldLore: { ...(gameState.worldLore || {}) }
    };
  }

  _deserializeState(saved: SerializedState): GameState {
    return {
      ...saved,
      visitedRooms: new Set(saved.visitedRooms),
      conversationHistory: saved.conversationHistory || [],
      worldLore: saved.worldLore || {}
    } as GameState;
  }

  _sanitize(name: string): string {
    return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
  }
}

export default SaveManager;

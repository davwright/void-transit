// === Core Game Types ===

export interface RoomExit {
  roomId: string;
  conditions?: Record<string, boolean | string>;
  blockedMessage?: string;
  hidden?: boolean;
}

export interface Room {
  id: string;
  name: string;
  deck: string;
  description: string;
  exits: Record<string, string | RoomExit>;
  items: string[];
  conditions?: {
    enter?: Record<string, boolean | string>;
    enterBlockedMessage?: string;
  };
  firstVisit?: string;
  conditionalDescriptions?: Array<{
    condition: { key: string; value: boolean | string };
    text: string;
  }>;
  examineTargets?: Record<string, string>;
  /** Map of scenery target → item IDs to reveal when that target is examined */
  revealsOnExamine?: Record<string, string[]>;
  cantTake?: Record<string, string>;
  openTargets?: Record<string, {
    message: string;
    revealsItem?: string;
    flags?: Record<string, boolean>;
  }>;
}

export interface ItemUse {
  target: string;
  message?: string;
  failMessage?: string;
  requiresCondition?: Record<string, boolean | string>;
  setsFlags?: Record<string, boolean>;
  consumesItem?: boolean;
  grantsItem?: string;
  systemChange?: Record<string, unknown>;
}

export interface ItemCombination {
  with: string;
  creates: string;
  description?: string;
  flags?: Record<string, boolean>;
}

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  portable: boolean;
  weight: number;
  location: string;
  hidden: boolean;
  equippable?: boolean;
  usableWith?: ItemUse[];
  combinable?: ItemCombination[];
  properties?: Record<string, unknown>;
  examineDetail?: string;
  aliases?: string[];
  revealsOnExamine?: string[];
  revealsFlag?: Record<string, boolean>;
  readable?: boolean;
  readText?: string;
  readReveals?: Record<string, boolean>;
  openable?: boolean;
  openMessage?: string;
  openReveals?: string[];
}

export interface PuzzleStep {
  id: string;
  action: string;
  description: string;
  hint?: string;
  strongHint?: string;
  requiredItems?: string[];
  requiredLocation?: string;
  validation?: {
    type: 'exact' | 'numeric' | 'item_present' | 'action_match' | 'any';
    answer?: string | number;
    tolerance?: number;
    itemId?: string;
    keywords?: string[];
    failMessage?: string;
  };
  result: string;
  stateChange?: Record<string, unknown>;
  consumesItems?: string[];
  failureConsequence?: {
    damage?: number;
    stateChange?: Record<string, unknown>;
  };
  failureConsequenceText?: string;
}

export interface PuzzleDef {
  id: string;
  name: string;
  description: string;
  location: string;
  triggerRoom?: string;
  triggerConditions?: Record<string, unknown>;
  requiredItems: string[];
  steps: PuzzleStep[];
  reward?: {
    item?: string;
    flags?: Record<string, boolean>;
    stateChange?: Record<string, unknown>;
  };
  difficulty: number;
  scienceDomain: string;
  failureConsequence?: string;
}

export interface StoryBeat {
  id: string;
  text: string;
  trigger: Record<string, unknown>;
  type?: string;
  effects?: {
    flags?: Record<string, boolean>;
    revealItem?: string;
    damage?: number;
    heal?: number;
  };
}

export interface StoryAct {
  id: string;
  name: string;
  description?: string;
  tone?: string;
  triggers?: {
    start?: Record<string, unknown>;
    end?: Record<string, unknown>;
  };
  transitionText?: string;
  beats?: StoryBeat[];
}

export interface Foreshadowing {
  id: string;
  plantedIn: string;
  plantText: string;
  payoffIn: string;
  payoffText: string;
}

export interface StoryEnding {
  id: string;
  conditions: Record<string, unknown>;
  text: string;
  type: 'good' | 'bad' | 'neutral' | 'hopeful' | 'uncertain';
}

export interface GlobalEvent {
  id: string;
  trigger: Record<string, unknown>;
  text: string;
  effect?: {
    flags?: Record<string, boolean>;
    revealItem?: string;
    damage?: number;
    heal?: number;
  };
}

export interface StoryData {
  acts: StoryAct[];
  foreshadowing: Foreshadowing[];
  endings: StoryEnding[];
  globalEvents: GlobalEvent[];
}

export interface ShipSystems {
  systems: Record<string, {
    name: string;
    status: string;
    subsystems: Record<string, Record<string, unknown>>;
  }>;
  cascadeRules?: unknown[];
  tickRules?: Record<string, number>;
}

export interface GameState {
  currentRoom: string;
  previousRoom: string | null;
  inventory: string[];
  equipped: string[];
  itemLocations: Record<string, string>;
  itemHidden: Record<string, boolean>;
  itemProperties: Record<string, Record<string, unknown>>;
  flags: Record<string, boolean | string>;
  visitedRooms: Set<string>;
  puzzleStates: Record<string, string>;
  puzzleProgress: Record<string, number>;
  puzzleAttempts: Record<string, number>;
  shipSystems: ShipSystems;
  currentAct: string;
  storyBeatsTriggered: string[];
  turnCount: number;
  playerHealth: number;
  radiationExposure: number;
  conversationHistory: Array<{
    turn: number;
    intent: Intent;
    resultType: string;
  }>;
  globalEvents: string[];
  worldLore: Record<string, string>;
  lastExaminedItem?: string;
  /** Last item the player interacted with (take, examine, read, use, drop) — for pronoun resolution */
  lastReferencedItem?: string;
  /** Turn number when lastReferencedItem was set — stale after too many turns */
  lastReferencedTurn?: number;
}

export interface Intent {
  action: string;
  target: string | null;
  instrument: string | null;
  value?: string | null;
  raw: string;
  /** Confidence 0–1. 1.0 = deterministic match, <1.0 = statistical/corrected. */
  confidence?: number;
  /** Alternative interpretations, ranked by confidence (descending). */
  alternatives?: Intent[];
}

export interface MoveResult {
  allowed: boolean;
  reason?: string;
  targetId?: string;
  targetRoom?: Room;
  roomId?: string;
  room?: Room;
  isFirstVisit?: boolean;
}

export interface ActionResult {
  type: string;
  message?: string;
  description?: string;
  roomId?: string;
  roomName?: string;
  isFirstVisit?: boolean;
  items?: Array<{ id: string; name: string; weight?: number }>;
  exits?: Array<{ direction: string; accessible: boolean; targetId?: string }>;
  puzzleTriggers?: Array<{ id: string; name: string; description: string }>;
  foreshadowing?: Array<{ type: string; id: string; plantText?: string; payoffText?: string }>;
  text?: string;
  itemId?: string;
  itemName?: string;
  systemChange?: Record<string, unknown>;
  systemEvents?: Array<{ type: string; system: string; message: string }>;
  storyBeats?: Array<{ id: string; text: string; type?: string }>;
  actTransition?: { name: string; message?: string } | null;
  globalEvents?: Array<{ id: string; text: string }>;
  ending?: { id: string; text: string; type: string } | null;
  storyContext?: StoryContext;
  turnCount?: number;
  currentRoom?: string;
  // Status fields
  health?: number;
  radiation?: number;
  location?: string;
  act?: string;
  co2Level?: number | null;
  powerLevel?: number | null;
  hullIntegrity?: string | null;
  // Inventory fields
  equipped?: Array<{ id: string; name: string }>;
  totalWeight?: number;
  maxWeight?: number;
  // Systems
  systems?: Record<string, { name: string; status: string }>;
  // Puzzle
  puzzleId?: string;
  success?: boolean;
  completed?: boolean;
  reward?: unknown;
  reason?: string;
  hint?: string | null;
  consequence?: string | null;
  hints?: Array<{ puzzleName: string; hint: string | null }>;
  // Map
  visited?: Record<string, Array<{ id: string; name: string; deck: string }>>;
  mapRooms?: Array<{ id: string; name: string; deck: string; exits: Record<string, string> }>;
  // Search
  foundItem?: string;
  // Combine
  created?: string | null;
  // Read
  target?: string;
  originalInput?: string;
  // Scenery examine (non-interactive room description elements)
  roomDescription?: string;
  // Disambiguation
  candidates?: Intent[];
}

export interface StoryContext {
  actId: string;
  actName: string;
  actTone?: string;
  solvedPuzzles: string[];
  activePuzzles: string[];
  turnCount: number;
  playerHealth: number;
  knownClues: string[];
  tension: number;
}

// === Entity State System ===

export interface StateTransition {
  id: string;
  room?: string;
  condition: Record<string, boolean | string>;
  triggers: string[];
  actionKeywords: string[];
  newFlags: Record<string, boolean | string>;
  message: string;
  revealsItems?: string[];
}

export interface LookOverride {
  condition: Record<string, boolean | string>;
  description: string;
}

export interface StateTransitionData {
  transitions: StateTransition[];
  lookOverrides: Record<string, LookOverride[]>;
}

export interface GameData {
  rooms: Room[];
  items: ItemDef[];
  puzzles: PuzzleDef[];
  story: StoryData;
  shipSystems: ShipSystems;
  stateTransitions?: StateTransitionData;
}

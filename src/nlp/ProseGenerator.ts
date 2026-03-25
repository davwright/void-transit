import { callClaude } from './HaikuParser';
import { ActionResult, StoryContext, GameState } from '../types';
import { decodeObject } from '../encoding';
import * as fs from 'fs';
import * as path from 'path';
import config from '../config';

// Cache Haiku responses — same question in same context returns cached answer
const proseCache = new Map<string, string>();
const CACHE_MAX = 200;

function getCacheKey(actionResult: ActionResult, gameState: GameState): string | null {
  // Cache scenery examines, regular examines, and look results — keyed by type+target+room
  const cacheable = ['examine_scenery', 'examine', 'look'];
  if (!cacheable.includes(actionResult.type)) return null;
  // For scenery, include the original question so "what is gel?" and "can I eat gel?" cache separately
  const extra = actionResult.originalInput || '';
  return `${actionResult.type}:${actionResult.target || ''}:${extra}:${gameState.currentRoom}`;
}

// Prompts — injectable or lazy-loaded from fs
let PROSE_SYSTEM = '';
let SCENERY_PREAMBLE = '';
let SCENERY_RULES = '';
let LORE_PREAMBLE = '';
let LORE_CONSISTENCY = '';
let _promptsLoaded = false;

function _ensurePromptsLoaded() {
  if (_promptsLoaded) return;
  _promptsLoaded = true;
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(config.dataDir, 'prompts.json'), 'utf-8'));
    const p = decodeObject(raw) as Record<string, string>;
    PROSE_SYSTEM = p.proseSystem;
    SCENERY_PREAMBLE = p.sceneryPreamble;
    SCENERY_RULES = p.sceneryRules;
    LORE_PREAMBLE = p.lorePreamble;
    LORE_CONSISTENCY = p.loreConsistency;
  } catch { /* browser — must inject via injectPrompts */ }
}

/** Inject prompt data (for browser builds) */
export function injectPrompts(p: Record<string, string>) {
  PROSE_SYSTEM = p.proseSystem;
  SCENERY_PREAMBLE = p.sceneryPreamble;
  SCENERY_RULES = p.sceneryRules;
  LORE_PREAMBLE = p.lorePreamble;
  LORE_CONSISTENCY = p.loreConsistency;
  _promptsLoaded = true;
}

/** Build a normalized key for the persistent world lore cache */
function loreCacheKey(room: string, target: string, question: string): string {
  return `${room}::${target.toLowerCase().trim()}::${question.toLowerCase().trim()}`;
}

/** Get all previously established lore entries for a room */
function getRoomLore(worldLore: Record<string, string>, room: string): Array<{ target: string; answer: string }> {
  const prefix = `${room}::`;
  const entries: Array<{ target: string; answer: string }> = [];
  for (const [key, answer] of Object.entries(worldLore)) {
    if (key.startsWith(prefix)) {
      const parts = key.substring(prefix.length).split('::');
      if (parts.length >= 1) {
        entries.push({ target: parts[0], answer });
      }
    }
  }
  return entries;
}

export async function generateProse(actionResult: ActionResult, storyContext: StoryContext, gameState: GameState): Promise<string> {
  _ensurePromptsLoaded();
  // Check volatile cache first
  const cacheKey = getCacheKey(actionResult, gameState);
  if (cacheKey && proseCache.has(cacheKey)) {
    return proseCache.get(cacheKey)!;
  }

  // For scenery questions, check persistent world lore cache
  if (actionResult.type === 'examine_scenery' && gameState.worldLore) {
    const loreKey = loreCacheKey(
      gameState.currentRoom,
      actionResult.target || '',
      actionResult.originalInput || actionResult.target || ''
    );
    if (gameState.worldLore[loreKey]) {
      if (cacheKey) proseCache.set(cacheKey, gameState.worldLore[loreKey]);
      return gameState.worldLore[loreKey];
    }
  }

  // Gather existing lore for this room to keep Haiku consistent
  const roomLore = (actionResult.type === 'examine_scenery' && gameState.worldLore)
    ? getRoomLore(gameState.worldLore, gameState.currentRoom)
    : [];

  const prompt = buildPrompt(actionResult, storyContext, gameState, roomLore);

  try {
    const callType = actionResult.type === 'examine_scenery' ? 'scenery' as const : 'prose' as const;
    const prose = await callClaude(prompt, callType);
    let trimmed = prose.trim();

    // For scenery answers, strip any room description Haiku appends after the answer
    if (actionResult.type === 'examine_scenery') {
      trimmed = trimSceneryResponse(trimmed);

      // Persist to world lore (survives save/load)
      if (gameState.worldLore) {
        const loreKey = loreCacheKey(
          gameState.currentRoom,
          actionResult.target || '',
          actionResult.originalInput || actionResult.target || ''
        );
        gameState.worldLore[loreKey] = trimmed;
      }
    }

    // Volatile cache
    if (cacheKey) {
      if (proseCache.size >= CACHE_MAX) {
        const firstKey = proseCache.keys().next().value!;
        proseCache.delete(firstKey);
      }
      proseCache.set(cacheKey, trimmed);
    }

    return trimmed;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Prose generation failed, using raw result:', msg);
    return buildFallbackProse(actionResult);
  }
}

/** Strip any room description or extra narration Haiku appends after answering the question */
function trimSceneryResponse(text: string): string {
  // Take only the first paragraph — a double newline usually signals Haiku
  // switching from the answer into an unsolicited room description
  const firstPara = text.split(/\n\n/)[0].trim();
  return firstPara || text;
}

function buildSceneryPrompt(actionResult: ActionResult, roomLore: Array<{ target: string; answer: string }> = []): string {
  const target = actionResult.target || 'that';
  const question = actionResult.originalInput || target;
  const roomDesc = actionResult.roomDescription || '';

  let loreSection = '';
  if (roomLore.length > 0) {
    loreSection = `\n${LORE_PREAMBLE}\n`;
    for (const entry of roomLore) {
      loreSection += `- About "${entry.target}": ${entry.answer}\n`;
    }
    loreSection += '\n';
  }

  return `${SCENERY_PREAMBLE}

The player asked: "${question}"

Room context for reference only (DO NOT narrate this):
---
${roomDesc}
---
${loreSection}- Write ONLY 2-3 sentences answering the specific question about "${target}"
${SCENERY_RULES}${roomLore.length > 0 ? `\n- ${LORE_CONSISTENCY}` : ''}`;
}

function buildPrompt(actionResult: ActionResult, storyContext: StoryContext, gameState: GameState, roomLore: Array<{ target: string; answer: string }> = []): string {
  // Scenery questions get their own focused prompt — no narrator preamble
  if (actionResult.type === 'examine_scenery') {
    return buildSceneryPrompt(actionResult, roomLore);
  }

  let prompt = PROSE_SYSTEM + '\n\n';
  prompt += `Current situation:\n`;
  prompt += `- Location: ${gameState.currentRoom}\n`;
  prompt += `- Act: ${storyContext.actName} (tension: ${storyContext.tension}/10)\n`;
  prompt += `- Health: ${gameState.playerHealth}%, Radiation: ${(gameState.radiationExposure || 0).toFixed(1)} mSv\n`;
  prompt += `- Turn: ${gameState.turnCount}\n\n`;

  prompt += `Action result to narrate:\n`;
  prompt += `Type: ${actionResult.type}\n`;

  switch (actionResult.type) {
    case 'move_success':
      prompt += `Moved to: ${actionResult.roomName}\n`;
      prompt += `Room description (base): ${actionResult.description}\n`;
      prompt += `First visit: ${actionResult.isFirstVisit}\n`;
      if (actionResult.items?.length) prompt += `Visible items: ${actionResult.items.map(i => i.name).join(', ')}\n`;
      if (actionResult.exits?.length) prompt += `Exits: ${actionResult.exits.map(e => e.direction + (e.accessible ? '' : ' (blocked)')).join(', ')}\n`;
      if (actionResult.foreshadowing?.length) {
        for (const fs of actionResult.foreshadowing) {
          prompt += `[Weave in this ${fs.type === 'plant' ? 'subtle hint' : 'revelation'}: ${fs.type === 'plant' ? fs.plantText : fs.payoffText}]\n`;
        }
      }
      prompt += `\nWrite the room description. Include the base description naturally, note visible items and exits. Keep it atmospheric.`;
      break;

    case 'look':
      prompt += `Looking around: ${actionResult.roomName}\n`;
      prompt += `Description: ${actionResult.description}\n`;
      if (actionResult.items?.length) prompt += `Items: ${actionResult.items.map(i => i.name).join(', ')}\n`;
      prompt += `\nDescribe what the player sees. Be thorough but atmospheric.`;
      break;

    case 'examine':
      prompt += `Examining: ${actionResult.target}\n`;
      prompt += `Detail: ${actionResult.text}\n`;
      prompt += `\nNarrate the examination. Include the detail text naturally.`;
      break;

    case 'take_success':
      prompt += `Picked up: ${actionResult.itemName}\n`;
      prompt += `\nBriefly narrate picking up the item. One or two sentences.`;
      break;

    case 'combine_success':
      prompt += `Combined items: ${actionResult.message}\n`;
      if (actionResult.created) prompt += `Created: ${actionResult.created}\n`;
      prompt += `\nDescribe the combination process. Make it feel like real engineering.`;
      break;

    case 'use_success':
      prompt += `Used item: ${actionResult.message}\n`;
      prompt += `\nNarrate the action and its result.`;
      break;

    case 'puzzle_success':
      prompt += `Puzzle step completed: ${actionResult.message}\n`;
      prompt += `Puzzle complete: ${actionResult.completed}\n`;
      prompt += `\nNarrate the puzzle progress. If completed, make it satisfying. Refer to real science.`;
      break;

    case 'puzzle_failed':
      prompt += `Puzzle attempt failed: ${actionResult.reason}\n`;
      if (actionResult.hint) prompt += `Hint direction: ${actionResult.hint}\n`;
      if (actionResult.consequence) prompt += `Consequence: ${actionResult.consequence}\n`;
      prompt += `\nNarrate the failure. Be specific about why it didn't work (physics, engineering). If there's a consequence, describe it viscerally.`;
      break;

    default:
      prompt += `Message: ${actionResult.message || JSON.stringify(actionResult)}\n`;
      prompt += `\nNarrate this result briefly and atmospherically.`;
  }

  if (actionResult.systemEvents?.length) {
    prompt += `\n\nAlso incorporate these system events:\n`;
    for (const evt of actionResult.systemEvents) {
      prompt += `- [${evt.type}] ${evt.message}\n`;
    }
  }

  if (actionResult.storyBeats?.length) {
    prompt += `\n\nAlso weave in these story moments:\n`;
    for (const beat of actionResult.storyBeats) {
      prompt += `- ${beat.text}\n`;
    }
  }

  if (actionResult.actTransition) {
    prompt += `\n\nMajor story transition: ${actionResult.actTransition.message || 'New act: ' + actionResult.actTransition.name}`;
  }

  return prompt;
}

/** Render a clean spatial ASCII map */
function renderSpatialMap(actionResult: ActionResult): string {
  if (!actionResult.mapRooms || actionResult.mapRooms.length === 0) {
    return '=== Ship Map ===\nNo areas explored yet.';
  }
  // Delegate to the new clean renderer
  return renderCleanMap(actionResult);
}

function renderCleanMap(ar: ActionResult): string {
  const current = ar.currentRoom || '';
  const mapRooms = ar.mapRooms || [];
  const visitedIds = new Set(mapRooms.map((r: any) => r.id));

  interface Node { id: string; name: string; deck: string; visited: boolean; isCurrent: boolean; exits: Record<string,string>; hasUp: boolean; hasDown: boolean; }
  const nodes = new Map<string, Node>();

  for (const r of mapRooms) {
    const hasUp = Object.keys(r.exits).some(d => d === 'up' || d === 'u');
    const hasDown = Object.keys(r.exits).some(d => d === 'down' || d === 'd');
    nodes.set(r.id, { id: r.id, name: shortName(r.name), deck: r.deck, visited: true, isCurrent: r.id === current, exits: r.exits, hasUp, hasDown });
  }

  // Add unvisited neighbors
  for (const r of mapRooms) {
    for (const [dir, tid] of Object.entries(r.exits)) {
      if (nodes.has(tid)) continue;
      let deck = r.deck;
      if (dir === 'up' || dir === 'u') deck = String.fromCharCode(deck.charCodeAt(0) - 1);
      else if (dir === 'down' || dir === 'd') deck = String.fromCharCode(deck.charCodeAt(0) + 1);
      nodes.set(tid, { id: tid, name: '???', deck, visited: false, isCurrent: false, exits: {}, hasUp: false, hasDown: false });
    }
  }

  // Group by deck
  const decks = new Map<string, Node[]>();
  for (const n of nodes.values()) {
    if (!decks.has(n.deck)) decks.set(n.deck, []);
    decks.get(n.deck)!.push(n);
  }

  let out = '═══ Ship Map ═══\n';
  for (const dk of [...decks.keys()].sort()) {
    out += `\n── Deck ${dk} ──\n`;
    out += layoutDeck(decks.get(dk)!, nodes);
  }
  out += '\n◆ = You  ▲▼ = Deck access  ??? = Unexplored';
  return out;
}

function shortName(name: string): string {
  return name.replace(/\s*-\s*ISV .*/i, '').replace(/\s*-\s*Deck .*/i, '').replace(/Compartment$/i, '').replace(/Systems$/i, '').trim();
}

function layoutDeck(deckNodes: any[], allNodes: Map<string, any>): string {
  if (deckNodes.length === 0) return '';

  // BFS to assign grid positions
  const pos = new Map<string, [number, number]>(); // id → [row, col]
  const deltas: Record<string, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] };
  const ids = new Set(deckNodes.map((n: any) => n.id));

  const start = deckNodes.find((n: any) => n.isCurrent) || deckNodes.find((n: any) => n.visited) || deckNodes[0];
  pos.set(start.id, [0, 0]);
  const queue = [start.id];
  const seen = new Set([start.id]);

  while (queue.length > 0) {
    const id = queue.shift()!;
    const [r, c] = pos.get(id)!;
    const node = allNodes.get(id);
    if (!node) continue;
    for (const [dir, tid] of Object.entries(node.exits) as [string, string][]) {
      if (!ids.has(tid) || pos.has(tid) || !deltas[dir]) continue;
      pos.set(tid, [r + deltas[dir][0], c + deltas[dir][1]]);
      if (!seen.has(tid)) { seen.add(tid); queue.push(tid); }
    }
  }

  // Place disconnected nodes
  let maxC = 0;
  for (const [, [, c]] of pos) if (c > maxC) maxC = c;
  for (const n of deckNodes) {
    if (!pos.has(n.id)) { maxC += 2; pos.set(n.id, [0, maxC]); }
  }

  // Normalize
  let minR = Infinity, minC = Infinity;
  for (const [, [r, c]] of pos) { if (r < minR) minR = r; if (c < minC) minC = c; }
  const grid = new Map<string, [number, number]>();
  for (const [id, [r, c]] of pos) grid.set(id, [r - minR, c - minC]);

  let maxR = 0; maxC = 0;
  for (const [, [r, c]] of grid) { if (r > maxR) maxR = r; if (c > maxC) maxC = c; }

  // Find cell width based on longest name
  let maxLen = 3;
  for (const n of deckNodes) if (n.name.length > maxLen) maxLen = n.name.length;
  const CW = maxLen + 6; // [◆ Name ▲▼]

  const nodeAt = (r: number, c: number) => {
    for (const [id, [gr, gc]] of grid) { if (gr === r && gc === c) return allNodes.get(id); }
    return null;
  };
  const connected = (a: string, b: string, dir: string) => {
    const na = allNodes.get(a); return na?.exits?.[dir] === b;
  };
  const pad = (s: string, w: number) => {
    const gap = w - s.length; if (gap <= 0) return s;
    const left = Math.floor(gap / 2);
    return ' '.repeat(left) + s + ' '.repeat(gap - left);
  };

  const lines: string[] = [];
  for (let row = 0; row <= maxR; row++) {
    let line = '';
    for (let col = 0; col <= maxC; col++) {
      const n = nodeAt(row, col);
      if (n) {
        const mark = n.isCurrent ? '◆' : ' ';
        const ud = (n.hasUp ? '▲' : '') + (n.hasDown ? '▼' : '');
        const label = n.visited ? n.name : '???';
        const cell = `[${mark}${label}${ud ? ' ' + ud : ''}]`;
        line += pad(cell, CW);
      } else {
        line += ' '.repeat(CW);
      }
      if (col < maxC) {
        const here = nodeAt(row, col);
        const right = nodeAt(row, col + 1);
        if (here && right && (connected(here.id, right.id, 'e') || connected(right.id, here.id, 'w'))) {
          line += '───';
        } else {
          line += '   ';
        }
      }
    }
    lines.push(line.trimEnd());

    if (row < maxR) {
      let vline = '';
      for (let col = 0; col <= maxC; col++) {
        const above = nodeAt(row, col);
        const below = nodeAt(row + 1, col);
        if (above && below && (connected(above.id, below.id, 's') || connected(below.id, above.id, 'n'))) {
          vline += pad('│', CW);
        } else {
          vline += ' '.repeat(CW);
        }
        if (col < maxC) vline += '   ';
      }
      lines.push(vline.trimEnd());
    }
  }
  return lines.join('\n') + '\n';
}

// --- end map functions ---

export function buildFallbackProse(actionResult: ActionResult): string {
  switch (actionResult.type) {
    case 'move_success': {
      let text = '';
      if (actionResult.text) {
        text += actionResult.text + '\n';
      }
      text += `**${actionResult.roomName || 'Unknown'}**`;
      if (actionResult.isFirstVisit) {
        text += `\n\n${actionResult.description || 'You look around.'}`;
      }
      if (actionResult.items?.length) {
        text += '\n\nYou can see: ' + actionResult.items.map(i => i.name).join(', ') + '.';
      }
      if (actionResult.exits?.length) {
        text += '\n\nExits: ' + actionResult.exits.map(e => e.direction).join(', ') + '.';
      }
      return text;
    }
    case 'look': {
      let text = `**${actionResult.roomName || 'Unknown'}**\n\n`;
      text += actionResult.description || 'You look around.';
      if (actionResult.items?.length) {
        text += '\n\nYou can see: ' + actionResult.items.map(i => i.name).join(', ') + '.';
      }
      if (actionResult.exits?.length) {
        text += '\n\nExits: ' + actionResult.exits.map(e => e.direction).join(', ') + '.';
      }
      return text;
    }
    case 'examine':
      return actionResult.text || `You examine the ${actionResult.target}.`;
    case 'examine_scenery':
      return actionResult.message || `You look more closely at the ${actionResult.target}.`;
    case 'take_success':
      return actionResult.message || `Taken.`;
    case 'take_failed':
    case 'move_failed':
    case 'use_failed':
    case 'examine_failed':
    case 'combine_failed':
    case 'drop_failed':
    case 'equip_failed':
    case 'unequip_failed':
    case 'open_failed':
    case 'read_failed':
      return actionResult.message || actionResult.reason || "That doesn't work.";
    case 'inventory': {
      if (!actionResult.items?.length) return 'You are carrying nothing.';
      let text = 'You are carrying:\n';
      for (const item of actionResult.items) {
        text += `  - ${item.name} (${item.weight}kg)\n`;
      }
      text += `\nTotal weight: ${actionResult.totalWeight!.toFixed(1)}/${actionResult.maxWeight}kg`;
      if (actionResult.equipped?.length) {
        text += '\n\nWearing: ' + actionResult.equipped.map(i => i.name).join(', ');
      }
      return text;
    }
    case 'help':
      return actionResult.message || '';
    case 'status': {
      const missionYear = (config.journeyYearsElapsed + (actionResult.turnCount || 0) / 35040).toFixed(3);
      const shipDate = `Mission Year ${missionYear} (Y${missionYear})`;
      const calYear = Math.floor(config.launchYear + parseFloat(missionYear));
      return `${shipDate} | Calendar: ~${calYear} CE\nHealth: ${actionResult.health}% | Radiation: ${(actionResult.radiation || 0).toFixed(1)} mSv\nLocation: ${actionResult.location} | CO2: ${actionResult.co2Level || '—'} ppm | Turn: ${actionResult.turnCount}`;
    }
    case 'systems': {
      let text = 'Ship Systems:\n';
      if (actionResult.systems) {
        for (const [, sys] of Object.entries(actionResult.systems)) {
          const statusIcon = sys.status === 'nominal' ? '[OK]' : sys.status === 'warning' || sys.status === 'degraded' ? '[!!]' : '[XX]';
          text += `  ${statusIcon} ${sys.name}: ${sys.status}\n`;
        }
      }
      return text;
    }
    case 'hint': {
      if (actionResult.hints) {
        return actionResult.hints.map(h => `${h.puzzleName}: ${h.hint}`).join('\n');
      }
      return actionResult.message || '';
    }
    case 'map': {
      return renderSpatialMap(actionResult);
    }
    case 'save':
    case 'load':
    case 'saves':
      return actionResult.message || JSON.stringify(actionResult);
    case 'read_success':
      return `=== ${actionResult.itemName} ===\n\n${actionResult.text}`;
    case 'search_success':
    case 'search_nothing':
    case 'wait':
    case 'puzzle_success':
      return actionResult.message || '';
    case 'puzzle_failed': {
      let text = actionResult.reason || '';
      if (actionResult.hint) text += `\n\n(Hint: ${actionResult.hint})`;
      if (actionResult.consequence) text += `\n\n${actionResult.consequence}`;
      return text;
    }
    case 'disambiguate':
      return actionResult.message || 'What did you mean?';
    default:
      return actionResult.message || "Something happens, but you're not sure what.";
  }
}


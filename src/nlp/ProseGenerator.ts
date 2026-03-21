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

// Prompts loaded from data file (encoded at rest, decoded at init)
const _prompts = decodeObject(
  JSON.parse(fs.readFileSync(path.join(config.dataDir, 'prompts.json'), 'utf-8'))
) as Record<string, string>;
const PROSE_SYSTEM = _prompts.proseSystem;
const SCENERY_PREAMBLE = _prompts.sceneryPreamble;
const SCENERY_RULES = _prompts.sceneryRules;
const LORE_PREAMBLE = _prompts.lorePreamble;
const LORE_CONSISTENCY = _prompts.loreConsistency;

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

/**
 * Render a spatial ASCII map from mapRooms data.
 * Directions in room exits: n=fore(up), s=aft(down), w=port(left), e=starboard(right), up/down=deck changes.
 */
function renderSpatialMap(actionResult: ActionResult): string {
  if (!actionResult.mapRooms || actionResult.mapRooms.length === 0) {
    return '=== Ship Map ===\nNo areas explored yet.';
  }

  const currentRoom = actionResult.currentRoom || '';
  const visitedSet = new Set(actionResult.mapRooms.map(r => r.id));

  // Collect all rooms by deck, including unvisited neighbors
  interface MapNode {
    id: string;
    label: string;
    deck: string;
    visited: boolean;
    isCurrent: boolean;
    exits: Record<string, string>;
  }

  const allNodes = new Map<string, MapNode>();

  // Add visited rooms
  for (const r of actionResult.mapRooms) {
    allNodes.set(r.id, {
      id: r.id,
      label: abbreviateRoom(r.name),
      deck: r.deck,
      visited: true,
      isCurrent: r.id === currentRoom,
      exits: r.exits
    });
  }

  // Add unvisited neighbors (shown as [?])
  for (const r of actionResult.mapRooms) {
    for (const [dir, targetId] of Object.entries(r.exits)) {
      if (!allNodes.has(targetId)) {
        // Infer deck: up/down changes deck, otherwise same deck
        let neighborDeck = r.deck;
        if (dir === 'up' || dir === 'u') {
          neighborDeck = String.fromCharCode(r.deck.charCodeAt(0) - 1);
        } else if (dir === 'down' || dir === 'd') {
          neighborDeck = String.fromCharCode(r.deck.charCodeAt(0) + 1);
        }
        allNodes.set(targetId, {
          id: targetId,
          label: '?',
          deck: neighborDeck,
          visited: false,
          isCurrent: false,
          exits: {}
        });
      }
    }
  }

  // Group by deck
  const deckNodes = new Map<string, MapNode[]>();
  for (const node of allNodes.values()) {
    if (!deckNodes.has(node.deck)) deckNodes.set(node.deck, []);
    deckNodes.get(node.deck)!.push(node);
  }

  // Sort decks alphabetically
  const sortedDecks = [...deckNodes.keys()].sort();

  let output = '=== Ship Map ===\n';
  output += 'FORE (forward)\n';

  for (const deck of sortedDecks) {
    const nodes = deckNodes.get(deck)!;
    output += `\n--- Deck ${deck} ---\n`;
    output += renderDeckGrid(nodes, allNodes, visitedSet);
  }

  output += '\nAFT (aft)\n';
  output += '\n[*] = You   [ ] = Visited   [?] = Unexplored   \u25B2\u25BC = Up/Down';
  return output;
}

/** Abbreviate a room name to fit in map cells */
function abbreviateRoom(name: string): string {
  // Strip common suffixes/prefixes for brevity
  let short = name
    .replace(/\s*-\s*ISV Kepler's Promise/i, '')
    .replace(/\s*-\s*Deck [A-D]/i, '')
    .trim();
  // Truncate to 12 chars max
  if (short.length > 12) {
    // Try to use initials of multi-word names
    const words = short.split(/\s+/);
    if (words.length >= 2) {
      // Use first word abbreviated + key word
      short = short.substring(0, 12);
    } else {
      short = short.substring(0, 12);
    }
  }
  return short;
}

/**
 * Render one deck as a 2D grid.
 * Uses BFS from an arbitrary node to assign grid positions based on n/s/e/w exits.
 */
function renderDeckGrid(
  nodes: Array<{ id: string; label: string; visited: boolean; isCurrent: boolean; exits: Record<string, string> }>,
  allNodes: Map<string, { id: string; label: string; deck: string; visited: boolean; isCurrent: boolean; exits: Record<string, string> }>,
  visitedIds: Set<string>
): string {
  if (nodes.length === 0) return '';

  // Assign grid positions via BFS using horizontal/vertical exits
  const positions = new Map<string, { col: number; row: number }>();
  const dirDeltas: Record<string, { dr: number; dc: number }> = {
    n: { dr: -1, dc: 0 },
    s: { dr: 1, dc: 0 },
    e: { dr: 0, dc: 1 },
    w: { dr: 0, dc: -1 },
  };

  const nodeIds = new Set(nodes.map(n => n.id));

  // Start BFS from a visited node if possible, preferring current room
  const startNode = nodes.find(n => n.isCurrent) || nodes.find(n => n.visited) || nodes[0];
  positions.set(startNode.id, { col: 0, row: 0 });

  const queue: string[] = [startNode.id];
  const processed = new Set<string>([startNode.id]);

  while (queue.length > 0) {
    const id = queue.shift()!;
    const pos = positions.get(id)!;
    const node = allNodes.get(id);
    if (!node) continue;

    for (const [dir, targetId] of Object.entries(node.exits)) {
      if (!nodeIds.has(targetId)) continue; // skip cross-deck exits
      if (positions.has(targetId)) continue;
      const delta = dirDeltas[dir];
      if (!delta) continue; // skip up/down

      positions.set(targetId, { col: pos.col + delta.dc, row: pos.row + delta.dr });
      if (!processed.has(targetId)) {
        processed.add(targetId);
        queue.push(targetId);
      }
    }
  }

  // Handle any disconnected nodes on this deck (place them to the right)
  let maxCol = 0;
  for (const p of positions.values()) {
    if (p.col > maxCol) maxCol = p.col;
  }
  for (const node of nodes) {
    if (!positions.has(node.id)) {
      maxCol += 2;
      positions.set(node.id, { col: maxCol, row: 0 });
    }
  }

  // Normalize positions to start at 0,0
  let minRow = Infinity, minCol = Infinity;
  for (const p of positions.values()) {
    if (p.row < minRow) minRow = p.row;
    if (p.col < minCol) minCol = p.col;
  }
  for (const p of positions.values()) {
    p.row -= minRow;
    p.col -= minCol;
  }

  // Find grid bounds
  let maxRow = 0;
  maxCol = 0;
  for (const p of positions.values()) {
    if (p.row > maxRow) maxRow = p.row;
    if (p.col > maxCol) maxCol = p.col;
  }

  // Cell width: label (max 12) + brackets + padding = 16
  const CELL_W = 16;
  const CONN_W = 3; // " \u2190\u2192 " connector width between cells
  // Build the grid lines
  const lines: string[] = [];

  for (let row = 0; row <= maxRow; row++) {
    // Room row
    let roomLine = '';
    for (let col = 0; col <= maxCol; col++) {
      const nodeAtPos = findNodeAt(row, col, positions, allNodes);
      if (nodeAtPos) {
        const bracket = nodeAtPos.isCurrent ? '[*' : nodeAtPos.visited ? '[ ' : '[?';
        const bracketEnd = nodeAtPos.isCurrent ? '*]' : nodeAtPos.visited ? ' ]' : '?]';
        const lbl = nodeAtPos.isCurrent
          ? `*${nodeAtPos.label}*`
          : nodeAtPos.label;
        const cellContent = `${bracket} ${lbl} ${bracketEnd}`;
        roomLine += centerPad(cellContent, CELL_W);
      } else {
        roomLine += ' '.repeat(CELL_W);
      }

      // Horizontal connector
      if (col < maxCol) {
        const nodeHere = findNodeAt(row, col, positions, allNodes);
        const nodeRight = findNodeAt(row, col + 1, positions, allNodes);
        if (nodeHere && nodeRight && hasConnection(nodeHere.id, nodeRight.id, 'e', allNodes)) {
          roomLine += '\u2190\u2192\u2190';
        } else {
          roomLine += ' '.repeat(CONN_W);
        }
      }
    }
    lines.push(roomLine.trimEnd());

    // Vertical connectors + up/down markers
    if (row < maxRow) {
      let connLine = '';
      for (let col = 0; col <= maxCol; col++) {
        const nodeAbove = findNodeAt(row, col, positions, allNodes);
        const nodeBelow = findNodeAt(row + 1, col, positions, allNodes);
        if (nodeAbove && nodeBelow && hasConnection(nodeAbove.id, nodeBelow.id, 's', allNodes)) {
          connLine += centerPad('\u2191\u2193', CELL_W);
        } else {
          connLine += ' '.repeat(CELL_W);
        }
        if (col < maxCol) {
          connLine += ' '.repeat(CONN_W);
        }
      }
      lines.push(connLine.trimEnd());
    }

    // Up/down deck markers on the room row
    // (We append these as annotations after the room line)
  }

  // Add up/down annotations
  const deckAnnotations: string[] = [];
  for (const node of nodes) {
    const upTargets: string[] = [];
    const downTargets: string[] = [];
    for (const [dir, targetId] of Object.entries(node.exits)) {
      if (dir === 'up' || dir === 'u') upTargets.push(targetId);
      if (dir === 'down' || dir === 'd') downTargets.push(targetId);
    }
    if (upTargets.length > 0 || downTargets.length > 0) {
      const markers: string[] = [];
      if (upTargets.length > 0) markers.push('\u25B2 Up');
      if (downTargets.length > 0) markers.push('\u25BC Down');
      deckAnnotations.push(`  ${node.label}: ${markers.join(', ')}`);
    }
  }

  let result = lines.join('\n') + '\n';
  if (deckAnnotations.length > 0) {
    result += deckAnnotations.join('\n') + '\n';
  }
  return result;
}

/** Find a node at a given grid position */
function findNodeAt(
  row: number,
  col: number,
  positions: Map<string, { col: number; row: number }>,
  allNodes: Map<string, { id: string; label: string; deck: string; visited: boolean; isCurrent: boolean; exits: Record<string, string> }>
): { id: string; label: string; visited: boolean; isCurrent: boolean; exits: Record<string, string> } | null {
  for (const [id, pos] of positions.entries()) {
    if (pos.row === row && pos.col === col) {
      const node = allNodes.get(id);
      if (node) return node;
    }
  }
  return null;
}

/** Check if two rooms are connected in a given direction */
function hasConnection(
  fromId: string,
  toId: string,
  dir: string,
  allNodes: Map<string, { id: string; exits: Record<string, string> }>
): boolean {
  const from = allNodes.get(fromId);
  if (from && from.exits[dir] === toId) return true;
  // Check reverse direction
  const reverse: Record<string, string> = { n: 's', s: 'n', e: 'w', w: 'e' };
  const to = allNodes.get(toId);
  if (to && reverse[dir] && to.exits[reverse[dir]] === fromId) return true;
  return false;
}

/** Center-pad a string to a given width */
function centerPad(str: string, width: number): string {
  if (str.length >= width) return str.substring(0, width);
  const left = Math.floor((width - str.length) / 2);
  const right = width - str.length - left;
  return ' '.repeat(left) + str + ' '.repeat(right);
}

export function buildFallbackProse(actionResult: ActionResult): string {
  switch (actionResult.type) {
    case 'move_success': {
      let text = `**${actionResult.roomName || 'Unknown'}**`;
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


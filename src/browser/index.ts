/**
 * VOID TRANSIT — Browser Entry Point
 *
 * Loads all game data as bundled JSON, creates the engine,
 * and wires it directly to the DOM. No server needed.
 */

import { decodeObject } from '../encoding';
import GameEngine from '../engine/GameEngine';
import { parse } from '../nlp/Parser';
import { injectRejectedVerbs } from '../nlp/Parser';
import { injectPrompts } from '../nlp/ProseGenerator';
import { buildFallbackProse } from '../nlp/ProseGenerator';
import BrowserSaveManager from '../engine/BrowserSaveManager';
import { browserLogger } from '../engine/BrowserLogger';
import { hasConsent, setConsent, upload, startPeriodicUpload } from './feedback';

// Import encoded JSON data (Vite bundles these at build time)
import roomsRaw from '../data/rooms.json';
import itemsRaw from '../data/items.json';
import storyRaw from '../data/story.json';
import puzzlesRaw from '../data/puzzles.json';
import sceneryRaw from '../data/scenery.json';
import shipSystemsRaw from '../data/ship-systems.json';
import messagesRaw from '../data/messages.json';
import promptsRaw from '../data/prompts.json';
import rejectedVerbsRaw from '../data/rejected-verbs.json';
import stateTransitionsRaw from '../data/state-transitions.json';
import rulesRaw from '../data/rules.json';

import type { Room, ItemDef, PuzzleDef, StoryData, ShipSystems, GameData, RulesData, Intent, ActionResult, StoryContext } from '../types';
import config from '../config';

// === Decode all data ===
const rooms = decodeObject(roomsRaw) as any;
const items = decodeObject(itemsRaw) as any;
const story = decodeObject(storyRaw) as any;
const puzzles = decodeObject(puzzlesRaw) as any;
const scenery = decodeObject(sceneryRaw) as any;
const shipSystems = decodeObject(shipSystemsRaw) as any;
const messages = decodeObject(messagesRaw) as { systemEvents: Record<string, string>; intro: string };
const prompts = decodeObject(promptsRaw) as Record<string, string>;
const rejectedVerbs = decodeObject(rejectedVerbsRaw) as { verbs: Record<string, string>; responses: Record<string, string[]> };
const stateTransitions = decodeObject(stateTransitionsRaw) as any;
const rulesData = decodeObject(rulesRaw) as RulesData | null;

// === Normalize room data (same logic as GameEngine._loadData) ===
let roomsList: Room[];
if (Array.isArray(rooms)) {
  roomsList = rooms;
} else if (rooms.rooms && typeof rooms.rooms === 'object') {
  roomsList = Array.isArray(rooms.rooms) ? rooms.rooms : Object.values(rooms.rooms);
} else {
  roomsList = Object.values(rooms);
}

let itemsList: ItemDef[];
if (Array.isArray(items)) {
  itemsList = items;
} else if (items.items && Array.isArray(items.items)) {
  itemsList = items.items;
} else {
  itemsList = Object.values(items);
}

let puzzlesList: PuzzleDef[];
if (Array.isArray(puzzles)) {
  puzzlesList = puzzles;
} else if (puzzles.puzzles && Array.isArray(puzzles.puzzles)) {
  puzzlesList = puzzles.puzzles;
} else {
  puzzlesList = Object.values(puzzles);
}

// Merge scenery into rooms
if (scenery) {
  const examineTargets = (scenery.examineTargets || {}) as Record<string, Record<string, string>>;
  const cantTake = (scenery.cantTake || {}) as Record<string, Record<string, string>>;
  for (const room of roomsList) {
    if (examineTargets[room.id]) {
      room.examineTargets = { ...(room.examineTargets || {}), ...examineTargets[room.id] };
    }
    if (cantTake[room.id]) {
      room.cantTake = { ...(room.cantTake || {}), ...cantTake[room.id] };
    }
  }
}

const storyData: StoryData = story || { acts: [], foreshadowing: [], endings: [], globalEvents: [] };
const shipSystemsData: ShipSystems = shipSystems || { systems: {}, tickRules: {} };

const gameData: GameData = {
  rooms: roomsList,
  items: itemsList,
  puzzles: puzzlesList,
  story: storyData,
  shipSystems: shipSystemsData,
  stateTransitions: stateTransitions || undefined,
  rules: rulesData || undefined,
};

// === Inject data into modules ===
injectRejectedVerbs(rejectedVerbs);
injectPrompts(prompts);

// === Create engine with browser save manager ===
const saveManager = new BrowserSaveManager();
const engine = new GameEngine({
  gameData,
  messages,
  saveManager: saveManager as any, // compatible interface
});

// === Game session ===
let sessionId = 'browser_' + Date.now().toString(36);

// === DOM wiring ===
const output = document.getElementById('output')!;
const input = document.getElementById('input') as HTMLInputElement;
const statusLocation = document.getElementById('status-location')!;
const statusHealth = document.getElementById('status-health')!;
const statusTurn = document.getElementById('status-turn')!;

let commandHistory: string[] = [];
let historyIndex = -1;
let busy = false;

function appendOutput(html: string, cssClass?: string) {
  const block = document.createElement('div');
  block.className = 'output-block ' + (cssClass || '');
  block.innerHTML = html;
  output.appendChild(block);
  // Scroll the page so input stays visible at bottom
  requestAnimationFrame(() => {
    const inputArea = document.getElementById('input-area');
    if (inputArea) inputArea.scrollIntoView({ behavior: 'smooth', block: 'end' });
  });
}

function appendNarrative(text: string) {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const formatted = escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^═+$/gm, '<hr style="border-color: var(--border); margin: 8px 0;">');
  appendOutput(`<div class="narrative">${formatted}</div>`);
}

function appendPlayerInput(text: string) {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  appendOutput(`<div class="player-input">${escaped}</div>`, 'instant');
}

function appendMeta(text: string) {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  appendOutput(`<div class="meta-text">${escaped}</div>`);
}

function appendIntro(text: string) {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  appendOutput(`<div class="intro-text">${escaped}</div>`);
}

function updateStatus(data: { roomId?: string; roomName?: string; health?: number; turnCount?: number }) {
  if (data.roomId) statusLocation.textContent = data.roomName || data.roomId.replace(/_/g, ' ');
  if (data.health !== undefined) {
    statusHealth.textContent = `HP: ${data.health}%`;
    statusHealth.style.color = data.health < 40 ? '#ff3333' : data.health < 70 ? '#ffaa00' : '';
  }
  if (data.turnCount !== undefined) statusTurn.textContent = `Turn: ${data.turnCount}`;
}

// === Command processing (direct, no fetch) ===
function processCommand(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;

  appendPlayerInput(trimmed);
  commandHistory.push(trimmed);
  if (commandHistory.length > 100) commandHistory.shift();
  historyIndex = -1;

  const lower = trimmed.toLowerCase();

  // Client-side commands
  if (lower === 'feedback on' || lower === 'feedback off' || lower === 'feedback') {
    if (lower === 'feedback off') {
      setConsent(false);
      appendMeta('Feedback disabled. Your gameplay data will not be shared.');
    } else if (lower === 'feedback on') {
      setConsent(true);
      startPeriodicUpload();
      appendMeta('Feedback enabled. Gameplay data will be shared to improve the story.');
    } else {
      appendMeta(hasConsent() ? 'Feedback is ON. Type "feedback off" to disable.' : 'Feedback is OFF. Type "feedback on" to enable.');
    }
    return;
  }
  if (lower === 'audio' || lower === 'mute' || lower === 'sound') {
    const w = window as any;
    if (w.voidAudio) {
      const on = w.voidAudio.toggle();
      appendMeta(on ? 'Audio enabled.' : 'Audio muted.');
    }
    return;
  }
  if (lower.startsWith('volume ')) {
    const v = parseFloat(lower.substring(7));
    const w = window as any;
    if (!isNaN(v) && w.voidAudio) { w.voidAudio.setVolume(v / 100); appendMeta(`Volume: ${Math.round(v)}%`); }
    return;
  }

  // Save/load
  if (lower === 'save' || lower.startsWith('save ')) {
    const name = trimmed.substring(4).trim() || 'quicksave';
    const result = engine.saveGame(sessionId, name);
    appendNarrative(result.success ? `Game saved as "${name}".` : (result as any).reason);
    if (result.success && hasConsent()) upload(); // silent background upload
    return;
  }
  if (lower.startsWith('load') || lower.startsWith('restore')) {
    const name = trimmed.replace(/^(load|restore)\s*/i, '').trim() || 'quicksave';
    const result = engine.loadGame(sessionId, name);
    if (!result.success) { appendNarrative((result as any).reason); return; }
    const state = engine.getState(sessionId)!;
    const prose = buildFallbackProse({ type: 'move_success', ...result } as ActionResult);
    appendNarrative(`Game loaded.\n\n${prose}`);
    updateStatus({ roomId: state.currentRoom, health: state.playerHealth, turnCount: state.turnCount });
    return;
  }
  if (lower === 'saves') {
    const saves = engine.listSaves();
    if (!saves.length) { appendNarrative('No saved games found.'); return; }
    const list = saves.map(s => `  ${s.slotName} — Turn ${s.turnCount}`).join('\n');
    appendNarrative(`Saved games:\n${list}`);
    return;
  }

  // Parse and process
  const intent: Intent = parse(trimmed);
  const result = engine.processCommand(sessionId, intent);

  const state = engine.getState(sessionId)!;
  const storyContext: StoryContext = result.storyContext || {
    actId: 'unknown', actName: 'Unknown', tension: 0,
    solvedPuzzles: [], activePuzzles: [], turnCount: 0, playerHealth: 100, knownClues: [],
  };

  let prose = buildFallbackProse(result);

  if (result.systemEvents?.length) {
    for (const evt of result.systemEvents) prose += `\n\n[${evt.type.toUpperCase()}] ${evt.message}`;
  }
  if (result.storyBeats?.length) {
    for (const beat of result.storyBeats) prose += `\n\n${beat.text}`;
  }
  if (result.actTransition) {
    prose += `\n\n═══ ${result.actTransition.name} ═══`;
    if (result.actTransition.message) prose += `\n${result.actTransition.message}`;
  }
  if (result.ending) {
    prose += `\n\n═══════════════════════════════════════\n${result.ending.text}\n═══════════════════════════════════════`;
  }

  appendNarrative(prose);

  // Audio triggers
  const w = window as any;
  if (w.voidAudio) {
    if (result.type === 'move_success' && result.currentRoom) { w.voidAudio.setRoom(result.currentRoom); w.voidAudio.sfx('door_open'); }
    if (result.type === 'take_success') w.voidAudio.sfx('item_take');
    if (prose.includes('[WARNING]')) w.voidAudio.sfx('warning');
    if (prose.includes('[CRITICAL]') || prose.includes('[FATAL]')) w.voidAudio.sfx('critical');
    if (storyContext.tension > 6) w.voidAudio.sfx('heartbeat');
  }

  // Disambiguation
  if (result.type === 'disambiguate' && result.candidates) {
    const choiceDiv = document.createElement('div');
    choiceDiv.className = 'disambiguation';
    result.candidates.forEach((c: Intent, i: number) => {
      const label = [c.action, c.target, c.instrument ? `with ${c.instrument}` : ''].filter(Boolean).join(' ');
      const btn = document.createElement('div');
      btn.className = 'choice-btn';
      btn.textContent = `  ${i + 1}. ${label}`;
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', () => { choiceDiv.remove(); processCommand(String(i + 1)); });
      choiceDiv.appendChild(btn);
    });
    output.appendChild(choiceDiv);
  }

  updateStatus({
    roomId: result.currentRoom || state.currentRoom,
    health: state.playerHealth,
    turnCount: result.turnCount || state.turnCount,
  });

  // Log interaction
  browserLogger.logInteraction({
    sessionId,
    room: state.currentRoom,
    turnCount: state.turnCount,
    rawInput: trimmed,
    parsedIntent: {
      action: intent.action, target: intent.target, instrument: intent.instrument,
      confidence: intent.confidence, hadAlternatives: !!(intent.alternatives?.length),
    },
    parseMethod: 'local',
    resultType: result.type,
    resultMessage: result.message || result.text,
    proseLength: prose.length,
    proseSource: 'fallback',
    storyContext: { actId: storyContext.actId, actName: storyContext.actName, tension: storyContext.tension },
  });
}

// === Input handling ===
input.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;
    input.value = '';
    if (waitingForConsent) {
      const l = text.toLowerCase();
      if (l === 'accept' || l === 'yes' || l === 'y') {
        setConsent(true);
        startPeriodicUpload();
        appendMeta('Feedback enabled. Thank you.');
      } else {
        setConsent(false);
        appendMeta('Feedback disabled. You can enable it later with "settings".');
      }
      waitingForConsent = false;
      startGame();
      return;
    }
    processCommand(text);
  } else if (e.key === 'PageUp') {
    e.preventDefault();
    window.scrollBy(0, -window.innerHeight * 0.85);
  } else if (e.key === 'PageDown') {
    e.preventDefault();
    window.scrollBy(0, window.innerHeight * 0.85);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (commandHistory.length && historyIndex < commandHistory.length - 1) {
      historyIndex++;
      input.value = commandHistory[commandHistory.length - 1 - historyIndex];
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (historyIndex > 0) { historyIndex--; input.value = commandHistory[commandHistory.length - 1 - historyIndex]; }
    else { historyIndex = -1; input.value = ''; }
  }
});

document.addEventListener('click', () => {
  if (!window.getSelection()?.toString()) input.focus();
});

// === Privacy consent (first visit only) ===
let waitingForConsent = false;
if (localStorage.getItem('vt_feedback_consent') === null) {
  waitingForConsent = true;
  appendOutput(`<div class="meta-text" style="border: 1px solid var(--border); padding: 8px; margin: 4px 0;">
<strong>Privacy Notice</strong><br>
VOID TRANSIT collects gameplay data (commands, rooms visited) to improve the game.
No personal information is collected. No API keys are transmitted.
All data is encrypted and used solely for story improvement.<br><br>
Type <strong>accept</strong> to consent, or <strong>decline</strong> to play without feedback.
</div>`);
} else {
  if (hasConsent()) startPeriodicUpload();
  startGame();
}

function startGame() {
// Set version in tab title
declare const __APP_VERSION__: string;
document.title = `VOID TRANSIT v${__APP_VERSION__}`;

const newGame = engine.newGame(sessionId);

// Just the intro — no room name, no description, no items. Blank cursor. Confusion.
if (newGame.intro) appendIntro(newGame.intro);

// Don't show room description, items, or exits. Make them work for it.
// Status bar stays blank too — they don't know where they are yet.
updateStatus({ health: 65, turnCount: 0 });

const w2 = window as any;
if (w2.voidAudio && newGame.roomId) w2.voidAudio.setRoom(newGame.roomId);

input.focus();
} // end startGame

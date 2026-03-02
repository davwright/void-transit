import { Express, Request, Response } from 'express';
import config from './config';
import GameEngine from './engine/GameEngine';

interface EvalTask {
  id: string;
  code: string;
}

function p(val: string | string[]): string {
  return Array.isArray(val) ? val[0] : val;
}

export function setupDebugRoutes(app: Express, engine: GameEngine): void {
  if (process.env.NODE_ENV === 'production') return;

  app.get('/debug/state/:sessionId', (req: Request, res: Response) => {
    const state = engine.getState(p(p(req.params.sessionId)));
    if (!state) return res.status(404).json({ error: 'Session not found' });

    res.json({
      currentRoom: state.currentRoom,
      previousRoom: state.previousRoom,
      inventory: state.inventory,
      equipped: state.equipped,
      flags: state.flags,
      visitedRooms: [...state.visitedRooms],
      puzzleStates: state.puzzleStates,
      puzzleProgress: state.puzzleProgress,
      currentAct: state.currentAct,
      storyBeatsTriggered: state.storyBeatsTriggered,
      turnCount: state.turnCount,
      playerHealth: state.playerHealth,
      radiationExposure: state.radiationExposure,
      globalEvents: state.globalEvents
    });
  });

  app.get('/debug/systems/:sessionId', (req: Request, res: Response) => {
    const state = engine.getState(p(req.params.sessionId));
    if (!state) return res.status(404).json({ error: 'Session not found' });
    res.json(state.shipSystems);
  });

  app.get('/debug/items/:sessionId', (req: Request, res: Response) => {
    const state = engine.getState(p(req.params.sessionId));
    if (!state) return res.status(404).json({ error: 'Session not found' });
    res.json({
      locations: state.itemLocations,
      hidden: state.itemHidden,
      properties: state.itemProperties
    });
  });

  app.get('/debug/room/:sessionId/:roomId', (req: Request, res: Response) => {
    const room = engine.nav.getRoom(p(req.params.roomId));
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const state = engine.getState(p(req.params.sessionId));
    const items = state ? engine.inv.getItemsInRoom(p(req.params.roomId), state) : [];
    const exits = state ? engine.nav.getVisibleExits(p(req.params.roomId), state) : [];

    res.json({ room, items, exits });
  });

  app.post('/debug/set-flag/:sessionId', (req: Request, res: Response) => {
    const state = engine.getState(p(req.params.sessionId));
    if (!state) return res.status(404).json({ error: 'Session not found' });

    const { flag, value } = req.body;
    if (!flag) return res.status(400).json({ error: 'Missing flag name' });

    state.flags[flag] = value !== undefined ? value : true;
    res.json({ ok: true, flags: state.flags });
  });

  app.post('/debug/teleport/:sessionId', (req: Request, res: Response) => {
    const state = engine.getState(p(req.params.sessionId));
    if (!state) return res.status(404).json({ error: 'Session not found' });

    const { roomId } = req.body;
    const room = engine.nav.getRoom(roomId);
    if (!room) return res.status(400).json({ error: 'Room not found' });

    state.previousRoom = state.currentRoom;
    state.currentRoom = roomId;
    state.visitedRooms.add(roomId);
    res.json({ ok: true, currentRoom: roomId });
  });

  app.post('/debug/give-item/:sessionId', (req: Request, res: Response) => {
    const state = engine.getState(p(req.params.sessionId));
    if (!state) return res.status(404).json({ error: 'Session not found' });

    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ error: 'Missing itemId' });

    if (!state.inventory.includes(itemId)) {
      state.inventory.push(itemId);
      state.itemLocations[itemId] = 'inventory';
      state.itemHidden[itemId] = false;
    }
    res.json({ ok: true, inventory: state.inventory });
  });

  app.post('/debug/solve-puzzle/:sessionId', (req: Request, res: Response) => {
    const state = engine.getState(p(req.params.sessionId));
    if (!state) return res.status(404).json({ error: 'Session not found' });

    const { puzzleId } = req.body;
    state.puzzleStates[puzzleId] = 'solved';
    res.json({ ok: true, puzzleStates: state.puzzleStates });
  });

  const browserEvalQueue = new Map<string, EvalTask[]>();
  const browserResultQueue = new Map<string, Map<string, unknown>>();

  app.post('/debug/eval-browser', (req: Request, res: Response) => {
    const { code, sessionId } = req.body;
    if (!code) return res.status(400).json({ error: 'Missing code' });

    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    if (!browserEvalQueue.has(sessionId)) browserEvalQueue.set(sessionId, []);
    browserEvalQueue.get(sessionId)!.push({ id, code });

    const start = Date.now();
    const check = (): void => {
      if (!browserResultQueue.has(sessionId)) browserResultQueue.set(sessionId, new Map());
      const results = browserResultQueue.get(sessionId)!;
      if (results.has(id)) {
        const result = results.get(id);
        results.delete(id);
        res.json({ id, result });
        return;
      }
      if (Date.now() - start > 10000) {
        res.json({ id, result: null, timeout: true });
        return;
      }
      setTimeout(check, 100);
    };
    check();
  });

  app.get('/debug/eval-poll/:sessionId', (req: Request, res: Response) => {
    const queue = browserEvalQueue.get(p(req.params.sessionId)) || [];
    browserEvalQueue.set(p(req.params.sessionId), []);
    res.json(queue);
  });

  app.post('/debug/eval-result/:sessionId', (req: Request, res: Response) => {
    const { id, result } = req.body;
    if (!browserResultQueue.has(p(req.params.sessionId))) browserResultQueue.set(p(req.params.sessionId), new Map());
    browserResultQueue.get(p(req.params.sessionId))!.set(id, result);
    res.json({ ok: true });
  });

  app.get('/debug/sessions', (_req: Request, res: Response) => {
    const sessions: unknown[] = [];
    for (const [id, state] of engine.sessions) {
      sessions.push({
        sessionId: id,
        currentRoom: state.currentRoom,
        turnCount: state.turnCount,
        currentAct: state.currentAct,
        health: state.playerHealth
      });
    }
    res.json(sessions);
  });

  app.get('/debug/console', (_req: Request, res: Response) => {
    res.send(getDebugConsoleHtml());
  });

  console.log('  Debug routes enabled: http://localhost:' + config.port + '/debug/console');
}

function getDebugConsoleHtml(): string {
  return `<!DOCTYPE html>
<html><head><title>VOID TRANSIT - Debug Console</title>
<style>
  body { background: #1a1a2e; color: #c0c0c0; font-family: 'Courier New', monospace; margin: 0; padding: 10px; }
  h1 { color: #e94560; font-size: 16px; margin: 0 0 10px; }
  .panel { background: #16213e; border: 1px solid #0f3460; padding: 10px; margin: 5px 0; border-radius: 4px; }
  .panel h2 { color: #e94560; font-size: 13px; margin: 0 0 8px; }
  #output { height: 300px; overflow-y: auto; background: #0a0a1a; padding: 8px; font-size: 12px; white-space: pre-wrap; }
  input, button, select { background: #0f3460; color: #c0c0c0; border: 1px solid #533483; padding: 4px 8px; font-family: inherit; font-size: 12px; }
  button { cursor: pointer; } button:hover { background: #533483; }
  .row { display: flex; gap: 8px; align-items: center; margin: 4px 0; }
  .row input { flex: 1; }
  .success { color: #33ff33; } .error { color: #ff3333; }
</style></head><body>
<h1>VOID TRANSIT — DEBUG CONSOLE</h1>
<div class="panel">
  <h2>Session</h2>
  <div class="row"><select id="session"></select><button onclick="refreshSessions()">Refresh</button></div>
</div>
<div class="panel">
  <h2>Commands</h2>
  <div class="row"><button onclick="getState()">Game State</button><button onclick="getSystems()">Ship Systems</button><button onclick="getItems()">Items</button></div>
  <div class="row"><input id="teleportRoom" placeholder="Room ID"><button onclick="teleport()">Teleport</button></div>
  <div class="row"><input id="giveItem" placeholder="Item ID"><button onclick="giveItem()">Give Item</button></div>
  <div class="row"><input id="setFlagName" placeholder="Flag name"><input id="setFlagValue" placeholder="Value (true/false)"><button onclick="setFlag()">Set Flag</button></div>
  <div class="row"><input id="solvePuzzle" placeholder="Puzzle ID"><button onclick="solvePuzzle()">Solve Puzzle</button></div>
  <div class="row"><input id="browserCode" placeholder="JS to eval in browser"><button onclick="evalBrowser()">Eval in Browser</button></div>
</div>
<div class="panel"><h2>Output</h2><div id="output"></div></div>
<script>
const out = document.getElementById('output');
function log(msg, cls) { out.innerHTML += '<span class="'+(cls||'')+'">' + (typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2)) + '</span>\\n'; out.scrollTop = out.scrollHeight; }
function sid() { return document.getElementById('session').value; }
async function api(method, url, body) {
  const opts = { method, headers: {'Content-Type':'application/json'} };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  return await res.json();
}
async function refreshSessions() {
  const data = await api('GET', '/debug/sessions');
  const sel = document.getElementById('session');
  sel.innerHTML = '';
  for (const s of data) { const o = document.createElement('option'); o.value = s.sessionId; o.textContent = s.sessionId + ' ('+s.currentRoom+', turn '+s.turnCount+')'; sel.appendChild(o); }
  log('Sessions refreshed: ' + data.length, 'success');
}
async function getState() { log(await api('GET', '/debug/state/'+sid())); }
async function getSystems() { log(await api('GET', '/debug/systems/'+sid())); }
async function getItems() { log(await api('GET', '/debug/items/'+sid())); }
async function teleport() { log(await api('POST', '/debug/teleport/'+sid(), { roomId: document.getElementById('teleportRoom').value })); }
async function giveItem() { log(await api('POST', '/debug/give-item/'+sid(), { itemId: document.getElementById('giveItem').value })); }
async function setFlag() { const v = document.getElementById('setFlagValue').value; log(await api('POST', '/debug/set-flag/'+sid(), { flag: document.getElementById('setFlagName').value, value: v === 'true' ? true : v === 'false' ? false : v })); }
async function solvePuzzle() { log(await api('POST', '/debug/solve-puzzle/'+sid(), { puzzleId: document.getElementById('solvePuzzle').value })); }
async function evalBrowser() { log(await api('POST', '/debug/eval-browser', { sessionId: sid(), code: document.getElementById('browserCode').value })); }
refreshSessions();
</script></body></html>`;
}


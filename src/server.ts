import express, { Request, Response } from 'express';
import * as path from 'path';
import config from './config';
import GameEngine from './engine/GameEngine';
import { parseWithHaiku, GameContext } from './nlp/HaikuParser';
import { parse as fallbackParse } from './nlp/FallbackParser';
import { generateProse, buildFallbackProse } from './nlp/ProseGenerator';
import { setupDebugRoutes } from './debug';
import { Intent, ActionResult, StoryContext } from './types';

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

const engine = new GameEngine();
setupDebugRoutes(app, engine);

const USE_HAIKU = process.env.USE_HAIKU !== 'false';

app.post('/api/new', (req: Request, res: Response) => {
  const sessionId: string = req.body.sessionId || generateSessionId();
  const result = engine.newGame(sessionId);

  res.json({
    sessionId,
    ...result
  });
});

app.post('/api/command', async (req: Request, res: Response) => {
  const { sessionId, input } = req.body;
  if (!sessionId || !input) {
    return res.status(400).json({ error: 'Missing sessionId or input.' });
  }

  const state = engine.getState(sessionId);
  if (!state) {
    return res.status(404).json({ error: 'No active game session. Start a new game.' });
  }

  try {
    const trimmed = input.trim().toLowerCase();
    if (trimmed.startsWith('save')) {
      const name = input.trim().substring(4).trim() || 'quicksave';
      const result = engine.saveGame(sessionId, name);
      return res.json({ type: 'save', prose: result.success ? `Game saved as "${name}".` : (result as { reason?: string }).reason });
    }
    if (trimmed.startsWith('load') || trimmed.startsWith('restore')) {
      const name = input.trim().replace(/^(load|restore)\s*/i, '').trim() || 'quicksave';
      const result = engine.loadGame(sessionId, name);
      if (!result.success) {
        return res.json({ type: 'load_failed', prose: (result as { reason?: string }).reason });
      }
      const prose = buildFallbackProse({ type: 'move_success', ...result } as ActionResult);
      return res.json({ type: 'load', prose: `Game loaded.\n\n${prose}`, ...result });
    }
    if (trimmed === 'saves') {
      const saves = engine.listSaves();
      if (!saves.length) return res.json({ type: 'saves', prose: 'No saved games found.' });
      const list = saves.map(s => `  ${s.slotName} — Turn ${s.turnCount} — ${new Date(s.timestamp).toLocaleString()}`).join('\n');
      return res.json({ type: 'saves', prose: `Saved games:\n${list}` });
    }

    let intent: Intent;
    if (USE_HAIKU) {
      const gameContext: GameContext = {
        currentRoom: state.currentRoom,
        inventory: state.inventory || [],
        visibleItems: []
      };
      intent = await parseWithHaiku(input, gameContext);
    } else {
      intent = fallbackParse(input);
    }

    const result = engine.processCommand(sessionId, intent);

    let prose: string;
    const storyContext: StoryContext = result.storyContext || { actId: 'unknown', actName: 'Unknown', tension: 0, solvedPuzzles: [], activePuzzles: [], turnCount: 0, playerHealth: 100, knownClues: [] };

    const alwaysFallback = ['help', 'inventory', 'status', 'systems', 'map', 'saves', 'hint', 'unknown', 'error'];
    if (alwaysFallback.includes(result.type)) {
      prose = buildFallbackProse(result);
    } else if (USE_HAIKU) {
      try {
        prose = await generateProse(result, storyContext, state);
      } catch {
        prose = buildFallbackProse(result);
      }
    } else {
      prose = buildFallbackProse(result);
    }

    if (result.systemEvents?.length) {
      for (const evt of result.systemEvents) {
        prose += `\n\n[${evt.type.toUpperCase()}] ${evt.message}`;
      }
    }

    if (result.storyBeats?.length) {
      for (const beat of result.storyBeats) {
        prose += `\n\n${beat.text}`;
      }
    }

    if (result.actTransition) {
      prose += `\n\n═══ ${result.actTransition.name} ═══`;
      if (result.actTransition.message) prose += `\n${result.actTransition.message}`;
    }

    if (result.ending) {
      prose += `\n\n═══════════════════════════════════════\n${result.ending.text}\n═══════════════════════════════════════`;
    }

    res.json({
      type: result.type,
      prose,
      roomId: result.currentRoom || state.currentRoom,
      turnCount: result.turnCount || state.turnCount,
      health: state.playerHealth,
      storyContext
    });

  } catch (err: unknown) {
    console.error('Command processing error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Internal error processing command.', detail: msg });
  }
});

app.post('/api/save', (req: Request, res: Response) => {
  const { sessionId, slotName } = req.body;
  const result = engine.saveGame(sessionId, slotName || 'quicksave');
  res.json(result);
});

app.post('/api/load', (req: Request, res: Response) => {
  const { sessionId, slotName } = req.body;
  const result = engine.loadGame(sessionId, slotName || 'quicksave');
  res.json(result);
});

app.get('/api/saves', (_req: Request, res: Response) => {
  res.json(engine.listSaves());
});

function generateSessionId(): string {
  return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
}

app.listen(config.port, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║        V O I D   T R A N S I T        ║
  ║                                       ║
  ║   Server running on port ${config.port}         ║
  ║   http://localhost:${config.port}               ║
  ║                                       ║
  ║   Haiku NLP: ${USE_HAIKU ? 'ENABLED ' : 'DISABLED'}                ║
  ╚═══════════════════════════════════════╝
  `);
});

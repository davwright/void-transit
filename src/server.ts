import express, { Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import config from './config';
import GameEngine from './engine/GameEngine';
import { parseWithHaiku, GameContext, setLogContext } from './nlp/HaikuParser';
import { parse } from './nlp/Parser';
import { generateProse, buildFallbackProse } from './nlp/ProseGenerator';
import { setupDebugRoutes } from './debug';
import { Intent, ActionResult, StoryContext } from './types';
import { logger } from './engine/InteractionLogger';
import { configureOpenRouter, isConfigured as isORConfigured, complete as orComplete, getAutopilotCommand } from './nlp/OpenRouterAdapter';

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
const VERSION = pkg.version;

function generateSessionId(): string {
  return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
}

export function createApp() {
  const app = express();
  app.use(express.json());
  const frontendDir = path.join(__dirname, 'frontend');
  app.use(express.static(frontendDir));

  // Serve index.html for the root route (SPA fallback)
  app.get('/', (_req: Request, res: Response) => {
    res.sendFile(path.join(frontendDir, 'index.html'));
  });

  const engine = new GameEngine();
  setupDebugRoutes(app, engine);

  const USE_HAIKU = process.env.USE_HAIKU !== 'false';

  // Track pending disambiguation choices per session
  const pendingDisambig = new Map<string, Intent[]>();

  app.get('/api/version', (_req: Request, res: Response) => {
    res.json({ version: VERSION });
  });

  // Plain-text GET endpoint for LLM playtesting
  // GET /api/test         → starts a new game, returns intro text
  // GET /api/test/look    → sends "look" command, returns plain text
  let testSessionId: string | null = null;

  app.get('/api/test', async (req: Request, res: Response) => {
    const prompt = (req.query.cmd as string || '').trim();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    // No prompt or no session → start new game
    if (!prompt || !testSessionId || !engine.getState(testSessionId)) {
      testSessionId = generateSessionId();
      const result = engine.newGame(testSessionId);
      if (prompt && prompt.length > 0) {
        // Session just created, fall through to command processing below
      } else {
        const prose = buildFallbackProse({ ...result, type: 'move_success' } as ActionResult);
        return res.send(`=== VOID TRANSIT v${VERSION} ===\n\n${prose}\n\n[Room: ${result.roomId}]`);
      }
    }

    // Process the command - reuse the POST logic but simplified
    const state = engine.getState(testSessionId)!;
    const trimmed = prompt.toLowerCase();

    // Handle save/load
    if (trimmed === 'save' || trimmed.startsWith('save ')) {
      const name = prompt.substring(4).trim() || 'quicksave';
      engine.saveGame(testSessionId, name);
      return res.send(`Game saved as "${name}".`);
    }
    if (trimmed.startsWith('load') || trimmed.startsWith('restore')) {
      const name = prompt.replace(/^(load|restore)\s*/i, '').trim() || 'quicksave';
      const result = engine.loadGame(testSessionId, name);
      if (!result.success) return res.send(`Load failed: ${(result as any).reason}`);
      const prose = buildFallbackProse({ ...result, type: 'move_success' } as ActionResult);
      return res.send(`Game loaded.\n\n${prose}`);
    }

    // Parse and process
    let intent: Intent = parse(prompt);
    if (intent.action === 'unknown' && USE_HAIKU && prompt.length > 2) {
      const gameContext: GameContext = {
        currentRoom: state.currentRoom,
        inventory: state.inventory || [],
        visibleItems: []
      };
      intent = await parseWithHaiku(prompt, gameContext);
    }

    const result = engine.processCommand(testSessionId, intent);
    let prose: string;
    const storyContext: StoryContext = result.storyContext || { actId: 'unknown', actName: 'Unknown', tension: 0, solvedPuzzles: [], activePuzzles: [], turnCount: 0, playerHealth: 100, knownClues: [] };

    if (['examine_scenery'].includes(result.type) && USE_HAIKU) {
      try {
        prose = await generateProse(result, storyContext, state);
      } catch {
        prose = buildFallbackProse(result);
      }
    } else {
      prose = buildFallbackProse(result);
    }

    if (result.systemEvents?.length) {
      for (const evt of result.systemEvents) prose += `\n\n[${evt.type.toUpperCase()}] ${evt.message}`;
    }
    if (result.storyBeats?.length) {
      for (const beat of result.storyBeats) prose += `\n\n${beat.text}`;
    }

    const roomId = result.currentRoom || state.currentRoom;
    return res.send(`${prose}\n\n[Room: ${roomId} | Turn: ${result.turnCount || state.turnCount} | HP: ${state.playerHealth}%]`);
  });

  // === OpenRouter LLM endpoints ===

  app.post('/api/llm/configure', (req: Request, res: Response) => {
    const { apiKey, model } = req.body;
    if (!apiKey) return res.status(400).json({ error: 'Missing apiKey' });
    configureOpenRouter({
      apiKey,
      model: model || 'openrouter/auto',
      referer: 'void-transit',
    });
    res.json({ success: true, model: model || 'openrouter/auto' });
  });

  app.post('/api/llm/complete', async (req: Request, res: Response) => {
    if (!isORConfigured()) return res.status(400).json({ error: 'OpenRouter not configured. POST /api/llm/configure first.' });
    const { prompt, systemPrompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
    try {
      const result = await orComplete(prompt, systemPrompt);
      res.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  // Autopilot: LLM decides the next command, server executes it
  app.post('/api/llm/autopilot', async (req: Request, res: Response) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });
    if (!isORConfigured()) return res.status(400).json({ error: 'OpenRouter not configured.' });

    const state = engine.getState(sessionId);
    if (!state) return res.status(404).json({ error: 'No active game session.' });

    try {
      // Get current room view for context
      const lookResult = engine.processCommand(sessionId, parse('look'));
      const lookProse = buildFallbackProse(lookResult);
      const recentHistory = state.conversationHistory.slice(-6).map(h =>
        `> ${h.intent.raw} → ${h.resultType}`
      );

      // Ask LLM what to do
      const command = await getAutopilotCommand(
        lookProse,
        recentHistory,
        state.inventory,
        state.currentRoom,
      );

      // Execute the command
      let intent: Intent = parse(command);
      const result = engine.processCommand(sessionId, intent);
      const prose = buildFallbackProse(result);

      res.json({
        command,
        type: result.type,
        prose,
        roomId: result.currentRoom || state.currentRoom,
        turnCount: result.turnCount || state.turnCount,
        health: state.playerHealth,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

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
      if (trimmed === 'save' || trimmed.startsWith('save ')) {
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
        const loadedState = engine.getState(sessionId)!;
        const prose = buildFallbackProse({ ...result, type: 'move_success' } as ActionResult);
        return res.json({ type: 'load', prose: `Game loaded.\n\n${prose}`, ...result, turnCount: loadedState.turnCount, health: loadedState.playerHealth });
      }
      if (trimmed === 'saves') {
        const saves = engine.listSaves();
        if (!saves.length) return res.json({ type: 'saves', prose: 'No saved games found.' });
        const list = saves.map(s => `  ${s.slotName} — Turn ${s.turnCount} — ${new Date(s.timestamp).toLocaleString()}`).join('\n');
        return res.json({ type: 'saves', prose: `Saved games:\n${list}` });
      }

      // Check if player is responding to a disambiguation prompt (typed "1", "2", etc.)
      const disambigMatch = trimmed.match(/^([1-9])$/);
      if (disambigMatch && pendingDisambig.has(sessionId)) {
        const candidates = pendingDisambig.get(sessionId)!;
        const choice = parseInt(disambigMatch[1]) - 1;
        if (choice >= 0 && choice < candidates.length) {
          pendingDisambig.delete(sessionId);
          // Re-process with the chosen intent
          const chosenIntent = candidates[choice];
          const result = engine.processCommand(sessionId, chosenIntent);
          const prose = buildFallbackProse(result);
          return res.json({
            type: result.type,
            prose,
            roomId: result.currentRoom || state.currentRoom,
            turnCount: result.turnCount || state.turnCount,
            health: state.playerHealth,
            storyContext: result.storyContext || { actId: 'unknown', actName: 'Unknown', tension: 0, solvedPuzzles: [], activePuzzles: [], turnCount: 0, playerHealth: 100, knownClues: [] }
          });
        } else {
          pendingDisambig.delete(sessionId);
          return res.json({ type: 'error', prose: `Invalid choice. Please try your command again.` });
        }
      }
      // Clear stale disambiguation if player typed something else
      pendingDisambig.delete(sessionId);

      // Set log context so Haiku calls are tagged with session/room/turn
      setLogContext(sessionId, state.currentRoom, state.turnCount);

      // Always try fallback parser first — it's fast and handles standard commands
      let intent: Intent = parse(input);
      let parseMethod: 'local' | 'haiku' = 'local';

      // If fallback parser didn't understand AND Haiku is enabled, let Haiku try
      // Skip Haiku for very short input — 1-2 chars won't parse better remotely
      if (intent.action === 'unknown' && USE_HAIKU && input.trim().length > 2) {
        const gameContext: GameContext = {
          currentRoom: state.currentRoom,
          inventory: state.inventory || [],
          visibleItems: []
        };
        intent = await parseWithHaiku(input, gameContext);
        parseMethod = 'haiku';
      }

      const result = engine.processCommand(sessionId, intent);

      let prose: string;
      const storyContext: StoryContext = result.storyContext || { actId: 'unknown', actName: 'Unknown', tension: 0, solvedPuzzles: [], activePuzzles: [], turnCount: 0, playerHealth: 100, knownClues: [] };

      // Types that need Haiku for dynamic generation (freeform questions about scenery)
      const needsHaiku = ['examine_scenery'];
      if (needsHaiku.includes(result.type) && USE_HAIKU) {
        try {
          prose = await generateProse(result, storyContext, state);
        } catch (haikuErr) {
          console.warn(`[v${VERSION}] Haiku generation failed`);
          prose = buildFallbackProse(result);
        }
      } else {
        // Everything else uses pre-written text from data files
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

      // Log the full interaction for dataset building and story analysis
      logger.logInteraction({
        sessionId,
        room: state.currentRoom,
        turnCount: state.turnCount,
        rawInput: input,
        parsedIntent: {
          action: intent.action,
          target: intent.target,
          instrument: intent.instrument,
          confidence: intent.confidence,
          hadAlternatives: !!(intent.alternatives?.length),
        },
        parseMethod,
        resultType: result.type,
        resultMessage: result.message || result.text,
        proseLength: prose.length,
        proseSource: (needsHaiku.includes(result.type) && USE_HAIKU) ? 'haiku' : 'fallback',
        storyContext: {
          actId: storyContext.actId,
          actName: storyContext.actName,
          tension: storyContext.tension,
        },
      });

      const response: Record<string, unknown> = {
        type: result.type,
        prose,
        roomId: result.currentRoom || state.currentRoom,
        turnCount: result.turnCount || state.turnCount,
        health: state.playerHealth,
        storyContext
      };

      // If disambiguation, store candidates so player can type "1" or "2"
      if (result.type === 'disambiguate' && result.candidates) {
        pendingDisambig.set(sessionId, result.candidates);
        response.candidates = result.candidates.map(c => ({
          action: c.action,
          target: c.target,
          instrument: c.instrument,
          label: [c.action, c.target, c.instrument ? `with ${c.instrument}` : ''].filter(Boolean).join(' ')
        }));
      }

      res.json(response);

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

  return { app, engine, USE_HAIKU };
}

// Only start listening when run directly (not when imported for tests)
if (require.main === module) {
  const { app, USE_HAIKU } = createApp();
  app.listen(config.port, () => {
    console.log(`
  ╔═══════════════════════════════════════╗
  ║        V O I D   T R A N S I T        ║
  ║              v${VERSION.padEnd(23)}║
  ║                                       ║
  ║   Server running on port ${config.port}         ║
  ║   http://localhost:${config.port}               ║
  ║                                       ║
  ║   Haiku NLP: ${USE_HAIKU ? 'ENABLED ' : 'DISABLED'}                ║
  ╚═══════════════════════════════════════╝
  `);
  });
}

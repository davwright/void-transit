import { execSync } from 'child_process';
import config from '../config';
import { parse as localParse } from './Parser';
import { Intent } from '../types';
import { logger } from '../engine/InteractionLogger';
import { decodeObject } from '../encoding';
import * as fs from 'fs';
import * as path from 'path';

export interface GameContext {
  currentRoom: string;
  inventory: string[];
  visibleItems?: string[];
}

// Lightweight context for logging — set by the server before each call
let _logContext = { sessionId: '', room: '', turnCount: 0 };

/** Set context so callClaude can log without needing parameters threaded everywhere */
export function setLogContext(sessionId: string, room: string, turnCount: number): void {
  _logContext = { sessionId, room, turnCount };
}

// Parse prompt — injectable or lazy-loaded from fs
let PARSE_SYSTEM = '';
let _parsePromptLoaded = false;

function _ensureParsePromptLoaded() {
  if (_parsePromptLoaded) return;
  _parsePromptLoaded = true;
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(config.dataDir, 'prompts.json'), 'utf-8'));
    PARSE_SYSTEM = (decodeObject(raw) as Record<string, string>).parseSystem;
  } catch { /* browser — not used without CLI */ }
}

/** Inject parse prompt (for browser builds) */
export function injectParsePrompt(prompt: string) {
  PARSE_SYSTEM = prompt;
  _parsePromptLoaded = true;
}

export async function parseWithHaiku(input: string, gameContext?: GameContext): Promise<Intent> {
  _ensureParsePromptLoaded();
  const contextPrompt = gameContext
    ? `\nCurrent room: ${gameContext.currentRoom}. Inventory: [${gameContext.inventory.join(', ')}]. Visible items: [${(gameContext.visibleItems || []).join(', ')}].`
    : '';

  const prompt = `${PARSE_SYSTEM}${contextPrompt}\n\nPlayer input: "${input}"`;

  try {
    const result = await callClaude(prompt, 'parse');
    const parsed = JSON.parse(result.trim());

    if (parsed.action) {
      parsed.raw = input;
      return parsed as Intent;
    }
  } catch {
    console.warn('Haiku parse failed, using local parser');
  }

  return localParse(input);
}

export function callClaude(prompt: string, callType: 'parse' | 'scenery' | 'prose' = 'prose'): Promise<string> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    try {
      const out = execSync(`${config.claudeCmd} -p --model ${config.claudeModel} --no-session-persistence`, {
        input: prompt,
        encoding: 'utf-8',
        timeout: 30000,
        windowsHide: true,
        maxBuffer: 1024 * 128
      }).trim();

      logger.logHaikuCall({
        sessionId: _logContext.sessionId,
        room: _logContext.room,
        turnCount: _logContext.turnCount,
        callType,
        prompt,
        response: out,
        durationMs: Date.now() - start,
        cached: false,
      });

      resolve(out);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);

      logger.logHaikuCall({
        sessionId: _logContext.sessionId,
        room: _logContext.room,
        turnCount: _logContext.turnCount,
        callType,
        prompt,
        response: '',
        durationMs: Date.now() - start,
        cached: false,
        error: msg,
      });

      reject(new Error(`Claude CLI error: ${msg}`));
    }
  });
}


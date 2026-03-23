import * as fs from 'fs';
import * as path from 'path';
import config from '../config';
import { encodeString, decodeString } from '../encoding';

/**
 * Logs all Haiku LLM calls and game interactions to JSONL files for:
 * - Building training/evaluation datasets from real Haiku responses
 * - Detecting story inconsistencies and quality issues
 * - Regression testing against known-good outputs
 */

export interface HaikuLogEntry {
  type: 'haiku_call';
  timestamp: string;
  sessionId: string;
  room: string;
  turnCount: number;
  callType: 'parse' | 'scenery' | 'prose';
  prompt: string;
  response: string;
  durationMs: number;
  cached: boolean;
  error?: string;
}

export interface InteractionLogEntry {
  type: 'interaction';
  timestamp: string;
  sessionId: string;
  room: string;
  turnCount: number;
  rawInput: string;
  parsedIntent: {
    action: string;
    target: string | null;
    instrument: string | null;
    confidence?: number;
    hadAlternatives: boolean;
  };
  parseMethod: 'local' | 'haiku';
  resultType: string;
  resultMessage?: string;
  proseLength: number;
  proseSource: 'haiku' | 'fallback';
  storyContext?: {
    actId: string;
    actName: string;
    tension: number;
  };
  flags?: Record<string, boolean | string>;
  error?: string;
}

type LogEntry = HaikuLogEntry | InteractionLogEntry;

class InteractionLogger {
  private initialized = false;
  private sessionPaths = new Map<string, string>();

  private getSessionPath(sessionId: string): string {
    if (this.sessionPaths.has(sessionId)) return this.sessionPaths.get(sessionId)!;
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const shortId = sessionId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
    const filepath = path.join(config.logsDir, `session-${ts}-${shortId}.jsonl`);
    this.sessionPaths.set(sessionId, filepath);
    return filepath;
  }

  private ensureDir(): void {
    if (this.initialized) return;
    if (!fs.existsSync(config.logsDir)) {
      fs.mkdirSync(config.logsDir, { recursive: true });
    }
    this.initialized = true;
  }

  private append(filepath: string, entry: LogEntry): void {
    try {
      this.ensureDir();
      fs.appendFileSync(filepath, JSON.stringify(entry) + '\n', 'utf-8');
    } catch (err) {
      console.warn('[InteractionLogger] Failed to write log:', err);
    }
  }

  logHaikuCall(entry: Omit<HaikuLogEntry, 'type' | 'timestamp'>): void {
    this.append(this.getSessionPath(entry.sessionId), {
      type: 'haiku_call',
      timestamp: new Date().toISOString(),
      ...entry,
      prompt: encodeString(entry.prompt),
      response: encodeString(entry.response),
      error: entry.error ? encodeString(entry.error) : undefined,
    });
  }

  logInteraction(entry: Omit<InteractionLogEntry, 'type' | 'timestamp'>): void {
    this.append(this.getSessionPath(entry.sessionId), {
      type: 'interaction',
      timestamp: new Date().toISOString(),
      ...entry,
      sessionId: encodeString(entry.sessionId),
      room: encodeString(entry.room),
      rawInput: encodeString(entry.rawInput),
      resultMessage: entry.resultMessage ? encodeString(entry.resultMessage) : undefined,
      storyContext: entry.storyContext ? {
        actId: encodeString(entry.storyContext.actId),
        actName: encodeString(entry.storyContext.actName),
        tension: entry.storyContext.tension,
      } : undefined,
    });
  }

  /** Read all haiku log entries (for analysis/tests), decoding base64 fields */
  readHaikuLogs(): HaikuLogEntry[] {
    const raw = this.readLogDir<HaikuLogEntry>('session-');
    return raw.filter(e => e.type === 'haiku_call').map(e => ({
      ...e,
      prompt: decodeString(e.prompt),
      response: decodeString(e.response),
      error: e.error ? decodeString(e.error) : undefined,
    }));
  }

  /** Read all interaction log entries (for analysis/tests), decoding base64 fields */
  readInteractionLogs(): InteractionLogEntry[] {
    const raw = this.readLogDir<InteractionLogEntry>('session-');
    return raw.filter(e => e.type === 'interaction').map(e => ({
      ...e,
      sessionId: decodeString(e.sessionId),
      room: decodeString(e.room),
      rawInput: decodeString(e.rawInput),
      resultMessage: e.resultMessage ? decodeString(e.resultMessage) : undefined,
      storyContext: e.storyContext ? {
        actId: decodeString(e.storyContext.actId),
        actName: decodeString(e.storyContext.actName),
        tension: e.storyContext.tension,
      } : undefined,
    }));
  }

  private readLogDir<T extends LogEntry>(prefix: string): T[] {
    this.ensureDir();
    const entries: T[] = [];
    const files = fs.readdirSync(config.logsDir)
      .filter(f => f.startsWith(prefix) && f.endsWith('.jsonl'))
      .sort();
    for (const file of files) {
      const content = fs.readFileSync(path.join(config.logsDir, file), 'utf-8');
      for (const line of content.split('\n')) {
        if (line.trim()) {
          try {
            entries.push(JSON.parse(line));
          } catch { /* skip malformed lines */ }
        }
      }
    }
    return entries;
  }
}

// Singleton — shared across server
export const logger = new InteractionLogger();

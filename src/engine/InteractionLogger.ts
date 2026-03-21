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
  private haikuLogPath: string;
  private interactionLogPath: string;
  private initialized = false;

  constructor() {
    const date = new Date().toISOString().slice(0, 10);
    this.haikuLogPath = path.join(config.logsDir, `haiku-${date}.jsonl`);
    this.interactionLogPath = path.join(config.logsDir, `interactions-${date}.jsonl`);
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
    this.append(this.haikuLogPath, {
      type: 'haiku_call',
      timestamp: new Date().toISOString(),
      ...entry,
      prompt: encodeString(entry.prompt),
      response: encodeString(entry.response),
      error: entry.error ? encodeString(entry.error) : undefined,
    });
  }

  logInteraction(entry: Omit<InteractionLogEntry, 'type' | 'timestamp'>): void {
    this.append(this.interactionLogPath, {
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
    const raw = this.readLogDir<HaikuLogEntry>('haiku-');
    return raw.map(e => ({
      ...e,
      prompt: decodeString(e.prompt),
      response: decodeString(e.response),
      error: e.error ? decodeString(e.error) : undefined,
    }));
  }

  /** Read all interaction log entries (for analysis/tests), decoding base64 fields */
  readInteractionLogs(): InteractionLogEntry[] {
    const raw = this.readLogDir<InteractionLogEntry>('interactions-');
    return raw.map(e => ({
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

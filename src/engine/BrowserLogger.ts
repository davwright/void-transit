/**
 * In-memory interaction logger for browser builds.
 * Same interface as InteractionLogger but stores in memory.
 * Data available for telemetry upload.
 */

import { encodeString, decodeString } from '../encoding';

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
  parseMethod: 'local' | 'haiku' | 'openrouter';
  resultType: string;
  resultMessage?: string;
  proseLength: number;
  proseSource: 'haiku' | 'fallback' | 'openrouter';
  storyContext?: {
    actId: string;
    actName: string;
    tension: number;
  };
  error?: string;
}

type LogEntry = HaikuLogEntry | InteractionLogEntry;

class BrowserLogger {
  private entries: LogEntry[] = [];

  logHaikuCall(entry: Omit<HaikuLogEntry, 'type' | 'timestamp'>): void {
    this.entries.push({
      type: 'haiku_call',
      timestamp: new Date().toISOString(),
      ...entry,
      prompt: encodeString(entry.prompt),
      response: encodeString(entry.response),
      error: entry.error ? encodeString(entry.error) : undefined,
    });
  }

  logInteraction(entry: Omit<InteractionLogEntry, 'type' | 'timestamp'>): void {
    this.entries.push({
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

  readHaikuLogs(): HaikuLogEntry[] {
    return this.entries.filter(e => e.type === 'haiku_call').map(e => {
      const h = e as HaikuLogEntry;
      return { ...h, prompt: decodeString(h.prompt), response: decodeString(h.response), error: h.error ? decodeString(h.error) : undefined };
    });
  }

  readInteractionLogs(): InteractionLogEntry[] {
    return this.entries.filter(e => e.type === 'interaction').map(e => {
      const i = e as InteractionLogEntry;
      return {
        ...i,
        sessionId: decodeString(i.sessionId),
        room: decodeString(i.room),
        rawInput: decodeString(i.rawInput),
        resultMessage: i.resultMessage ? decodeString(i.resultMessage) : undefined,
        storyContext: i.storyContext ? {
          actId: decodeString(i.storyContext.actId),
          actName: decodeString(i.storyContext.actName),
          tension: i.storyContext.tension,
        } : undefined,
      };
    });
  }

  /** Get all raw entries (encoded) for telemetry upload */
  getRawEntries(): LogEntry[] {
    return [...this.entries];
  }

  /** Clear logged entries (after upload) */
  clear(): void {
    this.entries = [];
  }

  getEntryCount(): number {
    return this.entries.length;
  }
}

export const browserLogger = new BrowserLogger();

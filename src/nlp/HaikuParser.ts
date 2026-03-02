import { execFile } from 'child_process';
import config from '../config';
import { parse as fallbackParse } from './FallbackParser';
import { Intent } from '../types';

export interface GameContext {
  currentRoom: string;
  inventory: string[];
  visibleItems?: string[];
}

const PARSE_SYSTEM = `You are a text adventure game parser for a hard sci-fi game called VOID TRANSIT. The player is aboard an interstellar ship.

Parse the player's natural language input into a structured command. Return ONLY valid JSON with no extra text.

JSON format:
{"action":"<verb>","target":"<noun/direction>","instrument":"<secondary noun or null>","value":"<numeric or text value if applicable, or null>"}

Valid actions: move, look, examine, take, drop, use, combine, equip, unequip, open, read, search, talk, wait, inventory, status, systems, map, hint, help, save, load, saves, puzzle_action

Direction targets for move: north, south, east, west, up, down, in, out

Examples:
"go north" -> {"action":"move","target":"north","instrument":null,"value":null}
"pick up the wrench" -> {"action":"take","target":"wrench","instrument":null,"value":null}
"use welding torch on hull" -> {"action":"use","target":"welding_torch","instrument":"hull","value":null}
"combine cable with tape" -> {"action":"combine","target":"cable_spool","instrument":"insulation_tape","value":null}
"what's in my pockets" -> {"action":"inventory","target":null,"instrument":null,"value":null}
"look around" -> {"action":"look","target":"around","instrument":null,"value":null}
"examine the blinking panel" -> {"action":"examine","target":"panel","instrument":null,"value":null}
"set pressure to 101.3" -> {"action":"puzzle_action","target":"pressure","instrument":null,"value":"101.3"}
"put on the suit" -> {"action":"equip","target":"eva_suit","instrument":null,"value":null}

For item names, use snake_case IDs when you can infer them, otherwise use the player's words.
Return ONLY the JSON object. No explanation, no markdown.`;

export async function parseWithHaiku(input: string, gameContext?: GameContext): Promise<Intent> {
  const contextPrompt = gameContext
    ? `\nCurrent room: ${gameContext.currentRoom}. Inventory: [${gameContext.inventory.join(', ')}]. Visible items: [${(gameContext.visibleItems || []).join(', ')}].`
    : '';

  const prompt = `${PARSE_SYSTEM}${contextPrompt}\n\nPlayer input: "${input}"`;

  try {
    const result = await callClaude(prompt);
    const parsed = JSON.parse(result.trim());

    if (parsed.action) {
      parsed.raw = input;
      return parsed as Intent;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Haiku parse failed, using fallback:', msg);
  }

  return fallbackParse(input);
}

export function callClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ['-p', '--model', config.claudeModel, prompt];
    const options = {
      timeout: 15000,
      maxBuffer: 1024 * 64,
      windowsHide: true
    };

    execFile(config.claudeCmd, args, options, (err, stdout) => {
      if (err) {
        reject(new Error(`Claude CLI error: ${err.message}`));
        return;
      }
      resolve(stdout);
    });
  });
}


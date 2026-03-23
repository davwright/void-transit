/**
 * OpenRouter LLM adapter — proxies requests through OpenRouter.ai
 * Supports any model available on OpenRouter (free and paid).
 * Used for: scenery generation, unknown command handling, and autopilot mode.
 */

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  referer: string;
}

export interface LLMResponse {
  text: string;
  model: string;
  tokensUsed: number;
}

let _config: OpenRouterConfig | null = null;

export function configureOpenRouter(config: OpenRouterConfig): void {
  _config = config;
}

export function isConfigured(): boolean {
  return _config !== null && _config.apiKey.length > 0;
}

export function getConfig(): OpenRouterConfig | null {
  return _config;
}

/**
 * Send a chat completion request to OpenRouter.
 * Works as a drop-in replacement for Claude CLI calls.
 */
export async function complete(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
  if (!_config) throw new Error('OpenRouter not configured');

  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${_config.apiKey}`,
      'HTTP-Referer': _config.referer,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: _config.model,
      messages,
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${err}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
    usage?: { total_tokens?: number };
  };
  const choice = data.choices?.[0];
  if (!choice) throw new Error('No response from OpenRouter');

  return {
    text: choice.message?.content?.trim() || '',
    model: data.model || _config.model,
    tokensUsed: data.usage?.total_tokens || 0,
  };
}

/**
 * Autopilot mode — ask the LLM what command to play next.
 * Returns a game command string.
 */
export async function getAutopilotCommand(
  gameResponse: string,
  recentHistory: string[],
  inventory: string[],
  currentRoom: string,
): Promise<string> {
  if (!_config) throw new Error('OpenRouter not configured');

  const historyText = recentHistory.slice(-8).map(h => `  ${h}`).join('\n');
  const invText = inventory.length > 0 ? inventory.join(', ') : 'nothing';

  const prompt = `You are playing a text adventure game set on an interstellar ship. You must explore, examine things, collect items, and solve problems.

CURRENT ROOM: ${currentRoom}
INVENTORY: ${invText}

RECENT HISTORY:
${historyText}

GAME OUTPUT:
${gameResponse}

Based on what you see, decide your next command. Think about:
- What seems interesting or unusual in the description?
- Have you explored all directions from this room?
- Are there items to pick up?
- Should you examine something mentioned?
- If stuck, try a new direction or use an item.

Available commands: look, examine [thing], take [thing], drop [thing], use [item], combine [a] with [b], read [thing], open [thing], search, i (inventory), status, m (map), save [name]
Movement: fore, aft, port, starboard, up, down

Respond with ONLY the command. Nothing else.`;

  const result = await complete(prompt);
  // Clean up — LLMs sometimes add quotes or explanations
  let cmd = result.text.split('\n')[0].trim();
  cmd = cmd.replace(/^["'`>]|["'`]$/g, '').trim();
  if (cmd.length > 80) cmd = cmd.substring(0, 80);
  return cmd || 'look';
}

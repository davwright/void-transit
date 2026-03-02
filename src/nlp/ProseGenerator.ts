import { callClaude } from './HaikuParser';
import { ActionResult, StoryContext, GameState } from '../types';

const PROSE_SYSTEM = `You are the narrator for VOID TRANSIT, a hard science fiction text adventure game. You write atmospheric, literary prose — tense, precise, and grounded in real physics.

Style guidelines:
- Second person present tense ("You see...", "The corridor stretches...")
- Concise but evocative — 2-4 sentences for most actions, up to a paragraph for major moments
- SENSORY DETAIL is paramount: temperature on skin, sounds in corridors (dripping, humming, silence), smells (ozone, glycol, cold metal, recycled air), the quality of light, textures under fingertips
- Technical accuracy — refer to real physics, engineering, chemistry when relevant
- PACING: Short sentences for tension. Fragments. Sharp. Longer, lyrical sentences during calm or awe. Match prose rhythm to the emotional beat.
- Show, don't tell — describe physical reactions instead of emotions. "Your mouth floods with saliva" not "you feel sick." "Your hands are steady" not "you feel brave."
- Foreshadow through environmental detail — the warmth of a bulkhead that should be cold, a sound that doesn't belong, an absence where something should be
- End scenes on hooks — the last sentence should make the player want to keep going
- The universe is the antagonist. It is vast, indifferent, and does not negotiate. Physics doesn't care about heroism.
- A woman named Chen Wei-Lin was awake and alone on this ship for 17 months. She was brilliant, determined, and terrified. Her traces are everywhere. Describe her legacy with respect — she is not a villain. She may be the only person who understood the truth.
- Never break immersion — no game mechanics language, no "you gained X"
- Never mention game concepts like "points", "levels", or "commands"

Ship: ISV Kepler's Promise, interstellar colony ship, 19.3 years into a 42-year journey to 82 Eridani.
Tone: Isolated, tense, methodical. Think Ridley Scott's Alien meets The Martian meets Arthur C. Clarke's Rendezvous with Rama — the dread of systematic exploration, the awe of scale, the horror of what you cannot see.`;

export async function generateProse(actionResult: ActionResult, storyContext: StoryContext, gameState: GameState): Promise<string> {
  const prompt = buildPrompt(actionResult, storyContext, gameState);

  try {
    const prose = await callClaude(prompt);
    return prose.trim();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Prose generation failed, using raw result:', msg);
    return buildFallbackProse(actionResult);
  }
}

function buildPrompt(actionResult: ActionResult, storyContext: StoryContext, gameState: GameState): string {
  let prompt = PROSE_SYSTEM + '\n\n';
  prompt += `Current situation:\n`;
  prompt += `- Location: ${gameState.currentRoom}\n`;
  prompt += `- Act: ${storyContext.actName} (tension: ${storyContext.tension}/10)\n`;
  prompt += `- Health: ${gameState.playerHealth}%, Radiation: ${(gameState.radiationExposure || 0).toFixed(1)} mSv\n`;
  prompt += `- Turn: ${gameState.turnCount}\n\n`;

  prompt += `Action result to narrate:\n`;
  prompt += `Type: ${actionResult.type}\n`;

  switch (actionResult.type) {
    case 'move_success':
      prompt += `Moved to: ${actionResult.roomName}\n`;
      prompt += `Room description (base): ${actionResult.description}\n`;
      prompt += `First visit: ${actionResult.isFirstVisit}\n`;
      if (actionResult.items?.length) prompt += `Visible items: ${actionResult.items.map(i => i.name).join(', ')}\n`;
      if (actionResult.exits?.length) prompt += `Exits: ${actionResult.exits.map(e => e.direction + (e.accessible ? '' : ' (blocked)')).join(', ')}\n`;
      if (actionResult.foreshadowing?.length) {
        for (const fs of actionResult.foreshadowing) {
          prompt += `[Weave in this ${fs.type === 'plant' ? 'subtle hint' : 'revelation'}: ${fs.type === 'plant' ? fs.plantText : fs.payoffText}]\n`;
        }
      }
      prompt += `\nWrite the room description. Include the base description naturally, note visible items and exits. Keep it atmospheric.`;
      break;

    case 'look':
      prompt += `Looking around: ${actionResult.roomName}\n`;
      prompt += `Description: ${actionResult.description}\n`;
      if (actionResult.items?.length) prompt += `Items: ${actionResult.items.map(i => i.name).join(', ')}\n`;
      prompt += `\nDescribe what the player sees. Be thorough but atmospheric.`;
      break;

    case 'examine':
      prompt += `Examining: ${actionResult.target}\n`;
      prompt += `Detail: ${actionResult.text}\n`;
      prompt += `\nNarrate the examination. Include the detail text naturally.`;
      break;

    case 'take_success':
      prompt += `Picked up: ${actionResult.itemName}\n`;
      prompt += `\nBriefly narrate picking up the item. One or two sentences.`;
      break;

    case 'combine_success':
      prompt += `Combined items: ${actionResult.message}\n`;
      if (actionResult.created) prompt += `Created: ${actionResult.created}\n`;
      prompt += `\nDescribe the combination process. Make it feel like real engineering.`;
      break;

    case 'use_success':
      prompt += `Used item: ${actionResult.message}\n`;
      prompt += `\nNarrate the action and its result.`;
      break;

    case 'puzzle_success':
      prompt += `Puzzle step completed: ${actionResult.message}\n`;
      prompt += `Puzzle complete: ${actionResult.completed}\n`;
      prompt += `\nNarrate the puzzle progress. If completed, make it satisfying. Refer to real science.`;
      break;

    case 'puzzle_failed':
      prompt += `Puzzle attempt failed: ${actionResult.reason}\n`;
      if (actionResult.hint) prompt += `Hint direction: ${actionResult.hint}\n`;
      if (actionResult.consequence) prompt += `Consequence: ${actionResult.consequence}\n`;
      prompt += `\nNarrate the failure. Be specific about why it didn't work (physics, engineering). If there's a consequence, describe it viscerally.`;
      break;

    default:
      prompt += `Message: ${actionResult.message || JSON.stringify(actionResult)}\n`;
      prompt += `\nNarrate this result briefly and atmospherically.`;
  }

  if (actionResult.systemEvents?.length) {
    prompt += `\n\nAlso incorporate these system events:\n`;
    for (const evt of actionResult.systemEvents) {
      prompt += `- [${evt.type}] ${evt.message}\n`;
    }
  }

  if (actionResult.storyBeats?.length) {
    prompt += `\n\nAlso weave in these story moments:\n`;
    for (const beat of actionResult.storyBeats) {
      prompt += `- ${beat.text}\n`;
    }
  }

  if (actionResult.actTransition) {
    prompt += `\n\nMajor story transition: ${actionResult.actTransition.message || 'New act: ' + actionResult.actTransition.name}`;
  }

  return prompt;
}

export function buildFallbackProse(actionResult: ActionResult): string {
  switch (actionResult.type) {
    case 'move_success':
    case 'look': {
      let text = `**${actionResult.roomName || 'Unknown'}**\n\n`;
      text += actionResult.description || 'You look around.';
      if (actionResult.items?.length) {
        text += '\n\nYou can see: ' + actionResult.items.map(i => i.name).join(', ') + '.';
      }
      if (actionResult.exits?.length) {
        text += '\n\nExits: ' + actionResult.exits.map(e => e.direction).join(', ') + '.';
      }
      return text;
    }
    case 'examine':
      return actionResult.text || `You examine the ${actionResult.target}.`;
    case 'take_success':
      return actionResult.message || `Taken.`;
    case 'take_failed':
    case 'move_failed':
    case 'use_failed':
    case 'examine_failed':
    case 'combine_failed':
    case 'drop_failed':
    case 'equip_failed':
    case 'unequip_failed':
    case 'open_failed':
    case 'read_failed':
      return actionResult.message || actionResult.reason || "That doesn't work.";
    case 'inventory': {
      if (!actionResult.items?.length) return 'You are carrying nothing.';
      let text = 'You are carrying:\n';
      for (const item of actionResult.items) {
        text += `  - ${item.name} (${item.weight}kg)\n`;
      }
      text += `\nTotal weight: ${actionResult.totalWeight!.toFixed(1)}/${actionResult.maxWeight}kg`;
      if (actionResult.equipped?.length) {
        text += '\n\nWearing: ' + actionResult.equipped.map(i => i.name).join(', ');
      }
      return text;
    }
    case 'help':
      return actionResult.message || '';
    case 'status':
      return `Health: ${actionResult.health}% | Radiation: ${(actionResult.radiation || 0).toFixed(1)} mSv | Turn: ${actionResult.turnCount}\nLocation: ${actionResult.location} | CO2: ${actionResult.co2Level} ppm`;
    case 'systems': {
      let text = 'Ship Systems:\n';
      if (actionResult.systems) {
        for (const [, sys] of Object.entries(actionResult.systems)) {
          const statusIcon = sys.status === 'nominal' ? '[OK]' : sys.status === 'warning' || sys.status === 'degraded' ? '[!!]' : '[XX]';
          text += `  ${statusIcon} ${sys.name}: ${sys.status}\n`;
        }
      }
      return text;
    }
    case 'hint': {
      if (actionResult.hints) {
        return actionResult.hints.map(h => `${h.puzzleName}: ${h.hint}`).join('\n');
      }
      return actionResult.message || '';
    }
    case 'map': {
      let text = `=== Ship Map ===\nYou are in: ${actionResult.currentRoom}\n\n`;
      if (actionResult.visited) {
        for (const [deck, rooms] of Object.entries(actionResult.visited)) {
          text += `Deck ${deck}:\n`;
          for (const room of rooms) {
            const marker = room.id === actionResult.currentRoom ? ' <-- YOU' : '';
            text += `  - ${room.name}${marker}\n`;
          }
        }
      }
      return text;
    }
    case 'save':
    case 'load':
    case 'saves':
      return actionResult.message || JSON.stringify(actionResult);
    case 'read_success':
      return `=== ${actionResult.itemName} ===\n\n${actionResult.text}`;
    case 'search_success':
    case 'search_nothing':
    case 'wait':
    case 'puzzle_success':
      return actionResult.message || '';
    case 'puzzle_failed': {
      let text = actionResult.reason || '';
      if (actionResult.hint) text += `\n\n(Hint: ${actionResult.hint})`;
      if (actionResult.consequence) text += `\n\n${actionResult.consequence}`;
      return text;
    }
    default:
      return actionResult.message || "Something happens, but you're not sure what.";
  }
}


import GameEngine from '../src/engine/GameEngine';
import { parse } from '../src/nlp/Parser';

for (const cmd of ['take personal photograph', 'take photograph', 'take photo', 'take datapad']) {
  const engine = new GameEngine();
  engine.newGame('t');
  const r = engine.processCommand('t', parse(cmd));
  process.stdout.write(`"${cmd}" → ${r.type}: ${r.itemName || r.message || ''}\n`);
}

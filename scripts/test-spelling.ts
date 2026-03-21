import { parse } from '../src/nlp/Parser';

const tests = [
  'where kit', 'test suit', 'drop sppol', 'take sppol',
  'where wrench', 'locate datapad',
];

for (const input of tests) {
  const p = parse(input);
  process.stdout.write(`"${input}" → action=${p.action} target=${p.target}\n`);
}

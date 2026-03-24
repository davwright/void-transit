import { parse } from '../src/nlp/Parser';
for (const cmd of ['hello', 'hi', 'help', 'hel']) {
  const r = parse(cmd);
  process.stdout.write(`"${cmd}" → action=${r.action} value=${r.value || ''}\n`);
}

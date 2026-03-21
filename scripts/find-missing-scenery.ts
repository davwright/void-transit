/**
 * Find nouns mentioned in room descriptions that don't have matching
 * scenery examineTargets. These are gaps where Haiku will hallucinate.
 * Don't print story content — just room ID + missing nouns.
 */
import { decodeObject } from '../src/encoding';
import * as fs from 'fs';

const roomsData = decodeObject(JSON.parse(fs.readFileSync('src/data/rooms.json', 'utf-8'))) as any;
const sceneryData = decodeObject(JSON.parse(fs.readFileSync('src/data/scenery.json', 'utf-8'))) as any;

// Common words to skip
const skipWords = new Set([
  'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'and', 'or', 'but', 'is', 'are',
  'was', 'were', 'has', 'have', 'had', 'its', 'it', 'this', 'that', 'with', 'from', 'by',
  'as', 'not', 'no', 'you', 'your', 'their', 'her', 'his', 'every', 'each', 'all', 'some',
  'than', 'too', 'very', 'just', 'also', 'been', 'being', 'which', 'who', 'whom', 'what',
  'where', 'when', 'how', 'why', 'one', 'two', 'three', 'four', 'them', 'they', 'we', 'us',
  'there', 'here', 'into', 'out', 'up', 'down', 'through', 'between', 'over', 'under',
  'about', 'after', 'before', 'during', 'without', 'within', 'along', 'around', 'against',
  'above', 'below', 'across', 'behind', 'beyond', 'beside', 'until', 'toward', 'towards',
  'can', 'could', 'would', 'should', 'will', 'shall', 'may', 'might', 'must',
  'do', 'does', 'did', 'done', 'doing', 'be', 'am',
  'more', 'most', 'other', 'another', 'any', 'many', 'few', 'several', 'enough',
  'like', 'almost', 'even', 'still', 'already', 'ever', 'never',
  'something', 'nothing', 'everything', 'anything', 'someone', 'everyone',
  'itself', 'himself', 'herself', 'themselves', 'yourself',
]);

// Extract significant noun phrases from text
function extractNouns(text: string): string[] {
  // Find words that might be examinable objects — nouns preceded by articles/adjectives
  const nouns: string[] = [];

  // Look for "the X", "a X" patterns — the word after article is likely a noun
  const articlePattern = /\b(?:the|a|an)\s+(\w+(?:\s+\w+)?)/gi;
  let match;
  while ((match = articlePattern.exec(text)) !== null) {
    const noun = match[1].toLowerCase();
    if (!skipWords.has(noun) && noun.length > 2) {
      nouns.push(noun);
    }
  }

  return [...new Set(nouns)];
}

for (const [roomId, room] of Object.entries(roomsData.rooms || {})) {
  const r = room as any;
  const desc = (r.description || '') as string;
  const firstVisit = (r.firstVisit || '') as string;
  const fullText = desc + ' ' + firstVisit;

  const nouns = extractNouns(fullText);
  const sceneryKeys = new Set(
    Object.keys(sceneryData.examineTargets?.[roomId] || {}).map((k: string) => k.toLowerCase())
  );
  const roomExamineKeys = new Set(
    Object.keys(r.examineTargets || {}).map((k: string) => k.toLowerCase())
  );

  const missing = nouns.filter(n => {
    const word = n.split(/\s+/)[0]; // first word of phrase
    // Check if any scenery key contains this word
    for (const key of [...sceneryKeys, ...roomExamineKeys]) {
      if (key.includes(word)) return false;
    }
    return true;
  });

  if (missing.length > 0) {
    process.stdout.write(`${roomId}: ${missing.join(', ')}\n`);
  }
}

process.stdout.write('\nDone.\n');

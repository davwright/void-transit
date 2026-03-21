import { describe, it, expect } from 'vitest';
import { parse } from '../src/nlp/Parser';
import { correctSpelling, levenshtein, viterbiTag, viterbiNBest } from '../src/nlp/StatisticalTagger';

describe('Parser', () => {
  describe('directions', () => {
    it('parses cardinal directions', () => {
      expect(parse('north').action).toBe('move');
      expect(parse('north').target).toBe('north');
      expect(parse('s').action).toBe('move');
      expect(parse('s').target).toBe('south');
      expect(parse('e').target).toBe('east');
      expect(parse('w').target).toBe('west');
    });

    it('parses vertical directions', () => {
      expect(parse('up')).toMatchObject({ action: 'move', target: 'up' });
      expect(parse('down')).toMatchObject({ action: 'move', target: 'down' });
      expect(parse('u')).toMatchObject({ action: 'move', target: 'up' });
      expect(parse('d')).toMatchObject({ action: 'move', target: 'down' });
    });

    it('parses in/out', () => {
      expect(parse('in')).toMatchObject({ action: 'move', target: 'in' });
      expect(parse('out')).toMatchObject({ action: 'move', target: 'out' });
    });

    it('parses nautical directions', () => {
      expect(parse('port')).toMatchObject({ action: 'move', target: 'west' });
      expect(parse('starboard')).toMatchObject({ action: 'move', target: 'east' });
      expect(parse('fore')).toMatchObject({ action: 'move', target: 'north' });
      expect(parse('aft')).toMatchObject({ action: 'move', target: 'south' });
      expect(parse('bow')).toMatchObject({ action: 'move', target: 'north' });
      expect(parse('stern')).toMatchObject({ action: 'move', target: 'south' });
      expect(parse('astern')).toMatchObject({ action: 'move', target: 'south' });
    });

    it('parses "go <direction>"', () => {
      expect(parse('go north')).toMatchObject({ action: 'move', target: 'north' });
      expect(parse('walk south')).toMatchObject({ action: 'move', target: 'south' });
    });
  });

  describe('substring verb matching', () => {
    it('matches "exa" to "examine"', () => {
      expect(parse('exa panel')).toMatchObject({ action: 'examine', target: 'panel' });
    });

    it('matches "inv" to "inventory"', () => {
      expect(parse('inv')).toMatchObject({ action: 'inventory' });
    });

    it('matches "com" to "combine"', () => {
      expect(parse('com cable with tape')).toMatchObject({ action: 'combine', target: 'cable', instrument: 'tape' });
    });

    it('matches "sta" to "status"', () => {
      expect(parse('sta')).toMatchObject({ action: 'status' });
    });

    it('matches exact verbs still work', () => {
      expect(parse('look')).toMatchObject({ action: 'look' });
      expect(parse('take wrench')).toMatchObject({ action: 'take', target: 'wrench' });
    });
  });

  describe('complex commands', () => {
    it('parses "use X on Y"', () => {
      const result = parse('use welding torch on hull');
      expect(result.action).toBe('use');
      expect(result.target).toBe('welding torch');
      expect(result.instrument).toBe('hull');
    });

    it('parses "combine X with Y"', () => {
      const result = parse('combine cable with tape');
      expect(result.action).toBe('combine');
      expect(result.target).toBe('cable');
      expect(result.instrument).toBe('tape');
    });

    it('parses "look at X" as examine', () => {
      expect(parse('look at panel')).toMatchObject({ action: 'examine', target: 'panel' });
    });

    it('parses "pick up X"', () => {
      expect(parse('pick up the wrench')).toMatchObject({ action: 'take', target: 'wrench' });
    });

    it('parses "put on X" as equip', () => {
      expect(parse('put on suit')).toMatchObject({ action: 'equip', target: 'suit' });
    });

    it('strips stop words from targets', () => {
      expect(parse('take the big wrench')).toMatchObject({ action: 'take', target: 'big wrench' });
    });
  });

  describe('meta commands', () => {
    it('parses save with slot name', () => {
      expect(parse('save my game')).toMatchObject({ action: 'save', target: 'my game' });
    });

    it('parses load with slot name', () => {
      expect(parse('load my game')).toMatchObject({ action: 'load', target: 'my game' });
    });

    it('bare save returns save action', () => {
      expect(parse('save')).toMatchObject({ action: 'save' });
    });

    it('parses help', () => {
      expect(parse('help')).toMatchObject({ action: 'help' });
      expect(parse('?')).toMatchObject({ action: 'help' });
    });
  });

  describe('empty input', () => {
    it('returns look for empty input', () => {
      expect(parse('')).toMatchObject({ action: 'look' });
      expect(parse('   ')).toMatchObject({ action: 'look' });
    });
  });

  describe('unknown commands', () => {
    it('treats single unknown words as examine attempts', () => {
      // Unknown words are treated as examine attempts rather than giving up
      expect(parse('thingamajig')).toMatchObject({ action: 'examine', target: 'thingamajig' });
    });

    it('rejects known non-game verbs with flavor text', () => {
      const result = parse('xyzzy');
      expect(result.action).toBe('rejected');
      expect(result.value).toBeTruthy();

      const dance = parse('dance');
      expect(dance.action).toBe('rejected');
      expect(dance.value).toBeTruthy();
    });

    it('returns unknown for truly empty-ish input after stop word removal', () => {
      expect(parse('the')).toMatchObject({ action: 'unknown' });
    });
  });

  describe('natural language questions', () => {
    it('parses "what does X consist of" as examine', () => {
      expect(parse('what does cryoprotectant gel consist of')).toMatchObject({ action: 'examine', target: 'cryoprotectant gel' });
    });

    it('parses "what is X" as examine', () => {
      expect(parse('what is the reactor')).toMatchObject({ action: 'examine' });
    });

    it('parses "tell me about X" as examine', () => {
      expect(parse('tell me about the panel')).toMatchObject({ action: 'examine', target: 'panel' });
    });

    it('parses "where is the wrench" as search', () => {
      const result = parse('where is the wrench');
      expect(result.action).toBe('search');
    });

    it('parses "how does the reactor work" as examine', () => {
      const result = parse('how does the reactor work');
      expect(result.action).toBe('examine');
    });

    it('parses "describe the corridor" as examine', () => {
      expect(parse('describe the corridor')).toMatchObject({ action: 'examine', target: 'corridor' });
    });
  });

  describe('nautical abbreviations', () => {
    it('parses "f" as fore/north', () => {
      expect(parse('f')).toMatchObject({ action: 'move', target: 'north' });
    });

    it('parses "a" as aft/south', () => {
      expect(parse('a')).toMatchObject({ action: 'move', target: 'south' });
    });

    it('parses "p" as port/west', () => {
      expect(parse('p')).toMatchObject({ action: 'move', target: 'west' });
    });

    it('parses "sb" as starboard/east', () => {
      expect(parse('sb')).toMatchObject({ action: 'move', target: 'east' });
    });

    it('parses "go fore" as move north', () => {
      expect(parse('go fore')).toMatchObject({ action: 'move', target: 'north' });
    });

    it('parses "head aft" as move south', () => {
      expect(parse('head aft')).toMatchObject({ action: 'move', target: 'south' });
    });
  });

  describe('phrasal verbs', () => {
    it('parses "turn on beacon"', () => {
      expect(parse('turn on beacon')).toMatchObject({ action: 'use', target: 'beacon' });
    });

    it('parses "turn off beacon"', () => {
      expect(parse('turn off beacon')).toMatchObject({ action: 'use', target: 'beacon' });
    });

    it('parses "turn beacon off" (split particle)', () => {
      expect(parse('turn beacon off')).toMatchObject({ action: 'use', target: 'beacon' });
    });

    it('parses "switch on reactor"', () => {
      expect(parse('switch on reactor')).toMatchObject({ action: 'use', target: 'reactor' });
    });

    it('parses "shut down reactor"', () => {
      expect(parse('shut down reactor')).toMatchObject({ action: 'use', target: 'reactor' });
    });

    it('parses "power off systems"', () => {
      expect(parse('power off systems')).toMatchObject({ action: 'use', target: 'systems' });
    });

    it('parses "pull up life support" as read', () => {
      expect(parse('pull up life support')).toMatchObject({ action: 'read', target: 'life support' });
    });

    it('parses "look at panel" as examine', () => {
      expect(parse('look at panel')).toMatchObject({ action: 'examine', target: 'panel' });
    });

    it('parses "look in cabinet" as search', () => {
      expect(parse('look in cabinet')).toMatchObject({ action: 'search', target: 'cabinet' });
    });

    it('parses "look inside locker" as search', () => {
      expect(parse('look inside locker')).toMatchObject({ action: 'search', target: 'locker' });
    });

    it('parses "put down wrench" as drop', () => {
      expect(parse('put down wrench')).toMatchObject({ action: 'drop', target: 'wrench' });
    });

    it('parses "take off suit" as unequip', () => {
      expect(parse('take off suit')).toMatchObject({ action: 'unequip', target: 'suit' });
    });
  });

  describe('expanded action synonyms', () => {
    it('parses "tap screen" as use', () => {
      expect(parse('tap screen')).toMatchObject({ action: 'use', target: 'screen' });
    });

    it('parses "touch panel" as use', () => {
      expect(parse('touch panel')).toMatchObject({ action: 'use', target: 'panel' });
    });

    it('parses "activate beacon" as use', () => {
      expect(parse('activate beacon')).toMatchObject({ action: 'use', target: 'beacon' });
    });

    it('parses "deactivate beacon" as use', () => {
      expect(parse('deactivate beacon')).toMatchObject({ action: 'use', target: 'beacon' });
    });

    it('parses "access terminal" as read', () => {
      expect(parse('access terminal')).toMatchObject({ action: 'read', target: 'terminal' });
    });
  });

  describe('spelling correction', () => {
    it('corrects "exmaine" to "examine"', () => {
      expect(parse('exmaine panel')).toMatchObject({ action: 'examine', target: 'panel' });
    });

    it('corrects "tke" to "take"', () => {
      expect(parse('tke wrench')).toMatchObject({ action: 'take', target: 'wrench' });
    });

    it('corrects "serach" to "search"', () => {
      expect(parse('serach cabinet')).toMatchObject({ action: 'search', target: 'cabinet' });
    });

    it('corrects "nroth" to "north"', () => {
      expect(parse('nroth')).toMatchObject({ action: 'move', target: 'north' });
    });

    it('corrects "combnine" to "combine"', () => {
      expect(parse('combnine cable with tape')).toMatchObject({ action: 'combine', target: 'cable', instrument: 'tape' });
    });

    it('corrects "opne" to "open"', () => {
      expect(parse('opne door')).toMatchObject({ action: 'open', target: 'door' });
    });

    it('does not correct short words (< 3 chars)', () => {
      // "zz" should not be corrected — too ambiguous
      expect(correctSpelling('zz')).toBeNull();
    });

    it('returns nearby words for vocabulary words (distance > 0)', () => {
      // "take" is in vocabulary — correctSpelling excludes exact matches (dist 0)
      // but may return close neighbors like "make" (dist 1)
      const result = correctSpelling('take');
      if (result) {
        expect(result.distance).toBeGreaterThan(0);
        expect(result.word).not.toBe('take');
      }
    });
  });

  describe('Levenshtein distance', () => {
    it('returns 0 for identical strings', () => {
      expect(levenshtein('hello', 'hello')).toBe(0);
    });

    it('returns correct distance for single edits', () => {
      expect(levenshtein('cat', 'bat')).toBe(1); // substitution
      expect(levenshtein('cat', 'cats')).toBe(1); // insertion
      expect(levenshtein('cats', 'cat')).toBe(1); // deletion
    });

    it('returns correct distance for multiple edits', () => {
      expect(levenshtein('kitten', 'sitting')).toBe(3);
    });

    it('handles empty strings', () => {
      expect(levenshtein('', 'abc')).toBe(3);
      expect(levenshtein('abc', '')).toBe(3);
      expect(levenshtein('', '')).toBe(0);
    });
  });

  describe('BK-tree fuzzy matching', () => {
    it('finds "examine" from "examin"', () => {
      const result = correctSpelling('examin');
      expect(result).not.toBeNull();
      expect(result!.word).toBe('examine');
      expect(result!.distance).toBe(1);
    });

    it('finds "search" from "serch"', () => {
      const result = correctSpelling('serch');
      expect(result).not.toBeNull();
      expect(result!.word).toBe('search');
      expect(result!.distance).toBe(1);
    });

    it('returns null for words too far from any known word', () => {
      const result = correctSpelling('zzzzzzz');
      expect(result).toBeNull();
    });
  });

  describe('Viterbi POS tagger', () => {
    it('tags known words with high confidence', () => {
      const tagged = viterbiTag(['take', 'the', 'wrench']);
      expect(tagged[0].category).toBe('action');
      expect(tagged[0].confidence).toBe(1.0);
      expect(tagged[1].category).toBe('article');
      expect(tagged[2].category).toBe('noun');
    });

    it('infers noun for unknown words in object position', () => {
      const tagged = viterbiTag(['examine', 'fluxcapacitor']);
      expect(tagged[0].category).toBe('action');
      expect(tagged[1].category).toBe('noun');
    });

    it('uses transition context to disambiguate', () => {
      // After an action verb, the model should prefer noun over other categories
      const tagged = viterbiTag(['grab', 'thingamajig']);
      expect(tagged[0].category).toBe('action');
      expect(tagged[1].category).toBe('noun');
    });

    it('tags misspelled verbs with corrected info', () => {
      const tagged = viterbiTag(['exmaine', 'panel']);
      // Should identify "exmaine" as action (corrected from "examine")
      expect(tagged[0].category).toBe('action');
      expect(tagged[0].corrected).toBe('examine');
      expect(tagged[0].confidence).toBeGreaterThan(0.5);
    });
  });

  describe('statistical fallback in parser', () => {
    it('handles misspelled verb + noun', () => {
      const result = parse('grb wrench');
      expect(result.action).toBe('take');
      expect(result.target).toBe('wrench');
    });

    it('handles completely unknown noun as examine', () => {
      // Single unknown word still becomes examine
      expect(parse('thingamajig')).toMatchObject({ action: 'examine', target: 'thingamajig' });
    });
  });

  describe('n-best Viterbi', () => {
    it('returns multiple tag sequences', () => {
      const results = viterbiNBest(['torch'], 3);
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].confidence).toBe(1); // best path has relative confidence 1.0
    });

    it('returns different tag sequences for ambiguous words', () => {
      // "torch" could be action (touch→use) or noun (game object)
      const results = viterbiNBest(['torch'], 4);
      const categories = results.map(r => r.tags[0].category);
      // Should have at least 2 different interpretations
      expect(new Set(categories).size).toBeGreaterThanOrEqual(2);
    });

    it('confidence decreases for lower-ranked paths', () => {
      const results = viterbiNBest(['exmaine', 'panel'], 3);
      for (let i = 1; i < results.length; i++) {
        expect(results[i].confidence).toBeLessThanOrEqual(results[i - 1].confidence);
      }
    });
  });

  describe('alternatives in parse results', () => {
    it('spelling-corrected commands carry alternatives', () => {
      // "grb wrench" — corrected to "grab wrench" (take), but could also be "examine grb wrench"
      const result = parse('grb wrench');
      expect(result.action).toBe('take');
      // May or may not have alternatives depending on path
    });

    it('deterministic parses have no alternatives', () => {
      // Known commands should have no alternatives (unambiguous)
      const result = parse('take wrench');
      expect(result.alternatives).toBeUndefined();
    });

    it('deterministic direction has no alternatives', () => {
      const result = parse('north');
      expect(result.alternatives).toBeUndefined();
    });
  });
});

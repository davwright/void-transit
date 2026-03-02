import { describe, it, expect } from 'vitest';
import { parse } from '../src/nlp/FallbackParser';

describe('FallbackParser', () => {
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
    it('returns unknown for gibberish', () => {
      expect(parse('xyzzy')).toMatchObject({ action: 'unknown' });
    });
  });
});

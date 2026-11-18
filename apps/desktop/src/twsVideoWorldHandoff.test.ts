import { describe, expect, it } from 'vitest';
import { parseTwsWorldHandoff } from './twsVideoWorldHandoff';

const token = 'a'.repeat(48);

describe('TWS-Video temporary world snapshot target', () => {
  it('accepts a properly scoped local handoff', () => {
    expect(parseTwsWorldHandoff(`?twsWorldPort=54321&twsWorldToken=${token}&twsWorldId=world-1`, 'localhost'))
      .toEqual({ port: 54321, token, worldId: 'world-1' });
  });

  it('rejects nonlocal hostnames and malformed tokens and ports', () => {
    expect(parseTwsWorldHandoff(`?twsWorldPort=54321&twsWorldToken=${token}&twsWorldId=world-1`, 'example.org')).toBeNull();
    expect(parseTwsWorldHandoff('?twsWorldPort=80&twsWorldToken=no&twsWorldId=world-1', 'localhost')).toBeNull();
    expect(parseTwsWorldHandoff(`?twsWorldPort=54321&twsWorldToken=${token}`, 'localhost')).toBeNull();
  });
});

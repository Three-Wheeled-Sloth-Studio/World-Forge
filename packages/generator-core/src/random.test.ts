import { describe, expect, it } from 'vitest';
import { createNodeRandom, nodeSeedPath } from './random';

describe('node-scoped generator random streams', () => {
  it('is deterministic for the same semantic node', () => {
    const first = createNodeRandom('seed-1', 'terrain.primordial');
    const second = createNodeRandom('seed-1', 'terrain.primordial');
    expect([first.next(), first.next(), first.int(1, 100)]).toEqual([
      second.next(),
      second.next(),
      second.int(1, 100)
    ]);
  });

  it('isolates unrelated nodes and named substreams', () => {
    expect(nodeSeedPath('seed-1', 'terrain.primordial')).not.toBe(
      nodeSeedPath('seed-1', 'plates.construct')
    );
    expect(nodeSeedPath('seed-1', 'terrain.primordial', 'impacts')).not.toBe(
      nodeSeedPath('seed-1', 'terrain.primordial', 'phases')
    );
    expect(createNodeRandom('seed-1', 'terrain.primordial').next()).not.toBe(
      createNodeRandom('seed-1', 'plates.construct').next()
    );
  });
});

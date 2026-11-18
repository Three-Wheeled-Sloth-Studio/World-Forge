import { describe, expect, it } from 'vitest';
import { createLocalWorldHandoffQueue, parseLocalWorldHandoffRequest } from './twsWorldHandoffPlugin';

describe('active World Forge world handoff queue', () => {
  const request = { projectId: 'world-1', port: 51234, token: 'a'.repeat(48) };

  it('validates loopback rendezvous shape and rejects malformed identities', () => {
    expect(parseLocalWorldHandoffRequest(request)).toEqual(request);
    expect(parseLocalWorldHandoffRequest({ ...request, token: 'bad' })).toBeNull();
    expect(parseLocalWorldHandoffRequest({ ...request, port: 80 })).toBeNull();
  });

  it('only yields the request to a tab on the matching world and consumes once', () => {
    const queue = createLocalWorldHandoffQueue();
    queue.enqueue(request);
    expect(queue.take('other-world')).toBeNull();
    expect(queue.take('world-1')).toEqual(request);
    expect(queue.take('world-1')).toBeNull();
  });

  it('expires old requests', () => {
    let time = 1000;
    const queue = createLocalWorldHandoffQueue(() => time);
    queue.enqueue(request);
    time += 120_000;
    expect(queue.take('world-1')).toBeNull();
  });
});

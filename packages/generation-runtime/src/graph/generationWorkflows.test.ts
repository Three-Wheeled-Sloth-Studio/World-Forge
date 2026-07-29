import { describe, expect, it } from 'vitest';
import { generationGraphWorkflow, generationGraphWorkflows } from './generationWorkflows';

describe('generation graph workflows', () => {
  it('keeps production and experimental workflow definitions independent', () => {
    const live = generationGraphWorkflow('core.live-world');
    const experimental = generationGraphWorkflow('core.performance-foundation');

    expect(live.nodes).not.toBe(experimental.nodes);
    expect(live.nodes.map((node) => node.id)).toEqual(experimental.nodes.map((node) => node.id));
    expect(live.status).toBe('production');
    expect(experimental.status).toBe('experimental');
  });

  it('falls back to the production workflow for unknown IDs', () => {
    expect(generationGraphWorkflow('missing').id).toBe('core.live-world');
    expect(generationGraphWorkflows).toHaveLength(2);
  });
});

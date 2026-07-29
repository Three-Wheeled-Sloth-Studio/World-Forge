import { describe, expect, it } from 'vitest';
import { generationGraphWorkflow, generationGraphWorkflows } from './generationWorkflows';

describe('generation graph workflows', () => {
  it('keeps production, control, and candidate definitions independent', () => {
    const live = generationGraphWorkflow('core.live-world');
    const control = generationGraphWorkflow('core.performance-foundation-control');
    const experimental = generationGraphWorkflow('core.performance-foundation');

    expect(live.nodes).not.toBe(control.nodes);
    expect(control.nodes).not.toBe(experimental.nodes);
    expect(live.nodes.map((node) => node.id)).toEqual(control.nodes.map((node) => node.id));
    expect(control.nodes.map((node) => node.id)).toEqual(experimental.nodes.map((node) => node.id));
    expect(live.status).toBe('production');
    expect(control.status).toBe('experimental');
    expect(experimental.status).toBe('experimental');
  });

  it('isolates the candidate change to the deep-time implementation contract', () => {
    const control = generationGraphWorkflow('core.performance-foundation-control');
    const candidate = generationGraphWorkflow('core.performance-foundation');
    const controlById = new Map(control.nodes.map((node) => [node.id, node]));

    for (const node of candidate.nodes) {
      const baseline = controlById.get(node.id);
      expect(baseline).toBeDefined();
      if (node.id === 'world.deep-time-aging') {
        expect(node.implementationId).not.toBe(baseline?.implementationId);
      } else {
        expect(node.implementationId).toBe(baseline?.implementationId);
      }
    }
  });

  it('falls back to the production workflow for unknown IDs', () => {
    expect(generationGraphWorkflow('missing').id).toBe('core.live-world');
    expect(generationGraphWorkflows).toHaveLength(3);
  });
});

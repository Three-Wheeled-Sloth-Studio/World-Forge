import { describe, expect, it } from 'vitest';
import { generationGraphWorkflow, generationGraphWorkflows } from './generationWorkflows';

describe('generation graph workflows', () => {
  it('keeps production, controls, and candidate definitions independent', () => {
    const live = generationGraphWorkflow('core.live-world');
    const agingControl = generationGraphWorkflow('core.performance-foundation-control');
    const boundedAgingControl = generationGraphWorkflow('core.performance-foundation-aging-control');
    const derivedControl = generationGraphWorkflow('core.performance-foundation-derived-control');
    const experimental = generationGraphWorkflow('core.performance-foundation');

    expect(live.nodes).not.toBe(agingControl.nodes);
    expect(agingControl.nodes).not.toBe(boundedAgingControl.nodes);
    expect(boundedAgingControl.nodes).not.toBe(derivedControl.nodes);
    expect(derivedControl.nodes).not.toBe(experimental.nodes);
    expect(live.nodes.map((node) => node.id)).toEqual(agingControl.nodes.map((node) => node.id));
    expect(agingControl.nodes.map((node) => node.id)).toEqual(boundedAgingControl.nodes.map((node) => node.id));
    expect(boundedAgingControl.nodes.map((node) => node.id)).toEqual(derivedControl.nodes.map((node) => node.id));
    expect(derivedControl.nodes.map((node) => node.id)).toEqual(experimental.nodes.map((node) => node.id));
    expect(live.status).toBe('production');
    expect(agingControl.status).toBe('experimental');
    expect(boundedAgingControl.status).toBe('experimental');
    expect(derivedControl.status).toBe('experimental');
    expect(experimental.status).toBe('experimental');
  });

  it('isolates hydrology traversal from the derived-field control contract', () => {
    const control = generationGraphWorkflow('core.performance-foundation-derived-control');
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
    expect(generationGraphWorkflows.map((workflow) => workflow.id)).toEqual([
      'core.live-world',
      'core.performance-foundation-control',
      'core.performance-foundation-aging-control',
      'core.performance-foundation-derived-control',
      'core.performance-foundation'
    ]);
  });
});

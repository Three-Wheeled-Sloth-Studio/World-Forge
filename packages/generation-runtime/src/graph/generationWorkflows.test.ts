import { describe, expect, it } from 'vitest';
import { generationGraphWorkflow, generationGraphWorkflows } from './generationWorkflows';

describe('generation graph workflows', () => {
  it('keeps Detailed, Legacy, Experimental, and controls independent', () => {
    const detailed = generationGraphWorkflow('core.performance-foundation');
    const legacy = generationGraphWorkflow('core.live-world');
    const experimental = generationGraphWorkflow('core.world-generation-experimental');
    const agingControl = generationGraphWorkflow('core.performance-foundation-control');
    const boundedAgingControl = generationGraphWorkflow('core.performance-foundation-aging-control');
    const derivedControl = generationGraphWorkflow('core.performance-foundation-derived-control');

    expect(detailed.nodes).not.toBe(legacy.nodes);
    expect(detailed.nodes).not.toBe(experimental.nodes);
    expect(legacy.nodes).not.toBe(agingControl.nodes);
    expect(agingControl.nodes).not.toBe(boundedAgingControl.nodes);
    expect(boundedAgingControl.nodes).not.toBe(derivedControl.nodes);
    expect(derivedControl.nodes).not.toBe(detailed.nodes);
    expect(detailed.nodes.map((node) => node.id)).toEqual(experimental.nodes.map((node) => node.id));
    expect(legacy.nodes.map((node) => node.id)).toEqual(agingControl.nodes.map((node) => node.id));
    expect(agingControl.nodes.map((node) => node.id)).toEqual(boundedAgingControl.nodes.map((node) => node.id));
    expect(boundedAgingControl.nodes.map((node) => node.id)).toEqual(derivedControl.nodes.map((node) => node.id));
    expect(derivedControl.nodes.map((node) => node.id)).toEqual(detailed.nodes.map((node) => node.id));
    expect(detailed.status).toBe('production');
    expect(legacy.status).toBe('experimental');
    expect(experimental.status).toBe('experimental');
    expect(agingControl.status).toBe('experimental');
    expect(boundedAgingControl.status).toBe('experimental');
    expect(derivedControl.status).toBe('experimental');
  });

  it('keeps Experimental behavior-identical to Detailed before future divergence', () => {
    const detailed = generationGraphWorkflow('core.performance-foundation');
    const experimental = generationGraphWorkflow('core.world-generation-experimental');

    expect(experimental.nodes.map((node) => [node.id, node.implementationId, node.version])).toEqual(
      detailed.nodes.map((node) => [node.id, node.implementationId, node.version])
    );
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

  it('falls back to Detailed for unknown IDs', () => {
    expect(generationGraphWorkflow('missing').id).toBe('core.performance-foundation');
    expect(generationGraphWorkflows.map((workflow) => workflow.id)).toEqual([
      'core.performance-foundation',
      'core.live-world',
      'core.world-generation-experimental',
      'core.performance-foundation-control',
      'core.performance-foundation-aging-control',
      'core.performance-foundation-derived-control'
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import {
  capabilityRuleApplies,
  generationCapabilitiesForProfile,
  resolveCapabilityGraph,
  type CapabilityGraphNode,
  type GenerationNodeCapabilityRule
} from './workflow-capabilities';

const nodes: CapabilityGraphNode[] = [
  { id: 'surface', dependencies: [] },
  { id: 'geology', dependencies: ['surface'] },
  { id: 'atmosphere', dependencies: ['surface'] },
  { id: 'ecology', dependencies: ['atmosphere'] },
  { id: 'projection', dependencies: ['ecology'] }
];

const rules: Record<string, GenerationNodeCapabilityRule> = {
  surface: { requiredAll: ['solid-surface'] },
  geology: { requiredAll: ['geological-activity'] },
  atmosphere: { requiredAll: ['substantial-atmosphere'] },
  ecology: { requiredAll: ['surface-liquid', 'ecological-potential'] },
  projection: { requiredAll: ['projected-surface'] }
};

describe('capability-resolved generation graphs', () => {
  it('keeps the full terrestrial-habitable graph', () => {
    const resolution = resolveCapabilityGraph(nodes, 'terrestrial-habitable', rules);
    expect(resolution.nodes.map((node) => node.id)).toEqual(nodes.map((node) => node.id));
    expect(resolution.omittedNodes).toEqual([]);
    expect(resolution.targetNodeId).toBe('projection');
  });

  it('omits structurally inapplicable work and dependent nodes', () => {
    const resolution = resolveCapabilityGraph(nodes, 'airless-rocky', rules);
    expect(resolution.nodes.map((node) => node.id)).toEqual(['surface']);
    expect(resolution.omittedNodes).toEqual([
      expect.objectContaining({ nodeId: 'geology', reason: 'capability-mismatch' }),
      expect.objectContaining({ nodeId: 'atmosphere', reason: 'capability-mismatch' }),
      expect.objectContaining({ nodeId: 'ecology', reason: 'capability-mismatch' }),
      expect.objectContaining({ nodeId: 'projection', reason: 'dependency-omitted' })
    ]);
  });

  it('supports any-capability rules for shared nodes', () => {
    const capabilities = generationCapabilitiesForProfile('stellar');
    expect(capabilityRuleApplies(capabilities, {
      requiredAny: ['solid-surface', 'stellar-surface']
    })).toBe(true);
    expect(capabilityRuleApplies(capabilities, {
      requiredAll: ['solid-surface']
    })).toBe(false);
  });
});

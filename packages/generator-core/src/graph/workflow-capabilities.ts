export const generationCapabilityIds = [
  'solid-surface',
  'geological-activity',
  'substantial-atmosphere',
  'surface-liquid',
  'ecological-potential',
  'projected-surface',
  'ring-system',
  'stellar-surface'
] as const;

export type GenerationCapabilityId = typeof generationCapabilityIds[number];

export const generationBodyProfileIds = [
  'terrestrial-habitable',
  'terrestrial-barren-active',
  'airless-rocky',
  'gas-giant',
  'ice-giant',
  'dwarf-minor',
  'debris-belt',
  'stellar'
] as const;

export type GenerationBodyProfileId = typeof generationBodyProfileIds[number];
export type GenerationCapabilitySet = Record<GenerationCapabilityId, boolean>;

export type GenerationNodeCapabilityRule = {
  requiredAll?: readonly GenerationCapabilityId[];
  requiredAny?: readonly GenerationCapabilityId[];
};

export type CapabilityGraphNode = {
  id: string;
  dependencies: readonly string[];
};

export type OmittedCapabilityNode = {
  nodeId: string;
  reason: 'capability-mismatch' | 'dependency-omitted';
  detail: string;
};

export type CapabilityGraphResolution<TNode extends CapabilityGraphNode> = {
  profileId: GenerationBodyProfileId;
  capabilities: GenerationCapabilitySet;
  nodes: readonly TNode[];
  omittedNodes: readonly OmittedCapabilityNode[];
  targetNodeId: string | null;
};

const noCapabilities = (): GenerationCapabilitySet => ({
  'solid-surface': false,
  'geological-activity': false,
  'substantial-atmosphere': false,
  'surface-liquid': false,
  'ecological-potential': false,
  'projected-surface': false,
  'ring-system': false,
  'stellar-surface': false
});

const profileCapabilities: Record<GenerationBodyProfileId, GenerationCapabilitySet> = {
  'terrestrial-habitable': {
    ...noCapabilities(),
    'solid-surface': true,
    'geological-activity': true,
    'substantial-atmosphere': true,
    'surface-liquid': true,
    'ecological-potential': true,
    'projected-surface': true
  },
  'terrestrial-barren-active': {
    ...noCapabilities(),
    'solid-surface': true,
    'geological-activity': true,
    'substantial-atmosphere': true,
    'projected-surface': true
  },
  'airless-rocky': {
    ...noCapabilities(),
    'solid-surface': true,
    'projected-surface': true
  },
  'gas-giant': {
    ...noCapabilities(),
    'substantial-atmosphere': true,
    'projected-surface': true,
    'ring-system': true
  },
  'ice-giant': {
    ...noCapabilities(),
    'substantial-atmosphere': true,
    'projected-surface': true,
    'ring-system': true
  },
  'dwarf-minor': {
    ...noCapabilities(),
    'solid-surface': true,
    'projected-surface': true
  },
  'debris-belt': noCapabilities(),
  stellar: {
    ...noCapabilities(),
    'stellar-surface': true
  }
};

export function generationCapabilitiesForProfile(profileId: GenerationBodyProfileId): GenerationCapabilitySet {
  return { ...profileCapabilities[profileId] };
}

export function capabilityRuleApplies(
  capabilities: GenerationCapabilitySet,
  rule: GenerationNodeCapabilityRule | undefined
): boolean {
  if (!rule) return true;
  const requiredAll = rule.requiredAll ?? [];
  const requiredAny = rule.requiredAny ?? [];
  if (requiredAll.some((capability) => !capabilities[capability])) return false;
  if (requiredAny.length > 0 && !requiredAny.some((capability) => capabilities[capability])) return false;
  return true;
}

export function resolveCapabilityGraph<TNode extends CapabilityGraphNode>(
  nodes: readonly TNode[],
  profileId: GenerationBodyProfileId,
  rules: Readonly<Record<string, GenerationNodeCapabilityRule | undefined>>
): CapabilityGraphResolution<TNode> {
  const capabilities = generationCapabilitiesForProfile(profileId);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const includedIds = new Set<string>();
  const resolved: TNode[] = [];
  const omittedNodes: OmittedCapabilityNode[] = [];

  for (const node of nodes) {
    const rule = rules[node.id];
    if (!capabilityRuleApplies(capabilities, rule)) {
      const requiredAll = rule?.requiredAll?.filter((capability) => !capabilities[capability]) ?? [];
      const requiredAny = rule?.requiredAny ?? [];
      const detail = requiredAll.length > 0
        ? `Missing required capabilities: ${requiredAll.join(', ')}.`
        : `Requires one of: ${requiredAny.join(', ')}.`;
      omittedNodes.push({ nodeId: node.id, reason: 'capability-mismatch', detail });
      continue;
    }

    const omittedDependencies = node.dependencies.filter((dependencyId) => (
      nodeIds.has(dependencyId) && !includedIds.has(dependencyId)
    ));
    if (omittedDependencies.length > 0) {
      omittedNodes.push({
        nodeId: node.id,
        reason: 'dependency-omitted',
        detail: `Omitted dependency: ${omittedDependencies.join(', ')}.`
      });
      continue;
    }

    resolved.push(node);
    includedIds.add(node.id);
  }

  return {
    profileId,
    capabilities,
    nodes: resolved,
    omittedNodes,
    targetNodeId: resolved.at(-1)?.id ?? null
  };
}

export const generationWorkflowIds = [
  'core.live-world',
  'core.performance-foundation-control',
  'core.performance-foundation-aging-control',
  'core.performance-foundation-derived-control',
  'core.performance-foundation',
  'core.world-generation-experimental'
] as const;

export type GenerationWorkflowId = typeof generationWorkflowIds[number];
export type GenerationWorkflowStatus = 'production' | 'experimental';
export type GenerationSeedStrategy = 'legacy-shared' | 'semantic-node';

export type GenerationWorkflowDescriptor = {
  id: GenerationWorkflowId;
  version: string;
  label: string;
  description: string;
  status: GenerationWorkflowStatus;
  seedStrategy: GenerationSeedStrategy;
  selectableInGenerator: boolean;
};

export type GenerationWorkflowDeepTimeFeatures = {
  reusePresentClimateDerivedFields: boolean;
  optimizeHydrologyTraversal: boolean;
  optimizePresentClimateTraversal: boolean;
};

export const defaultGenerationWorkflowId: GenerationWorkflowId = 'core.performance-foundation';

export const generationWorkflowDescriptors: readonly GenerationWorkflowDescriptor[] = [
  {
    id: 'core.performance-foundation',
    version: '1.1.0',
    label: 'World Generation (Detailed)',
    description: 'Primary production workflow with bounded aging, climate-field reuse, optimized hydrology, cached present-climate traversal, and High-resolution terrain continuity.',
    status: 'production',
    seedStrategy: 'semantic-node',
    selectableInGenerator: true
  },
  {
    id: 'core.live-world',
    version: '1.0.0',
    label: 'World Generation (Legacy)',
    description: 'Legacy shared-stream workflow retained for rollback, comparison, and older-generation reproducibility.',
    status: 'experimental',
    seedStrategy: 'legacy-shared',
    selectableInGenerator: true
  },
  {
    id: 'core.world-generation-experimental',
    version: '0.5.0',
    label: 'World Generation (Experimental)',
    description: 'Development workflow testing a mean-centered latitude-temperature profile and permanent polar ice while Detailed remains the production comparison baseline.',
    status: 'experimental',
    seedStrategy: 'semantic-node',
    selectableInGenerator: true
  },
  {
    id: 'core.performance-foundation-control',
    version: '0.1.0',
    label: 'Performance foundation control',
    description: 'Developer-only A/B control using semantic node seeds with the legacy six-epoch aging schedule.',
    status: 'experimental',
    seedStrategy: 'semantic-node',
    selectableInGenerator: false
  },
  {
    id: 'core.performance-foundation-aging-control',
    version: '0.1.0',
    label: 'Bounded aging control',
    description: 'Developer-only A/B control using bounded three-era aging without present-climate derived-field reuse.',
    status: 'experimental',
    seedStrategy: 'semantic-node',
    selectableInGenerator: false
  },
  {
    id: 'core.performance-foundation-derived-control',
    version: '0.1.0',
    label: 'Derived climate control',
    description: 'Developer-only A/B control using bounded aging and climate-field reuse without optimized hydrology or present-climate traversal.',
    status: 'experimental',
    seedStrategy: 'semantic-node',
    selectableInGenerator: false
  }
];

export function generationWorkflowDescriptor(id: string | undefined): GenerationWorkflowDescriptor {
  return generationWorkflowDescriptors.find((workflow) => workflow.id === id)
    ?? generationWorkflowDescriptors.find((workflow) => workflow.id === defaultGenerationWorkflowId)!;
}

export function normalizeGenerationWorkflowId(id: string | undefined): GenerationWorkflowId {
  return generationWorkflowDescriptor(id).id;
}

export function generationWorkflowDeepTimeFeatures(
  id: string | undefined
): GenerationWorkflowDeepTimeFeatures {
  const workflowId = generationWorkflowDescriptor(id).id;
  const optimizedWorkflow = workflowId === 'core.performance-foundation'
    || workflowId === 'core.world-generation-experimental';
  const reusePresentClimateDerivedFields = workflowId === 'core.performance-foundation-derived-control'
    || optimizedWorkflow;
  return {
    reusePresentClimateDerivedFields,
    optimizeHydrologyTraversal: optimizedWorkflow,
    optimizePresentClimateTraversal: optimizedWorkflow
  };
}

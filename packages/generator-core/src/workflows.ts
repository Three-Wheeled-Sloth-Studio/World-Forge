export const generationWorkflowIds = [
  'core.live-world',
  'core.performance-foundation-control',
  'core.performance-foundation-aging-control',
  'core.performance-foundation'
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

export const defaultGenerationWorkflowId: GenerationWorkflowId = 'core.live-world';

export const generationWorkflowDescriptors: readonly GenerationWorkflowDescriptor[] = [
  {
    id: 'core.live-world',
    version: '1.0.0',
    label: 'Live world generation',
    description: 'Current production workflow retained as the stable comparison and rollback path.',
    status: 'production',
    seedStrategy: 'legacy-shared',
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
    id: 'core.performance-foundation',
    version: '0.3.0',
    label: 'Performance foundation (experimental)',
    description: 'Experimental workflow with bounded three-era aging and present-climate derived-field reuse.',
    status: 'experimental',
    seedStrategy: 'semantic-node',
    selectableInGenerator: true
  }
];

export function generationWorkflowDescriptor(id: string | undefined): GenerationWorkflowDescriptor {
  return generationWorkflowDescriptors.find((workflow) => workflow.id === id)
    ?? generationWorkflowDescriptors.find((workflow) => workflow.id === defaultGenerationWorkflowId)!;
}

export function normalizeGenerationWorkflowId(id: string | undefined): GenerationWorkflowId {
  return generationWorkflowDescriptor(id).id;
}

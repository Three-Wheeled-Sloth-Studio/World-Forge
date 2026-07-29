export const generationWorkflowIds = [
  'core.live-world',
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
};

export const defaultGenerationWorkflowId: GenerationWorkflowId = 'core.live-world';

export const generationWorkflowDescriptors: readonly GenerationWorkflowDescriptor[] = [
  {
    id: 'core.live-world',
    version: '1.0.0',
    label: 'Live world generation',
    description: 'Current production workflow retained as the stable comparison and rollback path.',
    status: 'production',
    seedStrategy: 'legacy-shared'
  },
  {
    id: 'core.performance-foundation',
    version: '0.2.0',
    label: 'Performance foundation (experimental)',
    description: 'Experimental workflow with semantic node seeds and bounded three-era deep-time surface aging.',
    status: 'experimental',
    seedStrategy: 'semantic-node'
  }
];

export function generationWorkflowDescriptor(id: string | undefined): GenerationWorkflowDescriptor {
  return generationWorkflowDescriptors.find((workflow) => workflow.id === id)
    ?? generationWorkflowDescriptors.find((workflow) => workflow.id === defaultGenerationWorkflowId)!;
}

export function normalizeGenerationWorkflowId(id: string | undefined): GenerationWorkflowId {
  return generationWorkflowDescriptor(id).id;
}

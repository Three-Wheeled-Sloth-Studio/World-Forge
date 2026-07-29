export const generationWorkflowIds = [
  'core.live-world',
  'core.performance-foundation'
] as const;

export type GenerationWorkflowId = typeof generationWorkflowIds[number];
export type GenerationWorkflowStatus = 'production' | 'experimental';

export type GenerationWorkflowDescriptor = {
  id: GenerationWorkflowId;
  version: string;
  label: string;
  description: string;
  status: GenerationWorkflowStatus;
};

export const defaultGenerationWorkflowId: GenerationWorkflowId = 'core.live-world';

export const generationWorkflowDescriptors: readonly GenerationWorkflowDescriptor[] = [
  {
    id: 'core.live-world',
    version: '1.0.0',
    label: 'Live world generation',
    description: 'Current production workflow retained as the stable comparison and rollback path.',
    status: 'production'
  },
  {
    id: 'core.performance-foundation',
    version: '0.1.0',
    label: 'Performance foundation (experimental)',
    description: 'Copy of the live workflow reserved for the bounded structural-generation and deep-time performance work.',
    status: 'experimental'
  }
];

export function generationWorkflowDescriptor(id: string | undefined): GenerationWorkflowDescriptor {
  return generationWorkflowDescriptors.find((workflow) => workflow.id === id)
    ?? generationWorkflowDescriptors.find((workflow) => workflow.id === defaultGenerationWorkflowId)!;
}

export function normalizeGenerationWorkflowId(id: string | undefined): GenerationWorkflowId {
  return generationWorkflowDescriptor(id).id;
}

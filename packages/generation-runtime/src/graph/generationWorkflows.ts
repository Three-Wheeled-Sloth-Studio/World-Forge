import {
  generationWorkflowDescriptor,
  generationWorkflowDescriptors,
  type GenerationWorkflowId
} from '@world-forge/generator-core/workflows';
import { coreGenerationGraph, type GenerationGraphNodeDefinition } from './generationGraph';

export type GenerationGraphWorkflow = {
  id: GenerationWorkflowId;
  version: string;
  label: string;
  description: string;
  status: 'production' | 'experimental';
  nodes: readonly GenerationGraphNodeDefinition[];
};

function copyGraph(nodes: readonly GenerationGraphNodeDefinition[]): GenerationGraphNodeDefinition[] {
  return nodes.map((node) => ({
    ...node,
    inputs: [...node.inputs],
    outputs: [...node.outputs],
    fidelity: [...node.fidelity]
  }));
}

function nodesForWorkflow(workflowId: GenerationWorkflowId): GenerationGraphNodeDefinition[] {
  const nodes = copyGraph(coreGenerationGraph);
  if (workflowId !== 'core.performance-foundation') return nodes;
  return nodes.map((node) => node.id === 'world.deep-time-aging'
    ? {
        ...node,
        implementationId: 'core.world.deep-time-aging.bounded-three-era-v1',
        version: '2'
      }
    : node);
}

export const generationGraphWorkflows: readonly GenerationGraphWorkflow[] = generationWorkflowDescriptors.map((workflow) => ({
  ...workflow,
  // Keep an independent workflow definition so experimental nodes can be replaced
  // without mutating the production workflow or its comparison baseline.
  nodes: nodesForWorkflow(workflow.id)
}));

export function generationGraphWorkflow(id: string | undefined): GenerationGraphWorkflow {
  const descriptor = generationWorkflowDescriptor(id);
  return generationGraphWorkflows.find((workflow) => workflow.id === descriptor.id)!;
}

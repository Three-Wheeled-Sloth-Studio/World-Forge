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

export const generationGraphWorkflows: readonly GenerationGraphWorkflow[] = generationWorkflowDescriptors.map((workflow) => ({
  ...workflow,
  // Keep an independent workflow definition so experimental nodes can be replaced
  // without mutating the production workflow or its comparison baseline.
  nodes: copyGraph(coreGenerationGraph)
}));

export function generationGraphWorkflow(id: string | undefined): GenerationGraphWorkflow {
  const descriptor = generationWorkflowDescriptor(id);
  return generationGraphWorkflows.find((workflow) => workflow.id === descriptor.id)!;
}

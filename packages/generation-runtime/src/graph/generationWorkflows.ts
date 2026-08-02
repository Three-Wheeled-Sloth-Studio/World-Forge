
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
  let nodes = copyGraph(coreGenerationGraph);
  if (workflowId === 'core.performance-foundation-control') {
    return nodes.map((node) => node.id === 'world.deep-time-aging'
      ? { ...node, implementationId: 'core.world.deep-time-aging.semantic-seed-control', version: '1-control' }
      : node);
  }
  if (workflowId === 'core.performance-foundation-aging-control') {
    return nodes.map((node) => node.id === 'world.deep-time-aging'
      ? { ...node, implementationId: 'core.world.deep-time-aging.bounded-three-era-control', version: '2-control' }
      : node);
  }
  if (workflowId === 'core.performance-foundation-derived-control') {
    return nodes.map((node) => node.id === 'world.deep-time-aging'
      ? { ...node, implementationId: 'core.world.deep-time-aging.bounded-three-era-derived-climate-control', version: '3-control' }
      : node);
  }
  if (workflowId === 'core.performance-foundation' || workflowId === 'core.world-generation-experimental') {
    nodes = nodes.map((node) => node.id === 'world.deep-time-aging'
      ? { ...node, implementationId: 'core.world.deep-time-aging.present-climate-traversal-v1', version: '4' }
      : node);
    nodes = nodes.map((node) => node.id === 'climate.glaciation'
      ? { ...node, implementationId: 'core.climate.glaciation.mean-centered-power-v1', version: '2' }
      : node);
  }
  return nodes;
}

export const generationGraphWorkflows: readonly GenerationGraphWorkflow[] = generationWorkflowDescriptors.map((workflow) => ({
  ...workflow,
  nodes: nodesForWorkflow(workflow.id)
}));

export function generationGraphWorkflow(id: string | undefined): GenerationGraphWorkflow {
  const descriptor = generationWorkflowDescriptor(id);
  return generationGraphWorkflows.find((workflow) => workflow.id === descriptor.id)!;
}

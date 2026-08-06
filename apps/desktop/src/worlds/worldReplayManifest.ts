import type { GenerationConfig, SelectedValues, WorldProject } from '@world-forge/shared';
import {
  defaultGenerationWorkflowId,
  generationWorkflowDescriptor,
  type GenerationWorkflowId
} from '@world-forge/generator-core/workflows';
import { generationGraphWorkflow } from '@world-forge/generation-runtime/graph/generationWorkflows';

export const WORLD_REPLAY_MANIFEST_FORMAT = 'world-forge-replay' as const;
export const WORLD_REPLAY_MANIFEST_VERSION = 1 as const;
export const CURRENT_WORLD_FORGE_GENERATOR_VERSION = '0.1.2-mvp';

export type WorldReplayCompatibility = 'ready' | 'incompatible';

type WorkflowAwareGenerationConfig = GenerationConfig & {
  workflowId?: GenerationWorkflowId;
};

export type WorldReplayManifestV1 = {
  format: typeof WORLD_REPLAY_MANIFEST_FORMAT;
  formatVersion: typeof WORLD_REPLAY_MANIFEST_VERSION;
  worldProjectId: string;
  worldName: string;
  recordedAt: string;
  appVersion: string;
  sourceCommit: string | null;
  generatorVersion: string;
  generationProfile: GenerationConfig['generationProfile'];
  workflowId?: GenerationWorkflowId;
  workflowVersion?: string;
  config: GenerationConfig;
  selectedValues: SelectedValues;
  graph: {
    contractSignature: string;
    nodes: Array<{
      nodeId: string;
      implementationId: string;
      inputs: string[];
      outputs: string[];
    }>;
  };
  schemaVersions: {
    replayManifest: 1;
    worldProject: 1;
  };
  outputSignature: string;
};

export function buildWorldReplayManifest(project: WorldProject): WorldReplayManifestV1 {
  const workflow = workflowForConfig(project.config);
  const nodes = currentGraphContracts(workflow.id);
  return {
    format: WORLD_REPLAY_MANIFEST_FORMAT,
    formatVersion: WORLD_REPLAY_MANIFEST_VERSION,
    worldProjectId: project.projectId,
    worldName: project.projectName,
    recordedAt: project.updatedAt,
    appVersion: project.appVersion,
    sourceCommit: cleanText(project.sourceCommit),
    generatorVersion: project.generatorVersion,
    generationProfile: project.config.generationProfile,
    workflowId: workflow.id,
    workflowVersion: workflow.version,
    config: structuredClone(project.config),
    selectedValues: structuredClone(project.selectedValues),
    graph: {
      contractSignature: workflowContractSignature(workflow.id),
      nodes,
    },
    schemaVersions: {
      replayManifest: 1,
      worldProject: 1,
    },
    outputSignature: authoritativeWorldSignature(project),
  };
}

export function assessWorldReplayCompatibility(manifest: WorldReplayManifestV1): WorldReplayCompatibility {
  if (
    manifest.format !== WORLD_REPLAY_MANIFEST_FORMAT
    || manifest.formatVersion !== WORLD_REPLAY_MANIFEST_VERSION
    || manifest.generatorVersion !== CURRENT_WORLD_FORGE_GENERATOR_VERSION
  ) return 'incompatible';
  const workflow = generationWorkflowDescriptor(manifest.workflowId ?? workflowIdForConfig(manifest.config));
  if (manifest.workflowVersion && manifest.workflowVersion !== workflow.version) return 'incompatible';
  return manifest.graph.contractSignature === currentGraphContractSignature(workflow.id) ? 'ready' : 'incompatible';
}

export function currentGraphContractSignature(workflowId: GenerationWorkflowId = defaultGenerationWorkflowId): string {
  return workflowContractSignature(workflowId);
}

export function authoritativeWorldSignature(project: WorldProject): string {
  const { name: _displayName, ...authoritativeWorld } = project.primaryWorld;
  return stableSignature({
    seed: project.seed,
    config: project.config,
    selectedValues: project.selectedValues,
    solarSystem: project.solarSystem,
    primaryWorld: authoritativeWorld,
    metrics: project.metrics,
  });
}

export function isWorldReplayManifest(value: unknown): value is WorldReplayManifestV1 {
  if (!isRecord(value)) return false;
  if (value.format !== WORLD_REPLAY_MANIFEST_FORMAT || value.formatVersion !== WORLD_REPLAY_MANIFEST_VERSION) return false;
  if (!cleanText(value.worldProjectId) || !cleanText(value.worldName)) return false;
  if (!cleanText(value.generatorVersion) || !cleanText(value.outputSignature)) return false;
  if (!isRecord(value.config) || !isRecord(value.selectedValues) || !isRecord(value.graph)) return false;
  if (!cleanText(value.graph.contractSignature) || !Array.isArray(value.graph.nodes)) return false;
  return true;
}

function workflowForConfig(config: GenerationConfig) {
  return generationWorkflowDescriptor(workflowIdForConfig(config));
}

function workflowIdForConfig(config: GenerationConfig): GenerationWorkflowId {
  return generationWorkflowDescriptor((config as WorkflowAwareGenerationConfig).workflowId).id;
}

function workflowContractSignature(workflowId: GenerationWorkflowId): string {
  const workflow = generationWorkflowDescriptor(workflowId);
  return stableSignature({
    workflowId: workflow.id,
    workflowVersion: workflow.version,
    nodes: currentGraphContracts(workflow.id)
  });
}

function currentGraphContracts(workflowId: GenerationWorkflowId): WorldReplayManifestV1['graph']['nodes'] {
  return generationGraphWorkflow(workflowId).nodes.map((node) => ({
    nodeId: node.id,
    implementationId: node.implementationId,
    inputs: [...node.inputs],
    outputs: [...node.outputs],
  }));
}

function stableSignature(value: unknown): string {
  const hash = new StableHash();
  hash.add(value);
  return `wf-a1-${hash.digest()}`;
}

class StableHash {
  private left = 0x811c9dc5;
  private right = 0x9e3779b9;

  add(value: unknown): void {
    if (value === null) return this.token('null');
    if (value === undefined) return this.token('undefined');
    if (typeof value === 'string') return this.text(`s:${value.length}:`, value);
    if (typeof value === 'number') return this.token(`n:${numberText(value)}`);
    if (typeof value === 'boolean') return this.token(value ? 'b:1' : 'b:0');
    if (typeof value === 'bigint') return this.token(`i:${value.toString()}`);
    if (ArrayBuffer.isView(value)) {
      const view = value as ArrayBufferView;
      this.token(`t:${value.constructor.name}:${view.byteLength}:`);
      this.bytes(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
      return;
    }
    if (value instanceof ArrayBuffer) {
      this.token(`a:${value.byteLength}:`);
      this.bytes(new Uint8Array(value));
      return;
    }
    if (Array.isArray(value)) {
      this.token(`l:${value.length}:[`);
      for (const entry of value) this.add(entry);
      this.token(']');
      return;
    }
    if (isRecord(value)) {
      const keys = Object.keys(value).sort();
      this.token(`o:${keys.length}:{`);
      for (const key of keys) {
        this.text(`k:${key.length}:`, key);
        this.add(value[key]);
      }
      this.token('}');
      return;
    }
    this.token(`x:${String(value)}`);
  }

  digest(): string {
    return `${this.left.toString(16).padStart(8, '0')}${this.right.toString(16).padStart(8, '0')}`;
  }

  private token(value: string): void {
    this.bytes(new TextEncoder().encode(value));
  }

  private text(prefix: string, value: string): void {
    this.token(prefix);
    this.token(value);
  }

  private bytes(values: Uint8Array): void {
    for (const value of values) {
      this.left = Math.imul(this.left ^ value, 0x01000193) >>> 0;
      this.right = Math.imul(this.right ^ value, 0x85ebca6b) >>> 0;
      this.right = ((this.right << 13) | (this.right >>> 19)) >>> 0;
    }
  }
}

function numberText(value: number): string {
  if (Number.isNaN(value)) return 'NaN';
  if (value === Number.POSITIVE_INFINITY) return 'Infinity';
  if (value === Number.NEGATIVE_INFINITY) return '-Infinity';
  if (Object.is(value, -0)) return '-0';
  return value.toString();
}

function cleanText(value: unknown): string | null {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

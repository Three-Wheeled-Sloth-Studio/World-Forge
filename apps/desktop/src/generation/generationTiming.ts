import type { GenerationConfig, WorldProject } from '@world-forge/shared';

export const productionGenerationTimingSchemaVersion = 1 as const;
export const productionGenerationTimingHistoryLimit = 12;
const productionGenerationTimingHistoryKey = 'world-forge:production-generation-timing:v1';

export type GenerationTimingLaunchSource = 'generator' | 'dev-graph' | 'replay';
export type GenerationRunStatus = 'completed' | 'failed' | 'cancelled';

export type GenerationStageTiming = {
  stageId: string;
  label: string;
  elapsedMs: number;
  parentStageId?: string;
};

export type GenerationWorkerRequestTiming = {
  uiLaunchAtMs: number;
  uiDispatchAtMs: number;
  launchSource: GenerationTimingLaunchSource;
};

export type GenerationWorkerTiming = {
  workerReceivedAtMs: number;
  generationStartedAtMs: number;
  generationFinishedAtMs?: number;
  reconciliationFinishedAtMs?: number;
  payloadEstimateFinishedAtMs?: number;
  completedProjectPostStartedAtMs?: number;
  failedAtMs?: number;
  previewCount: number;
  previewBytesEmitted: number;
  previewCallbackMs: number;
  payloadEstimateMs?: number;
  estimatedPayloadBytes?: number;
  estimatedLayerBytes?: number;
  estimatedMetadataBytes?: number;
};

export type GenerationPreviewMessageTiming = {
  sequence: number;
  emittedAtMs: number;
  bytes: number;
};

export type ProductionGenerationTimingRecord = {
  schemaVersion: typeof productionGenerationTimingSchemaVersion;
  taskId: string;
  status: GenerationRunStatus;
  completedAt: string;
  clock: {
    strategy: 'performance.timeOrigin+performance.now';
    crossContextComparable: true;
  };
  identity: {
    appVersion: string;
    visibleVersion: string;
    sourceCommit: string;
    workflowId: string;
    workflowLabel: string;
    workflowVersion: string;
    seed: string;
    semanticSeeds?: { star?: string; world?: string };
    worldPreset?: string;
    configurationHash: string;
    outputResolution: { width: number; height: number };
    topologyResolution: number;
    topologyCellCount: number;
    launchSource: GenerationTimingLaunchSource;
    userAgent: string;
    logicalProcessorCount?: number;
    pageVisibleAtLaunch: boolean;
    pageFocusedAtLaunch: boolean;
  };
  timestamps: {
    uiLaunchAtMs: number;
    uiDispatchAtMs: number;
    workerReceivedAtMs?: number;
    generationStartedAtMs?: number;
    generationFinishedAtMs?: number;
    reconciliationFinishedAtMs?: number;
    payloadEstimateFinishedAtMs?: number;
    completedProjectPostStartedAtMs?: number;
    completedProjectReceiptAtMs?: number;
    projectAcceptanceStartedAtMs?: number;
    projectAcceptanceFinishedAtMs?: number;
    firstCommittedRenderAtMs?: number;
    firstInteractivePaintAtMs?: number;
    failedAtMs?: number;
  };
  durations: {
    uiDispatchToWorkerReceiptMs?: number;
    workerGenerationMs?: number;
    workerPostGenerationMs?: number;
    completedProjectHandoffMs?: number;
    uiProjectAcceptanceMs?: number;
    projectAcceptanceToRenderCommitMs?: number;
    renderCommitToInteractivePaintMs?: number;
    previewWorkerCallbackMs: number;
    previewUiPaintMs: number;
    payloadEstimateMs?: number;
    totalUserVisibleMs: number;
  };
  preview: {
    count: number;
    bytesEmitted: number;
    uiPaintCount: number;
    workerCallbackMs: number;
    uiPaintMs: number;
  };
  payload: {
    estimatedBytes?: number;
    layerBytes?: number;
    metadataBytes?: number;
  };
  nativeStages: GenerationStageTiming[];
  graphNodes: GenerationStageTiming[];
  failure?: {
    message: string;
    failedStageId?: string;
  };
  instrumentationGaps: string[];
};

export type ProductionGenerationTimingInput = {
  taskId: string;
  status: GenerationRunStatus;
  completedAt: string;
  appVersion: string;
  visibleVersion: string;
  sourceCommit: string;
  workflowId: string;
  workflowLabel: string;
  workflowVersion: string;
  config: GenerationConfig;
  project?: WorldProject;
  launchSource: GenerationTimingLaunchSource;
  uiLaunchAtMs: number;
  uiDispatchAtMs: number;
  pageVisibleAtLaunch: boolean;
  pageFocusedAtLaunch: boolean;
  userAgent: string;
  logicalProcessorCount?: number;
  worker?: GenerationWorkerTiming;
  completedProjectReceiptAtMs?: number;
  projectAcceptanceStartedAtMs?: number;
  projectAcceptanceFinishedAtMs?: number;
  firstCommittedRenderAtMs?: number;
  firstInteractivePaintAtMs?: number;
  previewUiPaintCount: number;
  previewUiPaintMs: number;
  nativeStages: readonly GenerationStageTiming[];
  graphNodes: readonly GenerationStageTiming[];
  failedAtMs?: number;
  failureMessage?: string;
  failedStageId?: string;
  instrumentationGaps?: readonly string[];
};

export type GenerationRunSummary = {
  completedAt: string;
  status: GenerationRunStatus;
  workflowId: string;
  workflowLabel: string;
  workflowVersion: string;
  totalElapsedMs: number;
  workerGenerationMs?: number;
  projectHandoffMs?: number;
  uiAcceptanceAndRenderMs?: number;
  slowestStage?: GenerationStageTiming;
  stages: GenerationStageTiming[];
  productionRecord?: ProductionGenerationTimingRecord;
};

export function crossContextTimestampMs(): number {
  if (typeof performance !== 'undefined' && Number.isFinite(performance.timeOrigin) && typeof performance.now === 'function') {
    return performance.timeOrigin + performance.now();
  }
  return Date.now();
}

function finiteDuration(start: number | undefined, finish: number | undefined): number | undefined {
  if (!Number.isFinite(start) || !Number.isFinite(finish)) return undefined;
  return Math.max(0, (finish as number) - (start as number));
}

function normalizedStageTimings(stages: readonly GenerationStageTiming[]): GenerationStageTiming[] {
  return stages
    .filter((stage) => Number.isFinite(stage.elapsedMs) && stage.elapsedMs >= 0)
    .map((stage) => ({ ...stage, elapsedMs: Math.max(0, stage.elapsedMs) }));
}

export function stableGenerationConfigurationHash(config: GenerationConfig): string {
  const serialized = stableStringify(config);
  let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (ArrayBuffer.isView(value)) return `{"typedArray":"${value.constructor.name}","byteLength":${value.byteLength}}`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`;
}

export function estimateWorldProjectTransferBytes(project: WorldProject): {
  estimatedBytes: number;
  layerBytes: number;
  metadataBytes: number;
} {
  const buffers = new Set<ArrayBufferLike>();
  const seen = new WeakSet<object>();
  let layerBytes = 0;

  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    if (ArrayBuffer.isView(value)) {
      if (!buffers.has(value.buffer)) {
        buffers.add(value.buffer);
        layerBytes += value.buffer.byteLength;
      }
      return;
    }
    if (value instanceof ArrayBuffer) {
      if (!buffers.has(value)) {
        buffers.add(value);
        layerBytes += value.byteLength;
      }
      return;
    }
    if (seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const entry of value) visit(entry);
      return;
    }
    for (const entry of Object.values(value as Record<string, unknown>)) visit(entry);
  };
  visit(project);

  const metadataJson = JSON.stringify(project, (_key, value: unknown) => {
    if (ArrayBuffer.isView(value)) return { typedArray: value.constructor.name, byteLength: value.byteLength };
    if (value instanceof ArrayBuffer) return { arrayBuffer: true, byteLength: value.byteLength };
    return value;
  });
  const metadataBytes = new TextEncoder().encode(metadataJson).byteLength;
  return { estimatedBytes: layerBytes + metadataBytes, layerBytes, metadataBytes };
}

export function buildProductionGenerationTimingRecord(input: ProductionGenerationTimingInput): ProductionGenerationTimingRecord {
  const worker = input.worker;
  const finalTimestamp = input.firstInteractivePaintAtMs
    ?? input.failedAtMs
    ?? input.projectAcceptanceFinishedAtMs
    ?? worker?.failedAtMs
    ?? worker?.completedProjectPostStartedAtMs
    ?? input.uiDispatchAtMs;
  const extendedConfig = input.config as GenerationConfig & {
    workflowId?: string;
    worldPresetId?: string;
    seeds?: { star?: string; world?: string };
  };
  const topologyResolution = input.project?.primaryWorld.topology.resolution
    ?? input.config.topologyResolution
    ?? 0;
  const nativeStages = normalizedStageTimings(input.nativeStages);
  const graphNodes = normalizedStageTimings(input.graphNodes);
  const gaps = [...new Set(input.instrumentationGaps ?? [])];
  if (!worker) gaps.push('Worker timing was unavailable; this run used the same-window fallback path.');
  if (input.status === 'completed' && input.firstInteractivePaintAtMs === undefined) {
    gaps.push('First interactive paint was not observed; total wall time ends at the latest available UI boundary.');
  }
  gaps.push('Preview callback timing measures emitted preview handling and transfer setup, not lower-level preview raster construction.');

  return {
    schemaVersion: productionGenerationTimingSchemaVersion,
    taskId: input.taskId,
    status: input.status,
    completedAt: input.completedAt,
    clock: {
      strategy: 'performance.timeOrigin+performance.now',
      crossContextComparable: true
    },
    identity: {
      appVersion: input.appVersion,
      visibleVersion: input.visibleVersion,
      sourceCommit: input.sourceCommit,
      workflowId: input.workflowId,
      workflowLabel: input.workflowLabel,
      workflowVersion: input.workflowVersion,
      seed: input.config.seed,
      semanticSeeds: extendedConfig.seeds ? { ...extendedConfig.seeds } : undefined,
      worldPreset: extendedConfig.worldPresetId,
      configurationHash: stableGenerationConfigurationHash(input.config),
      outputResolution: { ...input.config.outputResolution },
      topologyResolution,
      topologyCellCount: topologyResolution > 0 ? 6 * topologyResolution * topologyResolution : 0,
      launchSource: input.launchSource,
      userAgent: input.userAgent,
      logicalProcessorCount: input.logicalProcessorCount,
      pageVisibleAtLaunch: input.pageVisibleAtLaunch,
      pageFocusedAtLaunch: input.pageFocusedAtLaunch
    },
    timestamps: {
      uiLaunchAtMs: input.uiLaunchAtMs,
      uiDispatchAtMs: input.uiDispatchAtMs,
      workerReceivedAtMs: worker?.workerReceivedAtMs,
      generationStartedAtMs: worker?.generationStartedAtMs,
      generationFinishedAtMs: worker?.generationFinishedAtMs,
      reconciliationFinishedAtMs: worker?.reconciliationFinishedAtMs,
      payloadEstimateFinishedAtMs: worker?.payloadEstimateFinishedAtMs,
      completedProjectPostStartedAtMs: worker?.completedProjectPostStartedAtMs,
      completedProjectReceiptAtMs: input.completedProjectReceiptAtMs,
      projectAcceptanceStartedAtMs: input.projectAcceptanceStartedAtMs,
      projectAcceptanceFinishedAtMs: input.projectAcceptanceFinishedAtMs,
      firstCommittedRenderAtMs: input.firstCommittedRenderAtMs,
      firstInteractivePaintAtMs: input.firstInteractivePaintAtMs,
      failedAtMs: input.failedAtMs ?? worker?.failedAtMs
    },
    durations: {
      uiDispatchToWorkerReceiptMs: finiteDuration(input.uiDispatchAtMs, worker?.workerReceivedAtMs),
      workerGenerationMs: finiteDuration(worker?.generationStartedAtMs, worker?.generationFinishedAtMs),
      workerPostGenerationMs: finiteDuration(worker?.generationFinishedAtMs, worker?.completedProjectPostStartedAtMs),
      completedProjectHandoffMs: finiteDuration(worker?.completedProjectPostStartedAtMs, input.completedProjectReceiptAtMs),
      uiProjectAcceptanceMs: finiteDuration(input.projectAcceptanceStartedAtMs, input.projectAcceptanceFinishedAtMs),
      projectAcceptanceToRenderCommitMs: finiteDuration(input.projectAcceptanceFinishedAtMs, input.firstCommittedRenderAtMs),
      renderCommitToInteractivePaintMs: finiteDuration(input.firstCommittedRenderAtMs, input.firstInteractivePaintAtMs),
      previewWorkerCallbackMs: Math.max(0, worker?.previewCallbackMs ?? 0),
      previewUiPaintMs: Math.max(0, input.previewUiPaintMs),
      payloadEstimateMs: worker?.payloadEstimateMs,
      totalUserVisibleMs: Math.max(0, finalTimestamp - input.uiLaunchAtMs)
    },
    preview: {
      count: Math.max(0, worker?.previewCount ?? 0),
      bytesEmitted: Math.max(0, worker?.previewBytesEmitted ?? 0),
      uiPaintCount: Math.max(0, input.previewUiPaintCount),
      workerCallbackMs: Math.max(0, worker?.previewCallbackMs ?? 0),
      uiPaintMs: Math.max(0, input.previewUiPaintMs)
    },
    payload: {
      estimatedBytes: worker?.estimatedPayloadBytes,
      layerBytes: worker?.estimatedLayerBytes,
      metadataBytes: worker?.estimatedMetadataBytes
    },
    nativeStages,
    graphNodes,
    failure: input.failureMessage ? {
      message: input.failureMessage,
      failedStageId: input.failedStageId
    } : undefined,
    instrumentationGaps: [...new Set(gaps)]
  };
}

export function buildGenerationRunSummary(input: Omit<GenerationRunSummary, 'slowestStage' | 'stages' | 'status'> & {
  status?: GenerationRunStatus;
  stages: readonly GenerationStageTiming[];
}): GenerationRunSummary {
  const stages = normalizedStageTimings(input.stages);
  const slowestStage = stages.reduce<GenerationStageTiming | undefined>((slowest, stage) => (
    !slowest || stage.elapsedMs > slowest.elapsedMs ? stage : slowest
  ), undefined);
  return {
    completedAt: input.completedAt,
    status: input.status ?? 'completed',
    workflowId: input.workflowId,
    workflowLabel: input.workflowLabel,
    workflowVersion: input.workflowVersion,
    totalElapsedMs: Number.isFinite(input.totalElapsedMs) ? Math.max(0, input.totalElapsedMs) : 0,
    workerGenerationMs: input.workerGenerationMs,
    projectHandoffMs: input.projectHandoffMs,
    uiAcceptanceAndRenderMs: input.uiAcceptanceAndRenderMs,
    slowestStage,
    stages,
    productionRecord: input.productionRecord
  };
}

export function generationTimingRecordMarkdown(record: ProductionGenerationTimingRecord): string {
  const rows = [
    `# Production generation timing`,
    ``,
    `- Status: ${record.status}`,
    `- Completed: ${record.completedAt}`,
    `- App: ${record.identity.visibleVersion} (${record.identity.sourceCommit})`,
    `- Workflow: ${record.identity.workflowLabel} ${record.identity.workflowVersion} (${record.identity.workflowId})`,
    `- Seed: ${record.identity.seed}`,
    `- Resolution: ${record.identity.outputResolution.width} x ${record.identity.outputResolution.height}`,
    `- Topology: ${record.identity.topologyResolution} (${record.identity.topologyCellCount.toLocaleString()} cells)`,
    `- Configuration: ${record.identity.configurationHash}`,
    `- User-visible wall time: ${formatGenerationDuration(record.durations.totalUserVisibleMs)}`,
    `- Worker generation: ${formatOptionalDuration(record.durations.workerGenerationMs)}`,
    `- Completed-project handoff: ${formatOptionalDuration(record.durations.completedProjectHandoffMs)}`,
    `- UI acceptance: ${formatOptionalDuration(record.durations.uiProjectAcceptanceMs)}`,
    `- Acceptance to committed render: ${formatOptionalDuration(record.durations.projectAcceptanceToRenderCommitMs)}`,
    `- Render commit to interactive paint: ${formatOptionalDuration(record.durations.renderCommitToInteractivePaintMs)}`,
    `- Preview work: ${record.preview.count} emitted / ${record.preview.uiPaintCount} painted / ${formatGenerationBytes(record.preview.bytesEmitted)}`,
    `- Estimated completed-project payload: ${formatOptionalBytes(record.payload.estimatedBytes)}`,
    ``,
    `## Native stages`,
    ...record.nativeStages.map((stage) => `- ${stage.label}: ${formatGenerationDuration(stage.elapsedMs)}`)
  ];
  if (record.graphNodes.length) {
    rows.push('', '## Graph nodes', ...record.graphNodes.map((stage) => `- ${stage.label}: ${formatGenerationDuration(stage.elapsedMs)}`));
  }
  if (record.instrumentationGaps.length) {
    rows.push('', '## Instrumentation gaps', ...record.instrumentationGaps.map((gap) => `- ${gap}`));
  }
  if (record.failure) rows.push('', `Failure: ${record.failure.message}`);
  return rows.join('\n');
}

function formatOptionalDuration(value: number | undefined): string {
  return value === undefined ? 'not captured' : formatGenerationDuration(value);
}

function formatOptionalBytes(value: number | undefined): string {
  return value === undefined ? 'not captured' : formatGenerationBytes(value);
}

export function formatGenerationBytes(bytes: number): string {
  const safe = Math.max(0, Number.isFinite(bytes) ? bytes : 0);
  if (safe < 1024) return `${Math.round(safe)} B`;
  if (safe < 1024 * 1024) return `${(safe / 1024).toFixed(safe < 10 * 1024 ? 1 : 0)} KB`;
  return `${(safe / (1024 * 1024)).toFixed(safe < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

export function loadProductionGenerationTimingHistory(): ProductionGenerationTimingRecord[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(productionGenerationTimingHistoryKey) ?? '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is ProductionGenerationTimingRecord => Boolean(entry && typeof entry === 'object' && (entry as ProductionGenerationTimingRecord).schemaVersion === productionGenerationTimingSchemaVersion))
      .slice(0, productionGenerationTimingHistoryLimit);
  } catch {
    return [];
  }
}

export function retainProductionGenerationTimingRecord(record: ProductionGenerationTimingRecord): ProductionGenerationTimingRecord[] {
  const history = [record, ...loadProductionGenerationTimingHistory().filter((entry) => entry.taskId !== record.taskId)]
    .slice(0, productionGenerationTimingHistoryLimit);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(productionGenerationTimingHistoryKey, JSON.stringify(history));
    } catch {
      // Timing history is diagnostic convenience; generation must not fail if storage is unavailable.
    }
  }
  return history;
}

export function formatGenerationDuration(elapsedMs: number): string {
  const safeMs = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  if (safeMs < 1000) return `${Math.round(safeMs)} ms`;
  if (safeMs < 60_000) {
    const seconds = safeMs / 1000;
    return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)} s`;
  }
  let minutes = Math.floor(safeMs / 60_000);
  let seconds = Math.round((safeMs - minutes * 60_000) / 1000);
  if (seconds === 60) {
    minutes += 1;
    seconds = 0;
  }
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

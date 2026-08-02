import { GenerationPreviewFrame } from '@world-forge/generator-core';
import {
  generateProjectWithProductionAttribution
} from '@world-forge/generator-core/productionStagePipeline';
import type { NativeGenerationStageEvent } from '@world-forge/generator-core/nativeStagePipeline';
import type { GenerationGraphNodeRunEvent } from '@world-forge/generator-core/graph/types';
import { prepareSystemOrbitConfig, reconcileSystemOrbitPresets } from '@world-forge/generator-core/systemOrbitPreset';
import { coreGenerationGraph, generationGraphNodeForStageId } from '@world-forge/generation-runtime/graph/generationGraph';
import { GenerationConfig, WorldProject } from '@world-forge/shared';
import type { GenerationStageTelemetryDetail } from './generation/generationEvents';
import {
  crossContextTimestampMs,
  estimateWorldProjectTransferBytes,
  type GenerationPreviewMessageTiming,
  type GenerationWorkerRequestTiming,
  type GenerationWorkerTiming
} from './generation/generationTiming';
import { APP_SOURCE_COMMIT, APP_VERSION } from './appVersion';

type WorkerMessenger = { postMessage(message: GenerateResponse, transfer?: Transferable[]): void };
type GenerateRequest = {
  type: 'generate';
  id: string;
  config: GenerationConfig;
  timing?: GenerationWorkerRequestTiming;
};
type GenerateResponse =
  | { type: 'progress'; id: string; preview: GenerationPreviewFrame; previewTiming: GenerationPreviewMessageTiming }
  | { type: 'stage'; id: string; stage: GenerationStageTelemetryDetail }
  | { type: 'complete'; id: string; project: WorldProject; timing: GenerationWorkerTiming }
  | { type: 'error'; id: string; message: string; timing: GenerationWorkerTiming };

type SeededGenerationConfig = GenerationConfig & { seeds?: { star?: string; world?: string } };

function monotonicNowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function desktopStageEvent(taskId: string, event: NativeGenerationStageEvent): GenerationStageTelemetryDetail {
  const definition = generationGraphNodeForStageId(event.stageId);
  const graphNode = definition?.id === 'system.orbit' || definition?.id === 'world.deep-time-aging' || definition?.id === 'world.outputs-validation';
  return {
    taskId,
    nodeId: definition?.id ?? event.stageId,
    stageId: event.stageId,
    phase: event.phase,
    progress: event.progress,
    overallProgress: event.overallProgress,
    label: event.label,
    startedAt: event.startedAt,
    timestamp: event.timestamp,
    elapsedMs: event.elapsedMs,
    measured: true,
    nativeStage: true,
    graphNode,
    message: event.message,
    metrics: event.metrics
  };
}

function desktopGraphNodeEvent(taskId: string, event: GenerationGraphNodeRunEvent): GenerationStageTelemetryDetail {
  const definition = generationGraphNodeForStageId(event.nodeId);
  const index = Math.max(0, coreGenerationGraph.findIndex((node) => node.id === event.nodeId));
  const localProgress = event.phase === 'completed' || event.phase === 'failed' || event.phase === 'skipped' ? 1 : 0.02;
  return {
    taskId,
    nodeId: event.nodeId,
    stageId: event.nodeId,
    phase: event.phase === 'failed' ? 'failed' : event.phase,
    progress: localProgress,
    overallProgress: Math.min(0.995, (index + localProgress) / Math.max(1, coreGenerationGraph.length)),
    label: definition?.label ?? event.nodeId,
    startedAt: event.startedAt,
    timestamp: event.timestamp,
    elapsedMs: event.durationMs,
    measured: true,
    nativeStage: false,
    graphNode: true,
    dependencies: [...event.dependencies],
    version: event.version,
    message: event.error ?? event.skipReason,
    metrics: event.validation ? {
      validationValid: event.validation.valid,
      validationIssueCount: event.validation.issues.length
    } : undefined
  };
}

self.onmessage = (event: MessageEvent<GenerateRequest>) => {
  if (event.data.type !== 'generate') return;
  const taskId = event.data.id;
  const messenger = self as unknown as WorkerMessenger;
  const workerReceivedAtMs = crossContextTimestampMs();
  let generationStartedAtMs = workerReceivedAtMs;
  let generationFinishedAtMs: number | undefined;
  let reconciliationFinishedAtMs: number | undefined;
  let payloadEstimateFinishedAtMs: number | undefined;
  let completedProjectPostStartedAtMs: number | undefined;
  let previewCount = 0;
  let previewBytesEmitted = 0;
  let previewCallbackMs = 0;
  let payloadEstimateMs: number | undefined;
  let estimatedPayloadBytes: number | undefined;
  let estimatedLayerBytes: number | undefined;
  let estimatedMetadataBytes: number | undefined;

  const workerTiming = (failedAtMs?: number): GenerationWorkerTiming => ({
    workerReceivedAtMs,
    generationStartedAtMs,
    generationFinishedAtMs,
    reconciliationFinishedAtMs,
    payloadEstimateFinishedAtMs,
    completedProjectPostStartedAtMs,
    failedAtMs,
    previewCount,
    previewBytesEmitted,
    previewCallbackMs: Number(previewCallbackMs.toFixed(3)),
    payloadEstimateMs,
    estimatedPayloadBytes,
    estimatedLayerBytes,
    estimatedMetadataBytes
  });

  try {
    const config = prepareSystemOrbitConfig(event.data.config);
    const previewWidth = Math.min(1024, Math.max(256, Math.round(config.outputResolution.width / 2)));
    const previewHeight = Math.min(512, Math.max(128, Math.round(config.outputResolution.height / 2)));
    generationStartedAtMs = crossContextTimestampMs();
    const generatedProject = generateProjectWithProductionAttribution(config, {
      appVersion: APP_VERSION,
      sourceCommit: APP_SOURCE_COMMIT,
      previewResolution: { width: previewWidth, height: previewHeight },
      onProgress: (preview) => {
        const callbackStartedAt = monotonicNowMs();
        previewCount += 1;
        const bytes = preview.rgba.byteLength;
        previewBytesEmitted += bytes;
        const previewTiming: GenerationPreviewMessageTiming = {
          sequence: previewCount,
          emittedAtMs: crossContextTimestampMs(),
          bytes
        };
        messenger.postMessage({ type: 'progress', id: taskId, preview, previewTiming } satisfies GenerateResponse, [preview.rgba.buffer]);
        previewCallbackMs += Math.max(0, monotonicNowMs() - callbackStartedAt);
      },
      onStageEvent: (stageEvent) => {
        messenger.postMessage({ type: 'stage', id: taskId, stage: desktopStageEvent(taskId, stageEvent) } satisfies GenerateResponse);
      },
      onGraphNodeEvent: (graphNodeEvent) => {
        messenger.postMessage({ type: 'stage', id: taskId, stage: desktopGraphNodeEvent(taskId, graphNodeEvent) } satisfies GenerateResponse);
      }
    });
    generationFinishedAtMs = crossContextTimestampMs();
    const seededConfig = generatedProject.config as SeededGenerationConfig;
    const requestedSeeds = (event.data.config as SeededGenerationConfig).seeds;
    seededConfig.seeds = {
      ...seededConfig.seeds,
      star: seededConfig.seeds?.star ?? requestedSeeds?.star ?? event.data.config.seed,
      world: seededConfig.seeds?.world ?? requestedSeeds?.world ?? event.data.config.seed
    };
    const project = reconcileSystemOrbitPresets(generatedProject);
    reconciliationFinishedAtMs = crossContextTimestampMs();

    const payloadStartedAt = monotonicNowMs();
    const payload = estimateWorldProjectTransferBytes(project);
    payloadEstimateMs = Number(Math.max(0, monotonicNowMs() - payloadStartedAt).toFixed(3));
    estimatedPayloadBytes = payload.estimatedBytes;
    estimatedLayerBytes = payload.layerBytes;
    estimatedMetadataBytes = payload.metadataBytes;
    payloadEstimateFinishedAtMs = crossContextTimestampMs();
    completedProjectPostStartedAtMs = crossContextTimestampMs();
    messenger.postMessage({ type: 'complete', id: taskId, project, timing: workerTiming() } satisfies GenerateResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failedAtMs = crossContextTimestampMs();
    messenger.postMessage({ type: 'error', id: taskId, message, timing: workerTiming(failedAtMs) } satisfies GenerateResponse);
  }
};

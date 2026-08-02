import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import type { GenerationPreviewFrame } from '@world-forge/generator-core';
import {
  generateProjectWithNativeStages,
  nativeGenerationStageIds,
  type NativeGenerationStageEvent
} from '@world-forge/generator-core/nativeStagePipeline';
import { generationWorkflowDescriptor } from '@world-forge/generator-core/workflows';
import { prepareSystemOrbitConfig, reconcileSystemOrbitPresets } from '@world-forge/generator-core/systemOrbitPreset';
import type { GenerationGraphNodeRunEvent } from '@world-forge/generator-core/graph/types';
import { coreGenerationGraph, generationGraphNodeForStageId } from '@world-forge/generation-runtime/graph/generationGraph';
import { GenerationConfig, WorldProject } from '@world-forge/shared';
import { APP_SOURCE_COMMIT, APP_VERSION, APP_VISIBLE_VERSION } from '../appVersion';
import { loadWorkspaceSettings } from '../sync';
import {
  WORLD_FORGE_REPLAY_REQUEST_EVENT,
  notifyParchmentReplayResult,
  rememberWorldName,
  type WorldReplayRequestDetail,
} from '../worlds/worldIdentityBridge';
import { authoritativeWorldSignature } from '../worlds/worldReplayManifest';
import {
  developerGenerationRunEvent,
  generationStageTelemetryEvent,
  generationTelemetryEvent,
  type DeveloperGenerationRunDetail,
  type GenerationStageTelemetryDetail,
  type GenerationTelemetryDetail
} from './generationEvents';
import {
  buildGenerationRunSummary,
  buildProductionGenerationTimingRecord,
  crossContextTimestampMs,
  estimateWorldProjectTransferBytes,
  loadProductionGenerationTimingHistory,
  retainProductionGenerationTimingRecord,
  type GenerationRunSummary,
  type GenerationStageTiming,
  type GenerationWorkerRequestTiming,
  type GenerationWorkerTiming,
  type ProductionGenerationTimingRecord
} from './generationTiming';

export { generationStageTelemetryEvent, generationTelemetryEvent } from './generationEvents';
export type { GenerationStageTelemetryDetail, GenerationTelemetryDetail } from './generationEvents';

export type GenerationLaunchSource = 'generator' | 'dev-graph' | 'replay';

type GenerationWorkerMessage = {
  type: 'progress' | 'stage' | 'complete' | 'error';
  id: string;
  preview?: GenerationPreviewFrame;
  timing?: GenerationWorkerTiming;
  stage?: GenerationStageTelemetryDetail;
  project?: WorldProject;
  message?: string;
};

type UseGenerationWorkflowOptions = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  previousProject: WorldProject | null;
  onProjectGenerated: (project: WorldProject) => void;
};

type GenerateOptions = { startNodeId?: string | null; source?: GenerationLaunchSource };
type WorkflowGenerationConfig = GenerationConfig & { workflowId?: string };
export type GenerationNodeProgress = {
  nodeId: string;
  label: string;
  progress: number;
  status: 'waiting' | 'running' | 'complete' | 'skipped' | 'failed';
  elapsedMs?: number;
};

type PendingProductionTiming = {
  taskId: string;
  config: GenerationConfig;
  launchSource: GenerationLaunchSource;
  uiLaunchAtMs: number;
  uiDispatchAtMs: number;
  pageVisibleAtLaunch: boolean;
  pageFocusedAtLaunch: boolean;
  worker?: GenerationWorkerTiming;
  completedProjectReceiptAtMs?: number;
  projectAcceptanceStartedAtMs?: number;
  projectAcceptanceFinishedAtMs?: number;
  firstCommittedRenderAtMs?: number;
  firstInteractivePaintAtMs?: number;
  previewUiPaintCount: number;
  previewUiPaintMs: number;
  project?: WorldProject;
  completedAt?: string;
  failedAtMs?: number;
  failureMessage?: string;
  instrumentationGaps: string[];
};

function emitGenerationTelemetry(detail: GenerationTelemetryDetail): void {
  window.dispatchEvent(new CustomEvent<GenerationTelemetryDetail>(generationTelemetryEvent, { detail }));
}

function emitGenerationStageTelemetry(detail: GenerationStageTelemetryDetail): void {
  window.dispatchEvent(new CustomEvent<GenerationStageTelemetryDetail>(generationStageTelemetryEvent, { detail }));
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

function diagnosticParentStageId(name: string): string | undefined {
  if (name.startsWith('foundation.') || name.startsWith('projection.')) return 'world.initial-terrain';
  if (name.startsWith('biomes.')) return 'world.biomes-features';
  if (name.includes('deep-time') || name.includes('aging') || name.includes('epoch')) return 'world.deep-time-aging';
  if (name.includes('climate') || name.includes('moisture')) return 'world.present-climate';
  if (name.includes('hydrology') || name.includes('river') || name.includes('drainage')) return 'world.hydrology';
  if (name.includes('water') || name.includes('sea-level')) return 'world.final-water';
  if (name.includes('validation') || name.includes('metrics') || name.includes('outputs')) return 'world.outputs-validation';
  return undefined;
}

export function useGenerationWorkflow({ canvasRef, previousProject, onProjectGenerated }: UseGenerationWorkflowOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState('');
  const [generationNodeProgress, setGenerationNodeProgress] = useState<GenerationNodeProgress[]>(() => initialNodeProgress());
  const [generationElapsedMs, setGenerationElapsedMs] = useState(0);
  const [generationStageElapsedMs, setGenerationStageElapsedMs] = useState(0);
  const [lastGenerationRun, setLastGenerationRun] = useState<GenerationRunSummary | null>(null);
  const [generationTimingHistory, setGenerationTimingHistory] = useState<ProductionGenerationTimingRecord[]>(() => loadProductionGenerationTimingHistory());
  const [launchSource, setLaunchSource] = useState<GenerationLaunchSource | null>(null);
  const generationEstimateRef = useRef(24000);
  const generationStartedAtRef = useRef(0);
  const generationTaskIdRef = useRef('');
  const generationSeedRef = useRef('');
  const generationStartNodeIdRef = useRef<string | null>(null);
  const generationLaunchSourceRef = useRef<GenerationLaunchSource>('generator');
  const generationStageStartedAtRef = useRef(0);
  const generationActiveStageIdRef = useRef('');
  const generationStageTimingsRef = useRef(new Map<string, GenerationStageTiming>());
  const generationGraphTimingsRef = useRef(new Map<string, GenerationStageTiming>());
  const generationWorkflowRef = useRef(generationWorkflowDescriptor(undefined));
  const workerRef = useRef<Worker | null>(null);
  const generationPreviewRef = useRef<GenerationPreviewFrame | null>(null);
  const generationPreviewFrameRef = useRef(0);
  const pendingProductionTimingRef = useRef<PendingProductionTiming | null>(null);
  const previousProjectRef = useRef(previousProject);
  const onProjectGeneratedRef = useRef(onProjectGenerated);
  const pendingReplayRef = useRef<WorldReplayRequestDetail | null>(null);

  useEffect(() => { previousProjectRef.current = previousProject; }, [previousProject]);
  useEffect(() => { onProjectGeneratedRef.current = onProjectGenerated; }, [onProjectGenerated]);

  const observeStageTiming = useCallback((stage: GenerationStageTelemetryDetail) => {
    if (stage.nativeStage) {
      if (stage.phase === 'started' || generationActiveStageIdRef.current !== stage.stageId) {
        const observedElapsedMs = Math.max(0, stage.timestamp - stage.startedAt);
        generationActiveStageIdRef.current = stage.stageId;
        generationStageStartedAtRef.current = performance.now() - observedElapsedMs;
        setGenerationStageElapsedMs(observedElapsedMs);
      }
      if (stage.phase === 'completed' && stage.elapsedMs !== undefined) {
        generationStageTimingsRef.current.set(stage.stageId, {
          stageId: stage.stageId,
          label: stage.label,
          elapsedMs: stage.elapsedMs
        });
        setGenerationStageElapsedMs(stage.elapsedMs);
      }
    }
    if (stage.graphNode && !stage.nativeStage && stage.phase === 'completed' && stage.elapsedMs !== undefined) {
      generationGraphTimingsRef.current.set(stage.nodeId, {
        stageId: stage.nodeId,
        label: stage.label,
        elapsedMs: stage.elapsedMs
      });
    }
  }, []);

  const finalizePendingProductionTiming = useCallback((status: 'completed' | 'failed' | 'cancelled') => {
    const pending = pendingProductionTimingRef.current;
    if (!pending) return;
    const configuredWorkflowId = (pending.project?.config as WorkflowGenerationConfig | undefined)?.workflowId;
    const workflow = generationWorkflowDescriptor(configuredWorkflowId ?? generationWorkflowRef.current.id);
    const stages = nativeGenerationStageIds.flatMap((stageId) => {
      const timing = generationStageTimingsRef.current.get(stageId);
      return timing ? [timing] : [];
    });
    const graphNodes = coreGenerationGraph.flatMap((node) => {
      const timing = generationGraphTimingsRef.current.get(node.id);
      return timing ? [timing] : [];
    });
    const diagnosticIds = new Set(graphNodes.map((timing) => timing.stageId));
    for (const phase of pending.project?.diagnostics?.phases ?? []) {
      if (!Number.isFinite(phase.ms) || phase.ms < 0 || diagnosticIds.has(phase.name)) continue;
      diagnosticIds.add(phase.name);
      graphNodes.push({
        stageId: phase.name,
        label: phase.name,
        elapsedMs: phase.ms,
        parentStageId: diagnosticParentStageId(phase.name)
      });
    }
    const record = buildProductionGenerationTimingRecord({
      taskId: pending.taskId,
      status,
      completedAt: pending.completedAt ?? new Date().toISOString(),
      appVersion: APP_VERSION,
      visibleVersion: APP_VISIBLE_VERSION,
      sourceCommit: APP_SOURCE_COMMIT,
      workflowId: workflow.id,
      workflowLabel: workflow.label,
      workflowVersion: workflow.version,
      config: pending.config,
      project: pending.project,
      launchSource: pending.launchSource,
      uiLaunchAtMs: pending.uiLaunchAtMs,
      uiDispatchAtMs: pending.uiDispatchAtMs,
      pageVisibleAtLaunch: pending.pageVisibleAtLaunch,
      pageFocusedAtLaunch: pending.pageFocusedAtLaunch,
      userAgent: navigator.userAgent,
      logicalProcessorCount: navigator.hardwareConcurrency || undefined,
      worker: pending.worker,
      completedProjectReceiptAtMs: pending.completedProjectReceiptAtMs,
      projectAcceptanceStartedAtMs: pending.projectAcceptanceStartedAtMs,
      projectAcceptanceFinishedAtMs: pending.projectAcceptanceFinishedAtMs,
      firstCommittedRenderAtMs: pending.firstCommittedRenderAtMs,
      firstInteractivePaintAtMs: pending.firstInteractivePaintAtMs,
      previewUiPaintCount: pending.previewUiPaintCount,
      previewUiPaintMs: pending.previewUiPaintMs,
      nativeStages: stages,
      graphNodes,
      failedAtMs: pending.failedAtMs,
      failureMessage: pending.failureMessage,
      failedStageId: status === 'failed' ? generationActiveStageIdRef.current : undefined,
      instrumentationGaps: pending.instrumentationGaps
    });
    const history = retainProductionGenerationTimingRecord(record);
    setGenerationTimingHistory(history);
    setGenerationElapsedMs(record.durations.totalUserVisibleMs);
    setLastGenerationRun(buildGenerationRunSummary({
      completedAt: record.completedAt,
      status,
      workflowId: workflow.id,
      workflowLabel: workflow.label,
      workflowVersion: workflow.version,
      totalElapsedMs: record.durations.totalUserVisibleMs,
      workerGenerationMs: record.durations.workerGenerationMs,
      projectHandoffMs: record.durations.completedProjectHandoffMs,
      uiAcceptanceAndRenderMs: record.timestamps.firstInteractivePaintAtMs !== undefined && record.timestamps.projectAcceptanceStartedAtMs !== undefined
        ? Math.max(0, record.timestamps.firstInteractivePaintAtMs - record.timestamps.projectAcceptanceStartedAtMs)
        : undefined,
      stages,
      productionRecord: record
    }));
    pendingProductionTimingRef.current = null;
  }, []);

  const markGenerationRenderCommitted = useCallback((projectId: string) => {
    const pending = pendingProductionTimingRef.current;
    if (!pending?.project || pending.project.projectId !== projectId || pending.firstCommittedRenderAtMs !== undefined) return;
    pending.firstCommittedRenderAtMs = crossContextTimestampMs();
    window.requestAnimationFrame(() => {
      const current = pendingProductionTimingRef.current;
      if (!current || current.taskId !== pending.taskId || current.firstInteractivePaintAtMs !== undefined) return;
      current.firstInteractivePaintAtMs = crossContextTimestampMs();
      finalizePendingProductionTiming('completed');
    });
  }, [finalizePendingProductionTiming]);

  useEffect(() => {
    if (!previousProject) return;
    markGenerationRenderCommitted(previousProject.projectId);
  }, [markGenerationRenderCommitted, previousProject]);

  useEffect(() => {
    const root = document.documentElement;
    if (isGenerating && launchSource) root.dataset.generationSource = launchSource;
    else delete root.dataset.generationSource;
    return () => { if (root.dataset.generationSource === launchSource) delete root.dataset.generationSource; };
  }, [isGenerating, launchSource]);

  const drawGenerationPreview = useCallback(() => {
    if (generationLaunchSourceRef.current === 'dev-graph') return false;
    const preview = generationPreviewRef.current;
    const canvas = canvasRef.current;
    if (!preview || !canvas) return false;
    canvas.width = preview.width;
    canvas.height = preview.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(preview.rgba.buffer as ArrayBuffer), preview.width, preview.height), 0, 0);
    return true;
  }, [canvasRef]);

  const scheduleGenerationPreviewPaint = useCallback(() => {
    if (generationPreviewFrameRef.current || generationLaunchSourceRef.current === 'dev-graph') return;
    generationPreviewFrameRef.current = window.requestAnimationFrame(() => {
      generationPreviewFrameRef.current = 0;
      const paintStartedAt = performance.now();
      if (!drawGenerationPreview()) return;
      const pending = pendingProductionTimingRef.current;
      if (pending) {
        pending.previewUiPaintCount += 1;
        pending.previewUiPaintMs += Math.max(0, performance.now() - paintStartedAt);
      }
    });
  }, [drawGenerationPreview]);

  const finishGeneration = useCallback(() => {
    setGenerationProgress(1);
    setGenerationStage('');
    setIsGenerating(false);
    setLaunchSource(null);
  }, []);

  const failPendingReplay = useCallback((message: string) => {
    const replay = pendingReplayRef.current;
    if (!replay) return;
    notifyParchmentReplayResult({
      worldProjectId: replay.manifest.worldProjectId,
      requestId: replay.requestId,
      status: 'failed',
      expectedSignature: replay.manifest.outputSignature,
      message,
    });
    pendingReplayRef.current = null;
  }, []);

  const acceptGeneratedProject = useCallback((generated: WorldProject) => {
    const replay = pendingReplayRef.current;
    if (!replay) {
      onProjectGeneratedRef.current(generated);
      return generated;
    }

    const replayed: WorldProject = {
      ...generated,
      projectId: replay.manifest.worldProjectId,
      projectName: replay.manifest.worldName,
      updatedAt: new Date().toISOString(),
    };
    const actualSignature = authoritativeWorldSignature(replayed);
    if (actualSignature !== replay.manifest.outputSignature) {
      notifyParchmentReplayResult({
        worldProjectId: replay.manifest.worldProjectId,
        requestId: replay.requestId,
        status: 'failed',
        expectedSignature: replay.manifest.outputSignature,
        actualSignature,
        message: 'Regeneration completed, but the authoritative world signature did not match.',
      });
      pendingReplayRef.current = null;
      return generated;
    }

    rememberWorldName(replayed.projectId, replayed.projectName);
    onProjectGeneratedRef.current(replayed);
    notifyParchmentReplayResult({
      worldProjectId: replay.manifest.worldProjectId,
      requestId: replay.requestId,
      status: 'verified',
      expectedSignature: replay.manifest.outputSignature,
      actualSignature,
    });
    pendingReplayRef.current = null;
    return replayed;
  }, []);

  useEffect(() => {
    const worker = new Worker(new URL('../generationWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<GenerationWorkerMessage>) => {
      if (event.data.id !== generationTaskIdRef.current) return;
      if (event.data.type === 'stage' && event.data.stage) {
        const stage = event.data.stage;
        emitGenerationStageTelemetry(stage);
        observeStageTiming(stage);
        if (stage.graphNode) setGenerationNodeProgress((current) => updateNodeProgress(current, stage));
        if (stage.phase === 'started' || stage.phase === 'progress' || stage.graphNode) {
          setGenerationStage(stage.message || stage.label);
          setGenerationProgress(localStageProgress(stage));
        }
        return;
      }
      if (event.data.type === 'progress' && event.data.preview) {
        generationPreviewRef.current = event.data.preview;
        emitGenerationTelemetry({
          phase: 'progress', taskId: event.data.id, progress: event.data.preview.progress, label: event.data.preview.label,
          seed: generationSeedRef.current, startNodeId: generationStartNodeIdRef.current,
          startedAt: generationStartedAtRef.current, timestamp: performance.now()
        });
        scheduleGenerationPreviewPaint();
        return;
      }
      if (event.data.type === 'complete' && event.data.project) {
        generationPreviewRef.current = null;
        const pending = pendingProductionTimingRef.current;
        if (pending) {
          pending.worker = event.data.timing;
          pending.completedProjectReceiptAtMs = crossContextTimestampMs();
          pending.projectAcceptanceStartedAtMs = crossContextTimestampMs();
        }
        const completedProject = acceptGeneratedProject(event.data.project);
        if (pending) {
          pending.projectAcceptanceFinishedAtMs = crossContextTimestampMs();
          pending.project = completedProject;
          pending.completedAt = new Date().toISOString();
        }
        generationEstimateRef.current = Math.max(3000, completedProject.diagnostics?.totalMs ?? generationEstimateRef.current);
        emitGenerationTelemetry({
          phase: 'completed', taskId: event.data.id, progress: 1, label: 'World project complete',
          seed: generationSeedRef.current, startNodeId: generationStartNodeIdRef.current,
          startedAt: generationStartedAtRef.current, timestamp: performance.now(), project: completedProject
        });
        finishGeneration();
        return;
      }
      if (event.data.type === 'error') {
        const message = event.data.message ?? 'Generation failed';
        console.error(message);
        failPendingReplay(message);
        const pending = pendingProductionTimingRef.current;
        if (pending) {
          pending.worker = event.data.timing;
          pending.failedAtMs = event.data.timing?.failedAtMs ?? crossContextTimestampMs();
          pending.failureMessage = message;
          pending.completedAt = new Date().toISOString();
        }
        emitGenerationTelemetry({
          phase: 'failed', taskId: event.data.id, progress: 1, label: 'Generation failed', seed: generationSeedRef.current,
          startNodeId: generationStartNodeIdRef.current, startedAt: generationStartedAtRef.current,
          timestamp: performance.now(), error: message
        });
        finalizePendingProductionTiming('failed');
        finishGeneration();
      }
    };
    worker.onerror = (event) => {
      console.error(event.message);
      const message = event.message || 'Generation worker failed.';
      failPendingReplay(message);
      const pending = pendingProductionTimingRef.current;
      if (pending) {
        pending.failedAtMs = crossContextTimestampMs();
        pending.failureMessage = message;
        pending.completedAt = new Date().toISOString();
        pending.instrumentationGaps.push('The worker failed outside the structured response path, so worker-side failure timing is incomplete.');
      }
      emitGenerationTelemetry({
        phase: 'failed', taskId: generationTaskIdRef.current, progress: 1, label: 'Generation worker failed',
        seed: generationSeedRef.current, startNodeId: generationStartNodeIdRef.current,
        startedAt: generationStartedAtRef.current, timestamp: performance.now(), error: event.message
      });
      finalizePendingProductionTiming('failed');
      setGenerationStage('');
      setIsGenerating(false);
      setLaunchSource(null);
    };
    return () => {
      if (generationPreviewFrameRef.current) window.cancelAnimationFrame(generationPreviewFrameRef.current);
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
    };
  }, [acceptGeneratedProject, failPendingReplay, finalizePendingProductionTiming, finishGeneration, observeStageTiming, scheduleGenerationPreviewPaint]);

  useEffect(() => {
    if (!isGenerating) { setGenerationProgress(0); return; }
    const refreshElapsed = () => {
      const now = performance.now();
      setGenerationElapsedMs(Math.max(0, now - generationStartedAtRef.current));
      setGenerationStageElapsedMs(Math.max(0, now - generationStageStartedAtRef.current));
    };
    refreshElapsed();
    const timer = window.setInterval(() => {
      setGenerationProgress((current) => Math.min(current, 0.98));
      refreshElapsed();
    }, 100);
    return () => window.clearInterval(timer);
  }, [isGenerating]);

  const generate = useCallback((effectiveConfig: GenerationConfig, options: GenerateOptions = {}) => {
    const taskId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const source = options.source ?? 'generator';
    const uiLaunchAtMs = crossContextTimestampMs();
    generationTaskIdRef.current = taskId;
    generationSeedRef.current = effectiveConfig.seed;
    generationStartNodeIdRef.current = options.startNodeId ?? null;
    generationLaunchSourceRef.current = source;
    generationStartedAtRef.current = performance.now();
    generationStageStartedAtRef.current = generationStartedAtRef.current;
    generationActiveStageIdRef.current = 'starting';
    generationStageTimingsRef.current.clear();
    generationGraphTimingsRef.current.clear();
    generationWorkflowRef.current = generationWorkflowDescriptor((effectiveConfig as WorkflowGenerationConfig).workflowId);
    pendingProductionTimingRef.current = {
      taskId,
      config: structuredClone(effectiveConfig),
      launchSource: source,
      uiLaunchAtMs,
      uiDispatchAtMs: uiLaunchAtMs,
      pageVisibleAtLaunch: document.visibilityState === 'visible',
      pageFocusedAtLaunch: document.hasFocus(),
      previewUiPaintCount: 0,
      previewUiPaintMs: 0,
      instrumentationGaps: []
    };
    setGenerationElapsedMs(0);
    setGenerationStageElapsedMs(0);
    generationEstimateRef.current = Math.max(3000, previousProjectRef.current?.diagnostics?.totalMs ?? generationEstimateRef.current);
    generationPreviewRef.current = null;
    setGenerationStage(source === 'replay' ? 'Starting exact replay...' : 'Starting generation...');
    setGenerationProgress(0.02);
    setGenerationNodeProgress(initialNodeProgress());
    setLaunchSource(source);
    setIsGenerating(true);
    emitGenerationTelemetry({
      phase: 'started', taskId, progress: 0.02, label: source === 'replay' ? 'Starting exact replay...' : 'Starting generation...', seed: effectiveConfig.seed,
      startNodeId: generationStartNodeIdRef.current, startedAt: generationStartedAtRef.current,
      timestamp: generationStartedAtRef.current
    });

    if (workerRef.current) {
      const uiDispatchAtMs = crossContextTimestampMs();
      const pending = pendingProductionTimingRef.current;
      if (pending) pending.uiDispatchAtMs = uiDispatchAtMs;
      const timing: GenerationWorkerRequestTiming = { uiLaunchAtMs, uiDispatchAtMs, launchSource: source };
      workerRef.current.postMessage({ type: 'generate', id: taskId, config: effectiveConfig, timing });
      return;
    }

    const pending = pendingProductionTimingRef.current;
    if (pending) {
      pending.uiDispatchAtMs = crossContextTimestampMs();
      pending.instrumentationGaps.push('Generation used the same-window fallback because the production worker was unavailable.');
    }
    window.setTimeout(() => {
      try {
        const preparedConfig = prepareSystemOrbitConfig(effectiveConfig);
        const generatedProject = generateProjectWithNativeStages(preparedConfig, {
          appVersion: APP_VERSION,
          sourceCommit: APP_SOURCE_COMMIT,
          onStageEvent: (event) => {
            const stage = desktopStageEvent(taskId, event);
            emitGenerationStageTelemetry(stage);
            observeStageTiming(stage);
            if (stage.phase === 'started' || stage.phase === 'progress') {
              setGenerationStage(stage.message || stage.label);
              setGenerationProgress(localStageProgress(stage));
            }
          },
          onGraphNodeEvent: (event) => {
            const stage = desktopGraphNodeEvent(taskId, event);
            emitGenerationStageTelemetry(stage);
            observeStageTiming(stage);
            setGenerationNodeProgress((current) => updateNodeProgress(current, stage));
            if (stage.phase === 'started') setGenerationStage(stage.label);
            setGenerationProgress(localStageProgress(stage));
          }
        });
        const nextProject = reconcileSystemOrbitPresets(generatedProject);
        if (generationTaskIdRef.current !== taskId) return;
        const current = pendingProductionTimingRef.current;
        if (current) {
          const payload = estimateWorldProjectTransferBytes(nextProject);
          current.completedProjectReceiptAtMs = crossContextTimestampMs();
          current.projectAcceptanceStartedAtMs = current.completedProjectReceiptAtMs;
          current.instrumentationGaps.push(`Same-window payload estimate: ${payload.estimatedBytes} bytes; no structured-clone handoff occurred.`);
        }
        const completedProject = acceptGeneratedProject(nextProject);
        if (current) {
          current.projectAcceptanceFinishedAtMs = crossContextTimestampMs();
          current.project = completedProject;
          current.completedAt = new Date().toISOString();
        }
        generationEstimateRef.current = Math.max(3000, completedProject.diagnostics?.totalMs ?? generationEstimateRef.current);
        emitGenerationTelemetry({
          phase: 'completed', taskId, progress: 1, label: 'World project complete', seed: effectiveConfig.seed,
          startNodeId: generationStartNodeIdRef.current, startedAt: generationStartedAtRef.current,
          timestamp: performance.now(), project: completedProject
        });
        finishGeneration();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failPendingReplay(message);
        const current = pendingProductionTimingRef.current;
        if (current) {
          current.failedAtMs = crossContextTimestampMs();
          current.failureMessage = message;
          current.completedAt = new Date().toISOString();
        }
        emitGenerationTelemetry({
          phase: 'failed', taskId, progress: 1, label: 'Generation failed', seed: effectiveConfig.seed,
          startNodeId: generationStartNodeIdRef.current, startedAt: generationStartedAtRef.current,
          timestamp: performance.now(), error: message
        });
        finalizePendingProductionTiming('failed');
        setGenerationStage('');
        setIsGenerating(false);
        setLaunchSource(null);
      }
    }, 20);
  }, [acceptGeneratedProject, failPendingReplay, finalizePendingProductionTiming, finishGeneration, observeStageTiming]);

  useEffect(() => {
    const handleReplayRequest = (event: Event) => {
      const detail = (event as CustomEvent<WorldReplayRequestDetail>).detail;
      if (!detail?.manifest || !detail.requestId) return;
      if (isGenerating) {
        notifyParchmentReplayResult({
          worldProjectId: detail.manifest.worldProjectId,
          requestId: detail.requestId,
          status: 'failed',
          expectedSignature: detail.manifest.outputSignature,
          message: 'World Forge is already generating another world.',
        });
        return;
      }
      pendingReplayRef.current = detail;
      generate(structuredClone(detail.manifest.config), { source: 'replay' });
    };
    window.addEventListener(WORLD_FORGE_REPLAY_REQUEST_EVENT, handleReplayRequest);
    return () => window.removeEventListener(WORLD_FORGE_REPLAY_REQUEST_EVENT, handleReplayRequest);
  }, [generate, isGenerating]);

  useEffect(() => {
    const handleDeveloperRun = (event: Event) => {
      if (isGenerating) return;
      const detail = (event as CustomEvent<DeveloperGenerationRunDetail>).detail;
      const storedConfig = loadWorkspaceSettings().config;
      const sourceConfig = storedConfig ?? previousProjectRef.current?.config;
      if (!sourceConfig) {
        window.alert('No generator configuration is available. Open the Generator tab once before running the graph.');
        return;
      }
      generate({ ...sourceConfig, seed: detail.seed || sourceConfig.seed, workflowId: detail.workflowId } as GenerationConfig, { startNodeId: detail.startNodeId, source: 'dev-graph' });
    };
    window.addEventListener(developerGenerationRunEvent, handleDeveloperRun);
    return () => window.removeEventListener(developerGenerationRunEvent, handleDeveloperRun);
  }, [generate, isGenerating]);

  return {
    isGenerating,
    launchSource,
    generationProgress,
    generationStage,
    generationNodeProgress,
    generationElapsedMs,
    generationStageElapsedMs,
    lastGenerationRun,
    generationTimingHistory,
    markGenerationRenderCommitted,
    generate
  };
}

function initialNodeProgress(): GenerationNodeProgress[] {
  return coreGenerationGraph.map((node) => ({ nodeId: node.id, label: node.label, progress: 0, status: 'waiting' }));
}

function updateNodeProgress(current: GenerationNodeProgress[], stage: GenerationStageTelemetryDetail): GenerationNodeProgress[] {
  return current.map((node) => {
    if (stage.nodeId === 'world.deep-time-aging' && node.nodeId === 'world.motion-coupling') {
      return { ...node, progress: 1, status: 'complete' };
    }
    if (stage.nodeId === 'world.outputs-validation' && node.nodeId === 'world.deep-time-aging' && node.status !== 'failed') {
      return { ...node, progress: 1, status: 'complete' };
    }
    if (node.nodeId !== stage.nodeId) return node;
    return {
      ...node,
      progress: stage.phase === 'completed' || stage.phase === 'failed' || stage.phase === 'skipped' ? 1 : Math.max(0.02, Math.min(0.98, stage.progress)),
      status: stage.phase === 'completed' ? 'complete' : stage.phase === 'skipped' ? 'skipped' : stage.phase === 'failed' ? 'failed' : 'running',
      elapsedMs: stage.elapsedMs
    };
  });
}

function localStageProgress(stage: GenerationStageTelemetryDetail): number {
  if (stage.phase === 'completed') return 1;
  if (stage.phase === 'skipped') return 1;
  if (stage.phase === 'failed') return 1;
  return Math.max(0.02, Math.min(0.98, stage.progress));
}

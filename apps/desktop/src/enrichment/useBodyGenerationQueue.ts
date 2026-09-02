import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  BodyGenerationFidelity,
  BodyGenerationLifecycle,
  GeneratedSystemBodyArtifact,
  SystemOrbitalContextArtifact,
  WorldProject
} from '@world-forge/shared';
import {
  systemBodyGenerationSourceFromProject,
  systemBodyGenerationWorkflowDescriptor,
  type SystemBodyGenerationSource
} from '@world-forge/generation-runtime/enrichment/systemBodyGeneration';
import {
  bodyArtifactForBody,
  cancelActiveBodyGeneration,
  completeBodyGeneration,
  failBodyGeneration,
  pauseBodyGenerationQueue,
  preemptActiveBodyGeneration,
  queueBackgroundPreviewBodies,
  queueBodyGeneration,
  queueUnresolvedBodies,
  reconcileBodyGenerationLifecycle,
  removeQueuedBodyGeneration,
  resumeBodyGenerationQueue,
  retryBodyGeneration,
  startNextBodyGeneration
} from '@world-forge/generation-runtime/enrichment/bodyGenerationLifecycle';
import type { ProjectEnrichmentNodeEvent } from '@world-forge/generation-runtime/enrichment/systemOrbitalContext';
import {
  generationStageTelemetryEvent,
  generationTelemetryEvent,
  type GenerationStageTelemetryDetail,
  type GenerationTelemetryDetail
} from '../generation/generationEvents';

export type BodyGenerationQueueController = {
  lifecycle: BodyGenerationLifecycle | null;
  activeNodeLabel: string;
  elapsedMs: number;
  error: string;
  backgroundEnabled: boolean;
  foregroundBusy: boolean;
  queueBody: (bodyId: string, fidelity?: BodyGenerationFidelity, start?: boolean) => void;
  queueUnresolvedBodies: (fidelity?: BodyGenerationFidelity) => void;
  queueUnresolvedMoons: (fidelity?: BodyGenerationFidelity) => void;
  startQueue: () => void;
  pauseQueue: () => void;
  removeQueuedBody: (bodyId: string) => void;
  cancelActive: () => void;
  retryBody: (bodyId: string) => void;
  regenerateBody: (bodyId: string) => void;
  upgradeBody: (bodyId: string) => void;
  generatedFidelityForBody: (bodyId: string) => BodyGenerationFidelity | null;
};

type WorkerResponse =
  | { type: 'stage'; id: string; stage: ProjectEnrichmentNodeEvent }
  | { type: 'complete'; id: string; artifact: GeneratedSystemBodyArtifact }
  | { type: 'cancelled'; id: string }
  | { type: 'error'; id: string; message: string };

export function useBodyGenerationQueue({
  project,
  orbitalContext,
  onProjectEnriched,
  automaticPreviewGeneration = true,
  foregroundBusy = false
}: {
  project: WorldProject | null;
  orbitalContext: SystemOrbitalContextArtifact | null;
  onProjectEnriched: (project: WorldProject) => void;
  automaticPreviewGeneration?: boolean;
  foregroundBusy?: boolean;
}): BodyGenerationQueueController {
  const [activeNodeLabel, setActiveNodeLabel] = useState('');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState('');
  const [backgroundEnabled, setBackgroundEnabled] = useState(automaticPreviewGeneration);
  const [observedForegroundBusy, setObservedForegroundBusy] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const taskIdRef = useRef('');
  const taskStartedAtRef = useRef(0);
  const activeBodyIdRef = useRef('');
  const activeWorkflowNodesRef = useRef<ReturnType<typeof systemBodyGenerationWorkflowDescriptor>['nodes']>([]);
  const interruptionCheckKeyRef = useRef('');
  const preemptedForForegroundRef = useRef(false);
  const foregroundTaskIdsRef = useRef(new Set<string>());
  const foregroundBusyRef = useRef(foregroundBusy);
  const projectRef = useRef(project);
  const orbitalContextRef = useRef(orbitalContext);
  const onProjectEnrichedRef = useRef(onProjectEnriched);
  const effectiveForegroundBusy = foregroundBusy || observedForegroundBusy;

  useEffect(() => { projectRef.current = project; }, [project]);
  useEffect(() => { orbitalContextRef.current = orbitalContext; }, [orbitalContext]);
  useEffect(() => { onProjectEnrichedRef.current = onProjectEnriched; }, [onProjectEnriched]);
  useEffect(() => { foregroundBusyRef.current = effectiveForegroundBusy; }, [effectiveForegroundBusy]);
  useEffect(() => {
    setBackgroundEnabled(automaticPreviewGeneration);
    preemptedForForegroundRef.current = false;
  }, [automaticPreviewGeneration, project?.projectId]);

  useEffect(() => {
    const onGenerationTelemetry = (event: Event) => {
      const detail = (event as CustomEvent<GenerationTelemetryDetail>).detail;
      if (!detail?.taskId || detail.taskId.startsWith('body-enrichment-')) return;
      if (detail.phase === 'started') foregroundTaskIdsRef.current.add(detail.taskId);
      else if (detail.phase === 'completed' || detail.phase === 'failed' || detail.phase === 'cancelled') foregroundTaskIdsRef.current.delete(detail.taskId);
      setObservedForegroundBusy(foregroundTaskIdsRef.current.size > 0);
    };
    window.addEventListener(generationTelemetryEvent, onGenerationTelemetry);
    return () => window.removeEventListener(generationTelemetryEvent, onGenerationTelemetry);
  }, []);

  const lifecycle = useMemo(() => {
    if (!project || !orbitalContext) return null;
    return reconcileBodyGenerationLifecycle(project, orbitalContext);
  }, [orbitalContext?.artifactSignature, project?.bodyGeneration?.updatedAt, project?.enrichmentArtifacts, project?.projectId]);

  const persistLifecycle = useCallback((nextLifecycle: BodyGenerationLifecycle, artifact?: GeneratedSystemBodyArtifact) => {
    const current = projectRef.current;
    if (!current) return;
    const next: WorldProject = {
      ...current,
      updatedAt: new Date().toISOString(),
      bodyGeneration: nextLifecycle,
      enrichmentArtifacts: artifact
        ? { ...current.enrichmentArtifacts, [artifact.artifactKey]: artifact }
        : current.enrichmentArtifacts
    };
    projectRef.current = next;
    onProjectEnrichedRef.current(next);
  }, []);

  useEffect(() => {
    if (!project || !orbitalContext || !lifecycle) return;
    if (project.bodyGeneration !== lifecycle) persistLifecycle(lifecycle);
  }, [lifecycle, orbitalContext?.artifactSignature, persistLifecycle, project?.bodyGeneration, project?.projectId]);

  useEffect(() => {
    if (!project || !orbitalContext || !lifecycle) return;
    const checkKey = `${project.projectId}:${orbitalContext.artifactSignature}`;
    if (interruptionCheckKeyRef.current === checkKey) return;
    interruptionCheckKeyRef.current = checkKey;
    const interruptedBodyId = lifecycle.activeBodyId;
    if (!interruptedBodyId || taskIdRef.current) return;
    persistLifecycle(failBodyGeneration(
      lifecycle,
      interruptedBodyId,
      'Body generation was interrupted before the project was reopened. Retry to resume from a clean deterministic workflow run.'
    ));
  }, [lifecycle, orbitalContext, persistLifecycle, project]);

  const runNext = useCallback((inputLifecycle?: BodyGenerationLifecycle) => {
    const currentProject = projectRef.current;
    const currentOrbitalContext = orbitalContextRef.current;
    const worker = workerRef.current;
    if (!currentProject || !currentOrbitalContext || !worker || taskIdRef.current || foregroundBusyRef.current) return;
    let nextLifecycle = inputLifecycle ?? reconcileBodyGenerationLifecycle(currentProject, currentOrbitalContext);
    nextLifecycle = startNextBodyGeneration(nextLifecycle);
    if (!nextLifecycle.activeBodyId) {
      persistLifecycle(nextLifecycle);
      return;
    }
    const bodyId = nextLifecycle.activeBodyId;
    const record = nextLifecycle.records[bodyId];
    if (!record?.profile) return;
    persistLifecycle(nextLifecycle);
    activeBodyIdRef.current = bodyId;
    const id = `body-enrichment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    taskIdRef.current = id;
    taskStartedAtRef.current = performance.now();
    setElapsedMs(0);
    setError('');
    const workflow = systemBodyGenerationWorkflowDescriptor(record.profile);
    activeWorkflowNodesRef.current = workflow.nodes;
    setActiveNodeLabel(workflow.nodes[0]?.label ?? workflow.label);
    const source: SystemBodyGenerationSource = systemBodyGenerationSourceFromProject(
      currentProject,
      currentOrbitalContext,
      bodyId,
      record.requestedFidelity
    );
    const detail: GenerationTelemetryDetail = {
      phase: 'started',
      taskId: id,
      progress: 0,
      label: `${workflow.label}: ${bodyId}`,
      seed: source.seed,
      startNodeId: null,
      startedAt: taskStartedAtRef.current,
      timestamp: taskStartedAtRef.current
    };
    window.dispatchEvent(new CustomEvent<GenerationTelemetryDetail>(generationTelemetryEvent, { detail }));
    worker.postMessage({ type: 'run-system-body', id, source });
  }, [persistLifecycle]);

  useEffect(() => {
    const worker = new Worker(new URL('../enrichmentWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    window.setTimeout(() => {
      const currentProject = projectRef.current;
      const currentOrbitalContext = orbitalContextRef.current;
      if (!currentProject || !currentOrbitalContext || taskIdRef.current || foregroundBusyRef.current) return;
      const pendingLifecycle = reconcileBodyGenerationLifecycle(currentProject, currentOrbitalContext);
      if (!pendingLifecycle.paused && !pendingLifecycle.activeBodyId && pendingLifecycle.queue.length > 0) runNext(pendingLifecycle);
    }, 0);
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.id !== taskIdRef.current) return;
      if (message.type === 'stage') {
        const nodes = activeWorkflowNodesRef.current;
        const index = Math.max(0, nodes.findIndex((node) => node.id === message.stage.nodeId));
        const detail: GenerationStageTelemetryDetail = {
          taskId: message.id,
          nodeId: message.stage.nodeId,
          stageId: message.stage.stageId,
          phase: message.stage.phase,
          progress: message.stage.phase === 'completed' ? 1 : 0.05,
          overallProgress: Math.min(1, (index + (message.stage.phase === 'completed' ? 1 : 0.05)) / Math.max(1, nodes.length)),
          label: nodes[index]?.label ?? message.stage.nodeId,
          startedAt: message.stage.startedAt,
          timestamp: message.stage.timestamp,
          elapsedMs: message.stage.durationMs,
          measured: true,
          nativeStage: false,
          graphNode: true,
          dependencies: message.stage.dependencies,
          version: message.stage.version,
          message: message.stage.error,
          metrics: message.stage.validation
            ? { validationValid: message.stage.validation.valid, validationIssueCount: message.stage.validation.issues.length }
            : undefined
        };
        setActiveNodeLabel(detail.label);
        window.dispatchEvent(new CustomEvent<GenerationStageTelemetryDetail>(generationStageTelemetryEvent, { detail }));
        return;
      }

      const currentProject = projectRef.current;
      const currentOrbitalContext = orbitalContextRef.current;
      const bodyId = activeBodyIdRef.current;
      if (!currentProject || !currentOrbitalContext || !bodyId) return;
      const currentLifecycle = reconcileBodyGenerationLifecycle(currentProject, currentOrbitalContext);

      if (message.type === 'complete') {
        const completedLifecycle = completeBodyGeneration(currentLifecycle, message.artifact);
        persistLifecycle(completedLifecycle, message.artifact);
        setActiveNodeLabel('Generated body ready');
        setElapsedMs(Math.max(0, performance.now() - taskStartedAtRef.current));
        const record = completedLifecycle.records[bodyId];
        const workflow = record?.profile ? systemBodyGenerationWorkflowDescriptor(record.profile) : null;
        const detail: GenerationTelemetryDetail = {
          phase: 'completed', taskId: message.id, progress: 1, label: `${workflow?.label ?? 'Generate body'}: ${bodyId}`,
          seed: message.artifact.seed, startNodeId: null, startedAt: taskStartedAtRef.current, timestamp: performance.now(), project: projectRef.current ?? undefined
        };
        window.dispatchEvent(new CustomEvent<GenerationTelemetryDetail>(generationTelemetryEvent, { detail }));
        preemptedForForegroundRef.current = false;
        activeBodyIdRef.current = '';
        taskIdRef.current = '';
        activeWorkflowNodesRef.current = [];
      } else if (message.type === 'cancelled') {
        const wasForegroundPreemption = preemptedForForegroundRef.current;
        const cancelledLifecycle = wasForegroundPreemption
          ? preemptActiveBodyGeneration(currentLifecycle, bodyId)
          : cancelActiveBodyGeneration(currentLifecycle, bodyId);
        persistLifecycle(cancelledLifecycle);
        setActiveNodeLabel(wasForegroundPreemption ? 'Background generation paused for foreground work' : 'Generation cancelled');
        preemptedForForegroundRef.current = false;
        activeBodyIdRef.current = '';
        taskIdRef.current = '';
        activeWorkflowNodesRef.current = [];
      } else {
        const failedLifecycle = failBodyGeneration(currentLifecycle, bodyId, message.message);
        persistLifecycle(failedLifecycle);
        setError(message.message);
        setActiveNodeLabel('Generation failed');
        const detail: GenerationTelemetryDetail = {
          phase: 'failed', taskId: message.id, progress: 1, label: `Generate body: ${bodyId}`,
          seed: currentLifecycle.records[bodyId]?.stableSeed ?? '', startNodeId: null, startedAt: taskStartedAtRef.current,
          timestamp: performance.now(), error: message.message
        };
        window.dispatchEvent(new CustomEvent<GenerationTelemetryDetail>(generationTelemetryEvent, { detail }));
        preemptedForForegroundRef.current = false;
        activeBodyIdRef.current = '';
        taskIdRef.current = '';
        activeWorkflowNodesRef.current = [];
      }
    };
    return () => {
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
    };
  }, [persistLifecycle, runNext]);

  useEffect(() => {
    if (!effectiveForegroundBusy) return;
    const currentProject = projectRef.current;
    const currentOrbitalContext = orbitalContextRef.current;
    if (!currentProject || !currentOrbitalContext) return;
    const currentLifecycle = reconcileBodyGenerationLifecycle(currentProject, currentOrbitalContext);
    if (taskIdRef.current && activeBodyIdRef.current) {
      preemptedForForegroundRef.current = true;
      workerRef.current?.postMessage({ type: 'cancel', id: taskIdRef.current });
      return;
    }
    if (!currentLifecycle.paused && currentLifecycle.queue.length > 0) persistLifecycle(pauseBodyGenerationQueue(currentLifecycle));
  }, [effectiveForegroundBusy, persistLifecycle]);

  useEffect(() => {
    if (!automaticPreviewGeneration || !backgroundEnabled || effectiveForegroundBusy || !lifecycle || lifecycle.activeBodyId || taskIdRef.current) return;
    const queued = queueBackgroundPreviewBodies(lifecycle);
    if (queued.queue.length === 0) return;
    const prepared = queued.paused ? resumeBodyGenerationQueue(queued) : queued;
    if (prepared !== lifecycle) persistLifecycle(prepared);
  }, [automaticPreviewGeneration, backgroundEnabled, effectiveForegroundBusy, lifecycle, persistLifecycle]);

  useEffect(() => {
    if (!lifecycle?.activeBodyId) return;
    const refresh = () => setElapsedMs(Math.max(0, performance.now() - taskStartedAtRef.current));
    refresh();
    const timer = window.setInterval(refresh, 100);
    return () => window.clearInterval(timer);
  }, [lifecycle?.activeBodyId]);

  const queuedBodyIds = lifecycle?.queue.join('|') ?? '';
  useEffect(() => {
    if (effectiveForegroundBusy || !lifecycle || lifecycle.paused || lifecycle.activeBodyId || lifecycle.queue.length === 0 || taskIdRef.current) return;
    const timer = window.setTimeout(() => runNext(lifecycle), 150);
    return () => window.clearTimeout(timer);
  }, [effectiveForegroundBusy, lifecycle?.activeBodyId, lifecycle?.paused, queuedBodyIds, runNext]);

  const updateAndMaybeRun = useCallback((nextLifecycle: BodyGenerationLifecycle, start: boolean) => {
    if (start) setBackgroundEnabled(true);
    const prepared = start ? resumeBodyGenerationQueue(nextLifecycle) : nextLifecycle;
    persistLifecycle(prepared);
    if (start && !foregroundBusyRef.current) window.setTimeout(() => runNext(prepared), 0);
  }, [persistLifecycle, runNext]);

  const queueBody = useCallback((bodyId: string, fidelity: BodyGenerationFidelity = 'preview', start = false) => {
    const currentProject = projectRef.current;
    const currentOrbitalContext = orbitalContextRef.current;
    if (!currentProject || !currentOrbitalContext) return;
    const current = reconcileBodyGenerationLifecycle(currentProject, currentOrbitalContext);
    let queued = queueBodyGeneration(current, bodyId, fidelity);
    if (start && fidelity === 'standard' && queued.queue.includes(bodyId)) {
      queued = {
        ...queued,
        queue: [bodyId, ...queued.queue.filter((candidate) => candidate !== bodyId)],
        updatedAt: new Date().toISOString()
      };
    }
    updateAndMaybeRun(queued, start);
  }, [updateAndMaybeRun]);

  const queueAll = useCallback((fidelity: BodyGenerationFidelity = 'preview') => {
    const currentProject = projectRef.current;
    const currentOrbitalContext = orbitalContextRef.current;
    if (!currentProject || !currentOrbitalContext) return;
    const current = reconcileBodyGenerationLifecycle(currentProject, currentOrbitalContext);
    persistLifecycle(queueUnresolvedBodies(current, fidelity));
  }, [persistLifecycle]);

  const startQueue = useCallback(() => {
    const currentProject = projectRef.current;
    const currentOrbitalContext = orbitalContextRef.current;
    if (!currentProject || !currentOrbitalContext) return;
    setBackgroundEnabled(true);
    const current = resumeBodyGenerationQueue(reconcileBodyGenerationLifecycle(currentProject, currentOrbitalContext));
    persistLifecycle(current);
    if (!foregroundBusyRef.current) window.setTimeout(() => runNext(current), 0);
  }, [persistLifecycle, runNext]);

  const pauseQueue = useCallback(() => {
    const currentProject = projectRef.current;
    const currentOrbitalContext = orbitalContextRef.current;
    if (!currentProject || !currentOrbitalContext) return;
    setBackgroundEnabled(false);
    persistLifecycle(pauseBodyGenerationQueue(reconcileBodyGenerationLifecycle(currentProject, currentOrbitalContext)));
  }, [persistLifecycle]);

  const removeQueuedBody = useCallback((bodyId: string) => {
    const currentProject = projectRef.current;
    const currentOrbitalContext = orbitalContextRef.current;
    if (!currentProject || !currentOrbitalContext) return;
    const current = reconcileBodyGenerationLifecycle(currentProject, currentOrbitalContext);
    persistLifecycle(removeQueuedBodyGeneration(current, bodyId));
  }, [persistLifecycle]);

  const cancelActive = useCallback(() => {
    if (!taskIdRef.current) return;
    setBackgroundEnabled(false);
    preemptedForForegroundRef.current = false;
    workerRef.current?.postMessage({ type: 'cancel', id: taskIdRef.current });
  }, []);

  const retryBody = useCallback((bodyId: string) => {
    const currentProject = projectRef.current;
    const currentOrbitalContext = orbitalContextRef.current;
    if (!currentProject || !currentOrbitalContext) return;
    const current = retryBodyGeneration(reconcileBodyGenerationLifecycle(currentProject, currentOrbitalContext), bodyId);
    updateAndMaybeRun(current, true);
  }, [updateAndMaybeRun]);

  const regenerateBody = useCallback((bodyId: string) => {
    queueBody(bodyId, lifecycle?.records[bodyId]?.requestedFidelity ?? 'preview', true);
  }, [lifecycle, queueBody]);

  const upgradeBody = useCallback((bodyId: string) => {
    queueBody(bodyId, 'standard', true);
  }, [queueBody]);

  const generatedFidelityForBody = useCallback((bodyId: string): BodyGenerationFidelity | null => {
    const currentProject = projectRef.current;
    const currentOrbitalContext = orbitalContextRef.current;
    if (!currentProject || !currentOrbitalContext) return null;
    const requested = currentProject.bodyGeneration?.records[bodyId]?.requestedFidelity ?? 'preview';
    return bodyArtifactForBody(currentProject, currentOrbitalContext, bodyId, requested)?.requestedFidelity ?? null;
  }, []);

  return {
    lifecycle,
    activeNodeLabel,
    elapsedMs,
    error,
    backgroundEnabled,
    foregroundBusy: effectiveForegroundBusy,
    queueBody,
    queueUnresolvedBodies: queueAll,
    queueUnresolvedMoons: queueAll,
    startQueue,
    pauseQueue,
    removeQueuedBody,
    cancelActive,
    retryBody,
    regenerateBody,
    upgradeBody,
    generatedFidelityForBody
  };
}

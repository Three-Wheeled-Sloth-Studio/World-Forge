import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AirlessRockyBodyArtifact,
  BodyGenerationFidelity,
  BodyGenerationLifecycle,
  SystemOrbitalContextArtifact,
  WorldProject
} from '@world-forge/shared';
import {
  airlessRockyBodySourceFromProject,
  airlessRockyBodyWorkflowDescriptor,
  type AirlessRockyBodySource
} from '@world-forge/generation-runtime/enrichment/airlessRockyBody';
import {
  cancelActiveBodyGeneration,
  completeBodyGeneration,
  failBodyGeneration,
  pauseBodyGenerationQueue,
  queueBodyGeneration,
  queueUnresolvedAirlessMoons,
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
  queueBody: (bodyId: string, fidelity?: BodyGenerationFidelity, start?: boolean) => void;
  queueUnresolvedMoons: (fidelity?: BodyGenerationFidelity) => void;
  startQueue: () => void;
  pauseQueue: () => void;
  removeQueuedBody: (bodyId: string) => void;
  cancelActive: () => void;
  retryBody: (bodyId: string) => void;
  regenerateBody: (bodyId: string) => void;
};

type WorkerResponse =
  | { type: 'stage'; id: string; stage: ProjectEnrichmentNodeEvent }
  | { type: 'complete'; id: string; artifact: AirlessRockyBodyArtifact }
  | { type: 'cancelled'; id: string }
  | { type: 'error'; id: string; message: string };

export function useBodyGenerationQueue({
  project,
  orbitalContext,
  onProjectEnriched
}: {
  project: WorldProject | null;
  orbitalContext: SystemOrbitalContextArtifact | null;
  onProjectEnriched: (project: WorldProject) => void;
}): BodyGenerationQueueController {
  const [activeNodeLabel, setActiveNodeLabel] = useState('');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState('');
  const workerRef = useRef<Worker | null>(null);
  const taskIdRef = useRef('');
  const taskStartedAtRef = useRef(0);
  const activeBodyIdRef = useRef('');
  const projectRef = useRef(project);
  const orbitalContextRef = useRef(orbitalContext);
  const onProjectEnrichedRef = useRef(onProjectEnriched);

  useEffect(() => { projectRef.current = project; }, [project]);
  useEffect(() => { orbitalContextRef.current = orbitalContext; }, [orbitalContext]);
  useEffect(() => { onProjectEnrichedRef.current = onProjectEnriched; }, [onProjectEnriched]);

  const lifecycle = useMemo(() => {
    if (!project || !orbitalContext) return null;
    return reconcileBodyGenerationLifecycle(project, orbitalContext);
  }, [orbitalContext?.artifactSignature, project?.bodyGeneration?.updatedAt, project?.enrichmentArtifacts, project?.projectId]);

  const persistLifecycle = useCallback((nextLifecycle: BodyGenerationLifecycle, artifact?: AirlessRockyBodyArtifact) => {
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
    const interruptedBodyId = lifecycle?.activeBodyId;
    if (!interruptedBodyId || taskIdRef.current) return;
    persistLifecycle(failBodyGeneration(
      lifecycle,
      interruptedBodyId,
      'Body generation was interrupted before the project was reopened. Retry to resume from a clean deterministic workflow run.'
    ));
  }, [lifecycle, persistLifecycle]);

  const runNext = useCallback((inputLifecycle?: BodyGenerationLifecycle) => {
    const currentProject = projectRef.current;
    const currentOrbitalContext = orbitalContextRef.current;
    const worker = workerRef.current;
    if (!currentProject || !currentOrbitalContext || !worker || taskIdRef.current) return;
    let nextLifecycle = inputLifecycle ?? reconcileBodyGenerationLifecycle(currentProject, currentOrbitalContext);
    nextLifecycle = startNextBodyGeneration(nextLifecycle);
    if (!nextLifecycle.activeBodyId) {
      persistLifecycle(nextLifecycle);
      return;
    }
    const bodyId = nextLifecycle.activeBodyId;
    const record = nextLifecycle.records[bodyId];
    if (!record) return;
    persistLifecycle(nextLifecycle);
    activeBodyIdRef.current = bodyId;
    const id = `body-enrichment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    taskIdRef.current = id;
    taskStartedAtRef.current = performance.now();
    setElapsedMs(0);
    setError('');
    setActiveNodeLabel(airlessRockyBodyWorkflowDescriptor.nodes[0].label);
    const source: AirlessRockyBodySource = airlessRockyBodySourceFromProject(
      currentProject,
      currentOrbitalContext,
      bodyId,
      record.requestedFidelity
    );
    const detail: GenerationTelemetryDetail = {
      phase: 'started',
      taskId: id,
      progress: 0,
      label: `${airlessRockyBodyWorkflowDescriptor.label}: ${bodyId}`,
      seed: source.seed,
      startNodeId: null,
      startedAt: taskStartedAtRef.current,
      timestamp: taskStartedAtRef.current
    };
    window.dispatchEvent(new CustomEvent<GenerationTelemetryDetail>(generationTelemetryEvent, { detail }));
    worker.postMessage({ type: 'run-airless-rocky-body', id, source });
  }, [persistLifecycle]);

  useEffect(() => {
    const worker = new Worker(new URL('../enrichmentWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    window.setTimeout(() => {
      const currentProject = projectRef.current;
      const currentOrbitalContext = orbitalContextRef.current;
      if (!currentProject || !currentOrbitalContext || taskIdRef.current) return;
      const pendingLifecycle = reconcileBodyGenerationLifecycle(currentProject, currentOrbitalContext);
      if (!pendingLifecycle.paused && !pendingLifecycle.activeBodyId && pendingLifecycle.queue.length > 0) {
        runNext(pendingLifecycle);
      }
    }, 0);
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.id !== taskIdRef.current) return;
      if (message.type === 'stage') {
        const index = Math.max(0, airlessRockyBodyWorkflowDescriptor.nodes.findIndex((node) => node.id === message.stage.nodeId));
        const detail: GenerationStageTelemetryDetail = {
          taskId: message.id,
          nodeId: message.stage.nodeId,
          stageId: message.stage.stageId,
          phase: message.stage.phase,
          progress: message.stage.phase === 'completed' ? 1 : 0.05,
          overallProgress: Math.min(1, (index + (message.stage.phase === 'completed' ? 1 : 0.05)) / airlessRockyBodyWorkflowDescriptor.nodes.length),
          label: airlessRockyBodyWorkflowDescriptor.nodes[index]?.label ?? message.stage.nodeId,
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
        const detail: GenerationTelemetryDetail = {
          phase: 'completed',
          taskId: message.id,
          progress: 1,
          label: `${airlessRockyBodyWorkflowDescriptor.label}: ${bodyId}`,
          seed: message.artifact.seed,
          startNodeId: null,
          startedAt: taskStartedAtRef.current,
          timestamp: performance.now(),
          project: projectRef.current ?? undefined
        };
        window.dispatchEvent(new CustomEvent<GenerationTelemetryDetail>(generationTelemetryEvent, { detail }));
        activeBodyIdRef.current = '';
        taskIdRef.current = '';
        window.setTimeout(() => runNext(completedLifecycle), 0);
      } else if (message.type === 'cancelled') {
        const cancelledLifecycle = cancelActiveBodyGeneration(currentLifecycle, bodyId);
        persistLifecycle(cancelledLifecycle);
        setActiveNodeLabel('Generation cancelled');
        activeBodyIdRef.current = '';
        taskIdRef.current = '';
      } else {
        const failedLifecycle = failBodyGeneration(currentLifecycle, bodyId, message.message);
        persistLifecycle(failedLifecycle);
        setError(message.message);
        setActiveNodeLabel('Generation failed');
        const detail: GenerationTelemetryDetail = {
          phase: 'failed',
          taskId: message.id,
          progress: 1,
          label: `${airlessRockyBodyWorkflowDescriptor.label}: ${bodyId}`,
          seed: currentLifecycle.records[bodyId]?.stableSeed ?? '',
          startNodeId: null,
          startedAt: taskStartedAtRef.current,
          timestamp: performance.now(),
          error: message.message
        };
        window.dispatchEvent(new CustomEvent<GenerationTelemetryDetail>(generationTelemetryEvent, { detail }));
        activeBodyIdRef.current = '';
        taskIdRef.current = '';
      }
    };
    return () => {
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
    };
  }, [persistLifecycle, runNext]);

  useEffect(() => {
    if (!lifecycle?.activeBodyId) return;
    const refresh = () => setElapsedMs(Math.max(0, performance.now() - taskStartedAtRef.current));
    refresh();
    const timer = window.setInterval(refresh, 100);
    return () => window.clearInterval(timer);
  }, [lifecycle?.activeBodyId]);

  const updateAndMaybeRun = useCallback((nextLifecycle: BodyGenerationLifecycle, start: boolean) => {
    const prepared = start ? resumeBodyGenerationQueue(nextLifecycle) : nextLifecycle;
    persistLifecycle(prepared);
    if (start) window.setTimeout(() => runNext(prepared), 0);
  }, [persistLifecycle, runNext]);

  const queueBody = useCallback((bodyId: string, fidelity: BodyGenerationFidelity = 'preview', start = false) => {
    const currentProject = projectRef.current;
    const currentOrbitalContext = orbitalContextRef.current;
    if (!currentProject || !currentOrbitalContext) return;
    const current = reconcileBodyGenerationLifecycle(currentProject, currentOrbitalContext);
    updateAndMaybeRun(queueBodyGeneration(current, bodyId, fidelity), start);
  }, [updateAndMaybeRun]);

  const queueUnresolvedMoons = useCallback((fidelity: BodyGenerationFidelity = 'preview') => {
    const currentProject = projectRef.current;
    const currentOrbitalContext = orbitalContextRef.current;
    if (!currentProject || !currentOrbitalContext) return;
    const current = reconcileBodyGenerationLifecycle(currentProject, currentOrbitalContext);
    persistLifecycle(queueUnresolvedAirlessMoons(current, fidelity));
  }, [persistLifecycle]);

  const startQueue = useCallback(() => {
    const currentProject = projectRef.current;
    const currentOrbitalContext = orbitalContextRef.current;
    if (!currentProject || !currentOrbitalContext) return;
    const current = resumeBodyGenerationQueue(reconcileBodyGenerationLifecycle(currentProject, currentOrbitalContext));
    persistLifecycle(current);
    window.setTimeout(() => runNext(current), 0);
  }, [persistLifecycle, runNext]);

  const pauseQueue = useCallback(() => {
    const currentProject = projectRef.current;
    const currentOrbitalContext = orbitalContextRef.current;
    if (!currentProject || !currentOrbitalContext) return;
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

  return {
    lifecycle,
    activeNodeLabel,
    elapsedMs,
    error,
    queueBody,
    queueUnresolvedMoons,
    startQueue,
    pauseQueue,
    removeQueuedBody,
    cancelActive,
    retryBody,
    regenerateBody
  };
}

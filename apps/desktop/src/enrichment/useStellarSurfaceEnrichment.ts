import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StellarSurfacePresentationArtifact, SystemOrbitalContextArtifact, WorldProject } from '@world-forge/shared';
import {
  STELLAR_SURFACE_PRESENTATION_WORKFLOW_ID,
  isCurrentStellarSurfacePresentationArtifact,
  stellarSurfaceAvailability,
  stellarSurfaceSourceFromProject
} from '@world-forge/generation-runtime/enrichment/stellarSurfacePresentation';
import {
  projectEnrichmentWorkflowDescriptor,
  type ProjectEnrichmentNodeEvent
} from '@world-forge/generation-runtime/enrichment/systemOrbitalContext';
import { generationStageTelemetryEvent, generationTelemetryEvent, type GenerationStageTelemetryDetail, type GenerationTelemetryDetail } from '../generation/generationEvents';

export type StellarSurfaceRuntimeStatus = 'idle' | 'unavailable' | 'stale' | 'running' | 'complete' | 'failed';

export type StellarSurfaceEnrichmentController = {
  status: StellarSurfaceRuntimeStatus;
  availabilityReason: string;
  activeNodeLabel: string;
  error: string;
  elapsedMs: number;
  artifact: StellarSurfacePresentationArtifact | null;
  generate: () => void;
  regenerate: () => void;
  cancel: () => void;
};

type WorkerResponse =
  | { type: 'stage'; id: string; stage: ProjectEnrichmentNodeEvent }
  | { type: 'complete'; id: string; artifact: StellarSurfacePresentationArtifact }
  | { type: 'cancelled'; id: string }
  | { type: 'error'; id: string; message: string };

export function useStellarSurfaceEnrichment({ project, orbitalContext, onProjectEnriched }: {
  project: WorldProject | null;
  orbitalContext: SystemOrbitalContextArtifact | null;
  onProjectEnriched: (project: WorldProject) => void;
}): StellarSurfaceEnrichmentController {
  const [status, setStatus] = useState<StellarSurfaceRuntimeStatus>('idle');
  const [activeNodeLabel, setActiveNodeLabel] = useState('');
  const [error, setError] = useState('');
  const [elapsedMs, setElapsedMs] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const taskIdRef = useRef('');
  const taskStartedAtRef = useRef(0);
  const projectRef = useRef(project);
  const orbitalContextRef = useRef(orbitalContext);
  const onProjectEnrichedRef = useRef(onProjectEnriched);
  const workflow = projectEnrichmentWorkflowDescriptor(STELLAR_SURFACE_PRESENTATION_WORKFLOW_ID);
  const availability = useMemo(() => stellarSurfaceAvailability(project, orbitalContext), [project?.projectId, project?.config, orbitalContext?.artifactSignature]);
  const storedArtifact = project?.enrichmentArtifacts?.[STELLAR_SURFACE_PRESENTATION_WORKFLOW_ID];
  const artifact = project && orbitalContext && storedArtifact && isCurrentStellarSurfacePresentationArtifact(project, orbitalContext, storedArtifact)
    ? storedArtifact
    : null;

  useEffect(() => { projectRef.current = project; }, [project]);
  useEffect(() => { orbitalContextRef.current = orbitalContext; }, [orbitalContext]);
  useEffect(() => { onProjectEnrichedRef.current = onProjectEnriched; }, [onProjectEnriched]);

  useEffect(() => {
    if (status === 'running') return;
    if (!availability.available) { setStatus('unavailable'); setError(''); return; }
    if (artifact) setStatus('complete');
    else if (storedArtifact) setStatus('stale');
    else setStatus('idle');
  }, [artifact?.artifactSignature, availability.available, storedArtifact, project?.projectId, orbitalContext?.artifactSignature]);

  useEffect(() => {
    const worker = new Worker(new URL('../enrichmentWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.id !== taskIdRef.current) return;
      if (message.type === 'stage') {
        const stage = message.stage;
        const index = Math.max(0, workflow.nodes.findIndex((node) => node.id === stage.nodeId));
        const detail: GenerationStageTelemetryDetail = {
          taskId: message.id,
          nodeId: stage.nodeId,
          stageId: stage.stageId,
          phase: stage.phase,
          progress: stage.phase === 'completed' ? 1 : 0.05,
          overallProgress: Math.min(1, (index + (stage.phase === 'completed' ? 1 : 0.05)) / workflow.nodes.length),
          label: workflow.nodes[index]?.label ?? stage.nodeId,
          startedAt: stage.startedAt,
          timestamp: stage.timestamp,
          elapsedMs: stage.durationMs,
          measured: true,
          nativeStage: false,
          graphNode: true,
          dependencies: stage.dependencies,
          version: stage.version,
          message: stage.error,
          metrics: stage.validation ? { validationValid: stage.validation.valid, validationIssueCount: stage.validation.issues.length } : undefined
        };
        setActiveNodeLabel(detail.label);
        window.dispatchEvent(new CustomEvent<GenerationStageTelemetryDetail>(generationStageTelemetryEvent, { detail }));
        return;
      }
      if (message.type === 'complete') {
        const current = projectRef.current;
        const currentOrbital = orbitalContextRef.current;
        if (!current || !currentOrbital || message.artifact.source.projectId !== current.projectId || message.artifact.source.orbitalArtifactSignature !== currentOrbital.artifactSignature) return;
        const enriched: WorldProject = {
          ...current,
          updatedAt: new Date().toISOString(),
          enrichmentArtifacts: {
            ...current.enrichmentArtifacts,
            [STELLAR_SURFACE_PRESENTATION_WORKFLOW_ID]: message.artifact
          }
        };
        onProjectEnrichedRef.current(enriched);
        setStatus('complete');
        setActiveNodeLabel('Stellar surface ready');
        setElapsedMs(Math.max(0, performance.now() - taskStartedAtRef.current));
        const detail: GenerationTelemetryDetail = {
          phase: 'completed', taskId: message.id, progress: 1, label: workflow.label, seed: message.artifact.seed, startNodeId: null,
          startedAt: taskStartedAtRef.current, timestamp: performance.now(), project: enriched
        };
        window.dispatchEvent(new CustomEvent<GenerationTelemetryDetail>(generationTelemetryEvent, { detail }));
      } else if (message.type === 'cancelled') {
        setStatus(availability.available ? 'idle' : 'unavailable');
        setActiveNodeLabel('');
      } else {
        setStatus('failed');
        setError(message.message);
        const detail: GenerationTelemetryDetail = {
          phase: 'failed', taskId: message.id, progress: 1, label: workflow.label, seed: projectRef.current?.seed ?? '', startNodeId: null,
          startedAt: taskStartedAtRef.current, timestamp: performance.now(), error: message.message
        };
        window.dispatchEvent(new CustomEvent<GenerationTelemetryDetail>(generationTelemetryEvent, { detail }));
      }
    };
    return () => { worker.terminate(); if (workerRef.current === worker) workerRef.current = null; };
  }, []);

  useEffect(() => {
    if (status !== 'running') return;
    const refresh = () => setElapsedMs(Math.max(0, performance.now() - taskStartedAtRef.current));
    refresh();
    const timer = window.setInterval(refresh, 100);
    return () => window.clearInterval(timer);
  }, [status]);

  const run = useCallback(() => {
    const current = projectRef.current;
    const currentOrbital = orbitalContextRef.current;
    const worker = workerRef.current;
    if (!current || !currentOrbital || !worker || status === 'running') return;
    const currentAvailability = stellarSurfaceAvailability(current, currentOrbital);
    if (!currentAvailability.available) { setStatus('unavailable'); setError(currentAvailability.reason); return; }
    let source;
    try {
      source = stellarSurfaceSourceFromProject(current, currentOrbital);
    } catch (sourceError) {
      setStatus('failed');
      setError(sourceError instanceof Error ? sourceError.message : String(sourceError));
      return;
    }
    const id = `stellar-surface-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    taskIdRef.current = id;
    taskStartedAtRef.current = performance.now();
    setElapsedMs(0);
    setError('');
    setStatus('running');
    setActiveNodeLabel(workflow.nodes[0].label);
    const detail: GenerationTelemetryDetail = {
      phase: 'started', taskId: id, progress: 0, label: workflow.label, seed: current.seed, startNodeId: null,
      startedAt: taskStartedAtRef.current, timestamp: taskStartedAtRef.current
    };
    window.dispatchEvent(new CustomEvent<GenerationTelemetryDetail>(generationTelemetryEvent, { detail }));
    worker.postMessage({ type: 'run-stellar-surface-presentation', id, source });
  }, [status]);

  const cancel = useCallback(() => {
    if (status !== 'running' || !taskIdRef.current) return;
    workerRef.current?.postMessage({ type: 'cancel', id: taskIdRef.current });
  }, [status]);

  return {
    status,
    availabilityReason: availability.reason,
    activeNodeLabel,
    error,
    elapsedMs,
    artifact,
    generate: run,
    regenerate: run,
    cancel
  };
}

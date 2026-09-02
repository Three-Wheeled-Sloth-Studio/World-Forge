import { useCallback, useEffect, useRef, useState } from 'react';
import type { SystemOrbitalContextArtifact, WorldProject } from '@world-forge/shared';
import {
  SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID,
  isCurrentSystemOrbitalContextArtifact,
  projectEnrichmentWorkflowDescriptor,
  systemOrbitalContextSourceFromProject,
  type ProjectEnrichmentNodeEvent
} from '@world-forge/generation-runtime/enrichment/systemOrbitalContext';
import { generationStageTelemetryEvent, generationTelemetryEvent, type GenerationStageTelemetryDetail, type GenerationTelemetryDetail } from '../generation/generationEvents';

export type OrbitalContextRuntimeStatus = 'idle' | 'stale' | 'running' | 'complete' | 'failed';

type WorkerResponse =
  | { type: 'stage'; id: string; stage: ProjectEnrichmentNodeEvent }
  | { type: 'complete'; id: string; artifact: SystemOrbitalContextArtifact }
  | { type: 'cancelled'; id: string }
  | { type: 'error'; id: string; message: string };

export function useProjectEnrichment({ project, onProjectEnriched }: {
  project: WorldProject | null;
  onProjectEnriched: (project: WorldProject) => void;
}) {
  const [status, setStatus] = useState<OrbitalContextRuntimeStatus>('idle');
  const [activeNodeLabel, setActiveNodeLabel] = useState('');
  const [error, setError] = useState('');
  const [elapsedMs, setElapsedMs] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const taskIdRef = useRef('');
  const taskStartedAtRef = useRef(0);
  const projectRef = useRef(project);
  const onProjectEnrichedRef = useRef(onProjectEnriched);
  const workflow = projectEnrichmentWorkflowDescriptor(SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID);
  const artifact = project?.enrichmentArtifacts?.[SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID];

  useEffect(() => { projectRef.current = project; }, [project]);
  useEffect(() => { onProjectEnrichedRef.current = onProjectEnriched; }, [onProjectEnriched]);

  useEffect(() => {
    if (!project) { setStatus('idle'); setError(''); return; }
    if (artifact && isCurrentSystemOrbitalContextArtifact(project, artifact)) setStatus('complete');
    else if (artifact) setStatus('stale');
    else if (status !== 'running') setStatus('idle');
  }, [artifact, project?.projectId]);

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
        if (!current || message.artifact.source.projectId !== current.projectId) return;
        const enriched: WorldProject = {
          ...current,
          updatedAt: new Date().toISOString(),
          enrichmentArtifacts: {
            ...current.enrichmentArtifacts,
            [SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID]: message.artifact
          }
        };
        onProjectEnrichedRef.current(enriched);
        setStatus('complete');
        setActiveNodeLabel('Orbital context ready');
        setElapsedMs(Math.max(0, performance.now() - taskStartedAtRef.current));
        const detail: GenerationTelemetryDetail = {
          phase: 'completed', taskId: message.id, progress: 1, label: workflow.label, seed: message.artifact.seed, startNodeId: null,
          startedAt: taskStartedAtRef.current, timestamp: performance.now(), project: enriched
        };
        window.dispatchEvent(new CustomEvent<GenerationTelemetryDetail>(generationTelemetryEvent, { detail }));
      } else if (message.type === 'cancelled') {
        setStatus('idle');
        setActiveNodeLabel('');
        const detail: GenerationTelemetryDetail = {
          phase: 'cancelled', taskId: message.id, progress: 1, label: workflow.label, seed: projectRef.current?.seed ?? '', startNodeId: null,
          startedAt: taskStartedAtRef.current, timestamp: performance.now()
        };
        window.dispatchEvent(new CustomEvent<GenerationTelemetryDetail>(generationTelemetryEvent, { detail }));
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

  const ensureOrbitalContext = useCallback(() => {
    const current = projectRef.current;
    const worker = workerRef.current;
    if (!current || !worker || status === 'running') return;
    const currentArtifact = current.enrichmentArtifacts?.[SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID];
    if (currentArtifact && isCurrentSystemOrbitalContextArtifact(current, currentArtifact)) { setStatus('complete'); return; }
    const id = `enrichment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
    worker.postMessage({ type: 'run-system-orbital-context', id, source: systemOrbitalContextSourceFromProject(current) });
  }, [status]);

  useEffect(() => {
    if (!project || (status !== 'idle' && status !== 'stale')) return;
    const currentArtifact = project.enrichmentArtifacts?.[SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID];
    if (currentArtifact && isCurrentSystemOrbitalContextArtifact(project, currentArtifact)) return;
    const timer = window.setTimeout(() => ensureOrbitalContext(), 250);
    return () => window.clearTimeout(timer);
  }, [artifact, ensureOrbitalContext, project?.projectId, status]);

  const cancelOrbitalContext = useCallback(() => {
    if (status !== 'running' || !taskIdRef.current) return;
    workerRef.current?.postMessage({ type: 'cancel', id: taskIdRef.current });
  }, [status]);

  return {
    status, activeNodeLabel, error, elapsedMs, artifact: artifact && project && isCurrentSystemOrbitalContextArtifact(project, artifact) ? artifact : null,
    ensureOrbitalContext, cancelOrbitalContext
  };
}

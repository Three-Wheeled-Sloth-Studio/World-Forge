import React from 'react';
import { CheckCircle2, LoaderCircle, RefreshCw, XCircle } from 'lucide-react';
import type { SystemOrbitalContextArtifact } from '@world-forge/shared';
import type { OrbitalContextRuntimeStatus } from './useProjectEnrichment';
import './orbitalContextStatus.css';

export function OrbitalContextStatus({ status, activeNodeLabel, error, elapsedMs, artifact, onRetry, onCancel }: {
  status: OrbitalContextRuntimeStatus;
  activeNodeLabel: string;
  error: string;
  elapsedMs: number;
  artifact: SystemOrbitalContextArtifact | null;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const seconds = `${Math.max(0, elapsedMs / 1000).toFixed(elapsedMs < 10000 ? 1 : 0)}s`;
  return (
    <div className={`orbital-context-status status-${status}`} data-enrichment-workflow="project.system-orbital-context" data-enrichment-status={status} role="status" aria-live="polite">
      <span className="orbital-context-icon">
        {status === 'running' ? <LoaderCircle size={16} className="orbital-context-spinner" /> : status === 'failed' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
      </span>
      <span className="orbital-context-copy">
        <strong>Orbital context</strong>
        <small>
          {status === 'running' ? `${activeNodeLabel || 'Preparing'} Â· ${seconds}`
            : status === 'failed' ? error || 'Preparation failed'
            : artifact ? `${artifact.payload.bodies.length} bodies Â· ${Math.round(artifact.totalMs)} ms Â· saved presentation artifact`
            : status === 'stale' ? 'Saved context is stale and will be rebuilt'
            : 'Preparing on first Globe use'}
        </small>
      </span>
      {status === 'running' ? <button type="button" onClick={onCancel}>Cancel</button>
        : status === 'failed' || status === 'stale' ? <button type="button" onClick={onRetry}><RefreshCw size={14} />Retry</button>
          : null}
    </div>
  );
}

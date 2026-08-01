import React from 'react';
import { CheckCircle2, LoaderCircle, RefreshCw, Snowflake, XCircle } from 'lucide-react';
import type { SeasonalSurfaceModelArtifact } from '@world-forge/shared';
import type { SeasonalSurfaceRuntimeStatus } from './useSeasonalSurfaceEnrichment';
import './seasonalSurfaceStatus.css';

export function SeasonalSurfaceStatus({ status, activeNodeLabel, error, elapsedMs, artifact, onRetry, onCancel }: {
  status: SeasonalSurfaceRuntimeStatus;
  activeNodeLabel: string;
  error: string;
  elapsedMs: number;
  artifact: SeasonalSurfaceModelArtifact | null;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const seconds = `${Math.max(0, elapsedMs / 1000).toFixed(elapsedMs < 10000 ? 1 : 0)}s`;
  return (
    <div className={`seasonal-surface-status status-${status}`} data-enrichment-workflow="project.seasonal-surface-model" data-enrichment-status={status} role="status" aria-live="polite">
      <span className="seasonal-surface-icon">
        {status === 'running' ? <LoaderCircle size={16} className="seasonal-surface-spinner" /> : status === 'failed' ? <XCircle size={16} /> : status === 'complete' ? <CheckCircle2 size={16} /> : <Snowflake size={16} />}
      </span>
      <span className="seasonal-surface-copy">
        <strong>Seasonal surface</strong>
        <small>
          {status === 'running' ? `${activeNodeLabel || 'Preparing'} · ${seconds}`
            : status === 'failed' ? error || 'Preparation failed'
            : artifact ? `${artifact.payload.coefficientResolution.width}x${artifact.payload.coefficientResolution.height} coefficients · illustrative`
            : status === 'stale' ? 'Saved seasonal model is stale and will be rebuilt'
            : 'Preparing after seasonal display is enabled'}
        </small>
      </span>
      {status === 'running' ? <button type="button" onClick={onCancel}>Cancel</button>
        : status === 'failed' || status === 'stale' ? <button type="button" onClick={onRetry}><RefreshCw size={14} />Retry</button>
          : null}
    </div>
  );
}

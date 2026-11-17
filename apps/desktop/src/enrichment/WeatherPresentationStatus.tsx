import React, { useState } from 'react';
import { downloadWeatherCloudSnapshot } from './exportWeatherCloudSnapshot';
import { CheckCircle2, CloudRain, LoaderCircle, RefreshCw, XCircle } from 'lucide-react';
import type { AtmosphericWeatherPresentationArtifact } from '@world-forge/shared';
import type { WeatherPresentationRuntimeStatus } from './useAtmosphericWeatherEnrichment';
import './weatherPresentationStatus.css';

export function WeatherPresentationStatus({ status, activeNodeLabel, error, elapsedMs, artifact, onRetry, onCancel }: {
  status: WeatherPresentationRuntimeStatus;
  activeNodeLabel: string;
  error: string;
  elapsedMs: number;
  artifact: AtmosphericWeatherPresentationArtifact | null;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const seconds = `${Math.max(0, elapsedMs / 1000).toFixed(elapsedMs < 10000 ? 1 : 0)}s`;
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  async function exportClouds() {
    if (!artifact || exporting) return;
    setExporting(true);
    setExportError('');
    try { await downloadWeatherCloudSnapshot(artifact); }
    catch (error) { setExportError(String(error)); }
    finally { setExporting(false); }
  }
  return (
    <div className={`weather-presentation-status status-${status}`} data-enrichment-workflow="project.atmospheric-weather-presentation" data-enrichment-status={status} role="status" aria-live="polite">
      <span className="weather-presentation-icon">
        {status === 'running' ? <LoaderCircle size={16} className="weather-presentation-spinner" /> : status === 'failed' ? <XCircle size={16} /> : status === 'complete' ? <CheckCircle2 size={16} /> : <CloudRain size={16} />}
      </span>
      <span className="weather-presentation-copy">
        <strong>Clouds and weather</strong>
        <small>
          {status === 'running' ? `${activeNodeLabel || 'Preparing'} · ${seconds}`
            : status === 'failed' ? error || 'Preparation failed'
            : artifact ? `${artifact.payload.cloudBands.length} bands · ${artifact.payload.systems.length} systems · illustrative`
            : status === 'stale' ? 'Saved weather presentation is stale and will be rebuilt'
            : 'Preparing after first layer use'}
        </small>
      </span>
      {status === 'complete' && artifact?.validation.valid ? (
        <button type="button" disabled={exporting} title="Export this validated illustrative cloud map as a reusable ZIP"
          onClick={() => void exportClouds()}>
          {exporting ? 'Exporting...' : 'Export Clouds'}
        </button>
      ) : null}
      {exportError ? <small role="alert">ERROR: {exportError}</small> : null}
      {status === 'running' ? <button type="button" onClick={onCancel}>Cancel</button>
        : status === 'failed' || status === 'stale' ? <button type="button" onClick={onRetry}><RefreshCw size={14} />Retry</button>
          : null}
    </div>
  );
}

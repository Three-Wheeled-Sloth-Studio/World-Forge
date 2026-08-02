import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardCopy, Download, Gauge } from 'lucide-react';
import {
  formatGenerationBytes,
  formatGenerationDuration,
  generationTimingRecordMarkdown,
  loadProductionGenerationTimingHistory,
  type ProductionGenerationTimingRecord
} from '../generation/generationTiming';
import './productionTimingPanel.css';

function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  return Promise.reject(new Error('Clipboard access is unavailable.'));
}

function downloadRecord(record: ProductionGenerationTimingRecord): void {
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `world-forge-generation-${record.taskId}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function optionalDuration(value: number | undefined): string {
  return value === undefined ? 'Not captured' : formatGenerationDuration(value);
}

function completedAtLabel(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : value;
}

export function ProductionTimingPanel() {
  const [history, setHistory] = useState<ProductionGenerationTimingRecord[]>(() => loadProductionGenerationTimingHistory());
  const [status, setStatus] = useState('');
  const latest = history[0];

  useEffect(() => {
    const refresh = () => setHistory(loadProductionGenerationTimingHistory());
    refresh();
    const timer = window.setInterval(refresh, 750);
    return () => window.clearInterval(timer);
  }, []);

  const environmentLabel = useMemo(() => {
    if (!latest) return '';
    const focus = latest.identity.pageFocusedAtLaunch ? 'focused' : 'not focused';
    const visibility = latest.identity.pageVisibleAtLaunch ? 'visible' : 'hidden';
    return `${visibility}, ${focus}, ${latest.identity.logicalProcessorCount ?? '?'} logical processors`;
  }, [latest]);

  const copy = async (kind: 'markdown' | 'json') => {
    if (!latest) return;
    const value = kind === 'markdown' ? generationTimingRecordMarkdown(latest) : JSON.stringify(latest, null, 2);
    try {
      await copyText(value);
      setStatus(kind === 'markdown' ? 'Markdown copied' : 'JSON copied');
    } catch {
      setStatus('Copy unavailable');
      console.info(value);
    }
    window.setTimeout(() => setStatus(''), 1800);
  };

  return (
    <section className="production-timing-panel" aria-labelledby="production-timing-heading">
      <header className="production-timing-heading">
        <Gauge size={17} />
        <div>
          <strong id="production-timing-heading">Production timing</strong>
          <span>Instrumented app-path evidence, not synthetic profiler timing</span>
        </div>
      </header>

      {!latest ? (
        <p className="production-timing-empty">Generate a world to create the first production-path timing record.</p>
      ) : (
        <>
          <div className="production-timing-identity">
            <strong>{latest.identity.workflowLabel} v{latest.identity.workflowVersion}</strong>
            <span>{latest.identity.outputResolution.width} x {latest.identity.outputResolution.height} | seed {latest.identity.seed}</span>
            <small>{completedAtLabel(latest.completedAt)} | build {latest.identity.visibleVersion} | {latest.identity.sourceCommit}</small>
          </div>

          <dl className="production-timing-metrics">
            <div><dt>User-visible wall</dt><dd>{formatGenerationDuration(latest.durations.totalUserVisibleMs)}</dd></div>
            <div><dt>Worker generation</dt><dd>{optionalDuration(latest.durations.workerGenerationMs)}</dd></div>
            <div><dt>Project handoff</dt><dd>{optionalDuration(latest.durations.completedProjectHandoffMs)}</dd></div>
            <div><dt>UI acceptance</dt><dd>{optionalDuration(latest.durations.uiProjectAcceptanceMs)}</dd></div>
            <div><dt>Acceptance to render</dt><dd>{optionalDuration(latest.durations.projectAcceptanceToRenderCommitMs)}</dd></div>
            <div><dt>Render to interactive</dt><dd>{optionalDuration(latest.durations.renderCommitToInteractivePaintMs)}</dd></div>
            <div><dt>Preview work</dt><dd>{latest.preview.count} emitted, {latest.preview.uiPaintCount} painted</dd></div>
            <div><dt>Preview bytes</dt><dd>{formatGenerationBytes(latest.preview.bytesEmitted)}</dd></div>
            <div><dt>Project payload</dt><dd>{latest.payload.estimatedBytes === undefined ? 'Not captured' : formatGenerationBytes(latest.payload.estimatedBytes)}</dd></div>
            <div><dt>Environment</dt><dd>{environmentLabel}</dd></div>
          </dl>

          <div className="production-timing-actions">
            <button type="button" className="secondary-button" onClick={() => copy('markdown')}><ClipboardCopy size={15} />Copy Markdown</button>
            <button type="button" className="secondary-button" onClick={() => copy('json')}><ClipboardCopy size={15} />Copy JSON</button>
            <button type="button" className="secondary-button" onClick={() => downloadRecord(latest)}><Download size={15} />Download JSON</button>
          </div>
          {status && <output className="production-timing-status">{status}</output>}

          <details className="production-timing-details">
            <summary>Native stages and boundaries</summary>
            <div className="production-timing-stage-list">
              {latest.nativeStages.map((stage) => (
                <span key={stage.stageId}><small>{stage.label}</small><strong>{formatGenerationDuration(stage.elapsedMs)}</strong></span>
              ))}
            </div>
            {latest.graphNodes.length > 0 && (
              <div className="production-timing-stage-list graph-node-timings">
                {latest.graphNodes.map((stage) => (
                  <span key={`${stage.stageId}-${stage.parentStageId ?? 'root'}`} title={stage.parentStageId ? `Child of ${stage.parentStageId}` : undefined}>
                    <small>{stage.label}</small><strong>{formatGenerationDuration(stage.elapsedMs)}</strong>
                  </span>
                ))}
              </div>
            )}
          </details>

          {latest.instrumentationGaps.length > 0 && (
            <details className="production-timing-gaps">
              <summary>Known instrumentation gaps</summary>
              <ul>{latest.instrumentationGaps.map((gap) => <li key={gap}>{gap}</li>)}</ul>
            </details>
          )}

          <details className="production-timing-history">
            <summary>Recent production runs ({history.length})</summary>
            <ol>
              {history.map((record) => (
                <li key={record.taskId}>
                  <span>{record.identity.outputResolution.width} x {record.identity.outputResolution.height} | {record.identity.seed}</span>
                  <strong>{formatGenerationDuration(record.durations.totalUserVisibleMs)}</strong>
                </li>
              ))}
            </ol>
          </details>
        </>
      )}
    </section>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import type { BodyGenerationFidelity } from '@world-forge/shared';
import type { BodyGenerationQueueController } from '../enrichment/useBodyGenerationQueue';
import type { SystemCatalogEntry } from './systemPresentation';

export function BodyGenerationPanel({
  selectedEntry,
  controller
}: {
  selectedEntry: SystemCatalogEntry | null;
  controller: BodyGenerationQueueController;
}) {
  const record = selectedEntry ? controller.lifecycle?.records[selectedEntry.id] ?? null : null;
  const [fidelity, setFidelity] = useState<BodyGenerationFidelity>(record?.requestedFidelity ?? 'preview');
  useEffect(() => {
    setFidelity(record?.requestedFidelity ?? 'preview');
  }, [record?.bodyId, record?.requestedFidelity]);

  const queuePosition = useMemo(() => {
    if (!record || !controller.lifecycle) return 0;
    const index = controller.lifecycle.queue.indexOf(record.bodyId);
    return index >= 0 ? index + 1 : 0;
  }, [controller.lifecycle, record]);
  const unresolvedCount = Object.values(controller.lifecycle?.records ?? {})
    .filter((candidate) => candidate.eligible && candidate.status !== 'generated' && candidate.status !== 'generating' && candidate.status !== 'queued')
    .length;
  const activeBodyId = controller.lifecycle?.activeBodyId ?? null;
  const queueCount = controller.lifecycle?.queue.length ?? 0;
  const isActive = Boolean(record && activeBodyId === record.bodyId);

  return (
    <section
      className="system-body-generation"
      aria-label="Body generation lifecycle"
      data-body-id={record?.bodyId ?? 'none'}
      data-body-lifecycle-status={record?.status ?? 'none'}
      data-body-artifact-count={record?.artifactKeys.length ?? 0}
      data-body-queue-count={queueCount}
      data-body-active-id={activeBodyId ?? 'none'}
    >
      <div className="system-generation-heading">
        <strong>Body generation</strong>
        <span>{formatStatus(record?.status ?? 'none')}</span>
      </div>
      {record ? (
        <>
          <dl>
            <div><dt>Eligible</dt><dd>{record.eligible ? 'Yes' : 'No'}</dd></div>
            <div><dt>Profile</dt><dd>{record.profile ?? 'Not assigned'}</dd></div>
            <div><dt>Workflow</dt><dd title={record.workflow.id}>{record.workflow.id || 'N/A'}</dd></div>
            <div><dt>Version</dt><dd>{record.workflow.version || 'N/A'}</dd></div>
            <div><dt>Queue</dt><dd>{queuePosition ? `#${queuePosition}` : isActive ? 'Active' : 'Not queued'}</dd></div>
          </dl>
          <label className="system-fidelity-control" htmlFor="body-generation-fidelity">
            <span>Fidelity</span>
            <select
              id="body-generation-fidelity"
              aria-label="Body generation fidelity"
              value={fidelity}
              disabled={!record.eligible || record.status === 'queued' || record.status === 'generating'}
              onChange={(event) => setFidelity(event.target.value as BodyGenerationFidelity)}
            >
              <option value="preview">Preview 64 x 32</option>
              <option value="standard">Standard 128 x 64</option>
            </select>
          </label>
          <div className="system-generation-actions">
            {record.eligible && (record.status === 'ready' || record.status === 'placeholder') && (
              <button
                type="button"
                className="primary-button"
                aria-label="Generate selected body"
                onClick={() => controller.queueBody(record.bodyId, fidelity, true)}
              >
                Generate selected
              </button>
            )}
            {record.status === 'queued' && (
              <button type="button" aria-label="Remove selected body from generation queue" onClick={() => controller.removeQueuedBody(record.bodyId)}>
                Remove from queue
              </button>
            )}
            {record.status === 'generating' && (
              <button type="button" aria-label="Cancel selected body generation" onClick={controller.cancelActive}>
                Cancel generation
              </button>
            )}
            {record.status === 'failed' && (
              <button type="button" className="primary-button" aria-label="Retry selected body generation" onClick={() => controller.retryBody(record.bodyId)}>
                Retry generation
              </button>
            )}
            {(record.status === 'generated' || record.status === 'stale') && record.eligible && (
              <button type="button" aria-label="Regenerate selected body" onClick={() => controller.regenerateBody(record.bodyId)}>
                Regenerate
              </button>
            )}
          </div>
          <small>{record.eligibilityReason}</small>
          {record.failureReason && <small className="system-generation-error">{record.failureReason}</small>}
          {record.staleReason && <small className="system-generation-warning">{record.staleReason}</small>}
        </>
      ) : (
        <small>Select a system body to inspect generation eligibility.</small>
      )}

      <div className="system-queue-actions">
        <button
          type="button"
          aria-label="Queue unresolved moons"
          disabled={unresolvedCount === 0}
          onClick={() => controller.queueUnresolvedMoons(fidelity)}
        >
          Queue moons ({unresolvedCount})
        </button>
        <button
          type="button"
          className="primary-button"
          aria-label="Start body generation queue"
          disabled={queueCount === 0 || Boolean(activeBodyId)}
          onClick={controller.startQueue}
        >
          Start queue ({queueCount})
        </button>
        {activeBodyId && (
          <button type="button" aria-label="Pause body generation queue after active body" onClick={controller.pauseQueue}>
            Pause after active
          </button>
        )}
      </div>
      {(activeBodyId || controller.activeNodeLabel) && (
        <div className="system-generation-progress" role="status">
          <strong>{controller.activeNodeLabel || 'Generating body'}</strong>
          <span>{formatElapsed(controller.elapsedMs)}</span>
        </div>
      )}
      {controller.error && <small className="system-generation-error">{controller.error}</small>}
    </section>
  );
}

function formatStatus(status: string): string {
  return status === 'none'
    ? 'No selection'
    : status.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function formatElapsed(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return '0.0s';
  return `${(milliseconds / 1000).toFixed(1)}s`;
}

import React, { useMemo } from 'react';
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
  const generatedFidelity = record ? controller.generatedFidelityForBody(record.bodyId) : null;
  const queuePosition = useMemo(() => {
    if (!record || !controller.lifecycle) return 0;
    const index = controller.lifecycle.queue.indexOf(record.bodyId);
    return index >= 0 ? index + 1 : 0;
  }, [controller.lifecycle, record]);
  const eligibleRecords = Object.values(controller.lifecycle?.records ?? {}).filter((candidate) => candidate.eligible);
  const generatedCount = eligibleRecords.filter((candidate) => candidate.status === 'generated').length;
  const previewCount = eligibleRecords.filter((candidate) => controller.generatedFidelityForBody(candidate.bodyId) === 'preview').length;
  const standardCount = eligibleRecords.filter((candidate) => controller.generatedFidelityForBody(candidate.bodyId) === 'standard').length;
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
      data-body-generated-count={generatedCount}
      data-body-eligible-count={eligibleRecords.length}
      data-body-background-enabled={controller.backgroundEnabled}
      data-body-foreground-busy={controller.foregroundBusy}
    >
      <div className="system-generation-heading">
        <strong>Body detail</strong>
        <span>{formatStatus(record?.status ?? 'none')}</span>
      </div>

      {record ? (
        <>
          <dl>
            <div><dt>Profile</dt><dd>{record.profile ? formatProfile(record.profile) : 'Primary workflow'}</dd></div>
            <div><dt>Generated quality</dt><dd>{generatedFidelity ? fidelityLabel(generatedFidelity) : 'Not generated yet'}</dd></div>
            {(record.status === 'queued' || record.status === 'generating') && (
              <div><dt>Requested quality</dt><dd>{fidelityLabel(record.requestedFidelity)}</dd></div>
            )}
            {(record.status === 'queued' || isActive) && (
              <div><dt>Queue</dt><dd>{queuePosition ? `#${queuePosition}` : isActive ? 'Active' : 'Not queued'}</dd></div>
            )}
          </dl>

          {(record.status === 'ready' || record.status === 'placeholder') && record.eligible && (
            <small>
              {controller.backgroundEnabled
                ? 'A lightweight Preview will be generated automatically in the background.'
                : 'Background preview generation is paused.'}
            </small>
          )}

          <div className="system-generation-actions">
            {record.status === 'generated' && record.eligible && generatedFidelity === 'preview' && (
              <button
                type="button"
                className="primary-button"
                aria-label="Upgrade selected body to standard detail"
                onClick={() => controller.upgradeBody(record.bodyId)}
              >
                Upgrade to Standard
              </button>
            )}
            {record.status === 'generated' && record.eligible && generatedFidelity === 'standard' && (
              <button
                type="button"
                aria-label="Regenerate selected body at standard detail"
                onClick={() => controller.queueBody(record.bodyId, 'standard', true)}
              >
                Regenerate Standard
              </button>
            )}
            {record.status === 'queued' && (
              <button type="button" aria-label="Remove selected body from generation queue" onClick={() => controller.removeQueuedBody(record.bodyId)}>
                Remove from queue
              </button>
            )}
            {record.status === 'generating' && isActive && (
              <button type="button" aria-label="Cancel selected body generation" onClick={controller.cancelActive}>
                Cancel generation
              </button>
            )}
            {record.status === 'failed' && (
              <button type="button" className="primary-button" aria-label="Retry selected body generation" onClick={() => controller.retryBody(record.bodyId)}>
                Retry generation
              </button>
            )}
            {record.status === 'stale' && record.eligible && (
              <button type="button" className="primary-button" aria-label="Regenerate stale selected body" onClick={() => controller.regenerateBody(record.bodyId)}>
                Regenerate body
              </button>
            )}
          </div>

          <small>{record.eligibilityReason}</small>
          {generatedFidelity === 'preview' && record.status === 'generated' && (
            <small>Preview uses a 64 x 32 persisted field. Standard regenerates the body at 128 x 64 while keeping the Preview visible until the upgrade succeeds.</small>
          )}
          {generatedFidelity === 'standard' && (
            <small>Standard uses a 128 x 64 persisted field and higher-detail inspection textures.</small>
          )}
          {record.failureReason && <small className="system-generation-error">{record.failureReason}</small>}
          {record.staleReason && <small className="system-generation-warning">{record.staleReason}</small>}
        </>
      ) : (
        <small>Select a system body to inspect its generated detail.</small>
      )}

      <div className="system-queue-actions">
        {controller.backgroundEnabled ? (
          <button type="button" aria-label="Pause automatic background body generation" onClick={controller.pauseQueue}>
            Pause background
          </button>
        ) : (
          <button type="button" className="primary-button" aria-label="Resume automatic background body generation" onClick={controller.startQueue}>
            Resume background
          </button>
        )}
      </div>

      <small>
        Background previews: {generatedCount} of {eligibleRecords.length} bodies ready ({previewCount} Preview, {standardCount} Standard){queueCount ? `, ${queueCount} queued` : ''}.
      </small>
      {controller.foregroundBusy && (
        <small>Foreground work has priority. Background body generation will resume automatically when it is clear.</small>
      )}
      {(activeBodyId || controller.activeNodeLabel) && !controller.foregroundBusy && (
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

function formatProfile(profile: string): string {
  return profile.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function fidelityLabel(fidelity: BodyGenerationFidelity): string {
  return fidelity === 'standard' ? 'Standard (128 x 64)' : 'Preview (64 x 32)';
}

function formatElapsed(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return '0.0s';
  return `${(milliseconds / 1000).toFixed(1)}s`;
}

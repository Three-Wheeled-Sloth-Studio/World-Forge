import React from 'react';
import type { StellarSurfaceEnrichmentController } from '../enrichment/useStellarSurfaceEnrichment';

export function StellarSurfacePanel({ controller }: { controller: StellarSurfaceEnrichmentController }) {
  const artifact = controller.artifact;
  return (
    <section
      className="stellar-surface-panel"
      aria-label="Stellar surface presentation"
      data-stellar-surface-status={controller.status}
      data-stellar-artifact-signature={artifact?.artifactSignature ?? 'none'}
    >
      <div className="system-generation-heading">
        <strong>Stellar surface</strong>
        <span>{formatStatus(controller.status)}</span>
      </div>
      {artifact ? (
        <dl>
          <div><dt>Activity</dt><dd>{artifact.payload.activityClass}</dd></div>
          <div><dt>Index</dt><dd>{artifact.payload.activityIndex.toFixed(2)}</dd></div>
          <div><dt>Rotation</dt><dd>{artifact.payload.rotationPeriodDays.toFixed(1)} days</dd></div>
          <div><dt>Cycle</dt><dd>{artifact.payload.cyclePeriodYears.toFixed(1)} years</dd></div>
          <div><dt>Spots</dt><dd>{artifact.payload.spots.length}</dd></div>
          <div><dt>Faculae</dt><dd>{artifact.payload.faculae.length}</dd></div>
          <div><dt>Streamers</dt><dd>{artifact.payload.corona.streamers.length}</dd></div>
        </dl>
      ) : (
        <small>{controller.status === 'unavailable' ? controller.availabilityReason : 'Generate deterministic photosphere granulation, active regions, rotation, and corona for this star.'}</small>
      )}
      <div className="system-generation-actions">
        {controller.status === 'idle' && <button type="button" className="primary-button" aria-label="Generate stellar surface detail" onClick={controller.generate}>Generate star detail</button>}
        {(controller.status === 'failed' || controller.status === 'stale') && <button type="button" className="primary-button" aria-label="Retry stellar surface detail" onClick={controller.generate}>Retry star detail</button>}
        {controller.status === 'complete' && <button type="button" aria-label="Regenerate stellar surface detail" onClick={controller.regenerate}>Regenerate star detail</button>}
        {controller.status === 'running' && <button type="button" aria-label="Cancel stellar surface detail" onClick={controller.cancel}>Cancel</button>}
      </div>
      {controller.status === 'running' && (
        <div className="system-generation-progress" role="status">
          <strong>{controller.activeNodeLabel || 'Generating stellar surface'}</strong>
          <span>{formatElapsed(controller.elapsedMs)}</span>
        </div>
      )}
      {controller.error && <small className="system-generation-error">{controller.error}</small>}
      {artifact && <small>Illustrative presentation artifact. The generated stellar scaffold remains authoritative.</small>}
    </section>
  );
}

function formatStatus(status: string): string {
  return status.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function formatElapsed(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return '0.0s';
  return `${(milliseconds / 1000).toFixed(1)}s`;
}

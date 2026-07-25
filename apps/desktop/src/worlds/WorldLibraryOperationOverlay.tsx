import React from 'react';

export type WorldLibraryOperation = {
  kind: 'saving' | 'loading';
  title: string;
  detail: string;
};

export function WorldLibraryOperationOverlay({ operation }: { operation: WorldLibraryOperation | null }) {
  if (!operation) return null;

  return (
    <div className="world-library-operation-backdrop" role="presentation">
      <section
        className="world-library-operation-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="world-library-operation-title"
        aria-describedby="world-library-operation-detail"
        aria-busy="true"
      >
        <div className="world-library-operation-spinner" aria-hidden="true" />
        <p className="world-library-operation-kicker">{operation.kind === 'saving' ? 'Saving world' : 'Loading world'}</p>
        <h2 id="world-library-operation-title">{operation.title}</h2>
        <p id="world-library-operation-detail">{operation.detail}</p>
        <progress aria-label={`${operation.kind === 'saving' ? 'Save' : 'Load'} in progress`} />
        <span>Keep this window open until the operation finishes.</span>
      </section>
    </div>
  );
}

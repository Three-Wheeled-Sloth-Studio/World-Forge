import React, { useState } from 'react';
import { Save } from 'lucide-react';
import type { SavedMapRecord } from '../sync';
import { WorldLibraryOperationOverlay, type WorldLibraryOperation } from './WorldLibraryOperationOverlay';
import { WorldNameEditor } from './WorldNameEditor';
import { requestWorldRename } from './worldIdentityBridge';

export type MyWorldsPanelProps = {
  activeProjectId?: string;
  canSaveCurrent: boolean;
  records: SavedMapRecord[];
  status: string;
  onSaveCurrent: () => void | Promise<void>;
  onLoad: (record: SavedMapRecord) => void | Promise<void>;
  onRemove: (record: SavedMapRecord) => void;
};

export function MyWorldsPanel({
  activeProjectId,
  canSaveCurrent,
  records,
  status,
  onSaveCurrent,
  onLoad,
  onRemove
}: MyWorldsPanelProps) {
  const [operation, setOperation] = useState<WorldLibraryOperation | null>(null);

  const runOperation = async (next: WorldLibraryOperation, task: () => void | Promise<void>) => {
    if (operation) return;
    setOperation(next);
    try {
      await task();
    } finally {
      setOperation(null);
    }
  };

  return (
    <div className="my-worlds-panel" role="tabpanel" aria-label="My Worlds">
      <div className="world-library-actions">
        <button
          type="button"
          disabled={!canSaveCurrent || Boolean(operation)}
          onClick={() => {
            void runOperation({
              kind: 'saving',
              title: 'Saving current world',
              detail: 'Writing the generated world and current settings to the local world library.',
            }, onSaveCurrent).catch(() => undefined);
          }}
        >
          <Save size={16} />
          Save Current
        </button>
        <span>{records.length} saved</span>
      </div>
      {status && <div className="world-library-status">{status}</div>}
      {records.length === 0 ? (
        <div className="empty-library">
          <strong>No saved worlds</strong>
          <span>Generate a world, then save it here for in-app loading.</span>
        </div>
      ) : (
        <div className="world-list">
          {records.map((record) => (
            <article key={record.projectId} className={`world-list-item ${activeProjectId === record.projectId ? 'active' : ''}`}>
              <div>
                <WorldNameEditor value={record.projectName} onSave={(name) => requestWorldRename(record.projectId, name)} />
                <span>Seed {record.seed} · {new Date(record.updatedAt).toLocaleString()}</span>
              </div>
              <div className="world-list-actions">
                <button
                  type="button"
                  disabled={Boolean(operation)}
                  onClick={() => {
                    void runOperation({
                      kind: 'loading',
                      title: `Loading ${record.projectName}`,
                      detail: 'Reading saved world data and replacing the active World Forge workspace.',
                    }, () => onLoad(record)).catch(() => undefined);
                  }}
                >Load</button>
                <button type="button" className="subtle-button" disabled={Boolean(operation)} onClick={() => onRemove(record)}>Remove</button>
              </div>
            </article>
          ))}
        </div>
      )}
      <WorldLibraryOperationOverlay operation={operation} />
    </div>
  );
}

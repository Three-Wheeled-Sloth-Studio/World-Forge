import { describe, expect, it } from 'vitest';
import { createDefaultConfig, generateProject } from '@world-forge/generator-core';
import {
  compactSavedWorldRecord,
  localWorldStorageLimits,
  mergeSavedMapRecords,
  savedMapRecordForProject,
  type SavedWorldStorageRecord,
} from './storage';

describe('world storage provider helpers', () => {
  it('creates compact replay-ready metadata from generated projects', () => {
    const project = generateProject(createDefaultConfig('storage-record-001', { width: 64, height: 32 }));
    const record = savedMapRecordForProject(project);

    expect(record).toMatchObject({
      projectId: project.projectId,
      projectName: project.projectName,
      seed: 'storage-record-001',
      updatedAt: project.updatedAt,
      replayManifest: {
        format: 'world-forge-replay',
        formatVersion: 1,
        worldProjectId: project.projectId,
        worldName: project.projectName,
        generatorVersion: project.generatorVersion,
      },
    });
    expect(record.replayManifest?.config).toEqual(project.config);
    expect(record.replayManifest?.outputSignature).toMatch(/^wf-a1-[0-9a-f]{16}$/);
    expect('primaryWorld' in record).toBe(false);
  });

  it('merges saved-world metadata by latest update time', () => {
    const older = { projectId: 'world-1', projectName: 'Old', seed: '1', updatedAt: '2026-07-01T00:00:00.000Z' };
    const newer = { projectId: 'world-1', projectName: 'New', seed: '1', updatedAt: '2026-07-02T00:00:00.000Z' };
    const other = { projectId: 'world-2', projectName: 'Other', seed: '2', updatedAt: '2026-07-03T00:00:00.000Z' };

    expect(mergeSavedMapRecords([older, other], [newer])).toEqual([other, newer]);
  });

  it('lists legacy saved-world metadata without reading the full project payload', () => {
    let payloadReads = 0;
    const project = new Proxy({}, {
      get() {
        payloadReads += 1;
        return undefined;
      },
    });
    const record: SavedWorldStorageRecord = {
      storageSchemaVersion: 1,
      projectSchemaVersion: 1,
      projectId: 'legacy-world',
      projectName: 'Legacy World',
      seed: '101',
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-02T00:00:00.000Z',
      appVersion: '0.3.14',
      generatorVersion: '0.1.0-mvp',
      sizeBytes: 1,
      project,
    };

    expect(compactSavedWorldRecord(record)).toEqual({
      projectId: 'legacy-world',
      projectName: 'Legacy World',
      seed: '101',
      updatedAt: '2026-07-02T00:00:00.000Z',
      replayManifest: undefined,
    });
    expect(payloadReads).toBe(0);
  });

  it('sets conservative hosted-beta local storage limits', () => {
    expect(localWorldStorageLimits.maxSavedWorlds).toBeGreaterThanOrEqual(8);
    expect(localWorldStorageLimits.maxSavedWorlds).toBeLessThanOrEqual(20);
    expect(localWorldStorageLimits.maxAssetBytes).toBeLessThanOrEqual(25 * 1024 * 1024);
  });
});

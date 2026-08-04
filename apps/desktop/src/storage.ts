import { deserializeProject, serializeProject } from '@world-forge/exporters';
import { WorldProject } from '@world-forge/shared';
import {
  type MultiBodyWorldProject,
  type WorldBodyAssetPayloads,
} from '@world-forge/shared/worldBodies';
import { SavedMapRecord } from './sync';
import { buildWorldReplayManifest, type WorldReplayManifestV1 } from './worlds/worldReplayManifest';

export const localWorldStorageLimits = {
  maxSavedWorlds: 12,
  maxAssetBytes: 25 * 1024 * 1024,
  maxTotalBytes: 150 * 1024 * 1024
} as const;

export type StorageProviderKind = 'indexeddb' | 'cloud' | 'desktop';

export type StorageProviderInfo = {
  kind: StorageProviderKind;
  label: string;
  durable: boolean;
  crossMachine: boolean;
  limits: typeof localWorldStorageLimits;
};

export type ReplayReadySavedMapRecord = SavedMapRecord & {
  replayManifest?: WorldReplayManifestV1;
};

export type SavedWorldStorageRecord = ReplayReadySavedMapRecord & {
  storageSchemaVersion: 1;
  projectSchemaVersion: 1;
  appVersion: string;
  generatorVersion: string;
  createdAt: string;
  sizeBytes: number;
  project: unknown;
  bodyAssetPayloads?: WorldBodyAssetPayloads;
};

export interface WorldStorageProvider {
  info: StorageProviderInfo;
  saveWorld(project: WorldProject): Promise<ReplayReadySavedMapRecord>;
  loadWorld(projectId: string): Promise<WorldProject | null>;
  deleteWorld(projectId: string): Promise<void>;
  listWorlds(): Promise<ReplayReadySavedMapRecord[]>;
  estimateUsage(): Promise<{ usedBytes: number; quotaBytes?: number }>;
}

const worldLibraryDbName = 'world-forge-library';
const worldLibraryStore = 'worlds';
const worldLibraryMetadataStore = 'world-metadata';

export function savedMapRecordForProject(project: WorldProject): ReplayReadySavedMapRecord {
  return {
    projectId: project.projectId,
    projectName: project.projectName,
    seed: project.seed,
    updatedAt: project.updatedAt,
    replayManifest: buildWorldReplayManifest(project),
  };
}

export function mergeSavedMapRecords(...groups: SavedMapRecord[][]): SavedMapRecord[] {
  const byId = new Map<string, SavedMapRecord>();
  for (const record of groups.flat()) {
    const existing = byId.get(record.projectId);
    if (!existing || new Date(record.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()) {
      byId.set(record.projectId, record);
    }
  }
  return [...byId.values()].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export class IndexedDbWorldStorageProvider implements WorldStorageProvider {
  readonly info: StorageProviderInfo = {
    kind: 'indexeddb',
    label: 'Browser local library',
    durable: true,
    crossMachine: false,
    limits: localWorldStorageLimits
  };

  async saveWorld(project: WorldProject): Promise<ReplayReadySavedMapRecord> {
    const record = storedWorldRecordForProject(project);
    const db = await openWorldLibraryDb();
    const transaction = db.transaction([worldLibraryStore, worldLibraryMetadataStore], 'readwrite');
    await Promise.all([
      idbRequest(transaction.objectStore(worldLibraryStore).put(record)),
      idbRequest(transaction.objectStore(worldLibraryMetadataStore).put(compactSavedWorldRecord(record))),
    ]);
    db.close();
    await this.pruneOldWorlds();
    return savedMapRecordForProject(project);
  }

  async loadWorld(projectId: string): Promise<WorldProject | null> {
    const db = await openWorldLibraryDb();
    const record = await idbRequest<SavedWorldStorageRecord | undefined>(db.transaction(worldLibraryStore, 'readonly').objectStore(worldLibraryStore).get(projectId));
    db.close();
    return record?.project ? projectFromStoredWorldRecord(record) : null;
  }

  async deleteWorld(projectId: string): Promise<void> {
    const db = await openWorldLibraryDb();
    const transaction = db.transaction([worldLibraryStore, worldLibraryMetadataStore], 'readwrite');
    await Promise.all([
      idbRequest(transaction.objectStore(worldLibraryStore).delete(projectId)),
      idbRequest(transaction.objectStore(worldLibraryMetadataStore).delete(projectId)),
    ]);
    db.close();
  }

  async listWorlds(): Promise<ReplayReadySavedMapRecord[]> {
    return this.listMetadataRecords();
  }

  async estimateUsage(): Promise<{ usedBytes: number; quotaBytes?: number }> {
    if (globalThis.navigator?.storage?.estimate) {
      const estimate = await globalThis.navigator.storage.estimate();
      return {
        usedBytes: estimate.usage ?? 0,
        quotaBytes: estimate.quota
      };
    }
    const records = await this.listStoredRecords();
    return {
      usedBytes: records.reduce((sum, record) => sum + (record.sizeBytes || 0), 0)
    };
  }

  private async pruneOldWorlds(): Promise<void> {
    const records = await this.listMetadataRecords();
    if (records.length <= localWorldStorageLimits.maxSavedWorlds) return;
    const toDelete = records
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(localWorldStorageLimits.maxSavedWorlds);
    const db = await openWorldLibraryDb();
    const transaction = db.transaction([worldLibraryStore, worldLibraryMetadataStore], 'readwrite');
    await Promise.all(toDelete.flatMap((record) => [
      idbRequest(transaction.objectStore(worldLibraryStore).delete(record.projectId)),
      idbRequest(transaction.objectStore(worldLibraryMetadataStore).delete(record.projectId)),
    ]));
    db.close();
  }

  private async listMetadataRecords(): Promise<ReplayReadySavedMapRecord[]> {
    const db = await openWorldLibraryDb();
    const records = await idbRequest<ReplayReadySavedMapRecord[]>(
      db.transaction(worldLibraryMetadataStore, 'readonly').objectStore(worldLibraryMetadataStore).getAll(),
    );
    db.close();
    return records.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  private async listStoredRecords(): Promise<SavedWorldStorageRecord[]> {
    const db = await openWorldLibraryDb();
    const records = await idbRequest<SavedWorldStorageRecord[]>(db.transaction(worldLibraryStore, 'readonly').objectStore(worldLibraryStore).getAll());
    db.close();
    return records.map(normalizeStoredWorldRecord).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
}

export const defaultWorldStorageProvider = new IndexedDbWorldStorageProvider();

export function compactSavedWorldRecord(record: SavedWorldStorageRecord): ReplayReadySavedMapRecord {
  return {
    projectId: record.projectId,
    projectName: record.projectName,
    seed: record.seed,
    updatedAt: record.updatedAt,
    replayManifest: record.replayManifest,
  };
}

export function storedWorldRecordForProject(project: WorldProject): SavedWorldStorageRecord {
  const projectPayload = serializeProject(project, { includeLayerData: true });
  const bodyAssetPayloads = cloneBodyAssetPayloads((project as MultiBodyWorldProject).bodyAssetPayloads);
  return {
    ...savedMapRecordForProject(project),
    storageSchemaVersion: 1,
    projectSchemaVersion: 1,
    appVersion: project.appVersion,
    generatorVersion: project.generatorVersion,
    createdAt: project.createdAt,
    sizeBytes: roughJsonBytes(projectPayload) + bodyAssetPayloadBytes(bodyAssetPayloads),
    project: projectPayload,
    bodyAssetPayloads: Object.keys(bodyAssetPayloads).length ? bodyAssetPayloads : undefined,
  };
}

export function projectFromStoredWorldRecord(record: SavedWorldStorageRecord): WorldProject {
  const project = deserializeProject(record.project);
  const bodyAssetPayloads = cloneBodyAssetPayloads(record.bodyAssetPayloads);
  return Object.keys(bodyAssetPayloads).length
    ? { ...project, bodyAssetPayloads } as MultiBodyWorldProject
    : project;
}

function normalizeStoredWorldRecord(record: Partial<SavedWorldStorageRecord>): SavedWorldStorageRecord {
  const bodyAssetPayloads = cloneBodyAssetPayloads(record.bodyAssetPayloads);
  return {
    storageSchemaVersion: 1,
    projectSchemaVersion: 1,
    projectId: String(record.projectId || ''),
    projectName: String(record.projectName || 'Untitled World'),
    seed: String(record.seed || ''),
    createdAt: String(record.createdAt || record.updatedAt || new Date(0).toISOString()),
    updatedAt: String(record.updatedAt || record.createdAt || new Date(0).toISOString()),
    appVersion: String(record.appVersion || ''),
    generatorVersion: String(record.generatorVersion || ''),
    sizeBytes: Number(record.sizeBytes || roughJsonBytes(record.project) + bodyAssetPayloadBytes(bodyAssetPayloads)),
    replayManifest: record.replayManifest,
    project: record.project,
    bodyAssetPayloads: Object.keys(bodyAssetPayloads).length ? bodyAssetPayloads : undefined,
  };
}

function cloneBodyAssetPayloads(value: unknown): WorldBodyAssetPayloads {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const payloads: WorldBodyAssetPayloads = {};
  for (const [assetId, payload] of Object.entries(value)) {
    const bytes = cloneBytes(payload);
    if (assetId.trim() && bytes) payloads[assetId] = bytes;
  }
  return payloads;
}

function cloneBytes(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) return Uint8Array.from(value);
  if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
  if (ArrayBuffer.isView(value)) {
    return Uint8Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
  }
  if (Array.isArray(value) && value.every((entry) => Number.isInteger(entry) && Number(entry) >= 0 && Number(entry) <= 255)) {
    return Uint8Array.from(value as number[]);
  }
  return null;
}

function bodyAssetPayloadBytes(payloads: WorldBodyAssetPayloads): number {
  return Object.values(payloads).reduce((sum, payload) => sum + payload.byteLength, 0);
}

function openWorldLibraryDb(): Promise<IDBDatabase> {
  if (!('indexedDB' in globalThis)) return Promise.reject(new Error('In-app world storage is not available in this environment.'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(worldLibraryDbName, 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(worldLibraryStore)) db.createObjectStore(worldLibraryStore, { keyPath: 'projectId' });
      if (!db.objectStoreNames.contains(worldLibraryMetadataStore)) {
        db.createObjectStore(worldLibraryMetadataStore, { keyPath: 'projectId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open world library.'));
  });
}

function idbRequest<T = unknown>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('World library request failed.'));
  });
}

function roughJsonBytes(value: unknown): number {
  try {
    return new Blob([JSON.stringify(value)]).size;
  } catch {
    return 0;
  }
}

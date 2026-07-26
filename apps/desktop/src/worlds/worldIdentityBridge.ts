import type { WorldProject } from '@world-forge/shared';
import type { ReplayReadySavedMapRecord } from '../storage';
import {
  assessWorldReplayCompatibility,
  buildWorldReplayManifest,
  isWorldReplayManifest,
  type WorldReplayCompatibility,
  type WorldReplayManifestV1,
} from './worldReplayManifest';

export const WORLD_FORGE_WORLD_IDENTITY_MESSAGE = 'parchment-worlds:world-forge-world-identity';
export const WORLD_FORGE_WORLD_INVENTORY_MESSAGE = 'parchment-worlds:world-forge-world-inventory';
export const WORLD_FORGE_REPLAY_RESULT_MESSAGE = 'parchment-worlds:world-forge-replay-result';
export const PARCHMENT_REQUEST_WORLD_INVENTORY_MESSAGE = 'parchment-worlds:request-world-forge-world-inventory';
export const PARCHMENT_SET_WORLD_NAME_MESSAGE = 'parchment-worlds:set-world-forge-world-name';
export const PARCHMENT_REPLAY_WORLD_MESSAGE = 'parchment-worlds:replay-world-forge-world';
export const WORLD_FORGE_RENAME_REQUEST_EVENT = 'world-forge:rename-world';
export const WORLD_FORGE_REPLAY_REQUEST_EVENT = 'world-forge:replay-world';
const MAX_WORLD_NAME_LENGTH = 120;
const rememberedWorldNames = new Map<string, string>();

export type EmbeddedWorldContext = {
  embedded: boolean;
  projectId: string | null;
  worldName: string | null;
};

export type WorldIdentityMessage = {
  type: typeof WORLD_FORGE_WORLD_IDENTITY_MESSAGE;
  payload: {
    projectId: string;
    worldName: string;
    worldProjectId: string;
    updatedAt: string;
    operation: 'renamed' | 'saved';
    replayManifest: WorldReplayManifestV1;
    replayCompatibility: WorldReplayCompatibility;
  };
};

export type WorldInventoryMessage = {
  type: typeof WORLD_FORGE_WORLD_INVENTORY_MESSAGE;
  payload: {
    projectId: string;
    worlds: Array<{
      worldProjectId: string;
      worldName: string;
      updatedAt: string;
      seed: string;
      replayManifest?: WorldReplayManifestV1;
      replayCompatibility: 'not-recorded' | WorldReplayCompatibility;
    }>;
  };
};

export type WorldReplayResultMessage = {
  type: typeof WORLD_FORGE_REPLAY_RESULT_MESSAGE;
  payload: {
    projectId: string;
    worldProjectId: string;
    requestId: string;
    status: 'verified' | 'incompatible' | 'failed';
    expectedSignature: string;
    actualSignature?: string;
    message?: string;
  };
};

export type SetWorldNameMessage = {
  type: typeof PARCHMENT_SET_WORLD_NAME_MESSAGE;
  payload: {
    projectId: string;
    worldName: string;
  };
};

export type WorldRenameRequestDetail = {
  projectId: string;
  worldName: string;
  resolve: () => void;
  reject: (cause: unknown) => void;
};

export type WorldReplayRequestDetail = {
  parentProjectId: string;
  requestId: string;
  manifest: WorldReplayManifestV1;
};

export function readEmbeddedWorldContext(search = globalThis.location?.search ?? ''): EmbeddedWorldContext {
  const params = new URLSearchParams(search);
  const embedded = params.get('embed') === 'shell';
  const projectId = cleanText(params.get('projectId'));
  const worldName = cleanText(params.get('worldName'));
  return { embedded, projectId, worldName };
}

export function prepareWorldProjectForSave(
  project: WorldProject,
  search = globalThis.location?.search ?? '',
): WorldProject {
  const context = readEmbeddedWorldContext(search);
  const rememberedName = rememberedWorldNames.get(project.projectId);
  const embeddedNameStillApplies = context.embedded
    && context.worldName
    && project.projectName === project.primaryWorld.name
    ? context.worldName
    : null;
  const effectiveName = rememberedName ?? embeddedNameStillApplies;
  return effectiveName ? renameWorldProject(project, effectiveName) : project;
}

export function renameWorldProject(project: WorldProject, requestedName: string): WorldProject {
  const projectName = normalizeWorldName(requestedName);
  return project.projectName === projectName ? project : { ...project, projectName };
}

export function rememberWorldName(projectId: string, requestedName: string): void {
  rememberedWorldNames.set(projectId, normalizeWorldName(requestedName));
}

export function requestWorldRename(projectId: string, worldName: string): Promise<void> {
  const requestedName = normalizeWorldName(worldName);
  return new Promise((resolve, reject) => {
    globalThis.dispatchEvent(new CustomEvent<WorldRenameRequestDetail>(WORLD_FORGE_RENAME_REQUEST_EVENT, {
      detail: { projectId, worldName: requestedName, resolve, reject },
    }));
  });
}

export function notifyParchmentWorldIdentity(
  project: WorldProject,
  operation: WorldIdentityMessage['payload']['operation'],
  options: {
    search?: string;
    postMessage?: (message: WorldIdentityMessage, targetOrigin: string) => void;
    targetOrigin?: string;
  } = {},
): void {
  const context = readEmbeddedWorldContext(options.search);
  if (!context.embedded || !context.projectId) return;
  const replayManifest = buildWorldReplayManifest(project);

  const message: WorldIdentityMessage = {
    type: WORLD_FORGE_WORLD_IDENTITY_MESSAGE,
    payload: {
      projectId: context.projectId,
      worldName: project.projectName,
      worldProjectId: project.projectId,
      updatedAt: project.updatedAt,
      operation,
      replayManifest,
      replayCompatibility: assessWorldReplayCompatibility(replayManifest),
    },
  };

  const postMessage = options.postMessage ?? ((value, targetOrigin) => globalThis.parent?.postMessage(value, targetOrigin));
  postMessage(message, options.targetOrigin ?? parentOrigin());
}

export function notifyParchmentWorldInventory(
  records: ReplayReadySavedMapRecord[],
  options: {
    search?: string;
    postMessage?: (message: WorldInventoryMessage, targetOrigin: string) => void;
    targetOrigin?: string;
  } = {},
): void {
  const context = readEmbeddedWorldContext(options.search);
  if (!context.embedded || !context.projectId) return;

  const message: WorldInventoryMessage = {
    type: WORLD_FORGE_WORLD_INVENTORY_MESSAGE,
    payload: {
      projectId: context.projectId,
      worlds: records.map((record) => ({
        worldProjectId: record.projectId,
        worldName: record.projectName,
        updatedAt: record.updatedAt,
        seed: record.seed,
        replayManifest: record.replayManifest,
        replayCompatibility: record.replayManifest
          ? assessWorldReplayCompatibility(record.replayManifest)
          : 'not-recorded',
      })),
    },
  };

  const postMessage = options.postMessage ?? ((value, targetOrigin) => globalThis.parent?.postMessage(value, targetOrigin));
  postMessage(message, options.targetOrigin ?? parentOrigin());
}

export function notifyParchmentReplayResult(
  detail: Omit<WorldReplayResultMessage['payload'], 'projectId'>,
  options: {
    search?: string;
    postMessage?: (message: WorldReplayResultMessage, targetOrigin: string) => void;
    targetOrigin?: string;
  } = {},
): void {
  const context = readEmbeddedWorldContext(options.search);
  if (!context.embedded || !context.projectId) return;
  const message: WorldReplayResultMessage = {
    type: WORLD_FORGE_REPLAY_RESULT_MESSAGE,
    payload: { projectId: context.projectId, ...detail },
  };
  const postMessage = options.postMessage ?? ((value, targetOrigin) => globalThis.parent?.postMessage(value, targetOrigin));
  postMessage(message, options.targetOrigin ?? parentOrigin());
}

export function isParchmentWorldInventoryRequest(
  value: unknown,
  expectedProjectId: string | null,
): boolean {
  if (!expectedProjectId || !isRecord(value) || value.type !== PARCHMENT_REQUEST_WORLD_INVENTORY_MESSAGE) return false;
  const payload = value.payload;
  if (!isRecord(payload)) return false;
  return cleanText(payload.projectId) === expectedProjectId;
}

export function parseParchmentReplayWorldMessage(
  value: unknown,
  expectedProjectId: string | null,
): WorldReplayRequestDetail | null {
  if (!expectedProjectId || !isRecord(value) || value.type !== PARCHMENT_REPLAY_WORLD_MESSAGE || !isRecord(value.payload)) return null;
  const parentProjectId = cleanText(value.payload.projectId);
  const requestId = cleanText(value.payload.requestId);
  if (parentProjectId !== expectedProjectId || !requestId || !isWorldReplayManifest(value.payload.manifest)) return null;
  return { parentProjectId, requestId, manifest: value.payload.manifest };
}

export function parseParchmentSetWorldNameMessage(
  value: unknown,
  expectedProjectId: string | null,
): string | null {
  if (!isRecord(value) || value.type !== PARCHMENT_SET_WORLD_NAME_MESSAGE) return null;
  const payload = value.payload;
  if (!isRecord(payload)) return null;
  const projectId = cleanText(payload.projectId);
  const worldName = cleanText(payload.worldName);
  if (!projectId || !worldName || projectId !== expectedProjectId) return null;
  return normalizeWorldName(worldName);
}

export function expectedParentOrigin() {
  return parentOrigin();
}

export function resetRememberedWorldNamesForTests(): void {
  rememberedWorldNames.clear();
}

function normalizeWorldName(value: string) {
  const name = value.trim();
  if (!name) throw new Error('World name is required.');
  if (name.length > MAX_WORLD_NAME_LENGTH) {
    throw new Error(`World name must be ${MAX_WORLD_NAME_LENGTH} characters or fewer.`);
  }
  return name;
}

function cleanText(value: unknown) {
  const cleaned = typeof value === 'string' ? value.trim() : '';
  return cleaned || null;
}

function parentOrigin() {
  try {
    return globalThis.document?.referrer ? new URL(globalThis.document.referrer).origin : '*';
  } catch {
    return '*';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

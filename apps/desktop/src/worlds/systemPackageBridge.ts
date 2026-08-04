import { expectedParentOrigin, readEmbeddedWorldContext } from './worldIdentityBridge';

export const PARCHMENT_LOAD_WORLD_FORGE_SYSTEM_PACKAGE_MESSAGE = 'parchment-worlds:load-world-forge-system-package';
export const WORLD_FORGE_SYSTEM_PACKAGE_RESULT_MESSAGE = 'parchment-worlds:world-forge-system-package-result';
export const WORLD_FORGE_SYSTEM_PACKAGE_SAVED_MESSAGE = 'parchment-worlds:world-forge-system-package-saved';

export type WorldForgeSystemPackageRequest = {
  parentProjectId: string;
  requestId: string;
  targetWorldForgeProjectId: string;
  projectName: string;
  activeBodyId: string;
  fileName: string;
  bytes: ArrayBuffer;
};

export type WorldForgeSystemPackageResult = {
  projectId: string;
  requestId: string;
  status: 'loaded' | 'failed';
  worldForgeProjectId?: string;
  activeBodyId?: string;
  message?: string;
};

export type WorldForgeSystemPackageSaved = {
  projectId: string;
  worldForgeProjectId: string;
  activeBodyId: string;
  fileName: string;
  updatedAt: string;
  bytes: ArrayBuffer;
};

export function parseParchmentSystemPackageMessage(
  value: unknown,
  expectedProjectId: string | null,
): WorldForgeSystemPackageRequest | null {
  if (!expectedProjectId || !isRecord(value) || value.type !== PARCHMENT_LOAD_WORLD_FORGE_SYSTEM_PACKAGE_MESSAGE) return null;
  const payload = value.payload;
  if (!isRecord(payload)) return null;
  const parentProjectId = cleanText(payload.projectId);
  const requestId = cleanText(payload.requestId);
  const targetWorldForgeProjectId = cleanText(payload.targetWorldForgeProjectId);
  const projectName = cleanText(payload.projectName);
  const activeBodyId = cleanText(payload.activeBodyId);
  const fileName = cleanText(payload.fileName);
  if (parentProjectId !== expectedProjectId
    || !requestId
    || !targetWorldForgeProjectId
    || !projectName
    || !activeBodyId
    || !fileName
    || !isArrayBuffer(payload.bytes)) {
    return null;
  }
  return {
    parentProjectId,
    requestId,
    targetWorldForgeProjectId,
    projectName,
    activeBodyId,
    fileName,
    bytes: payload.bytes,
  };
}

export function notifyParchmentSystemPackageResult(
  result: Omit<WorldForgeSystemPackageResult, 'projectId'>,
  options: MessageOptions<WorldForgeSystemPackageResult, typeof WORLD_FORGE_SYSTEM_PACKAGE_RESULT_MESSAGE> = {},
): void {
  postToParchment(WORLD_FORGE_SYSTEM_PACKAGE_RESULT_MESSAGE, result, options);
}

export function notifyParchmentSystemPackageSaved(
  saved: Omit<WorldForgeSystemPackageSaved, 'projectId'>,
  options: MessageOptions<WorldForgeSystemPackageSaved, typeof WORLD_FORGE_SYSTEM_PACKAGE_SAVED_MESSAGE> = {},
): void {
  postToParchment(WORLD_FORGE_SYSTEM_PACKAGE_SAVED_MESSAGE, saved, options, [saved.bytes]);
}

type MessageOptions<TPayload extends { projectId: string }, TType extends string> = {
  search?: string;
  postMessage?: (message: { type: TType; payload: TPayload }, targetOrigin: string, transfer?: Transferable[]) => void;
  targetOrigin?: string;
};

function postToParchment<
  TPayload extends { projectId: string },
  TType extends string,
>(
  type: TType,
  payload: Omit<TPayload, 'projectId'>,
  options: MessageOptions<TPayload, TType>,
  transfer?: Transferable[],
): void {
  const context = readEmbeddedWorldContext(options.search);
  if (!context.embedded || !context.projectId) return;
  const message = {
    type,
    payload: { projectId: context.projectId, ...payload } as TPayload,
  };
  const postMessage = options.postMessage ?? ((value, targetOrigin, values) => {
    if (values?.length) globalThis.parent?.postMessage(value, targetOrigin, values);
    else globalThis.parent?.postMessage(value, targetOrigin);
  });
  postMessage(message, options.targetOrigin ?? expectedParentOrigin(), transfer);
}

function cleanText(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}

function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

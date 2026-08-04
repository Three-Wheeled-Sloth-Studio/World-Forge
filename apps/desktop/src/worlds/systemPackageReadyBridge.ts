import { expectedParentOrigin, readEmbeddedWorldContext } from './worldIdentityBridge';

export const PARCHMENT_REQUEST_WORLD_FORGE_SYSTEM_PACKAGE_READY_MESSAGE =
  'parchment-worlds:request-world-forge-system-package-ready';
export const WORLD_FORGE_SYSTEM_PACKAGE_READY_MESSAGE =
  'parchment-worlds:world-forge-system-package-ready';

export type WorldForgeSystemPackageReadyMessage = {
  type: typeof WORLD_FORGE_SYSTEM_PACKAGE_READY_MESSAGE;
  payload: {
    projectId: string;
  };
};

export function isParchmentSystemPackageReadyRequest(
  value: unknown,
  expectedProjectId: string | null,
): boolean {
  if (!expectedProjectId || !isRecord(value)) return false;
  if (value.type !== PARCHMENT_REQUEST_WORLD_FORGE_SYSTEM_PACKAGE_READY_MESSAGE) return false;
  if (!isRecord(value.payload)) return false;
  return cleanText(value.payload.projectId) === expectedProjectId;
}

export function notifyParchmentSystemPackageReady(
  options: {
    search?: string;
    targetOrigin?: string;
    postMessage?: (message: WorldForgeSystemPackageReadyMessage, targetOrigin: string) => void;
  } = {},
): void {
  const context = readEmbeddedWorldContext(options.search);
  if (!context.embedded || !context.projectId) return;
  const message: WorldForgeSystemPackageReadyMessage = {
    type: WORLD_FORGE_SYSTEM_PACKAGE_READY_MESSAGE,
    payload: { projectId: context.projectId },
  };
  const postMessage = options.postMessage
    ?? ((value: WorldForgeSystemPackageReadyMessage, targetOrigin: string) => globalThis.parent?.postMessage(value, targetOrigin));
  postMessage(message, options.targetOrigin ?? expectedParentOrigin());
}

function cleanText(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

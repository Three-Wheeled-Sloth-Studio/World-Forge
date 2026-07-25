import type { WorldProject } from '@world-forge/shared';

export const WORLD_FORGE_WORLD_SAVED_MESSAGE = 'parchment-worlds:world-forge-world-saved';
const MAX_WORLD_NAME_LENGTH = 120;

export type EmbeddedWorldContext = {
  embedded: boolean;
  projectId: string | null;
  worldName: string | null;
};

export type WorldSavedMessage = {
  type: typeof WORLD_FORGE_WORLD_SAVED_MESSAGE;
  payload: {
    projectId: string;
    worldName: string;
    worldProjectId: string;
    updatedAt: string;
  };
};

let sessionWorldName: string | null = null;

export function readEmbeddedWorldContext(search = globalThis.location?.search ?? ''): EmbeddedWorldContext {
  const params = new URLSearchParams(search);
  const embedded = params.get('embed') === 'shell';
  const projectId = cleanText(params.get('projectId'));
  const worldName = cleanText(params.get('worldName'));
  return { embedded, projectId, worldName };
}

export function prepareWorldProjectForSave(
  project: WorldProject,
  promptForName: (message: string, defaultValue?: string) => string | null = defaultPrompt,
  search = globalThis.location?.search ?? '',
): WorldProject | null {
  const context = readEmbeddedWorldContext(search);
  if (!context.embedded) return project;

  const existingName = sessionWorldName ?? context.worldName;
  if (existingName) return withProjectName(project, existingName);

  const requestedName = promptForName('Name this world before saving:', project.projectName)?.trim();
  if (!requestedName) return null;

  sessionWorldName = requestedName.slice(0, MAX_WORLD_NAME_LENGTH);
  return withProjectName(project, sessionWorldName);
}

export function notifyParchmentWorldSaved(
  project: WorldProject,
  options: {
    search?: string;
    postMessage?: (message: WorldSavedMessage, targetOrigin: string) => void;
    targetOrigin?: string;
  } = {},
): void {
  const context = readEmbeddedWorldContext(options.search);
  if (!context.embedded || !context.projectId) return;

  const message: WorldSavedMessage = {
    type: WORLD_FORGE_WORLD_SAVED_MESSAGE,
    payload: {
      projectId: context.projectId,
      worldName: project.projectName,
      worldProjectId: project.projectId,
      updatedAt: project.updatedAt,
    },
  };

  const postMessage = options.postMessage ?? ((value, targetOrigin) => globalThis.parent?.postMessage(value, targetOrigin));
  postMessage(message, options.targetOrigin ?? parentOrigin());
}

export function resetWorldNameSessionForTests(): void {
  sessionWorldName = null;
}

function withProjectName(project: WorldProject, projectName: string): WorldProject {
  return project.projectName === projectName ? project : { ...project, projectName };
}

function cleanText(value: string | null) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function defaultPrompt(message: string, defaultValue?: string) {
  return globalThis.prompt?.(message, defaultValue) ?? null;
}

function parentOrigin() {
  try {
    return globalThis.document?.referrer ? new URL(globalThis.document.referrer).origin : '*';
  } catch {
    return '*';
  }
}

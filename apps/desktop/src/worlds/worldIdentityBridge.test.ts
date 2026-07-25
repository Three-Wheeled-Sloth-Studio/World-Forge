import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorldProject } from '@world-forge/shared';
import {
  PARCHMENT_SET_WORLD_NAME_MESSAGE,
  WORLD_FORGE_WORLD_IDENTITY_MESSAGE,
  WORLD_FORGE_WORLD_INVENTORY_MESSAGE,
  notifyParchmentWorldIdentity,
  notifyParchmentWorldInventory,
  parseParchmentSetWorldNameMessage,
  prepareWorldProjectForSave,
  readEmbeddedWorldContext,
  rememberWorldName,
  renameWorldProject,
  resetRememberedWorldNamesForTests,
} from './worldIdentityBridge';

const project = {
  projectId: 'world-project-1',
  projectName: 'Generated World 8675309',
  updatedAt: '2026-07-25T01:00:00.000Z',
  primaryWorld: { name: 'Generated World 8675309' },
} as WorldProject;

describe('world identity bridge', () => {
  beforeEach(() => resetRememberedWorldNamesForTests());

  it('reads Parchment embed context without treating the setting name as the world name', () => {
    expect(readEmbeddedWorldContext('?embed=shell&projectId=project_1&projectName=Campaign')).toEqual({
      embedded: true,
      projectId: 'project_1',
      worldName: null,
    });
  });

  it('uses a durable world name supplied by Parchment for an unrenamed generated world', () => {
    const prepared = prepareWorldProjectForSave(
      project,
      '?embed=shell&projectId=project_1&worldName=Ashfall',
    );

    expect(prepared.projectName).toBe('Ashfall');
  });

  it('leaves the current generated name in place when no durable name exists', () => {
    expect(prepareWorldProjectForSave(project, '?embed=shell&projectId=project_1')).toBe(project);
  });

  it('keeps a newer inline rename authoritative over a stale embed URL', () => {
    rememberWorldName(project.projectId, 'Ashfall Reforged');
    const prepared = prepareWorldProjectForSave(
      { ...project, projectName: 'Ashfall Reforged' },
      '?embed=shell&projectId=project_1&worldName=Ashfall',
    );

    expect(prepared.projectName).toBe('Ashfall Reforged');
  });

  it('does not overwrite a loaded custom name from a stale embed URL', () => {
    const loaded = { ...project, projectName: 'The Broken Marches' };
    expect(prepareWorldProjectForSave(
      loaded,
      '?embed=shell&projectId=project_1&worldName=Ashfall',
    )).toBe(loaded);
  });

  it('renames a world project through the shared validation path', () => {
    expect(renameWorldProject(project, '  The Broken Marches  ').projectName).toBe('The Broken Marches');
    expect(() => renameWorldProject(project, '   ')).toThrow('World name is required.');
  });

  it('posts saved identity back to the owning Parchment project', () => {
    const postMessage = vi.fn();
    notifyParchmentWorldIdentity(
      { ...project, projectName: 'Ashfall' },
      'saved',
      {
        search: '?embed=shell&projectId=project_1',
        postMessage,
        targetOrigin: 'https://dev.example.test',
      },
    );

    expect(postMessage).toHaveBeenCalledWith({
      type: WORLD_FORGE_WORLD_IDENTITY_MESSAGE,
      payload: {
        projectId: 'project_1',
        worldName: 'Ashfall',
        worldProjectId: 'world-project-1',
        updatedAt: project.updatedAt,
        operation: 'saved',
      },
    }, 'https://dev.example.test');
  });

  it('posts every saved world to the owning Parchment project', () => {
    const postMessage = vi.fn();
    notifyParchmentWorldInventory([
      { projectId: 'world-1', projectName: 'Ashfall', seed: '101', updatedAt: '2026-07-25T01:00:00.000Z' },
      { projectId: 'world-2', projectName: 'Broken Marches', seed: '202', updatedAt: '2026-07-25T02:00:00.000Z' },
    ], {
      search: '?embed=shell&projectId=project_1',
      postMessage,
      targetOrigin: 'https://dev.example.test',
    });

    expect(postMessage).toHaveBeenCalledWith({
      type: WORLD_FORGE_WORLD_INVENTORY_MESSAGE,
      payload: {
        projectId: 'project_1',
        worlds: [
          { worldProjectId: 'world-1', worldName: 'Ashfall', seed: '101', updatedAt: '2026-07-25T01:00:00.000Z' },
          { worldProjectId: 'world-2', worldName: 'Broken Marches', seed: '202', updatedAt: '2026-07-25T02:00:00.000Z' },
        ],
      },
    }, 'https://dev.example.test');
  });

  it('accepts a parent rename only for the owning project', () => {
    const message = {
      type: PARCHMENT_SET_WORLD_NAME_MESSAGE,
      payload: { projectId: 'project_1', worldName: 'Ashfall Reforged' },
    };

    expect(parseParchmentSetWorldNameMessage(message, 'project_1')).toBe('Ashfall Reforged');
    expect(parseParchmentSetWorldNameMessage(message, 'project_2')).toBeNull();
  });
});

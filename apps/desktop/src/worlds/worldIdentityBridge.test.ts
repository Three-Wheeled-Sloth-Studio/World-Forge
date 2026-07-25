import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorldProject } from '@world-forge/shared';
import {
  WORLD_FORGE_WORLD_SAVED_MESSAGE,
  notifyParchmentWorldSaved,
  prepareWorldProjectForSave,
  readEmbeddedWorldContext,
  resetWorldNameSessionForTests,
} from './worldIdentityBridge';

const project = {
  projectId: 'world-project-1',
  projectName: 'Generated World 8675309',
  updatedAt: '2026-07-25T01:00:00.000Z',
} as WorldProject;

describe('world identity bridge', () => {
  beforeEach(() => resetWorldNameSessionForTests());

  it('reads Parchment embed context without treating the setting name as the world name', () => {
    expect(readEmbeddedWorldContext('?embed=shell&projectId=project_1&projectName=Campaign')).toEqual({
      embedded: true,
      projectId: 'project_1',
      worldName: null,
    });
  });

  it('prompts once on the first embedded save and reuses the selected name', () => {
    const promptForName = vi.fn(() => 'The Broken Marches');
    const search = '?embed=shell&projectId=project_1';

    const first = prepareWorldProjectForSave(project, promptForName, search);
    const second = prepareWorldProjectForSave(project, promptForName, search);

    expect(first?.projectName).toBe('The Broken Marches');
    expect(second?.projectName).toBe('The Broken Marches');
    expect(promptForName).toHaveBeenCalledTimes(1);
  });

  it('cancels the save when the naming prompt is dismissed', () => {
    expect(prepareWorldProjectForSave(project, () => null, '?embed=shell&projectId=project_1')).toBeNull();
  });

  it('uses an existing project world identity without prompting', () => {
    const promptForName = vi.fn(() => 'Unexpected');
    const prepared = prepareWorldProjectForSave(
      project,
      promptForName,
      '?embed=shell&projectId=project_1&worldName=Ashfall',
    );

    expect(prepared?.projectName).toBe('Ashfall');
    expect(promptForName).not.toHaveBeenCalled();
  });

  it('posts the saved name back to the owning Parchment project', () => {
    const postMessage = vi.fn();
    notifyParchmentWorldSaved(
      { ...project, projectName: 'Ashfall' },
      {
        search: '?embed=shell&projectId=project_1',
        postMessage,
        targetOrigin: 'https://dev.example.test',
      },
    );

    expect(postMessage).toHaveBeenCalledWith({
      type: WORLD_FORGE_WORLD_SAVED_MESSAGE,
      payload: {
        projectId: 'project_1',
        worldName: 'Ashfall',
        worldProjectId: 'world-project-1',
        updatedAt: project.updatedAt,
      },
    }, 'https://dev.example.test');
  });
});

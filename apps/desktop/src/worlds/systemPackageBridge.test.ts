import { describe, expect, it, vi } from 'vitest';
import {
  PARCHMENT_LOAD_WORLD_FORGE_SYSTEM_PACKAGE_MESSAGE,
  WORLD_FORGE_SYSTEM_PACKAGE_RESULT_MESSAGE,
  WORLD_FORGE_SYSTEM_PACKAGE_SAVED_MESSAGE,
  notifyParchmentSystemPackageResult,
  notifyParchmentSystemPackageSaved,
  parseParchmentSystemPackageMessage,
} from './systemPackageBridge';

describe('Parchment system package bridge', () => {
  it('accepts a binary system package only for the owning Parchment project', () => {
    const bytes = Uint8Array.from([80, 75, 3, 4]).buffer;
    const message = {
      type: PARCHMENT_LOAD_WORLD_FORGE_SYSTEM_PACKAGE_MESSAGE,
      payload: {
        projectId: 'project_1',
        requestId: 'request-1',
        targetWorldForgeProjectId: 'pworld-project_1',
        projectName: 'Sol System',
        activeBodyId: 'earth',
        fileName: 'sol-system.wforge',
        bytes,
      },
    };

    expect(parseParchmentSystemPackageMessage(message, 'project_1')).toEqual({
      parentProjectId: 'project_1',
      requestId: 'request-1',
      targetWorldForgeProjectId: 'pworld-project_1',
      projectName: 'Sol System',
      activeBodyId: 'earth',
      fileName: 'sol-system.wforge',
      bytes,
    });
    expect(parseParchmentSystemPackageMessage(message, 'project_2')).toBeNull();
  });

  it('rejects package messages without transferred bytes', () => {
    expect(parseParchmentSystemPackageMessage({
      type: PARCHMENT_LOAD_WORLD_FORGE_SYSTEM_PACKAGE_MESSAGE,
      payload: {
        projectId: 'project_1',
        requestId: 'request-1',
        targetWorldForgeProjectId: 'pworld-project_1',
        projectName: 'Sol System',
        activeBodyId: 'earth',
        fileName: 'sol-system.wforge',
        bytes: 'not-binary',
      },
    }, 'project_1')).toBeNull();
  });

  it('reports package load results to the owning shell', () => {
    const postMessage = vi.fn();
    notifyParchmentSystemPackageResult({
      requestId: 'request-1',
      status: 'loaded',
      worldForgeProjectId: 'pworld-project_1',
      activeBodyId: 'earth',
    }, {
      search: '?embed=shell&projectId=project_1',
      targetOrigin: 'https://dev.example.test',
      postMessage,
    });

    expect(postMessage).toHaveBeenCalledWith({
      type: WORLD_FORGE_SYSTEM_PACKAGE_RESULT_MESSAGE,
      payload: {
        projectId: 'project_1',
        requestId: 'request-1',
        status: 'loaded',
        worldForgeProjectId: 'pworld-project_1',
        activeBodyId: 'earth',
      },
    }, 'https://dev.example.test');
  });

  it('returns the edited whole-system package with transferable bytes', () => {
    const postMessage = vi.fn();
    const bytes = Uint8Array.from([80, 75, 3, 4, 9, 8, 7]).buffer;
    notifyParchmentSystemPackageSaved({
      worldForgeProjectId: 'pworld-project_1',
      activeBodyId: 'mars',
      fileName: 'sol-system.wforge',
      updatedAt: '2026-08-04T12:00:00.000Z',
      bytes,
    }, {
      search: '?embed=shell&projectId=project_1',
      targetOrigin: 'https://dev.example.test',
      postMessage,
    });

    expect(postMessage).toHaveBeenCalledWith({
      type: WORLD_FORGE_SYSTEM_PACKAGE_SAVED_MESSAGE,
      payload: {
        projectId: 'project_1',
        worldForgeProjectId: 'pworld-project_1',
        activeBodyId: 'mars',
        fileName: 'sol-system.wforge',
        updatedAt: '2026-08-04T12:00:00.000Z',
        bytes,
      },
    }, 'https://dev.example.test', [bytes]);
  });
});

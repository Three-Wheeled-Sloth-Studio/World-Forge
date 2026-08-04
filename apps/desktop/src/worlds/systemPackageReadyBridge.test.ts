import { describe, expect, it, vi } from 'vitest';
import {
  PARCHMENT_REQUEST_WORLD_FORGE_SYSTEM_PACKAGE_READY_MESSAGE,
  WORLD_FORGE_SYSTEM_PACKAGE_READY_MESSAGE,
  isParchmentSystemPackageReadyRequest,
  notifyParchmentSystemPackageReady,
} from './systemPackageReadyBridge';

describe('embedded system package readiness handshake', () => {
  it('accepts readiness requests only for the owning Parchment project', () => {
    const request = {
      type: PARCHMENT_REQUEST_WORLD_FORGE_SYSTEM_PACKAGE_READY_MESSAGE,
      payload: { projectId: 'project-1' },
    };

    expect(isParchmentSystemPackageReadyRequest(request, 'project-1')).toBe(true);
    expect(isParchmentSystemPackageReadyRequest(request, 'project-2')).toBe(false);
    expect(isParchmentSystemPackageReadyRequest(request, null)).toBe(false);
  });

  it('announces readiness only from an embedded World Forge runtime', () => {
    const postMessage = vi.fn();
    notifyParchmentSystemPackageReady({
      search: '?embed=shell&projectId=project-1',
      targetOrigin: 'https://parchment.example.test',
      postMessage,
    });

    expect(postMessage).toHaveBeenCalledWith({
      type: WORLD_FORGE_SYSTEM_PACKAGE_READY_MESSAGE,
      payload: { projectId: 'project-1' },
    }, 'https://parchment.example.test');

    const standalonePostMessage = vi.fn();
    notifyParchmentSystemPackageReady({
      search: '?projectId=project-1',
      postMessage: standalonePostMessage,
    });
    expect(standalonePostMessage).not.toHaveBeenCalled();
  });
});

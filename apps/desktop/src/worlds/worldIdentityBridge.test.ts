import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorldProject } from '@world-forge/shared';
import {
  PARCHMENT_REPLAY_WORLD_MESSAGE,
  PARCHMENT_REQUEST_WORLD_INVENTORY_MESSAGE,
  PARCHMENT_SET_WORLD_NAME_MESSAGE,
  WORLD_FORGE_WORLD_IDENTITY_MESSAGE,
  WORLD_FORGE_WORLD_INVENTORY_MESSAGE,
  isParchmentWorldInventoryRequest,
  notifyParchmentWorldIdentity,
  notifyParchmentWorldInventory,
  parseParchmentReplayWorldMessage,
  parseParchmentSetWorldNameMessage,
  prepareWorldProjectForSave,
  readEmbeddedWorldContext,
  rememberWorldName,
  renameWorldProject,
  resetRememberedWorldNamesForTests,
} from './worldIdentityBridge';
import { buildWorldReplayManifest, CURRENT_WORLD_FORGE_GENERATOR_VERSION } from './worldReplayManifest';

function project(): WorldProject {
  return {
    projectId: 'world-project-1',
    projectName: 'Generated World 8675309',
    createdAt: '2026-07-25T01:00:00.000Z',
    updatedAt: '2026-07-25T02:00:00.000Z',
    appVersion: '0.3.14',
    sourceCommit: 'abc123',
    generatorVersion: CURRENT_WORLD_FORGE_GENERATOR_VERSION,
    seed: '8675309',
    config: {
      seed: '8675309',
      parameterRanges: {} as WorldProject['config']['parameterRanges'],
      selectedValues: { oceanTolerancePercentagePoints: 5 },
      generationProfile: 'earthlike-mvp',
      outputResolution: { width: 2, height: 1 },
      projection: 'equirectangular',
      wrapMode: 'east-west',
    },
    selectedValues: {
      systemAgeGy: 4.5, oceanPercentage: 65, averageTemperatureC: 16, aridity: 0.5,
      seaLevel: 0, axialTiltDeg: 23, orbitalEccentricity: 0.02, sizeClass: 1,
      moonCount: 1, impactFrequency: 1, plateCount: 20, riverDensity: 1.6,
      continentCount: 5, continentScale: 0.55, islandDensity: 0.4,
      oceanTolerancePercentagePoints: 5,
    },
    solarSystem: { star: {}, bodies: [] } as unknown as WorldProject['solarSystem'],
    primaryWorld: {
      id: 'primary-world',
      name: 'Generated World 8675309',
      layers: { elevation: new Float32Array([0.25, 0.75]) },
      topologyLayers: { elevation: new Float32Array([0.1, 0.9]) },
      plates: [],
      rivers: [],
    } as unknown as WorldProject['primaryWorld'],
    metrics: { oceanPercentage: 65, validation: { oceanWithinTolerance: true, riverPathsValid: true } } as WorldProject['metrics'],
    exports: { packageExtension: '.wforge', supportedFormats: ['png', 'svg', 'json', 'wforge'] },
  };
}

describe('world identity bridge', () => {
  beforeEach(() => resetRememberedWorldNamesForTests());

  it('reads Parchment embed context without treating the setting name as the world name', () => {
    expect(readEmbeddedWorldContext('?embed=shell&projectId=project_1&projectName=Campaign')).toEqual({
      embedded: true,
      projectId: 'project_1',
      worldProjectId: null,
      worldName: null,
    });
  });

  it('reads the linked World Forge project selected by Parchment', () => {
    expect(readEmbeddedWorldContext(
      '?embed=shell&projectId=project_1&worldProjectId=world-project-1&worldName=Ashfall',
    )).toEqual({
      embedded: true,
      projectId: 'project_1',
      worldProjectId: 'world-project-1',
      worldName: 'Ashfall',
    });
  });

  it('uses a durable world name supplied by Parchment for an unrenamed generated world', () => {
    const source = project();
    expect(prepareWorldProjectForSave(source, '?embed=shell&projectId=project_1&worldName=Ashfall').projectName).toBe('Ashfall');
  });

  it('keeps a newer inline rename authoritative over a stale embed URL', () => {
    const source = project();
    rememberWorldName(source.projectId, 'Ashfall Reforged');
    expect(prepareWorldProjectForSave(
      { ...source, projectName: 'Ashfall Reforged' },
      '?embed=shell&projectId=project_1&worldName=Ashfall',
    ).projectName).toBe('Ashfall Reforged');
  });

  it('renames a world project through the shared validation path', () => {
    expect(renameWorldProject(project(), '  The Broken Marches  ').projectName).toBe('The Broken Marches');
    expect(() => renameWorldProject(project(), '   ')).toThrow('World name is required.');
  });

  it('posts saved identity and replay manifest back to the owning Parchment project', () => {
    const postMessage = vi.fn();
    notifyParchmentWorldIdentity(
      { ...project(), projectName: 'Ashfall' },
      'saved',
      { search: '?embed=shell&projectId=project_1', postMessage, targetOrigin: 'https://dev.example.test' },
    );

    expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: WORLD_FORGE_WORLD_IDENTITY_MESSAGE,
      payload: expect.objectContaining({
        projectId: 'project_1',
        worldName: 'Ashfall',
        worldProjectId: 'world-project-1',
        operation: 'saved',
        replayCompatibility: 'ready',
        replayManifest: expect.objectContaining({ format: 'world-forge-replay', formatVersion: 1 }),
      }),
    }), 'https://dev.example.test');
  });

  it('posts replay state for every saved world', () => {
    const source = project();
    const replayManifest = buildWorldReplayManifest(source);
    const postMessage = vi.fn();
    notifyParchmentWorldInventory([
      { projectId: 'world-1', projectName: 'Ashfall', seed: '101', updatedAt: source.updatedAt, replayManifest },
      { projectId: 'world-2', projectName: 'Broken Marches', seed: '202', updatedAt: source.updatedAt },
    ], { search: '?embed=shell&projectId=project_1', postMessage, targetOrigin: 'https://dev.example.test' });

    expect(postMessage).toHaveBeenCalledWith({
      type: WORLD_FORGE_WORLD_INVENTORY_MESSAGE,
      payload: {
        projectId: 'project_1',
        worlds: [
          expect.objectContaining({ worldProjectId: 'world-1', replayCompatibility: 'ready', replayManifest }),
          expect.objectContaining({ worldProjectId: 'world-2', replayCompatibility: 'not-recorded' }),
        ],
      },
    }, 'https://dev.example.test');
  });

  it('accepts inventory and replay requests only for the owning project', () => {
    expect(isParchmentWorldInventoryRequest({
      type: PARCHMENT_REQUEST_WORLD_INVENTORY_MESSAGE,
      payload: { projectId: 'project_1' },
    }, 'project_1')).toBe(true);

    const replayManifest = buildWorldReplayManifest(project());
    const replay = {
      type: PARCHMENT_REPLAY_WORLD_MESSAGE,
      payload: { projectId: 'project_1', requestId: 'request-1', manifest },
    };
    expect(parseParchmentReplayWorldMessage(replay, 'project_1')).toEqual({
      parentProjectId: 'project_1',
      requestId: 'request-1',
      manifest,
    });
    expect(parseParchmentReplayWorldMessage(replay, 'project_2')).toBeNull();
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

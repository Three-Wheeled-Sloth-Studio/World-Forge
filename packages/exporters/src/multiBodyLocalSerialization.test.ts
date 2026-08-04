import { describe, expect, it } from 'vitest';
import { createDefaultConfig, generateProject } from '@world-forge/generator-core';
import { WORLD_BODY_DETAIL_SCHEMA } from '@world-forge/shared/worldBodyDetails';
import {
  readWorldBodyCatalog,
  withWorldBodyDetail,
  type MultiBodyWorldProject,
} from '@world-forge/shared/worldBodies';
import { deserializeMultiBodyProject, serializeMultiBodyProject } from './multiBodyWforge';

describe('multi-body local serialization', () => {
  it('preserves compact body asset payloads through IndexedDB-style structured cloning', () => {
    const generated = generateProject(createDefaultConfig('local-body-assets', { width: 64, height: 32 }));
    const catalog = readWorldBodyCatalog(generated);
    const targetBody = catalog.bodies.find((body) => body.bodyId !== catalog.primaryBodyId)!;
    const assetId = `${targetBody.bodyId}-albedo`;
    const detailed = withWorldBodyDetail(generated, targetBody.bodyId, {
      schema: WORLD_BODY_DETAIL_SCHEMA,
      kind: 'raster-surface',
      tier: 'reference-surface',
      origin: 'imported',
      shape: { kind: 'sphere' },
      projection: 'equirectangular',
      resolution: { width: 2, height: 1 },
      layerRoles: ['albedo'],
      assets: [{
        assetId,
        role: 'albedo',
        logicalPath: `bodies/${targetBody.bodyId}/albedo.webp`,
        mediaType: 'image/webp',
      }],
    });
    const sourcePayload = Uint8Array.from([82, 73, 70, 70, 1, 2, 3, 4]);
    const project: MultiBodyWorldProject = {
      ...detailed,
      bodyAssetPayloads: { [assetId]: sourcePayload },
    };

    const serialized = serializeMultiBodyProject(project, { includeLayerData: false });
    const stored = structuredClone(serialized);
    sourcePayload[0] = 0;

    const loaded = deserializeMultiBodyProject(stored) as MultiBodyWorldProject;
    expect(loaded.bodyAssetPayloads?.[assetId]).toEqual(Uint8Array.from([82, 73, 70, 70, 1, 2, 3, 4]));
    expect(loaded.bodyAssetPayloads?.[assetId]).not.toBe(project.bodyAssetPayloads?.[assetId]);
    expect(readWorldBodyCatalog(loaded).bodies
      .find((body) => body.bodyId === targetBody.bodyId)
      ?.detail?.assets?.[0].assetId).toBe(assetId);
  });

  it('accepts numeric byte arrays from older or JSON-mediated local records', () => {
    const generated = generateProject(createDefaultConfig('legacy-local-body-assets', { width: 64, height: 32 }));
    const serialized = serializeMultiBodyProject(generated, { includeLayerData: false }) as unknown as Record<string, unknown>;
    serialized.bodyAssetPayloads = { legacy: [1, 2, 3, 255] };

    const loaded = deserializeMultiBodyProject(serialized) as MultiBodyWorldProject;
    expect(loaded.bodyAssetPayloads?.legacy).toEqual(Uint8Array.from([1, 2, 3, 255]));
  });
});

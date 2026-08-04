import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { createDefaultConfig, generateProject } from '@world-forge/generator-core';
import { WORLD_BODY_DETAIL_SCHEMA } from '@world-forge/shared/worldBodyDetails';
import {
  projectForWorldBody,
  readWorldBodyCatalog,
  withWorldBodyDetail,
  withWorldBodySurface,
  type MultiBodyWorldProject,
} from '@world-forge/shared/worldBodies';
import { exportMultiBodyWforge, importMultiBodyWforge, MULTI_BODY_WFORGE_EXTENSION } from './multiBodyWforge';

describe('multi-body .wforge packages', () => {
  it('roundtrips secondary body surfaces and preserves the durable primary while another body is active', async () => {
    const generated = generateProject(createDefaultConfig('sol-earth-reference', { width: 64, height: 32 }));
    const marsSurface = structuredClone(generated.primaryWorld);
    marsSurface.id = 'mars-surface';
    marsSurface.name = 'Mars';
    marsSurface.oceanPercentage = 0;
    marsSurface.layers.water.fill(0);
    marsSurface.topologyLayers.water.fill(0);

    const project = withWorldBodySurface(generated, {
      bodyId: 'mars',
      name: 'Mars',
      bodyType: 'rocky',
      capabilities: { globe: true, map: true, explorer: true, irregularShape: false },
      dataOrigin: 'imported',
      detail: {
        schema: WORLD_BODY_DETAIL_SCHEMA,
        kind: 'geographic-surface',
        tier: 'geographic',
        origin: 'imported',
        shape: { kind: 'sphere' },
        surfaceContract: 'PrimaryWorld',
      },
      surface: marsSurface,
    });

    const blob = await exportMultiBodyWforge(project);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'));
    expect(manifest.extensions.multiBody.schema).toBe(MULTI_BODY_WFORGE_EXTENSION);
    expect(manifest.extensions.multiBody.surfacedBodyCount).toBe(2);
    expect(zip.file('system/body-catalog.json')).not.toBeNull();

    const loaded = await importMultiBodyWforge(new File([blob], 'sol-reference.wforge'));
    const loadedCatalog = readWorldBodyCatalog(loaded);
    const loadedMars = projectForWorldBody(loaded, 'mars');
    const loadedMarsRecord = loadedCatalog.bodies.find((body) => body.bodyId === 'mars');
    expect(loaded.projectId).toBe(generated.projectId);
    expect(loadedCatalog.bodies.find((body) => body.bodyId === loadedCatalog.primaryBodyId)?.surface?.id)
      .toBe(generated.primaryWorld.id);
    expect(loadedMars?.primaryWorld.name).toBe('Mars');
    expect(loadedMars?.primaryWorld.layers.elevation).toEqual(marsSurface.layers.elevation);
    expect(loadedMarsRecord?.dataOrigin).toBe('imported');
    expect(loadedMarsRecord?.detail?.kind).toBe('geographic-surface');
    expect(loadedMarsRecord?.detail?.tier).toBe('geographic');

    const savedWhileMarsActive = await exportMultiBodyWforge(loadedMars!);
    const reopened = await importMultiBodyWforge(new File([savedWhileMarsActive], 'mars-active.wforge'));
    const reopenedCatalog = readWorldBodyCatalog(reopened);
    expect(reopened.primaryWorld.id).toBe(generated.primaryWorld.id);
    expect(reopenedCatalog.activeBodyId).toBe('mars');
    expect(reopenedCatalog.bodies.find((body) => body.bodyId === reopenedCatalog.primaryBodyId)?.surface?.id)
      .toBe(generated.primaryWorld.id);
    expect(projectForWorldBody(reopened, 'mars')?.primaryWorld.id).toBe(marsSurface.id);
  });

  it('packages checksum-protected body assets and preserves them through import and re-export', async () => {
    const generated = generateProject(createDefaultConfig('body-assets', { width: 64, height: 32 }));
    const catalog = readWorldBodyCatalog(generated);
    const targetBody = catalog.bodies.find((body) => body.bodyId !== catalog.primaryBodyId)!;
    const assetId = `${targetBody.bodyId}-albedo`;
    const logicalPath = `bodies/${targetBody.bodyId}/albedo.webp`;
    const payload = Uint8Array.from([82, 73, 70, 70, 4, 3, 2, 1]);
    const detailed = withWorldBodyDetail(generated, targetBody.bodyId, {
      schema: WORLD_BODY_DETAIL_SCHEMA,
      kind: 'raster-surface',
      tier: 'reference-surface',
      origin: 'imported',
      shape: { kind: 'sphere' },
      projection: 'equirectangular',
      resolution: { width: 2, height: 1 },
      layerRoles: ['albedo'],
      assets: [{ assetId, role: 'albedo', logicalPath, mediaType: 'image/webp' }],
    });
    const project: MultiBodyWorldProject = {
      ...detailed,
      bodyAssetPayloads: { [assetId]: payload },
    };

    const blob = await exportMultiBodyWforge(project);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'));
    const packagedCatalog = JSON.parse(await zip.file('system/body-catalog.json')!.async('string'));
    const packagedAsset = packagedCatalog.bodies
      .find((body: { bodyId: string }) => body.bodyId === targetBody.bodyId)
      .detail.assets[0];

    expect(await zip.file(logicalPath)!.async('uint8array')).toEqual(payload);
    expect(packagedAsset.byteLength).toBe(payload.byteLength);
    expect(packagedAsset.sha256).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(manifest.extensions.multiBody.bodyAssetCount).toBe(1);
    expect(manifest.extensions.multiBody.bodyAssetBytes).toBe(payload.byteLength);

    const loaded = await importMultiBodyWforge(new File([blob], 'body-assets.wforge')) as MultiBodyWorldProject;
    expect(loaded.bodyAssetPayloads?.[assetId]).toEqual(payload);
    expect(readWorldBodyCatalog(loaded).bodies
      .find((body) => body.bodyId === targetBody.bodyId)
      ?.detail?.assets?.[0].sha256).toBe(packagedAsset.sha256);

    const reexported = await exportMultiBodyWforge(loaded);
    const reexportedZip = await JSZip.loadAsync(await reexported.arrayBuffer());
    expect(await reexportedZip.file(logicalPath)!.async('uint8array')).toEqual(payload);
  });

  it('rejects missing required body assets while allowing declared optional omissions', async () => {
    const generated = generateProject(createDefaultConfig('missing-body-assets', { width: 64, height: 32 }));
    const catalog = readWorldBodyCatalog(generated);
    const targetBody = catalog.bodies.find((body) => body.bodyId !== catalog.primaryBodyId)!;
    const requiredAssetId = `${targetBody.bodyId}-required`;
    const required = withWorldBodyDetail(generated, targetBody.bodyId, {
      schema: WORLD_BODY_DETAIL_SCHEMA,
      kind: 'raster-surface',
      tier: 'reference-surface',
      origin: 'imported',
      shape: { kind: 'sphere' },
      projection: 'equirectangular',
      resolution: { width: 2, height: 1 },
      layerRoles: ['albedo'],
      assets: [{
        assetId: requiredAssetId,
        role: 'albedo',
        logicalPath: `bodies/${targetBody.bodyId}/required.webp`,
        mediaType: 'image/webp',
      }],
    });

    await expect(exportMultiBodyWforge(required)).rejects.toThrow(`required body asset "${requiredAssetId}"`);

    const optional = withWorldBodyDetail(generated, targetBody.bodyId, {
      schema: WORLD_BODY_DETAIL_SCHEMA,
      kind: 'raster-surface',
      tier: 'reference-surface',
      origin: 'imported',
      shape: { kind: 'sphere' },
      projection: 'equirectangular',
      resolution: { width: 2, height: 1 },
      layerRoles: ['albedo'],
      assets: [{
        assetId: `${targetBody.bodyId}-optional`,
        role: 'albedo',
        logicalPath: `bodies/${targetBody.bodyId}/optional.webp`,
        mediaType: 'image/webp',
        optional: true,
      }],
    });
    const optionalBlob = await exportMultiBodyWforge(optional);
    const optionalZip = await JSZip.loadAsync(await optionalBlob.arrayBuffer());
    const optionalManifest = JSON.parse(await optionalZip.file('manifest.json')!.async('string'));
    expect(optionalManifest.extensions.multiBody.bodyAssetCount).toBe(0);
    expect(optionalManifest.extensions.multiBody.missingOptionalBodyAssetCount).toBe(1);
    await expect(importMultiBodyWforge(new File([optionalBlob], 'optional-assets.wforge'))).resolves.toBeTruthy();
  });

  it('rejects body asset bytes that do not match the packaged checksum', async () => {
    const generated = generateProject(createDefaultConfig('tampered-body-asset', { width: 64, height: 32 }));
    const catalog = readWorldBodyCatalog(generated);
    const targetBody = catalog.bodies.find((body) => body.bodyId !== catalog.primaryBodyId)!;
    const assetId = `${targetBody.bodyId}-mesh`;
    const logicalPath = `bodies/${targetBody.bodyId}/shape.glb`;
    const detailed = withWorldBodyDetail(generated, targetBody.bodyId, {
      schema: WORLD_BODY_DETAIL_SCHEMA,
      kind: 'irregular-mesh',
      tier: 'reference-surface',
      origin: 'imported',
      shape: { kind: 'irregular-mesh' },
      assets: [{ assetId, role: 'mesh', logicalPath, mediaType: 'model/gltf-binary' }],
    });
    const project: MultiBodyWorldProject = {
      ...detailed,
      bodyAssetPayloads: { [assetId]: Uint8Array.from([1, 2, 3, 4]) },
    };
    const blob = await exportMultiBodyWforge(project);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    zip.file(logicalPath, Uint8Array.from([4, 3, 2, 1]));
    const tampered = await zip.generateAsync({ type: 'blob' });

    await expect(importMultiBodyWforge(new File([tampered], 'tampered.wforge')))
      .rejects.toThrow(`checksum mismatch for body asset "${assetId}"`);
  });

  it('keeps legacy single-world packages compatible through the base importer', async () => {
    const generated = generateProject(createDefaultConfig('legacy-package', { width: 64, height: 32 }));
    const blob = await exportMultiBodyWforge(generated);
    const loaded = await importMultiBodyWforge(new File([blob], 'legacy-package.wforge'));
    expect(projectForWorldBody(loaded, loaded.solarSystem.primaryWorldId)?.primaryWorld.id).toBe(generated.primaryWorld.id);
    expect(readWorldBodyCatalog(loaded).bodies.find((body) => body.bodyId === loaded.solarSystem.primaryWorldId)?.detail?.tier).toBe('geographic');
  });
});

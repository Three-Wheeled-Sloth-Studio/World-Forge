import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { createDefaultConfig, generateProject } from '@world-forge/generator-core';
import { projectForWorldBody, readWorldBodyCatalog, withWorldBodySurface } from '@world-forge/shared/worldBodies';
import { exportMultiBodyWforge, importMultiBodyWforge, MULTI_BODY_WFORGE_EXTENSION } from './multiBodyWforge';

describe('multi-body .wforge packages', () => {
  it('roundtrips secondary body surfaces inside one system project', async () => {
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
      surface: marsSurface,
    });

    const blob = await exportMultiBodyWforge(project);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'));
    expect(manifest.extensions.multiBody.schema).toBe(MULTI_BODY_WFORGE_EXTENSION);
    expect(manifest.extensions.multiBody.surfacedBodyCount).toBe(2);
    expect(zip.file('system/body-catalog.json')).not.toBeNull();

    const loaded = await importMultiBodyWforge(new File([blob], 'sol-reference.wforge'));
    const loadedMars = projectForWorldBody(loaded, 'mars');
    expect(loaded.projectId).toBe(generated.projectId);
    expect(loadedMars?.primaryWorld.name).toBe('Mars');
    expect(loadedMars?.primaryWorld.layers.elevation).toEqual(marsSurface.layers.elevation);
    expect(readWorldBodyCatalog(loaded).bodies.find((body) => body.bodyId === 'mars')?.dataOrigin).toBe('imported');
  });

  it('keeps legacy single-world packages compatible through the base importer', async () => {
    const generated = generateProject(createDefaultConfig('legacy-package', { width: 64, height: 32 }));
    const blob = await exportMultiBodyWforge(generated);
    const loaded = await importMultiBodyWforge(new File([blob], 'legacy-package.wforge'));
    expect(projectForWorldBody(loaded, loaded.solarSystem.primaryWorldId)?.primaryWorld.id).toBe(generated.primaryWorld.id);
  });
});

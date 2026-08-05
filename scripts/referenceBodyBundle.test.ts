import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  REFERENCE_BODY_BUNDLE_SCHEMA,
  isReferenceBodyBundleManifest,
  loadReferenceBodyBundle,
  type ReferenceBodyBundleManifestV1,
} from './referenceBodyBundle';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('reference body bundles', () => {
  it('loads a checksum-protected source-backed raster surface', async () => {
    const directory = await temporaryDirectory();
    const albedo = Uint8Array.from([0x00, 0xf8, 0xe0, 0x07]);
    const elevation = Uint8Array.from([0x18, 0xfc, 0xd0, 0x07]);
    await writeFile(path.join(directory, 'albedo.rgb565'), albedo);
    await writeFile(path.join(directory, 'elevation.i16'), elevation);
    const manifest = validManifest(albedo, elevation);
    await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(manifest));

    const loaded = await loadReferenceBodyBundle(directory);

    expect(loaded.manifest.bodyId).toBe('mars');
    expect(loaded.detail.kind).toBe('raster-surface');
    expect(loaded.detail.layerRoles).toEqual(['albedo', 'elevation']);
    expect(loaded.detail.assets?.[1].numericRaster?.datum).toBe('MOLA areoid');
    expect([...loaded.payloads['mars-albedo']]).toEqual([...albedo]);
    expect([...loaded.payloads['mars-elevation']]).toEqual([...elevation]);
  });

  it('rejects payload tampering and paths outside the prepared bundle', async () => {
    const directory = await temporaryDirectory();
    const albedo = Uint8Array.from([0x00, 0xf8, 0xe0, 0x07]);
    const elevation = Uint8Array.from([0x18, 0xfc, 0xd0, 0x07]);
    await writeFile(path.join(directory, 'albedo.rgb565'), albedo);
    await writeFile(path.join(directory, 'elevation.i16'), Uint8Array.from([0, 0, 0, 0]));
    await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(validManifest(albedo, elevation)));

    await expect(loadReferenceBodyBundle(directory)).rejects.toThrow('checksum');

    const unsafe = validManifest(albedo, elevation);
    unsafe.assets[0].file = '../albedo.rgb565';
    expect(isReferenceBodyBundleManifest(unsafe)).toBe(false);
  });

  it('requires one shared prepared resolution and valid numeric semantics', () => {
    const albedo = Uint8Array.from([0x00, 0xf8, 0xe0, 0x07]);
    const elevation = Uint8Array.from([0x18, 0xfc, 0xd0, 0x07]);
    const mismatched = validManifest(albedo, elevation);
    mismatched.assets[1].resolution = { width: 4, height: 1 };
    expect(isReferenceBodyBundleManifest(mismatched)).toBe(false);

    const missingByteOrder = validManifest(albedo, elevation);
    missingByteOrder.assets[1].numericRaster = {
      ...missingByteOrder.assets[1].numericRaster!,
      byteOrder: undefined,
    };
    expect(isReferenceBodyBundleManifest(missingByteOrder)).toBe(false);
  });
});

function validManifest(albedo: Uint8Array, elevation: Uint8Array): ReferenceBodyBundleManifestV1 {
  return {
    schema: REFERENCE_BODY_BUNDLE_SCHEMA,
    bodyId: 'mars',
    name: 'Mars',
    detailKind: 'raster-surface',
    shape: { kind: 'sphere' },
    projection: 'equirectangular',
    resolution: { width: 2, height: 1 },
    sources: [{
      sourceId: 'mars-viking-mdim21',
      title: 'Mars Viking Colorized Global Mosaic 232m',
      publisher: 'USGS Astrogeology Science Center / NASA Ames',
      url: 'https://example.test/mars-viking.tif',
      license: 'Public domain',
      role: 'surface-appearance',
    }, {
      sourceId: 'mars-mgs-mola-dem',
      title: 'Mars MGS MOLA DEM 463m',
      publisher: 'MOLA Team / NASA GSFC / USGS Astrogeology',
      url: 'https://example.test/mars-mola.tif',
      license: 'CC0 / public domain',
      role: 'elevation',
    }],
    assets: [{
      assetId: 'mars-albedo',
      role: 'albedo',
      file: 'albedo.rgb565',
      logicalPath: 'bodies/mars/albedo.rgb565',
      mediaType: 'application/vnd.world-forge.rgb565',
      encoding: 'rgb565-le',
      resolution: { width: 2, height: 1 },
      byteLength: albedo.byteLength,
      sha256: digest(albedo),
      origin: 'imported',
    }, {
      assetId: 'mars-elevation',
      role: 'elevation',
      file: 'elevation.i16',
      logicalPath: 'bodies/mars/elevation.i16',
      mediaType: 'application/vnd.world-forge.numeric-raster',
      encoding: 'int16-le',
      resolution: { width: 2, height: 1 },
      numericRaster: {
        dataType: 'int16',
        byteOrder: 'little-endian',
        units: 'm',
        scale: 1,
        offset: 0,
        datum: 'MOLA areoid',
        sourceRange: { min: -1000, max: 2000 },
        preparedRange: { min: -1000, max: 2000 },
        interpretation: 'absolute-elevation',
      },
      byteLength: elevation.byteLength,
      sha256: digest(elevation),
      origin: 'imported',
    }],
  };
}

function digest(bytes: Uint8Array): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), 'world-forge-reference-body-'));
  temporaryDirectories.push(directory);
  return directory;
}

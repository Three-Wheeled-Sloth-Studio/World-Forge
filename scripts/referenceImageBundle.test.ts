import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  loadReferenceImageBundle,
  readJpegResolution,
  REFERENCE_IMAGE_BUNDLE_SCHEMA,
} from './referenceImageBundle';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('reference image bundles', () => {
  it('reads JPEG dimensions from a start-of-frame marker', () => {
    const jpeg = Uint8Array.from([
      0xff, 0xd8,
      0xff, 0xc0,
      0x00, 0x11,
      0x08,
      0x07, 0x08,
      0x0e, 0x10,
      0x03,
      0x01, 0x11, 0x00,
      0x02, 0x11, 0x00,
      0x03, 0x11, 0x00,
      0xff, 0xd9,
    ]);

    expect(readJpegResolution(jpeg)).toEqual({ width: 3600, height: 1800 });
  });

  it('loads a checksum-protected RGB565 bundle with exact dimensions', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'world-forge-reference-image-'));
    temporaryDirectories.push(directory);
    const bytes = Uint8Array.from([0x00, 0xf8, 0x1f, 0x00]);
    const sha256 = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
    await writeFile(path.join(directory, 'jupiter.rgb565'), bytes);
    await writeFile(path.join(directory, 'manifest.json'), JSON.stringify({
      schema: REFERENCE_IMAGE_BUNDLE_SCHEMA,
      bodyId: 'jupiter',
      sourceId: 'PIA07782',
      sourcePage: 'https://science.nasa.gov/example',
      sourceAsset: 'https://assets.science.nasa.gov/example.jpg',
      credit: 'NASA/JPL/Space Science Institute',
      file: 'jupiter.rgb565',
      mediaType: 'application/vnd.world-forge.rgb565',
      encoding: 'rgb565-le',
      projection: 'equirectangular',
      resolution: { width: 2, height: 1 },
      byteLength: bytes.byteLength,
      sha256,
    }));

    const bundle = await loadReferenceImageBundle(directory);
    expect(bundle.bytes).toEqual(bytes);
    expect(bundle.encoding).toBe('rgb565-le');
    expect(bundle.resolution).toEqual({ width: 2, height: 1 });
  });

  it('rejects an RGB565 payload whose checksum or dimensions do not match', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'world-forge-reference-image-invalid-'));
    temporaryDirectories.push(directory);
    const bytes = Uint8Array.from([0x00, 0xf8, 0x1f, 0x00]);
    await writeFile(path.join(directory, 'jupiter.rgb565'), bytes);
    await writeFile(path.join(directory, 'manifest.json'), JSON.stringify({
      schema: REFERENCE_IMAGE_BUNDLE_SCHEMA,
      bodyId: 'jupiter',
      sourceId: 'PIA07782',
      sourcePage: 'https://science.nasa.gov/example',
      sourceAsset: 'https://assets.science.nasa.gov/example.jpg',
      credit: 'NASA/JPL/Space Science Institute',
      file: 'jupiter.rgb565',
      mediaType: 'application/vnd.world-forge.rgb565',
      encoding: 'rgb565-le',
      projection: 'equirectangular',
      resolution: { width: 4, height: 1 },
      byteLength: bytes.byteLength,
      sha256: `sha256:${'0'.repeat(64)}`,
    }));

    await expect(loadReferenceImageBundle(directory)).rejects.toThrow('expected 8 bytes');
  });
});

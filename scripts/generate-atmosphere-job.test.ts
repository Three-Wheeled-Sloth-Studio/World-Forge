import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createDefaultConfig, generateProject } from '../packages/generator-core/src/index';
import { exportWforge } from '../packages/exporters/src/index';
import { ATMOSPHERE_JOB_SCHEMA, generateAtmosphereJob, validateAtmosphereJobRequest } from './generate-atmosphere-job';

const request = {
  schema: ATMOSPHERE_JOB_SCHEMA,
  sourceWforge: path.resolve('fixtures/world.wforge'),
  outputDirectory: path.resolve('out/weather-result'),
};

describe('headless atmosphere job contract', () => {
  it('accepts a saved world path and bounded simulation time', () => {
    expect(validateAtmosphereJobRequest({ ...request, simulationDays: 3 }).simulationDays).toBe(3);
  });

  it('rejects incompatible and unsafe requests before reading any files', () => {
    expect(() => validateAtmosphereJobRequest({ ...request, schema: 'other' })).toThrow('INVALID_REQUEST');
    expect(() => validateAtmosphereJobRequest({ ...request, sourceWforge: 'relative.wforge' })).toThrow('INVALID_REQUEST');
    expect(() => validateAtmosphereJobRequest({ ...request, simulationDays: Infinity })).toThrow('INVALID_REQUEST');
    expect(() => validateAtmosphereJobRequest({ ...request, outputDirectory: 'relative' })).toThrow('INVALID_REQUEST');
  });

  it('generates weather from a saved project without modifying it, and records verified hashes', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'wf-atmosphere-'));
    try {
      const sourceWforge = path.join(directory, 'original.wforge');
      const outputDirectory = path.join(directory, 'result');
      const generated = generateProject(createDefaultConfig('bridge-smoke', { width: 128, height: 64 }));
      const zip = await exportWforge(generated);
      const sourceBytes = Buffer.from(await zip.arrayBuffer());
      await writeFile(sourceWforge, sourceBytes);
      const events: Record<string, unknown>[] = [];
      await generateAtmosphereJob({
        schema: ATMOSPHERE_JOB_SCHEMA, sourceWforge, outputDirectory,
        worldId: generated.primaryWorld.id,
        sourceIdentity: {
          parchmentProjectId: 'project-smoke', worldAssetId: 'asset-smoke',
          requestedWorldProjectId: 'world-smoke', worldForgeProjectId: generated.projectId,
        },
      },
        event => events.push(event), async () => Buffer.from('89504e470d0a1a0a', 'hex'));
      const manifest = JSON.parse(await readFile(path.join(outputDirectory, 'manifest.json'), 'utf8'));
      const png = await readFile(path.join(outputDirectory, 'clouds.png'));
      const metadata = await readFile(path.join(outputDirectory, 'atmosphere.json'));
      const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
      expect(manifest.schema).toBe('world-forge-atmosphere-result-v1');
      expect(manifest.source.sha256).toBe(hash(sourceBytes));
      expect(manifest.source).toMatchObject({
        parchmentProjectId: 'project-smoke', worldAssetId: 'asset-smoke',
        requestedWorldProjectId: 'world-smoke', projectId: generated.projectId,
        bodyId: generated.primaryWorld.id, worldId: generated.primaryWorld.id,
      });
      expect(manifest.files.clouds.sha256).toBe(hash(png));
      expect(manifest.files.atmosphere.sha256).toBe(hash(metadata));
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect((await readFile(sourceWforge)).equals(sourceBytes)).toBe(true);
      expect(events.at(-1)?.type).toBe('completed');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }, 120_000);

  it('rejects an unavailable selected body instead of substituting the primary world', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'wf-atmosphere-missing-'));
    try {
      const sourceWforge = path.join(directory, 'original.wforge');
      const generated = generateProject(createDefaultConfig('bridge-missing', { width: 64, height: 32 }));
      const zip = await exportWforge(generated);
      await writeFile(sourceWforge, Buffer.from(await zip.arrayBuffer()));
      await expect(generateAtmosphereJob({
        schema: ATMOSPHERE_JOB_SCHEMA, sourceWforge,
        outputDirectory: path.join(directory, 'result'), worldId: 'missing-body',
      }, () => undefined, async () => Buffer.from('89504e470d0a1a0a', 'hex')))
        .rejects.toThrow('WORLD_UNAVAILABLE');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('cold-starts from a persisted project and renders a real package without a World Forge UI', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'wf-atmosphere-cold-'));
    try {
      const sourceWforge = path.join(directory, 'persisted.wforge');
      const outputDirectory = path.join(directory, 'candidate');
      const generated = generateProject(createDefaultConfig('bridge-cold-start', { width: 64, height: 32 }));
      const zip = await exportWforge(generated);
      await writeFile(sourceWforge, Buffer.from(await zip.arrayBuffer()));
      await generateAtmosphereJob({
        schema: ATMOSPHERE_JOB_SCHEMA, sourceWforge, outputDirectory,
        worldId: generated.primaryWorld.id,
        sourceIdentity: {
          parchmentProjectId: 'project-cold', worldAssetId: 'asset-cold',
          requestedWorldProjectId: 'world-cold', worldForgeProjectId: generated.projectId,
        },
      }, () => undefined);
      const manifest = JSON.parse(await readFile(path.join(outputDirectory, 'manifest.json'), 'utf8'));
      const png = await readFile(path.join(outputDirectory, 'clouds.png'));
      expect(png.subarray(0, 8)).toEqual(Buffer.from('89504e470d0a1a0a', 'hex'));
      expect(png.readUInt32BE(16)).toBe(512);
      expect(png.readUInt32BE(20)).toBe(256);
      expect(manifest.source).toMatchObject({
        parchmentProjectId: 'project-cold', requestedWorldProjectId: 'world-cold',
        projectId: generated.projectId, bodyId: generated.primaryWorld.id,
      });
      expect(manifest.files.clouds.sha256).toBe(createHash('sha256').update(png).digest('hex'));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }, 120_000);
});

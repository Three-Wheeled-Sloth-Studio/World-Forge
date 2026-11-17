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
      await generateAtmosphereJob({ schema: ATMOSPHERE_JOB_SCHEMA, sourceWforge, outputDirectory },
        event => events.push(event), async () => Buffer.from('89504e470d0a1a0a', 'hex'));
      const manifest = JSON.parse(await readFile(path.join(outputDirectory, 'manifest.json'), 'utf8'));
      const png = await readFile(path.join(outputDirectory, 'clouds.png'));
      const metadata = await readFile(path.join(outputDirectory, 'atmosphere.json'));
      const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
      expect(manifest.schema).toBe('world-forge-atmosphere-result-v1');
      expect(manifest.source.sha256).toBe(hash(sourceBytes));
      expect(manifest.files.clouds.sha256).toBe(hash(png));
      expect(manifest.files.atmosphere.sha256).toBe(hash(metadata));
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect((await readFile(sourceWforge)).equals(sourceBytes)).toBe(true);
      expect(events.at(-1)?.type).toBe('completed');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }, 120_000);
});

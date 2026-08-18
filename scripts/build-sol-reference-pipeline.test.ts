import path from 'node:path';
import { topologyResolutionForOutput } from '@world-forge/shared';
import { describe, expect, it } from 'vitest';
import {
  buildSolReferencePipelineCommands,
  parseSolReferencePipelineOptions,
  validatePreparedEarthManifest,
} from './build-sol-reference-pipeline';
import {
  MAINTAINED_EARTH_REFERENCE_RESOLUTION,
  MAINTAINED_EARTH_REFERENCE_TOPOLOGY_RESOLUTION,
} from './reference-resolution';

describe('Sol reference pipeline', () => {
  it('uses the maintained Ultra Earth reference baseline by default', () => {
    const repositoryRoot = path.resolve('/workspace/world-forge');
    const options = parseSolReferencePipelineOptions([], repositoryRoot, repositoryRoot);
    expect(MAINTAINED_EARTH_REFERENCE_RESOLUTION).toEqual({ width: 4096, height: 2048 });
    expect(MAINTAINED_EARTH_REFERENCE_TOPOLOGY_RESOLUTION).toBe(
      topologyResolutionForOutput(MAINTAINED_EARTH_REFERENCE_RESOLUTION),
    );
    expect(MAINTAINED_EARTH_REFERENCE_TOPOLOGY_RESOLUTION).toBe(1024);
    expect(options.earthWidth).toBe(4096);
    expect(options.earthHeight).toBe(2048);
    expect(options.topologyResolution).toBe(1024);
    expect(options.bodyBundleDirectories).toEqual([]);
    expect(options.outputFile).toBe(path.join(repositoryRoot, '.local', 'reference-data', 'sol-earth-reference.wforge'));

    const commands = buildSolReferencePipelineCommands(options, { NODE: 'node-test' });
    expect(commands.map((command) => command.stage)).toEqual([
      'prepare-earth',
      'prepare-jupiter',
      'build-sol-package',
    ]);
    expect(commands[0].args).toContain('4096');
    expect(commands[0].args).toContain('2048');
    expect(commands[0].args).toContain('1024');
    expect(commands[2]).toMatchObject({ command: 'node-test' });
    expect(commands[2].args).toEqual([
      path.join(repositoryRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
      '--tsconfig', path.join(repositoryRoot, 'tsconfig.scripts.json'),
      path.join(repositoryRoot, 'scripts', 'build-earth-reference.ts'),
      '--input', path.join(repositoryRoot, '.local', 'reference-data', 'earth-etopo'),
      '--jupiter-input', path.join(repositoryRoot, '.local', 'reference-data', 'jupiter-cassini'),
      '--output', path.join(repositoryRoot, '.local', 'reference-data', 'sol-earth-reference.wforge'),
    ]);
  });

  it('uses the canonical topology policy for comparison resolutions unless explicitly overridden', () => {
    const repositoryRoot = path.resolve('/workspace/world-forge');
    const canonical = parseSolReferencePipelineOptions([
      '--width', '1024',
      '--height', '512',
    ], repositoryRoot, repositoryRoot);
    expect(canonical.topologyResolution).toBe(topologyResolutionForOutput({ width: 1024, height: 512 }));
    expect(canonical.topologyResolution).toBe(256);

    const explicit = parseSolReferencePipelineOptions([
      '--width', '1024',
      '--height', '512',
      '--topology-resolution', '128',
    ], repositoryRoot, repositoryRoot);
    expect(explicit.topologyResolution).toBe(128);
  });

  it('rejects stale or incomplete prepared Earth bundles before package assembly', () => {
    const repositoryRoot = path.resolve('/workspace/world-forge');
    const options = parseSolReferencePipelineOptions([], repositoryRoot, repositoryRoot);
    const manifest = preparedEarthManifest();
    expect(() => validatePreparedEarthManifest(manifest, options)).not.toThrow();

    expect(() => validatePreparedEarthManifest({
      ...manifest,
      resolution: { width: 512, height: 256 },
    }, options)).toThrow(/does not match requested 4096 x 2048/);

    expect(() => validatePreparedEarthManifest({
      ...manifest,
      topologyResolution: 64,
    }, options)).toThrow(/does not match requested 1024/);

    const { biomeCodes: _biomeCodes, ...incompleteLayers } = manifest.layers;
    expect(() => validatePreparedEarthManifest({
      ...manifest,
      layers: incompleteLayers,
    }, options)).toThrow(/missing required source-backed layer "biomeCodes"/);
  });

  it('supports prepared bundles without rerunning source ETL', () => {
    const repositoryRoot = path.resolve('/workspace/world-forge');
    const options = parseSolReferencePipelineOptions([
      '--prepared-only',
      '--earth-bundle', 'prepared/earth',
      '--jupiter-bundle', 'prepared/jupiter',
      '--body-input', 'prepared/mars',
      '--body-input', 'prepared/venus',
      '--output', 'out/sol.wforge',
    ], repositoryRoot, repositoryRoot);

    expect(options.bodyBundleDirectories).toEqual([
      path.join(repositoryRoot, 'prepared', 'mars'),
      path.join(repositoryRoot, 'prepared', 'venus'),
    ]);
    const commands = buildSolReferencePipelineCommands(options, { NODE: 'C:\\Program Files\\nodejs\\node.exe' });
    expect(commands).toHaveLength(1);
    expect(commands[0].stage).toBe('build-sol-package');
    expect(commands[0].command).toBe('C:\\Program Files\\nodejs\\node.exe');
    expect(commands[0].command).not.toMatch(/\.cmd$/i);
    expect(commands[0].args).toEqual([
      path.join(repositoryRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
      '--tsconfig', path.join(repositoryRoot, 'tsconfig.scripts.json'),
      path.join(repositoryRoot, 'scripts', 'build-earth-reference.ts'),
      '--input', path.join(repositoryRoot, 'prepared', 'earth'),
      '--jupiter-input', path.join(repositoryRoot, 'prepared', 'jupiter'),
      '--body-input', path.join(repositoryRoot, 'prepared', 'mars'),
      '--body-input', path.join(repositoryRoot, 'prepared', 'venus'),
      '--output', path.join(repositoryRoot, 'out', 'sol.wforge'),
    ]);
  });

  it('rejects invalid Earth aspect ratios and contradictory source options', () => {
    const repositoryRoot = path.resolve('/workspace/world-forge');
    expect(() => parseSolReferencePipelineOptions([
      '--width', '512',
      '--height', '512',
    ], repositoryRoot, repositoryRoot)).toThrow(/2:1/);

    expect(() => parseSolReferencePipelineOptions([
      '--prepared-only',
      '--earth-source', 'earth.tif',
    ], repositoryRoot, repositoryRoot)).toThrow(/cannot be combined/);
  });

  it('rejects duplicate body directories and unknown arguments', () => {
    const repositoryRoot = path.resolve('/workspace/world-forge');
    expect(() => parseSolReferencePipelineOptions([
      '--body-input', 'prepared/mars',
      '--body-input', 'prepared/mars',
    ], repositoryRoot, repositoryRoot)).toThrow(/must be unique/);

    expect(() => parseSolReferencePipelineOptions([
      '--mystery-mode',
    ], repositoryRoot, repositoryRoot)).toThrow(/Unknown Sol reference pipeline argument/);
  });
});

function preparedEarthManifest() {
  return {
    schema: 'world-forge-reference-raster-bundle-v1',
    bodyId: 'earth',
    name: 'Earth',
    resolution: { width: 4096, height: 2048 },
    topologyResolution: 1024,
    layers: {
      elevationMeters: { file: 'elevation-meters.f32', encoding: 'float32-little-endian' },
      waterMask: { file: 'water-mask.u8', encoding: 'uint8' },
      biomeCodes: { file: 'biome-codes.u8', encoding: 'uint8' },
      wetness: { file: 'wetness.f32', encoding: 'float32-little-endian' },
      iceMask: { file: 'ice-mask.u8', encoding: 'uint8' },
    },
  };
}

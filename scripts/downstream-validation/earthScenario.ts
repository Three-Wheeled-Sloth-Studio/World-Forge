import path from 'node:path';
import { access, readFile } from 'node:fs/promises';
import {
  biomeNames,
  biomeToCode,
  type Resolution,
  type WorldProject,
} from '@world-forge/shared';
import {
  reconcilePresentDayDownstream,
  type PresentDayDownstreamOptions,
  type PresentDayDownstreamReconciliation,
} from '../../packages/generator-core/src/deepTimePipeline';
import { importReferenceBodyRaster, REFERENCE_BODY_RASTER_SCHEMA } from '../../packages/generator-core/src/referenceBodyImport';
import { attachBiomeDiagnostics } from '../../packages/generator-core/src/biomeDiagnostics';
import { createSolReferenceProject } from '../../packages/generator-core/src/solReferenceProject';
import type { ValidationAdapter, ValidationScenario, ValidationTier } from '@world-forge/validation-core';
import { loadReferenceRasterBundle } from '../referenceDataBundle';

export type EarthPhysicalInput = {
  resolution: Resolution;
  topologyResolution: number;
  elevationMeters: Float32Array;
  waterMask: Uint8Array;
  physical: {
    radiusKm: number;
    massEarth: number;
    axialTiltDeg: number;
    orbitalEccentricity: number;
    averageTemperatureC: number;
    seaLevelMeters?: number;
    tideInfluence?: number;
  };
};

export type EarthObservations = {
  resolution: Resolution;
  waterMask: Uint8Array;
  wetness: Float32Array;
  biomeCodes: Uint8Array;
  iceMask: Uint8Array;
  elevationMeters: Float32Array;
  wetlandPercent?: Uint8Array;
  wetlandDominantClass?: Uint8Array;
  provenance: {
    elevation: 'observed';
    wetness: 'derived-proxy';
    biomes: 'derived-proxy';
    ice: 'derived-proxy';
  };
};

export type EarthDownstreamOutput = {
  project: WorldProject;
  reconciliation: PresentDayDownstreamReconciliation;
  cohesionReassignments: number;
};

export type EarthScenarioOptions = {
  repositoryRoot: string;
  tier: ValidationTier;
  resolution: Resolution;
  topologyResolution: number;
  bundleDirectory?: string;
  wetlandBundleDirectory?: string;
};

export async function loadEarthDownstreamScenario(
  options: EarthScenarioOptions,
): Promise<ValidationScenario<EarthPhysicalInput, EarthObservations>> {
  const bundleDirectory = options.bundleDirectory
    ?? path.join(options.repositoryRoot, '.local', 'reference-data', 'earth-etopo');
  const source = await loadReferenceRasterBundle(bundleDirectory);
  if (!source.waterMask || !source.wetness || !source.biomeCodes || !source.iceMask) {
    throw new Error('Earth downstream validation requires water, wetness, biome, and ice reference layers.');
  }
  const reduced = reduceEarthReference(source.resolution, options.resolution, {
    elevationMeters: source.elevationMeters,
    waterMask: source.waterMask,
    wetness: source.wetness,
    biomeCodes: source.biomeCodes,
    iceMask: source.iceMask,
  });
  const wetlandBundleDirectory = options.wetlandBundleDirectory
    ?? path.join(options.repositoryRoot, '.local', 'reference-data', 'glwd-v2-derived');
  const wetlands = await loadReducedWetlandReference(wetlandBundleDirectory, options.resolution);
  return {
    id: `earth-downstream-${options.tier}-${options.resolution.width}x${options.resolution.height}`,
    label: `Earth downstream ${options.tier}`,
    tier: options.tier,
    input: {
      resolution: options.resolution,
      topologyResolution: options.topologyResolution,
      elevationMeters: reduced.elevationMeters,
      waterMask: reduced.waterMask,
      physical: source.physical,
    },
    observations: {
      resolution: options.resolution,
      ...reduced,
      ...wetlands,
      provenance: {
        elevation: 'observed',
        wetness: 'derived-proxy',
        biomes: 'derived-proxy',
        ice: 'derived-proxy',
      },
    },
    metadata: {
      sourceBundle: path.relative(options.repositoryRoot, bundleDirectory).replaceAll('\\', '/'),
      topologyResolution: options.topologyResolution,
      answerKeyIsolation: true,
      wetlandReference: wetlands
        ? path.relative(options.repositoryRoot, wetlandBundleDirectory).replaceAll('\\', '/')
        : undefined,
    },
  };
}

type GlwdManifest = {
  schema: 'world-forge-glwd-reference-v1';
  resolution: Resolution;
  layers: {
    wetlandPercent: { file: string; encoding: 'uint8'; nodata: 255 };
    dominantClass: { file: string; encoding: 'uint8'; nodata: 255 };
  };
};

async function loadReducedWetlandReference(
  directory: string,
  targetResolution: Resolution,
): Promise<Pick<EarthObservations, 'wetlandPercent' | 'wetlandDominantClass'> | undefined> {
  const manifestPath = path.join(directory, 'manifest.json');
  try {
    await access(manifestPath);
  } catch {
    return undefined;
  }
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as GlwdManifest;
  if (manifest.schema !== 'world-forge-glwd-reference-v1') throw new Error('Unsupported GLWD reference schema.');
  const expectedCells = manifest.resolution.width * manifest.resolution.height;
  const wetlandPercent = Uint8Array.from(await readFile(path.join(directory, manifest.layers.wetlandPercent.file)));
  const wetlandDominantClass = Uint8Array.from(await readFile(path.join(directory, manifest.layers.dominantClass.file)));
  if (wetlandPercent.length !== expectedCells || wetlandDominantClass.length !== expectedCells) {
    throw new Error('GLWD reference layers do not match their manifest resolution.');
  }
  return reduceWetlandReference(manifest.resolution, targetResolution, wetlandPercent, wetlandDominantClass);
}

export function reduceWetlandReference(
  sourceResolution: Resolution,
  targetResolution: Resolution,
  sourcePercent: Uint8Array,
  sourceClass: Uint8Array,
): Pick<EarthObservations, 'wetlandPercent' | 'wetlandDominantClass'> {
  if (sourceResolution.width % targetResolution.width !== 0 || sourceResolution.height % targetResolution.height !== 0) {
    throw new Error('GLWD validation resolution must divide the prepared source resolution exactly.');
  }
  const stepX = sourceResolution.width / targetResolution.width;
  const stepY = sourceResolution.height / targetResolution.height;
  const count = targetResolution.width * targetResolution.height;
  const wetlandPercent = new Uint8Array(count).fill(255);
  const wetlandDominantClass = new Uint8Array(count).fill(255);
  for (let targetY = 0; targetY < targetResolution.height; targetY += 1) {
    for (let targetX = 0; targetX < targetResolution.width; targetX += 1) {
      let percentTotal = 0;
      let valid = 0;
      const classCounts = new Uint32Array(34);
      for (let offsetY = 0; offsetY < stepY; offsetY += 1) {
        const sourceY = targetY * stepY + offsetY;
        for (let offsetX = 0; offsetX < stepX; offsetX += 1) {
          const sourceIndex = sourceY * sourceResolution.width + targetX * stepX + offsetX;
          const percent = sourcePercent[sourceIndex];
          const dominantClass = sourceClass[sourceIndex];
          if (percent === 255 || dominantClass === 255) continue;
          percentTotal += percent;
          valid += 1;
          if (dominantClass < classCounts.length) classCounts[dominantClass] += 1;
        }
      }
      if (!valid) continue;
      const targetIndex = targetY * targetResolution.width + targetX;
      wetlandPercent[targetIndex] = Math.round(percentTotal / valid);
      wetlandDominantClass[targetIndex] = modalCode(classCounts);
    }
  }
  return { wetlandPercent, wetlandDominantClass };
}

export function createEarthDownstreamAdapter(
  downstreamOptions: PresentDayDownstreamOptions = {},
): ValidationAdapter<EarthPhysicalInput, EarthDownstreamOutput> {
  return {
    id: 'world-forge-present-day-downstream',
    version: '1',
    run(input) {
      const totalStarted = performance.now();
      const importStarted = performance.now();
      const imported = importPhysicalSurface(input);
      const project = createSolReferenceProject(imported, {
        appVersion: 'downstream-validation-v1',
      }) as WorldProject;
      resetDownstreamLayers(project, input);
      const importMs = performance.now() - importStarted;
      const downstreamStarted = performance.now();
      const reconciliation = reconcilePresentDayDownstream(project, {
        captureClimateDerivedFields: true,
        optimizeTraversal: true,
        ...downstreamOptions,
      });
      const downstreamMs = performance.now() - downstreamStarted;
      const cohesionStarted = performance.now();
      attachBiomeDiagnostics(project);
      const cohesionMs = performance.now() - cohesionStarted;
      const cohesionReassignments = reconciliation.biomeCohesionReassignments;
      return {
        output: { project, reconciliation, cohesionReassignments },
        performance: {
          wallMs: performance.now() - totalStarted,
          stages: {
            'reference-surface-import': importMs,
            ...Object.fromEntries(Object.entries(reconciliation.stageTimingsMs).map(([name, ms]) => [`downstream.${name}`, ms])),
            'downstream.cohesion-diagnostics': cohesionMs,
            'downstream-total': downstreamMs + cohesionMs,
          },
          counters: {
            outputPixels: input.resolution.width * input.resolution.height,
            topologyCells: project.primaryWorld.topology.cellCount,
            cohesionReassignments,
          },
        },
      };
    },
  };
}

export const earthDownstreamAdapter = createEarthDownstreamAdapter();

type ReferenceLayers = {
  elevationMeters: Float32Array;
  waterMask: Uint8Array;
  wetness: Float32Array;
  biomeCodes: Uint8Array;
  iceMask: Uint8Array;
};

export function reduceEarthReference(
  sourceResolution: Resolution,
  targetResolution: Resolution,
  source: ReferenceLayers,
): ReferenceLayers {
  if (sourceResolution.width % targetResolution.width !== 0 || sourceResolution.height % targetResolution.height !== 0) {
    throw new Error('Earth validation resolution must divide the maintained source resolution exactly.');
  }
  const stepX = sourceResolution.width / targetResolution.width;
  const stepY = sourceResolution.height / targetResolution.height;
  const count = targetResolution.width * targetResolution.height;
  const output: ReferenceLayers = {
    elevationMeters: new Float32Array(count),
    waterMask: new Uint8Array(count),
    wetness: new Float32Array(count),
    biomeCodes: new Uint8Array(count),
    iceMask: new Uint8Array(count),
  };
  const oceanCode = biomeToCode('ocean');
  for (let targetY = 0; targetY < targetResolution.height; targetY += 1) {
    for (let targetX = 0; targetX < targetResolution.width; targetX += 1) {
      let elevationTotal = 0;
      let waterCount = 0;
      let landCount = 0;
      let landWetness = 0;
      let landIce = 0;
      const biomeCounts = new Uint32Array(biomeNames.length);
      for (let offsetY = 0; offsetY < stepY; offsetY += 1) {
        const sourceY = targetY * stepY + offsetY;
        for (let offsetX = 0; offsetX < stepX; offsetX += 1) {
          const sourceX = targetX * stepX + offsetX;
          const sourceIndex = sourceY * sourceResolution.width + sourceX;
          elevationTotal += source.elevationMeters[sourceIndex];
          if (source.waterMask[sourceIndex]) {
            waterCount += 1;
          } else {
            landCount += 1;
            landWetness += source.wetness[sourceIndex];
            landIce += source.iceMask[sourceIndex];
            const code = source.biomeCodes[sourceIndex];
            if (code < biomeCounts.length) biomeCounts[code] += 1;
          }
        }
      }
      const targetIndex = targetY * targetResolution.width + targetX;
      const samples = stepX * stepY;
      const water = waterCount >= samples / 2;
      output.elevationMeters[targetIndex] = elevationTotal / samples;
      output.waterMask[targetIndex] = water ? 1 : 0;
      output.wetness[targetIndex] = water ? 1 : landWetness / Math.max(1, landCount);
      output.iceMask[targetIndex] = water ? 0 : Number(landIce >= Math.max(1, landCount) / 2);
      output.biomeCodes[targetIndex] = water ? oceanCode : modalCode(biomeCounts);
    }
  }
  return output;
}

function importPhysicalSurface(input: EarthPhysicalInput) {
  return importReferenceBodyRaster({
    schema: REFERENCE_BODY_RASTER_SCHEMA,
    bodyId: 'earth',
    name: 'Earth validation surface',
    resolution: input.resolution,
    topologyResolution: input.topologyResolution,
    elevationMeters: input.elevationMeters,
    waterMask: input.waterMask,
    physical: input.physical,
  });
}

function resetDownstreamLayers(project: WorldProject, input: EarthPhysicalInput): void {
  const world = project.primaryWorld;
  world.topologyLayers.temperature.fill(input.physical.averageTemperatureC);
  world.topologyLayers.wetness.fill(0);
  world.topologyLayers.climateMoisture.fill(0);
  world.topologyLayers.climatePrecipitation.fill(0);
  world.topologyLayers.climateWetnessDelta.fill(0);
  world.topologyLayers.biomes.fill(biomeToCode('grassland'));
  world.topologyLayers.ice.fill(0);
  world.topologyLayers.river.fill(0);
  world.topologyLayers.lakes.fill(0);
  world.rivers = [];
  world.aridity = 0.48;
  project.selectedValues.averageTemperatureC = input.physical.averageTemperatureC;
  project.selectedValues.axialTiltDeg = input.physical.axialTiltDeg;
  project.selectedValues.orbitalEccentricity = input.physical.orbitalEccentricity;
  project.selectedValues.oceanPercentage = percentage(input.waterMask);
  project.selectedValues.oceanTolerancePercentagePoints = 1;
  project.selectedValues.aridity = 0.48;
  project.selectedValues.riverDensity = 1.9;
  project.config.selectedValues = { ...project.selectedValues };
}

function percentage(mask: Uint8Array): number {
  let count = 0;
  for (const value of mask) count += value ? 1 : 0;
  return count / Math.max(1, mask.length) * 100;
}

function modalCode(counts: Uint32Array): number {
  let bestCode = 0;
  let bestCount = -1;
  for (let code = 0; code < counts.length; code += 1) {
    if (counts[code] > bestCount) {
      bestCode = code;
      bestCount = counts[code];
    }
  }
  return bestCode;
}

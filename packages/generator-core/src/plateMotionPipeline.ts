import type { GenerationConfig, River } from '@world-forge/shared';
import type { GenerateProjectOptions } from './index';
import {
  generateProjectWithMotionAwareDeepTime as generateBaseProjectWithMotionAwareDeepTime,
  type DeepTimeProgress,
  type DeepTimeProject,
} from './plateMotionPipelineBase';
import {
  CURRENT_GENERATOR_VERSION,
  supplementNamedTopologyRivers,
} from './index';

export * from './plateMotionPipelineBase';

const LOW_ACCEPTANCE_NOTE = 'Named river acceptance is below capacity even though source candidates exist; path claiming or minimum path length may be suppressing rivers.';
const SHORT_RIVER_NOTE = 'Most named rivers are short at topology scale; sparse tile export is likely from short paths collapsing during downsampling.';

export function generateProjectWithMotionAwareDeepTime(
  input: Partial<GenerationConfig> = {},
  options: GenerateProjectOptions = {},
  onDeepTimeProgress?: (progress: DeepTimeProgress) => void,
): DeepTimeProject {
  const result = generateBaseProjectWithMotionAwareDeepTime(input, options, onDeepTimeProgress);
  const supplemented = supplementNamedTopologyRivers(result) as DeepTimeProject;
  const synchronized = synchronizeFinalHydrologyDiagnostics(supplemented);
  return synchronized.generatorVersion === CURRENT_GENERATOR_VERSION
    ? synchronized
    : { ...synchronized, generatorVersion: CURRENT_GENERATOR_VERSION };
}

export function synchronizeFinalHydrologyDiagnostics(project: DeepTimeProject): DeepTimeProject {
  const world = project.primaryWorld;
  const hydrology = world.deepTime.hydrology;
  const rivers = world.rivers;
  const pathLengths = rivers
    .map((river) => river.topologyPath?.length ?? river.path.length)
    .sort((left, right) => left - right);
  const sourceElevations: number[] = [];
  const mouthElevations: number[] = [];
  const sourceToMouthDrops: number[] = [];
  const namedPathCells = new Uint8Array(world.topologyLayers.water.length);
  const termini: Record<River['terminus'], number> = {
    ocean: 0,
    lake: 0,
    wetland: 0,
    basin: 0,
  };

  for (const river of rivers) {
    termini[river.terminus] += 1;
    const topologyPath = river.topologyPath ?? [];
    const source = topologyPath[0];
    const mouth = topologyPath[topologyPath.length - 1];
    if (source !== undefined && mouth !== undefined) {
      const sourceElevation = (world.topologyLayers.elevation[source] ?? world.seaLevel) - world.seaLevel;
      const mouthElevation = (world.topologyLayers.elevation[mouth] ?? world.seaLevel) - world.seaLevel;
      sourceElevations.push(sourceElevation);
      mouthElevations.push(mouthElevation);
      sourceToMouthDrops.push(sourceElevation - mouthElevation);
    }
    for (const cell of topologyPath) {
      if (cell >= 0 && cell < namedPathCells.length && !world.topologyLayers.water[cell]) {
        namedPathCells[cell] = 1;
      }
    }
  }

  sourceElevations.sort((left, right) => left - right);
  mouthElevations.sort((left, right) => left - right);
  sourceToMouthDrops.sort((left, right) => left - right);
  let namedPathCellCount = 0;
  for (const value of namedPathCells) namedPathCellCount += value;

  const riverCount = rivers.length;
  const safeRiverCount = Math.max(1, riverCount);
  const shortRiverShare = pathLengths.filter((length) => length <= 7).length / safeRiverCount;
  const notes = hydrology.notes.filter((note) => note !== LOW_ACCEPTANCE_NOTE && note !== SHORT_RIVER_NOTE);
  if (riverCount < hydrology.maximumRiverCount * 0.45 && hydrology.sourceCandidateCount >= hydrology.maximumRiverCount) {
    notes.push(LOW_ACCEPTANCE_NOTE);
  }
  if (shortRiverShare > 0.55) notes.push(SHORT_RIVER_NOTE);

  const synchronizedHydrology = {
    ...hydrology,
    acceptedRiverCount: riverCount,
    namedRiverCapacityUse: round(riverCount / Math.max(1, hydrology.maximumRiverCount), 5),
    namedRiverPathCellShare: round(namedPathCellCount / Math.max(1, hydrology.landCellCount), 5),
    shortRiverShare: round(shortRiverShare, 5),
    medianSourceToMouthDrop: round(percentile(sourceToMouthDrops, 0.5), 5),
    meanRiverPathLength: round(mean(pathLengths), 3),
    medianRiverPathLength: round(percentile(pathLengths, 0.5), 3),
    p90RiverPathLength: round(percentile(pathLengths, 0.9), 3),
    meanSourceElevationAboveSeaLevel: round(mean(sourceElevations), 5),
    medianSourceElevationAboveSeaLevel: round(percentile(sourceElevations, 0.5), 5),
    meanMouthElevationAboveSeaLevel: round(mean(mouthElevations), 5),
    oceanTerminusShare: round(termini.ocean / safeRiverCount, 5),
    lakeTerminusShare: round(termini.lake / safeRiverCount, 5),
    wetlandTerminusShare: round(termini.wetland / safeRiverCount, 5),
    basinTerminusShare: round(termini.basin / safeRiverCount, 5),
    notes,
  };

  return {
    ...project,
    primaryWorld: {
      ...world,
      deepTime: {
        ...world.deepTime,
        hydrology: synchronizedHydrology,
      },
    },
  };
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(sortedValues: readonly number[], ratio: number): number {
  if (sortedValues.length === 0) return 0;
  const position = Math.max(0, Math.min(sortedValues.length - 1, ratio * (sortedValues.length - 1)));
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const fraction = position - lower;
  return sortedValues[lower] * (1 - fraction) + sortedValues[upper] * fraction;
}

function round(value: number, digits: number): number {
  if (!Number.isFinite(value)) return 0;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

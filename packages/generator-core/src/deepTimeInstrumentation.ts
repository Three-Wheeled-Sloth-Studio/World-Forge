import type { GenerationConfig } from '@world-forge/shared';
import type { DeepTimeProgress, DeepTimeProject } from './deepTimePipeline';
import type { GenerateProjectOptions } from './index';
import { generateProjectWithMotionAwareDeepTime } from './plateMotionPipeline';

export const deepTimeInstrumentationVersion = 'deep-time-instrumentation-v1' as const;

export type DeepTimeSubstageId =
  | 'setup-models'
  | 'fragment-placement'
  | 'surface-aging'
  | 'fragment-history'
  | 'water-reconciliation'
  | 'climate-rebuild'
  | 'hydrology-rebuild'
  | 'biome-projection-validation'
  | 'ledger-and-unattributed';

export type DeepTimeWorkShape = Record<string, number | string | boolean>;

export type DeepTimeSubstageRecord = {
  id: DeepTimeSubstageId;
  label: string;
  elapsedMs: number;
  progressEvents: number;
  work: DeepTimeWorkShape;
};

export type DeepTimeInstrumentationProfile = {
  version: typeof deepTimeInstrumentationVersion;
  reportedDeepTimeMs: number;
  attributedMs: number;
  unattributedMs: number;
  attributionShare: number;
  topologyCells: number;
  projectedCells: number;
  epochs: number;
  surfaceAgingSamples: number;
  substages: DeepTimeSubstageRecord[];
};

type ActiveSubstage = {
  id: Exclude<DeepTimeSubstageId, 'ledger-and-unattributed'>;
  label: string;
  startedAt: number;
  progressEvents: number;
};

export class DeepTimeProgressTracker {
  private active?: ActiveSubstage;
  private readonly records: DeepTimeSubstageRecord[] = [];

  constructor(private readonly now: () => number = monotonicNow) {}

  observe(progress: DeepTimeProgress): void {
    const next = deepTimeSubstageForProgress(progress);
    const timestamp = this.now();
    if (!next) {
      this.closeActive(timestamp);
      return;
    }
    if (this.active?.id === next.id) {
      this.active.progressEvents += 1;
      this.active.label = progress.message || this.active.label;
      return;
    }
    this.closeActive(timestamp);
    this.active = {
      id: next.id,
      label: progress.message || next.label,
      startedAt: timestamp,
      progressEvents: 1
    };
  }

  finish(): DeepTimeSubstageRecord[] {
    this.closeActive(this.now());
    return this.records.map((record) => ({ ...record, work: { ...record.work } }));
  }

  private closeActive(timestamp: number): void {
    if (!this.active) return;
    this.records.push({
      id: this.active.id,
      label: this.active.label,
      elapsedMs: roundMs(timestamp - this.active.startedAt),
      progressEvents: this.active.progressEvents,
      work: {}
    });
    this.active = undefined;
  }
}

export function deepTimeSubstageForProgress(progress: DeepTimeProgress): { id: Exclude<DeepTimeSubstageId, 'ledger-and-unattributed'>; label: string } | null {
  if (progress.phase === 'complete') return null;
  if (progress.phase === 'epoch') return { id: 'surface-aging', label: 'Surface aging epochs' };
  if (progress.phase === 'initializing') {
    return progress.progress < 0.05
      ? { id: 'setup-models', label: 'Deep-time model setup' }
      : { id: 'fragment-placement', label: 'Authoritative fragment placement' };
  }
  if (progress.phase === 'reconciling') {
    if (progress.progress < 0.78) return { id: 'fragment-history', label: 'Fragment-history response' };
    if (progress.progress < 0.83) return { id: 'water-reconciliation', label: 'Water and sea-level reconciliation' };
    if (progress.progress < 0.88) return { id: 'climate-rebuild', label: 'Present climate rebuild' };
    if (progress.progress < 0.92) return { id: 'hydrology-rebuild', label: 'Hydrology rebuild' };
    return { id: 'biome-projection-validation', label: 'Biome, projection, and validation' };
  }
  return null;
}

export function generateProjectWithDeepTimeInstrumentation(
  input: Partial<GenerationConfig> = {},
  options: GenerateProjectOptions = {},
  onDeepTimeProgress?: (progress: DeepTimeProgress) => void
): { project: DeepTimeProject; profile: DeepTimeInstrumentationProfile } {
  const tracker = new DeepTimeProgressTracker();
  const project = generateProjectWithMotionAwareDeepTime(input, options, (progress) => {
    tracker.observe(progress);
    onDeepTimeProgress?.(progress);
  });
  const timedRecords = tracker.finish();
  return { project, profile: buildDeepTimeInstrumentationProfile(project, timedRecords) };
}

export function buildDeepTimeInstrumentationProfile(
  project: DeepTimeProject,
  timedRecords: readonly DeepTimeSubstageRecord[]
): DeepTimeInstrumentationProfile {
  const deepTime = project.primaryWorld.deepTime;
  const consistency = deepTime.consistency;
  const fragmentPlacement = deepTime.fragmentPlacement;
  const fragmentHistory = deepTime.fragmentHistory;
  const ledger = mutationLedger(deepTime);
  const operationCount = ledger
    ? ledger.tectonicGain.operations
      + ledger.impactGain.operations
      + ledger.impactLoss.operations
      + ledger.weatheringLoss.operations
      + ledger.glacialLoss.operations
      + ledger.coastalLoss.operations
      + ledger.sedimentGain.operations
      + ledger.unclassifiedElevationMutationOperations
    : 0;
  const affectedCellProcessTotal = ledger
    ? ledger.tectonicGain.affectedCells
      + ledger.impactGain.affectedCells
      + ledger.impactLoss.affectedCells
      + ledger.weatheringLoss.affectedCells
      + ledger.glacialLoss.affectedCells
      + ledger.coastalLoss.affectedCells
      + ledger.sedimentGain.affectedCells
    : 0;
  const scheduledIterations = deepTime.epochs.reduce((total, epoch) => total + Math.max(1, epoch.climateSamples) * (
    epoch.tectonicIterations
    + epoch.erosionIterations
    + epoch.glacialIterations
    + epoch.coastalIterations
    + 1
  ), 0);
  const workByStage: Partial<Record<DeepTimeSubstageId, DeepTimeWorkShape>> = {
    'setup-models': {
      topologyCells: project.primaryWorld.topology.cellCount,
      plateCount: project.primaryWorld.plates.length,
      cratonCount: deepTime.cratons.length,
      epochCount: deepTime.epochs.length
    },
    'fragment-placement': {
      sourceCells: fragmentPlacement?.sourceCellCount ?? 0,
      targetCells: fragmentPlacement?.targetCellCount ?? 0,
      movingFragments: fragmentPlacement?.movingFragmentCount ?? 0,
      fullArrayClones: 3,
      retainedCellRatio: fragmentPlacement?.retainedCellRatio ?? 0
    },
    'surface-aging': {
      epochs: deepTime.epochs.length,
      climateSamples: deepTime.forcingSamples.length,
      scheduledIterations,
      mutationOperations: operationCount,
      affectedCellProcessTotal,
      tectonicOperations: deepTime.tectonicAdjustedCells,
      impactOperations: deepTime.impactAdjustedCells,
      weatheringOperations: deepTime.weatheredCells,
      glacialOperations: deepTime.glaciallyErodedCells,
      coastalOperations: deepTime.coastalAdjustedCells
    },
    'fragment-history': {
      fragmentCount: fragmentHistory?.fragmentCount ?? 0,
      keyframeCount: fragmentHistory?.fragmentKeyframeCount ?? 0,
      pairEvaluations: fragmentHistory?.historyDrivenPairEvaluations ?? 0,
      terrainResponseCellShare: fragmentHistory?.terrainResponseCellShare ?? 0,
      volcanismResponseCellShare: fragmentHistory?.volcanismResponseCellShare ?? 0
    },
    'water-reconciliation': {
      topologyCells: project.primaryWorld.topology.cellCount,
      waterMaskCorrections: consistency.topologyWaterMaskCorrections,
      marineCells: deepTime.finalWater.marineCellCount,
      lakeCells: deepTime.finalWater.lakeCellCount,
      marineDepthAdjustedCells: deepTime.finalWater.marineDepthAdjustedCells
    },
    'climate-rebuild': {
      topologyCells: project.primaryWorld.topology.cellCount,
      climateCellsRefreshed: consistency.climateCellsRefreshed,
      landCells: deepTime.presentClimate.landCellCount,
      marineCells: deepTime.presentClimate.marineCellCount
    },
    'hydrology-rebuild': {
      topologyCells: project.primaryWorld.topology.cellCount,
      hydrologyCellsRebuilt: consistency.hydrologyCellsRebuilt,
      sourceCandidates: deepTime.hydrology.sourceCandidateCount,
      acceptedRivers: deepTime.hydrology.acceptedRiverCount,
      maximumRivers: deepTime.hydrology.maximumRiverCount
    },
    'biome-projection-validation': {
      projectedCells: consistency.projectedCellsRefreshed,
      biomeCorrections: consistency.biomeCorrections,
      invalidRiverCellsCleared: consistency.invalidRiverCellsCleared,
      validationFindings: consistency.findings.length
    }
  };
  const substages = timedRecords.map((record) => ({
    ...record,
    work: { ...(workByStage[record.id] ?? {}) }
  }));
  const reportedDeepTimeMs = phaseDuration(project, 'deep-time-aging');
  const attributedMs = substages.reduce((sum, record) => sum + record.elapsedMs, 0);
  const unattributedMs = roundMs(Math.max(0, reportedDeepTimeMs - attributedMs));
  substages.push({
    id: 'ledger-and-unattributed',
    label: 'Mutation-ledger setup, finalization, and unattributed overhead',
    elapsedMs: unattributedMs,
    progressEvents: 0,
    work: {
      mutationOperations: operationCount,
      depositedCells: ledger?.sediment.depositedCells ?? 0,
      depositionOperations: ledger?.sediment.depositionOperations ?? 0,
      unclassifiedMutationOperations: ledger?.unclassifiedElevationMutationOperations ?? 0
    }
  });
  return {
    version: deepTimeInstrumentationVersion,
    reportedDeepTimeMs: roundMs(reportedDeepTimeMs),
    attributedMs: roundMs(attributedMs),
    unattributedMs,
    attributionShare: roundRatio(attributedMs / Math.max(0.001, reportedDeepTimeMs)),
    topologyCells: project.primaryWorld.topology.cellCount,
    projectedCells: project.primaryWorld.layers.elevation.length,
    epochs: deepTime.epochs.length,
    surfaceAgingSamples: deepTime.forcingSamples.length,
    substages
  };
}

function phaseDuration(project: DeepTimeProject, name: string): number {
  return project.diagnostics?.phases
    .filter((phase) => phase.name === name)
    .reduce((total, phase) => total + phase.ms, 0) ?? 0;
}

function mutationLedger(deepTime: DeepTimeProject['primaryWorld']['deepTime']): MutationLedger | undefined {
  return (deepTime as DeepTimeProject['primaryWorld']['deepTime'] & { mutationLedger?: MutationLedger }).mutationLedger;
}

type MutationSummary = { operations: number; affectedCells: number };
type MutationLedger = {
  tectonicGain: MutationSummary;
  impactGain: MutationSummary;
  impactLoss: MutationSummary;
  weatheringLoss: MutationSummary;
  glacialLoss: MutationSummary;
  coastalLoss: MutationSummary;
  sedimentGain: MutationSummary;
  sediment: { depositedCells: number; depositionOperations: number };
  unclassifiedElevationMutationOperations: number;
};

function monotonicNow(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function roundMs(value: number): number {
  return Number(Math.max(0, value).toFixed(3));
}

function roundRatio(value: number): number {
  return Number(Math.max(0, Math.min(1, value)).toFixed(5));
}

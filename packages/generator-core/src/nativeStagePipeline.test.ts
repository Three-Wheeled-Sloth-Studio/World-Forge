import { describe, expect, it } from 'vitest';
import { buildCubedSphereTopology } from '@world-forge/shared';
import { createDefaultConfig } from './index';
import {
  generateProjectWithNativeStages,
  nativeGenerationStageIds,
  type NativeGenerationStageEvent
} from './nativeStagePipeline';

function testConfig(seed: string) {
  const config = createDefaultConfig(seed, { width: 64, height: 32 });
  return {
    ...config,
    topologyResolution: 16,
    outputResolution: { width: 64, height: 32 },
    selectedValues: {
      ...config.selectedValues,
      systemAgeGy: 4.6,
      oceanPercentage: 68,
      averageTemperatureC: 14,
      axialTiltDeg: 23.4,
      orbitalEccentricity: 0.02,
      riverDensity: 1.6,
      oceanTolerancePercentagePoints: 5
    }
  };
}

function topologyP90NeighborDelta(neighbors: Int32Array, elevation: Float32Array): number {
  const deltas: number[] = [];
  for (let cell = 0; cell < elevation.length; cell += 1) {
    for (let direction = 0; direction < 4; direction += 1) {
      const neighbor = neighbors[cell * 4 + direction];
      if (neighbor <= cell) continue;
      deltas.push(Math.abs(elevation[cell] - elevation[neighbor]));
    }
  }
  deltas.sort((left, right) => left - right);
  return deltas[Math.floor((deltas.length - 1) * 0.9)] ?? 0;
}

describe('native generator-core stage telemetry', () => {
  it('emits ordered native lifecycle events for all ten stages', () => {
    const events: NativeGenerationStageEvent[] = [];
    const project = generateProjectWithNativeStages(testConfig('native-stage-order'), {
      onStageEvent: (event) => events.push(event)
    });

    const started = events.filter((event) => event.phase === 'started').map((event) => event.stageId);
    const completed = events.filter((event) => event.phase === 'completed').map((event) => event.stageId);

    expect(started).toEqual(nativeGenerationStageIds);
    expect(completed).toEqual(nativeGenerationStageIds);
    expect(events.every((event) => event.overallProgress >= 0 && event.overallProgress <= 1)).toBe(true);
    expect(events.filter((event) => event.phase === 'completed').every((event) => event.elapsedMs !== undefined)).toBe(true);
    expect(project.primaryWorld.deepTime.modelVersion).toBe('deep-time-foundation-v3');
    expect(project.primaryWorld.hexOverlay?.modelVersion).toBe('flat-equirectangular-hex-overlay-v1');
    expect(project.primaryWorld.hexOverlay?.levels.map((level) => level.id)).toEqual(['world-500mi', 'world-60mi', 'regional-24mi', 'local-6mi', 'local-1mi']);
    expect(project.primaryWorld.regions?.modelVersion).toBe('world-regions-v1');
    expect(project.primaryWorld.regions?.regions.length).toBeGreaterThan(0);
    expect(project.primaryWorld.regions?.regions.every((region) => region.hexCoverage?.[0]?.levelId === 'world-60mi')).toBe(true);
    expect(project.primaryWorld.deepTime.continentalDrift?.modelVersion).toBe('continental-drift-diagnostics-v1');
    expect(project.primaryWorld.deepTime.continentalDrift?.activeBoundaryPairs).toBeGreaterThan(0);
    expect('motionLifecycle' in project.primaryWorld.deepTime).toBe(false);
    expect(project.primaryWorld.deepTime.finalWater.modelVersion).toBe('final-water-diagnostics-v1');
    expect(Math.abs(project.primaryWorld.deepTime.finalWater.oceanErrorPercentagePoints)).toBeLessThan(3);
  });

  it('keeps world output deterministic when telemetry is enabled', () => {
    const first = generateProjectWithNativeStages(testConfig('native-stage-determinism'));
    const second = generateProjectWithNativeStages(testConfig('native-stage-determinism'), {
      onStageEvent: () => undefined
    });

    expect(first.primaryWorld.seaLevel).toBe(second.primaryWorld.seaLevel);
    expect(Array.from(first.primaryWorld.layers.biomes)).toEqual(Array.from(second.primaryWorld.layers.biomes));
    expect(first.primaryWorld.rivers).toEqual(second.primaryWorld.rivers);
  });

  it('exposes isolated terrain snapshots in authoritative mutation order', () => {
    const stages: string[] = [];
    const snapshots: Float32Array[] = [];
    const baseline = generateProjectWithNativeStages(testConfig('native-stage-terrain-snapshots'));
    const observed = generateProjectWithNativeStages(testConfig('native-stage-terrain-snapshots'), {
      onTerrainDiagnosticSnapshot: (snapshot) => {
        stages.push(snapshot.stage);
        snapshots.push(snapshot.elevation);
        snapshot.elevation.fill(99);
      }
    });

    expect(stages).toEqual([
      'primordial',
      'initial-tectonic',
      'pre-deep-time',
      'post-fragment-placement',
      'post-surface-aging',
      'post-fragment-history'
    ]);
    expect(snapshots.every((snapshot) => snapshot.length === observed.primaryWorld.topology.cellCount)).toBe(true);
    expect(Array.from(observed.primaryWorld.topologyLayers.elevation)).toEqual(
      Array.from(baseline.primaryWorld.topologyLayers.elevation)
    );
  });

  it('supports controlled terrain bypasses without changing default behavior', () => {
    const snapshots = new Map<string, Float32Array>();
    const bypassed = generateProjectWithNativeStages(testConfig('native-stage-terrain-bypass'), {
      terrainDiagnosticBypasses: {
        fragmentPlacement: true,
        fragmentHistoryTerrainResponse: true
      },
      onTerrainDiagnosticSnapshot: (snapshot) => snapshots.set(snapshot.stage, snapshot.elevation)
    });

    expect(Array.from(snapshots.get('post-fragment-placement') ?? [])).toEqual(
      Array.from(snapshots.get('pre-deep-time') ?? [])
    );
    expect(bypassed.primaryWorld.deepTime.fragmentHistory?.terrainResponseApplied).toBe(false);
    expect(bypassed.primaryWorld.deepTime.fragmentPlacement?.notes).toContain(
      'Diagnostic bypass restored pre-placement topology fields before surface aging.'
    );
  });

  it('does not amplify fixed-seed terrain discontinuities during rigid fragment placement', () => {
    const config = testConfig('1001001');
    config.seeds = { star: '2850873', world: '1001001' };
    config.topologyResolution = 32;
    config.outputResolution = { width: 128, height: 64 };
    const snapshots = new Map<string, Float32Array>();
    generateProjectWithNativeStages(config, {
      onTerrainDiagnosticSnapshot: (snapshot) => snapshots.set(snapshot.stage, snapshot.elevation)
    });
    const topology = buildCubedSphereTopology(config.topologyResolution);
    const before = topologyP90NeighborDelta(topology.neighbors, snapshots.get('pre-deep-time')!);
    const after = topologyP90NeighborDelta(topology.neighbors, snapshots.get('post-fragment-placement')!);

    expect(after / Math.max(0.000001, before)).toBeLessThan(1.3);
  });

  it('stamps generated projects with the supplied app version', () => {
    const project = generateProjectWithNativeStages(testConfig('native-stage-app-version'), {
      appVersion: '0.2.46-test'
    });

    expect(project.appVersion).toBe('0.2.46-test');
  });

  it('scales impact history with geological age while eroding older relief', () => {
    const youngConfig = testConfig('native-stage-impact-age');
    const oldConfig = testConfig('native-stage-impact-age');
    youngConfig.selectedValues.systemAgeGy = 1.2;
    oldConfig.selectedValues.systemAgeGy = 8.2;

    const young = generateProjectWithNativeStages(youngConfig);
    const old = generateProjectWithNativeStages(oldConfig);
    const youngImpact = young.primaryWorld.deepTime.impactHistory;
    const oldImpact = old.primaryWorld.deepTime.impactHistory;

    expect(youngImpact.modelVersion).toBe('deep-time-impact-history-v1');
    expect(oldImpact.modelVersion).toBe('deep-time-impact-history-v1');
    expect(oldImpact.totalOpportunities).toBeGreaterThan(youngImpact.totalOpportunities);
    expect(oldImpact.appliedEvents).toBeGreaterThan(youngImpact.appliedEvents);
    expect(oldImpact.meanSurvivalRatio).toBeLessThan(youngImpact.meanSurvivalRatio);
    expect(oldImpact.events.length).toBeGreaterThan(0);
  });

  it('retains continental drift diagnostics for plate-interaction validation', () => {
    const project = generateProjectWithNativeStages(testConfig('native-stage-drift-diagnostics'));
    const drift = project.primaryWorld.deepTime.continentalDrift;
    const fragmentHistory = project.primaryWorld.deepTime.fragmentHistory;

    expect(drift).toBeDefined();
    expect(drift?.boundaryPairs).toBeGreaterThan(0);
    expect(drift?.activeBoundaryPairs).toBeGreaterThan(0);
    expect((drift?.continentalCollisionPairs ?? 0) + (drift?.continentalRiftPairs ?? 0) + (drift?.subductionPairs ?? 0)).toBeGreaterThan(0);
    expect(drift?.puzzleFitPotential).toBeGreaterThanOrEqual(0);
    expect(drift?.puzzleFitPotential).toBeLessThanOrEqual(1);
    expect(fragmentHistory?.modelVersion).toBe('fragment-history-diagnostics-v13');
    expect(fragmentHistory?.terrainResponseApplied).toBe(true);
    expect(fragmentHistory?.terrainResponseScale).toBeGreaterThan(0.5);
    expect(fragmentHistory?.meanAbsTerrainResponseDelta).toBeGreaterThan(0.006);
  });

  it('retains final-water diagnostics for marine depth validation', () => {
    const project = generateProjectWithNativeStages(testConfig('native-stage-final-water-diagnostics'));
    const water = project.primaryWorld.deepTime.finalWater;
    const marineBands = water.immediateShelfShareOfMarine
      + water.continentalShelfShareOfMarine
      + water.shallowSeaShareOfMarine
      + water.oceanShareOfMarine
      + water.deepOceanShareOfMarine;

    expect(water.marineCellCount).toBeGreaterThan(0);
    expect(marineBands).toBeCloseTo(1, 3);
    expect(water.deepOceanShareOfMarine).toBeGreaterThan(0.05);
    expect(water.coastlineSharpnessIndex).toBeGreaterThanOrEqual(0);
    expect(water.coastlineSharpnessIndex).toBeLessThanOrEqual(1);
  });

  it('retains present-climate diagnostics for rainfall and median temperature validation', () => {
    const project = generateProjectWithNativeStages(testConfig('native-stage-present-climate-diagnostics'));
    const climate = project.primaryWorld.deepTime.presentClimate;

    expect(climate.modelVersion).toBe('present-climate-diagnostics-v1');
    expect(climate.landCellCount).toBeGreaterThan(0);
    expect(climate.medianTemperatureC).toBeGreaterThan(-40);
    expect(climate.medianTemperatureC).toBeLessThan(45);
    expect(climate.landPrecipitationStdDev).toBeGreaterThan(0.04);
    expect(climate.precipitationFlatnessIndex).toBeLessThan(0.9);
    expect(climate.desertWetlandOverlapShare).toBeLessThan(0.08);
  });

  it('retains hydrology diagnostics for source and river-density validation', () => {
    const project = generateProjectWithNativeStages(testConfig('native-stage-hydrology-diagnostics'));
    const hydrology = project.primaryWorld.deepTime.hydrology;

    expect(hydrology.modelVersion).toBe('hydrology-diagnostics-v1');
    expect(hydrology.landCellCount).toBeGreaterThan(0);
    expect(hydrology.sourceCandidateCount).toBeGreaterThan(0);
    expect(hydrology.acceptedRiverCount).toBe(project.primaryWorld.rivers.length);
    expect(hydrology.maximumRiverCount).toBeGreaterThanOrEqual(hydrology.acceptedRiverCount);
    expect(hydrology.terrainHeadwaterCandidateShare).toBeGreaterThan(0);
    expect(hydrology.topologyRiverCellShare).toBeGreaterThan(0);
    expect(hydrology.riverDistributionEvenness).toBeGreaterThanOrEqual(0);
    expect(hydrology.riverDistributionEvenness).toBeLessThanOrEqual(1);
  });
});

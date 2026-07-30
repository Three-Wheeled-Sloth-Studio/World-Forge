import { describe, expect, it } from 'vitest';
import { buildCubedSphereTopology, createDefaultConfig } from '@world-forge/shared';
import { SeededRandom } from '../../random';
import { GenerationGraphRunner } from '../runner';
import { crustFieldsNode, crustFieldsNodeId } from './crust-fields-node';
import { plateConstructionNode, plateConstructionNodeId } from './plate-construction-node';
import { primordialTerrainNode, primordialTerrainNodeId } from './primordial-terrain-node';
import { topologyConstructionNode, topologyConstructionNodeId } from './topology-construction-node';
import { generateTopologyElevation, topologyElevationNode, topologyElevationNodeId } from './topology-elevation-node';

const values = {
  systemAgeGy: 4.6,
  oceanPercentage: 68,
  averageTemperatureC: 14,
  aridity: 0.45,
  seaLevel: 0,
  axialTiltDeg: 23.4,
  orbitalEccentricity: 0.017,
  sizeClass: 1,
  moonCount: 1,
  impactFrequency: 1,
  plateCount: 18,
  riverDensity: 1.6,
  continentCount: 5,
  continentScale: 0.55,
  islandDensity: 0.4,
  oceanTolerancePercentagePoints: 5
};

function run(seed: string) {
  const rng = new SeededRandom(seed);
  const config = createDefaultConfig(seed);
  const runner = new GenerationGraphRunner([
    topologyConstructionNode,
    primordialTerrainNode,
    plateConstructionNode,
    crustFieldsNode,
    topologyElevationNode
  ]);
  return runner.run(topologyElevationNodeId, { rootSeed: seed }, new Map([
    [topologyConstructionNodeId, { outputResolution: config.outputResolution, topologyResolution: 16 }],
    [primordialTerrainNodeId, { values, rng }],
    [plateConstructionNodeId, { requestedPlateCount: values.plateCount, rng }],
    [crustFieldsNodeId, { values, rng }],
    [topologyElevationNodeId, { values }]
  ])).results.get(topologyElevationNodeId);
}

describe('topologyElevationNode', () => {
  it('produces a validated finite layer matching topology size', () => {
    const execution = run('topology-elevation-node');
    const output = execution?.output as any;
    expect(execution?.validation?.valid).toBe(true);
    expect(output.elevation.length).toBe(16 * 16 * 6);
    expect(Array.from(output.elevation).every(Number.isFinite)).toBe(true);
  });

  it('is deterministic for the same compatibility stream', () => {
    const first = (run('topology-elevation-repeat')?.output as any).elevation;
    const second = (run('topology-elevation-repeat')?.output as any).elevation;
    expect(Array.from(first)).toEqual(Array.from(second));
  });

  it('does not trace construction plate allocation boundaries into elevation', () => {
    const topology = buildCubedSphereTopology(4);
    const plate = {
      id: 0,
      kind: 'continental' as const,
      centerCell: 0,
      centerX: 0,
      centerY: 0,
      centerX3: 1,
      centerY3: 0,
      centerZ3: 0,
      motionX: 0,
      motionY: 0,
      age: 0.5,
      density: 0.5
    };
    const primordial = {
      elevation: new Float32Array(topology.cellCount),
      crustThickness: new Float32Array(topology.cellCount),
      crustAge: new Float32Array(topology.cellCount),
      basin: new Float32Array(topology.cellCount),
      impact: new Float32Array(topology.cellCount)
    };
    const crust = {
      continental: new Float32Array(topology.cellCount),
      thickness: new Float32Array(topology.cellCount),
      shelf: new Float32Array(topology.cellCount),
      age: new Float32Array(topology.cellCount),
      buoyancy: new Float32Array(topology.cellCount)
    };
    const phases = { phaseA: 0, phaseB: 0, continentPhase: 0 };
    const onePlate = new Uint16Array(topology.cellCount);
    const splitPlates = new Uint16Array(topology.cellCount);
    splitPlates.fill(1, Math.floor(topology.cellCount / 2));
    const baseline = generateTopologyElevation(
      onePlate,
      [plate, { ...plate, id: 1 }],
      topology,
      values,
      primordial as any,
      crust as any,
      phases
    );
    const split = generateTopologyElevation(
      splitPlates,
      [plate, { ...plate, id: 1 }],
      topology,
      values,
      primordial as any,
      crust as any,
      phases
    );
    expect(Array.from(split)).toEqual(Array.from(baseline));
  });
});

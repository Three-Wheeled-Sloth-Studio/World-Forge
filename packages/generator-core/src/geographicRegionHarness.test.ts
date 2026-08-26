import { describe, expect, it } from 'vitest';
import { buildCubedSphereTopology } from '@world-forge/shared';
import { createDefaultConfig } from './index';
import { generateProjectWithNativeStages } from './nativeStagePipeline';
import { buildGeographicMacroRegions } from './geographicRegionPartition';
import { repairGeographicRegionSlivers } from './geographicRegionRepair';
import {
  evaluateGeographicRegionSet,
  evaluateLegacyLatLonGridBaseline,
} from './geographicRegionEvaluation';

describe('fixed-world geographic region harness', () => {
  const seeds = process.env.WORLD_FORGE_FULL_TEST_MATRIX === '1' ? ['1001001', '9776542'] : ['1001001'];
  for (const seed of seeds) {
    it(`produces valid candidate and baseline evidence for ${seed}`, () => {
      const config = createDefaultConfig(seed, { width: 64, height: 32 });
      config.topologyResolution = 12;
      config.outputResolution = { width: 64, height: 32 };
      const project = generateProjectWithNativeStages(config);
      const overlay = project.primaryWorld.hexOverlay;
      if (!overlay) throw new Error('Generated world did not include the world hex overlay.');
      const topology = buildCubedSphereTopology(project.primaryWorld.topology.resolution);
      const raw = buildGeographicMacroRegions(
        topology,
        project.primaryWorld.topologyLayers,
        overlay,
        { seed: project.seed },
      );
      const repaired = repairGeographicRegionSlivers(
        topology,
        project.primaryWorld.topologyLayers,
        overlay,
        raw,
      );
      const repeated = repairGeographicRegionSlivers(
        topology,
        project.primaryWorld.topologyLayers,
        overlay,
        raw,
      );
      const rawEvaluation = evaluateGeographicRegionSet(
        topology,
        project.primaryWorld.topologyLayers,
        raw,
      );
      const repairedEvaluation = evaluateGeographicRegionSet(
        topology,
        project.primaryWorld.topologyLayers,
        repaired,
      );
      const baseline = evaluateLegacyLatLonGridBaseline(
        topology,
        project.primaryWorld.topologyLayers,
      );

      expect(rawEvaluation.validMembership).toBe(true);
      expect(repairedEvaluation.validMembership).toBe(true);
      expect(repairedEvaluation.disconnectedRegionCount).toBe(0);
      expect(repairedEvaluation.sliverRegionCount).toBeLessThanOrEqual(rawEvaluation.sliverRegionCount);
      expect(repaired.signature).toBe(repeated.signature);
      expect(baseline.source).toBe('lat-lon-grid');
      expect(baseline.validMembership).toBe(true);
      expect(repairedEvaluation.axisBoundaryConcentration).toBeGreaterThanOrEqual(0);
      expect(repairedEvaluation.axisBoundaryConcentration).toBeLessThanOrEqual(1);
      expect(baseline.axisBoundaryConcentration).toBeGreaterThanOrEqual(0);
      expect(baseline.axisBoundaryConcentration).toBeLessThanOrEqual(1);
    });
  }
});

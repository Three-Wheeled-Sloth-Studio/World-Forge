import { buildCubedSphereTopology } from '@world-forge/shared';
import { createDefaultConfig } from '../packages/generator-core/src/index';
import { generateProjectWithNativeStages } from '../packages/generator-core/src/nativeStagePipeline';
import { buildGeographicMacroRegions } from '../packages/generator-core/src/geographicRegionPartition';
import { repairGeographicRegionSlivers } from '../packages/generator-core/src/geographicRegionRepair';
import {
  evaluateGeographicRegionSet,
  evaluateLegacyLatLonGridBaseline,
} from '../packages/generator-core/src/geographicRegionEvaluation';

const cases = [
  { seed: '1001001', topologyResolution: 48, outputResolution: { width: 192, height: 96 } },
  { seed: '9776542', topologyResolution: 48, outputResolution: { width: 192, height: 96 } },
  { seed: 'macro-regions-archipelago', topologyResolution: 48, outputResolution: { width: 192, height: 96 } },
  { seed: 'macro-regions-seam', topologyResolution: 48, outputResolution: { width: 192, height: 96 } },
];

const reports = cases.map((entry) => {
  const config = createDefaultConfig(entry.seed, entry.outputResolution);
  config.topologyResolution = entry.topologyResolution;
  config.outputResolution = entry.outputResolution;
  const project = generateProjectWithNativeStages(config);
  const overlay = project.primaryWorld.hexOverlay;
  if (!overlay) throw new Error(`World ${entry.seed} did not produce the required hex overlay.`);
  const topology = buildCubedSphereTopology(project.primaryWorld.topology.resolution);
  const rawCandidate = buildGeographicMacroRegions(
    topology,
    project.primaryWorld.topologyLayers,
    overlay,
    { seed: project.seed },
  );
  const repairedCandidate = repairGeographicRegionSlivers(
    topology,
    project.primaryWorld.topologyLayers,
    overlay,
    rawCandidate,
  );
  const rawEvaluation = evaluateGeographicRegionSet(
    topology,
    project.primaryWorld.topologyLayers,
    rawCandidate,
  );
  const repairedEvaluation = evaluateGeographicRegionSet(
    topology,
    project.primaryWorld.topologyLayers,
    repairedCandidate,
  );
  const legacyBaseline = evaluateLegacyLatLonGridBaseline(
    topology,
    project.primaryWorld.topologyLayers,
  );

  return {
    seed: entry.seed,
    topologyResolution: entry.topologyResolution,
    outputResolution: entry.outputResolution,
    scaleBudget: repairedCandidate.scaleBudget,
    rawCandidate: {
      regionSignature: rawCandidate.signature,
      diagnostics: rawCandidate.diagnostics,
      evaluation: rawEvaluation,
    },
    repairedCandidate: {
      regionSignature: repairedCandidate.signature,
      diagnostics: repairedCandidate.diagnostics,
      repair: repairedCandidate.repair,
      evaluation: repairedEvaluation,
    },
    legacyBaseline,
    comparison: {
      geographyBoundaryShareDelta: round(
        repairedEvaluation.geographicBoundaryShare - legacyBaseline.geographicBoundaryShare,
      ),
      axisBoundaryConcentrationDelta: round(
        repairedEvaluation.axisBoundaryConcentration - legacyBaseline.axisBoundaryConcentration,
      ),
      sliverRegionDelta: repairedEvaluation.sliverRegionCount - legacyBaseline.sliverRegionCount,
      disconnectedRegionDelta: repairedEvaluation.disconnectedRegionCount - legacyBaseline.disconnectedRegionCount,
    },
  };
});

console.log(JSON.stringify({
  modelVersion: 'geographic-region-harness-v2',
  generatedAt: new Date().toISOString(),
  reports,
}, null, 2));

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

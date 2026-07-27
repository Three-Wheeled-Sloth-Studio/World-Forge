import { buildCubedSphereTopology } from '@world-forge/shared';
import { createDefaultConfig } from '../packages/generator-core/src/index';
import { generateProjectWithNativeStages } from '../packages/generator-core/src/nativeStagePipeline';
import { buildGeographicMacroRegions } from '../packages/generator-core/src/geographicRegionPartition';
import { evaluateGeographicRegionSet } from '../packages/generator-core/src/geographicRegionEvaluation';

const cases = [
  { seed: '1001001', topologyResolution: 48, outputResolution: { width: 192, height: 96 } },
  { seed: '9776542', topologyResolution: 48, outputResolution: { width: 192, height: 96 } },
  { seed: 'macro-regions-archipelago', topologyResolution: 48, outputResolution: { width: 192, height: 96 } },
];

const reports = cases.map((entry) => {
  const config = createDefaultConfig(entry.seed, entry.outputResolution);
  config.topologyResolution = entry.topologyResolution;
  config.outputResolution = entry.outputResolution;
  const project = generateProjectWithNativeStages(config);
  const overlay = project.primaryWorld.hexOverlay;
  if (!overlay) throw new Error(`World ${entry.seed} did not produce the required hex overlay.`);
  const topology = buildCubedSphereTopology(project.primaryWorld.topology.resolution);
  const regions = buildGeographicMacroRegions(
    topology,
    project.primaryWorld.topologyLayers,
    overlay,
    { seed: project.seed },
  );
  const evaluation = evaluateGeographicRegionSet(
    topology,
    project.primaryWorld.topologyLayers,
    regions,
  );

  return {
    seed: entry.seed,
    topologyResolution: entry.topologyResolution,
    outputResolution: entry.outputResolution,
    regionSignature: regions.signature,
    scaleBudget: regions.scaleBudget,
    diagnostics: regions.diagnostics,
    evaluation,
  };
});

console.log(JSON.stringify({
  modelVersion: 'geographic-region-harness-v1',
  generatedAt: new Date().toISOString(),
  reports,
}, null, 2));

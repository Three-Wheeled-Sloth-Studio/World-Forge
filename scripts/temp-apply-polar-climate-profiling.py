from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding='utf-8')


def replace_once(path: str, old: str, new: str) -> None:
    content = read(path)
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one match, found {count}: {old[:100]!r}')
    write(path, content.replace(old, new, 1))


def replace_between(path: str, start: str, end: str, replacement: str) -> None:
    content = read(path)
    start_index = content.find(start)
    if start_index < 0:
        raise RuntimeError(f'{path}: missing start marker {start!r}')
    end_index = content.find(end, start_index)
    if end_index < 0:
        raise RuntimeError(f'{path}: missing end marker {end!r}')
    write(path, content[:start_index] + replacement + content[end_index:])


# Shared additive diagnostics contract.
replace_once(
    'packages/shared/src/types.ts',
    "    meanIceAlbedoCoolingC: number;\n  };",
    """    meanIceAlbedoCoolingC: number;
    polarClimate?: {
      latitudeProfileId: 'legacy-linear-v1' | 'mean-centered-linear-v1';
      equatorToPoleContrastC: number;
      meanTemperatureC: number;
      equatorialMeanTemperatureC: number;
      northHighLatitudeMeanTemperatureC: number;
      southHighLatitudeMeanTemperatureC: number;
      northPermanentIceShare: number;
      southPermanentIceShare: number;
      landIceCells: number;
      waterIceCells: number;
    };
  };"""
)

# Workflow identity and description.
replace_once(
    'packages/generator-core/src/workflows.ts',
    "    version: '0.4.0',\n    label: 'World Generation (Experimental)',\n    description: 'Development workflow for capability-resolved graph composition and the next isolated generation changes after cached present-climate traversal was promoted to Detailed.',",
    "    version: '0.5.0',\n    label: 'World Generation (Experimental)',\n    description: 'Development workflow testing a mean-centered latitude-temperature profile and permanent polar ice while Detailed remains the production comparison baseline.',"
)
replace_once(
    'packages/generator-core/src/workflows.test.ts',
    "  it('keeps Experimental ready for the next isolated generation changes', () => {",
    "  it('isolates the polar climate candidate in Experimental', () => {"
)
replace_once(
    'packages/generator-core/src/workflows.test.ts',
    "      version: '0.4.0',",
    "      version: '0.5.0',"
)

# Climate node profile input and diagnostics.
replace_once(
    'packages/generator-core/src/graph/nodes/climate-glaciation-node.ts',
    "import { WaterGeologyOutput, waterGeologyNodeId } from './water-geology-node';\n",
    "import { WaterGeologyOutput, waterGeologyNodeId } from './water-geology-node';\nimport { summarizePolarClimate, type LatitudeTemperatureProfile } from '../../latitudeTemperatureProfile';\n"
)
replace_once(
    'packages/generator-core/src/graph/nodes/climate-glaciation-node.ts',
    "    values: SelectedValues,\n    tideInfluence: number\n  ): void;",
    "    values: SelectedValues,\n    tideInfluence: number,\n    latitudeTemperatureProfile: LatitudeTemperatureProfile\n  ): void;"
)
replace_once(
    'packages/generator-core/src/graph/nodes/climate-glaciation-node.ts',
    "  tideInfluence: number;\n  diagnostics: ClimateGlaciationDiagnosticsRecorder;",
    "  tideInfluence: number;\n  latitudeTemperatureProfile: LatitudeTemperatureProfile;\n  diagnostics: ClimateGlaciationDiagnosticsRecorder;"
)
replace_once(
    'packages/generator-core/src/graph/nodes/climate-glaciation-node.ts',
    "        input.values,\n        input.tideInfluence\n      )",
    "        input.values,\n        input.tideInfluence,\n        input.latitudeTemperatureProfile\n      )"
)
replace_once(
    'packages/generator-core/src/graph/nodes/climate-glaciation-node.ts',
    "    return { temperature, wetness, climateMoisture, climatePrecipitation, climateWetnessDelta, ice, windX, windY, currentX, currentY, climate };",
    """    const polarClimate = summarizePolarClimate(
      temperature,
      ice,
      waterGeology.water,
      topologyOutput.topology,
      input.latitudeTemperatureProfile
    );
    climate.diagnostics.polarClimate = polarClimate;
    climate.notes = [
      ...climate.notes.filter((note) => !note.startsWith('Latitude-temperature profile')),
      `Latitude-temperature profile ${polarClimate.latitudeProfileId}: ${polarClimate.equatorToPoleContrastC} C equator-to-pole contrast; high-latitude means ${polarClimate.northHighLatitudeMeanTemperatureC} C north and ${polarClimate.southHighLatitudeMeanTemperatureC} C south.`
    ];

    return { temperature, wetness, climateMoisture, climatePrecipitation, climateWetnessDelta, ice, windX, windY, currentX, currentY, climate };"""
)

# Orchestrator selects the workflow-specific latitude model.
replace_once(
    'packages/generator-core/src/primary-world-orchestrator.ts',
    "import { runGenerationFoundation } from './graph/run-generation-foundation';\n",
    "import { runGenerationFoundation } from './graph/run-generation-foundation';\nimport { latitudeTemperatureProfileForWorkflow } from './latitudeTemperatureProfile';\n"
)
replace_once(
    'packages/generator-core/src/primary-world-orchestrator.ts',
    "      tideInfluence,\n      diagnostics,",
    "      tideInfluence,\n      latitudeTemperatureProfile: latitudeTemperatureProfileForWorkflow(workflowId),\n      diagnostics,"
)

# Actual foundation provenance separates the Experimental climate node.
replace_once(
    'packages/generator-core/src/graph/run-generation-foundation.ts',
    """const performanceFoundationWorkflowNodes: readonly RegisteredNode[] = [
  topologyConstructionNode,
  withNodeRandom(primordialTerrainNode),
  withNodeRandom(plateConstructionNode),
  withNodeRandom(crustFieldsNode),
  topologyElevationNode,
  withNodeRandom(terrainFinalizationNode),
  waterGeologyNode,
  climateGlaciationNode,
  hydrologyBiomesNode,
  projectionAssemblyNode
];

const experimentalCapabilityRules""",
    """const performanceFoundationWorkflowNodes: readonly RegisteredNode[] = [
  topologyConstructionNode,
  withNodeRandom(primordialTerrainNode),
  withNodeRandom(plateConstructionNode),
  withNodeRandom(crustFieldsNode),
  topologyElevationNode,
  withNodeRandom(terrainFinalizationNode),
  waterGeologyNode,
  climateGlaciationNode,
  hydrologyBiomesNode,
  projectionAssemblyNode
];

const experimentalFoundationWorkflowNodes: readonly RegisteredNode[] = performanceFoundationWorkflowNodes.map((node) =>
  node.id === climateGlaciationNodeId
    ? { ...node, version: '2-mean-centered-latitude' }
    : node
);

const experimentalCapabilityRules"""
)
replace_once(
    'packages/generator-core/src/graph/run-generation-foundation.ts',
    """function workflowNodes(workflowId: GenerationWorkflowId): readonly RegisteredNode[] {
  return generationWorkflowDescriptor(workflowId).seedStrategy === 'semantic-node'
    ? performanceFoundationWorkflowNodes
    : liveWorkflowNodes;
}""",
    """function workflowNodes(workflowId: GenerationWorkflowId): readonly RegisteredNode[] {
  if (workflowId === 'core.world-generation-experimental') return experimentalFoundationWorkflowNodes;
  return generationWorkflowDescriptor(workflowId).seedStrategy === 'semantic-node'
    ? performanceFoundationWorkflowNodes
    : liveWorkflowNodes;
}"""
)
replace_once(
    'packages/generator-core/src/graph/run-generation-foundation.ts',
    "    performanceFoundationWorkflowNodes,\n    bodyProfileId,",
    "    experimentalFoundationWorkflowNodes,\n    bodyProfileId,"
)

# Final stellar/orbit reconciliation refreshes the polar summary after final forcing.
replace_once(
    'packages/generator-core/src/systemOrbitPreset.ts',
    "import { traceGenerationPerformance } from './generationPerformanceTrace';\n",
    "import { traceGenerationPerformance } from './generationPerformanceTrace';\nimport { latitudeTemperatureProfileForWorkflow, summarizePolarClimate } from './latitudeTemperatureProfile';\nimport type { GenerationWorkflowId } from './workflows';\n"
)
replace_once(
    'packages/generator-core/src/systemOrbitPreset.ts',
    "  parameterDistributions?: Partial<Record<WorldParameterKey, NumericDistribution>>;\n};",
    "  parameterDistributions?: Partial<Record<WorldParameterKey, NumericDistribution>>;\n  workflowId?: GenerationWorkflowId;\n};"
)
replace_once(
    'packages/generator-core/src/systemOrbitPreset.ts',
    """  if (world.climate) {
    world.climate.notes = [
      ...world.climate.notes.filter((note) => !note.startsWith('Stellar forcing integrated')),
      `Stellar forcing integrated from ${stellar.spectralClass}${stellar.luminosityClass}: relative flux ${round(flux, 3)}, temperature adjustment ${round(fluxTemperatureDelta, 2)} C.`
    ];
  }""",
    """  if (world.climate) {
    const latitudeProfile = latitudeTemperatureProfileForWorkflow(config.workflowId);
    const polarClimate = summarizePolarClimate(
      layers.temperature,
      layers.ice,
      layers.water,
      topology,
      latitudeProfile
    );
    world.climate.diagnostics.polarClimate = polarClimate;
    world.climate.notes = [
      ...world.climate.notes.filter((note) =>
        !note.startsWith('Stellar forcing integrated')
        && !note.startsWith('Latitude-temperature profile')
      ),
      `Latitude-temperature profile ${polarClimate.latitudeProfileId}: ${polarClimate.equatorToPoleContrastC} C equator-to-pole contrast; final high-latitude means ${polarClimate.northHighLatitudeMeanTemperatureC} C north and ${polarClimate.southHighLatitudeMeanTemperatureC} C south; permanent ice ${(polarClimate.northPermanentIceShare * 100).toFixed(1)}% north and ${(polarClimate.southPermanentIceShare * 100).toFixed(1)}% south.`,
      `Stellar forcing integrated from ${stellar.spectralClass}${stellar.luminosityClass}: relative flux ${round(flux, 3)}, temperature adjustment ${round(fluxTemperatureDelta, 2)} C.`
    ];
  }"""
)

# User-facing graph provenance separates only the new climate candidate.
replace_between(
    'packages/generation-runtime/src/graph/generationWorkflows.ts',
    'function nodesForWorkflow(',
    'export const generationGraphWorkflows',
    """function nodesForWorkflow(workflowId: GenerationWorkflowId): GenerationGraphNodeDefinition[] {
  let nodes = copyGraph(coreGenerationGraph);
  if (workflowId === 'core.performance-foundation-control') {
    return nodes.map((node) => node.id === 'world.deep-time-aging'
      ? { ...node, implementationId: 'core.world.deep-time-aging.semantic-seed-control', version: '1-control' }
      : node);
  }
  if (workflowId === 'core.performance-foundation-aging-control') {
    return nodes.map((node) => node.id === 'world.deep-time-aging'
      ? { ...node, implementationId: 'core.world.deep-time-aging.bounded-three-era-control', version: '2-control' }
      : node);
  }
  if (workflowId === 'core.performance-foundation-derived-control') {
    return nodes.map((node) => node.id === 'world.deep-time-aging'
      ? { ...node, implementationId: 'core.world.deep-time-aging.bounded-three-era-derived-climate-control', version: '3-control' }
      : node);
  }
  if (workflowId === 'core.performance-foundation' || workflowId === 'core.world-generation-experimental') {
    nodes = nodes.map((node) => node.id === 'world.deep-time-aging'
      ? { ...node, implementationId: 'core.world.deep-time-aging.present-climate-traversal-v1', version: '4' }
      : node);
  }
  if (workflowId === 'core.world-generation-experimental') {
    nodes = nodes.map((node) => node.id === 'climate.glaciation'
      ? { ...node, implementationId: 'core.climate.glaciation.mean-centered-latitude-v1', version: '2' }
      : node);
  }
  return nodes;
}

"""
)
replace_between(
    'packages/generation-runtime/src/graph/generationWorkflows.test.ts',
    "  it('aligns Detailed and Experimental on the promoted present-climate implementation'",
    "  it('isolates hydrology and climate traversal",
    """  it('isolates only the new polar climate implementation from Detailed', () => {
    const detailed = generationGraphWorkflow('core.performance-foundation');
    const experimental = generationGraphWorkflow('core.world-generation-experimental');
    const detailedById = new Map(detailed.nodes.map((node) => [node.id, node]));
    for (const node of experimental.nodes) {
      const baseline = detailedById.get(node.id);
      expect(baseline).toBeDefined();
      if (node.id === 'climate.glaciation') {
        expect(node.implementationId).toBe('core.climate.glaciation.mean-centered-latitude-v1');
        expect(node.implementationId).not.toBe(baseline?.implementationId);
      } else {
        expect(node.implementationId).toBe(baseline?.implementationId);
      }
    }
    expect(detailed.nodes.find((node) => node.id === 'world.deep-time-aging')).toMatchObject({
      implementationId: 'core.world.deep-time-aging.present-climate-traversal-v1',
      version: '4'
    });
  });

"""
)

# Existing climate-node unit input receives the explicit legacy profile.
replace_once(
    'packages/generator-core/src/graph/nodes/climate-glaciation-node.test.ts',
    "import { waterGeologyNode, waterGeologyNodeId } from './water-geology-node';\n",
    "import { waterGeologyNode, waterGeologyNodeId } from './water-geology-node';\nimport { legacyLatitudeTemperatureProfile } from '../../latitudeTemperatureProfile';\n"
)
replace_once(
    'packages/generator-core/src/graph/nodes/climate-glaciation-node.test.ts',
    "        tideInfluence: 0.4,\n        diagnostics,",
    "        tideInfluence: 0.4,\n        latitudeTemperatureProfile: legacyLatitudeTemperatureProfile,\n        diagnostics,"
)

# Core implementation imports.
replace_once(
    'packages/generator-core/src/index.ts',
    "import { equirectangularTopologyLookup } from './equirectangularTopologyLookup';\nimport type { TerrainDiagnosticBypasses, TerrainDiagnosticSnapshotCallback } from './terrainDiagnostics';",
    "import { equirectangularTopologyLookup } from './equirectangularTopologyLookup';\nimport { traceGenerationPerformance } from './generationPerformanceTrace';\nimport { latitudeTemperatureOffsetC, type LatitudeTemperatureProfile } from './latitudeTemperatureProfile';\nimport type { TerrainDiagnosticBypasses, TerrainDiagnosticSnapshotCallback } from './terrainDiagnostics';"
)

# Fine projection profiling without output changes.
replace_between(
    'packages/generator-core/src/index.ts',
    'function projectTopologyToEquirectangular(',
    'function findTopologySeaLevelForOceanTarget(',
    """function projectTopologyToEquirectangular(
  elevation: Float32Array,
  plates: Uint16Array,
  water: Uint8Array,
  temperature: Float32Array,
  wetness: Float32Array,
  climateMoisture: Float32Array,
  climatePrecipitation: Float32Array,
  climateWetnessDelta: Float32Array,
  biomes: Uint8Array,
  ice: Uint8Array,
  river: Float32Array,
  lakes: Uint8Array,
  topologyElevation: Float32Array,
  topologyPlates: Uint16Array,
  topologyWater: Uint8Array,
  topologyTemperature: Float32Array,
  topologyWetness: Float32Array,
  topologyClimateMoisture: Float32Array,
  topologyClimatePrecipitation: Float32Array,
  topologyClimateWetnessDelta: Float32Array,
  topologyBiomes: Uint8Array,
  topologyIce: Uint8Array,
  topologyRiver: Float32Array,
  topologyLakes: Uint8Array,
  topology: CubedSphereTopology,
  width: number,
  height: number
): void {
  const lookup = traceGenerationPerformance(
    'foundation.projection.scalar-lookup',
    { topologyCells: topology.cellCount, activeCells: width * height, fullTopologyPasses: 0, allocatedBufferBytes: 0 },
    () => equirectangularTopologyLookup(topology, width, height)
  );
  traceGenerationPerformance(
    'foundation.projection.scalar-copy',
    { topologyCells: topology.cellCount, activeCells: lookup.length, fullTopologyPasses: 0, allocatedBufferBytes: 0 },
    () => {
      for (let index = 0; index < lookup.length; index += 1) {
        const topologyCell = lookup[index];
        elevation[index] = topologyElevation[topologyCell];
        plates[index] = topologyPlates[topologyCell];
        water[index] = topologyWater[topologyCell];
        temperature[index] = topologyTemperature[topologyCell];
        wetness[index] = topologyWetness[topologyCell];
        climateMoisture[index] = topologyClimateMoisture[topologyCell];
        climatePrecipitation[index] = topologyClimatePrecipitation[topologyCell];
        climateWetnessDelta[index] = topologyClimateWetnessDelta[topologyCell];
        biomes[index] = topologyBiomes[topologyCell];
        ice[index] = topologyIce[topologyCell];
        river[index] = topologyRiver[topologyCell];
        lakes[index] = topologyLakes[topologyCell];
      }
    }
  );
}

function projectTopologyFlowToEquirectangular(
  windX: Float32Array,
  windY: Float32Array,
  currentX: Float32Array,
  currentY: Float32Array,
  topologyWindX: Float32Array,
  topologyWindY: Float32Array,
  topologyCurrentX: Float32Array,
  topologyCurrentY: Float32Array,
  topology: CubedSphereTopology,
  width: number,
  height: number
): void {
  const lookup = traceGenerationPerformance(
    'foundation.projection.vector-lookup',
    { topologyCells: topology.cellCount, activeCells: width * height, fullTopologyPasses: 0, allocatedBufferBytes: 0 },
    () => equirectangularTopologyLookup(topology, width, height)
  );
  traceGenerationPerformance(
    'foundation.projection.vector-copy',
    { topologyCells: topology.cellCount, activeCells: lookup.length, fullTopologyPasses: 0, allocatedBufferBytes: 0 },
    () => {
      for (let index = 0; index < lookup.length; index += 1) {
        const topologyCell = lookup[index];
        windX[index] = topologyWindX[topologyCell];
        windY[index] = topologyWindY[topologyCell];
        currentX[index] = topologyCurrentX[topologyCell];
        currentY[index] = topologyCurrentY[topologyCell];
      }
    }
  );
}

"""
)

# Mean-centered Experimental temperature field plus climate subphase profiling.
replace_between(
    'packages/generator-core/src/index.ts',
    'function generateTopologyClimate(',
    'function coastalWarmCurrentMoistureBoost(',
    """function generateTopologyClimate(
  temperature: Float32Array,
  wetness: Float32Array,
  windX: Float32Array,
  windY: Float32Array,
  currentX: Float32Array,
  currentY: Float32Array,
  elevation: Float32Array,
  water: Uint8Array,
  topology: CubedSphereTopology,
  values: SelectedValues,
  tideInfluence: number,
  latitudeTemperatureProfile: LatitudeTemperatureProfile
): void {
  const oceanInfluence = traceGenerationPerformance(
    'foundation.climate.water-distance',
    { topologyCells: topology.cellCount, activeCells: topology.cellCount, fullTopologyPasses: 18, allocatedBufferBytes: water.length * Float32Array.BYTES_PER_ELEMENT },
    () => computeTopologyWaterInfluence(water, topology, 18)
  );
  traceGenerationPerformance(
    'foundation.climate.temperature-field',
    { topologyCells: topology.cellCount, activeCells: topology.cellCount, fullTopologyPasses: 1, allocatedBufferBytes: 0 },
    () => {
      for (let cell = 0; cell < topology.cellCount; cell += 1) {
        const polarLatitude = Math.abs(topology.latitudes[cell]) / (Math.PI / 2);
        const elev = elevation[cell];
        const x = topology.positions[cell * 3];
        const y = topology.positions[cell * 3 + 1];
        const z = topology.positions[cell * 3 + 2];
        temperature[cell] = values.averageTemperatureC
          + latitudeTemperatureOffsetC(polarLatitude, latitudeTemperatureProfile)
          - Math.max(0, elev) * 26
          - values.orbitalEccentricity * 16
          + sphericalNoise(x * 6, y * 6, z * 6) * 2.2;
      }
    }
  );

  traceGenerationPerformance(
    'foundation.climate.atmospheric-flow',
    { topologyCells: topology.cellCount, activeCells: topology.cellCount, fullTopologyPasses: 2, allocatedBufferBytes: topology.cellCount * Float32Array.BYTES_PER_ELEMENT * 2 },
    () => generateTopologyAtmosphericFlow(windX, windY, elevation, temperature, topology, values)
  );
  traceGenerationPerformance(
    'foundation.climate.ocean-currents',
    { topologyCells: topology.cellCount, activeCells: topology.cellCount, fullTopologyPasses: 2, allocatedBufferBytes: topology.cellCount * Float32Array.BYTES_PER_ELEMENT * 2 },
    () => generateTopologyOceanCurrents(currentX, currentY, windX, windY, elevation, water, topology)
  );

  traceGenerationPerformance(
    'foundation.climate.wetness-traversal',
    { topologyCells: topology.cellCount, activeCells: topology.cellCount, fullTopologyPasses: 1, allocatedBufferBytes: 0 },
    () => {
      for (let cell = 0; cell < topology.cellCount; cell += 1) {
        const x = topology.positions[cell * 3];
        const y = topology.positions[cell * 3 + 1];
        const z = topology.positions[cell * 3 + 2];
        const latitude = topology.latitudes[cell];
        const convergenceBand = Math.max(0, Math.cos(latitude * 2.9)) * 0.08 + Math.max(0, Math.sin(latitude * 6)) * 0.1;
        const moisture = topologyMoistureFetch(elevation, water, topology, cell, windX[cell], windY[cell], oceanInfluence[cell]);
        const orographic = topologyOrographicEffect(elevation, topology, cell, windX[cell], windY[cell]);
        const wetBase = moisture * 0.66 + (1 - values.aridity) * 0.36 + convergenceBand + tideInfluence * 0.04;
        wetness[cell] = clamp((wetBase + orographic.lift * 0.58 - orographic.shadow * 1.18 + sphericalNoise(x * 9, y * 9, z * 9) * 0.12 - 0.43) * 1.32 + 0.5);
      }
    }
  );
  traceGenerationPerformance(
    'foundation.climate.wetness-smoothing',
    { topologyCells: topology.cellCount, activeCells: topology.cellCount, fullTopologyPasses: 1, allocatedBufferBytes: wetness.length * Float32Array.BYTES_PER_ELEMENT },
    () => smoothTopologyLayer(wetness, topology, 1, 0.22)
  );
}

function generateTopologyClimateMoistureCandidate(
  climateMoisture: Float32Array,
  climatePrecipitation: Float32Array,
  climateWetnessDelta: Float32Array,
  elevation: Float32Array,
  water: Uint8Array,
  temperature: Float32Array,
  existingWetness: Float32Array,
  windX: Float32Array,
  windY: Float32Array,
  currentX: Float32Array,
  currentY: Float32Array,
  topology: CubedSphereTopology,
  values: SelectedValues,
  seaLevel: number
): void {
  const oceanInfluence = traceGenerationPerformance(
    'foundation.climate.moisture-candidate-water-distance',
    { topologyCells: topology.cellCount, activeCells: topology.cellCount, fullTopologyPasses: 24, allocatedBufferBytes: water.length * Float32Array.BYTES_PER_ELEMENT },
    () => computeTopologyWaterInfluence(water, topology, 24)
  );
  const landInfluence = traceGenerationPerformance(
    'foundation.climate.moisture-candidate-land-distance',
    { topologyCells: topology.cellCount, activeCells: topology.cellCount, fullTopologyPasses: 8, allocatedBufferBytes: water.length * Float32Array.BYTES_PER_ELEMENT },
    () => computeTopologyLandInfluence(water, topology, 8)
  );
  traceGenerationPerformance(
    'foundation.climate.moisture-candidate-traversal',
    { topologyCells: topology.cellCount, activeCells: topology.cellCount, fullTopologyPasses: 1, allocatedBufferBytes: 0 },
    () => {
      for (let cell = 0; cell < topology.cellCount; cell += 1) {
        if (water[cell] === 1) {
          const evaporation = clamp(normalizeValue(temperature[cell], -4, 32) * 0.72 + Math.hypot(currentX[cell], currentY[cell]) * 0.2);
          climatePrecipitation[cell] = evaporation;
          climateMoisture[cell] = 1;
          climateWetnessDelta[cell] = 0;
          continue;
        }
        const latitude = topology.latitudes[cell];
        const absLat = Math.abs(latitude);
        const itcz = Math.exp(-(latitude * latitude) / 0.08) * 0.24;
        const stormTrack = Math.exp(-((absLat - 0.72) ** 2) / 0.045) * 0.18;
        const subtropicalDry = Math.exp(-((absLat - 0.52) ** 2) / 0.035) * 0.16;
        const fetch = topologyMoistureFetch(elevation, water, topology, cell, windX[cell], windY[cell], oceanInfluence[cell]);
        const orographic = topologyOrographicEffect(elevation, topology, cell, windX[cell], windY[cell]);
        const warmCurrentBoost = coastalWarmCurrentMoistureBoost(water, temperature, currentX, currentY, topology, cell, landInfluence[cell]);
        const altitudeDrying = Math.max(0, elevation[cell] - seaLevel - 0.24) * 0.22;
        const thermalMoisture = normalizeValue(temperature[cell], -8, 28) * 0.09;
        const base = fetch * 0.56 + (1 - values.aridity) * 0.28 + itcz + stormTrack + warmCurrentBoost + thermalMoisture;
        const precipitation = clamp(base + orographic.lift * 0.52 - orographic.shadow * 0.86 - subtropicalDry - altitudeDrying);
        climatePrecipitation[cell] = precipitation;
        climateMoisture[cell] = clamp(precipitation * 0.82 + oceanInfluence[cell] * 0.16 + Math.max(0, existingWetness[cell] - 0.52) * 0.08);
        climateWetnessDelta[cell] = clamp(climateMoisture[cell] - existingWetness[cell], -1, 1);
      }
    }
  );
  traceGenerationPerformance(
    'foundation.climate.moisture-candidate-smoothing',
    { topologyCells: topology.cellCount, activeCells: topology.cellCount, fullTopologyPasses: 2, allocatedBufferBytes: topology.cellCount * Float32Array.BYTES_PER_ELEMENT * 2 },
    () => {
      smoothTopologyLayer(climateMoisture, topology, 1, 0.18);
      smoothTopologyLayer(climatePrecipitation, topology, 1, 0.14);
      for (let cell = 0; cell < topology.cellCount; cell += 1) climateWetnessDelta[cell] = clamp(climateMoisture[cell] - existingWetness[cell], -1, 1);
    }
  );
}

"""
)

# Hydrology work is split into stable traceable operations while preserving order and values.
replace_between(
    'packages/generator-core/src/index.ts',
    'function generateTopologyHydrology(',
    'function hydrologyReceiver(',
    """function generateTopologyHydrology(
  river: Float32Array,
  lakes: Uint8Array,
  elevation: Float32Array,
  water: Uint8Array,
  wetness: Float32Array,
  topology: CubedSphereTopology,
  seaLevel: number,
  riverDensity: number
): TopologyRiverPath[] {
  river.fill(0);
  lakes.fill(0);
  const oceanInfluence = traceGenerationPerformance(
    'foundation.hydrology.water-distance',
    { topologyCells: topology.cellCount, activeCells: topology.cellCount, fullTopologyPasses: 48, allocatedBufferBytes: water.length * Float32Array.BYTES_PER_ELEMENT },
    () => computeTopologyWaterInfluence(water, topology, 48)
  );
  const drainageElevation = traceGenerationPerformance(
    'foundation.hydrology.drainage-surface',
    { topologyCells: topology.cellCount, activeCells: topology.cellCount, fullTopologyPasses: 1, allocatedBufferBytes: elevation.length * Float32Array.BYTES_PER_ELEMENT },
    () => computeTopologyDrainageSurface(elevation, water, topology)
  );
  const flow = new Float32Array(elevation.length);
  const receiver = new Int32Array(elevation.length);
  const order = traceGenerationPerformance(
    'foundation.hydrology.elevation-ordering',
    { topologyCells: topology.cellCount, activeCells: topology.cellCount, fullTopologyPasses: 0, allocatedBufferBytes: elevation.length * 8 },
    () => Array.from(elevation.keys()).sort((a, b) => drainageElevation[b] - drainageElevation[a])
  );
  traceGenerationPerformance(
    'foundation.hydrology.receiver-flow-initialization',
    { topologyCells: topology.cellCount, activeCells: topology.cellCount, fullTopologyPasses: 1, allocatedBufferBytes: flow.byteLength + receiver.byteLength },
    () => {
      for (let cell = 0; cell < elevation.length; cell += 1) {
        receiver[cell] = hydrologyReceiver(elevation, drainageElevation, water, topology, cell);
        flow[cell] = water[cell] === 1 ? 0 : Math.max(0.02, wetness[cell] * Math.max(0.05, elevation[cell] - seaLevel + 0.08));
        if (water[cell] === 0 && drainageElevation[cell] > elevation[cell] + 0.014) lakes[cell] = 1;
      }
    }
  );
  traceGenerationPerformance(
    'foundation.hydrology.flow-accumulation',
    { topologyCells: topology.cellCount, activeCells: order.length, fullTopologyPasses: 1, allocatedBufferBytes: 0 },
    () => {
      for (const cell of order) {
        if (water[cell] === 1) continue;
        const next = receiver[cell];
        if (next === cell) {
          markTopologyLakeBasin(lakes, elevation, topology, cell, drainageElevation[cell] + 0.004, 2);
          continue;
        }
        flow[next] += flow[cell] * 0.92;
      }
    }
  );
  traceGenerationPerformance(
    'foundation.hydrology.channel-marking',
    { topologyCells: topology.cellCount, activeCells: topology.cellCount, fullTopologyPasses: 1, allocatedBufferBytes: 0 },
    () => {
      const channelThreshold = positiveFloatLayerPercentile(flow, clamp(0.91 - riverDensity * 0.032, 0.68, 0.91));
      for (let cell = 0; cell < flow.length; cell += 1) {
        if (water[cell] === 1 || flow[cell] <= channelThreshold) continue;
        river[cell] += clamp((flow[cell] - channelThreshold) / Math.max(0.0001, channelThreshold * 2.4));
      }
    }
  );
  const sourceCandidates = traceGenerationPerformance(
    'foundation.hydrology.source-ordering',
    { topologyCells: topology.cellCount, activeCells: order.length, fullTopologyPasses: 0, allocatedBufferBytes: order.length * 8 },
    () => {
      const threshold = positiveFloatLayerPercentile(flow, clamp(0.94 - riverDensity * 0.024, 0.78, 0.94));
      return order
        .filter((cell) => water[cell] === 0 && flow[cell] > threshold && elevation[cell] > seaLevel + 0.09)
        .sort((a, b) => riverSourceScore(flow, elevation, oceanInfluence, seaLevel, b) - riverSourceScore(flow, elevation, oceanInfluence, seaLevel, a));
    }
  );
  const paths: TopologyRiverPath[] = [];
  const maxPaths = Math.max(18, Math.min(180, Math.round(riverDensity * 36)));
  const minNamedPathLength = Math.max(4, Math.round(topology.resolution / 64));
  traceGenerationPerformance(
    'foundation.hydrology.river-path-tracing',
    { topologyCells: topology.cellCount, activeCells: sourceCandidates.length, fullTopologyPasses: 0, allocatedBufferBytes: 0 },
    () => {
      for (const source of sourceCandidates) {
        if (paths.length >= maxPaths) break;
        if (river[source] > 0.4) continue;
        const path: number[] = [];
        const seen = new Set<number>();
        let current = source;
        let terminus: River['terminus'] = 'basin';
        for (let step = 0; step < 800; step += 1) {
          if (seen.has(current)) {
            markTopologyLakeBasin(lakes, elevation, topology, current, drainageElevation[current] + 0.004, 2);
            terminus = 'lake';
            break;
          }
          seen.add(current);
          path.push(current);
          if (water[current] === 1) {
            terminus = 'ocean';
            break;
          }
          const next = receiver[current];
          if (next === current) {
            markTopologyLakeBasin(lakes, elevation, topology, current, drainageElevation[current] + 0.004, 3);
            terminus = 'lake';
            break;
          }
          current = next;
        }
        if (path.length < minNamedPathLength) continue;
        for (let i = 0; i < path.length; i += 1) river[path[i]] += lerp(0.28, 1.3, i / path.length);
        paths.push({ path, terminus });
      }
    }
  );
  return paths;
}

"""
)

# Trace the terrain-aging operations in the same performance stream.
replace_once(
    'packages/generator-core/src/index.ts',
    """  diagnostics.measure('topology.terrain.aging.impacts', () => applyTopologyImpacts(elevation, topology, age01, impactFrequency, seaLevel, rng));
  diagnostics.measure('topology.terrain.aging.weathering', () => applyTopologyThermalWeathering(elevation, topology, age01));
  diagnostics.measure('topology.terrain.aging.hydraulic', () => applyTopologyHydraulicErosion(elevation, topology, age01));
  diagnostics.measure('topology.terrain.aging.coasts', () => shapeTopologyCoastalShelves(elevation, topology, seaLevel, age01));""",
    """  diagnostics.measure('topology.terrain.aging.impacts', () => traceGenerationPerformance(
    'foundation.terrain.impacts',
    { topologyCells: topology.cellCount, activeCells: topology.cellCount, fullTopologyPasses: 0, allocatedBufferBytes: 0 },
    () => applyTopologyImpacts(elevation, topology, age01, impactFrequency, seaLevel, rng)
  ));
  diagnostics.measure('topology.terrain.aging.weathering', () => traceGenerationPerformance(
    'foundation.terrain.thermal-weathering',
    { topologyCells: topology.cellCount, activeCells: topology.cellCount, fullTopologyPasses: Math.max(1, Math.round(lerp(1, 5, age01))), allocatedBufferBytes: elevation.byteLength },
    () => applyTopologyThermalWeathering(elevation, topology, age01)
  ));
  diagnostics.measure('topology.terrain.aging.hydraulic', () => traceGenerationPerformance(
    'foundation.terrain.hydraulic-erosion',
    { topologyCells: topology.cellCount, activeCells: topology.cellCount, fullTopologyPasses: Math.max(1, Math.round(lerp(1, 4, age01))), allocatedBufferBytes: elevation.byteLength },
    () => applyTopologyHydraulicErosion(elevation, topology, age01)
  ));
  diagnostics.measure('topology.terrain.aging.coasts', () => traceGenerationPerformance(
    'foundation.terrain.coastal-shelves',
    { topologyCells: topology.cellCount, activeCells: topology.cellCount, fullTopologyPasses: Math.max(2, Math.round(lerp(2, 4, age01))), allocatedBufferBytes: elevation.byteLength },
    () => shapeTopologyCoastalShelves(elevation, topology, seaLevel, age01)
  ));"""
)

# Projection river-object assembly receives its own stable diagnostics phase.
replace_once(
    'packages/generator-core/src/graph/nodes/projection-assembly-node.ts',
    """    const rivers = hydrology.topologyRivers.map((river, index) =>
      input.operations.projectTopologyRiver(river, topologyOutput.topology, width, height, index)
    );""",
    """    const rivers = input.diagnostics.measure('projection.rivers', () =>
      hydrology.topologyRivers.map((river, index) =>
        input.operations.projectTopologyRiver(river, topologyOutput.topology, width, height, index)
      )
    );"""
)

# Version and release notes.
replace_once(
    'apps/desktop/src/appVersion.ts',
    "export const APP_VERSION = '0.3.53';",
    "export const APP_VERSION = '0.3.54';"
)
replace_once(
    'apps/desktop/src/release/ReleaseNotesModal.tsx',
    """        <div className="release-notes-body">
          <section>
            <p className="release-kicker">Release 0.3.52</p>""",
    """        <div className="release-notes-body">
          <section>
            <p className="release-kicker">Release 0.3.54</p>
            <h3>The poles remembered they are poles</h3>
            <ul>
              <li>Experimental now tests a mean-centered 40 C equator-to-pole temperature contrast while preserving the selected global temperature target.</li>
              <li>Climate diagnostics report hemisphere-specific high-latitude temperatures and permanent land and sea ice.</li>
              <li>Initial world foundation profiling now separates climate, hydrology, terrain-aging, and projection hot paths without changing Detailed output.</li>
              <li>Detailed remains the production baseline until the new polar climate behavior passes the fixed-seed and visual QA matrix.</li>
            </ul>
          </section>
          <section>
            <p className="release-kicker">Release 0.3.52</p>"""
)

print('Polar climate and initial foundation profiling patch applied successfully.')

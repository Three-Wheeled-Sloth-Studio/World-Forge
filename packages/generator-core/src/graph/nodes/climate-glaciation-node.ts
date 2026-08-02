import { ClimatePipelineOutput, CubedSphereTopology, GenerationConfig, SelectedValues } from '@world-forge/shared';
import { GenerationNode, NodeValidationResult } from '../types';
import { TerrainFinalizationOutput, terrainFinalizationNodeId } from './terrain-finalization-node';
import { TopologyConstructionOutput, topologyConstructionNodeId } from './topology-construction-node';
import { WaterGeologyOutput, waterGeologyNodeId } from './water-geology-node';
import { legacyLatitudeTemperatureProfile, summarizePolarClimate, type LatitudeTemperatureProfile } from '../../latitudeTemperatureProfile';

export const climateGlaciationNodeId = 'climate.glaciation';

export type ClimateGlaciationDiagnosticsRecorder = {
  measure<T>(name: string, fn: () => T): T;
};

export type ClimateGlaciationOperations = {
  generateTopologyClimate(
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
  ): void;
  generateTopologyClimateMoistureCandidate(
    climateMoisture: Float32Array,
    climatePrecipitation: Float32Array,
    climateWetnessDelta: Float32Array,
    elevation: Float32Array,
    water: Uint8Array,
    temperature: Float32Array,
    wetness: Float32Array,
    windX: Float32Array,
    windY: Float32Array,
    currentX: Float32Array,
    currentY: Float32Array,
    topology: CubedSphereTopology,
    values: SelectedValues,
    seaLevel: number
  ): void;
  assignTopologyIce(
    ice: Uint8Array,
    elevation: Float32Array,
    temperature: Float32Array,
    wetness: Float32Array,
    topology: CubedSphereTopology,
    seaLevel: number
  ): void;
  generateClimatePipelinePreview(
    config: GenerationConfig,
    values: SelectedValues,
    topology: CubedSphereTopology,
    elevation: Float32Array,
    water: Uint8Array,
    temperature: Float32Array,
    ice: Uint8Array,
    wetness: Float32Array,
    windX: Float32Array,
    windY: Float32Array,
    currentX: Float32Array,
    currentY: Float32Array,
    climateMoisture: Float32Array,
    climatePrecipitation: Float32Array,
    climateWetnessDelta: Float32Array,
    seaLevel: number
  ): ClimatePipelineOutput;
};

export type ClimateGlaciationInput = {
  config: GenerationConfig;
  values: SelectedValues;
  tideInfluence: number;
  latitudeTemperatureProfile?: LatitudeTemperatureProfile;
  diagnostics: ClimateGlaciationDiagnosticsRecorder;
  operations: ClimateGlaciationOperations;
};

export type ClimateGlaciationOutput = {
  temperature: Float32Array;
  wetness: Float32Array;
  climateMoisture: Float32Array;
  climatePrecipitation: Float32Array;
  climateWetnessDelta: Float32Array;
  ice: Uint8Array;
  windX: Float32Array;
  windY: Float32Array;
  currentX: Float32Array;
  currentY: Float32Array;
  climate: ClimatePipelineOutput;
};

export const climateGlaciationNode: GenerationNode<ClimateGlaciationInput, ClimateGlaciationOutput> = {
  id: climateGlaciationNodeId,
  version: '1',
  dependencies: [topologyConstructionNodeId, terrainFinalizationNodeId, waterGeologyNodeId],
  execute(_context, input, dependencies) {
    const topologyOutput = dependencies.get(topologyConstructionNodeId) as TopologyConstructionOutput | undefined;
    const terrain = dependencies.get(terrainFinalizationNodeId) as TerrainFinalizationOutput | undefined;
    const waterGeology = dependencies.get(waterGeologyNodeId) as WaterGeologyOutput | undefined;
    if (!topologyOutput) throw new Error(`Missing dependency output: ${topologyConstructionNodeId}`);
    if (!terrain) throw new Error(`Missing dependency output: ${terrainFinalizationNodeId}`);
    if (!waterGeology) throw new Error(`Missing dependency output: ${waterGeologyNodeId}`);

    const latitudeTemperatureProfile = latitudeTemperatureProfile ?? legacyLatitudeTemperatureProfile;
    const cellCount = topologyOutput.topology.cellCount;
    const temperature = new Float32Array(cellCount);
    const wetness = new Float32Array(cellCount);
    const climateMoisture = new Float32Array(cellCount);
    const climatePrecipitation = new Float32Array(cellCount);
    const climateWetnessDelta = new Float32Array(cellCount);
    const ice = new Uint8Array(cellCount);
    const windX = new Float32Array(cellCount);
    const windY = new Float32Array(cellCount);
    const currentX = new Float32Array(cellCount);
    const currentY = new Float32Array(cellCount);

    input.diagnostics.measure('topology.climate', () =>
      input.operations.generateTopologyClimate(
        temperature,
        wetness,
        windX,
        windY,
        currentX,
        currentY,
        terrain.elevation,
        waterGeology.water,
        topologyOutput.topology,
        input.values,
        input.tideInfluence,
        latitudeTemperatureProfile
      )
    );
    input.diagnostics.measure('topology.climate.moisture-candidate', () =>
      input.operations.generateTopologyClimateMoistureCandidate(
        climateMoisture,
        climatePrecipitation,
        climateWetnessDelta,
        terrain.elevation,
        waterGeology.water,
        temperature,
        wetness,
        windX,
        windY,
        currentX,
        currentY,
        topologyOutput.topology,
        input.values,
        terrain.seaLevel
      )
    );
    input.diagnostics.measure('topology.glaciation', () =>
      input.operations.assignTopologyIce(ice, terrain.elevation, temperature, wetness, topologyOutput.topology, terrain.seaLevel)
    );
    const climate = input.diagnostics.measure('topology.climate.pipeline.preview', () =>
      input.operations.generateClimatePipelinePreview(
        input.config,
        input.values,
        topologyOutput.topology,
        terrain.elevation,
        waterGeology.water,
        temperature,
        ice,
        wetness,
        windX,
        windY,
        currentX,
        currentY,
        climateMoisture,
        climatePrecipitation,
        climateWetnessDelta,
        terrain.seaLevel
      )
    );

    const polarClimate = summarizePolarClimate(
      temperature,
      ice,
      waterGeology.water,
      topologyOutput.topology,
      latitudeTemperatureProfile
    );
    climate.diagnostics.polarClimate = polarClimate;
    climate.notes = [
      ...climate.notes.filter((note) => !note.startsWith('Latitude-temperature profile')),
      `Latitude-temperature profile ${polarClimate.latitudeProfileId}: ${polarClimate.equatorToPoleContrastC} C equator-to-pole contrast; high-latitude means ${polarClimate.northHighLatitudeMeanTemperatureC} C north and ${polarClimate.southHighLatitudeMeanTemperatureC} C south.`
    ];

    return { temperature, wetness, climateMoisture, climatePrecipitation, climateWetnessDelta, ice, windX, windY, currentX, currentY, climate };
  },
  validate(_input, output) {
    return validateClimateGlaciation(output);
  }
};

function validateClimateGlaciation(output: ClimateGlaciationOutput): NodeValidationResult {
  const issues: NodeValidationResult['issues'] = [];
  const length = output.temperature.length;
  const layers = [
    output.wetness,
    output.climateMoisture,
    output.climatePrecipitation,
    output.climateWetnessDelta,
    output.ice,
    output.windX,
    output.windY,
    output.currentX,
    output.currentY
  ];
  if (length === 0) issues.push({ severity: 'error', message: 'Climate layer contains no cells.' });
  if (layers.some((layer) => layer.length !== length)) issues.push({ severity: 'error', message: 'Climate layer lengths do not match.' });
  for (const layer of [output.temperature, output.wetness, output.climateMoisture, output.climatePrecipitation, output.climateWetnessDelta, output.windX, output.windY, output.currentX, output.currentY]) {
    for (const value of layer) {
      if (!Number.isFinite(value)) {
        issues.push({ severity: 'error', message: 'Climate output contains a non-finite value.' });
        return { valid: false, issues };
      }
    }
  }
  if (!output.climate?.pipelineVersion) issues.push({ severity: 'error', message: 'Climate pipeline output is missing.' });
  return { valid: !issues.some((issue) => issue.severity === 'error'), issues };
}


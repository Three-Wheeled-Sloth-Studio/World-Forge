import type {
  AtmosphericWeatherPresentationArtifact,
  EnrichmentNodeRunRecord,
  MapLayers,
  Resolution,
  WeatherCloudBand,
  WeatherPresentationSystem,
  WorldProject
} from '@world-forge/shared';
import type { GenerationGraphNodeDefinition } from '../graph/generationGraph';
import type { ProjectEnrichmentNodeEvent } from './systemOrbitalContext';

export const ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID = 'project.atmospheric-weather-presentation' as const;
export const ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_VERSION = '1.0.0' as const;

export type AtmosphericWeatherPresentationSource = {
  projectId: string;
  worldId: string;
  seed: string;
  generatorVersion: string;
  appVersion: string;
  sourceCommit?: string;
  orbitalArtifactSignature: string;
  mapResolution: Resolution;
  seaLevel: number;
  oceanPercentage: number;
  averageTemperatureC: number;
  aridity: number;
  layers: Pick<MapLayers, 'water' | 'temperature' | 'wetness' | 'climateMoisture' | 'climatePrecipitation' | 'windX' | 'windY' | 'elevation'>;
};

const nodes: readonly GenerationGraphNodeDefinition[] = [
  {
    id: 'enrichment.weather.read-climate',
    stageId: 'enrichment.weather.read-climate',
    implementationId: 'generation-runtime.enrichment.weather.read-climate-v1',
    label: 'Read climate fields',
    description: 'Read the existing generated moisture, precipitation, wind, water, temperature, and terrain fields without rerunning climate generation.',
    inputs: ['core.world-project@1.0.0', 'project.system-orbital-context@1.0.0'],
    outputs: ['enrichment.weather-source@1.0.0'],
    fidelity: ['presentation']
  },
  {
    id: 'enrichment.weather.resolve-cloud-bands',
    stageId: 'enrichment.weather.resolve-cloud-bands',
    implementationId: 'generation-runtime.enrichment.weather.resolve-cloud-bands-v1',
    label: 'Resolve cloud bands',
    description: 'Derive stable climatological cloud bands from latitude, moisture, precipitation, ocean support, temperature, and terrain.',
    inputs: ['enrichment.weather-source@1.0.0'],
    outputs: ['enrichment.weather-cloud-bands@1.0.0'],
    fidelity: ['presentation']
  },
  {
    id: 'enrichment.weather.seed-systems',
    stageId: 'enrichment.weather.seed-systems',
    implementationId: 'generation-runtime.enrichment.weather.seed-systems-v1',
    label: 'Seed weather systems',
    description: 'Seed deterministic fronts, cyclones, and convective systems in climate-supported locations.',
    inputs: ['enrichment.weather-source@1.0.0', 'enrichment.weather-cloud-bands@1.0.0'],
    outputs: ['enrichment.weather-systems@1.0.0'],
    fidelity: ['presentation']
  },
  {
    id: 'enrichment.weather.resolve-advection',
    stageId: 'enrichment.weather.resolve-advection',
    implementationId: 'generation-runtime.enrichment.weather.resolve-advection-v1',
    label: 'Resolve atmospheric motion',
    description: 'Translate existing wind fields into bounded presentation drift for cloud bands and weather systems.',
    inputs: ['enrichment.weather-source@1.0.0', 'enrichment.weather-systems@1.0.0'],
    outputs: ['enrichment.weather-advection@1.0.0'],
    fidelity: ['presentation']
  },
  {
    id: 'enrichment.weather.validate',
    stageId: 'enrichment.weather.validate',
    implementationId: 'generation-runtime.enrichment.weather.validate-v1',
    label: 'Validate weather presentation',
    description: 'Validate finite bounded cloud cover, band geometry, weather-system placement, motion, and source compatibility.',
    inputs: ['enrichment.weather-cloud-bands@1.0.0', 'enrichment.weather-systems@1.0.0', 'enrichment.weather-advection@1.0.0'],
    outputs: ['enrichment.weather-validation@1.0.0'],
    fidelity: ['presentation']
  },
  {
    id: 'enrichment.weather.persist',
    stageId: 'enrichment.weather.persist',
    implementationId: 'generation-runtime.enrichment.weather.persist-v1',
    label: 'Package weather artifact',
    description: 'Package the illustrative weather model with workflow, graph, source, timing, cache, and deterministic provenance.',
    inputs: ['enrichment.weather-validation@1.0.0'],
    outputs: ['project.atmospheric-weather-presentation@1.0.0'],
    fidelity: ['presentation']
  }
];

export const atmosphericWeatherPresentationWorkflowDescriptor = {
  kind: 'enrichment' as const,
  id: ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID,
  version: ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_VERSION,
  label: 'Atmospheric Weather Presentation',
  description: 'Optional post-generation workflow that prepares deterministic illustrative cloud bands and moving weather systems for Globe view.',
  status: 'production' as const,
  artifactKey: ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID,
  nodes
};

export function atmosphericWeatherSourceFromProject(project: WorldProject): AtmosphericWeatherPresentationSource {
  const orbital = project.enrichmentArtifacts?.['project.system-orbital-context'];
  if (!orbital || orbital.artifactKey !== 'project.system-orbital-context' || orbital.status !== 'complete') {
    throw new Error('Current orbital context is required before weather presentation can be prepared.');
  }
  const world = project.primaryWorld;
  return {
    projectId: project.projectId,
    worldId: world.id,
    seed: project.seed,
    generatorVersion: project.generatorVersion,
    appVersion: project.appVersion,
    sourceCommit: project.sourceCommit,
    orbitalArtifactSignature: orbital.artifactSignature,
    mapResolution: { ...world.mapModel.resolution },
    seaLevel: world.seaLevel,
    oceanPercentage: world.oceanPercentage,
    averageTemperatureC: world.averageTemperatureC,
    aridity: world.aridity,
    layers: {
      water: world.layers.water.slice(),
      temperature: world.layers.temperature.slice(),
      wetness: world.layers.wetness.slice(),
      climateMoisture: world.layers.climateMoisture.slice(),
      climatePrecipitation: world.layers.climatePrecipitation.slice(),
      windX: world.layers.windX.slice(),
      windY: world.layers.windY.slice(),
      elevation: world.layers.elevation.slice()
    }
  };
}

export function atmosphericWeatherSourceSignature(source: AtmosphericWeatherPresentationSource): string {
  return stableSignature({
    projectId: source.projectId,
    worldId: source.worldId,
    seed: source.seed,
    generatorVersion: source.generatorVersion,
    orbitalArtifactSignature: source.orbitalArtifactSignature,
    mapResolution: source.mapResolution,
    seaLevel: round(source.seaLevel, 5),
    oceanPercentage: round(source.oceanPercentage, 4),
    averageTemperatureC: round(source.averageTemperatureC, 4),
    aridity: round(source.aridity, 5),
    layers: Object.fromEntries(Object.entries(source.layers).map(([key, values]) => [key, sampledLayerSignature(values)]))
  });
}

export function atmosphericWeatherGraphSignature(): string {
  return stableSignature(nodes.map((node) => ({
    id: node.id,
    stageId: node.stageId,
    implementationId: node.implementationId,
    inputs: node.inputs,
    outputs: node.outputs
  })));
}

export function isCurrentAtmosphericWeatherPresentationArtifact(project: WorldProject, artifact: unknown): artifact is AtmosphericWeatherPresentationArtifact {
  if (!artifact || typeof artifact !== 'object') return false;
  const candidate = artifact as Partial<AtmosphericWeatherPresentationArtifact>;
  let source: AtmosphericWeatherPresentationSource;
  try {
    source = atmosphericWeatherSourceFromProject(project);
  } catch {
    return false;
  }
  return candidate.artifactKey === ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID
    && candidate.artifactVersion === 1
    && candidate.status === 'complete'
    && candidate.weatherAuthority === 'illustrative'
    && candidate.workflow?.version === ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_VERSION
    && candidate.workflow?.graphSignature === atmosphericWeatherGraphSignature()
    && candidate.source?.sourceSignature === atmosphericWeatherSourceSignature(source)
    && candidate.validation?.valid === true;
}

export async function runAtmosphericWeatherPresentationWorkflow(source: AtmosphericWeatherPresentationSource, options: {
  onNodeEvent?: (event: ProjectEnrichmentNodeEvent) => void;
  isCancelled?: () => boolean;
  yieldControl?: () => Promise<void>;
} = {}): Promise<AtmosphericWeatherPresentationArtifact> {
  const workflowStarted = nowMs();
  const startedAt = new Date().toISOString();
  const seed = `${source.seed}:atmospheric-weather-presentation:v1`;
  const nodeRuns: EnrichmentNodeRunRecord[] = [];
  let cloudBands: WeatherCloudBand[] = [];
  let systems: WeatherPresentationSystem[] = [];
  let advection: AtmosphericWeatherPresentationArtifact['payload']['advection'] = { zonalMeanDegPerDay: 0, meridionalMeanDegPerDay: 0 };
  let meanCloudCover = 0;
  let validation: AtmosphericWeatherPresentationArtifact['validation'] = { valid: true, issues: [] };

  for (const definition of nodes) {
    if (options.isCancelled?.()) throw new Error('Project enrichment cancelled.');
    const nodeStarted = nowMs();
    const nodeStartedIso = new Date().toISOString();
    options.onNodeEvent?.({
      workflowId: ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID,
      nodeId: definition.id,
      stageId: definition.stageId,
      implementationId: definition.implementationId,
      version: '1',
      dependencies: [...definition.inputs],
      outputs: [...definition.outputs],
      phase: 'started',
      startedAt: nodeStarted,
      timestamp: nodeStarted
    });
    try {
      if (definition.id === 'enrichment.weather.read-climate') {
        validateSourceShape(source);
      } else if (definition.id === 'enrichment.weather.resolve-cloud-bands') {
        const result = deriveCloudBands(source, seed);
        cloudBands = result.cloudBands;
        meanCloudCover = result.meanCloudCover;
      } else if (definition.id === 'enrichment.weather.seed-systems') {
        systems = deriveWeatherSystems(source, seed, meanCloudCover);
      } else if (definition.id === 'enrichment.weather.resolve-advection') {
        advection = deriveAdvection(source);
      } else if (definition.id === 'enrichment.weather.validate') {
        validation = validateWeatherPresentation(source, cloudBands, systems, advection, meanCloudCover);
        if (!validation.valid) throw new Error(validation.issues.map((issue) => issue.message).join(' '));
      }
      await (options.yieldControl?.() ?? Promise.resolve());
      const completed = nowMs();
      const record: EnrichmentNodeRunRecord = {
        nodeId: definition.id,
        stageId: definition.stageId,
        implementationId: definition.implementationId,
        version: '1',
        dependencies: [...definition.inputs],
        outputs: [...definition.outputs],
        startedAt: nodeStartedIso,
        completedAt: new Date().toISOString(),
        durationMs: round(completed - nodeStarted, 3),
        validation: definition.id === 'enrichment.weather.validate' ? validation : undefined
      };
      nodeRuns.push(record);
      options.onNodeEvent?.({
        workflowId: ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID,
        nodeId: definition.id,
        stageId: definition.stageId,
        implementationId: definition.implementationId,
        version: '1',
        dependencies: [...definition.inputs],
        outputs: [...definition.outputs],
        phase: 'completed',
        startedAt: nodeStarted,
        timestamp: completed,
        durationMs: record.durationMs,
        validation: record.validation
      });
    } catch (error) {
      const timestamp = nowMs();
      options.onNodeEvent?.({
        workflowId: ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID,
        nodeId: definition.id,
        stageId: definition.stageId,
        implementationId: definition.implementationId,
        version: '1',
        dependencies: [...definition.inputs],
        outputs: [...definition.outputs],
        phase: 'failed',
        startedAt: nodeStarted,
        timestamp,
        durationMs: round(timestamp - nodeStarted, 3),
        validation: definition.id === 'enrichment.weather.validate' ? validation : undefined,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  const payload: AtmosphericWeatherPresentationArtifact['payload'] = {
    modelVersion: 'atmospheric-weather-presentation-v1',
    textureResolution: { width: 512, height: 256 },
    meanCloudCover,
    cloudBands,
    systems,
    advection
  };
  const completedAt = new Date().toISOString();
  return {
    artifactKey: ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID,
    artifactVersion: 1,
    artifactRole: 'presentation',
    weatherAuthority: 'illustrative',
    status: 'complete',
    workflow: {
      id: ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID,
      version: ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_VERSION,
      graphSignature: atmosphericWeatherGraphSignature(),
      nodes: nodeRuns
    },
    source: {
      projectId: source.projectId,
      worldId: source.worldId,
      sourceSignature: atmosphericWeatherSourceSignature(source),
      generatorVersion: source.generatorVersion,
      appVersion: source.appVersion,
      sourceCommit: source.sourceCommit,
      orbitalArtifactSignature: source.orbitalArtifactSignature
    },
    seed,
    epochIso: '2000-01-01T12:00:00.000Z',
    startedAt,
    completedAt,
    totalMs: round(nowMs() - workflowStarted, 3),
    artifactSignature: stableSignature(payload),
    validation,
    payload
  };
}

function validateSourceShape(source: AtmosphericWeatherPresentationSource): void {
  const expected = source.mapResolution.width * source.mapResolution.height;
  if (expected <= 0) throw new Error('Weather presentation requires a non-empty projected map.');
  for (const [name, values] of Object.entries(source.layers)) {
    if (values.length !== expected) throw new Error(`Weather source layer ${name} has ${values.length} cells; expected ${expected}.`);
  }
}

function deriveCloudBands(source: AtmosphericWeatherPresentationSource, seed: string): { cloudBands: WeatherCloudBand[]; meanCloudCover: number } {
  const { width, height } = source.mapResolution;
  const zoneCount = 9;
  const cloudBands: WeatherCloudBand[] = [];
  let totalPotential = 0;
  let sampledCells = 0;
  for (let zone = 0; zone < zoneCount; zone += 1) {
    const startY = Math.floor(zone * height / zoneCount);
    const endY = Math.max(startY + 1, Math.floor((zone + 1) * height / zoneCount));
    let potentialTotal = 0;
    let windTotal = 0;
    let count = 0;
    const xStep = Math.max(1, Math.floor(width / 96));
    const yStep = Math.max(1, Math.floor((endY - startY) / 8));
    for (let y = startY; y < endY; y += yStep) {
      for (let x = 0; x < width; x += xStep) {
        const index = y * width + x;
        const potential = cloudPotentialAt(source, index);
        potentialTotal += potential;
        totalPotential += potential;
        windTotal += finite(source.layers.windX[index]);
        count += 1;
        sampledCells += 1;
      }
    }
    const density = clamp01(count ? potentialTotal / count : 0);
    if (density < 0.13) continue;
    const centerY = (startY + endY) * 0.5;
    const centerLatitudeDeg = 90 - (centerY / Math.max(1, height)) * 180;
    const meanWind = count ? windTotal / count : 0;
    cloudBands.push({
      id: `cloud-band-${zone + 1}`,
      centerLatitudeDeg: round(centerLatitudeDeg, 4),
      widthDeg: round(8 + density * 18 + unit(seed, `band:${zone}:width`) * 7, 4),
      density: round(density, 5),
      waveAmplitudeDeg: round(2 + unit(seed, `band:${zone}:amplitude`) * 8, 4),
      waveNumber: 2 + Math.floor(unit(seed, `band:${zone}:wave`) * 5),
      phaseRad: round(unit(seed, `band:${zone}:phase`) * Math.PI * 2, 6),
      driftDegPerDay: round(clamp(meanWind * 16 + (centerLatitudeDeg >= 0 ? 1.5 : -1.5), -28, 28), 5)
    });
  }
  return {
    cloudBands,
    meanCloudCover: round(clamp01(sampledCells ? totalPotential / sampledCells : 0), 5)
  };
}

function deriveWeatherSystems(source: AtmosphericWeatherPresentationSource, seed: string, meanCloudCover: number): WeatherPresentationSystem[] {
  const { width, height } = source.mapResolution;
  const target = Math.max(6, Math.min(24, Math.round(6 + meanCloudCover * 20)));
  const systems: WeatherPresentationSystem[] = [];
  for (let attempt = 0; attempt < target * 8 && systems.length < target; attempt += 1) {
    const x = Math.min(width - 1, Math.floor(unit(seed, `system:${attempt}:x`) * width));
    const y = Math.min(height - 1, Math.floor(unit(seed, `system:${attempt}:y`) * height));
    const index = y * width + x;
    const potential = cloudPotentialAt(source, index);
    if (potential < 0.22 && attempt < target * 5) continue;
    systems.push(systemFromCell(source, seed, systems.length, x, y, Math.max(0.24, potential)));
  }
  while (systems.length < Math.min(6, target)) {
    const index = systems.length;
    const x = Math.floor(((index + 1) / 7) * width) % width;
    const y = Math.floor((0.22 + (index % 3) * 0.28) * height) % height;
    systems.push(systemFromCell(source, seed, index, x, y, Math.max(0.28, cloudPotentialAt(source, y * width + x))));
  }
  return systems;
}

function systemFromCell(source: AtmosphericWeatherPresentationSource, seed: string, ordinal: number, x: number, y: number, density: number): WeatherPresentationSystem {
  const { width, height } = source.mapResolution;
  const index = y * width + x;
  const latitudeDeg = 90 - ((y + 0.5) / height) * 180;
  const longitudeDeg = ((x + 0.5) / width) * 360 - 180;
  const temperature = finite(source.layers.temperature[index], source.averageTemperatureC);
  const precipitation = clamp01(finite(source.layers.climatePrecipitation[index]));
  const kindUnit = unit(seed, `system:${ordinal}:kind`);
  const kind: WeatherPresentationSystem['kind'] = Math.abs(latitudeDeg) < 25 && temperature > 18 && precipitation > 0.45
    ? 'convective'
    : Math.abs(latitudeDeg) < 68 && kindUnit > 0.34
      ? 'cyclone'
      : 'front';
  const hemisphereSpin = latitudeDeg >= 0 ? -1 : 1;
  return {
    id: `weather-system-${ordinal + 1}`,
    kind,
    latitudeDeg: round(latitudeDeg, 5),
    longitudeDeg: round(longitudeDeg, 5),
    radiusDeg: round(3.5 + density * 8 + unit(seed, `system:${ordinal}:radius`) * 4, 5),
    density: round(clamp01(density), 5),
    driftEastDegPerDay: round(clamp(finite(source.layers.windX[index]) * 20 + (latitudeDeg >= 0 ? 1 : -1), -32, 32), 5),
    driftNorthDegPerDay: round(clamp(finite(source.layers.windY[index]) * 5, -7, 7), 5),
    spinRadiansPerDay: round(hemisphereSpin * (0.28 + unit(seed, `system:${ordinal}:spin`) * 0.9), 6),
    phaseRad: round(unit(seed, `system:${ordinal}:phase`) * Math.PI * 2, 6)
  };
}

function deriveAdvection(source: AtmosphericWeatherPresentationSource): AtmosphericWeatherPresentationArtifact['payload']['advection'] {
  let zonal = 0;
  let meridional = 0;
  let count = 0;
  const stride = Math.max(1, Math.floor(source.layers.windX.length / 2048));
  for (let index = 0; index < source.layers.windX.length; index += stride) {
    zonal += finite(source.layers.windX[index]);
    meridional += finite(source.layers.windY[index]);
    count += 1;
  }
  return {
    zonalMeanDegPerDay: round(clamp((count ? zonal / count : 0) * 18, -24, 24), 5),
    meridionalMeanDegPerDay: round(clamp((count ? meridional / count : 0) * 5, -6, 6), 5)
  };
}

function validateWeatherPresentation(
  source: AtmosphericWeatherPresentationSource,
  cloudBands: WeatherCloudBand[],
  systems: WeatherPresentationSystem[],
  advection: AtmosphericWeatherPresentationArtifact['payload']['advection'],
  meanCloudCover: number
): AtmosphericWeatherPresentationArtifact['validation'] {
  const issues: AtmosphericWeatherPresentationArtifact['validation']['issues'] = [];
  if (!source.orbitalArtifactSignature) issues.push({ severity: 'error', message: 'Weather presentation has no orbital-context source signature.' });
  if (cloudBands.length < 3) issues.push({ severity: 'error', message: 'Weather presentation produced too few climatological cloud bands.' });
  if (systems.length < 4) issues.push({ severity: 'error', message: 'Weather presentation produced too few weather systems.' });
  if (!Number.isFinite(meanCloudCover) || meanCloudCover < 0 || meanCloudCover > 1) issues.push({ severity: 'error', message: 'Mean cloud cover is outside the accepted range.' });
  if (![advection.zonalMeanDegPerDay, advection.meridionalMeanDegPerDay].every(Number.isFinite)) issues.push({ severity: 'error', message: 'Atmospheric advection contains non-finite values.' });
  for (const band of cloudBands) {
    if (![band.centerLatitudeDeg, band.widthDeg, band.density, band.waveAmplitudeDeg, band.waveNumber, band.phaseRad, band.driftDegPerDay].every(Number.isFinite)) {
      issues.push({ severity: 'error', message: `Cloud band ${band.id} contains non-finite values.` });
    }
    if (Math.abs(band.centerLatitudeDeg) > 90 || band.widthDeg <= 0 || band.density < 0 || band.density > 1) {
      issues.push({ severity: 'error', message: `Cloud band ${band.id} is outside presentation bounds.` });
    }
  }
  for (const system of systems) {
    if (![system.latitudeDeg, system.longitudeDeg, system.radiusDeg, system.density, system.driftEastDegPerDay, system.driftNorthDegPerDay, system.spinRadiansPerDay, system.phaseRad].every(Number.isFinite)) {
      issues.push({ severity: 'error', message: `Weather system ${system.id} contains non-finite values.` });
    }
    if (Math.abs(system.latitudeDeg) > 90 || Math.abs(system.longitudeDeg) > 180 || system.radiusDeg <= 0 || system.density < 0 || system.density > 1) {
      issues.push({ severity: 'error', message: `Weather system ${system.id} is outside presentation bounds.` });
    }
  }
  return { valid: !issues.some((issue) => issue.severity === 'error'), issues };
}

function cloudPotentialAt(source: AtmosphericWeatherPresentationSource, index: number): number {
  const moisture = clamp01((finite(source.layers.climateMoisture[index]) + finite(source.layers.wetness[index])) * 0.5);
  const precipitation = clamp01(finite(source.layers.climatePrecipitation[index]));
  const temperature = finite(source.layers.temperature[index], source.averageTemperatureC);
  const water = source.layers.water[index] === 1 ? 1 : 0;
  const relief = Math.max(0, finite(source.layers.elevation[index]) - source.seaLevel);
  const temperatureSupport = clamp01(1 - Math.abs(temperature - 12) / 48);
  const heatPenalty = clamp01((temperature - 32) / 22);
  const orographicSupport = clamp01(relief * 2.4) * moisture;
  return clamp01(0.07 + moisture * 0.34 + precipitation * 0.38 + water * 0.11 + temperatureSupport * 0.08 + orographicSupport * 0.1 - heatPenalty * 0.09 - source.aridity * 0.04);
}

function sampledLayerSignature(values: ArrayLike<number>, maxSamples = 384): string {
  const samples: number[] = [];
  const count = Math.min(maxSamples, values.length);
  if (!count) return stableSignature(samples);
  const step = values.length / count;
  for (let index = 0; index < count; index += 1) samples.push(round(finite(values[Math.min(values.length - 1, Math.floor(index * step))]), 6));
  return stableSignature({ length: values.length, samples });
}

function unit(seed: string, key: string): number {
  let hash = 2166136261;
  const text = `${seed}:${key}`;
  for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  hash = Math.imul(hash ^ (hash >>> 15), 2246822507);
  return ((hash ^ (hash >>> 13)) >>> 0) / 4294967295;
}

function stableSignature(value: unknown): string {
  const text = JSON.stringify(canonical(value));
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return `wf-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function canonical(value: unknown): unknown {
  if (ArrayBuffer.isView(value)) return Array.from(value as unknown as ArrayLike<number>);
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, canonical(entry)]));
}

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
}

function finite(value: number | undefined, fallback = 0): number {
  return Number.isFinite(value) ? value as number : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function round(value: number, digits: number): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

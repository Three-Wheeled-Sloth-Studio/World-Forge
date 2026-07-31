from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one match, found {count}: {old[:140]!r}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')


def write(path: str, content: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')


replace_once(
    'apps/desktop/src/appVersion.ts',
    "export const APP_VERSION = '0.3.39';",
    "export const APP_VERSION = '0.3.40';"
)

replace_once(
    'packages/shared/src/index.ts',
    "export type ProjectEnrichmentArtifact = SystemOrbitalContextArtifact;\nexport type ProjectEnrichmentArtifacts = Record<string, ProjectEnrichmentArtifact>;",
    """export type WeatherCloudBand = {
  id: string;
  centerLatitudeDeg: number;
  widthDeg: number;
  density: number;
  waveAmplitudeDeg: number;
  waveNumber: number;
  phaseRad: number;
  driftDegPerDay: number;
};

export type WeatherPresentationSystemKind = 'cyclone' | 'front' | 'convective';

export type WeatherPresentationSystem = {
  id: string;
  kind: WeatherPresentationSystemKind;
  latitudeDeg: number;
  longitudeDeg: number;
  radiusDeg: number;
  density: number;
  driftEastDegPerDay: number;
  driftNorthDegPerDay: number;
  spinRadiansPerDay: number;
  phaseRad: number;
};

export type AtmosphericWeatherPresentationArtifact = {
  artifactKey: 'project.atmospheric-weather-presentation';
  artifactVersion: 1;
  artifactRole: 'presentation';
  weatherAuthority: 'illustrative';
  status: 'complete';
  workflow: {
    id: 'project.atmospheric-weather-presentation';
    version: '1.0.0';
    graphSignature: string;
    nodes: EnrichmentNodeRunRecord[];
  };
  source: {
    projectId: string;
    worldId: string;
    sourceSignature: string;
    generatorVersion: string;
    appVersion: string;
    sourceCommit?: string;
    orbitalArtifactSignature: string;
  };
  seed: string;
  epochIso: string;
  startedAt: string;
  completedAt: string;
  totalMs: number;
  artifactSignature: string;
  validation: {
    valid: boolean;
    issues: Array<{ severity: 'error' | 'warning'; message: string }>;
  };
  payload: {
    modelVersion: 'atmospheric-weather-presentation-v1';
    textureResolution: Resolution;
    meanCloudCover: number;
    cloudBands: WeatherCloudBand[];
    systems: WeatherPresentationSystem[];
    advection: {
      zonalMeanDegPerDay: number;
      meridionalMeanDegPerDay: number;
    };
  };
};

export type ProjectEnrichmentArtifact = SystemOrbitalContextArtifact | AtmosphericWeatherPresentationArtifact;
export type ProjectEnrichmentArtifacts = Record<string, ProjectEnrichmentArtifact>;"""
)

write('packages/generation-runtime/src/enrichment/atmosphericWeatherPresentation.ts', r'''import type {
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
''')

replace_once(
    'packages/generation-runtime/src/enrichment/systemOrbitalContext.ts',
    "import type { GenerationGraphNodeDefinition } from '../graph/generationGraph';\n\nexport const SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID",
    """import type { GenerationGraphNodeDefinition } from '../graph/generationGraph';
import {
  ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID,
  atmosphericWeatherPresentationWorkflowDescriptor
} from './atmosphericWeatherPresentation';

export const SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID"""
)
replace_once(
    'packages/generation-runtime/src/enrichment/systemOrbitalContext.ts',
    "export type ProjectEnrichmentWorkflowId = typeof SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID;",
    "export type ProjectEnrichmentWorkflowId = typeof SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID | typeof ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID;"
)
replace_once(
    'packages/generation-runtime/src/enrichment/systemOrbitalContext.ts',
    "  version: typeof SYSTEM_ORBITAL_CONTEXT_WORKFLOW_VERSION;",
    "  version: string;"
)
replace_once(
    'packages/generation-runtime/src/enrichment/systemOrbitalContext.ts',
    "  artifactKey: typeof SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID;",
    "  artifactKey: ProjectEnrichmentWorkflowId;"
)
replace_once(
    'packages/generation-runtime/src/enrichment/systemOrbitalContext.ts',
    "export const projectEnrichmentWorkflowDescriptors: readonly ProjectEnrichmentWorkflowDescriptor[] = [{\n  kind: 'enrichment',\n  id: SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID,\n  version: SYSTEM_ORBITAL_CONTEXT_WORKFLOW_VERSION,\n  label: 'System Orbital Context',\n  description: 'Optional post-generation workflow that prepares deterministic star, planet, and moon motion for Globe and System views.',\n  status: 'production',\n  artifactKey: SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID,\n  nodes\n}];",
    """const systemOrbitalContextWorkflowDescriptor: ProjectEnrichmentWorkflowDescriptor = {
  kind: 'enrichment',
  id: SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID,
  version: SYSTEM_ORBITAL_CONTEXT_WORKFLOW_VERSION,
  label: 'System Orbital Context',
  description: 'Optional post-generation workflow that prepares deterministic star, planet, and moon motion for Globe and System views.',
  status: 'production',
  artifactKey: SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID,
  nodes
};

export const projectEnrichmentWorkflowDescriptors: readonly ProjectEnrichmentWorkflowDescriptor[] = [
  systemOrbitalContextWorkflowDescriptor,
  atmosphericWeatherPresentationWorkflowDescriptor
];"""
)
replace_once(
    'packages/generation-runtime/src/enrichment/systemOrbitalContext.ts',
    "  return value === SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID;",
    "  return value === SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID || value === ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID;"
)

write('apps/desktop/src/enrichmentWorker.ts', r'''import type { AtmosphericWeatherPresentationArtifact, SystemOrbitalContextArtifact } from '@world-forge/shared';
import {
  runSystemOrbitalContextWorkflow,
  type ProjectEnrichmentNodeEvent,
  type SystemOrbitalContextSource
} from '@world-forge/generation-runtime/enrichment/systemOrbitalContext';
import {
  runAtmosphericWeatherPresentationWorkflow,
  type AtmosphericWeatherPresentationSource
} from '@world-forge/generation-runtime/enrichment/atmosphericWeatherPresentation';

type RunOrbitalRequest = { type: 'run-system-orbital-context'; id: string; source: SystemOrbitalContextSource };
type RunWeatherRequest = { type: 'run-atmospheric-weather-presentation'; id: string; source: AtmosphericWeatherPresentationSource };
type CancelRequest = { type: 'cancel'; id: string };
type Request = RunOrbitalRequest | RunWeatherRequest | CancelRequest;
type Response =
  | { type: 'stage'; id: string; stage: ProjectEnrichmentNodeEvent }
  | { type: 'complete'; id: string; artifact: SystemOrbitalContextArtifact | AtmosphericWeatherPresentationArtifact }
  | { type: 'cancelled'; id: string }
  | { type: 'error'; id: string; message: string };

const cancelled = new Set<string>();

self.onmessage = async (event: MessageEvent<Request>) => {
  const message = event.data;
  if (message.type === 'cancel') { cancelled.add(message.id); return; }
  const messenger = self as unknown as { postMessage(response: Response): void };
  const options = {
    isCancelled: () => cancelled.has(message.id),
    yieldControl: () => new Promise<void>((resolve) => setTimeout(resolve, 0)),
    onNodeEvent: (stage: ProjectEnrichmentNodeEvent) => messenger.postMessage({ type: 'stage', id: message.id, stage })
  };
  try {
    const artifact = message.type === 'run-system-orbital-context'
      ? await runSystemOrbitalContextWorkflow(message.source, options)
      : await runAtmosphericWeatherPresentationWorkflow(message.source, options);
    if (cancelled.has(message.id)) messenger.postMessage({ type: 'cancelled', id: message.id });
    else messenger.postMessage({ type: 'complete', id: message.id, artifact });
  } catch (error) {
    if (cancelled.has(message.id)) messenger.postMessage({ type: 'cancelled', id: message.id });
    else messenger.postMessage({ type: 'error', id: message.id, message: error instanceof Error ? error.message : String(error) });
  } finally {
    cancelled.delete(message.id);
  }
};
''')

write('apps/desktop/src/enrichment/useAtmosphericWeatherEnrichment.ts', r'''import { useCallback, useEffect, useRef, useState } from 'react';
import type { AtmosphericWeatherPresentationArtifact, WorldProject } from '@world-forge/shared';
import {
  ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID,
  atmosphericWeatherSourceFromProject,
  isCurrentAtmosphericWeatherPresentationArtifact
} from '@world-forge/generation-runtime/enrichment/atmosphericWeatherPresentation';
import {
  projectEnrichmentWorkflowDescriptor,
  type ProjectEnrichmentNodeEvent
} from '@world-forge/generation-runtime/enrichment/systemOrbitalContext';
import { generationStageTelemetryEvent, generationTelemetryEvent, type GenerationStageTelemetryDetail, type GenerationTelemetryDetail } from '../generation/generationEvents';

export type WeatherPresentationRuntimeStatus = 'idle' | 'stale' | 'running' | 'complete' | 'failed';

type WorkerResponse =
  | { type: 'stage'; id: string; stage: ProjectEnrichmentNodeEvent }
  | { type: 'complete'; id: string; artifact: AtmosphericWeatherPresentationArtifact }
  | { type: 'cancelled'; id: string }
  | { type: 'error'; id: string; message: string };

export function useAtmosphericWeatherEnrichment({ project, onProjectEnriched }: {
  project: WorldProject | null;
  onProjectEnriched: (project: WorldProject) => void;
}) {
  const [status, setStatus] = useState<WeatherPresentationRuntimeStatus>('idle');
  const [activeNodeLabel, setActiveNodeLabel] = useState('');
  const [error, setError] = useState('');
  const [elapsedMs, setElapsedMs] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const taskIdRef = useRef('');
  const taskStartedAtRef = useRef(0);
  const projectRef = useRef(project);
  const onProjectEnrichedRef = useRef(onProjectEnriched);
  const workflow = projectEnrichmentWorkflowDescriptor(ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID);
  const artifact = project?.enrichmentArtifacts?.[ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID];

  useEffect(() => { projectRef.current = project; }, [project]);
  useEffect(() => { onProjectEnrichedRef.current = onProjectEnriched; }, [onProjectEnriched]);

  useEffect(() => {
    if (!project) { setStatus('idle'); setError(''); return; }
    if (artifact && isCurrentAtmosphericWeatherPresentationArtifact(project, artifact)) setStatus('complete');
    else if (artifact) setStatus('stale');
    else if (status !== 'running') setStatus('idle');
  }, [artifact, project?.projectId]);

  useEffect(() => {
    const worker = new Worker(new URL('../enrichmentWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.id !== taskIdRef.current) return;
      if (message.type === 'stage') {
        const stage = message.stage;
        const index = Math.max(0, workflow.nodes.findIndex((node) => node.id === stage.nodeId));
        const detail: GenerationStageTelemetryDetail = {
          taskId: message.id,
          nodeId: stage.nodeId,
          stageId: stage.stageId,
          phase: stage.phase,
          progress: stage.phase === 'completed' ? 1 : 0.05,
          overallProgress: Math.min(1, (index + (stage.phase === 'completed' ? 1 : 0.05)) / workflow.nodes.length),
          label: workflow.nodes[index]?.label ?? stage.nodeId,
          startedAt: stage.startedAt,
          timestamp: stage.timestamp,
          elapsedMs: stage.durationMs,
          measured: true,
          nativeStage: false,
          graphNode: true,
          dependencies: stage.dependencies,
          version: stage.version,
          message: stage.error,
          metrics: stage.validation ? { validationValid: stage.validation.valid, validationIssueCount: stage.validation.issues.length } : undefined
        };
        setActiveNodeLabel(detail.label);
        window.dispatchEvent(new CustomEvent<GenerationStageTelemetryDetail>(generationStageTelemetryEvent, { detail }));
        return;
      }
      if (message.type === 'complete') {
        const current = projectRef.current;
        if (!current || message.artifact.source.projectId !== current.projectId) return;
        const enriched: WorldProject = {
          ...current,
          updatedAt: new Date().toISOString(),
          enrichmentArtifacts: {
            ...current.enrichmentArtifacts,
            [ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID]: message.artifact
          }
        };
        onProjectEnrichedRef.current(enriched);
        setStatus('complete');
        setActiveNodeLabel('Weather presentation ready');
        setElapsedMs(Math.max(0, performance.now() - taskStartedAtRef.current));
        const detail: GenerationTelemetryDetail = {
          phase: 'completed', taskId: message.id, progress: 1, label: workflow.label, seed: message.artifact.seed, startNodeId: null,
          startedAt: taskStartedAtRef.current, timestamp: performance.now(), project: enriched
        };
        window.dispatchEvent(new CustomEvent<GenerationTelemetryDetail>(generationTelemetryEvent, { detail }));
      } else if (message.type === 'cancelled') {
        setStatus('idle');
        setActiveNodeLabel('');
      } else {
        setStatus('failed');
        setError(message.message);
        const detail: GenerationTelemetryDetail = {
          phase: 'failed', taskId: message.id, progress: 1, label: workflow.label, seed: projectRef.current?.seed ?? '', startNodeId: null,
          startedAt: taskStartedAtRef.current, timestamp: performance.now(), error: message.message
        };
        window.dispatchEvent(new CustomEvent<GenerationTelemetryDetail>(generationTelemetryEvent, { detail }));
      }
    };
    return () => { worker.terminate(); if (workerRef.current === worker) workerRef.current = null; };
  }, []);

  useEffect(() => {
    if (status !== 'running') return;
    const refresh = () => setElapsedMs(Math.max(0, performance.now() - taskStartedAtRef.current));
    refresh();
    const timer = window.setInterval(refresh, 100);
    return () => window.clearInterval(timer);
  }, [status]);

  const ensureWeatherPresentation = useCallback(() => {
    const current = projectRef.current;
    const worker = workerRef.current;
    if (!current || !worker || status === 'running') return;
    const currentArtifact = current.enrichmentArtifacts?.[ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID];
    if (currentArtifact && isCurrentAtmosphericWeatherPresentationArtifact(current, currentArtifact)) { setStatus('complete'); return; }
    let source;
    try {
      source = atmosphericWeatherSourceFromProject(current);
    } catch (sourceError) {
      setStatus('failed');
      setError(sourceError instanceof Error ? sourceError.message : String(sourceError));
      return;
    }
    const id = `weather-enrichment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    taskIdRef.current = id;
    taskStartedAtRef.current = performance.now();
    setElapsedMs(0);
    setError('');
    setStatus('running');
    setActiveNodeLabel(workflow.nodes[0].label);
    const detail: GenerationTelemetryDetail = {
      phase: 'started', taskId: id, progress: 0, label: workflow.label, seed: current.seed, startNodeId: null,
      startedAt: taskStartedAtRef.current, timestamp: taskStartedAtRef.current
    };
    window.dispatchEvent(new CustomEvent<GenerationTelemetryDetail>(generationTelemetryEvent, { detail }));
    worker.postMessage({ type: 'run-atmospheric-weather-presentation', id, source });
  }, [status]);

  const cancelWeatherPresentation = useCallback(() => {
    if (status !== 'running' || !taskIdRef.current) return;
    workerRef.current?.postMessage({ type: 'cancel', id: taskIdRef.current });
  }, [status]);

  return {
    status,
    activeNodeLabel,
    error,
    elapsedMs,
    artifact: artifact && project && isCurrentAtmosphericWeatherPresentationArtifact(project, artifact) ? artifact : null,
    ensureWeatherPresentation,
    cancelWeatherPresentation
  };
}
''')

write('apps/desktop/src/enrichment/WeatherPresentationStatus.tsx', r'''import React from 'react';
import { CheckCircle2, CloudRain, LoaderCircle, RefreshCw, XCircle } from 'lucide-react';
import type { AtmosphericWeatherPresentationArtifact } from '@world-forge/shared';
import type { WeatherPresentationRuntimeStatus } from './useAtmosphericWeatherEnrichment';
import './weatherPresentationStatus.css';

export function WeatherPresentationStatus({ status, activeNodeLabel, error, elapsedMs, artifact, onRetry, onCancel }: {
  status: WeatherPresentationRuntimeStatus;
  activeNodeLabel: string;
  error: string;
  elapsedMs: number;
  artifact: AtmosphericWeatherPresentationArtifact | null;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const seconds = `${Math.max(0, elapsedMs / 1000).toFixed(elapsedMs < 10000 ? 1 : 0)}s`;
  return (
    <div className={`weather-presentation-status status-${status}`} data-enrichment-workflow="project.atmospheric-weather-presentation" data-enrichment-status={status} role="status" aria-live="polite">
      <span className="weather-presentation-icon">
        {status === 'running' ? <LoaderCircle size={16} className="weather-presentation-spinner" /> : status === 'failed' ? <XCircle size={16} /> : status === 'complete' ? <CheckCircle2 size={16} /> : <CloudRain size={16} />}
      </span>
      <span className="weather-presentation-copy">
        <strong>Clouds and weather</strong>
        <small>
          {status === 'running' ? `${activeNodeLabel || 'Preparing'} · ${seconds}`
            : status === 'failed' ? error || 'Preparation failed'
            : artifact ? `${artifact.payload.cloudBands.length} bands · ${artifact.payload.systems.length} systems · illustrative`
            : status === 'stale' ? 'Saved weather presentation is stale and will be rebuilt'
            : 'Preparing after first layer use'}
        </small>
      </span>
      {status === 'running' ? <button type="button" onClick={onCancel}>Cancel</button>
        : status === 'failed' || status === 'stale' ? <button type="button" onClick={onRetry}><RefreshCw size={14} />Retry</button>
          : null}
    </div>
  );
}
''')

write('apps/desktop/src/enrichment/weatherPresentationStatus.css', r'''.weather-presentation-status {
  position: absolute;
  top: 78px;
  right: 12px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 9px;
  max-width: min(430px, calc(100% - 24px));
  padding: 9px 10px;
  border: 1px solid rgba(190, 206, 215, 0.28);
  border-radius: 10px;
  background: rgba(14, 23, 29, 0.9);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
}
.weather-presentation-status.status-failed { border-color: rgba(224, 105, 99, 0.72); }
.weather-presentation-status.status-complete { border-color: rgba(116, 181, 153, 0.48); }
.weather-presentation-icon { display: inline-flex; color: #c9d8df; }
.weather-presentation-copy { display: grid; gap: 2px; min-width: 0; }
.weather-presentation-copy strong { font-size: 0.78rem; color: #f5f7f7; }
.weather-presentation-copy small { color: #afc0c8; line-height: 1.2; }
.weather-presentation-status button { display: inline-flex; align-items: center; gap: 4px; margin-left: auto; padding: 5px 7px; border-radius: 7px; }
.weather-presentation-spinner { animation: weather-presentation-spin 0.9s linear infinite; }
@keyframes weather-presentation-spin { to { transform: rotate(360deg); } }
''')

replace_once(
    'apps/desktop/src/main.tsx',
    "import { OrbitalContextStatus } from './enrichment/OrbitalContextStatus';",
    """import { OrbitalContextStatus } from './enrichment/OrbitalContextStatus';
import { useAtmosphericWeatherEnrichment } from './enrichment/useAtmosphericWeatherEnrichment';
import { WeatherPresentationStatus } from './enrichment/WeatherPresentationStatus';"""
)
replace_once(
    'apps/desktop/src/main.tsx',
    "  const [showGlobeShells, setShowGlobeShells] = useState(true);",
    """  const [showGlobeShells, setShowGlobeShells] = useState(true);
  const [showClouds, setShowClouds] = useState(false);
  const [showWeather, setShowWeather] = useState(false);"""
)
replace_once(
    'apps/desktop/src/main.tsx',
    "  const enrichment = useProjectEnrichment({ project, onProjectEnriched: setProject });",
    """  const enrichment = useProjectEnrichment({ project, onProjectEnriched: setProject });
  const weatherEnrichment = useAtmosphericWeatherEnrichment({ project, onProjectEnriched: setProject });"""
)
replace_once(
    'apps/desktop/src/main.tsx',
    "  useEffect(() => {\n    if (!project || isGenerating || viewMode !== 'globe') return;\n    enrichment.ensureOrbitalContext();\n  }, [enrichment.ensureOrbitalContext, isGenerating, project?.projectId, project?.enrichmentArtifacts?.['project.system-orbital-context'], viewMode]);",
    """  useEffect(() => {
    if (!project || isGenerating || viewMode !== 'globe') return;
    enrichment.ensureOrbitalContext();
  }, [enrichment.ensureOrbitalContext, isGenerating, project?.projectId, project?.enrichmentArtifacts?.['project.system-orbital-context'], viewMode]);

  useEffect(() => {
    if (!project || isGenerating || viewMode !== 'globe' || (!showClouds && !showWeather) || !enrichment.artifact) return;
    weatherEnrichment.ensureWeatherPresentation();
  }, [enrichment.artifact?.artifactSignature, isGenerating, project?.projectId, project?.enrichmentArtifacts?.['project.atmospheric-weather-presentation'], showClouds, showWeather, viewMode, weatherEnrichment.ensureWeatherPresentation]);"""
)
replace_once(
    'apps/desktop/src/main.tsx',
    "        showGlobeShells={showGlobeShells}\n        renderMode={renderMode}",
    """        showGlobeShells={showGlobeShells}
        showClouds={showClouds}
        showWeather={showWeather}
        renderMode={renderMode}"""
)
replace_once(
    'apps/desktop/src/main.tsx',
    "        onToggleGlobeShells={() => setShowGlobeShells((visible) => !visible)}\n        onRenderModeChange={setRenderMode}",
    """        onToggleGlobeShells={() => setShowGlobeShells((visible) => !visible)}
        onShowCloudsChange={setShowClouds}
        onShowWeatherChange={setShowWeather}
        onRenderModeChange={setRenderMode}"""
)
replace_once(
    'apps/desktop/src/main.tsx',
    "              orbitalContext={enrichment.artifact}\n              simulationClock={simulationClock}",
    """              orbitalContext={enrichment.artifact}
              weatherPresentation={weatherEnrichment.artifact}
              simulationClock={simulationClock}"""
)
replace_once(
    'apps/desktop/src/main.tsx',
    "              showGlobeShells={showGlobeShells}\n              globeDebugMode={globeDebugMode}",
    """              showGlobeShells={showGlobeShells}
              showClouds={showClouds}
              showWeather={showWeather}
              globeDebugMode={globeDebugMode}"""
)
replace_once(
    'apps/desktop/src/main.tsx',
    "            <OrbitalContextStatus\n              status={enrichment.status}\n              activeNodeLabel={enrichment.activeNodeLabel}\n              error={enrichment.error}\n              elapsedMs={enrichment.elapsedMs}\n              artifact={enrichment.artifact}\n              onRetry={enrichment.ensureOrbitalContext}\n              onCancel={enrichment.cancelOrbitalContext}\n            />",
    """            <OrbitalContextStatus
              status={enrichment.status}
              activeNodeLabel={enrichment.activeNodeLabel}
              error={enrichment.error}
              elapsedMs={enrichment.elapsedMs}
              artifact={enrichment.artifact}
              onRetry={enrichment.ensureOrbitalContext}
              onCancel={enrichment.cancelOrbitalContext}
            />
            {(showClouds || showWeather) && <WeatherPresentationStatus
              status={weatherEnrichment.status}
              activeNodeLabel={weatherEnrichment.activeNodeLabel}
              error={weatherEnrichment.error}
              elapsedMs={weatherEnrichment.elapsedMs}
              artifact={weatherEnrichment.artifact}
              onRetry={weatherEnrichment.ensureWeatherPresentation}
              onCancel={weatherEnrichment.cancelWeatherPresentation}
            />}"""
)

replace_once(
    'apps/desktop/src/workspace/WorldWorkspace.tsx',
    "import { Cloud, Globe2, Hexagon, Layers, Map, Maximize2, Search, Waves, Waypoints } from 'lucide-react';",
    "import { Cloud, CloudRain, Globe2, Hexagon, Layers, Map, Maximize2, Search, Waves, Waypoints } from 'lucide-react';"
)
replace_once(
    'apps/desktop/src/workspace/WorldWorkspace.tsx',
    "  showGlobeShells: boolean;\n  renderMode: RenderMode;",
    """  showGlobeShells: boolean;
  showClouds: boolean;
  showWeather: boolean;
  renderMode: RenderMode;"""
)
replace_once(
    'apps/desktop/src/workspace/WorldWorkspace.tsx',
    "  onToggleGlobeShells: () => void;\n  onRenderModeChange: (mode: RenderMode) => void;",
    """  onToggleGlobeShells: () => void;
  onShowCloudsChange: (visible: boolean) => void;
  onShowWeatherChange: (visible: boolean) => void;
  onRenderModeChange: (mode: RenderMode) => void;"""
)
replace_once(
    'apps/desktop/src/workspace/WorldWorkspace.tsx',
    "  showGlobeShells,\n  renderMode,",
    """  showGlobeShells,
  showClouds,
  showWeather,
  renderMode,"""
)
replace_once(
    'apps/desktop/src/workspace/WorldWorkspace.tsx',
    "  onToggleGlobeShells,\n  onRenderModeChange,",
    """  onToggleGlobeShells,
  onShowCloudsChange,
  onShowWeatherChange,
  onRenderModeChange,"""
)
replace_once(
    'apps/desktop/src/workspace/WorldWorkspace.tsx',
    "                        {viewMode === 'globe' && <button type=\"button\" className={`explore-layer-toggle shell-toggle ${showGlobeShells ? 'active' : ''}`} aria-pressed={showGlobeShells} onClick={onToggleGlobeShells}><span><Cloud size={15} />Ocean and atmosphere</span><small>{showGlobeShells ? 'On' : 'Off'}</small></button>}",
    """                        {viewMode === 'globe' && <>
                          <button type="button" className={`explore-layer-toggle shell-toggle ${showGlobeShells ? 'active' : ''}`} aria-pressed={showGlobeShells} onClick={onToggleGlobeShells}><span><Cloud size={15} />Ocean and atmosphere</span><small>{showGlobeShells ? 'On' : 'Off'}</small></button>
                          <button type="button" className={`explore-layer-toggle cloud-toggle ${showClouds ? 'active' : ''}`} aria-pressed={showClouds} onClick={() => onShowCloudsChange(!showClouds)}><span><Cloud size={15} />Clouds</span><small>{showClouds ? 'On' : 'Off'}</small></button>
                          <button type="button" className={`explore-layer-toggle weather-toggle ${showWeather ? 'active' : ''}`} aria-pressed={showWeather} onClick={() => onShowWeatherChange(!showWeather)}><span><CloudRain size={15} />Weather systems</span><small>{showWeather ? 'On' : 'Off'}</small></button>
                        </>}"""
)

replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "import type { OrbitalPresentationBody, SystemOrbitalContextArtifact, WorldProject } from '@world-forge/shared';",
    "import type { AtmosphericWeatherPresentationArtifact, OrbitalPresentationBody, SystemOrbitalContextArtifact, WeatherPresentationSystem, WorldProject } from '@world-forge/shared';"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "  orbitalContext,\n  simulationClock,",
    """  orbitalContext,
  weatherPresentation,
  simulationClock,"""
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "  showGlobeShells,\n  globeDebugMode,",
    """  showGlobeShells,
  showClouds,
  showWeather,
  globeDebugMode,"""
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "  orbitalContext: SystemOrbitalContextArtifact | null;\n  simulationClock: SystemSimulationClock;",
    """  orbitalContext: SystemOrbitalContextArtifact | null;
  weatherPresentation: AtmosphericWeatherPresentationArtifact | null;
  simulationClock: SystemSimulationClock;"""
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "  showGlobeShells: boolean;\n  globeDebugMode: GlobeDebugMode;",
    """  showGlobeShells: boolean;
  showClouds: boolean;
  showWeather: boolean;
  globeDebugMode: GlobeDebugMode;"""
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    """    const cloudAlpha = new THREE.CanvasTexture(createCloudAlphaTexture(project));
    cloudAlpha.wrapS = THREE.RepeatWrapping;
    cloudAlpha.wrapT = THREE.ClampToEdgeWrapping;
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(scale.cloudShellRadius, 128, 64),
      new THREE.MeshLambertMaterial({
        color: 0xf6f3e8,
        alphaMap: cloudAlpha,
        transparent: true,
        opacity: 0.68,
        alphaTest: 0.035,
        depthWrite: false,
        depthTest: true
      })
    );
    clouds.visible = false;
    planetSpinGroup.add(clouds);""",
    """    const initialWeatherDay = simulationClock.currentDays(performance.now());
    const cloudCanvas = createWeatherPresentationTexture(weatherPresentation, 'clouds', initialWeatherDay);
    const cloudAlpha = new THREE.CanvasTexture(cloudCanvas);
    cloudAlpha.wrapS = THREE.RepeatWrapping;
    cloudAlpha.wrapT = THREE.ClampToEdgeWrapping;
    cloudAlpha.minFilter = THREE.LinearFilter;
    cloudAlpha.magFilter = THREE.LinearFilter;
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(scale.cloudShellRadius, 128, 64),
      new THREE.MeshLambertMaterial({
        color: 0xf6f3e8,
        alphaMap: cloudAlpha,
        transparent: true,
        opacity: 0.72,
        alphaTest: 0.025,
        depthWrite: false,
        depthTest: true
      })
    );
    clouds.castShadow = true;
    clouds.receiveShadow = true;
    clouds.visible = Boolean(weatherPresentation && showClouds);
    planetSpinGroup.add(clouds);

    const weatherCanvas = createWeatherPresentationTexture(weatherPresentation, 'weather', initialWeatherDay);
    const weatherAlpha = new THREE.CanvasTexture(weatherCanvas);
    weatherAlpha.wrapS = THREE.RepeatWrapping;
    weatherAlpha.wrapT = THREE.ClampToEdgeWrapping;
    weatherAlpha.minFilter = THREE.LinearFilter;
    weatherAlpha.magFilter = THREE.LinearFilter;
    const weatherSystems = new THREE.Mesh(
      new THREE.SphereGeometry(scale.cloudShellRadius + 0.008, 128, 64),
      new THREE.MeshLambertMaterial({
        color: 0xe8f1f5,
        alphaMap: weatherAlpha,
        transparent: true,
        opacity: 0.84,
        alphaTest: 0.03,
        depthWrite: false,
        depthTest: true
      })
    );
    weatherSystems.castShadow = true;
    weatherSystems.visible = Boolean(weatherPresentation && showWeather);
    planetSpinGroup.add(weatherSystems);"""
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "    let previousSimulationDays = simulationClock.currentDays(performance.now());\n    const animate = () => {",
    """    let lastWeatherTextureDay = Number.NaN;
    const animate = () => {"""
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "      const simulationDeltaDays = simulationDays - previousSimulationDays;\n      previousSimulationDays = simulationDays;",
    ""
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "      clouds.rotation.y += simulationDeltaDays * 0.04;",
    """      if (weatherPresentation && (!Number.isFinite(lastWeatherTextureDay) || Math.abs(simulationDays - lastWeatherTextureDay) >= 0.04)) {
        renderWeatherPresentationTexture(cloudCanvas, weatherPresentation, 'clouds', simulationDays);
        renderWeatherPresentationTexture(weatherCanvas, weatherPresentation, 'weather', simulationDays);
        cloudAlpha.needsUpdate = true;
        weatherAlpha.needsUpdate = true;
        lastWeatherTextureDay = simulationDays;
        host.dataset.weatherTextureDay = simulationDays.toFixed(6);
      }"""
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "      cloudAlpha.dispose();\n      ocean.geometry.dispose();",
    """      cloudAlpha.dispose();
      weatherAlpha.dispose();
      ocean.geometry.dispose();"""
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "      clouds.geometry.dispose();\n      (clouds.material as THREE.Material).dispose();\n      atmosphere.geometry.dispose();",
    """      clouds.geometry.dispose();
      (clouds.material as THREE.Material).dispose();
      weatherSystems.geometry.dispose();
      (weatherSystems.material as THREE.Material).dispose();
      atmosphere.geometry.dispose();"""
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "  }, [focusTarget, globeDebugMode, inspectionRecord, mapMode, mapTheme, onInspect, onZoom, orbitalContext, project, renderMode, showGlobeShells, showPlates, showRivers, simulationClock]);",
    "  }, [focusTarget, globeDebugMode, inspectionRecord, mapMode, mapTheme, onInspect, onZoom, orbitalContext, project, renderMode, showClouds, showGlobeShells, showPlates, showRivers, showWeather, simulationClock, weatherPresentation]);"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "      data-moon-shadow-mode={orbitalContext ? 'pcf-soft-proof' : 'disabled'}",
    """      data-moon-shadow-mode={orbitalContext ? 'pcf-soft-proof' : 'disabled'}
      data-weather-presentation={weatherPresentation ? 'ready' : 'pending'}
      data-weather-authority={weatherPresentation?.weatherAuthority ?? 'none'}
      data-weather-band-count={weatherPresentation?.payload.cloudBands.length ?? 0}
      data-weather-system-count={weatherPresentation?.payload.systems.length ?? 0}
      data-cloud-layer={weatherPresentation && showClouds ? 'visible' : 'hidden'}
      data-weather-layer={weatherPresentation && showWeather ? 'visible' : 'hidden'}"""
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    """function createCloudAlphaTexture(project: WorldProject): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const width = 1024;
  const height = 512;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  const image = context.createImageData(width, height);
  const world = project.primaryWorld;
  const worldWidth = world.mapModel.resolution.width;
  const worldHeight = world.mapModel.resolution.height;

  for (let y = 0; y < height; y += 1) {
    const v = y / Math.max(1, height - 1);
    const latitude01 = Math.abs(v - 0.5) * 2;
    for (let x = 0; x < width; x += 1) {
      const u = x / Math.max(1, width - 1);
      const sourceX = Math.max(0, Math.min(worldWidth - 1, Math.floor(u * worldWidth)));
      const sourceY = Math.max(0, Math.min(worldHeight - 1, Math.floor(v * worldHeight)));
      const index = sourceY * worldWidth + sourceX;
      const water = world.layers.water[index] === 1 ? 1 : 0;
      const wetness = world.layers.wetness[index] ?? 0.45;
      const temperature = world.layers.temperature[index] ?? 12;
      const polarDry = smoothStep(0.72, 1, latitude01);
      const temperateBand = 1 - Math.abs(latitude01 - 0.45) / 0.55;
      const climateProbability = clamp01(0.34 + water * 0.24 + wetness * 0.28 + clamp01(temperateBand) * 0.14 - polarDry * 0.18 - (temperature > 28 ? 0.08 : 0));
      const noise = fractalCloudNoise(u, v, project.seed);
      const weighted = noise * (0.88 + climateProbability * 0.46);
      const alpha = smoothStep(0.47, 0.68, weighted) * (0.54 + climateProbability * 0.58);
      const value = Math.round(clamp01(alpha) * 255);
      const target = (y * width + x) * 4;
      image.data[target] = value;
      image.data[target + 1] = value;
      image.data[target + 2] = value;
      image.data[target + 3] = value;
    }
  }
  context.putImageData(image, 0, 0);
  normalizeHorizontalTextureSeam(canvas, 1);
  return canvas;
}""",
    r'''type WeatherTextureMode = 'clouds' | 'weather';

function createWeatherPresentationTexture(artifact: AtmosphericWeatherPresentationArtifact | null, mode: WeatherTextureMode, simulationDays: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = artifact?.payload.textureResolution.width ?? 512;
  canvas.height = artifact?.payload.textureResolution.height ?? 256;
  renderWeatherPresentationTexture(canvas, artifact, mode, simulationDays);
  return canvas;
}

function renderWeatherPresentationTexture(
  canvas: HTMLCanvasElement,
  artifact: AtmosphericWeatherPresentationArtifact | null,
  mode: WeatherTextureMode,
  simulationDays: number
): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.save();
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#000000';
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (!artifact) { context.restore(); return; }
  context.globalCompositeOperation = 'lighter';

  if (mode === 'clouds') {
    for (const band of artifact.payload.cloudBands) {
      const intensity = Math.round(82 + band.density * 145);
      context.strokeStyle = `rgb(${intensity}, ${intensity}, ${intensity})`;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.lineWidth = Math.max(3, band.widthDeg / 180 * canvas.height);
      context.beginPath();
      for (let x = 0; x <= canvas.width; x += 3) {
        const longitudeDeg = x / canvas.width * 360 - 180;
        const phase = band.phaseRad + THREE.MathUtils.degToRad(longitudeDeg * band.waveNumber + band.driftDegPerDay * simulationDays);
        const textureNoise = fractalCloudNoise(wrapUnit(x / canvas.width), clamp01((90 - band.centerLatitudeDeg) / 180), `${artifact.seed}:${band.id}`);
        const latitudeDeg = band.centerLatitudeDeg + Math.sin(phase) * band.waveAmplitudeDeg + (textureNoise - 0.5) * band.widthDeg * 0.45;
        const y = (90 - latitudeDeg) / 180 * canvas.height;
        if (x === 0) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.stroke();
    }
  }

  for (const system of artifact.payload.systems) drawWeatherPresentationSystem(context, canvas, artifact.seed, system, mode, simulationDays);
  context.restore();
  normalizeHorizontalTextureSeam(canvas, 2);
}

function drawWeatherPresentationSystem(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  seed: string,
  system: WeatherPresentationSystem,
  mode: WeatherTextureMode,
  simulationDays: number
): void {
  const longitudeDeg = wrapSignedDegrees(system.longitudeDeg + system.driftEastDegPerDay * simulationDays);
  const latitudeDeg = Math.max(-88, Math.min(88, system.latitudeDeg + Math.sin(system.phaseRad + simulationDays * 0.08) * system.driftNorthDegPerDay));
  const x = (longitudeDeg + 180) / 360 * canvas.width;
  const y = (90 - latitudeDeg) / 180 * canvas.height;
  const radius = Math.max(3, system.radiusDeg / 360 * canvas.width);
  for (const offset of [-canvas.width, 0, canvas.width]) {
    const cx = x + offset;
    const density = clamp01(system.density);
    const gradient = context.createRadialGradient(cx, y, radius * 0.12, cx, y, radius);
    const core = Math.round((mode === 'weather' ? 185 : 100) + density * (mode === 'weather' ? 70 : 115));
    gradient.addColorStop(0, `rgb(${core}, ${core}, ${core})`);
    gradient.addColorStop(0.5, `rgb(${Math.round(core * 0.72)}, ${Math.round(core * 0.72)}, ${Math.round(core * 0.72)})`);
    gradient.addColorStop(1, '#000000');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(cx, y, radius, 0, Math.PI * 2);
    context.fill();

    if (mode === 'weather') {
      context.strokeStyle = `rgb(${core}, ${core}, ${core})`;
      context.lineWidth = Math.max(1.5, radius * 0.11);
      context.lineCap = 'round';
      const turns = system.kind === 'cyclone' ? 2.4 : system.kind === 'convective' ? 1.2 : 0.7;
      const rotation = system.phaseRad + system.spinRadiansPerDay * simulationDays;
      context.beginPath();
      for (let step = 0; step <= 28; step += 1) {
        const t = step / 28;
        const angle = rotation + t * Math.PI * 2 * turns;
        const distance = system.kind === 'front' ? radius * (0.25 + t * 0.72) : radius * (0.08 + t * 0.82);
        const wobble = (seededUnit(`${seed}:${system.id}`, step, Math.floor(simulationDays * 4)) - 0.5) * radius * 0.08;
        const px = cx + Math.cos(angle) * distance;
        const py = y + Math.sin(angle) * distance * 0.62 + wobble;
        if (step === 0) context.moveTo(px, py); else context.lineTo(px, py);
      }
      context.stroke();
    }
  }
}

function wrapSignedDegrees(value: number): number {
  return ((value + 180) % 360 + 360) % 360 - 180;
}'''
)

replace_once(
    'apps/desktop/src/release/ReleaseNotesModal.tsx',
    "          <section>\n            <p className=\"release-kicker\">Release 0.3.39</p>",
    """          <section>
            <p className="release-kicker">Release 0.3.40</p>
            <h3>Weather, without pretending we own a supercomputer</h3>
            <ul>
              <li>Clouds and weather now run as a lazy, versioned, inspectable enrichment workflow after first layer use.</li>
              <li>Generated climate and wind fields seed deterministic cloud bands, fronts, cyclones, convective systems, and bounded atmospheric motion.</li>
              <li>Separate Clouds and Weather systems toggles drive illuminated moving Globe layers on the shared simulation clock.</li>
              <li>The saved artifact is explicitly illustrative presentation data, not authoritative hour-by-hour meteorology.</li>
            </ul>
          </section>

          <section>
            <p className="release-kicker">Release 0.3.39</p>"""
)

write('refs/handoffs/system-visualization-enrichment.md', '''# System Visualization and Enrichment Handoff

Updated: 2026-07-31

Status: Visualizer Cycle 2 atmospheric-weather slice implemented for validation

Planning source: `refs/planning/pi-system-visualization-and-progressive-body-enrichment.md`

Tracking issue: #35

## Delivered foundation

- Versioned project-enrichment workflow contract.
- Inspectable `project.system-orbital-context@1.0.0` graph.
- Deterministic orbital presentation payload and artifact signature.
- Lazy first-Globe execution outside ordinary generation.
- Visible running, completed, stale, cancelled, and failed UI state.
- Optional artifacts attached to `WorldProject.enrichmentArtifacts` and carried by normal project save and export serialization.
- Graph-node editor selection and completed-node timing for enrichment workflows.

## Visualizer Cycle 1 living globe

- Shared simulation clock with play, pause, speed, reset, day-of-year, and time-of-day controls.
- Deterministic procedural star background and generated star/light coupling.
- Clock-derived physical planetary spin and generated axial tilt.
- Deterministic moon traversal and nearby visible-body motion.
- Camera yaw and pitch orbit around the fixed physical system.
- Pointer hold pauses the shared clock; release restores the prior play state.
- Bounded soft-shadow proof for moons and the primary globe.
- Wireframe placeholder treatment and deliberately compressed illustrative local-system scale.

## Visualizer Cycle 2 clouds and weather

- Added inspectable `project.atmospheric-weather-presentation@1.0.0` with six instrumented nodes:
  - read generated climate fields;
  - resolve climatological cloud bands;
  - seed fronts, cyclones, and convective systems;
  - resolve bounded atmospheric advection;
  - validate the presentation model;
  - package and persist the artifact.
- The workflow runs only after Clouds or Weather systems is first enabled in Globe view and current orbital context exists.
- Existing moisture, precipitation, wind, water, temperature, elevation, and terrain data are consumed without rerunning climate generation.
- The compact artifact stores band/system parameters rather than full time-series raster frames.
- Globe view provides separate Clouds and Weather systems toggles.
- Cloud and system textures advance on the shared clock with independent system motion, proper stellar illumination, and shadow casting.
- The artifact declares `weatherAuthority: illustrative`; it is scientifically informed presentation, not authoritative meteorological history.

## Current boundaries

- No precipitation, lightning, or authoritative forecast/history simulation.
- No seasonal surface response yet.
- No full `System` Explore mode yet.
- No secondary-body generation.
- No N-body simulation or authoritative ephemeris.
- Clock-panel mobility/collapse and wider local-system framing remain backlog items.
- The primary generation graph, deterministic world signature, and replay contract remain unchanged.

## Next increment

Add the full `System` Explore mode with labels, body selection/focus, optional orbital paths, shared time controls, placeholder state, and compressed versus relative-distance presentation modes.
''')

write('refs/testing/system-visualization-enrichment-qa.md', '''# System Visualization and Enrichment QA

Updated: 2026-07-31

## Automated contract coverage

- Simulation clock advances deterministically from a fixed epoch and preserves time while paused.
- Orbital positions, visible-body vectors, star directions, and display compression remain deterministic.
- Atmospheric-weather payload and artifact signatures are deterministic for fixed climate inputs.
- Weather source signatures change when sampled climate or wind inputs change.
- Weather workflow emits six ordered, timed graph-node records.
- Cloud bands, systems, density, placement, and motion remain finite and within presentation bounds.
- The enrichment registry exposes both orbital-context and atmospheric-weather graphs to the Dev workspace.

## Focused browser acceptance

1. Generate a Fast world.
2. Confirm ordinary generation creates neither orbital nor weather enrichment.
3. Enter Globe and wait for the saved orbital artifact to complete.
4. Open Layers and enable Clouds.
5. Confirm the weather workflow visibly transitions through running to complete and persists an illustrative artifact.
6. Confirm Clouds is visible while Weather systems remains hidden.
7. Increase simulation speed and confirm the weather texture advances with shared simulation time.
8. Enable Weather systems and confirm the second moving shell is visible.
9. Disable Clouds and confirm Weather systems can remain visible independently.
10. Confirm the Globe reports non-zero band/system counts and `weatherAuthority=illustrative`.
11. Confirm no browser console errors or page-level overflow at 1440x900 and 1920x1080.

## Frame-of-reference acceptance

- Grabbing the globe pauses the shared clock and all orbital/weather motion.
- Horizontal and vertical drag change camera yaw/pitch while physical spin, stellar light, generated axial tilt, geography, and weather state remain fixed.
- Camera orbit can inspect daylight, night, poles, terminator, clouds, and weather systems without changing local planetary time.
- Releasing restores the previous play/pause state.

## Manual visual review

- Cloud bands read as broad coherent atmospheric structures rather than white noise.
- Weather systems appear as distinct fronts, cyclones, or convective concentrations without overwhelming the surface.
- Cloud and weather layers receive the same stellar lighting as the planet.
- Motion is smooth across the equirectangular seam and remains deterministic for the same artifact and clock time.
- Clouds and Weather systems can be toggled independently.
- The presentation reads as plausible and illustrative, not as a claim of forecast-grade simulation.
''')

write('packages/generation-runtime/src/enrichment/atmosphericWeatherPresentation.test.ts', r'''import { describe, expect, it } from 'vitest';
import type { AtmosphericWeatherPresentationArtifact } from '@world-forge/shared';
import {
  ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID,
  atmosphericWeatherGraphSignature,
  atmosphericWeatherPresentationWorkflowDescriptor,
  atmosphericWeatherSourceSignature,
  runAtmosphericWeatherPresentationWorkflow,
  type AtmosphericWeatherPresentationSource
} from './atmosphericWeatherPresentation';
import { projectEnrichmentWorkflowDescriptor, projectEnrichmentWorkflowForNode } from './systemOrbitalContext';

function source(): AtmosphericWeatherPresentationSource {
  const width = 24;
  const height = 12;
  const length = width * height;
  const water = new Uint8Array(length);
  const temperature = new Float32Array(length);
  const wetness = new Float32Array(length);
  const climateMoisture = new Float32Array(length);
  const climatePrecipitation = new Float32Array(length);
  const windX = new Float32Array(length);
  const windY = new Float32Array(length);
  const elevation = new Float32Array(length);
  for (let y = 0; y < height; y += 1) {
    const latitude = 90 - ((y + 0.5) / height) * 180;
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      water[index] = (x + y) % 4 === 0 ? 1 : 0;
      temperature[index] = 28 - Math.abs(latitude) * 0.42;
      wetness[index] = 0.35 + ((x * 7 + y * 3) % 10) / 20;
      climateMoisture[index] = 0.42 + ((x + y * 2) % 8) / 18;
      climatePrecipitation[index] = 0.28 + ((x * 3 + y * 5) % 11) / 16;
      windX[index] = Math.sin(latitude * Math.PI / 90) * 0.55;
      windY[index] = Math.cos((x / width) * Math.PI * 2) * 0.16;
      elevation[index] = water[index] ? -0.2 : ((x + y) % 6) / 12;
    }
  }
  return {
    projectId: 'project-weather-test',
    worldId: 'primary-world',
    seed: '1001001',
    generatorVersion: '0.1.1-mvp',
    appVersion: '0.3.40',
    sourceCommit: 'test',
    orbitalArtifactSignature: 'wf-orbital-test',
    mapResolution: { width, height },
    seaLevel: 0,
    oceanPercentage: 62,
    averageTemperatureC: 15,
    aridity: 0.48,
    layers: { water, temperature, wetness, climateMoisture, climatePrecipitation, windX, windY, elevation }
  };
}

describe('atmospheric weather presentation enrichment', () => {
  it('produces deterministic illustrative cloud and weather payloads', async () => {
    const first = await runAtmosphericWeatherPresentationWorkflow(source());
    const second = await runAtmosphericWeatherPresentationWorkflow(source());
    expect(first.payload).toEqual(second.payload);
    expect(first.artifactSignature).toBe(second.artifactSignature);
    expect(first.weatherAuthority).toBe('illustrative');
    expect(first.workflow.graphSignature).toBe(atmosphericWeatherGraphSignature());
    expect(first.validation.valid).toBe(true);
    expect(first.payload.cloudBands.length).toBeGreaterThanOrEqual(3);
    expect(first.payload.systems.length).toBeGreaterThanOrEqual(4);
  });

  it('emits ordered instrumentation and registers an inspectable graph', async () => {
    const events: string[] = [];
    const artifact = await runAtmosphericWeatherPresentationWorkflow(source(), { onNodeEvent: (event) => events.push(`${event.nodeId}:${event.phase}`) });
    expect(events).toEqual(artifact.workflow.nodes.flatMap((node) => [`${node.nodeId}:started`, `${node.nodeId}:completed`]));
    expect(artifact.workflow.nodes).toHaveLength(6);
    expect(artifact.workflow.nodes.every((node) => node.durationMs >= 0)).toBe(true);
    expect(projectEnrichmentWorkflowDescriptor(ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID).nodes).toEqual(atmosphericWeatherPresentationWorkflowDescriptor.nodes);
    expect(projectEnrichmentWorkflowForNode('enrichment.weather.seed-systems')?.id).toBe(ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID);
  });

  it('invalidates its source signature when climate inputs change', () => {
    const first = source();
    const second = source();
    second.layers.windX[12] += 0.75;
    expect(atmosphericWeatherSourceSignature(first)).not.toBe(atmosphericWeatherSourceSignature(second));
  });

  it('keeps the artifact contract presentation-only', async () => {
    const artifact: AtmosphericWeatherPresentationArtifact = await runAtmosphericWeatherPresentationWorkflow(source());
    expect(artifact.artifactKey).toBe(ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID);
    expect(artifact.artifactRole).toBe('presentation');
    expect(artifact.payload.textureResolution).toEqual({ width: 512, height: 256 });
  });
});
''')

print('Applied atmospheric weather enrichment slice.')

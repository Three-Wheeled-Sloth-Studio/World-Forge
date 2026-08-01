import type {
  EnrichmentNodeRunRecord,
  MapLayers,
  Resolution,
  SeasonalSurfaceModelArtifact,
  WorldProject
} from '@world-forge/shared';
import type { GenerationGraphNodeDefinition } from '../graph/generationGraph';
import type { ProjectEnrichmentNodeEvent } from './systemOrbitalContext';

export const SEASONAL_SURFACE_MODEL_WORKFLOW_ID = 'project.seasonal-surface-model' as const;
export const SEASONAL_SURFACE_MODEL_WORKFLOW_VERSION = '1.0.0' as const;

export type SeasonalSurfaceModelSource = {
  projectId: string;
  worldId: string;
  seed: string;
  generatorVersion: string;
  appVersion: string;
  sourceCommit?: string;
  orbitalArtifactSignature: string;
  mapResolution: Resolution;
  coefficientResolution: Resolution;
  yearLengthDays: number;
  axialTiltDeg: number;
  orbitalEccentricity: number;
  seaLevel: number;
  climateDiagnostics?: {
    landSeasonalSwingC: number;
    oceanSeasonalSwingC: number;
    axialTiltSeasonalityC: number;
  };
  layers: Pick<MapLayers, 'water' | 'temperature' | 'wetness' | 'elevation' | 'ice'>;
};

export type SeasonalSurfaceSample = {
  baselineTemperatureC: number;
  temperatureAmplitudeC: number;
  insolationAmplitude: number;
  snowPotential: number;
  seaIcePotential: number;
};

export type SeasonalSurfaceState = {
  temperatureC: number;
  temperatureDeltaC: number;
  insolationIndex: number;
  snowFraction: number;
  seaIceFraction: number;
};

const nodes: readonly GenerationGraphNodeDefinition[] = [
  {
    id: 'enrichment.seasonal.read-climate',
    stageId: 'enrichment.seasonal.read-climate',
    implementationId: 'generation-runtime.enrichment.seasonal.read-climate-v1',
    label: 'Read annual climate fields',
    description: 'Read existing annual temperature, water, wetness, elevation, ice, orbit, and axial-tilt facts without rerunning climate generation.',
    inputs: ['core.world-project@1.0.0', 'project.system-orbital-context@1.0.0'],
    outputs: ['enrichment.seasonal-source@1.0.0'],
    fidelity: ['presentation']
  },
  {
    id: 'enrichment.seasonal.resolve-insolation',
    stageId: 'enrichment.seasonal.resolve-insolation',
    implementationId: 'generation-runtime.enrichment.seasonal.resolve-insolation-v1',
    label: 'Resolve seasonal insolation',
    description: 'Derive compact latitude, axial-tilt, and eccentricity coefficients for opposite-hemisphere seasonal forcing.',
    inputs: ['enrichment.seasonal-source@1.0.0'],
    outputs: ['enrichment.seasonal-insolation@1.0.0'],
    fidelity: ['presentation']
  },
  {
    id: 'enrichment.seasonal.resolve-temperature',
    stageId: 'enrichment.seasonal.resolve-temperature',
    implementationId: 'generation-runtime.enrichment.seasonal.resolve-temperature-v1',
    label: 'Resolve thermal response',
    description: 'Derive bounded land, ocean, latitude, and elevation thermal response around the authoritative annual temperature field.',
    inputs: ['enrichment.seasonal-source@1.0.0', 'enrichment.seasonal-insolation@1.0.0'],
    outputs: ['enrichment.seasonal-temperature@1.0.0'],
    fidelity: ['presentation']
  },
  {
    id: 'enrichment.seasonal.resolve-cryosphere',
    stageId: 'enrichment.seasonal.resolve-cryosphere',
    implementationId: 'generation-runtime.enrichment.seasonal.resolve-cryosphere-v1',
    label: 'Resolve snow and sea ice',
    description: 'Derive bounded seasonal snow and sea-ice potential from annual temperature, wetness, elevation, latitude, and existing permanent ice.',
    inputs: ['enrichment.seasonal-source@1.0.0', 'enrichment.seasonal-temperature@1.0.0'],
    outputs: ['enrichment.seasonal-cryosphere@1.0.0'],
    fidelity: ['presentation']
  },
  {
    id: 'enrichment.seasonal.validate',
    stageId: 'enrichment.seasonal.validate',
    implementationId: 'generation-runtime.enrichment.seasonal.validate-v1',
    label: 'Validate seasonal surface',
    description: 'Validate compact coefficient dimensions, finite ranges, hemisphere opposition, and cryosphere bounds.',
    inputs: ['enrichment.seasonal-insolation@1.0.0', 'enrichment.seasonal-temperature@1.0.0', 'enrichment.seasonal-cryosphere@1.0.0'],
    outputs: ['enrichment.seasonal-validation@1.0.0'],
    fidelity: ['presentation']
  },
  {
    id: 'enrichment.seasonal.persist',
    stageId: 'enrichment.seasonal.persist',
    implementationId: 'generation-runtime.enrichment.seasonal.persist-v1',
    label: 'Package seasonal artifact',
    description: 'Package compact seasonal coefficients with workflow, graph, source, timing, validation, cache identity, and presentation authority.',
    inputs: ['enrichment.seasonal-validation@1.0.0'],
    outputs: ['project.seasonal-surface-model@1.0.0'],
    fidelity: ['presentation']
  }
];

export const seasonalSurfaceModelWorkflowDescriptor = {
  kind: 'enrichment' as const,
  id: SEASONAL_SURFACE_MODEL_WORKFLOW_ID,
  version: SEASONAL_SURFACE_MODEL_WORKFLOW_VERSION,
  label: 'Seasonal Surface Model',
  description: 'Optional post-generation workflow that derives compact temperature, snow, sea-ice, and insolation coefficients for Map and Globe presentation.',
  status: 'production' as const,
  artifactKey: SEASONAL_SURFACE_MODEL_WORKFLOW_ID,
  nodes
};

export function seasonalSurfaceSourceFromProject(project: WorldProject): SeasonalSurfaceModelSource {
  const orbital = project.enrichmentArtifacts?.['project.system-orbital-context'];
  if (!orbital || orbital.artifactKey !== 'project.system-orbital-context' || orbital.status !== 'complete') {
    throw new Error('Current orbital context is required before seasonal surface presentation can be prepared.');
  }
  const world = project.primaryWorld;
  const primaryBody = orbital.payload.bodies.find((body) => body.id === orbital.payload.primaryBodyId);
  return {
    projectId: project.projectId,
    worldId: world.id,
    seed: project.seed,
    generatorVersion: project.generatorVersion,
    appVersion: project.appVersion,
    sourceCommit: project.sourceCommit,
    orbitalArtifactSignature: orbital.artifactSignature,
    mapResolution: { ...world.mapModel.resolution },
    coefficientResolution: {
      width: Math.max(32, Math.min(128, world.mapModel.resolution.width)),
      height: Math.max(16, Math.min(64, world.mapModel.resolution.height))
    },
    yearLengthDays: primaryBody?.orbitalPeriodDays ?? world.climate?.calendar.yearLengthDays ?? 365.256,
    axialTiltDeg: primaryBody?.axialTiltDeg ?? world.axialTiltDeg,
    orbitalEccentricity: primaryBody?.eccentricity ?? world.orbitalEccentricity,
    seaLevel: world.seaLevel,
    climateDiagnostics: world.climate ? {
      landSeasonalSwingC: world.climate.diagnostics.landSeasonalSwingC,
      oceanSeasonalSwingC: world.climate.diagnostics.oceanSeasonalSwingC,
      axialTiltSeasonalityC: world.climate.diagnostics.axialTiltSeasonalityC
    } : undefined,
    layers: {
      water: world.layers.water.slice(),
      temperature: world.layers.temperature.slice(),
      wetness: world.layers.wetness.slice(),
      elevation: world.layers.elevation.slice(),
      ice: world.layers.ice.slice()
    }
  };
}

export function seasonalSurfaceSourceSignature(source: SeasonalSurfaceModelSource): string {
  return stableSignature({
    projectId: source.projectId,
    worldId: source.worldId,
    seed: source.seed,
    generatorVersion: source.generatorVersion,
    orbitalArtifactSignature: source.orbitalArtifactSignature,
    mapResolution: source.mapResolution,
    coefficientResolution: source.coefficientResolution,
    yearLengthDays: round(source.yearLengthDays, 5),
    axialTiltDeg: round(source.axialTiltDeg, 5),
    orbitalEccentricity: round(source.orbitalEccentricity, 6),
    seaLevel: round(source.seaLevel, 6),
    climateDiagnostics: source.climateDiagnostics,
    layers: Object.fromEntries(Object.entries(source.layers).map(([key, values]) => [key, sampledLayerSignature(values)]))
  });
}

export function seasonalSurfaceGraphSignature(): string {
  return stableSignature(nodes.map((node) => ({
    id: node.id,
    stageId: node.stageId,
    implementationId: node.implementationId,
    inputs: node.inputs,
    outputs: node.outputs
  })));
}

export function isCurrentSeasonalSurfaceModelArtifact(project: WorldProject, artifact: unknown): artifact is SeasonalSurfaceModelArtifact {
  if (!artifact || typeof artifact !== 'object') return false;
  const candidate = artifact as Partial<SeasonalSurfaceModelArtifact>;
  let source: SeasonalSurfaceModelSource;
  try {
    source = seasonalSurfaceSourceFromProject(project);
  } catch {
    return false;
  }
  return candidate.artifactKey === SEASONAL_SURFACE_MODEL_WORKFLOW_ID
    && candidate.artifactVersion === 1
    && candidate.status === 'complete'
    && candidate.seasonalAuthority === 'illustrative'
    && candidate.workflow?.version === SEASONAL_SURFACE_MODEL_WORKFLOW_VERSION
    && candidate.workflow?.graphSignature === seasonalSurfaceGraphSignature()
    && candidate.source?.sourceSignature === seasonalSurfaceSourceSignature(source)
    && candidate.validation?.valid === true;
}

export async function runSeasonalSurfaceModelWorkflow(source: SeasonalSurfaceModelSource, options: {
  onNodeEvent?: (event: ProjectEnrichmentNodeEvent) => void;
  isCancelled?: () => boolean;
  yieldControl?: () => Promise<void>;
} = {}): Promise<SeasonalSurfaceModelArtifact> {
  const workflowStarted = nowMs();
  const startedAt = new Date().toISOString();
  const seed = `${source.seed}:seasonal-surface-model:v1`;
  const nodeRuns: EnrichmentNodeRunRecord[] = [];
  const cellCount = source.coefficientResolution.width * source.coefficientResolution.height;
  let baselineTemperatureC = new Array<number>(cellCount).fill(0);
  let temperatureAmplitudeC = new Array<number>(cellCount).fill(0);
  let insolationAmplitude = new Array<number>(cellCount).fill(0);
  let snowPotential = new Array<number>(cellCount).fill(0);
  let seaIcePotential = new Array<number>(cellCount).fill(0);
  let stats: SeasonalSurfaceModelArtifact['payload']['stats'] = {
    meanTemperatureAmplitudeC: 0,
    maxTemperatureAmplitudeC: 0,
    meanSnowPotential: 0,
    meanSeaIcePotential: 0
  };
  let validation: SeasonalSurfaceModelArtifact['validation'] = { valid: true, issues: [] };

  for (const definition of nodes) {
    if (options.isCancelled?.()) throw new Error('Project enrichment cancelled.');
    const nodeStarted = nowMs();
    const nodeStartedIso = new Date().toISOString();
    options.onNodeEvent?.({
      workflowId: SEASONAL_SURFACE_MODEL_WORKFLOW_ID,
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
      if (definition.id === 'enrichment.seasonal.read-climate') {
        validateSourceShape(source);
      } else if (definition.id === 'enrichment.seasonal.resolve-insolation') {
        insolationAmplitude = deriveInsolationAmplitude(source);
      } else if (definition.id === 'enrichment.seasonal.resolve-temperature') {
        const thermal = deriveThermalResponse(source, insolationAmplitude);
        baselineTemperatureC = thermal.baselineTemperatureC;
        temperatureAmplitudeC = thermal.temperatureAmplitudeC;
      } else if (definition.id === 'enrichment.seasonal.resolve-cryosphere') {
        const cryosphere = deriveCryosphere(source, baselineTemperatureC, temperatureAmplitudeC);
        snowPotential = cryosphere.snowPotential;
        seaIcePotential = cryosphere.seaIcePotential;
        stats = summarize(temperatureAmplitudeC, snowPotential, seaIcePotential);
      } else if (definition.id === 'enrichment.seasonal.validate') {
        validation = validateSeasonalSurface(source, baselineTemperatureC, temperatureAmplitudeC, insolationAmplitude, snowPotential, seaIcePotential);
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
        validation: definition.id === 'enrichment.seasonal.validate' ? validation : undefined
      };
      nodeRuns.push(record);
      options.onNodeEvent?.({
        workflowId: SEASONAL_SURFACE_MODEL_WORKFLOW_ID,
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
        workflowId: SEASONAL_SURFACE_MODEL_WORKFLOW_ID,
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
        validation: definition.id === 'enrichment.seasonal.validate' ? validation : undefined,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  const payload: SeasonalSurfaceModelArtifact['payload'] = {
    modelVersion: 'seasonal-surface-model-v1',
    coefficientResolution: { ...source.coefficientResolution },
    yearLengthDays: source.yearLengthDays,
    northSummerPeakDay: round(source.yearLengthDays * 0.47, 4),
    periapsisDay: 1,
    eccentricityTemperatureAmplitudeC: round(clamp(source.orbitalEccentricity, 0, 0.3) * 14, 5),
    baselineTemperatureC,
    temperatureAmplitudeC,
    insolationAmplitude,
    snowPotential,
    seaIcePotential,
    stats
  };
  const completedAt = new Date().toISOString();
  return {
    artifactKey: SEASONAL_SURFACE_MODEL_WORKFLOW_ID,
    artifactVersion: 1,
    artifactRole: 'presentation',
    seasonalAuthority: 'illustrative',
    status: 'complete',
    workflow: {
      id: SEASONAL_SURFACE_MODEL_WORKFLOW_ID,
      version: SEASONAL_SURFACE_MODEL_WORKFLOW_VERSION,
      graphSignature: seasonalSurfaceGraphSignature(),
      nodes: nodeRuns
    },
    source: {
      projectId: source.projectId,
      worldId: source.worldId,
      sourceSignature: seasonalSurfaceSourceSignature(source),
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

export function seasonalSurfaceStateAtSample(
  artifact: SeasonalSurfaceModelArtifact,
  sample: SeasonalSurfaceSample,
  dayOfYear: number
): SeasonalSurfaceState {
  const yearLengthDays = Math.max(1, artifact.payload.yearLengthDays);
  const seasonalPhase = Math.cos(Math.PI * 2 * (dayOfYear - artifact.payload.northSummerPeakDay) / yearLengthDays);
  const eccentricityPhase = Math.cos(Math.PI * 2 * (dayOfYear - artifact.payload.periapsisDay) / yearLengthDays);
  const eccentricityDelta = artifact.payload.eccentricityTemperatureAmplitudeC * eccentricityPhase;
  const temperatureDeltaC = sample.temperatureAmplitudeC * seasonalPhase + eccentricityDelta;
  const temperatureC = sample.baselineTemperatureC + temperatureDeltaC;
  const insolationIndex = clamp01(0.5 + sample.insolationAmplitude * seasonalPhase * 0.45 + eccentricityPhase * artifact.payload.eccentricityTemperatureAmplitudeC * 0.01);
  return {
    temperatureC,
    temperatureDeltaC,
    insolationIndex,
    snowFraction: clamp01(sample.snowPotential * clamp01((4 - temperatureC) / 12)),
    seaIceFraction: clamp01(sample.seaIcePotential * clamp01((1 - temperatureC) / 10))
  };
}

function validateSourceShape(source: SeasonalSurfaceModelSource): void {
  const expected = source.mapResolution.width * source.mapResolution.height;
  const coefficientCells = source.coefficientResolution.width * source.coefficientResolution.height;
  if (expected <= 0 || coefficientCells <= 0) throw new Error('Seasonal surface presentation requires non-empty projected source and coefficient grids.');
  if (!Number.isFinite(source.yearLengthDays) || source.yearLengthDays <= 0) throw new Error('Seasonal surface presentation requires a positive year length.');
  for (const [name, values] of Object.entries(source.layers)) {
    if (values.length !== expected) throw new Error(`Seasonal source layer ${name} has ${values.length} cells; expected ${expected}.`);
  }
}

function deriveInsolationAmplitude(source: SeasonalSurfaceModelSource): number[] {
  const { width, height } = source.coefficientResolution;
  const tiltScale = clamp(Math.abs(source.axialTiltDeg) / 23.44, 0.1, 2.4);
  const result = new Array<number>(width * height);
  for (let y = 0; y < height; y += 1) {
    const latitudeRad = (0.5 - (y + 0.5) / height) * Math.PI;
    const signedLatitude = Math.sin(latitudeRad);
    for (let x = 0; x < width; x += 1) {
      result[y * width + x] = round(clamp(signedLatitude * tiltScale * 0.82, -1, 1), 6);
    }
  }
  return result;
}

function deriveThermalResponse(source: SeasonalSurfaceModelSource, insolationAmplitude: number[]): {
  baselineTemperatureC: number[];
  temperatureAmplitudeC: number[];
} {
  const { width, height } = source.coefficientResolution;
  const baselineTemperatureC = new Array<number>(width * height);
  const temperatureAmplitudeC = new Array<number>(width * height);
  const tiltScale = clamp(Math.abs(source.axialTiltDeg) / 23.44, 0.15, 2.4);
  const landHalfSwing = clamp((source.climateDiagnostics?.landSeasonalSwingC ?? 26 * tiltScale) / 2, 4, 30);
  const oceanHalfSwing = clamp((source.climateDiagnostics?.oceanSeasonalSwingC ?? 10 * tiltScale) / 2, 1.5, 16);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const target = y * width + x;
      const u = (x + 0.5) / width;
      const v = (y + 0.5) / height;
      const water = sampleSource(source.layers.water, source.mapResolution, u, v) >= 0.5;
      const baseline = sampleSource(source.layers.temperature, source.mapResolution, u, v);
      const elevation = sampleSource(source.layers.elevation, source.mapResolution, u, v);
      const latitudeStrength = Math.pow(Math.min(1, Math.abs(insolationAmplitude[target]) / Math.max(0.1, tiltScale * 0.82)), 0.78);
      const elevationBoost = water ? 1 : 1 + clamp((elevation - source.seaLevel) * 0.35, 0, 0.22);
      const sign = Math.sign(insolationAmplitude[target]);
      baselineTemperatureC[target] = round(baseline, 5);
      temperatureAmplitudeC[target] = round(sign * latitudeStrength * (water ? oceanHalfSwing : landHalfSwing) * elevationBoost, 5);
    }
  }
  return { baselineTemperatureC, temperatureAmplitudeC };
}

function deriveCryosphere(
  source: SeasonalSurfaceModelSource,
  baselineTemperatureC: number[],
  temperatureAmplitudeC: number[]
): { snowPotential: number[]; seaIcePotential: number[] } {
  const { width, height } = source.coefficientResolution;
  const snowPotential = new Array<number>(width * height);
  const seaIcePotential = new Array<number>(width * height);
  for (let y = 0; y < height; y += 1) {
    const latitudeDeg = Math.abs(90 - ((y + 0.5) / height) * 180);
    const latitudeSupport = clamp01((latitudeDeg - 24) / 58);
    for (let x = 0; x < width; x += 1) {
      const target = y * width + x;
      const u = (x + 0.5) / width;
      const v = (y + 0.5) / height;
      const water = sampleSource(source.layers.water, source.mapResolution, u, v) >= 0.5;
      const wetness = clamp01(sampleSource(source.layers.wetness, source.mapResolution, u, v));
      const elevation = sampleSource(source.layers.elevation, source.mapResolution, u, v);
      const permanentIce = sampleSource(source.layers.ice, source.mapResolution, u, v) >= 0.5 ? 1 : 0;
      const annualColdSupport = clamp01((10 - baselineTemperatureC[target]) / 24);
      const seasonalColdSupport = clamp01(Math.abs(temperatureAmplitudeC[target]) / 18);
      const altitudeSupport = clamp01((elevation - source.seaLevel) / 0.55);
      snowPotential[target] = water ? 0 : round(clamp01(
        Math.max(latitudeSupport, annualColdSupport * 0.85, altitudeSupport * 0.8)
        * (0.25 + wetness * 0.58 + seasonalColdSupport * 0.22 + permanentIce * 0.35)
      ), 5);
      seaIcePotential[target] = water ? round(clamp01(
        Math.max(latitudeSupport, annualColdSupport * 0.92)
        * (0.4 + seasonalColdSupport * 0.38 + permanentIce * 0.48)
      ), 5) : 0;
    }
  }
  return { snowPotential, seaIcePotential };
}

function summarize(temperatureAmplitudeC: number[], snowPotential: number[], seaIcePotential: number[]): SeasonalSurfaceModelArtifact['payload']['stats'] {
  const count = Math.max(1, temperatureAmplitudeC.length);
  return {
    meanTemperatureAmplitudeC: round(temperatureAmplitudeC.reduce((sum, value) => sum + Math.abs(value), 0) / count, 5),
    maxTemperatureAmplitudeC: round(Math.max(0, ...temperatureAmplitudeC.map((value) => Math.abs(value))), 5),
    meanSnowPotential: round(snowPotential.reduce((sum, value) => sum + value, 0) / count, 5),
    meanSeaIcePotential: round(seaIcePotential.reduce((sum, value) => sum + value, 0) / count, 5)
  };
}

function validateSeasonalSurface(
  source: SeasonalSurfaceModelSource,
  baselineTemperatureC: number[],
  temperatureAmplitudeC: number[],
  insolationAmplitude: number[],
  snowPotential: number[],
  seaIcePotential: number[]
): SeasonalSurfaceModelArtifact['validation'] {
  const issues: SeasonalSurfaceModelArtifact['validation']['issues'] = [];
  const expected = source.coefficientResolution.width * source.coefficientResolution.height;
  for (const [name, values] of Object.entries({ baselineTemperatureC, temperatureAmplitudeC, insolationAmplitude, snowPotential, seaIcePotential })) {
    if (values.length !== expected) issues.push({ severity: 'error', message: `${name} has ${values.length} cells; expected ${expected}.` });
    if (values.some((value) => !Number.isFinite(value))) issues.push({ severity: 'error', message: `${name} contains non-finite values.` });
  }
  if (insolationAmplitude.some((value) => value < -1.000001 || value > 1.000001)) issues.push({ severity: 'error', message: 'Insolation amplitude escaped its signed unit range.' });
  if (snowPotential.some((value) => value < 0 || value > 1) || seaIcePotential.some((value) => value < 0 || value > 1)) {
    issues.push({ severity: 'error', message: 'Cryosphere potential escaped the unit range.' });
  }
  const north = insolationAmplitude.slice(0, Math.max(1, Math.floor(expected / 4))).reduce((sum, value) => sum + value, 0);
  const south = insolationAmplitude.slice(Math.floor(expected * 0.75)).reduce((sum, value) => sum + value, 0);
  if (!(north > 0 && south < 0)) issues.push({ severity: 'error', message: 'Seasonal forcing does not oppose the northern and southern hemispheres.' });
  return { valid: !issues.some((issue) => issue.severity === 'error'), issues };
}

function sampleSource(values: ArrayLike<number>, resolution: Resolution, u: number, v: number): number {
  const sourceX = wrapUnit(u) * resolution.width - 0.5;
  const sourceY = clamp01(v) * resolution.height - 0.5;
  const x0 = Math.floor(sourceX);
  const y0 = Math.max(0, Math.min(resolution.height - 1, Math.floor(sourceY)));
  const x1 = x0 + 1;
  const y1 = Math.max(0, Math.min(resolution.height - 1, y0 + 1));
  const tx = sourceX - Math.floor(sourceX);
  const ty = sourceY - Math.floor(sourceY);
  const sample = (x: number, y: number) => values[y * resolution.width + ((x % resolution.width) + resolution.width) % resolution.width] ?? 0;
  const top = sample(x0, y0) + (sample(x1, y0) - sample(x0, y0)) * tx;
  const bottom = sample(x0, y1) + (sample(x1, y1) - sample(x0, y1)) * tx;
  return top + (bottom - top) * ty;
}

function sampledLayerSignature(values: ArrayLike<number>): string {
  const length = values.length;
  const sampleCount = Math.min(128, length);
  const samples: number[] = [];
  for (let index = 0; index < sampleCount; index += 1) {
    const sourceIndex = sampleCount === 1 ? 0 : Math.round(index * (length - 1) / (sampleCount - 1));
    samples.push(round(Number(values[sourceIndex] ?? 0), 6));
  }
  return stableSignature({ length, samples });
}

function stableSignature(value: unknown): string {
  const text = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function wrapUnit(value: number): number {
  return ((value % 1) + 1) % 1;
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

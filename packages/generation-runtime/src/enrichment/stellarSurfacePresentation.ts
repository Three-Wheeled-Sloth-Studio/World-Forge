import type {
  EnrichmentNodeRunRecord,
  StellarSurfaceFeature,
  StellarSurfacePresentationArtifact,
  SystemOrbitalContextArtifact,
  WorldProject
} from '@world-forge/shared';
import type { GenerationGraphNodeDefinition } from '../graph/generationGraph';
import type { ProjectEnrichmentNodeEvent } from './systemOrbitalContext';

export const STELLAR_SURFACE_PRESENTATION_WORKFLOW_ID = 'project.stellar-surface-presentation' as const;
export const STELLAR_SURFACE_PRESENTATION_WORKFLOW_VERSION = '1.0.0' as const;
export const EXPERIMENTAL_WORLD_WORKFLOW_ID = 'core.world-generation-experimental' as const;

type WorkflowGenerationConfig = WorldProject['config'] & { workflowId?: string };

export type StellarSurfacePresentationSource = {
  projectId: string;
  worldId: string;
  starId: string;
  seed: string;
  generatorVersion: string;
  appVersion: string;
  sourceCommit?: string;
  worldWorkflowId: string;
  orbitalArtifactSignature: string;
  stellarAgeGy: number;
  starType: string;
  massSolar: number;
  radiusSolar: number;
  luminositySolar: number;
  effectiveTemperatureK: number;
  colorHex: string;
};

export type StellarSurfaceAvailability = {
  available: boolean;
  reason: string;
};

const nodes: readonly GenerationGraphNodeDefinition[] = [
  {
    id: 'enrichment.stellar.read-star',
    stageId: 'enrichment.stellar.read-star',
    implementationId: 'generation-runtime.enrichment.stellar.read-star-v1',
    label: 'Read stellar scaffold',
    description: 'Read the current generated star and orbital presentation without mutating the system scaffold.',
    inputs: ['core.world-project@1.0.0', 'project.system-orbital-context@1.0.0'],
    outputs: ['enrichment.stellar-source@1.0.0'],
    fidelity: ['presentation']
  },
  {
    id: 'enrichment.stellar.resolve-activity',
    stageId: 'enrichment.stellar.resolve-activity',
    implementationId: 'generation-runtime.enrichment.stellar.resolve-activity-v1',
    label: 'Resolve stellar activity',
    description: 'Derive bounded rotation, differential rotation, magnetic-cycle phase, flare cadence, and activity class from the generated stellar scaffold.',
    inputs: ['enrichment.stellar-source@1.0.0'],
    outputs: ['enrichment.stellar-activity@1.0.0'],
    fidelity: ['presentation']
  },
  {
    id: 'enrichment.stellar.seed-granulation',
    stageId: 'enrichment.stellar.seed-granulation',
    implementationId: 'generation-runtime.enrichment.stellar.seed-granulation-v1',
    label: 'Seed photosphere granulation',
    description: 'Create deterministic granulation scale, contrast, and phase controls for the generated photosphere texture.',
    inputs: ['enrichment.stellar-activity@1.0.0'],
    outputs: ['enrichment.stellar-granulation@1.0.0'],
    fidelity: ['presentation']
  },
  {
    id: 'enrichment.stellar.seed-active-regions',
    stageId: 'enrichment.stellar.seed-active-regions',
    implementationId: 'generation-runtime.enrichment.stellar.seed-active-regions-v1',
    label: 'Seed active regions',
    description: 'Seed deterministic starspots and faculae with activity-scaled latitude, size, contrast, and lifetime.',
    inputs: ['enrichment.stellar-activity@1.0.0', 'enrichment.stellar-granulation@1.0.0'],
    outputs: ['enrichment.stellar-spots@1.0.0', 'enrichment.stellar-faculae@1.0.0'],
    fidelity: ['presentation']
  },
  {
    id: 'enrichment.stellar.resolve-corona',
    stageId: 'enrichment.stellar.resolve-corona',
    implementationId: 'generation-runtime.enrichment.stellar.resolve-corona-v1',
    label: 'Resolve corona',
    description: 'Derive a bounded glow shell and deterministic coronal streamer presentation from stellar activity.',
    inputs: ['enrichment.stellar-activity@1.0.0', 'enrichment.stellar-spots@1.0.0'],
    outputs: ['enrichment.stellar-corona@1.0.0'],
    fidelity: ['presentation']
  },
  {
    id: 'enrichment.stellar.validate',
    stageId: 'enrichment.stellar.validate',
    implementationId: 'generation-runtime.enrichment.stellar.validate-v1',
    label: 'Validate stellar presentation',
    description: 'Validate source compatibility, finite bounded activity values, feature geometry, and presentation-only authority.',
    inputs: ['enrichment.stellar-granulation@1.0.0', 'enrichment.stellar-spots@1.0.0', 'enrichment.stellar-faculae@1.0.0', 'enrichment.stellar-corona@1.0.0'],
    outputs: ['enrichment.stellar-validation@1.0.0'],
    fidelity: ['presentation']
  },
  {
    id: 'enrichment.stellar.persist',
    stageId: 'enrichment.stellar.persist',
    implementationId: 'generation-runtime.enrichment.stellar.persist-v1',
    label: 'Package stellar artifact',
    description: 'Package the generated photosphere and activity presentation with deterministic provenance, timings, graph identity, and source invalidation.',
    inputs: ['enrichment.stellar-validation@1.0.0'],
    outputs: ['project.stellar-surface-presentation@1.0.0'],
    fidelity: ['presentation']
  }
];

export const stellarSurfacePresentationWorkflowDescriptor = {
  kind: 'enrichment' as const,
  id: STELLAR_SURFACE_PRESENTATION_WORKFLOW_ID,
  version: STELLAR_SURFACE_PRESENTATION_WORKFLOW_VERSION,
  label: 'Stellar Surface Presentation',
  description: 'Experimental optional workflow that generates deterministic photosphere granulation, active regions, rotation, and corona for System view.',
  status: 'experimental' as const,
  artifactKey: STELLAR_SURFACE_PRESENTATION_WORKFLOW_ID,
  nodes
};

export function stellarSurfaceAvailability(
  project: WorldProject | null,
  orbitalContext: SystemOrbitalContextArtifact | null
): StellarSurfaceAvailability {
  if (!project) return { available: false, reason: 'Generate a world before preparing stellar detail.' };
  const workflowId = (project.config as WorkflowGenerationConfig).workflowId ?? 'core.performance-foundation';
  if (workflowId !== EXPERIMENTAL_WORLD_WORKFLOW_ID) {
    return { available: false, reason: 'Stellar surface generation is currently available only for worlds generated with Experimental.' };
  }
  if (!orbitalContext || orbitalContext.source.projectId !== project.projectId) {
    return { available: false, reason: 'Current orbital context is required before preparing stellar detail.' };
  }
  if (orbitalContext.payload.star.id !== project.solarSystem.star.id) {
    return { available: false, reason: 'The orbital star does not match the current generated system.' };
  }
  return { available: true, reason: 'Ready for the Experimental stellar surface workflow.' };
}

export function stellarSurfaceSourceFromProject(
  project: WorldProject,
  orbitalContext: SystemOrbitalContextArtifact
): StellarSurfacePresentationSource {
  const availability = stellarSurfaceAvailability(project, orbitalContext);
  if (!availability.available) throw new Error(availability.reason);
  const star = orbitalContext.payload.star;
  const workflowId = (project.config as WorkflowGenerationConfig).workflowId ?? 'core.performance-foundation';
  return {
    projectId: project.projectId,
    worldId: project.primaryWorld.id,
    starId: star.id,
    seed: project.seed,
    generatorVersion: project.generatorVersion,
    appVersion: project.appVersion,
    sourceCommit: project.sourceCommit,
    worldWorkflowId: workflowId,
    orbitalArtifactSignature: orbitalContext.artifactSignature,
    stellarAgeGy: project.solarSystem.ageGy,
    starType: project.solarSystem.star.type,
    massSolar: star.massSolar,
    radiusSolar: star.radiusSolar,
    luminositySolar: star.luminositySolar,
    effectiveTemperatureK: star.effectiveTemperatureK,
    colorHex: star.colorHex
  };
}

export function stellarSurfaceSourceSignature(source: StellarSurfacePresentationSource): string {
  return stableSignature({
    projectId: source.projectId,
    worldId: source.worldId,
    starId: source.starId,
    seed: source.seed,
    generatorVersion: source.generatorVersion,
    worldWorkflowId: source.worldWorkflowId,
    orbitalArtifactSignature: source.orbitalArtifactSignature,
    stellarAgeGy: round(source.stellarAgeGy, 5),
    starType: source.starType,
    massSolar: round(source.massSolar, 6),
    radiusSolar: round(source.radiusSolar, 6),
    luminositySolar: round(source.luminositySolar, 6),
    effectiveTemperatureK: round(source.effectiveTemperatureK, 3),
    colorHex: source.colorHex
  });
}

export function stellarSurfaceGraphSignature(): string {
  return stableSignature(nodes.map((node) => ({
    id: node.id,
    stageId: node.stageId,
    implementationId: node.implementationId,
    inputs: node.inputs,
    outputs: node.outputs
  })));
}

export function isCurrentStellarSurfacePresentationArtifact(
  project: WorldProject,
  orbitalContext: SystemOrbitalContextArtifact,
  artifact: unknown
): artifact is StellarSurfacePresentationArtifact {
  if (!artifact || typeof artifact !== 'object') return false;
  const candidate = artifact as Partial<StellarSurfacePresentationArtifact>;
  let source: StellarSurfacePresentationSource;
  try {
    source = stellarSurfaceSourceFromProject(project, orbitalContext);
  } catch {
    return false;
  }
  return candidate.artifactKey === STELLAR_SURFACE_PRESENTATION_WORKFLOW_ID
    && candidate.artifactVersion === 1
    && candidate.status === 'complete'
    && candidate.stellarAuthority === 'illustrative'
    && candidate.workflow?.version === STELLAR_SURFACE_PRESENTATION_WORKFLOW_VERSION
    && candidate.workflow?.graphSignature === stellarSurfaceGraphSignature()
    && candidate.source?.sourceSignature === stellarSurfaceSourceSignature(source)
    && candidate.validation?.valid === true;
}

export async function runStellarSurfacePresentationWorkflow(source: StellarSurfacePresentationSource, options: {
  onNodeEvent?: (event: ProjectEnrichmentNodeEvent) => void;
  isCancelled?: () => boolean;
  yieldControl?: () => Promise<void>;
} = {}): Promise<StellarSurfacePresentationArtifact> {
  if (source.worldWorkflowId !== EXPERIMENTAL_WORLD_WORKFLOW_ID) {
    throw new Error('Stellar surface presentation is currently restricted to the Experimental world workflow.');
  }
  const workflowStarted = nowMs();
  const startedAt = new Date().toISOString();
  const seed = `${source.seed}:${source.starId}:stellar-surface-presentation:v1`;
  const nodeRuns: EnrichmentNodeRunRecord[] = [];
  let activity = deriveActivity(source, seed);
  let granulation: StellarSurfacePresentationArtifact['payload']['granulation'] = { cellScale: 0.08, contrast: 0.1, phase: 0 };
  let spots: StellarSurfaceFeature[] = [];
  let faculae: StellarSurfaceFeature[] = [];
  let corona: StellarSurfacePresentationArtifact['payload']['corona'] = { glowStrength: 0.2, haloScale: 1.3, streamers: [] };
  let validation: StellarSurfacePresentationArtifact['validation'] = { valid: true, issues: [] };

  for (const definition of nodes) {
    if (options.isCancelled?.()) throw new Error('Project enrichment cancelled.');
    const nodeStarted = nowMs();
    const nodeStartedIso = new Date().toISOString();
    options.onNodeEvent?.({
      workflowId: STELLAR_SURFACE_PRESENTATION_WORKFLOW_ID,
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
      if (definition.id === 'enrichment.stellar.read-star') {
        validateSource(source);
      } else if (definition.id === 'enrichment.stellar.resolve-activity') {
        activity = deriveActivity(source, seed);
      } else if (definition.id === 'enrichment.stellar.seed-granulation') {
        granulation = deriveGranulation(source, seed, activity.activityIndex);
      } else if (definition.id === 'enrichment.stellar.seed-active-regions') {
        spots = deriveFeatures(seed, 'spot', activity.activityIndex, activity.cyclePhase);
        faculae = deriveFeatures(seed, 'facula', activity.activityIndex, activity.cyclePhase);
      } else if (definition.id === 'enrichment.stellar.resolve-corona') {
        corona = deriveCorona(seed, activity.activityIndex);
      } else if (definition.id === 'enrichment.stellar.validate') {
        validation = validatePresentation(source, activity, granulation, spots, faculae, corona);
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
        validation: definition.id === 'enrichment.stellar.validate' ? validation : undefined
      };
      nodeRuns.push(record);
      options.onNodeEvent?.({
        workflowId: STELLAR_SURFACE_PRESENTATION_WORKFLOW_ID,
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
        workflowId: STELLAR_SURFACE_PRESENTATION_WORKFLOW_ID,
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
        validation: definition.id === 'enrichment.stellar.validate' ? validation : undefined,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  const payload: StellarSurfacePresentationArtifact['payload'] = {
    modelVersion: 'stellar-surface-presentation-v1',
    baseColorHex: source.colorHex,
    effectiveTemperatureK: source.effectiveTemperatureK,
    rotationPeriodDays: activity.rotationPeriodDays,
    differentialRotationFraction: activity.differentialRotationFraction,
    activityIndex: activity.activityIndex,
    activityClass: activity.activityClass,
    cyclePeriodYears: activity.cyclePeriodYears,
    cyclePhase: activity.cyclePhase,
    flareRatePerDay: activity.flareRatePerDay,
    granulation,
    spots,
    faculae,
    corona
  };
  const completedAt = new Date().toISOString();
  return {
    artifactKey: STELLAR_SURFACE_PRESENTATION_WORKFLOW_ID,
    artifactVersion: 1,
    artifactRole: 'presentation',
    stellarAuthority: 'illustrative',
    status: 'complete',
    workflow: {
      id: STELLAR_SURFACE_PRESENTATION_WORKFLOW_ID,
      version: STELLAR_SURFACE_PRESENTATION_WORKFLOW_VERSION,
      graphSignature: stellarSurfaceGraphSignature(),
      nodes: nodeRuns
    },
    source: {
      projectId: source.projectId,
      worldId: source.worldId,
      starId: source.starId,
      sourceSignature: stellarSurfaceSourceSignature(source),
      orbitalArtifactSignature: source.orbitalArtifactSignature,
      generatorVersion: source.generatorVersion,
      appVersion: source.appVersion,
      sourceCommit: source.sourceCommit,
      worldWorkflowId: source.worldWorkflowId
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

function deriveActivity(source: StellarSurfacePresentationSource, seed: string) {
  const type = source.starType.trim().toLowerCase();
  const youth = clamp(1 - source.stellarAgeGy / 10.5);
  const spectralAdjustment = type.startsWith('f') ? 0.08 : type.startsWith('k') ? 0.04 : 0;
  const activityIndex = round(clamp(0.12 + youth * 0.58 + spectralAdjustment + hashUnit(seed, 3) * 0.1), 5);
  const activityClass = activityIndex < 0.32 ? 'quiet' as const : activityIndex < 0.63 ? 'solar-like' as const : 'active' as const;
  const baseRotation = type.startsWith('f') ? 12.5 : type.startsWith('k') ? 31 : 25.4;
  const rotationPeriodDays = round(clamp(baseRotation * (0.72 + source.stellarAgeGy * 0.065) * (0.94 + hashUnit(seed, 4) * 0.12), 5, 62), 4);
  const differentialRotationFraction = round(clamp(0.06 + activityIndex * 0.17 + hashUnit(seed, 5) * 0.04, 0.04, 0.28), 5);
  const cyclePeriodYears = round(clamp(6.5 + (1 - activityIndex) * 7.5 + hashUnit(seed, 6) * 2.5, 4, 18), 4);
  const cyclePhase = round(hashUnit(seed, 7), 6);
  const flareRatePerDay = round(clamp(0.01 + activityIndex * activityIndex * 0.72, 0.01, 0.9), 5);
  return { activityIndex, activityClass, rotationPeriodDays, differentialRotationFraction, cyclePeriodYears, cyclePhase, flareRatePerDay };
}

function deriveGranulation(source: StellarSurfacePresentationSource, seed: string, activityIndex: number) {
  const thermalScale = clamp((source.effectiveTemperatureK - 4000) / 3500);
  return {
    cellScale: round(clamp(0.045 + thermalScale * 0.055 + hashUnit(seed, 11) * 0.018, 0.035, 0.13), 5),
    contrast: round(clamp(0.055 + activityIndex * 0.11 + hashUnit(seed, 12) * 0.025, 0.04, 0.22), 5),
    phase: round(hashUnit(seed, 13), 6)
  };
}

function deriveFeatures(seed: string, kind: StellarSurfaceFeature['kind'], activityIndex: number, cyclePhase: number): StellarSurfaceFeature[] {
  const count = kind === 'spot'
    ? Math.max(1, Math.round(1 + activityIndex * 8))
    : Math.max(2, Math.round(3 + activityIndex * 11));
  const cycleLatitude = 8 + Math.abs(Math.cos(cyclePhase * Math.PI * 2)) * 22;
  return Array.from({ length: count }, (_, index) => {
    const hemisphere = hashUnit(`${seed}:${kind}`, index * 7) < 0.5 ? -1 : 1;
    const latitudeDeg = round(clamp(hemisphere * (cycleLatitude + (hashUnit(`${seed}:${kind}`, index * 7 + 1) - 0.5) * 18), -48, 48), 4);
    const longitudeDeg = round(hashUnit(`${seed}:${kind}`, index * 7 + 2) * 360 - 180, 4);
    const angularRadiusDeg = round(kind === 'spot'
      ? 2.5 + hashUnit(`${seed}:${kind}`, index * 7 + 3) * (4 + activityIndex * 8)
      : 3.5 + hashUnit(`${seed}:${kind}`, index * 7 + 3) * (7 + activityIndex * 11), 4);
    const contrast = round(kind === 'spot'
      ? -(0.22 + hashUnit(`${seed}:${kind}`, index * 7 + 4) * 0.42)
      : 0.08 + hashUnit(`${seed}:${kind}`, index * 7 + 4) * 0.2, 5);
    return {
      id: `${kind}-${index + 1}`,
      kind,
      latitudeDeg,
      longitudeDeg,
      angularRadiusDeg,
      contrast,
      phaseRad: round(hashUnit(`${seed}:${kind}`, index * 7 + 5) * Math.PI * 2, 6),
      lifetimeDays: round((kind === 'spot' ? 8 : 4) + hashUnit(`${seed}:${kind}`, index * 7 + 6) * (kind === 'spot' ? 48 : 24), 3)
    };
  });
}

function deriveCorona(seed: string, activityIndex: number): StellarSurfacePresentationArtifact['payload']['corona'] {
  const count = Math.max(4, Math.round(4 + activityIndex * 7));
  return {
    glowStrength: round(clamp(0.13 + activityIndex * 0.32, 0.12, 0.5), 5),
    haloScale: round(clamp(1.26 + activityIndex * 0.32, 1.24, 1.62), 5),
    streamers: Array.from({ length: count }, (_, index) => ({
      id: `streamer-${index + 1}`,
      angleDeg: round((360 * index / count + hashUnit(`${seed}:corona`, index * 4) * 24) % 360, 4),
      widthDeg: round(5 + hashUnit(`${seed}:corona`, index * 4 + 1) * 18, 4),
      reach: round(0.35 + hashUnit(`${seed}:corona`, index * 4 + 2) * (0.35 + activityIndex * 0.55), 5),
      brightness: round(0.25 + hashUnit(`${seed}:corona`, index * 4 + 3) * 0.55, 5)
    }))
  };
}

function validateSource(source: StellarSurfacePresentationSource): void {
  if (!source.projectId || !source.worldId || !source.starId) throw new Error('Stellar presentation requires stable project, world, and star IDs.');
  for (const value of [source.stellarAgeGy, source.massSolar, source.radiusSolar, source.luminositySolar, source.effectiveTemperatureK]) {
    if (!Number.isFinite(value) || value <= 0) throw new Error('Stellar presentation source contains a non-finite or non-positive physical value.');
  }
  if (!/^#[0-9a-f]{6}$/i.test(source.colorHex)) throw new Error('Stellar presentation requires a six-digit hexadecimal base color.');
}

function validatePresentation(
  source: StellarSurfacePresentationSource,
  activity: ReturnType<typeof deriveActivity>,
  granulation: StellarSurfacePresentationArtifact['payload']['granulation'],
  spots: StellarSurfaceFeature[],
  faculae: StellarSurfaceFeature[],
  corona: StellarSurfacePresentationArtifact['payload']['corona']
): StellarSurfacePresentationArtifact['validation'] {
  const issues: StellarSurfacePresentationArtifact['validation']['issues'] = [];
  if (source.worldWorkflowId !== EXPERIMENTAL_WORLD_WORKFLOW_ID) issues.push({ severity: 'error', message: 'Stellar presentation source is not Experimental.' });
  if (activity.activityIndex < 0 || activity.activityIndex > 1) issues.push({ severity: 'error', message: 'Activity index is outside the supported range.' });
  if (activity.rotationPeriodDays <= 0 || activity.cyclePeriodYears <= 0) issues.push({ severity: 'error', message: 'Stellar rotation or cycle period is not positive.' });
  if (granulation.cellScale <= 0 || granulation.contrast < 0 || granulation.contrast > 1) issues.push({ severity: 'error', message: 'Granulation controls are invalid.' });
  for (const feature of [...spots, ...faculae]) {
    if (feature.latitudeDeg < -90 || feature.latitudeDeg > 90 || feature.longitudeDeg < -180 || feature.longitudeDeg > 180) {
      issues.push({ severity: 'error', message: `Active region ${feature.id} is outside spherical bounds.` });
    }
    if (feature.angularRadiusDeg <= 0 || feature.angularRadiusDeg > 30 || !Number.isFinite(feature.contrast)) {
      issues.push({ severity: 'error', message: `Active region ${feature.id} has invalid size or contrast.` });
    }
  }
  if (corona.haloScale < 1 || corona.glowStrength < 0 || corona.streamers.length < 3) issues.push({ severity: 'error', message: 'Corona presentation is incomplete.' });
  return { valid: issues.every((issue) => issue.severity !== 'error'), issues };
}

function hashUnit(seed: string, index: number): number {
  let hash = 2166136261;
  const value = `${seed}:${index}`;
  for (let offset = 0; offset < value.length; offset += 1) {
    hash ^= value.charCodeAt(offset);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 2246822519);
  hash ^= hash >>> 13;
  return (hash >>> 0) / 4294967295;
}

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min = 0, max = 1): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function stableSignature(value: unknown): string {
  const serialized = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

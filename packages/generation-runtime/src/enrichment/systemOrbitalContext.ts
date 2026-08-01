import type {
  EnrichmentNodeRunRecord,
  OrbitalPresentationBody,
  SelectedValues,
  SolarSystem,
  SystemOrbitalContextArtifact,
  WorldProject
} from '@world-forge/shared';
import type { GenerationGraphNodeDefinition } from '../graph/generationGraph';
import {
  ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID,
  atmosphericWeatherPresentationWorkflowDescriptor
} from './atmosphericWeatherPresentation';
import {
  SEASONAL_SURFACE_MODEL_WORKFLOW_ID,
  seasonalSurfaceModelWorkflowDescriptor
} from './seasonalSurfaceModel';
import {
  AIRLESS_ROCKY_BODY_WORKFLOW_ID,
  airlessRockyBodyWorkflowDescriptor
} from './airlessRockyBody';
import {
  STELLAR_SURFACE_PRESENTATION_WORKFLOW_ID,
  stellarSurfacePresentationWorkflowDescriptor
} from './stellarSurfacePresentation';
import { SYSTEM_BODY_GENERATION_WORKFLOW_ID } from './systemBodyGeneration';

export const SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID = 'project.system-orbital-context' as const;
export const SYSTEM_ORBITAL_CONTEXT_WORKFLOW_VERSION = '1.0.0' as const;
export type ProjectEnrichmentWorkflowId = typeof SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID | typeof ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID | typeof SEASONAL_SURFACE_MODEL_WORKFLOW_ID | typeof STELLAR_SURFACE_PRESENTATION_WORKFLOW_ID | typeof AIRLESS_ROCKY_BODY_WORKFLOW_ID | typeof SYSTEM_BODY_GENERATION_WORKFLOW_ID;

export type ProjectEnrichmentWorkflowDescriptor = {
  kind: 'enrichment';
  id: ProjectEnrichmentWorkflowId;
  version: string;
  label: string;
  description: string;
  status: 'production' | 'experimental';
  artifactKey: ProjectEnrichmentWorkflowId;
  nodes: readonly GenerationGraphNodeDefinition[];
};

export type SystemOrbitalContextSource = {
  projectId: string;
  worldId: string;
  seed: string;
  generatorVersion: string;
  appVersion: string;
  sourceCommit?: string;
  selectedValues: Pick<SelectedValues, 'axialTiltDeg' | 'orbitalEccentricity'>;
  solarSystem: SolarSystem;
};

export type ProjectEnrichmentNodeEvent = {
  workflowId: ProjectEnrichmentWorkflowId;
  nodeId: string;
  stageId: string;
  implementationId: string;
  version: string;
  dependencies: string[];
  outputs: string[];
  phase: 'started' | 'completed' | 'failed';
  startedAt: number;
  timestamp: number;
  durationMs?: number;
  validation?: EnrichmentNodeRunRecord['validation'];
  error?: string;
};

const nodes: readonly GenerationGraphNodeDefinition[] = [
  {
    id: 'enrichment.orbital.read-system',
    stageId: 'enrichment.orbital.read-system',
    implementationId: 'generation-runtime.enrichment.orbital.read-system-v1',
    label: 'Read system scaffold',
    description: 'Read the existing generated star, primary world, placeholder bodies, moons, and selected orbital inputs without regenerating the world.',
    inputs: ['core.world-project@1.0.0'],
    outputs: ['enrichment.orbital-source@1.0.0'],
    fidelity: ['presentation']
  },
  {
    id: 'enrichment.orbital.resolve-star',
    stageId: 'enrichment.orbital.resolve-star',
    implementationId: 'generation-runtime.enrichment.orbital.resolve-star-v1',
    label: 'Resolve stellar presentation',
    description: 'Derive deterministic numeric stellar mass, radius, luminosity, temperature, and display color from the generated stellar scaffold.',
    inputs: ['enrichment.orbital-source@1.0.0'],
    outputs: ['enrichment.orbital-star@1.0.0'],
    fidelity: ['presentation']
  },
  {
    id: 'enrichment.orbital.resolve-bodies',
    stageId: 'enrichment.orbital.resolve-bodies',
    implementationId: 'generation-runtime.enrichment.orbital.resolve-bodies-v1',
    label: 'Resolve planetary orbits',
    description: 'Derive stable two-body orbital and rotational presentation values for the primary world and system placeholders.',
    inputs: ['enrichment.orbital-source@1.0.0', 'enrichment.orbital-star@1.0.0'],
    outputs: ['enrichment.orbital-bodies@1.0.0'],
    fidelity: ['presentation']
  },
  {
    id: 'enrichment.orbital.resolve-moons',
    stageId: 'enrichment.orbital.resolve-moons',
    implementationId: 'generation-runtime.enrichment.orbital.resolve-moons-v1',
    label: 'Resolve moon orbits',
    description: 'Attach deterministic moon orbit, phase, rotation, and placeholder presentation values to their parent bodies.',
    inputs: ['enrichment.orbital-source@1.0.0', 'enrichment.orbital-bodies@1.0.0'],
    outputs: ['enrichment.orbital-moons@1.0.0'],
    fidelity: ['presentation']
  },
  {
    id: 'enrichment.orbital.validate',
    stageId: 'enrichment.orbital.validate',
    implementationId: 'generation-runtime.enrichment.orbital.validate-v1',
    label: 'Validate orbital context',
    description: 'Validate stable IDs, parent relationships, finite orbital values, primary-body membership, and visibility references.',
    inputs: ['enrichment.orbital-star@1.0.0', 'enrichment.orbital-bodies@1.0.0', 'enrichment.orbital-moons@1.0.0'],
    outputs: ['enrichment.orbital-validation@1.0.0'],
    fidelity: ['presentation']
  },
  {
    id: 'enrichment.orbital.persist',
    stageId: 'enrichment.orbital.persist',
    implementationId: 'generation-runtime.enrichment.orbital.persist-v1',
    label: 'Package orbital artifact',
    description: 'Package the validated presentation model with workflow, graph, source, timing, cache, and deterministic artifact provenance.',
    inputs: ['enrichment.orbital-validation@1.0.0'],
    outputs: ['project.system-orbital-context@1.0.0'],
    fidelity: ['presentation']
  }
];

const systemOrbitalContextWorkflowDescriptor: ProjectEnrichmentWorkflowDescriptor = {
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
  atmosphericWeatherPresentationWorkflowDescriptor,
  seasonalSurfaceModelWorkflowDescriptor,
  stellarSurfacePresentationWorkflowDescriptor,
  airlessRockyBodyWorkflowDescriptor
];

export function isProjectEnrichmentWorkflowId(value: string | undefined): value is ProjectEnrichmentWorkflowId {
  return value === SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID || value === ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID || value === SEASONAL_SURFACE_MODEL_WORKFLOW_ID || value === STELLAR_SURFACE_PRESENTATION_WORKFLOW_ID || value === AIRLESS_ROCKY_BODY_WORKFLOW_ID || value === SYSTEM_BODY_GENERATION_WORKFLOW_ID;
}

export function projectEnrichmentWorkflowDescriptor(value: string | undefined): ProjectEnrichmentWorkflowDescriptor {
  return projectEnrichmentWorkflowDescriptors.find((workflow) => workflow.id === value) ?? projectEnrichmentWorkflowDescriptors[0];
}

export function projectEnrichmentWorkflowForNode(nodeId: string): ProjectEnrichmentWorkflowDescriptor | undefined {
  return projectEnrichmentWorkflowDescriptors.find((workflow) => workflow.nodes.some((node) => node.id === nodeId));
}

export function systemOrbitalContextSourceFromProject(project: WorldProject): SystemOrbitalContextSource {
  return {
    projectId: project.projectId,
    worldId: project.primaryWorld.id,
    seed: project.seed,
    generatorVersion: project.generatorVersion,
    appVersion: project.appVersion,
    sourceCommit: project.sourceCommit,
    selectedValues: {
      axialTiltDeg: project.selectedValues.axialTiltDeg,
      orbitalEccentricity: project.selectedValues.orbitalEccentricity
    },
    solarSystem: structuredClone(project.solarSystem)
  };
}

export function systemOrbitalContextSourceSignature(source: SystemOrbitalContextSource): string {
  return stableSignature({
    projectId: source.projectId,
    worldId: source.worldId,
    seed: source.seed,
    generatorVersion: source.generatorVersion,
    selectedValues: source.selectedValues,
    solarSystem: source.solarSystem
  });
}

export function isCurrentSystemOrbitalContextArtifact(project: WorldProject, artifact: unknown): artifact is SystemOrbitalContextArtifact {
  if (!artifact || typeof artifact !== 'object') return false;
  const candidate = artifact as Partial<SystemOrbitalContextArtifact>;
  return candidate.artifactKey === SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID
    && candidate.artifactVersion === 1
    && candidate.status === 'complete'
    && candidate.workflow?.version === SYSTEM_ORBITAL_CONTEXT_WORKFLOW_VERSION
    && candidate.workflow?.graphSignature === orbitalContextGraphSignature()
    && candidate.source?.sourceSignature === systemOrbitalContextSourceSignature(systemOrbitalContextSourceFromProject(project))
    && candidate.validation?.valid === true;
}

export function orbitalContextGraphSignature(): string {
  return stableSignature(nodes.map((node) => ({
    id: node.id,
    stageId: node.stageId,
    implementationId: node.implementationId,
    inputs: node.inputs,
    outputs: node.outputs
  })));
}

export async function runSystemOrbitalContextWorkflow(source: SystemOrbitalContextSource, options: {
  onNodeEvent?: (event: ProjectEnrichmentNodeEvent) => void;
  isCancelled?: () => boolean;
  yieldControl?: () => Promise<void>;
} = {}): Promise<SystemOrbitalContextArtifact> {
  const workflowStarted = nowMs();
  const startedAt = new Date().toISOString();
  const seed = `${source.seed}:system-orbital-context:v1`;
  const nodeRuns: EnrichmentNodeRunRecord[] = [];
  let star: SystemOrbitalContextArtifact['payload']['star'] | undefined;
  let bodies: OrbitalPresentationBody[] = [];
  let validation: SystemOrbitalContextArtifact['validation'] = { valid: true, issues: [] };

  for (const definition of nodes) {
    if (options.isCancelled?.()) throw new Error('Project enrichment cancelled.');
    const nodeStarted = nowMs();
    const nodeStartedIso = new Date().toISOString();
    options.onNodeEvent?.({
      workflowId: SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID,
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
      if (definition.id === 'enrichment.orbital.read-system') {
        if (!source.solarSystem.star || !source.solarSystem.bodies.length) throw new Error('The generated system scaffold is incomplete.');
      } else if (definition.id === 'enrichment.orbital.resolve-star') {
        star = resolveStar(source);
      } else if (definition.id === 'enrichment.orbital.resolve-bodies') {
        if (!star) throw new Error('Stellar presentation must be resolved before body orbits.');
        bodies = resolveBodies(source, star.massSolar, seed);
      } else if (definition.id === 'enrichment.orbital.resolve-moons') {
        bodies = [...bodies, ...resolveMoons(source, seed)];
      } else if (definition.id === 'enrichment.orbital.validate') {
        validation = validateOrbitalContext(source, star, bodies);
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
        validation: definition.id === 'enrichment.orbital.validate' ? validation : undefined
      };
      nodeRuns.push(record);
      options.onNodeEvent?.({
        workflowId: SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID,
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
        workflowId: SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID,
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
        validation: definition.id === 'enrichment.orbital.validate' ? validation : undefined,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  if (!star) throw new Error('Orbital context completed without stellar presentation data.');
  const primaryBodyId = source.solarSystem.primaryWorldId;
  const payload: SystemOrbitalContextArtifact['payload'] = {
    modelVersion: 'system-orbital-context-v1',
    star,
    primaryBodyId,
    visibleBodyIds: [...source.solarSystem.visibleBodiesFromPrimary],
    bodies
  };
  const completedAt = new Date().toISOString();
  return {
    artifactKey: SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID,
    artifactVersion: 1,
    artifactRole: 'presentation',
    status: 'complete',
    workflow: {
      id: SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID,
      version: SYSTEM_ORBITAL_CONTEXT_WORKFLOW_VERSION,
      graphSignature: orbitalContextGraphSignature(),
      nodes: nodeRuns
    },
    source: {
      projectId: source.projectId,
      worldId: source.worldId,
      sourceSignature: systemOrbitalContextSourceSignature(source),
      generatorVersion: source.generatorVersion,
      appVersion: source.appVersion,
      sourceCommit: source.sourceCommit
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

function resolveStar(source: SystemOrbitalContextSource): SystemOrbitalContextArtifact['payload']['star'] {
  const star = source.solarSystem.star;
  const type = star.type.toLowerCase();
  const massSolar = type.startsWith('f') ? 1.25 : type.startsWith('k') ? 0.78 : 1;
  const radiusSolar = type.startsWith('f') ? 1.22 : type.startsWith('k') ? 0.76 : 1;
  const luminositySolar = type.startsWith('f') ? 2.2 : type.startsWith('k') ? 0.38 : 1;
  const effectiveTemperatureK = type.startsWith('f') ? 6750 : type.startsWith('k') ? 4700 : 5772;
  const colorHex = type.startsWith('f') ? '#fff3df' : type.startsWith('k') ? '#ffc978' : '#fff0b0';
  return { id: star.id, massSolar, radiusSolar, luminositySolar, effectiveTemperatureK, colorHex };
}

function resolveBodies(source: SystemOrbitalContextSource, stellarMassSolar: number, seed: string): OrbitalPresentationBody[] {
  return source.solarSystem.bodies.map((body) => {
    const semiMajorAxisAu = round(Math.max(0.08, body.orbitalDistanceClass * 0.32), 6);
    const orbitalPeriodDays = round(Math.sqrt((semiMajorAxisAu ** 3) / Math.max(0.1, stellarMassSolar)) * 365.256, 6);
    const isPrimary = body.id === source.solarSystem.primaryWorldId || body.isPrimaryWorld;
    return {
      id: body.id,
      parentBodyId: source.solarSystem.star.id,
      kind: body.bodyType,
      orbitalOrder: body.orbitalOrder,
      semiMajorAxisAu,
      semiMajorAxisParentRadii: null,
      eccentricity: body.eccentricity,
      inclinationDeg: round((unit(seed, `${body.id}:inclination`) - 0.5) * 8, 4),
      longitudeAscendingNodeDeg: round(unit(seed, `${body.id}:ascending`) * 360, 4),
      argumentOfPeriapsisDeg: round(unit(seed, `${body.id}:periapsis`) * 360, 4),
      orbitalPeriodDays,
      phaseAtEpochRad: round(unit(seed, `${body.id}:phase`) * Math.PI * 2, 8),
      rotationPeriodHours: round(rotationPeriodHours(body.bodyType, unit(seed, `${body.id}:rotation`)), 4),
      axialTiltDeg: isPrimary ? source.selectedValues.axialTiltDeg : round(unit(seed, `${body.id}:tilt`) * 38, 4),
      sizeClass: body.sizeClass,
      massClass: body.massClass,
      visibleFromPrimary: body.visibleFromPrimary,
      placeholder: !isPrimary
    };
  });
}

function resolveMoons(source: SystemOrbitalContextSource, seed: string): OrbitalPresentationBody[] {
  const results: OrbitalPresentationBody[] = [];
  for (const parent of source.solarSystem.bodies) {
    for (let index = 0; index < parent.moons.length; index += 1) {
      const moon = parent.moons[index];
      const semiMajorAxisParentRadii = round(5 + moon.orbitalDistanceClass * 22, 5);
      const orbitalPeriodDays = round(1.2 + (moon.orbitalDistanceClass ** 1.5) * 14 / Math.sqrt(Math.max(0.15, parent.massClass)), 6);
      results.push({
        id: `${parent.id}:${moon.id}`,
        parentBodyId: parent.id,
        kind: 'moon',
        orbitalOrder: index + 1,
        semiMajorAxisAu: null,
        semiMajorAxisParentRadii,
        eccentricity: round(0.002 + unit(seed, `${parent.id}:${moon.id}:eccentricity`) * 0.08, 6),
        inclinationDeg: round((unit(seed, `${parent.id}:${moon.id}:inclination`) - 0.5) * 12, 4),
        longitudeAscendingNodeDeg: round(unit(seed, `${parent.id}:${moon.id}:ascending`) * 360, 4),
        argumentOfPeriapsisDeg: round(unit(seed, `${parent.id}:${moon.id}:periapsis`) * 360, 4),
        orbitalPeriodDays,
        phaseAtEpochRad: round(unit(seed, `${parent.id}:${moon.id}:phase`) * Math.PI * 2, 8),
        rotationPeriodHours: round(orbitalPeriodDays * 24, 4),
        axialTiltDeg: round(unit(seed, `${parent.id}:${moon.id}:tilt`) * 12, 4),
        sizeClass: moon.sizeClass,
        massClass: round(Math.max(0.01, moon.sizeClass ** 3), 4),
        visibleFromPrimary: parent.isPrimaryWorld,
        placeholder: true
      });
    }
  }
  return results;
}

function validateOrbitalContext(
  source: SystemOrbitalContextSource,
  star: SystemOrbitalContextArtifact['payload']['star'] | undefined,
  bodies: OrbitalPresentationBody[]
): SystemOrbitalContextArtifact['validation'] {
  const issues: SystemOrbitalContextArtifact['validation']['issues'] = [];
  if (!star) issues.push({ severity: 'error', message: 'Stellar presentation is missing.' });
  const ids = new Set<string>();
  for (const body of bodies) {
    if (ids.has(body.id)) issues.push({ severity: 'error', message: `Duplicate orbital body ID ${body.id}.` });
    ids.add(body.id);
    const values = [body.eccentricity, body.inclinationDeg, body.orbitalPeriodDays, body.phaseAtEpochRad, body.rotationPeriodHours, body.axialTiltDeg];
    if (values.some((value) => !Number.isFinite(value))) issues.push({ severity: 'error', message: `Body ${body.id} contains a non-finite orbital value.` });
    if (body.parentBodyId && body.parentBodyId !== source.solarSystem.star.id && !source.solarSystem.bodies.some((candidate) => candidate.id === body.parentBodyId)) {
      issues.push({ severity: 'error', message: `Body ${body.id} references missing parent ${body.parentBodyId}.` });
    }
  }
  if (!ids.has(source.solarSystem.primaryWorldId)) issues.push({ severity: 'error', message: 'Primary world is missing from orbital bodies.' });
  for (const visibleId of source.solarSystem.visibleBodiesFromPrimary) {
    if (!ids.has(visibleId)) issues.push({ severity: 'warning', message: `Visible body ${visibleId} is not present in the orbital model.` });
  }
  return { valid: !issues.some((issue) => issue.severity === 'error'), issues };
}

function rotationPeriodHours(kind: string, value: number): number {
  if (kind === 'gas-giant' || kind === 'ice-giant') return 8 + value * 10;
  if (kind === 'dwarf') return 5 + value * 30;
  return 12 + value * 54;
}

function unit(seed: string, key: string): number {
  const text = `${seed}:${key}`;
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function stableSignature(value: unknown): string {
  const text = stableText(value);
  let left = 2166136261;
  let right = 2654435769;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    left = Math.imul(left ^ code, 16777619) >>> 0;
    right = Math.imul(right ^ code, 2246822507) >>> 0;
  }
  return `wfe-a1-${left.toString(16).padStart(8, '0')}${right.toString(16).padStart(8, '0')}`;
}

function stableText(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableText).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableText(record[key])}`).join(',')}}`;
}

function nowMs(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

function round(value: number, digits: number): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

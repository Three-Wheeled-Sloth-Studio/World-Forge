import type {
  AirlessRockyBodyArtifact,
  BodyGenerationFidelity,
  EnrichmentNodeRunRecord,
  OrbitalPresentationBody,
  SystemOrbitalContextArtifact,
  WorldProject
} from '@world-forge/shared';
import type { GenerationGraphNodeDefinition } from '../graph/generationGraph';
import type { ProjectEnrichmentNodeEvent } from './systemOrbitalContext';

export const AIRLESS_ROCKY_BODY_WORKFLOW_ID = 'project.generate-airless-rocky-body' as const;
export const AIRLESS_ROCKY_BODY_WORKFLOW_VERSION = '1.0.0' as const;
export const AIRLESS_ROCKY_BODY_PROFILE = 'airless-rocky-body' as const;

export type AirlessRockyBodySource = {
  projectId: string;
  worldId: string;
  bodyId: string;
  parentBodyId: string | null;
  seed: string;
  generatorVersion: string;
  appVersion: string;
  sourceCommit?: string;
  orbitalArtifactSignature: string;
  requestedFidelity: BodyGenerationFidelity;
  body: Pick<
    OrbitalPresentationBody,
    | 'id'
    | 'parentBodyId'
    | 'kind'
    | 'orbitalOrder'
    | 'semiMajorAxisParentRadii'
    | 'orbitalPeriodDays'
    | 'rotationPeriodHours'
    | 'axialTiltDeg'
    | 'sizeClass'
    | 'massClass'
    | 'placeholder'
  >;
};

const nodes: readonly GenerationGraphNodeDefinition[] = [
  {
    id: 'enrichment.body.airless.read-scaffold',
    stageId: 'enrichment.body.airless.read-scaffold',
    implementationId: 'generation-runtime.enrichment.body.airless.read-scaffold-v1',
    label: 'Read moon scaffold',
    description: 'Read the selected placeholder moon and its saved orbital context without changing the primary world or ordinary generation graph.',
    inputs: ['core.world-project@1.0.0', 'project.system-orbital-context@1.0.0'],
    outputs: ['enrichment.body.airless-source@1.0.0'],
    fidelity: ['preview', 'standard']
  },
  {
    id: 'enrichment.body.airless.resolve-profile',
    stageId: 'enrichment.body.airless.resolve-profile',
    implementationId: 'generation-runtime.enrichment.body.airless.resolve-profile-v1',
    label: 'Resolve airless profile',
    description: 'Resolve a solid, airless, inactive rocky-body graph with no climate, hydrology, ecology, or civilization nodes.',
    inputs: ['enrichment.body.airless-source@1.0.0'],
    outputs: ['enrichment.body.airless-profile@1.0.0'],
    fidelity: ['preview', 'standard']
  },
  {
    id: 'enrichment.body.airless.base-terrain',
    stageId: 'enrichment.body.airless.base-terrain',
    implementationId: 'generation-runtime.enrichment.body.airless.base-terrain-v1',
    label: 'Generate rocky terrain',
    description: 'Generate deterministic globe-space rocky relief from spherical harmonic fields.',
    inputs: ['enrichment.body.airless-profile@1.0.0'],
    outputs: ['enrichment.body.airless-base-terrain@1.0.0'],
    fidelity: ['preview', 'standard']
  },
  {
    id: 'enrichment.body.airless.craters',
    stageId: 'enrichment.body.airless.craters',
    implementationId: 'generation-runtime.enrichment.body.airless.craters-v1',
    label: 'Stamp crater field',
    description: 'Stamp deterministic crater bowls, rims, and bounded ejecta into the globe-space terrain field.',
    inputs: ['enrichment.body.airless-base-terrain@1.0.0'],
    outputs: ['enrichment.body.airless-cratered-terrain@1.0.0'],
    fidelity: ['preview', 'standard']
  },
  {
    id: 'enrichment.body.airless.surface-presentation',
    stageId: 'enrichment.body.airless.surface-presentation',
    implementationId: 'generation-runtime.enrichment.body.airless.surface-presentation-v1',
    label: 'Derive albedo and thermal fields',
    description: 'Derive deterministic low-resolution albedo and illustrative thermal presentation from terrain, latitude, and a fixed subsolar frame.',
    inputs: ['enrichment.body.airless-cratered-terrain@1.0.0'],
    outputs: ['enrichment.body.airless-surface-presentation@1.0.0'],
    fidelity: ['preview', 'standard']
  },
  {
    id: 'enrichment.body.airless.validate',
    stageId: 'enrichment.body.airless.validate',
    implementationId: 'generation-runtime.enrichment.body.airless.validate-v1',
    label: 'Validate generated moon',
    description: 'Validate finite bounded fields, crater count, source compatibility, and intrinsic spherical wrap continuity.',
    inputs: ['enrichment.body.airless-surface-presentation@1.0.0'],
    outputs: ['enrichment.body.airless-validation@1.0.0'],
    fidelity: ['preview', 'standard']
  },
  {
    id: 'enrichment.body.airless.persist',
    stageId: 'enrichment.body.airless.persist',
    implementationId: 'generation-runtime.enrichment.body.airless.persist-v1',
    label: 'Package generated body',
    description: 'Package the generated body fields with workflow, source, graph, timing, validation, and deterministic provenance.',
    inputs: ['enrichment.body.airless-validation@1.0.0'],
    outputs: ['project.generate-airless-rocky-body@1.0.0'],
    fidelity: ['preview', 'standard']
  }
];

export const airlessRockyBodyWorkflowDescriptor = {
  kind: 'enrichment' as const,
  id: AIRLESS_ROCKY_BODY_WORKFLOW_ID,
  version: AIRLESS_ROCKY_BODY_WORKFLOW_VERSION,
  label: 'Generate Airless Rocky Body',
  description: 'Optional selected-body workflow that generates a deterministic cratered moon without climate, hydrology, ecology, or civilization work.',
  status: 'experimental' as const,
  artifactKey: AIRLESS_ROCKY_BODY_WORKFLOW_ID,
  nodes
};

export function airlessRockyBodyArtifactKey(bodyId: string): `project.generate-airless-rocky-body:${string}` {
  return `${AIRLESS_ROCKY_BODY_WORKFLOW_ID}:${bodyId}`;
}

export function airlessRockyBodySourceFromProject(
  project: WorldProject,
  orbitalContext: SystemOrbitalContextArtifact,
  bodyId: string,
  requestedFidelity: BodyGenerationFidelity
): AirlessRockyBodySource {
  const body = orbitalContext.payload.bodies.find((candidate) => candidate.id === bodyId);
  if (!body) throw new Error(`System body ${bodyId} is not present in the orbital artifact.`);
  if (body.kind !== 'moon') throw new Error('The first body-generation proof only supports moons.');
  return {
    projectId: project.projectId,
    worldId: project.primaryWorld.id,
    bodyId,
    parentBodyId: body.parentBodyId,
    seed: `${project.seed}:body:${bodyId}:airless-rocky:v1`,
    generatorVersion: project.generatorVersion,
    appVersion: project.appVersion,
    sourceCommit: project.sourceCommit,
    orbitalArtifactSignature: orbitalContext.artifactSignature,
    requestedFidelity,
    body: {
      id: body.id,
      parentBodyId: body.parentBodyId,
      kind: body.kind,
      orbitalOrder: body.orbitalOrder,
      semiMajorAxisParentRadii: body.semiMajorAxisParentRadii,
      orbitalPeriodDays: body.orbitalPeriodDays,
      rotationPeriodHours: body.rotationPeriodHours,
      axialTiltDeg: body.axialTiltDeg,
      sizeClass: body.sizeClass,
      massClass: body.massClass,
      placeholder: body.placeholder
    }
  };
}

export function airlessRockyBodySourceSignature(source: AirlessRockyBodySource): string {
  return stableSignature({
    projectId: source.projectId,
    worldId: source.worldId,
    bodyId: source.bodyId,
    parentBodyId: source.parentBodyId,
    seed: source.seed,
    generatorVersion: source.generatorVersion,
    orbitalArtifactSignature: source.orbitalArtifactSignature,
    requestedFidelity: source.requestedFidelity,
    body: source.body
  });
}

export function airlessRockyBodyGraphSignature(): string {
  return stableSignature(nodes.map((node) => ({
    id: node.id,
    stageId: node.stageId,
    implementationId: node.implementationId,
    inputs: node.inputs,
    outputs: node.outputs,
    fidelity: node.fidelity
  })));
}

export function isCurrentAirlessRockyBodyArtifact(
  source: AirlessRockyBodySource,
  artifact: unknown
): artifact is AirlessRockyBodyArtifact {
  if (!artifact || typeof artifact !== 'object') return false;
  const candidate = artifact as Partial<AirlessRockyBodyArtifact>;
  return candidate.artifactKey === airlessRockyBodyArtifactKey(source.bodyId)
    && candidate.artifactVersion === 1
    && candidate.status === 'complete'
    && candidate.bodyId === source.bodyId
    && candidate.bodyProfile === AIRLESS_ROCKY_BODY_PROFILE
    && candidate.requestedFidelity === source.requestedFidelity
    && candidate.workflow?.version === AIRLESS_ROCKY_BODY_WORKFLOW_VERSION
    && candidate.workflow?.graphSignature === airlessRockyBodyGraphSignature()
    && candidate.source?.sourceSignature === airlessRockyBodySourceSignature(source)
    && candidate.validation?.valid === true;
}

export async function runAirlessRockyBodyWorkflow(source: AirlessRockyBodySource, options: {
  onNodeEvent?: (event: ProjectEnrichmentNodeEvent) => void;
  isCancelled?: () => boolean;
  yieldControl?: () => Promise<void>;
} = {}): Promise<AirlessRockyBodyArtifact> {
  const workflowStarted = nowMs();
  const startedAt = new Date().toISOString();
  const nodeRuns: EnrichmentNodeRunRecord[] = [];
  const resolution = source.requestedFidelity === 'standard'
    ? { width: 128, height: 64 }
    : { width: 64, height: 32 };
  let heightField: number[] = [];
  let albedoField: number[] = [];
  let thermalField: number[] = [];
  let craterCount = 0;
  let validation: AirlessRockyBodyArtifact['validation'] = { valid: true, issues: [] };

  for (const definition of nodes) {
    if (options.isCancelled?.()) throw new Error('Project enrichment cancelled.');
    const nodeStarted = nowMs();
    const nodeStartedIso = new Date().toISOString();
    options.onNodeEvent?.({
      workflowId: AIRLESS_ROCKY_BODY_WORKFLOW_ID,
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
      if (definition.id === 'enrichment.body.airless.read-scaffold') {
        validateSource(source);
      } else if (definition.id === 'enrichment.body.airless.resolve-profile') {
        if (source.body.kind !== 'moon') throw new Error('Airless rocky-body profile requires a moon scaffold in this proof.');
      } else if (definition.id === 'enrichment.body.airless.base-terrain') {
        heightField = generateBaseTerrain(source, resolution);
      } else if (definition.id === 'enrichment.body.airless.craters') {
        const cratered = stampCraters(source, resolution, heightField);
        heightField = cratered.heightField;
        craterCount = cratered.craterCount;
      } else if (definition.id === 'enrichment.body.airless.surface-presentation') {
        const presentation = deriveSurfacePresentation(source, resolution, heightField);
        albedoField = presentation.albedoField;
        thermalField = presentation.thermalField;
      } else if (definition.id === 'enrichment.body.airless.validate') {
        validation = validateGeneratedBody(resolution, heightField, albedoField, thermalField, craterCount);
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
        validation: definition.id === 'enrichment.body.airless.validate' ? validation : undefined
      };
      nodeRuns.push(record);
      options.onNodeEvent?.({
        workflowId: AIRLESS_ROCKY_BODY_WORKFLOW_ID,
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
        workflowId: AIRLESS_ROCKY_BODY_WORKFLOW_ID,
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
        validation: definition.id === 'enrichment.body.airless.validate' ? validation : undefined,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  const normalizedHeight = normalizeField(heightField, -1, 1);
  const payload: AirlessRockyBodyArtifact['payload'] = {
    modelVersion: 'airless-rocky-body-v1',
    resolution,
    radiusClass: round(Math.max(0.05, source.body.sizeClass), 6),
    craterCount,
    heightField: normalizedHeight,
    albedoField: albedoField.map((value) => round(clamp(value, 0, 1), 6)),
    thermalField: thermalField.map((value) => round(clamp(value, 0, 1), 6)),
    stats: {
      minHeight: round(Math.min(...normalizedHeight), 6),
      maxHeight: round(Math.max(...normalizedHeight), 6),
      meanAlbedo: round(mean(albedoField), 6),
      seamMeanDelta: round(seamMeanDelta(normalizedHeight, resolution), 6)
    }
  };
  const completedAt = new Date().toISOString();
  return {
    artifactKey: airlessRockyBodyArtifactKey(source.bodyId),
    artifactVersion: 1,
    artifactRole: 'derived',
    status: 'complete',
    bodyId: source.bodyId,
    bodyProfile: AIRLESS_ROCKY_BODY_PROFILE,
    requestedFidelity: source.requestedFidelity,
    workflow: {
      id: AIRLESS_ROCKY_BODY_WORKFLOW_ID,
      version: AIRLESS_ROCKY_BODY_WORKFLOW_VERSION,
      graphSignature: airlessRockyBodyGraphSignature(),
      nodes: nodeRuns
    },
    source: {
      projectId: source.projectId,
      worldId: source.worldId,
      bodyId: source.bodyId,
      parentBodyId: source.parentBodyId,
      sourceSignature: airlessRockyBodySourceSignature(source),
      orbitalArtifactSignature: source.orbitalArtifactSignature,
      generatorVersion: source.generatorVersion,
      appVersion: source.appVersion,
      sourceCommit: source.sourceCommit
    },
    seed: source.seed,
    startedAt,
    completedAt,
    totalMs: round(nowMs() - workflowStarted, 3),
    artifactSignature: stableSignature(payload),
    validation,
    payload
  };
}

function validateSource(source: AirlessRockyBodySource): void {
  if (!source.projectId || !source.worldId || !source.bodyId) throw new Error('Airless rocky-body source identity is incomplete.');
  if (source.body.id !== source.bodyId) throw new Error('Selected body identity does not match the body scaffold.');
  if (source.body.kind !== 'moon') throw new Error('The first generated-body proof only supports moons.');
  if (!source.body.parentBodyId) throw new Error('Selected moon does not have a parent body.');
  if (!Number.isFinite(source.body.sizeClass) || source.body.sizeClass <= 0) throw new Error('Selected moon has an invalid size class.');
}

function generateBaseTerrain(source: AirlessRockyBodySource, resolution: { width: number; height: number }): number[] {
  const phases = Array.from({ length: 8 }, (_, index) => seededUnit(`${source.seed}:phase:${index}`) * Math.PI * 2);
  const coefficients = Array.from({ length: 8 }, (_, index) => ({
    x: 0.7 + seededUnit(`${source.seed}:cx:${index}`) * 2.4,
    y: 0.7 + seededUnit(`${source.seed}:cy:${index}`) * 2.4,
    z: 0.7 + seededUnit(`${source.seed}:cz:${index}`) * 2.4
  }));
  const field = new Array<number>(resolution.width * resolution.height);
  for (let y = 0; y < resolution.height; y += 1) {
    const latitude = Math.PI * (0.5 - (y + 0.5) / resolution.height);
    for (let x = 0; x < resolution.width; x += 1) {
      const longitude = Math.PI * 2 * ((x + 0.5) / resolution.width - 0.5);
      const direction = sphereDirection(latitude, longitude);
      let value = 0;
      let amplitude = 0.58;
      for (let octave = 0; octave < coefficients.length; octave += 1) {
        const frequency = 1.4 * (1.72 ** octave);
        const coefficient = coefficients[octave];
        value += Math.sin(
          (direction.x * coefficient.x + direction.y * coefficient.y + direction.z * coefficient.z) * frequency + phases[octave]
        ) * amplitude;
        amplitude *= 0.53;
      }
      field[y * resolution.width + x] = value;
    }
  }
  return field;
}

function stampCraters(
  source: AirlessRockyBodySource,
  resolution: { width: number; height: number },
  base: number[]
): { heightField: number[]; craterCount: number } {
  const craterCount = source.requestedFidelity === 'standard' ? 38 : 22;
  const craters = Array.from({ length: craterCount }, (_, index) => {
    const z = seededUnit(`${source.seed}:crater:${index}:z`) * 2 - 1;
    const azimuth = seededUnit(`${source.seed}:crater:${index}:azimuth`) * Math.PI * 2;
    const radial = Math.sqrt(Math.max(0, 1 - z * z));
    return {
      direction: { x: Math.cos(azimuth) * radial, y: z, z: Math.sin(azimuth) * radial },
      radiusRad: 0.045 + seededUnit(`${source.seed}:crater:${index}:radius`) ** 1.7 * 0.19,
      depth: 0.16 + seededUnit(`${source.seed}:crater:${index}:depth`) * 0.34,
      ejecta: 0.04 + seededUnit(`${source.seed}:crater:${index}:ejecta`) * 0.09
    };
  });
  const field = [...base];
  for (let y = 0; y < resolution.height; y += 1) {
    const latitude = Math.PI * (0.5 - (y + 0.5) / resolution.height);
    for (let x = 0; x < resolution.width; x += 1) {
      const longitude = Math.PI * 2 * ((x + 0.5) / resolution.width - 0.5);
      const direction = sphereDirection(latitude, longitude);
      let contribution = 0;
      for (const crater of craters) {
        const angle = Math.acos(clamp(dot(direction, crater.direction), -1, 1));
        const normalized = angle / crater.radiusRad;
        if (normalized < 1) {
          const bowl = -(1 - normalized * normalized) * crater.depth;
          const rim = Math.exp(-((normalized - 0.88) ** 2) / 0.012) * crater.depth * 0.42;
          contribution += bowl + rim;
        } else if (normalized < 1.75) {
          contribution += Math.exp(-((normalized - 1.15) ** 2) / 0.16) * crater.ejecta;
        }
      }
      field[y * resolution.width + x] += contribution;
    }
  }
  return { heightField: field, craterCount };
}

function deriveSurfacePresentation(
  source: AirlessRockyBodySource,
  resolution: { width: number; height: number },
  heightField: number[]
): { albedoField: number[]; thermalField: number[] } {
  const normalized = normalizeField(heightField, -1, 1);
  const albedoField = new Array<number>(normalized.length);
  const thermalField = new Array<number>(normalized.length);
  const subsolar = sphereDirection(0.08, seededUnit(`${source.seed}:subsolar`) * Math.PI * 2 - Math.PI);
  for (let y = 0; y < resolution.height; y += 1) {
    const latitude = Math.PI * (0.5 - (y + 0.5) / resolution.height);
    for (let x = 0; x < resolution.width; x += 1) {
      const index = y * resolution.width + x;
      const longitude = Math.PI * 2 * ((x + 0.5) / resolution.width - 0.5);
      const direction = sphereDirection(latitude, longitude);
      const micro = sphericalMicroNoise(direction, `${source.seed}:albedo`);
      albedoField[index] = clamp(0.47 + normalized[index] * 0.075 + micro * 0.11, 0.2, 0.78);
      const illumination = Math.max(0, dot(direction, subsolar));
      const latitudeCooling = 1 - Math.abs(Math.sin(latitude)) * 0.22;
      thermalField[index] = clamp((illumination ** 0.42) * latitudeCooling * 0.9 + 0.04, 0, 1);
    }
  }
  return { albedoField, thermalField };
}

function validateGeneratedBody(
  resolution: { width: number; height: number },
  heightField: number[],
  albedoField: number[],
  thermalField: number[],
  craterCount: number
): AirlessRockyBodyArtifact['validation'] {
  const issues: AirlessRockyBodyArtifact['validation']['issues'] = [];
  const expected = resolution.width * resolution.height;
  for (const [label, field] of [
    ['height', heightField],
    ['albedo', albedoField],
    ['thermal', thermalField]
  ] as const) {
    if (field.length !== expected) issues.push({ severity: 'error', message: `${label} field length does not match the declared resolution.` });
    if (field.some((value) => !Number.isFinite(value))) issues.push({ severity: 'error', message: `${label} field contains non-finite values.` });
  }
  if (craterCount < 8) issues.push({ severity: 'error', message: 'Crater field is unexpectedly sparse.' });
  const seamDelta = seamMeanDelta(normalizeField(heightField, -1, 1), resolution);
  if (seamDelta > 0.34) issues.push({ severity: 'error', message: `Spherical wrap continuity exceeded the bounded seam delta (${seamDelta.toFixed(3)}).` });
  return { valid: !issues.some((issue) => issue.severity === 'error'), issues };
}

function seamMeanDelta(field: number[], resolution: { width: number; height: number }): number {
  let total = 0;
  for (let y = 0; y < resolution.height; y += 1) {
    total += Math.abs(field[y * resolution.width] - field[y * resolution.width + resolution.width - 1]);
  }
  return total / Math.max(1, resolution.height);
}

function normalizeField(field: number[], minTarget: number, maxTarget: number): number[] {
  const min = Math.min(...field);
  const max = Math.max(...field);
  const span = Math.max(1e-9, max - min);
  return field.map((value) => minTarget + ((value - min) / span) * (maxTarget - minTarget));
}

function sphericalMicroNoise(direction: { x: number; y: number; z: number }, seed: string): number {
  const a = seededUnit(`${seed}:a`) * 5 + 2;
  const b = seededUnit(`${seed}:b`) * 5 + 2;
  const c = seededUnit(`${seed}:c`) * 5 + 2;
  const phase = seededUnit(`${seed}:phase`) * Math.PI * 2;
  return Math.sin((direction.x * a + direction.y * b + direction.z * c) * 8.4 + phase);
}

function sphereDirection(latitude: number, longitude: number) {
  const cosLatitude = Math.cos(latitude);
  return {
    x: cosLatitude * Math.cos(longitude),
    y: Math.sin(latitude),
    z: cosLatitude * Math.sin(longitude)
  };
}

function dot(left: { x: number; y: number; z: number }, right: { x: number; y: number; z: number }): number {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

function seededUnit(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
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

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

import type {
  BodyGenerationFidelity,
  BodyGenerationProfile,
  EnrichmentNodeRunRecord,
  GeneratedSystemBodyArtifact,
  GeneratedSystemBodyFeature,
  OrbitalPresentationBody,
  SystemOrbitalContextArtifact,
  WorldProject
} from '@world-forge/shared';
import type { GenerationGraphNodeDefinition } from '../graph/generationGraph';
import type { ProjectEnrichmentNodeEvent } from './systemOrbitalContext';

export const SYSTEM_BODY_GENERATION_WORKFLOW_ID = 'project.generate-system-body' as const;
export const SYSTEM_BODY_GENERATION_WORKFLOW_VERSION = '1.0.0' as const;

export type SystemBodyGenerationSource = {
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
  profile: BodyGenerationProfile;
  systemAgeGy: number;
  body: Pick<
    OrbitalPresentationBody,
    | 'id'
    | 'parentBodyId'
    | 'kind'
    | 'orbitalOrder'
    | 'semiMajorAxisAu'
    | 'semiMajorAxisParentRadii'
    | 'eccentricity'
    | 'orbitalPeriodDays'
    | 'rotationPeriodHours'
    | 'axialTiltDeg'
    | 'sizeClass'
    | 'massClass'
    | 'placeholder'
  >;
};

const commonNodes: readonly GenerationGraphNodeDefinition[] = [
  {
    id: 'enrichment.body.read-scaffold',
    stageId: 'enrichment.body.read-scaffold',
    implementationId: 'generation-runtime.enrichment.body.read-scaffold-v1',
    label: 'Read body scaffold',
    description: 'Read the selected non-primary body and saved orbital context without changing the primary world.',
    inputs: ['core.world-project@1.0.0', 'project.system-orbital-context@1.0.0'],
    outputs: ['enrichment.body.source@1.0.0'],
    fidelity: ['preview', 'standard']
  },
  {
    id: 'enrichment.body.resolve-capabilities',
    stageId: 'enrichment.body.resolve-capabilities',
    implementationId: 'generation-runtime.enrichment.body.resolve-capabilities-v1',
    label: 'Resolve body capabilities',
    description: 'Resolve a body-profile graph before execution so irrelevant atmosphere, terrain, storm, or debris nodes are absent.',
    inputs: ['enrichment.body.source@1.0.0'],
    outputs: ['enrichment.body.capability-profile@1.0.0'],
    fidelity: ['preview', 'standard']
  }
];

const solidNodes: readonly GenerationGraphNodeDefinition[] = [
  {
    id: 'enrichment.body.solid.base-terrain',
    stageId: 'enrichment.body.solid.base-terrain',
    implementationId: 'generation-runtime.enrichment.body.solid.base-terrain-v1',
    label: 'Generate solid terrain',
    description: 'Generate deterministic globe-space relief appropriate to a rocky, dwarf, or airless body.',
    inputs: ['enrichment.body.capability-profile@1.0.0'],
    outputs: ['enrichment.body.solid.base-terrain@1.0.0'],
    fidelity: ['preview', 'standard']
  },
  {
    id: 'enrichment.body.solid.surface-history',
    stageId: 'enrichment.body.solid.surface-history',
    implementationId: 'generation-runtime.enrichment.body.solid.surface-history-v1',
    label: 'Apply surface history',
    description: 'Apply profile-appropriate impacts and bounded volcanic hot spots without running climate or hydrology.',
    inputs: ['enrichment.body.solid.base-terrain@1.0.0'],
    outputs: ['enrichment.body.solid.evolved-terrain@1.0.0'],
    fidelity: ['preview', 'standard']
  },
  {
    id: 'enrichment.body.solid.surface-presentation',
    stageId: 'enrichment.body.solid.surface-presentation',
    implementationId: 'generation-runtime.enrichment.body.solid.surface-presentation-v1',
    label: 'Derive solid-body presentation',
    description: 'Derive deterministic albedo and illustrative thermal fields from the evolved surface.',
    inputs: ['enrichment.body.solid.evolved-terrain@1.0.0'],
    outputs: ['enrichment.body.surface-presentation@1.0.0'],
    fidelity: ['preview', 'standard']
  }
];

const giantNodes: readonly GenerationGraphNodeDefinition[] = [
  {
    id: 'enrichment.body.giant.atmospheric-bands',
    stageId: 'enrichment.body.giant.atmospheric-bands',
    implementationId: 'generation-runtime.enrichment.body.giant.atmospheric-bands-v1',
    label: 'Generate atmospheric bands',
    description: 'Generate deterministic zonal banding for a gas or ice giant without solid-surface terrain nodes.',
    inputs: ['enrichment.body.capability-profile@1.0.0'],
    outputs: ['enrichment.body.giant.band-field@1.0.0'],
    fidelity: ['preview', 'standard']
  },
  {
    id: 'enrichment.body.giant.storm-systems',
    stageId: 'enrichment.body.giant.storm-systems',
    implementationId: 'generation-runtime.enrichment.body.giant.storm-systems-v1',
    label: 'Seed giant storms',
    description: 'Seed deterministic long-lived storm systems and profile-appropriate ring parameters.',
    inputs: ['enrichment.body.giant.band-field@1.0.0'],
    outputs: ['enrichment.body.giant.storms@1.0.0', 'enrichment.body.rings@1.0.0'],
    fidelity: ['preview', 'standard']
  },
  {
    id: 'enrichment.body.giant.surface-presentation',
    stageId: 'enrichment.body.giant.surface-presentation',
    implementationId: 'generation-runtime.enrichment.body.giant.surface-presentation-v1',
    label: 'Derive giant presentation',
    description: 'Derive bounded albedo and thermal presentation fields from atmospheric bands and storms.',
    inputs: ['enrichment.body.giant.band-field@1.0.0', 'enrichment.body.giant.storms@1.0.0'],
    outputs: ['enrichment.body.surface-presentation@1.0.0'],
    fidelity: ['preview', 'standard']
  }
];

const beltNodes: readonly GenerationGraphNodeDefinition[] = [
  {
    id: 'enrichment.body.belt.debris-field',
    stageId: 'enrichment.body.belt.debris-field',
    implementationId: 'generation-runtime.enrichment.body.belt.debris-field-v1',
    label: 'Generate debris field',
    description: 'Generate compact deterministic particle-field parameters instead of pretending a belt has a solid surface.',
    inputs: ['enrichment.body.capability-profile@1.0.0'],
    outputs: ['enrichment.body.belt.debris-field@1.0.0'],
    fidelity: ['preview', 'standard']
  }
];

const finalNodes: readonly GenerationGraphNodeDefinition[] = [
  {
    id: 'enrichment.body.validate',
    stageId: 'enrichment.body.validate',
    implementationId: 'generation-runtime.enrichment.body.validate-v1',
    label: 'Validate generated body',
    description: 'Validate profile compatibility, field dimensions, finite bounded values, and deterministic presentation parameters.',
    inputs: ['enrichment.body.surface-presentation@1.0.0', 'enrichment.body.belt.debris-field@1.0.0'],
    outputs: ['enrichment.body.validation@1.0.0'],
    fidelity: ['preview', 'standard']
  },
  {
    id: 'enrichment.body.persist',
    stageId: 'enrichment.body.persist',
    implementationId: 'generation-runtime.enrichment.body.persist-v1',
    label: 'Package generated body',
    description: 'Package the selected body with workflow graph identity, source invalidation, timings, validation, and deterministic provenance.',
    inputs: ['enrichment.body.validation@1.0.0'],
    outputs: ['project.generate-system-body@1.0.0'],
    fidelity: ['preview', 'standard']
  }
];

export function resolveSystemBodyProfile(body: Pick<OrbitalPresentationBody, 'kind'>): BodyGenerationProfile {
  if (body.kind === 'moon') return 'airless-rocky-body';
  if (body.kind === 'rocky') return 'rocky-body';
  if (body.kind === 'gas-giant') return 'gas-giant-body';
  if (body.kind === 'ice-giant') return 'ice-giant-body';
  if (body.kind === 'dwarf') return 'dwarf-body';
  return 'debris-belt';
}

export function systemBodyGenerationNodes(profile: BodyGenerationProfile): readonly GenerationGraphNodeDefinition[] {
  const profileNodes = profile === 'debris-belt'
    ? beltNodes
    : profile === 'gas-giant-body' || profile === 'ice-giant-body'
      ? giantNodes
      : solidNodes;
  return [...commonNodes, ...profileNodes, ...finalNodes];
}

export function systemBodyGenerationWorkflowDescriptor(profile: BodyGenerationProfile) {
  return {
    kind: 'enrichment' as const,
    id: SYSTEM_BODY_GENERATION_WORKFLOW_ID,
    version: SYSTEM_BODY_GENERATION_WORKFLOW_VERSION,
    label: `Generate ${formatProfile(profile)}`,
    description: 'Capability-resolved selected-body workflow that includes only nodes structurally relevant to the selected body.',
    status: 'experimental' as const,
    artifactKey: SYSTEM_BODY_GENERATION_WORKFLOW_ID,
    nodes: systemBodyGenerationNodes(profile)
  };
}

export function systemBodyArtifactKey(bodyId: string): `project.generate-system-body:${string}` {
  return `${SYSTEM_BODY_GENERATION_WORKFLOW_ID}:${bodyId}`;
}

export function systemBodyGenerationSourceFromProject(
  project: WorldProject,
  orbitalContext: SystemOrbitalContextArtifact,
  bodyId: string,
  requestedFidelity: BodyGenerationFidelity
): SystemBodyGenerationSource {
  const body = orbitalContext.payload.bodies.find((candidate) => candidate.id === bodyId);
  if (!body) throw new Error(`System body ${bodyId} is not present in the orbital artifact.`);
  if (body.id === orbitalContext.payload.primaryBodyId) {
    throw new Error('The primary world remains owned by the ordinary world-generation workflow.');
  }
  const profile = resolveSystemBodyProfile(body);
  return {
    projectId: project.projectId,
    worldId: project.primaryWorld.id,
    bodyId,
    parentBodyId: body.parentBodyId,
    seed: `${project.seed}:body:${bodyId}:${profile}:v1`,
    generatorVersion: project.generatorVersion,
    appVersion: project.appVersion,
    sourceCommit: project.sourceCommit,
    orbitalArtifactSignature: orbitalContext.artifactSignature,
    requestedFidelity,
    profile,
    systemAgeGy: project.solarSystem.ageGy,
    body: {
      id: body.id,
      parentBodyId: body.parentBodyId,
      kind: body.kind,
      orbitalOrder: body.orbitalOrder,
      semiMajorAxisAu: body.semiMajorAxisAu,
      semiMajorAxisParentRadii: body.semiMajorAxisParentRadii,
      eccentricity: body.eccentricity,
      orbitalPeriodDays: body.orbitalPeriodDays,
      rotationPeriodHours: body.rotationPeriodHours,
      axialTiltDeg: body.axialTiltDeg,
      sizeClass: body.sizeClass,
      massClass: body.massClass,
      placeholder: body.placeholder
    }
  };
}

export function systemBodyGenerationSourceSignature(source: SystemBodyGenerationSource): string {
  return stableSignature({
    projectId: source.projectId,
    worldId: source.worldId,
    bodyId: source.bodyId,
    parentBodyId: source.parentBodyId,
    seed: source.seed,
    generatorVersion: source.generatorVersion,
    orbitalArtifactSignature: source.orbitalArtifactSignature,
    requestedFidelity: source.requestedFidelity,
    profile: source.profile,
    systemAgeGy: round(source.systemAgeGy, 6),
    body: source.body
  });
}

export function systemBodyGenerationGraphSignature(profile: BodyGenerationProfile): string {
  return stableSignature(systemBodyGenerationNodes(profile).map((node) => ({
    id: node.id,
    stageId: node.stageId,
    implementationId: node.implementationId,
    inputs: node.inputs,
    outputs: node.outputs,
    fidelity: node.fidelity
  })));
}

export function isCurrentGeneratedSystemBodyArtifact(
  source: SystemBodyGenerationSource,
  artifact: unknown
): artifact is GeneratedSystemBodyArtifact {
  if (!artifact || typeof artifact !== 'object') return false;
  const candidate = artifact as Partial<GeneratedSystemBodyArtifact>;
  return candidate.artifactKey === systemBodyArtifactKey(source.bodyId)
    && candidate.artifactVersion === 1
    && candidate.status === 'complete'
    && candidate.bodyId === source.bodyId
    && candidate.bodyProfile === source.profile
    && candidate.requestedFidelity === source.requestedFidelity
    && candidate.workflow?.version === SYSTEM_BODY_GENERATION_WORKFLOW_VERSION
    && candidate.workflow?.graphSignature === systemBodyGenerationGraphSignature(source.profile)
    && candidate.source?.sourceSignature === systemBodyGenerationSourceSignature(source)
    && candidate.validation?.valid === true;
}

export async function runSystemBodyGenerationWorkflow(source: SystemBodyGenerationSource, options: {
  onNodeEvent?: (event: ProjectEnrichmentNodeEvent) => void;
  isCancelled?: () => boolean;
  yieldControl?: () => Promise<void>;
} = {}): Promise<GeneratedSystemBodyArtifact> {
  validateSource(source);
  const workflowStarted = nowMs();
  const startedAt = new Date().toISOString();
  const nodes = systemBodyGenerationNodes(source.profile);
  const resolution = source.requestedFidelity === 'standard'
    ? { width: 128, height: 64 }
    : { width: 64, height: 32 };
  const nodeRuns: EnrichmentNodeRunRecord[] = [];
  let heightField: number[] = [];
  let albedoField: number[] = [];
  let thermalField: number[] = [];
  let bandField: number[] = [];
  let features: GeneratedSystemBodyFeature[] = [];
  let craterCount = 0;
  let rings: GeneratedSystemBodyArtifact['payload']['rings'] = null;
  let belt: GeneratedSystemBodyArtifact['payload']['belt'] = null;
  let validation: GeneratedSystemBodyArtifact['validation'] = { valid: true, issues: [] };

  for (const definition of nodes) {
    if (options.isCancelled?.()) throw new Error('Project enrichment cancelled.');
    const nodeStarted = nowMs();
    const nodeStartedIso = new Date().toISOString();
    options.onNodeEvent?.({
      workflowId: SYSTEM_BODY_GENERATION_WORKFLOW_ID,
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
      if (definition.id === 'enrichment.body.read-scaffold') {
        validateSource(source);
      } else if (definition.id === 'enrichment.body.resolve-capabilities') {
        if (resolveSystemBodyProfile(source.body) !== source.profile) {
          throw new Error('Resolved body profile does not match the selected scaffold.');
        }
      } else if (definition.id === 'enrichment.body.solid.base-terrain') {
        heightField = generateBaseTerrain(source, resolution);
      } else if (definition.id === 'enrichment.body.solid.surface-history') {
        const evolved = applySolidSurfaceHistory(source, resolution, heightField);
        heightField = evolved.heightField;
        features = evolved.features;
        craterCount = evolved.craterCount;
      } else if (definition.id === 'enrichment.body.solid.surface-presentation') {
        const presentation = deriveSolidPresentation(source, resolution, heightField);
        albedoField = presentation.albedoField;
        thermalField = presentation.thermalField;
      } else if (definition.id === 'enrichment.body.giant.atmospheric-bands') {
        const bands = generateGiantBands(source, resolution);
        bandField = bands.bandField;
        albedoField = bands.albedoField;
        thermalField = bands.thermalField;
      } else if (definition.id === 'enrichment.body.giant.storm-systems') {
        features = generateStormFeatures(source);
        rings = generateRingPresentation(source);
      } else if (definition.id === 'enrichment.body.giant.surface-presentation') {
        albedoField = applyStormsToField(resolution, albedoField, features);
      } else if (definition.id === 'enrichment.body.belt.debris-field') {
        belt = generateBeltPresentation(source);
      } else if (definition.id === 'enrichment.body.validate') {
        validation = validateGeneratedBody(
          source,
          resolution,
          heightField,
          albedoField,
          thermalField,
          bandField,
          features,
          belt
        );
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
        validation: definition.id === 'enrichment.body.validate' ? validation : undefined
      };
      nodeRuns.push(record);
      options.onNodeEvent?.({
        workflowId: SYSTEM_BODY_GENERATION_WORKFLOW_ID,
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
        workflowId: SYSTEM_BODY_GENERATION_WORKFLOW_ID,
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
        validation: definition.id === 'enrichment.body.validate' ? validation : undefined,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  const roundedHeight = heightField.map((value) => round(clamp(value, -1, 1), 6));
  const roundedAlbedo = albedoField.map((value) => round(clamp(value, 0, 1), 6));
  const roundedThermal = thermalField.map((value) => round(clamp(value, 0, 1), 6));
  const roundedBands = bandField.map((value) => round(clamp(value, -1, 1), 6));
  const payload: GeneratedSystemBodyArtifact['payload'] = {
    modelVersion: 'system-body-presentation-v1',
    presentationKind: presentationKind(source.profile),
    resolution,
    radiusClass: round(Math.max(0.05, source.body.sizeClass), 6),
    craterCount,
    heightField: roundedHeight,
    albedoField: roundedAlbedo,
    thermalField: roundedThermal,
    bandField: roundedBands,
    features,
    rings,
    belt,
    stats: {
      minHeight: roundedHeight.length ? round(Math.min(...roundedHeight), 6) : 0,
      maxHeight: roundedHeight.length ? round(Math.max(...roundedHeight), 6) : 0,
      meanAlbedo: roundedAlbedo.length ? round(mean(roundedAlbedo), 6) : 0,
      seamMeanDelta: roundedHeight.length
        ? round(seamMeanDelta(roundedHeight, resolution), 6)
        : roundedBands.length
          ? round(seamMeanDelta(roundedBands, resolution), 6)
          : 0
    }
  };
  const completedAt = new Date().toISOString();
  const artifact: GeneratedSystemBodyArtifact = {
    artifactKey: systemBodyArtifactKey(source.bodyId),
    artifactVersion: 1,
    artifactRole: 'derived',
    status: 'complete',
    bodyId: source.bodyId,
    bodyProfile: source.profile,
    requestedFidelity: source.requestedFidelity,
    workflow: {
      id: SYSTEM_BODY_GENERATION_WORKFLOW_ID,
      version: SYSTEM_BODY_GENERATION_WORKFLOW_VERSION,
      graphSignature: systemBodyGenerationGraphSignature(source.profile),
      nodes: nodeRuns
    },
    source: {
      projectId: source.projectId,
      worldId: source.worldId,
      bodyId: source.bodyId,
      parentBodyId: source.parentBodyId,
      sourceSignature: systemBodyGenerationSourceSignature(source),
      orbitalArtifactSignature: source.orbitalArtifactSignature,
      generatorVersion: source.generatorVersion,
      appVersion: source.appVersion,
      sourceCommit: source.sourceCommit
    },
    seed: source.seed,
    startedAt,
    completedAt,
    totalMs: round(nowMs() - workflowStarted, 3),
    artifactSignature: '',
    validation,
    payload
  };
  artifact.artifactSignature = stableSignature({
    artifactKey: artifact.artifactKey,
    artifactVersion: artifact.artifactVersion,
    bodyId: artifact.bodyId,
    bodyProfile: artifact.bodyProfile,
    requestedFidelity: artifact.requestedFidelity,
    workflow: {
      id: artifact.workflow.id,
      version: artifact.workflow.version,
      graphSignature: artifact.workflow.graphSignature
    },
    source: artifact.source,
    seed: artifact.seed,
    validation: artifact.validation,
    payload: artifact.payload
  });
  return artifact;
}

function validateSource(source: SystemBodyGenerationSource): void {
  if (!source.projectId || !source.worldId || !source.bodyId) throw new Error('Body-generation source identity is incomplete.');
  if (!source.orbitalArtifactSignature) throw new Error('Body generation requires a saved orbital artifact.');
  if (!Number.isFinite(source.body.sizeClass) || source.body.sizeClass <= 0) throw new Error('Body size class must be positive.');
  if (!Number.isFinite(source.body.massClass) || source.body.massClass <= 0) throw new Error('Body mass class must be positive.');
}

function generateBaseTerrain(
  source: SystemBodyGenerationSource,
  resolution: { width: number; height: number }
): number[] {
  const values = new Array<number>(resolution.width * resolution.height);
  const phaseA = hashUnit(source.seed, 11) * Math.PI * 2;
  const phaseB = hashUnit(source.seed, 17) * Math.PI * 2;
  const roughness = source.profile === 'rocky-body' ? 0.56 : source.profile === 'dwarf-body' ? 0.48 : 0.4;
  for (let y = 0; y < resolution.height; y += 1) {
    const v = (y + 0.5) / resolution.height;
    const latitude = (0.5 - v) * Math.PI;
    for (let x = 0; x < resolution.width; x += 1) {
      const u = (x + 0.5) / resolution.width;
      const longitude = (u * 2 - 1) * Math.PI;
      const large = Math.sin(longitude * 2 + phaseA) * Math.cos(latitude * 1.7)
        + Math.cos(longitude * 3 - phaseB) * Math.cos(latitude * 2.4) * 0.55;
      const ridges = Math.abs(Math.sin(longitude * 5 + latitude * 4 + phaseB)) * 2 - 1;
      const noise = hashSigned(source.seed, x + y * resolution.width);
      values[y * resolution.width + x] = clamp((large * 0.42 + ridges * 0.22 + noise * 0.36) * roughness, -1, 1);
    }
  }
  return normalizeField(values, -0.92, 0.92);
}

function applySolidSurfaceHistory(
  source: SystemBodyGenerationSource,
  resolution: { width: number; height: number },
  input: number[]
): { heightField: number[]; features: GeneratedSystemBodyFeature[]; craterCount: number } {
  const heightField = [...input];
  const ageFactor = clamp(source.systemAgeGy / 8, 0.2, 1.4);
  const baseCraterCount = source.profile === 'rocky-body' ? 7 : source.profile === 'dwarf-body' ? 22 : 18;
  const fidelityFactor = source.requestedFidelity === 'standard' ? 1.65 : 1;
  const craterCount = Math.max(4, Math.round(baseCraterCount * ageFactor * fidelityFactor));
  const features: GeneratedSystemBodyFeature[] = [];
  for (let index = 0; index < craterCount; index += 1) {
    const radius = 1.4 + hashUnit(source.seed, 1000 + index * 7) * (source.profile === 'rocky-body' ? 7 : 11);
    const feature: GeneratedSystemBodyFeature = {
      id: `crater-${index + 1}`,
      kind: 'crater',
      longitudeDeg: round(hashSigned(source.seed, 1001 + index * 7) * 180, 4),
      latitudeDeg: round(hashSigned(source.seed, 1002 + index * 7) * 72, 4),
      angularRadiusDeg: round(radius, 4),
      contrast: round(-0.12 - hashUnit(source.seed, 1003 + index * 7) * 0.24, 4),
      hueShift: 0
    };
    features.push(feature);
    stampCrater(heightField, resolution, feature);
  }
  if (source.profile === 'rocky-body') {
    const hotSpotCount = 2 + Math.floor(hashUnit(source.seed, 1900) * 4);
    for (let index = 0; index < hotSpotCount; index += 1) {
      const feature: GeneratedSystemBodyFeature = {
        id: `hotspot-${index + 1}`,
        kind: 'volcanic-hotspot',
        longitudeDeg: round(hashSigned(source.seed, 1910 + index * 5) * 180, 4),
        latitudeDeg: round(hashSigned(source.seed, 1911 + index * 5) * 58, 4),
        angularRadiusDeg: round(2.5 + hashUnit(source.seed, 1912 + index * 5) * 6, 4),
        contrast: round(0.08 + hashUnit(source.seed, 1913 + index * 5) * 0.18, 4),
        hueShift: round(-0.1 - hashUnit(source.seed, 1914 + index * 5) * 0.12, 4)
      };
      features.push(feature);
      stampHotSpot(heightField, resolution, feature);
    }
  }
  return { heightField: normalizeField(heightField, -1, 1), features, craterCount };
}

function deriveSolidPresentation(
  source: SystemBodyGenerationSource,
  resolution: { width: number; height: number },
  heightField: number[]
): { albedoField: number[]; thermalField: number[] } {
  const albedoField = new Array<number>(heightField.length);
  const thermalField = new Array<number>(heightField.length);
  const distance = Math.max(0.15, source.body.semiMajorAxisAu ?? 1);
  for (let y = 0; y < resolution.height; y += 1) {
    const v = (y + 0.5) / resolution.height;
    const latitude = (0.5 - v) * Math.PI;
    const polar = Math.pow(Math.abs(Math.sin(latitude)), 3);
    for (let x = 0; x < resolution.width; x += 1) {
      const index = y * resolution.width + x;
      const u = (x + 0.5) / resolution.width;
      const longitude = (u * 2 - 1) * Math.PI;
      const height = heightField[index] ?? 0;
      const noise = hashSigned(source.seed, 3000 + index);
      const profileBase = source.profile === 'rocky-body' ? 0.46 : source.profile === 'dwarf-body' ? 0.58 : 0.39;
      const frost = source.profile === 'dwarf-body' ? clamp((distance - 2) / 8, 0, 0.28) + polar * 0.16 : polar * 0.05;
      albedoField[index] = clamp(profileBase + height * 0.16 + noise * 0.06 + frost, 0.08, 0.94);
      const insolation = Math.max(0, Math.cos(latitude) * Math.cos(longitude));
      thermalField[index] = clamp(Math.sqrt(insolation) / Math.sqrt(distance), 0, 1);
    }
  }
  return { albedoField, thermalField };
}

function generateGiantBands(
  source: SystemBodyGenerationSource,
  resolution: { width: number; height: number }
): { bandField: number[]; albedoField: number[]; thermalField: number[] } {
  const bandField = new Array<number>(resolution.width * resolution.height);
  const albedoField = new Array<number>(bandField.length);
  const thermalField = new Array<number>(bandField.length);
  const phase = hashUnit(source.seed, 4000) * Math.PI * 2;
  const frequency = source.profile === 'gas-giant-body' ? 11 : 8;
  for (let y = 0; y < resolution.height; y += 1) {
    const v = (y + 0.5) / resolution.height;
    const latitude = (0.5 - v) * Math.PI;
    for (let x = 0; x < resolution.width; x += 1) {
      const index = y * resolution.width + x;
      const u = (x + 0.5) / resolution.width;
      const longitude = (u * 2 - 1) * Math.PI;
      const turbulence = Math.sin(longitude * 3 + latitude * 5 + phase) * 0.13
        + hashSigned(source.seed, 4100 + index) * 0.12;
      const band = Math.sin(latitude * frequency + phase) * 0.62
        + Math.sin(latitude * frequency * 2.4 - phase * 0.7) * 0.22
        + turbulence;
      bandField[index] = clamp(band, -1, 1);
      albedoField[index] = clamp(0.52 + band * 0.2 + turbulence * 0.16, 0.18, 0.88);
      thermalField[index] = clamp(0.38 + Math.cos(latitude) * 0.28 + turbulence * 0.08, 0, 1);
    }
  }
  return { bandField, albedoField, thermalField };
}

function generateStormFeatures(source: SystemBodyGenerationSource): GeneratedSystemBodyFeature[] {
  const count = 3 + Math.floor(hashUnit(source.seed, 5000) * (source.requestedFidelity === 'standard' ? 7 : 4));
  return Array.from({ length: count }, (_, index) => ({
    id: `storm-${index + 1}`,
    kind: 'storm' as const,
    longitudeDeg: round(hashSigned(source.seed, 5010 + index * 6) * 180, 4),
    latitudeDeg: round(hashSigned(source.seed, 5011 + index * 6) * 52, 4),
    angularRadiusDeg: round(3 + hashUnit(source.seed, 5012 + index * 6) * 12, 4),
    contrast: round((hashUnit(source.seed, 5013 + index * 6) - 0.45) * 0.42, 4),
    hueShift: round(hashSigned(source.seed, 5014 + index * 6) * 0.18, 4)
  }));
}

function generateRingPresentation(source: SystemBodyGenerationSource): GeneratedSystemBodyArtifact['payload']['rings'] {
  const chance = source.profile === 'ice-giant-body' ? 0.62 : 0.44;
  if (hashUnit(source.seed, 6100) > chance) return null;
  return {
    innerRadius: round(1.28 + hashUnit(source.seed, 6101) * 0.18, 4),
    outerRadius: round(1.72 + hashUnit(source.seed, 6102) * 0.45, 4),
    opacity: round(0.28 + hashUnit(source.seed, 6103) * 0.36, 4),
    tiltDeg: round(hashSigned(source.seed, 6104) * 12, 4)
  };
}

function applyStormsToField(
  resolution: { width: number; height: number },
  input: number[],
  features: GeneratedSystemBodyFeature[]
): number[] {
  const output = [...input];
  for (let y = 0; y < resolution.height; y += 1) {
    const latitudeDeg = 90 - ((y + 0.5) / resolution.height) * 180;
    for (let x = 0; x < resolution.width; x += 1) {
      const longitudeDeg = ((x + 0.5) / resolution.width) * 360 - 180;
      let value = output[y * resolution.width + x] ?? 0.5;
      for (const feature of features) {
        const distance = angularDistanceApprox(longitudeDeg, latitudeDeg, feature.longitudeDeg, feature.latitudeDeg);
        if (distance > feature.angularRadiusDeg) continue;
        const influence = 1 - distance / feature.angularRadiusDeg;
        value += feature.contrast * influence * influence;
      }
      output[y * resolution.width + x] = clamp(value, 0, 1);
    }
  }
  return output;
}

function generateBeltPresentation(source: SystemBodyGenerationSource): NonNullable<GeneratedSystemBodyArtifact['payload']['belt']> {
  const fidelityFactor = source.requestedFidelity === 'standard' ? 1.8 : 1;
  return {
    particleCount: Math.round((520 + source.body.massClass * 90) * fidelityFactor),
    innerRadius: round(0.72 + hashUnit(source.seed, 7001) * 0.1, 4),
    outerRadius: round(1.24 + hashUnit(source.seed, 7002) * 0.18, 4),
    verticalSpread: round(0.025 + hashUnit(source.seed, 7003) * 0.075, 4)
  };
}

function validateGeneratedBody(
  source: SystemBodyGenerationSource,
  resolution: { width: number; height: number },
  heightField: number[],
  albedoField: number[],
  thermalField: number[],
  bandField: number[],
  features: GeneratedSystemBodyFeature[],
  belt: GeneratedSystemBodyArtifact['payload']['belt']
): GeneratedSystemBodyArtifact['validation'] {
  const issues: GeneratedSystemBodyArtifact['validation']['issues'] = [];
  const expected = resolution.width * resolution.height;
  const isBelt = source.profile === 'debris-belt';
  const isGiant = source.profile === 'gas-giant-body' || source.profile === 'ice-giant-body';
  if (isBelt) {
    if (!belt || belt.particleCount <= 0) issues.push({ severity: 'error', message: 'Debris-belt profile did not produce particle-field parameters.' });
    if (heightField.length || albedoField.length || thermalField.length || bandField.length) {
      issues.push({ severity: 'error', message: 'Debris belts must not carry fake solid-surface fields.' });
    }
  } else {
    if (albedoField.length !== expected || thermalField.length !== expected) {
      issues.push({ severity: 'error', message: 'Surface presentation fields do not match the selected resolution.' });
    }
    if (isGiant) {
      if (heightField.length !== 0) issues.push({ severity: 'error', message: 'Giant profiles must not include solid terrain fields.' });
      if (bandField.length !== expected) issues.push({ severity: 'error', message: 'Giant band field does not match the selected resolution.' });
    } else {
      if (heightField.length !== expected) issues.push({ severity: 'error', message: 'Solid-body height field does not match the selected resolution.' });
      if (bandField.length !== 0) issues.push({ severity: 'error', message: 'Solid-body profiles must not include giant atmospheric bands.' });
    }
  }
  for (const field of [heightField, albedoField, thermalField, bandField]) {
    if (field.some((value) => !Number.isFinite(value))) {
      issues.push({ severity: 'error', message: 'Generated body contains a non-finite presentation value.' });
      break;
    }
  }
  if (features.some((feature) => !Number.isFinite(feature.longitudeDeg) || !Number.isFinite(feature.latitudeDeg) || feature.angularRadiusDeg <= 0)) {
    issues.push({ severity: 'error', message: 'Generated body contains an invalid surface or atmospheric feature.' });
  }
  return { valid: issues.length === 0, issues };
}

function stampCrater(
  field: number[],
  resolution: { width: number; height: number },
  feature: GeneratedSystemBodyFeature
): void {
  for (let y = 0; y < resolution.height; y += 1) {
    const latitudeDeg = 90 - ((y + 0.5) / resolution.height) * 180;
    for (let x = 0; x < resolution.width; x += 1) {
      const longitudeDeg = ((x + 0.5) / resolution.width) * 360 - 180;
      const distance = angularDistanceApprox(longitudeDeg, latitudeDeg, feature.longitudeDeg, feature.latitudeDeg);
      if (distance > feature.angularRadiusDeg * 1.35) continue;
      const normalized = distance / feature.angularRadiusDeg;
      const bowl = normalized <= 1 ? -(1 - normalized * normalized) * 0.28 : 0;
      const rim = normalized > 0.82 && normalized < 1.35 ? Math.sin((normalized - 0.82) / 0.53 * Math.PI) * 0.12 : 0;
      const index = y * resolution.width + x;
      field[index] = clamp((field[index] ?? 0) + bowl + rim, -1.4, 1.4);
    }
  }
}

function stampHotSpot(
  field: number[],
  resolution: { width: number; height: number },
  feature: GeneratedSystemBodyFeature
): void {
  for (let y = 0; y < resolution.height; y += 1) {
    const latitudeDeg = 90 - ((y + 0.5) / resolution.height) * 180;
    for (let x = 0; x < resolution.width; x += 1) {
      const longitudeDeg = ((x + 0.5) / resolution.width) * 360 - 180;
      const distance = angularDistanceApprox(longitudeDeg, latitudeDeg, feature.longitudeDeg, feature.latitudeDeg);
      if (distance > feature.angularRadiusDeg) continue;
      const influence = 1 - distance / feature.angularRadiusDeg;
      const index = y * resolution.width + x;
      field[index] = clamp((field[index] ?? 0) + influence * influence * 0.18, -1.4, 1.4);
    }
  }
}

function angularDistanceApprox(lonA: number, latA: number, lonB: number, latB: number): number {
  let deltaLon = Math.abs(lonA - lonB);
  if (deltaLon > 180) deltaLon = 360 - deltaLon;
  const latitudeScale = Math.max(0.18, Math.cos(((latA + latB) * 0.5) * Math.PI / 180));
  return Math.hypot(deltaLon * latitudeScale, latA - latB);
}

function presentationKind(profile: BodyGenerationProfile): GeneratedSystemBodyArtifact['payload']['presentationKind'] {
  if (profile === 'gas-giant-body') return 'gas-giant';
  if (profile === 'ice-giant-body') return 'ice-giant';
  if (profile === 'debris-belt') return 'belt';
  return 'solid';
}

function formatProfile(profile: BodyGenerationProfile): string {
  return profile.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function normalizeField(values: number[], min: number, max: number): number[] {
  if (!values.length) return [];
  const sourceMin = Math.min(...values);
  const sourceMax = Math.max(...values);
  if (Math.abs(sourceMax - sourceMin) < 1e-9) return values.map(() => (min + max) * 0.5);
  return values.map((value) => min + ((value - sourceMin) / (sourceMax - sourceMin)) * (max - min));
}

function seamMeanDelta(field: number[], resolution: { width: number; height: number }): number {
  if (!field.length || resolution.width <= 1) return 0;
  let total = 0;
  for (let y = 0; y < resolution.height; y += 1) {
    total += Math.abs((field[y * resolution.width] ?? 0) - (field[y * resolution.width + resolution.width - 1] ?? 0));
  }
  return total / resolution.height;
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function hashSigned(seed: string, index: number): number {
  return hashUnit(seed, index) * 2 - 1;
}

function hashUnit(seed: string, index: number): number {
  let hash = 2166136261;
  const value = `${seed}:${index}`;
  for (let offset = 0; offset < value.length; offset += 1) {
    hash ^= value.charCodeAt(offset);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 15;
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

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

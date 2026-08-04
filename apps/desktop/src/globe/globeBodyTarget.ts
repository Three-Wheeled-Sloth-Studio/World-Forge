import type {
  BodyGenerationFidelity,
  GeneratedSystemBodyArtifact,
  OrbitalPresentationBody,
  SystemOrbitalContextArtifact,
  WorldProject
} from '@world-forge/shared';
import type { AtmosphericPresentationDetailV1 } from '@world-forge/shared/worldBodyDetails';
import {
  projectForWorldBody,
  worldBodyRecord,
  type MultiBodyWorldProject,
} from '@world-forge/shared/worldBodies';
import { rememberSessionActiveWorldBody } from '@world-forge/shared/worldBodySession';
import { bodyArtifactForBody } from '@world-forge/generation-runtime/enrichment/bodyGenerationLifecycle';

export type GlobeBodyTargetMode =
  | 'primary-world'
  | 'canonical-surface-body'
  | 'atmospheric-presentation-body'
  | 'generated-system-body';

export type GlobeBodyTarget = {
  bodyId: string;
  label: string;
  mode: GlobeBodyTargetMode;
  body: OrbitalPresentationBody;
  artifact: GeneratedSystemBodyArtifact | null;
  surfaceProject: WorldProject | null;
  atmosphericDetail: AtmosphericPresentationDetailV1 | null;
};

type ArtifactLookup = (
  project: WorldProject,
  orbitalContext: SystemOrbitalContextArtifact,
  bodyId: string,
  requestedFidelity: BodyGenerationFidelity
) => GeneratedSystemBodyArtifact | null;

export function resolveGlobeBodyTarget(
  project: WorldProject,
  orbitalContext: SystemOrbitalContextArtifact,
  requestedBodyId: string,
  artifactLookup: ArtifactLookup = bodyArtifactForBody
): GlobeBodyTarget | null {
  const primary = orbitalContext.payload.bodies.find((body) => body.id === orbitalContext.payload.primaryBodyId);
  if (!primary) return null;
  const primaryTarget = (): GlobeBodyTarget => {
    rememberSessionActiveWorldBody(project, primary.id);
    return {
      bodyId: primary.id,
      label: worldBodyRecord(project, primary.id)?.name ?? project.primaryWorld.name,
      mode: 'primary-world',
      body: primary,
      artifact: null,
      surfaceProject: project,
      atmosphericDetail: null,
    };
  };
  if (!requestedBodyId || requestedBodyId === primary.id) return primaryTarget();

  const requested = orbitalContext.payload.bodies.find((body) => body.id === requestedBodyId);
  if (!requested) return primaryTarget();

  const surfaceProject = projectForWorldBody(project, requestedBodyId);
  if (surfaceProject) {
    rememberSessionActiveWorldBody(project, requested.id);
    return {
      bodyId: requested.id,
      label: worldBodyRecord(project, requested.id)?.name ?? bodyLabel(project, requested),
      mode: 'canonical-surface-body',
      body: requested,
      artifact: null,
      surfaceProject,
      atmosphericDetail: null,
    };
  }

  const bodyRecord = worldBodyRecord(project, requestedBodyId);
  const atmosphericDetail = bodyRecord?.detail?.kind === 'atmospheric-presentation'
    ? bodyRecord.detail
    : null;
  const appearanceAsset = atmosphericDetail?.assets?.find((asset) => asset.role === 'albedo' || asset.role === 'clouds');
  const appearanceBytes = appearanceAsset
    ? (project as MultiBodyWorldProject).bodyAssetPayloads?.[appearanceAsset.assetId]
    : undefined;
  if (bodyRecord?.capabilities.globe && atmosphericDetail && appearanceAsset && appearanceBytes?.byteLength) {
    rememberSessionActiveWorldBody(project, requested.id);
    return {
      bodyId: requested.id,
      label: bodyRecord.name,
      mode: 'atmospheric-presentation-body',
      body: requested,
      artifact: null,
      surfaceProject: null,
      atmosphericDetail,
    };
  }

  const record = project.bodyGeneration?.records[requestedBodyId];
  if (record?.status !== 'generated') return primaryTarget();
  const fidelity = record.requestedFidelity ?? 'preview';
  const artifact = artifactLookup(project, orbitalContext, requestedBodyId, fidelity);
  if (!artifact) return primaryTarget();
  rememberSessionActiveWorldBody(project, requested.id);
  return {
    bodyId: requested.id,
    label: bodyRecord?.name ?? bodyLabel(project, requested),
    mode: 'generated-system-body',
    body: requested,
    artifact,
    surfaceProject: null,
    atmosphericDetail: null,
  };
}

function bodyLabel(project: WorldProject, body: OrbitalPresentationBody): string {
  if (body.kind === 'moon') {
    const parent = project.solarSystem.bodies.find((candidate) => candidate.id === body.parentBodyId);
    const prefix = parent ? `${parent.id}:` : '';
    const moonId = prefix && body.id.startsWith(prefix) ? body.id.slice(prefix.length) : body.id;
    const moon = parent?.moons.find((candidate) => candidate.id === moonId);
    return moon?.name || `Moon ${body.orbitalOrder}`;
  }
  const kind = body.kind.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  return `${kind} ${body.orbitalOrder}`;
}

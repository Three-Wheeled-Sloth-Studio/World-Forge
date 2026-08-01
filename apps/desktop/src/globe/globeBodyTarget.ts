import type {
  BodyGenerationFidelity,
  GeneratedSystemBodyArtifact,
  OrbitalPresentationBody,
  SystemOrbitalContextArtifact,
  WorldProject
} from '@world-forge/shared';
import { bodyArtifactForBody } from '@world-forge/generation-runtime/enrichment/bodyGenerationLifecycle';

export type GlobeBodyTargetMode = 'primary-world' | 'generated-system-body';

export type GlobeBodyTarget = {
  bodyId: string;
  label: string;
  mode: GlobeBodyTargetMode;
  body: OrbitalPresentationBody;
  artifact: GeneratedSystemBodyArtifact | null;
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
  const primaryTarget = (): GlobeBodyTarget => ({
    bodyId: primary.id,
    label: project.projectName,
    mode: 'primary-world',
    body: primary,
    artifact: null
  });
  if (!requestedBodyId || requestedBodyId === primary.id) return primaryTarget();

  const requested = orbitalContext.payload.bodies.find((body) => body.id === requestedBodyId);
  const record = project.bodyGeneration?.records[requestedBodyId];
  if (!requested || record?.status !== 'generated') return primaryTarget();
  const fidelity = record.requestedFidelity ?? 'preview';
  const artifact = artifactLookup(project, orbitalContext, requestedBodyId, fidelity);
  if (!artifact) return primaryTarget();
  return {
    bodyId: requested.id,
    label: bodyLabel(project, requested),
    mode: 'generated-system-body',
    body: requested,
    artifact
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

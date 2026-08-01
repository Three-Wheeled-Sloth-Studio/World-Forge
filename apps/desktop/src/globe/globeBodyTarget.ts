import type {
  AirlessRockyBodyArtifact,
  BodyGenerationFidelity,
  OrbitalPresentationBody,
  SystemOrbitalContextArtifact,
  WorldProject
} from '@world-forge/shared';
import { airlessArtifactForBody } from '@world-forge/generation-runtime/enrichment/bodyGenerationLifecycle';

export type GlobeBodyTargetMode = 'primary-world' | 'generated-airless-moon';

export type GlobeBodyTarget = {
  bodyId: string;
  label: string;
  mode: GlobeBodyTargetMode;
  body: OrbitalPresentationBody;
  artifact: AirlessRockyBodyArtifact | null;
};

type ArtifactLookup = (
  project: WorldProject,
  orbitalContext: SystemOrbitalContextArtifact,
  bodyId: string,
  requestedFidelity: BodyGenerationFidelity
) => AirlessRockyBodyArtifact | null;

export function resolveGlobeBodyTarget(
  project: WorldProject,
  orbitalContext: SystemOrbitalContextArtifact,
  requestedBodyId: string,
  artifactLookup: ArtifactLookup = airlessArtifactForBody
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
  if (!requested || requested.kind !== 'moon' || record?.status !== 'generated') return primaryTarget();
  const fidelity = record.requestedFidelity ?? 'preview';
  const artifact = artifactLookup(project, orbitalContext, requestedBodyId, fidelity);
  if (!artifact) return primaryTarget();
  return {
    bodyId: requested.id,
    label: moonLabel(project, requested),
    mode: 'generated-airless-moon',
    body: requested,
    artifact
  };
}

function moonLabel(project: WorldProject, body: OrbitalPresentationBody): string {
  const parent = project.solarSystem.bodies.find((candidate) => candidate.id === body.parentBodyId);
  const prefix = parent ? `${parent.id}:` : '';
  const moonId = prefix && body.id.startsWith(prefix) ? body.id.slice(prefix.length) : body.id;
  const moon = parent?.moons.find((candidate) => candidate.id === moonId);
  return moon?.name || `Moon ${body.orbitalOrder}`;
}

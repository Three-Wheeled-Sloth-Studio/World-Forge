import type {
  BodyGenerationLifecycleStatus,
  BodyGenerationProfile,
  OrbitalPresentationBody,
  SystemOrbitalContextArtifact,
  WorldProject
} from '@world-forge/shared';
import { worldBodyRecord } from '@world-forge/shared/worldBodies';
import { orbitalPositionAtDays, type OrbitalPoint } from '../globe/orbitalPresentation';

export type SystemScaleMode = 'compressed' | 'relative';
export type SystemGenerationStatus = BodyGenerationLifecycleStatus;

export type SystemPhysicalOrbit = {
  value: number;
  unit: 'AU' | 'parent radii';
};

export type SystemCatalogEntry = {
  id: string;
  label: string;
  kind: 'star' | OrbitalPresentationBody['kind'];
  parentBodyId: string | null;
  generationStatus: SystemGenerationStatus;
  generationEligible: boolean;
  generationProfile: BodyGenerationProfile | null;
  generationReason: string;
  body: OrbitalPresentationBody | null;
  physicalOrbit: SystemPhysicalOrbit | null;
};

export function buildSystemCatalog(
  project: WorldProject,
  artifact: SystemOrbitalContextArtifact
): SystemCatalogEntry[] {
  const entries: SystemCatalogEntry[] = [{
    id: artifact.payload.star.id,
    label: artifact.payload.star.id.toLowerCase() === 'sol'
      ? 'Sol'
      : `${project.solarSystem.star.type} star`,
    kind: 'star',
    parentBodyId: null,
    generationStatus: 'generated',
    generationEligible: false,
    generationProfile: null,
    generationReason: 'The generated star is not a secondary-body workflow target.',
    body: null,
    physicalOrbit: null
  }];
  const bodies = artifact.payload.bodies;
  const planets = bodies
    .filter((body) => body.kind !== 'moon')
    .sort((left, right) => left.orbitalOrder - right.orbitalOrder || left.id.localeCompare(right.id));
  const moonsByParent = new Map<string, OrbitalPresentationBody[]>();
  for (const moon of bodies.filter((body) => body.kind === 'moon')) {
    const parentId = moon.parentBodyId ?? '';
    const existing = moonsByParent.get(parentId) ?? [];
    existing.push(moon);
    moonsByParent.set(parentId, existing);
  }
  for (const moons of moonsByParent.values()) {
    moons.sort((left, right) => left.orbitalOrder - right.orbitalOrder || left.id.localeCompare(right.id));
  }

  for (const body of planets) {
    entries.push(catalogEntryForBody(project, artifact, body));
    for (const moon of moonsByParent.get(body.id) ?? []) {
      entries.push(catalogEntryForBody(project, artifact, moon));
    }
  }

  const knownIds = new Set(entries.map((entry) => entry.id));
  for (const body of bodies) {
    if (!knownIds.has(body.id)) entries.push(catalogEntryForBody(project, artifact, body));
  }
  return entries;
}

export function systemDisplayOrbitRadius(
  body: OrbitalPresentationBody,
  mode: SystemScaleMode
): number {
  if (body.kind === 'moon') {
    const physical = finitePositive(body.semiMajorAxisParentRadii, 6);
    if (mode === 'relative') return clamp(0.42 + Math.log10(1 + physical) * 0.62, 0.58, 2.35);
    return clamp(0.48 + Math.log10(1 + physical) * 0.38, 0.62, 1.65);
  }

  const physical = finitePositive(body.semiMajorAxisAu, Math.max(0.08, body.orbitalOrder * 0.32));
  if (mode === 'relative') return clamp(1.65 + Math.log10(1 + physical * 12) * 4.15, 2.05, 12.8);
  return clamp(1.75 + Math.max(1, body.orbitalOrder) * 1.34, 3.05, 13.2);
}

export function systemStarVisualScale(cameraDistance: number, referenceDistance: number): number {
  const safeReference = finitePositive(referenceDistance, 1);
  const safeDistance = finitePositive(cameraDistance, safeReference);
  return clamp(safeDistance / safeReference, 0.08, 1.25);
}

export function systemDisplayBodySize(body: OrbitalPresentationBody): number {
  const scaled = Math.max(0.04, body.sizeClass);
  if (body.kind === 'moon') return clamp(0.055 + scaled * 0.035, 0.07, 0.16);
  if (body.kind === 'gas-giant') return clamp(0.24 + scaled * 0.075, 0.3, 0.54);
  if (body.kind === 'ice-giant') return clamp(0.2 + scaled * 0.065, 0.26, 0.46);
  if (body.kind === 'belt') return clamp(0.16 + scaled * 0.04, 0.18, 0.32);
  if (body.kind === 'dwarf') return clamp(0.1 + scaled * 0.04, 0.12, 0.24);
  return clamp(0.15 + scaled * 0.055, 0.19, 0.38);
}

export function systemDisplayPositions(
  artifact: Pick<SystemOrbitalContextArtifact, 'payload'>,
  simulationDays: number,
  mode: SystemScaleMode
): Map<string, OrbitalPoint> {
  const byId = new Map(artifact.payload.bodies.map((body) => [body.id, body]));
  const cache = new Map<string, OrbitalPoint>();

  const resolve = (body: OrbitalPresentationBody, trail: Set<string>): OrbitalPoint => {
    const cached = cache.get(body.id);
    if (cached) return cached;
    if (trail.has(body.id)) return { x: 0, y: 0, z: 0 };
    const nextTrail = new Set(trail);
    nextTrail.add(body.id);
    const relative = systemRelativeDisplayPosition(body, simulationDays, mode);
    let point = relative;
    if (body.kind === 'moon' && body.parentBodyId) {
      const parent = byId.get(body.parentBodyId);
      if (parent) point = addPoints(resolve(parent, nextTrail), relative);
    }
    cache.set(body.id, point);
    return point;
  };

  for (const body of artifact.payload.bodies) resolve(body, new Set());
  return cache;
}

export function systemOrbitPathPoints(
  body: OrbitalPresentationBody,
  mode: SystemScaleMode,
  count = 96
): OrbitalPoint[] {
  const total = Math.max(24, Math.floor(count));
  const periodDays = finitePositive(body.orbitalPeriodDays, 1);
  return Array.from({ length: total }, (_, index) => {
    const simulationDays = periodDays * index / total;
    return systemRelativeDisplayPosition(body, simulationDays, mode);
  });
}

export function systemPhysicalOrbit(body: OrbitalPresentationBody): SystemPhysicalOrbit | null {
  if (body.kind === 'moon') {
    const value = finitePositive(body.semiMajorAxisParentRadii, 0);
    return value > 0 ? { value, unit: 'parent radii' } : null;
  }
  const value = finitePositive(body.semiMajorAxisAu, 0);
  return value > 0 ? { value, unit: 'AU' } : null;
}

export function formatSystemBodyKind(kind: SystemCatalogEntry['kind']): string {
  if (kind === 'star') return 'Star';
  return kind.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function catalogEntryForBody(
  project: WorldProject,
  artifact: SystemOrbitalContextArtifact,
  body: OrbitalPresentationBody
): SystemCatalogEntry {
  const isPrimary = body.id === artifact.payload.primaryBodyId;
  const lifecycleRecord = project.bodyGeneration?.records[body.id];
  const bodyRecord = worldBodyRecord(project, body.id);
  const eligibleByScaffold = !isPrimary;
  const fallbackProfile: BodyGenerationProfile | null = eligibleByScaffold ? profileForBodyKind(body.kind) : null;
  return {
    id: body.id,
    label: bodyRecord?.name ?? (isPrimary ? project.primaryWorld.name : bodyLabel(project, body)),
    kind: body.kind,
    parentBodyId: body.parentBodyId,
    generationStatus: lifecycleRecord?.status ?? (isPrimary ? 'generated' : 'ready'),
    generationEligible: lifecycleRecord?.eligible ?? eligibleByScaffold,
    generationProfile: lifecycleRecord?.profile ?? fallbackProfile,
    generationReason: lifecycleRecord?.eligibilityReason ?? (isPrimary
      ? 'The primary world is generated by the ordinary world workflow.'
      : `Eligible for capability-resolved ${fallbackProfile ?? 'body'} generation.`),
    body,
    physicalOrbit: systemPhysicalOrbit(body)
  };
}

function profileForBodyKind(kind: OrbitalPresentationBody['kind']): BodyGenerationProfile {
  if (kind === 'moon') return 'airless-rocky-body';
  if (kind === 'rocky') return 'rocky-body';
  if (kind === 'gas-giant') return 'gas-giant-body';
  if (kind === 'ice-giant') return 'ice-giant-body';
  if (kind === 'dwarf') return 'dwarf-body';
  return 'debris-belt';
}

function bodyLabel(project: WorldProject, body: OrbitalPresentationBody): string {
  if (body.kind === 'moon') {
    const parent = project.solarSystem.bodies.find((candidate) => candidate.id === body.parentBodyId);
    const prefix = parent ? `${parent.id}:` : '';
    const moonId = prefix && body.id.startsWith(prefix) ? body.id.slice(prefix.length) : body.id;
    const moon = parent?.moons.find((candidate) => candidate.id === moonId);
    return moon?.name || `Moon ${body.orbitalOrder}`;
  }
  const scaffold = project.solarSystem.bodies.find((candidate) => candidate.id === body.id);
  const kind = formatSystemBodyKind(body.kind);
  return scaffold ? `${kind} ${scaffold.orbitalOrder}` : `${kind} ${body.orbitalOrder}`;
}

function systemRelativeDisplayPosition(
  body: OrbitalPresentationBody,
  simulationDays: number,
  mode: SystemScaleMode
): OrbitalPoint {
  const raw = orbitalPositionAtDays(body, simulationDays);
  const physicalRadius = body.kind === 'moon'
    ? finitePositive(body.semiMajorAxisParentRadii, 1)
    : finitePositive(body.semiMajorAxisAu, 1);
  const scale = systemDisplayOrbitRadius(body, mode) / physicalRadius;
  return { x: raw.x * scale, y: raw.y * scale, z: raw.z * scale };
}

function addPoints(left: OrbitalPoint, right: OrbitalPoint): OrbitalPoint {
  return { x: left.x + right.x, y: left.y + right.y, z: left.z + right.z };
}

function finitePositive(value: number | null | undefined, fallback: number): number {
  return Number.isFinite(value) && (value ?? 0) > 0 ? value as number : fallback;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

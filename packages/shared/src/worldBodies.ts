import type { PrimaryWorld, SystemBody, WorldProject } from './index';

export const WORLD_BODY_CATALOG_SCHEMA = 'world-forge-body-catalog-v1' as const;

export type WorldBodyDataOrigin = 'imported' | 'derived' | 'generated' | 'authored' | 'edited';

export type WorldBodyCapabilities = {
  globe: boolean;
  map: boolean;
  explorer: boolean;
  irregularShape: boolean;
};

export type WorldBodyPhysicalFacts = {
  meanRadiusKm: number;
  massKg?: number;
  axialTiltDeg?: number;
  rotationPeriodHours?: number;
};

export type WorldBodyOrbitFacts = {
  semiMajorAxisKm: number;
  periodDays: number;
  eccentricity?: number;
  direction?: 'prograde' | 'retrograde';
};

export type WorldBodyRecordV1 = {
  bodyId: string;
  name: string;
  bodyType: SystemBody['bodyType'] | 'moon';
  parentBodyId?: string;
  capabilities: WorldBodyCapabilities;
  dataOrigin: WorldBodyDataOrigin;
  physical?: WorldBodyPhysicalFacts;
  orbit?: WorldBodyOrbitFacts;
  surface?: PrimaryWorld;
};

export type WorldBodyCatalogV1 = {
  schema: typeof WORLD_BODY_CATALOG_SCHEMA;
  primaryBodyId: string;
  activeBodyId: string;
  bodies: WorldBodyRecordV1[];
};

export type MultiBodyWorldProject = WorldProject & {
  bodyCatalog?: WorldBodyCatalogV1;
};

export function readWorldBodyCatalog(project: WorldProject): WorldBodyCatalogV1 {
  const candidate = (project as MultiBodyWorldProject).bodyCatalog;
  if (isWorldBodyCatalog(candidate)) return candidate;
  return fallbackCatalog(project);
}

export function activeWorldBodyId(project: WorldProject): string {
  const catalog = readWorldBodyCatalog(project);
  return catalog.bodies.some((body) => body.bodyId === catalog.activeBodyId)
    ? catalog.activeBodyId
    : catalog.primaryBodyId;
}

export function worldBodyRecord(project: WorldProject, bodyId: string): WorldBodyRecordV1 | null {
  return readWorldBodyCatalog(project).bodies.find((body) => body.bodyId === bodyId) ?? null;
}

export function worldSurfaceForBody(project: WorldProject, bodyId: string): PrimaryWorld | null {
  const catalog = readWorldBodyCatalog(project);
  const record = catalog.bodies.find((body) => body.bodyId === bodyId);
  if (bodyId === catalog.primaryBodyId) return record?.surface ?? project.primaryWorld;
  return record?.surface ?? null;
}

export function projectForWorldBody(project: WorldProject, bodyId: string): WorldProject | null {
  const surface = worldSurfaceForBody(project, bodyId);
  if (!surface) return null;
  const catalog = readWorldBodyCatalog(project);
  return {
    ...project,
    primaryWorld: surface,
    bodyCatalog: { ...catalog, activeBodyId: bodyId },
  } as MultiBodyWorldProject;
}

export function withActiveWorldBody(project: WorldProject, bodyId: string): MultiBodyWorldProject {
  const catalog = readWorldBodyCatalog(project);
  if (!catalog.bodies.some((body) => body.bodyId === bodyId)) return project as MultiBodyWorldProject;
  return { ...project, bodyCatalog: { ...catalog, activeBodyId: bodyId } };
}

export function withWorldBodySurface(
  project: WorldProject,
  input: Omit<WorldBodyRecordV1, 'surface'> & { surface: PrimaryWorld },
): MultiBodyWorldProject {
  const catalog = readWorldBodyCatalog(project);
  const existingIndex = catalog.bodies.findIndex((body) => body.bodyId === input.bodyId);
  const record: WorldBodyRecordV1 = { ...input };
  const bodies = existingIndex < 0
    ? [...catalog.bodies, record]
    : catalog.bodies.map((body, index) => index === existingIndex ? record : body);
  return { ...project, bodyCatalog: { ...catalog, bodies } };
}

export function isWorldBodyCatalog(value: unknown): value is WorldBodyCatalogV1 {
  if (!isRecord(value) || value.schema !== WORLD_BODY_CATALOG_SCHEMA) return false;
  if (!cleanText(value.primaryBodyId) || !cleanText(value.activeBodyId) || !Array.isArray(value.bodies)) return false;
  return value.bodies.every((body) => isWorldBodyRecord(body));
}

function fallbackCatalog(project: WorldProject): WorldBodyCatalogV1 {
  const primaryBodyId = project.solarSystem.primaryWorldId || project.primaryWorld.id;
  const bodies: WorldBodyRecordV1[] = [];
  for (const body of project.solarSystem.bodies) {
    const primary = body.id === primaryBodyId || body.isPrimaryWorld;
    bodies.push({
      bodyId: body.id,
      name: primary ? project.primaryWorld.name : body.id,
      bodyType: body.bodyType,
      capabilities: {
        globe: primary,
        map: primary,
        explorer: primary,
        irregularShape: false,
      },
      dataOrigin: primary ? 'generated' : 'derived',
      surface: primary ? project.primaryWorld : undefined,
    });
    for (const moon of body.moons) {
      bodies.push({
        bodyId: moon.id,
        name: moon.name,
        bodyType: 'moon',
        parentBodyId: body.id,
        capabilities: { globe: false, map: false, explorer: false, irregularShape: false },
        dataOrigin: 'derived',
      });
    }
  }
  if (!bodies.some((body) => body.bodyId === primaryBodyId)) {
    bodies.unshift({
      bodyId: primaryBodyId,
      name: project.primaryWorld.name,
      bodyType: 'rocky',
      capabilities: { globe: true, map: true, explorer: true, irregularShape: false },
      dataOrigin: 'generated',
      physical: {
        meanRadiusKm: project.primaryWorld.sizeClass * 6371.0088,
        axialTiltDeg: project.primaryWorld.axialTiltDeg,
      },
      surface: project.primaryWorld,
    });
  }
  return { schema: WORLD_BODY_CATALOG_SCHEMA, primaryBodyId, activeBodyId: primaryBodyId, bodies };
}

function isWorldBodyRecord(value: unknown): value is WorldBodyRecordV1 {
  if (!isRecord(value) || !cleanText(value.bodyId) || !cleanText(value.name)) return false;
  if (!['rocky', 'gas-giant', 'ice-giant', 'dwarf', 'belt', 'moon'].includes(String(value.bodyType))) return false;
  if (!['imported', 'derived', 'generated', 'authored', 'edited'].includes(String(value.dataOrigin))) return false;
  if (value.physical !== undefined && !isPhysicalFacts(value.physical)) return false;
  if (value.orbit !== undefined && !isOrbitFacts(value.orbit)) return false;
  const capabilities = value.capabilities;
  return isRecord(capabilities)
    && typeof capabilities.globe === 'boolean'
    && typeof capabilities.map === 'boolean'
    && typeof capabilities.explorer === 'boolean'
    && typeof capabilities.irregularShape === 'boolean';
}

function isPhysicalFacts(value: unknown): boolean {
  if (!isRecord(value) || !positiveNumber(value.meanRadiusKm)) return false;
  return optionalFinite(value.massKg)
    && optionalFinite(value.axialTiltDeg)
    && optionalFinite(value.rotationPeriodHours);
}

function isOrbitFacts(value: unknown): boolean {
  if (!isRecord(value) || !positiveNumber(value.semiMajorAxisKm) || !positiveNumber(value.periodDays)) return false;
  if (!optionalFinite(value.eccentricity)) return false;
  return value.direction === undefined || value.direction === 'prograde' || value.direction === 'retrograde';
}

function positiveNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function optionalFinite(value: unknown): boolean {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value));
}

function cleanText(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

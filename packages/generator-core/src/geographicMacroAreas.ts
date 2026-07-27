import type { CubedSphereTopology } from '@world-forge/shared';
import {
  GEOGRAPHIC_HIERARCHY_VERSION,
  type GeographicMacroArea,
  type GeographicMacroAreaKind,
  type GeographicMacroAreaSet,
} from '@world-forge/shared/geographicHierarchy';
import type {
  GeographicSurfaceDomain,
  GeographicWorldRegionSetV2,
} from '@world-forge/shared/geographicRegions';

const UNASSIGNED_MACRO_AREA = 0xffff;
const RADIANS_TO_DEGREES = 180 / Math.PI;

export function buildGeographicMacroAreas(
  topology: CubedSphereTopology,
  regionSet: GeographicWorldRegionSetV2,
): GeographicMacroAreaSet {
  if (regionSet.regionDomainIndexByTopologyCell.length !== topology.cellCount) {
    throw new Error('Macro-area generation requires complete first-level display-domain membership.');
  }

  const activeDomainIndexes = new Set<number>();
  for (const domainIndex of regionSet.regionDomainIndexByTopologyCell) {
    if (domainIndex !== UNASSIGNED_MACRO_AREA) activeDomainIndexes.add(domainIndex);
  }
  const domains = [...activeDomainIndexes]
    .map((domainIndex) => regionSet.surfaceDomains[domainIndex])
    .filter((domain): domain is GeographicSurfaceDomain => Boolean(domain))
    .sort(compareDomains);
  if (domains.length >= UNASSIGNED_MACRO_AREA) {
    throw new Error('Macro-area count exceeds the uint16 membership budget.');
  }

  const macroIndexByDomainIndex = new Map<number, number>();
  domains.forEach((domain, macroIndex) => macroIndexByDomainIndex.set(domain.index, macroIndex));
  const membership = new Uint16Array(topology.cellCount);
  membership.fill(UNASSIGNED_MACRO_AREA);
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    const macroIndex = macroIndexByDomainIndex.get(regionSet.regionDomainIndexByTopologyCell[cell]);
    if (macroIndex !== undefined) membership[cell] = macroIndex;
  }

  const macroAreas = domains.map((domain, index) => buildMacroArea(
    topology,
    regionSet,
    membership,
    domain,
    index,
  ));

  return {
    modelVersion: GEOGRAPHIC_HIERARCHY_VERSION,
    algorithmVersion: `${regionSet.algorithmVersion}:macro-domain-v1`,
    sourceTopologyKind: topology.kind,
    sourceTopologyResolution: topology.resolution,
    membership: {
      encoding: 'uint16-macro-area-index',
      macroAreaIndexByTopologyCell: membership,
    },
    macroAreas,
    signature: macroAreaSignature(regionSet.signature, macroAreas, membership),
  };
}

export function macroAreaMembershipMask(
  macroAreaSet: GeographicMacroAreaSet,
  macroAreaId: string,
): Uint8Array {
  const macroIndex = macroAreaSet.macroAreas.findIndex((macroArea) => macroArea.id === macroAreaId);
  const mask = new Uint8Array(macroAreaSet.membership.macroAreaIndexByTopologyCell.length);
  if (macroIndex < 0) return mask;
  for (let cell = 0; cell < mask.length; cell += 1) {
    if (macroAreaSet.membership.macroAreaIndexByTopologyCell[cell] === macroIndex) mask[cell] = 1;
  }
  return mask;
}

function buildMacroArea(
  topology: CubedSphereTopology,
  regionSet: GeographicWorldRegionSetV2,
  membership: Uint16Array,
  domain: GeographicSurfaceDomain,
  macroIndex: number,
): GeographicMacroArea {
  const cells: number[] = [];
  let areaWeight = 0;
  let landArea = 0;
  let waterArea = 0;
  let x = 0;
  let y = 0;
  let z = 0;
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    if (membership[cell] !== macroIndex) continue;
    cells.push(cell);
    const area = topology.areaWeights[cell] || 1;
    areaWeight += area;
    const positionOffset = cell * 3;
    x += topology.positions[positionOffset] * area;
    y += topology.positions[positionOffset + 1] * area;
    z += topology.positions[positionOffset + 2] * area;
    const surfaceDomainIndex = regionSet.surfaceDomainIndexByTopologyCell[cell];
    const sourceDomain = regionSet.surfaceDomains[surfaceDomainIndex];
    if (sourceDomain && sourceDomain.landAreaShare >= sourceDomain.waterAreaShare) landArea += area;
    else waterArea += area;
  }
  const kind = macroAreaKind(domain);
  const id = macroAreaId(domain, kind);
  const labelPointCell = closestCellToVector(topology, cells, x, y, z);
  const total = Math.max(0.000001, areaWeight);
  const landAreaShare = landArea / total;
  const waterAreaShare = waterArea / total;
  const childRegionIds = regionSet.regions
    .filter((region) => region.parentDomainId === domain.id)
    .map((region) => region.id)
    .sort();

  return {
    id,
    index: macroIndex,
    level: 'macro-area',
    parentId: 'primary-world',
    kind,
    sourceDomainIds: [domain.id],
    label: macroAreaLabel(kind, macroIndex),
    classification: kind === 'ocean-basin'
      ? 'water'
      : kind === 'archipelago'
        ? 'archipelago'
        : landAreaShare >= 0.88
          ? 'land'
          : 'mixed',
    topologyCellCount: cells.length,
    areaWeight: round(areaWeight, 6),
    landAreaShare: round(landAreaShare, 4),
    waterAreaShare: round(waterAreaShare, 4),
    bounds: membershipBounds(topology, cells),
    labelPoint: {
      topologyCellId: labelPointCell,
      latitude: round(topology.latitudes[labelPointCell] * RADIANS_TO_DEGREES, 4),
      longitude: round(topology.longitudes[labelPointCell] * RADIANS_TO_DEGREES, 4),
    },
    childRegionIds,
    provisional: kind === 'ocean-basin',
  };
}

function compareDomains(left: GeographicSurfaceDomain, right: GeographicSurfaceDomain): number {
  const rank = (domain: GeographicSurfaceDomain) => domain.kind === 'landmass' ? 0 : domain.kind === 'archipelago' ? 1 : 2;
  return rank(left) - rank(right) || right.areaShare - left.areaShare || left.id.localeCompare(right.id);
}

function macroAreaKind(domain: GeographicSurfaceDomain): GeographicMacroAreaKind {
  if (domain.kind === 'open-ocean') return 'ocean-basin';
  if (domain.kind === 'archipelago') return 'archipelago';
  return 'continent';
}

function macroAreaId(domain: GeographicSurfaceDomain, kind: GeographicMacroAreaKind): string {
  return `${kind}:${domain.id}`;
}

function macroAreaLabel(kind: GeographicMacroAreaKind, index: number): string {
  if (kind === 'ocean-basin') return `Ocean Basin ${index + 1}`;
  if (kind === 'archipelago') return `Archipelago ${index + 1}`;
  return `Continent ${index + 1}`;
}

function closestCellToVector(
  topology: CubedSphereTopology,
  cells: number[],
  centerX: number,
  centerY: number,
  centerZ: number,
): number {
  const length = Math.hypot(centerX, centerY, centerZ) || 1;
  const x = centerX / length;
  const y = centerY / length;
  const z = centerZ / length;
  let bestCell = cells[0] ?? 0;
  let bestDot = Number.NEGATIVE_INFINITY;
  for (const cell of cells) {
    const offset = cell * 3;
    const dot = topology.positions[offset] * x
      + topology.positions[offset + 1] * y
      + topology.positions[offset + 2] * z;
    if (dot > bestDot || (dot === bestDot && cell < bestCell)) {
      bestDot = dot;
      bestCell = cell;
    }
  }
  return bestCell;
}

function membershipBounds(topology: CubedSphereTopology, cells: number[]) {
  let minLatitude = Number.POSITIVE_INFINITY;
  let maxLatitude = Number.NEGATIVE_INFINITY;
  const longitudes = cells.map((cell) => {
    const latitude = topology.latitudes[cell] * RADIANS_TO_DEGREES;
    minLatitude = Math.min(minLatitude, latitude);
    maxLatitude = Math.max(maxLatitude, latitude);
    return normalize360(topology.longitudes[cell] * RADIANS_TO_DEGREES);
  }).sort((left, right) => left - right);
  if (longitudes.length <= 1) {
    const longitude = normalizeLongitude(longitudes[0] ?? 0);
    return { minLatitude, maxLatitude, minLongitude: longitude, maxLongitude: longitude, wrapsLongitude: false };
  }
  let largestGap = Number.NEGATIVE_INFINITY;
  let gapEndIndex = 0;
  for (let index = 0; index < longitudes.length; index += 1) {
    const current = longitudes[index];
    const next = index === longitudes.length - 1 ? longitudes[0] + 360 : longitudes[index + 1];
    if (next - current > largestGap) {
      largestGap = next - current;
      gapEndIndex = index;
    }
  }
  const minLongitude = normalizeLongitude(longitudes[(gapEndIndex + 1) % longitudes.length]);
  const maxLongitude = normalizeLongitude(longitudes[gapEndIndex]);
  return {
    minLatitude: round(minLatitude, 4),
    maxLatitude: round(maxLatitude, 4),
    minLongitude: round(minLongitude, 4),
    maxLongitude: round(maxLongitude, 4),
    wrapsLongitude: minLongitude > maxLongitude,
  };
}

function macroAreaSignature(
  regionSignature: string,
  macroAreas: GeographicMacroArea[],
  membership: Uint16Array,
): string {
  let hash = 0x811c9dc5;
  const addByte = (value: number) => {
    hash = Math.imul(hash ^ (value & 0xff), 0x01000193) >>> 0;
  };
  for (const character of `${GEOGRAPHIC_HIERARCHY_VERSION}:${regionSignature}`) addByte(character.charCodeAt(0));
  for (const macroArea of macroAreas) {
    for (const character of macroArea.id) addByte(character.charCodeAt(0));
  }
  for (const macroIndex of membership) {
    addByte(macroIndex);
    addByte(macroIndex >>> 8);
  }
  return `wfma-v1-${hash.toString(16).padStart(8, '0')}`;
}

function normalize360(longitude: number): number {
  let value = longitude % 360;
  if (value < 0) value += 360;
  return value;
}

function normalizeLongitude(longitude: number): number {
  let value = longitude;
  while (value < -180) value += 360;
  while (value > 180) value -= 360;
  return value;
}

function round(value: number, places: number): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

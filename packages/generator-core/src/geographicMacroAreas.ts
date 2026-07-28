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
import { geographicTopologyAdjacency } from './geographicTopologyAdjacency';

const UNASSIGNED_MACRO_AREA = 0xffff;
const UNASSIGNED_PIECE = 0xffff;
const RADIANS_TO_DEGREES = 180 / Math.PI;
const MINIMUM_CORE_CELLS = 6;
const MAXIMUM_CONTINENT_PIECES_PER_DOMAIN = 12;

export type GeographicMacroAreaBuildOptions = {
  water?: Uint8Array;
  targetContinentCount?: number;
};

export type GeographicLandmassDecomposition = {
  pieceCount: number;
  pieceIndexByTopologyCell: Uint16Array;
  seedTopologyCellIds: number[];
  erosionDepth: number;
};

type MacroPieceCandidate = {
  domain: GeographicSurfaceDomain;
  kind: GeographicMacroAreaKind;
  seedTopologyCellId: number;
  splitCount: number;
};

type CoreComponent = {
  cells: number[];
  areaWeight: number;
  minimumCell: number;
};

export function buildGeographicMacroAreas(
  topology: CubedSphereTopology,
  regionSet: GeographicWorldRegionSetV2,
  options: GeographicMacroAreaBuildOptions = {},
): GeographicMacroAreaSet {
  if (regionSet.regionDomainIndexByTopologyCell.length !== topology.cellCount) {
    throw new Error('Macro-area generation requires complete first-level display-domain membership.');
  }
  const water = options.water?.length === topology.cellCount ? options.water : undefined;
  const activeDomainIndexes = new Set<number>();
  for (const domainIndex of regionSet.regionDomainIndexByTopologyCell) {
    if (domainIndex !== UNASSIGNED_MACRO_AREA) activeDomainIndexes.add(domainIndex);
  }
  const domains = [...activeDomainIndexes]
    .map((domainIndex) => regionSet.surfaceDomains[domainIndex])
    .filter((domain): domain is GeographicSurfaceDomain => Boolean(domain))
    .sort(compareDomains);
  const desiredPieceCounts = allocateDesiredContinentCounts(
    topology,
    regionSet,
    domains,
    water,
    options.targetContinentCount,
  );
  const membership = new Uint16Array(topology.cellCount);
  membership.fill(UNASSIGNED_MACRO_AREA);
  const candidates: MacroPieceCandidate[] = [];

  for (const domain of domains) {
    const domainMembership = membershipMaskForDomain(regionSet.regionDomainIndexByTopologyCell, domain.index);
    const kind = macroAreaKind(domain);
    const desiredPieces = desiredPieceCounts.get(domain.index) ?? 1;
    const decomposition = kind === 'continent' && water && desiredPieces > 1
      ? decomposeLandmassAtIsthmuses(topology, domainMembership, water, desiredPieces)
      : singlePieceDecomposition(domainMembership);
    const candidateOffset = candidates.length;
    for (let pieceIndex = 0; pieceIndex < decomposition.pieceCount; pieceIndex += 1) {
      candidates.push({
        domain,
        kind,
        seedTopologyCellId: decomposition.seedTopologyCellIds[pieceIndex] ?? firstSelectedCell(domainMembership),
        splitCount: decomposition.pieceCount,
      });
    }
    for (let cell = 0; cell < topology.cellCount; cell += 1) {
      const pieceIndex = decomposition.pieceIndexByTopologyCell[cell];
      if (pieceIndex !== UNASSIGNED_PIECE) membership[cell] = candidateOffset + pieceIndex;
    }
  }

  if (candidates.length >= UNASSIGNED_MACRO_AREA) {
    throw new Error('Macro-area count exceeds the uint16 membership budget.');
  }
  const childRegionIds = assignRegionsToMacroAreas(topology, regionSet, membership, candidates);
  const labelsByKind: Record<GeographicMacroAreaKind, number> = {
    continent: 0,
    archipelago: 0,
    'ocean-basin': 0,
  };
  const macroAreas = candidates.map((candidate, index) => {
    labelsByKind[candidate.kind] += 1;
    return buildMacroArea(
      topology,
      regionSet,
      membership,
      candidate,
      index,
      macroAreaLabel(candidate.kind, labelsByKind[candidate.kind]),
      childRegionIds[index],
      water,
    );
  });

  return {
    modelVersion: GEOGRAPHIC_HIERARCHY_VERSION,
    algorithmVersion: `${regionSet.algorithmVersion}:macro-domain-v2:isthmus-core-v1`,
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

export function decomposeLandmassAtIsthmuses(
  topology: CubedSphereTopology,
  domainMembership: Uint8Array,
  water: Uint8Array,
  desiredPieceCount: number,
): GeographicLandmassDecomposition {
  if (domainMembership.length !== topology.cellCount || water.length !== topology.cellCount) {
    throw new Error('Landmass decomposition requires topology-sized membership and water arrays.');
  }
  const desiredPieces = Math.max(1, Math.min(MAXIMUM_CONTINENT_PIECES_PER_DOMAIN, Math.round(desiredPieceCount)));
  const landMembership = new Uint8Array(topology.cellCount);
  const landCells: number[] = [];
  let totalLandArea = 0;
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    if (domainMembership[cell] !== 1 || water[cell] === 1) continue;
    landMembership[cell] = 1;
    landCells.push(cell);
    totalLandArea += topology.areaWeights[cell] || 1;
  }
  if (desiredPieces <= 1 || landCells.length < MINIMUM_CORE_CELLS * 2) {
    return singlePieceDecomposition(domainMembership);
  }

  const coastDistance = distanceFromLandBoundary(topology, landMembership, landCells);
  let maximumDistance = 0;
  for (const cell of landCells) maximumDistance = Math.max(maximumDistance, coastDistance[cell]);
  const maximumErosionDepth = Math.min(
    maximumDistance,
    Math.max(2, Math.round(Math.max(1, topology.resolution) / 12)),
  );
  const targetPieceArea = totalLandArea / desiredPieces;
  const minimumCoreArea = Math.max(totalLandArea * 0.035, targetPieceArea * 0.2);
  const minimumCoreCells = Math.max(MINIMUM_CORE_CELLS, Math.round(landCells.length * 0.01));
  let bestCores: CoreComponent[] | null = null;
  let bestDepth = 0;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let erosionDepth = 1; erosionDepth <= maximumErosionDepth; erosionDepth += 1) {
    const cores = findCoreComponents(
      topology,
      landMembership,
      coastDistance,
      erosionDepth,
    ).filter((core) => core.cells.length >= minimumCoreCells && core.areaWeight >= minimumCoreArea);
    if (cores.length < 2) continue;
    cores.sort((left, right) => right.areaWeight - left.areaWeight || left.minimumCell - right.minimumCell);
    const selected = cores.slice(0, desiredPieces);
    if (selected.length < 2) continue;
    const selectedArea = selected.reduce((sum, core) => sum + core.areaWeight, 0);
    const minimumArea = Math.min(...selected.map((core) => core.areaWeight));
    const maximumArea = Math.max(...selected.map((core) => core.areaWeight));
    const pieceCountScore = selected.length * 1000;
    const coverageScore = (selectedArea / Math.max(0.000001, totalLandArea)) * 100;
    const balanceScore = (minimumArea / Math.max(0.000001, maximumArea)) * 10;
    const score = pieceCountScore + coverageScore + balanceScore - erosionDepth * 0.1;
    if (score > bestScore + 1e-9) {
      bestScore = score;
      bestDepth = erosionDepth;
      bestCores = selected;
    }
  }

  if (!bestCores || bestCores.length < 2) return singlePieceDecomposition(domainMembership);
  bestCores.sort((left, right) => left.minimumCell - right.minimumCell);
  const landOwners = assignCellsToCores(topology, landMembership, bestCores);
  const pieceIndexByTopologyCell = extendOwnersAcrossDomain(
    topology,
    domainMembership,
    landMembership,
    landOwners,
  );
  return {
    pieceCount: bestCores.length,
    pieceIndexByTopologyCell,
    seedTopologyCellIds: bestCores.map((core) => core.minimumCell),
    erosionDepth: bestDepth,
  };
}

function allocateDesiredContinentCounts(
  topology: CubedSphereTopology,
  regionSet: GeographicWorldRegionSetV2,
  domains: GeographicSurfaceDomain[],
  water: Uint8Array | undefined,
  requestedTarget: number | undefined,
): Map<number, number> {
  const landmassDomains = domains.filter((domain) => domain.kind === 'landmass');
  const counts = new Map<number, number>(landmassDomains.map((domain) => [domain.index, 1]));
  if (!water || landmassDomains.length === 0) return counts;
  const target = Math.max(landmassDomains.length, Math.round(requestedTarget ?? landmassDomains.length));
  if (target <= landmassDomains.length) return counts;
  const landAreas = new Map<number, number>();
  const landCellCounts = new Map<number, number>();
  for (const domain of landmassDomains) {
    landAreas.set(domain.index, 0);
    landCellCounts.set(domain.index, 0);
  }
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    const domainIndex = regionSet.regionDomainIndexByTopologyCell[cell];
    if (!landAreas.has(domainIndex) || water[cell] === 1) continue;
    landAreas.set(domainIndex, (landAreas.get(domainIndex) ?? 0) + (topology.areaWeights[cell] || 1));
    landCellCounts.set(domainIndex, (landCellCounts.get(domainIndex) ?? 0) + 1);
  }
  let allocated = landmassDomains.length;
  while (allocated < target) {
    const next = landmassDomains
      .map((domain) => {
        const current = counts.get(domain.index) ?? 1;
        const maximum = Math.max(1, Math.min(
          MAXIMUM_CONTINENT_PIECES_PER_DOMAIN,
          Math.floor((landCellCounts.get(domain.index) ?? 0) / (MINIMUM_CORE_CELLS * 2)),
        ));
        return {
          domain,
          current,
          maximum,
          priority: (landAreas.get(domain.index) ?? 0) / (current + 0.5),
        };
      })
      .filter((entry) => entry.current < entry.maximum)
      .sort((left, right) => right.priority - left.priority || left.domain.index - right.domain.index)[0];
    if (!next) break;
    counts.set(next.domain.index, next.current + 1);
    allocated += 1;
  }
  return counts;
}

function membershipMaskForDomain(domainIndexes: Uint16Array, domainIndex: number): Uint8Array {
  const membership = new Uint8Array(domainIndexes.length);
  for (let cell = 0; cell < domainIndexes.length; cell += 1) {
    if (domainIndexes[cell] === domainIndex) membership[cell] = 1;
  }
  return membership;
}

function singlePieceDecomposition(domainMembership: Uint8Array): GeographicLandmassDecomposition {
  const membership = new Uint16Array(domainMembership.length);
  membership.fill(UNASSIGNED_PIECE);
  let firstCell = -1;
  for (let cell = 0; cell < domainMembership.length; cell += 1) {
    if (domainMembership[cell] !== 1) continue;
    membership[cell] = 0;
    if (firstCell < 0) firstCell = cell;
  }
  return {
    pieceCount: firstCell >= 0 ? 1 : 0,
    pieceIndexByTopologyCell: membership,
    seedTopologyCellIds: firstCell >= 0 ? [firstCell] : [],
    erosionDepth: 0,
  };
}

function distanceFromLandBoundary(
  topology: CubedSphereTopology,
  landMembership: Uint8Array,
  landCells: number[],
): Int16Array {
  const adjacency = geographicTopologyAdjacency(topology);
  const distance = new Int16Array(topology.cellCount);
  distance.fill(-1);
  const queue = new Int32Array(Math.max(1, landCells.length));
  let head = 0;
  let tail = 0;
  for (const cell of landCells) {
    let boundary = false;
    for (let offset = adjacency.offsets[cell]; offset < adjacency.offsets[cell + 1]; offset += 1) {
      if (landMembership[adjacency.neighbors[offset]] !== 1) {
        boundary = true;
        break;
      }
    }
    if (!boundary) continue;
    distance[cell] = 0;
    queue[tail++] = cell;
  }
  while (head < tail) {
    const cell = queue[head++];
    const nextDistance = distance[cell] + 1;
    for (let offset = adjacency.offsets[cell]; offset < adjacency.offsets[cell + 1]; offset += 1) {
      const neighbor = adjacency.neighbors[offset];
      if (landMembership[neighbor] !== 1 || distance[neighbor] >= 0) continue;
      distance[neighbor] = nextDistance;
      queue[tail++] = neighbor;
    }
  }
  return distance;
}

function findCoreComponents(
  topology: CubedSphereTopology,
  landMembership: Uint8Array,
  coastDistance: Int16Array,
  erosionDepth: number,
): CoreComponent[] {
  const adjacency = geographicTopologyAdjacency(topology);
  const visited = new Uint8Array(topology.cellCount);
  const queue = new Int32Array(topology.cellCount);
  const components: CoreComponent[] = [];
  for (let start = 0; start < topology.cellCount; start += 1) {
    if (visited[start] === 1 || landMembership[start] !== 1 || coastDistance[start] < erosionDepth) continue;
    const cells: number[] = [];
    let areaWeight = 0;
    let head = 0;
    let tail = 0;
    visited[start] = 1;
    queue[tail++] = start;
    while (head < tail) {
      const cell = queue[head++];
      cells.push(cell);
      areaWeight += topology.areaWeights[cell] || 1;
      for (let offset = adjacency.offsets[cell]; offset < adjacency.offsets[cell + 1]; offset += 1) {
        const neighbor = adjacency.neighbors[offset];
        if (visited[neighbor] === 1 || landMembership[neighbor] !== 1 || coastDistance[neighbor] < erosionDepth) continue;
        visited[neighbor] = 1;
        queue[tail++] = neighbor;
      }
    }
    components.push({ cells, areaWeight, minimumCell: start });
  }
  return components;
}

function assignCellsToCores(
  topology: CubedSphereTopology,
  allowedMembership: Uint8Array,
  cores: CoreComponent[],
): Int16Array {
  const adjacency = geographicTopologyAdjacency(topology);
  const owner = new Int16Array(topology.cellCount);
  owner.fill(-1);
  const distance = new Int32Array(topology.cellCount);
  distance.fill(0x7fffffff);
  const heap = new CellOwnerHeap();
  for (let pieceIndex = 0; pieceIndex < cores.length; pieceIndex += 1) {
    for (const cell of cores[pieceIndex].cells) {
      owner[cell] = pieceIndex;
      distance[cell] = 0;
      heap.push(0, pieceIndex, cell);
    }
  }
  while (heap.size > 0) {
    const current = heap.pop();
    if (!current) break;
    if (current.distance !== distance[current.cell] || current.owner !== owner[current.cell]) continue;
    for (let offset = adjacency.offsets[current.cell]; offset < adjacency.offsets[current.cell + 1]; offset += 1) {
      const neighbor = adjacency.neighbors[offset];
      if (allowedMembership[neighbor] !== 1) continue;
      const nextDistance = current.distance + 1;
      const winsTie = nextDistance === distance[neighbor]
        && (owner[neighbor] < 0 || current.owner < owner[neighbor]);
      if (nextDistance > distance[neighbor] || (nextDistance === distance[neighbor] && !winsTie)) continue;
      distance[neighbor] = nextDistance;
      owner[neighbor] = current.owner;
      heap.push(nextDistance, current.owner, neighbor);
    }
  }
  return owner;
}

function extendOwnersAcrossDomain(
  topology: CubedSphereTopology,
  domainMembership: Uint8Array,
  landMembership: Uint8Array,
  landOwners: Int16Array,
): Uint16Array {
  const adjacency = geographicTopologyAdjacency(topology);
  const pieceIndexes = new Uint16Array(topology.cellCount);
  pieceIndexes.fill(UNASSIGNED_PIECE);
  const distance = new Int32Array(topology.cellCount);
  distance.fill(0x7fffffff);
  const heap = new CellOwnerHeap();
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    if (landMembership[cell] !== 1 || landOwners[cell] < 0) continue;
    const owner = landOwners[cell];
    pieceIndexes[cell] = owner;
    distance[cell] = 0;
    heap.push(0, owner, cell);
  }
  while (heap.size > 0) {
    const current = heap.pop();
    if (!current) break;
    if (current.distance !== distance[current.cell] || current.owner !== pieceIndexes[current.cell]) continue;
    for (let offset = adjacency.offsets[current.cell]; offset < adjacency.offsets[current.cell + 1]; offset += 1) {
      const neighbor = adjacency.neighbors[offset];
      if (domainMembership[neighbor] !== 1) continue;
      const nextDistance = current.distance + 1;
      const currentOwner = pieceIndexes[neighbor];
      const winsTie = nextDistance === distance[neighbor]
        && (currentOwner === UNASSIGNED_PIECE || current.owner < currentOwner);
      if (nextDistance > distance[neighbor] || (nextDistance === distance[neighbor] && !winsTie)) continue;
      distance[neighbor] = nextDistance;
      pieceIndexes[neighbor] = current.owner;
      heap.push(nextDistance, current.owner, neighbor);
    }
  }
  return pieceIndexes;
}

function assignRegionsToMacroAreas(
  topology: CubedSphereTopology,
  regionSet: GeographicWorldRegionSetV2,
  macroMembership: Uint16Array,
  candidates: MacroPieceCandidate[],
): string[][] {
  const overlap = Array.from({ length: regionSet.regions.length }, () => new Map<number, number>());
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    const regionIndex = regionSet.membership.regionIndexByTopologyCell[cell];
    const macroIndex = macroMembership[cell];
    if (regionIndex === UNASSIGNED_MACRO_AREA || macroIndex === UNASSIGNED_MACRO_AREA || !overlap[regionIndex]) continue;
    const regionOverlap = overlap[regionIndex];
    regionOverlap.set(macroIndex, (regionOverlap.get(macroIndex) ?? 0) + (topology.areaWeights[cell] || 1));
  }
  const result = Array.from({ length: candidates.length }, () => [] as string[]);
  for (const region of regionSet.regions) {
    const selectedMacroIndex = [...(overlap[region.index] ?? new Map<number, number>()).entries()]
      .sort((left, right) => right[1] - left[1] || left[0] - right[0])[0]?.[0]
      ?? candidates.findIndex((candidate) => candidate.domain.id === region.parentDomainId);
    if (selectedMacroIndex >= 0) result[selectedMacroIndex].push(region.id);
  }
  for (const ids of result) ids.sort();
  return result;
}

function buildMacroArea(
  topology: CubedSphereTopology,
  regionSet: GeographicWorldRegionSetV2,
  membership: Uint16Array,
  candidate: MacroPieceCandidate,
  macroIndex: number,
  label: string,
  childRegionIds: string[],
  water: Uint8Array | undefined,
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
    const isWater = water
      ? water[cell] === 1
      : (regionSet.surfaceDomains[regionSet.surfaceDomainIndexByTopologyCell[cell]]?.waterAreaShare ?? 1) > 0.5;
    if (isWater) waterArea += area;
    else landArea += area;
  }
  const id = candidate.splitCount > 1
    ? `${candidate.kind}:${candidate.domain.id}:core-${candidate.seedTopologyCellId}`
    : `${candidate.kind}:${candidate.domain.id}`;
  const labelPointCell = closestCellToVector(topology, cells, x, y, z);
  const total = Math.max(0.000001, areaWeight);
  const landAreaShare = landArea / total;
  const waterAreaShare = waterArea / total;
  return {
    id,
    index: macroIndex,
    level: 'macro-area',
    parentId: 'primary-world',
    kind: candidate.kind,
    sourceDomainIds: [candidate.domain.id],
    label,
    classification: candidate.kind === 'ocean-basin'
      ? 'water'
      : candidate.kind === 'archipelago'
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
    provisional: candidate.kind === 'ocean-basin',
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

function macroAreaLabel(kind: GeographicMacroAreaKind, ordinal: number): string {
  if (kind === 'ocean-basin') return `Ocean Basin ${ordinal}`;
  if (kind === 'archipelago') return `Archipelago ${ordinal}`;
  return `Continent ${ordinal}`;
}

function firstSelectedCell(membership: Uint8Array): number {
  for (let cell = 0; cell < membership.length; cell += 1) if (membership[cell] === 1) return cell;
  return 0;
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
  for (const character of `${GEOGRAPHIC_HIERARCHY_VERSION}:${regionSignature}:isthmus-core-v1`) addByte(character.charCodeAt(0));
  for (const macroArea of macroAreas) {
    for (const character of macroArea.id) addByte(character.charCodeAt(0));
  }
  for (const macroIndex of membership) {
    addByte(macroIndex);
    addByte(macroIndex >>> 8);
  }
  return `wfma-v2-${hash.toString(16).padStart(8, '0')}`;
}

class CellOwnerHeap {
  private values: Array<{ distance: number; owner: number; cell: number }> = [];

  get size(): number {
    return this.values.length;
  }

  push(distance: number, owner: number, cell: number): void {
    const value = { distance, owner, cell };
    this.values.push(value);
    let index = this.values.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (compareHeapValues(this.values[parent], value) <= 0) break;
      this.values[index] = this.values[parent];
      index = parent;
    }
    this.values[index] = value;
  }

  pop(): { distance: number; owner: number; cell: number } | null {
    if (this.values.length === 0) return null;
    const root = this.values[0];
    const tail = this.values.pop();
    if (!tail || this.values.length === 0) return root;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      if (left >= this.values.length) break;
      let child = left;
      if (right < this.values.length && compareHeapValues(this.values[right], this.values[left]) < 0) child = right;
      if (compareHeapValues(tail, this.values[child]) <= 0) break;
      this.values[index] = this.values[child];
      index = child;
    }
    this.values[index] = tail;
    return root;
  }
}

function compareHeapValues(
  left: { distance: number; owner: number; cell: number },
  right: { distance: number; owner: number; cell: number },
): number {
  return left.distance - right.distance || left.owner - right.owner || left.cell - right.cell;
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

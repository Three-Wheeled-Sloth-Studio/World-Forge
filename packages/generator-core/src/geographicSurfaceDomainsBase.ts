import type { CubedSphereTopology, WorldHexOverlay } from '@world-forge/shared';
import type {
  GeographicRegionScaleBudget,
  GeographicRegionInputLayers,
  GeographicSurfaceDomain,
} from '@world-forge/shared/geographicRegions';
import { geographicTopologyAdjacency } from './geographicTopologyAdjacency';

const UNASSIGNED_DOMAIN = 0xffff;
const TERRITORIAL_WATER_NAUTICAL_MILES = 12;
const MILES_PER_NAUTICAL_MILE = 1.15078;
const ARCHIPELAGO_CLUSTER_MILES = 60;

type SurfaceDomainBuild = {
  domains: GeographicSurfaceDomain[];
  domainIndexByTopologyCell: Uint16Array;
  regionDomainIndexByTopologyCell: Uint16Array;
};

type LandComponent = {
  index: number;
  cells: number[];
  minimumCell: number;
};

export function buildGeographicSurfaceDomains(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  overlay: WorldHexOverlay,
  scaleBudget: GeographicRegionScaleBudget,
): SurfaceDomainBuild {
  const components = findLandComponents(topology, layers.water);
  const componentRoot = clusterNearbyLandComponents(
    topology,
    layers.water,
    components,
    overlay,
    preferredRegionSpanMiles(overlay, scaleBudget),
  );
  const roots = [...new Set(componentRoot)].sort((left, right) => (
    components[left].minimumCell - components[right].minimumCell
  ));
  const domainIndexByRoot = new Map(roots.map((root, index) => [root, index]));
  const domainIndexByTopologyCell = new Uint16Array(topology.cellCount);
  domainIndexByTopologyCell.fill(UNASSIGNED_DOMAIN);
  const componentCounts = Array.from({ length: roots.length }, () => 0);

  for (const component of components) {
    const root = componentRoot[component.index];
    const domainIndex = domainIndexByRoot.get(root);
    if (domainIndex === undefined) continue;
    componentCounts[domainIndex] += 1;
    for (const cell of component.cells) domainIndexByTopologyCell[cell] = domainIndex;
  }

  const territorialMiles = TERRITORIAL_WATER_NAUTICAL_MILES * MILES_PER_NAUTICAL_MILE;
  const representedMiles = assignTerritorialWater(
    topology,
    layers,
    overlay,
    domainIndexByTopologyCell,
    territorialMiles,
  );
  assignMarkedLakes(topology, layers, domainIndexByTopologyCell);
  assignEnclosedWaterBodies(topology, layers, domainIndexByTopologyCell);

  const openOceanIndex = roots.length;
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    if (domainIndexByTopologyCell[cell] === UNASSIGNED_DOMAIN) {
      domainIndexByTopologyCell[cell] = openOceanIndex;
    }
  }

  const domainCount = roots.length + 1;
  const area = Array.from({ length: domainCount }, () => 0);
  const landArea = Array.from({ length: domainCount }, () => 0);
  const waterArea = Array.from({ length: domainCount }, () => 0);
  let totalArea = 0;
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    const weight = topology.areaWeights[cell] || 1;
    const domainIndex = domainIndexByTopologyCell[cell];
    area[domainIndex] += weight;
    totalArea += weight;
    if (layers.water[cell] === 1) waterArea[domainIndex] += weight;
    else landArea[domainIndex] += weight;
  }
  const displayRegionEligible = area.map((value, index) => (
    index === openOceanIndex || value / Math.max(0.000001, totalArea) >= scaleBudget.minAreaShare
  ));
  if (roots.length > 0 && !displayRegionEligible.slice(0, openOceanIndex).some(Boolean)) {
    const largestLandDomain = area
      .slice(0, openOceanIndex)
      .map((value, index) => ({ value, index }))
      .sort((left, right) => right.value - left.value || left.index - right.index)[0]?.index;
    if (largestLandDomain !== undefined) displayRegionEligible[largestLandDomain] = true;
  }
  const regionDomainIndexByTopologyCell = Uint16Array.from(domainIndexByTopologyCell);
  for (let cell = 0; cell < regionDomainIndexByTopologyCell.length; cell += 1) {
    const domainIndex = regionDomainIndexByTopologyCell[cell];
    if (!displayRegionEligible[domainIndex]) regionDomainIndexByTopologyCell[cell] = openOceanIndex;
  }
  const regionArea = Array.from({ length: domainCount }, () => 0);
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    regionArea[regionDomainIndexByTopologyCell[cell]] += topology.areaWeights[cell] || 1;
  }
  const targets = allocateDomainRegionTargets(
    regionArea,
    displayRegionEligible,
    Math.max(scaleBudget.targetRegionCount, displayRegionEligible.filter(Boolean).length),
  );

  const domains: GeographicSurfaceDomain[] = roots.map((root, index) => {
    const cellCount = countCells(domainIndexByTopologyCell, index);
    const domainArea = Math.max(0.000001, area[index]);
    const minimumCell = components[root].minimumCell;
    return {
      id: `surface-${componentCounts[index] > 1 ? 'archipelago' : 'landmass'}-${minimumCell}`,
      index,
      kind: componentCounts[index] > 1 ? 'archipelago' : 'landmass',
      componentCount: componentCounts[index],
      topologyCellCount: cellCount,
      areaShare: round(domainArea / Math.max(0.000001, totalArea), 8),
      landAreaShare: round(landArea[index] / domainArea, 6),
      waterAreaShare: round(waterArea[index] / domainArea, 6),
      displayRegionEligible: displayRegionEligible[index],
      targetRegionCount: targets[index],
      requestedTerritorialWaterMiles: round(territorialMiles, 2),
      representedTerritorialWaterMiles: round(representedMiles[index] ?? 0, 2),
    };
  });
  const oceanArea = Math.max(0.000001, area[openOceanIndex]);
  domains.push({
    id: 'surface-open-ocean',
    index: openOceanIndex,
    kind: 'open-ocean',
    componentCount: 1,
    topologyCellCount: countCells(domainIndexByTopologyCell, openOceanIndex),
    areaShare: round(oceanArea / Math.max(0.000001, totalArea), 8),
    landAreaShare: round(landArea[openOceanIndex] / oceanArea, 6),
    waterAreaShare: round(waterArea[openOceanIndex] / oceanArea, 6),
    displayRegionEligible: true,
    targetRegionCount: targets[openOceanIndex],
    requestedTerritorialWaterMiles: 0,
    representedTerritorialWaterMiles: 0,
  });

  return { domains, domainIndexByTopologyCell, regionDomainIndexByTopologyCell };
}

function findLandComponents(topology: CubedSphereTopology, water: Uint8Array): LandComponent[] {
  const adjacency = geographicTopologyAdjacency(topology);
  const visited = new Uint8Array(topology.cellCount);
  const queue = new Int32Array(topology.cellCount);
  const components: LandComponent[] = [];
  for (let start = 0; start < topology.cellCount; start += 1) {
    if (visited[start] === 1 || water[start] === 1) continue;
    const cells: number[] = [];
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    visited[start] = 1;
    while (head < tail) {
      const cell = queue[head++];
      cells.push(cell);
      for (let offset = adjacency.offsets[cell]; offset < adjacency.offsets[cell + 1]; offset += 1) {
        const neighbor = adjacency.neighbors[offset];
        if (neighbor < 0 || visited[neighbor] === 1 || water[neighbor] === 1) continue;
        visited[neighbor] = 1;
        queue[tail++] = neighbor;
      }
    }
    components.push({
      index: components.length,
      cells,
      minimumCell: start,
    });
  }
  return components;
}

function clusterNearbyLandComponents(
  topology: CubedSphereTopology,
  water: Uint8Array,
  components: LandComponent[],
  overlay: WorldHexOverlay,
  smallIslandClusterMiles: number,
): number[] {
  const adjacency = geographicTopologyAdjacency(topology);
  const representedEdgeMiles = representativeTopologyEdgeMiles(topology, overlay, adjacency);
  const smallComponentCellLimit = Math.max(16, Math.round(topology.cellCount * 0.00025));
  const traversalLimitMiles = Math.max(smallIslandClusterMiles, representedEdgeMiles * 2.5);
  const parent = components.map((component) => component.index);
  if (components.length < 2) return parent;
  const owner = new Int32Array(topology.cellCount);
  owner.fill(-1);
  const distance = new Float64Array(topology.cellCount);
  distance.fill(Number.POSITIVE_INFINITY);
  const heap = new DistanceHeap();

  for (const component of components) {
    for (const cell of component.cells) {
      owner[cell] = component.index;
      distance[cell] = 0;
      if (hasNeighborWithWaterState(adjacency, water, cell, true)) {
        heap.push(0, cell, component.index);
      }
    }
  }

  while (heap.size > 0) {
    const current = heap.pop();
    if (!current || current.distance > distance[current.cell] + 1e-9) continue;
    if (owner[current.cell] !== current.owner) continue;
    for (let offset = adjacency.offsets[current.cell]; offset < adjacency.offsets[current.cell + 1]; offset += 1) {
      const neighbor = adjacency.neighbors[offset];
      if (neighbor < 0) continue;
      const edgeMiles = topologyEdgeMiles(topology, current.cell, neighbor, overlay);
      const nextDistance = current.distance + edgeMiles;
      const neighborOwner = owner[neighbor];
      if (neighborOwner >= 0 && neighborOwner !== current.owner) {
        const involvesSmallComponent = components[current.owner].cells.length <= smallComponentCellLimit
          || components[neighborOwner].cells.length <= smallComponentCellLimit;
        const clusterLimit = involvesSmallComponent
          ? traversalLimitMiles
          : ARCHIPELAGO_CLUSTER_MILES;
        if (nextDistance + distance[neighbor] <= clusterLimit + 1e-9) {
          union(parent, current.owner, neighborOwner);
        }
        continue;
      }
      if (water[neighbor] !== 1 || nextDistance > traversalLimitMiles) continue;
      if (nextDistance + 1e-9 >= distance[neighbor]) continue;
      distance[neighbor] = nextDistance;
      owner[neighbor] = current.owner;
      heap.push(nextDistance, neighbor, current.owner);
    }
  }

  return parent.map((_, index) => findRoot(parent, index));
}

function representativeTopologyEdgeMiles(
  topology: CubedSphereTopology,
  overlay: WorldHexOverlay,
  adjacency: ReturnType<typeof geographicTopologyAdjacency>,
): number {
  const stride = Math.max(1, Math.floor(topology.cellCount / 1024));
  const samples: number[] = [];
  for (let cell = 0; cell < topology.cellCount; cell += stride) {
    const start = adjacency.offsets[cell];
    if (start >= adjacency.offsets[cell + 1]) continue;
    samples.push(topologyEdgeMiles(topology, cell, adjacency.neighbors[start], overlay));
  }
  if (samples.length === 0) return ARCHIPELAGO_CLUSTER_MILES;
  samples.sort((left, right) => left - right);
  return samples[Math.floor(samples.length / 2)];
}

function assignTerritorialWater(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  overlay: WorldHexOverlay,
  domainIndexByTopologyCell: Uint16Array,
  maximumMiles: number,
): number[] {
  const adjacency = geographicTopologyAdjacency(topology);
  const distance = new Float64Array(topology.cellCount);
  distance.fill(Number.POSITIVE_INFINITY);
  const owner = new Int32Array(topology.cellCount);
  owner.fill(-1);
  const heap = new DistanceHeap();
  const representedMiles: number[] = [];

  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    if (layers.water[cell] === 1) continue;
    const domainIndex = domainIndexByTopologyCell[cell];
    owner[cell] = domainIndex;
    distance[cell] = 0;
    if (hasNeighborWithWaterState(adjacency, layers.water, cell, true)) {
      heap.push(0, cell, domainIndex);
    }
  }

  while (heap.size > 0) {
    const current = heap.pop();
    if (!current || current.distance > distance[current.cell] + 1e-9) continue;
    if (owner[current.cell] !== current.owner) continue;
    for (let offset = adjacency.offsets[current.cell]; offset < adjacency.offsets[current.cell + 1]; offset += 1) {
      const neighbor = adjacency.neighbors[offset];
      if (neighbor < 0 || layers.water[neighbor] !== 1) continue;
      const nextDistance = current.distance + topologyEdgeMiles(topology, current.cell, neighbor, overlay);
      if (nextDistance > maximumMiles + 1e-9) continue;
      const winsTie = Math.abs(nextDistance - distance[neighbor]) <= 1e-9
        && (owner[neighbor] < 0 || current.owner < owner[neighbor]);
      if (nextDistance + 1e-9 >= distance[neighbor] && !winsTie) continue;
      distance[neighbor] = nextDistance;
      owner[neighbor] = current.owner;
      domainIndexByTopologyCell[neighbor] = current.owner;
      representedMiles[current.owner] = Math.max(representedMiles[current.owner] ?? 0, nextDistance);
      heap.push(nextDistance, neighbor, current.owner);
    }
  }
  return representedMiles;
}

function hasNeighborWithWaterState(
  adjacency: ReturnType<typeof geographicTopologyAdjacency>,
  water: Uint8Array,
  cell: number,
  targetWater: boolean,
): boolean {
  for (let offset = adjacency.offsets[cell]; offset < adjacency.offsets[cell + 1]; offset += 1) {
    if ((water[adjacency.neighbors[offset]] === 1) === targetWater) return true;
  }
  return false;
}

function assignMarkedLakes(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  domainIndexByTopologyCell: Uint16Array,
): void {
  const adjacency = geographicTopologyAdjacency(topology);
  const queue = new Int32Array(topology.cellCount);
  let head = 0;
  let tail = 0;
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    if (domainIndexByTopologyCell[cell] !== UNASSIGNED_DOMAIN) queue[tail++] = cell;
  }
  while (head < tail) {
    const cell = queue[head++];
    const owner = domainIndexByTopologyCell[cell];
    for (let offset = adjacency.offsets[cell]; offset < adjacency.offsets[cell + 1]; offset += 1) {
      const neighbor = adjacency.neighbors[offset];
      if (
        layers.lakes[neighbor] !== 1
        || domainIndexByTopologyCell[neighbor] !== UNASSIGNED_DOMAIN
      ) continue;
      domainIndexByTopologyCell[neighbor] = owner;
      queue[tail++] = neighbor;
    }
  }
}

function assignEnclosedWaterBodies(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  domainIndexByTopologyCell: Uint16Array,
): void {
  const adjacency = geographicTopologyAdjacency(topology);
  const visited = new Uint8Array(topology.cellCount);
  const queue = new Int32Array(topology.cellCount);
  const components: Array<{ cells: number[]; adjacentDomains: Set<number> }> = [];
  for (let start = 0; start < topology.cellCount; start += 1) {
    if (
      visited[start] === 1
      || layers.water[start] !== 1
      || domainIndexByTopologyCell[start] !== UNASSIGNED_DOMAIN
    ) continue;
    const cells: number[] = [];
    const adjacentDomains = new Set<number>();
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    visited[start] = 1;
    while (head < tail) {
      const cell = queue[head++];
      cells.push(cell);
      for (let offset = adjacency.offsets[cell]; offset < adjacency.offsets[cell + 1]; offset += 1) {
        const neighbor = adjacency.neighbors[offset];
        const neighborDomain = domainIndexByTopologyCell[neighbor];
        if (neighborDomain !== UNASSIGNED_DOMAIN) adjacentDomains.add(neighborDomain);
        if (
          visited[neighbor] === 0
          && layers.water[neighbor] === 1
          && neighborDomain === UNASSIGNED_DOMAIN
        ) {
          visited[neighbor] = 1;
          queue[tail++] = neighbor;
        }
      }
    }
    components.push({ cells, adjacentDomains });
  }
  if (components.length < 2) return;
  const ocean = [...components].sort((left, right) => right.cells.length - left.cells.length)[0];
  for (const component of components) {
    if (component === ocean || component.adjacentDomains.size === 0) continue;
    const owner = [...component.adjacentDomains].sort((left, right) => left - right)[0];
    for (const cell of component.cells) domainIndexByTopologyCell[cell] = owner;
  }
}

function allocateDomainRegionTargets(
  area: number[],
  eligible: boolean[],
  target: number,
): number[] {
  if (area.length === 0) return [];
  const totalArea = area.reduce((sum, value) => sum + value, 0);
  const targets: number[] = area.map((_, index) => eligible[index] ? 1 : 0);
  let remaining = Math.max(0, target - targets.reduce((sum, value) => sum + value, 0));
  const quotas = area.map((value) => (value / Math.max(0.000001, totalArea)) * target);
  while (remaining > 0) {
    const index = quotas
      .map((quota, domainIndex) => ({ domainIndex, need: quota - targets[domainIndex] }))
      .filter(({ domainIndex }) => eligible[domainIndex])
      .sort((left, right) => right.need - left.need || left.domainIndex - right.domainIndex)[0].domainIndex;
    targets[index] += 1;
    remaining -= 1;
  }
  return targets;
}

function preferredRegionSpanMiles(
  overlay: WorldHexOverlay,
  scaleBudget: GeographicRegionScaleBudget,
): number {
  const displayLevel = overlay.levels.find((level) => level.id === scaleBudget.targetDisplayLevelId);
  return (displayLevel?.nominalHexWidthMiles ?? 60) * scaleBudget.preferredViewportHexColumns;
}

function topologyEdgeMiles(
  topology: CubedSphereTopology,
  left: number,
  right: number,
  overlay: WorldHexOverlay,
): number {
  const leftOffset = left * 3;
  const rightOffset = right * 3;
  const dot = clamp(
    topology.positions[leftOffset] * topology.positions[rightOffset]
      + topology.positions[leftOffset + 1] * topology.positions[rightOffset + 1]
      + topology.positions[leftOffset + 2] * topology.positions[rightOffset + 2],
    -1,
    1,
  );
  return Math.acos(dot) * (overlay.planetCircumferenceMiles / (Math.PI * 2));
}

function countCells(membership: Uint16Array, domainIndex: number): number {
  let count = 0;
  for (const value of membership) if (value === domainIndex) count += 1;
  return count;
}

function findRoot(parent: number[], value: number): number {
  let current = value;
  while (parent[current] !== current) current = parent[current];
  let next = value;
  while (parent[next] !== next) {
    const previous = parent[next];
    parent[next] = current;
    next = previous;
  }
  return current;
}

function union(parent: number[], left: number, right: number): void {
  const leftRoot = findRoot(parent, left);
  const rightRoot = findRoot(parent, right);
  if (leftRoot === rightRoot) return;
  if (leftRoot < rightRoot) parent[rightRoot] = leftRoot;
  else parent[leftRoot] = rightRoot;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function round(value: number, places: number): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

class DistanceHeap {
  private readonly entries: Array<{ distance: number; cell: number; owner: number }> = [];

  get size(): number {
    return this.entries.length;
  }

  push(distance: number, cell: number, owner: number): void {
    const entry = { distance, cell, owner };
    this.entries.push(entry);
    let index = this.entries.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (!this.before(entry, this.entries[parent])) break;
      this.entries[index] = this.entries[parent];
      index = parent;
    }
    this.entries[index] = entry;
  }

  pop(): { distance: number; cell: number; owner: number } | null {
    if (this.entries.length === 0) return null;
    const first = this.entries[0];
    const last = this.entries.pop();
    if (!last || this.entries.length === 0) return first;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      if (left >= this.entries.length) break;
      let child = left;
      if (right < this.entries.length && this.before(this.entries[right], this.entries[left])) child = right;
      if (!this.before(this.entries[child], last)) break;
      this.entries[index] = this.entries[child];
      index = child;
    }
    this.entries[index] = last;
    return first;
  }

  private before(
    left: { distance: number; cell: number; owner: number },
    right: { distance: number; cell: number; owner: number },
  ): boolean {
    return left.distance < right.distance
      || (left.distance === right.distance && (
        left.owner < right.owner || (left.owner === right.owner && left.cell < right.cell)
      ));
  }
}

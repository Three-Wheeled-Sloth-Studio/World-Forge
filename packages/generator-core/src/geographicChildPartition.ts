import {
  cubedSphereCellForLonLat,
  type CubedSphereTopology,
} from '@world-forge/shared';
import {
  GEOGRAPHIC_CHILD_PARTITION_VERSION,
  GEOGRAPHIC_HIERARCHY_VERSION,
  type GeographicAdaptiveHexScale,
  type GeographicHierarchyLevel,
  type GeographicHierarchyNode,
  type GeographicHierarchyPartition,
} from '@world-forge/shared/geographicHierarchy';
import type {
  GeographicRegionBoundaryKind,
  GeographicRegionInputLayers,
} from '@world-forge/shared/geographicRegions';
import {
  deriveAdaptiveGeographicScale,
  worldHexCenter,
} from './geographicAdaptiveScale';
import { geographicTopologyAdjacency } from './geographicTopologyAdjacency';

const UNASSIGNED_CHILD = 0xffff;
const TARGET_HEXES_PER_CHILD = 400;
const MAXIMUM_CHILD_COUNT = 128;
const RADIANS_TO_DEGREES = 180 / Math.PI;
const DEGREES_TO_RADIANS = Math.PI / 180;

export type GeographicChildPartitionOptions = {
  projectId: string;
  worldSeed: string;
  parentId: string;
  parentLevel: 'region' | 'subregion' | 'local';
  childLevel: Exclude<GeographicHierarchyLevel, 'macro-area' | 'region'>;
  parentMembership: Uint8Array;
  parentScale: GeographicAdaptiveHexScale;
  planetCircumferenceMiles: number;
  targetChildCount?: number;
};

export function buildGeographicChildPartition(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  options: GeographicChildPartitionOptions,
): GeographicHierarchyPartition {
  validateInputs(topology, layers, options.parentMembership);
  const childScaleResult = deriveAdaptiveGeographicScale(
    topology,
    options.planetCircumferenceMiles,
    options.parentMembership,
    {
      maximumScaleMiles: Math.max(0.5, options.parentScale.nominalHexWidthMiles / 2),
    },
  );
  const components = parentComponents(topology, options.parentMembership);
  const requestedTarget = options.targetChildCount ?? Math.round(
    childScaleResult.scale.exactParentHexCount / TARGET_HEXES_PER_CHILD,
  );
  const targetChildCount = clampInteger(
    Math.max(components.length, requestedTarget),
    components.length,
    Math.min(MAXIMUM_CHILD_COUNT, countSelected(options.parentMembership)),
  );
  const componentTargets = allocateComponentTargets(topology, components, targetChildCount);
  const seeds = selectComponentSeeds(
    topology,
    components,
    componentTargets,
    `${options.worldSeed}:${options.parentId}:${options.childLevel}:${childScaleResult.scale.id}`,
  );
  const membership = partitionParent(topology, layers, options.parentMembership, seeds);
  const children = buildChildNodes(
    topology,
    layers,
    membership,
    seeds,
    options,
    childScaleResult.scale,
    childScaleResult.extent,
  );

  return {
    modelVersion: GEOGRAPHIC_HIERARCHY_VERSION,
    algorithmVersion: GEOGRAPHIC_CHILD_PARTITION_VERSION,
    hierarchyLevel: options.childLevel,
    parentLevel: options.parentLevel,
    parentId: options.parentId,
    sourceTopologyKind: topology.kind,
    sourceTopologyResolution: topology.resolution,
    scale: childScaleResult.scale,
    extent: childScaleResult.extent,
    membership: {
      encoding: 'uint16-child-index',
      childIndexByTopologyCell: membership,
    },
    children,
    signature: childPartitionSignature(options, childScaleResult.scale, seeds, membership),
  };
}

export function childMembershipMask(
  partition: GeographicHierarchyPartition,
  childId: string,
): Uint8Array {
  const childIndex = partition.children.findIndex((child) => child.id === childId);
  const mask = new Uint8Array(partition.membership.childIndexByTopologyCell.length);
  if (childIndex < 0) return mask;
  for (let cell = 0; cell < mask.length; cell += 1) {
    if (partition.membership.childIndexByTopologyCell[cell] === childIndex) mask[cell] = 1;
  }
  return mask;
}

type Seed = {
  topologyCellId: number;
  componentIndex: number;
};

type ParentComponent = {
  index: number;
  cells: number[];
  areaWeight: number;
};

function parentComponents(
  topology: CubedSphereTopology,
  parentMembership: Uint8Array,
): ParentComponent[] {
  const adjacency = geographicTopologyAdjacency(topology);
  const visited = new Uint8Array(topology.cellCount);
  const queue = new Int32Array(topology.cellCount);
  const components: ParentComponent[] = [];
  for (let start = 0; start < topology.cellCount; start += 1) {
    if (parentMembership[start] !== 1 || visited[start] === 1) continue;
    const cells: number[] = [];
    let areaWeight = 0;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    visited[start] = 1;
    while (head < tail) {
      const cell = queue[head++];
      cells.push(cell);
      areaWeight += topology.areaWeights[cell] || 1;
      for (let offset = adjacency.offsets[cell]; offset < adjacency.offsets[cell + 1]; offset += 1) {
        const neighbor = adjacency.neighbors[offset];
        if (neighbor < 0 || visited[neighbor] === 1 || parentMembership[neighbor] !== 1) continue;
        visited[neighbor] = 1;
        queue[tail++] = neighbor;
      }
    }
    components.push({ index: components.length, cells, areaWeight });
  }
  return components.sort((left, right) => right.areaWeight - left.areaWeight || left.cells[0] - right.cells[0])
    .map((component, index) => ({ ...component, index }));
}

function allocateComponentTargets(
  topology: CubedSphereTopology,
  components: ParentComponent[],
  targetCount: number,
): number[] {
  const targets = components.map(() => 1);
  let remaining = targetCount - targets.length;
  const totalArea = components.reduce((sum, component) => sum + component.areaWeight, 0);
  while (remaining > 0) {
    let bestIndex = 0;
    let bestDeficit = Number.NEGATIVE_INFINITY;
    for (let index = 0; index < components.length; index += 1) {
      const desired = targetCount * (components[index].areaWeight / Math.max(0.000001, totalArea));
      const capacity = components[index].cells.length;
      if (targets[index] >= capacity) continue;
      const deficit = desired - targets[index];
      if (deficit > bestDeficit || (deficit === bestDeficit && components[index].cells[0] < components[bestIndex].cells[0])) {
        bestDeficit = deficit;
        bestIndex = index;
      }
    }
    if (targets[bestIndex] >= components[bestIndex].cells.length) break;
    targets[bestIndex] += 1;
    remaining -= 1;
  }
  return targets;
}

function selectComponentSeeds(
  topology: CubedSphereTopology,
  components: ParentComponent[],
  targets: number[],
  seedText: string,
): Seed[] {
  const seeds: Seed[] = [];
  for (let componentIndex = 0; componentIndex < components.length; componentIndex += 1) {
    const component = components[componentIndex];
    const selected = selectFarthestSeeds(
      topology,
      component.cells,
      targets[componentIndex],
      `${seedText}:component:${component.cells[0]}`,
    );
    for (const topologyCellId of selected) seeds.push({ topologyCellId, componentIndex });
  }
  return seeds.sort((left, right) => left.componentIndex - right.componentIndex || left.topologyCellId - right.topologyCellId);
}

function partitionParent(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  parentMembership: Uint8Array,
  seeds: Seed[],
): Uint16Array {
  const adjacency = geographicTopologyAdjacency(topology);
  const membership = new Uint16Array(topology.cellCount);
  membership.fill(UNASSIGNED_CHILD);
  const distances = new Float64Array(topology.cellCount);
  distances.fill(Number.POSITIVE_INFINITY);
  const heap = new ChildMinHeap();

  for (let childIndex = 0; childIndex < seeds.length; childIndex += 1) {
    const cell = seeds[childIndex].topologyCellId;
    membership[cell] = childIndex;
    distances[cell] = 0;
    heap.push(0, cell, childIndex);
  }

  while (heap.size > 0) {
    const current = heap.pop();
    if (!current || current.cost > distances[current.cell] + 1e-9) continue;
    if (membership[current.cell] !== current.childIndex) continue;
    for (let offset = adjacency.offsets[current.cell]; offset < adjacency.offsets[current.cell + 1]; offset += 1) {
      const neighbor = adjacency.neighbors[offset];
      if (neighbor < 0 || parentMembership[neighbor] !== 1) continue;
      const nextCost = current.cost + traversalCost(current.cell, neighbor, layers);
      const previousCost = distances[neighbor];
      const previousChild = membership[neighbor];
      const winsTie = Math.abs(nextCost - previousCost) <= 1e-9
        && (previousChild === UNASSIGNED_CHILD || current.childIndex < previousChild);
      if (nextCost + 1e-9 >= previousCost && !winsTie) continue;
      distances[neighbor] = nextCost;
      membership[neighbor] = current.childIndex;
      heap.push(nextCost, neighbor, current.childIndex);
    }
  }

  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    if (parentMembership[cell] !== 1) membership[cell] = UNASSIGNED_CHILD;
  }
  return membership;
}

function buildChildNodes(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  membership: Uint16Array,
  seeds: Seed[],
  options: GeographicChildPartitionOptions,
  scale: GeographicAdaptiveHexScale,
  extent: GeographicHierarchyPartition['extent'],
): GeographicHierarchyNode[] {
  const accumulators = seeds.map((seed) => ({
    seed: seed.topologyCellId,
    cells: [] as number[],
    area: 0,
    landArea: 0,
    waterArea: 0,
    centerX: 0,
    centerY: 0,
    centerZ: 0,
    neighbors: new Set<number>(),
  }));
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    const childIndex = membership[cell];
    const accumulator = accumulators[childIndex];
    if (!accumulator) continue;
    const area = topology.areaWeights[cell] || 1;
    const positionOffset = cell * 3;
    accumulator.cells.push(cell);
    accumulator.area += area;
    if (layers.water[cell] === 1) accumulator.waterArea += area;
    else accumulator.landArea += area;
    accumulator.centerX += topology.positions[positionOffset] * area;
    accumulator.centerY += topology.positions[positionOffset + 1] * area;
    accumulator.centerZ += topology.positions[positionOffset + 2] * area;
  }
  const adjacency = geographicTopologyAdjacency(topology);
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    const left = membership[cell];
    if (!accumulators[left]) continue;
    for (let offset = adjacency.offsets[cell]; offset < adjacency.offsets[cell + 1]; offset += 1) {
      const right = membership[adjacency.neighbors[offset]];
      if (right !== left && accumulators[right]) accumulators[left].neighbors.add(right);
    }
  }

  return accumulators.map((accumulator, index) => {
    const total = Math.max(0.000001, accumulator.area);
    const landAreaShare = accumulator.landArea / total;
    const waterAreaShare = accumulator.waterArea / total;
    const id = childId(options, scale, accumulator.seed);
    const labelCell = closestCellToVector(
      topology,
      accumulator.cells,
      accumulator.centerX,
      accumulator.centerY,
      accumulator.centerZ,
    );
    return {
      id,
      index,
      level: options.childLevel,
      parentId: options.parentId,
      label: `${titleCase(options.childLevel)} ${index + 1}`,
      classification: waterAreaShare >= 0.9
        ? 'water'
        : landAreaShare >= 0.88
          ? 'land'
          : waterAreaShare >= 0.4 && landAreaShare >= 0.1
            ? 'archipelago'
            : 'mixed',
      seedTopologyCellId: accumulator.seed,
      topologyCellCount: accumulator.cells.length,
      areaWeight: round(accumulator.area, 6),
      landAreaShare: round(landAreaShare, 4),
      waterAreaShare: round(waterAreaShare, 4),
      bounds: membershipBounds(topology, accumulator.cells),
      labelPoint: {
        topologyCellId: labelCell,
        latitude: round(topology.latitudes[labelCell] * RADIANS_TO_DEGREES, 4),
        longitude: round(topology.longitudes[labelCell] * RADIANS_TO_DEGREES, 4),
      },
      neighborIds: [...accumulator.neighbors].map((neighbor) => childId(options, scale, accumulators[neighbor].seed)).sort(),
      exactHexCount: countChildHexes(topology, membership, index, scale, extent),
    };
  });
}

function countChildHexes(
  topology: CubedSphereTopology,
  membership: Uint16Array,
  childIndex: number,
  scale: GeographicAdaptiveHexScale,
  extent: GeographicHierarchyPartition['extent'],
): number {
  let count = 0;
  for (let r = extent.rMin; r <= extent.rMax; r += 1) {
    for (let offset = 0; offset < extent.columns; offset += 1) {
      const q = mod(extent.qMin + offset, scale.worldColumns);
      const center = worldHexCenter(q, r, scale.worldColumns, scale.worldRows);
      const cell = cubedSphereCellForLonLat(
        topology,
        center.longitude * DEGREES_TO_RADIANS,
        center.latitude * DEGREES_TO_RADIANS,
      );
      if (membership[cell] === childIndex) count += 1;
    }
  }
  return count;
}

function traversalCost(
  from: number,
  to: number,
  layers: GeographicRegionInputLayers,
): number {
  const fromWater = layers.water[from] === 1;
  const toWater = layers.water[to] === 1;
  let cost = 1;
  if (fromWater !== toWater) cost += 12;
  cost += Math.min(4, Math.abs(layers.elevation[from] - layers.elevation[to]) * 10);
  if (layers.biomes[from] !== layers.biomes[to]) cost += 0.8;
  cost += Math.min(2, Math.abs(layers.temperature[from] - layers.temperature[to]) / 12);
  cost += Math.min(1.5, Math.abs(layers.wetness[from] - layers.wetness[to]) * 2);
  if (layers.plates[from] !== layers.plates[to]) cost += 0.45;
  if (layers.lakes[from] !== layers.lakes[to]) cost += 1.2;
  if (!fromWater && !toWater && Math.min(layers.river[from], layers.river[to]) >= 0.35) cost *= 0.88;
  return Math.max(0.1, cost);
}

function selectFarthestSeeds(
  topology: CubedSphereTopology,
  candidates: number[],
  targetCount: number,
  seedText: string,
): number[] {
  if (candidates.length === 0 || targetCount <= 0) return [];
  const selected = [candidates[hashText(`${seedText}:first`) % candidates.length]];
  while (selected.length < Math.min(targetCount, candidates.length)) {
    let bestCell = -1;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const candidate of candidates) {
      if (selected.includes(candidate)) continue;
      let minimumDistance = Number.POSITIVE_INFINITY;
      for (const seed of selected) minimumDistance = Math.min(minimumDistance, chordDistanceSquared(topology.positions, candidate, seed));
      const score = minimumDistance + ((hashText(`${seedText}:${candidate}`) & 0xffff) / 0xffff) * 1e-8;
      if (score > bestScore || (score === bestScore && candidate < bestCell)) {
        bestCell = candidate;
        bestScore = score;
      }
    }
    if (bestCell < 0) break;
    selected.push(bestCell);
  }
  return selected;
}

function childId(
  options: GeographicChildPartitionOptions,
  scale: GeographicAdaptiveHexScale,
  seedTopologyCellId: number,
): string {
  const hash = hashText(`${options.projectId}:${options.worldSeed}:${options.parentId}:${options.childLevel}:${scale.id}:${seedTopologyCellId}`);
  return `${options.childLevel}-${hash.toString(16).padStart(8, '0')}-c${seedTopologyCellId}`;
}

function childPartitionSignature(
  options: GeographicChildPartitionOptions,
  scale: GeographicAdaptiveHexScale,
  seeds: Seed[],
  membership: Uint16Array,
): string {
  let hash = 0x811c9dc5;
  const addByte = (value: number) => {
    hash = Math.imul(hash ^ (value & 0xff), 0x01000193) >>> 0;
  };
  for (const character of `${GEOGRAPHIC_CHILD_PARTITION_VERSION}:${options.projectId}:${options.worldSeed}:${options.parentId}:${options.childLevel}:${scale.id}`) {
    addByte(character.charCodeAt(0));
  }
  for (const seed of seeds) {
    addByte(seed.topologyCellId);
    addByte(seed.topologyCellId >>> 8);
    addByte(seed.topologyCellId >>> 16);
    addByte(seed.topologyCellId >>> 24);
  }
  for (const childIndex of membership) {
    addByte(childIndex);
    addByte(childIndex >>> 8);
  }
  return `wfhp-v1-${hash.toString(16).padStart(8, '0')}`;
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

function closestCellToVector(
  topology: CubedSphereTopology,
  cells: number[],
  centerX: number,
  centerY: number,
  centerZ: number,
): number {
  const length = Math.hypot(centerX, centerY, centerZ) || 1;
  const targetX = centerX / length;
  const targetY = centerY / length;
  const targetZ = centerZ / length;
  let bestCell = cells[0] ?? 0;
  let bestDot = Number.NEGATIVE_INFINITY;
  for (const cell of cells) {
    const offset = cell * 3;
    const dot = topology.positions[offset] * targetX
      + topology.positions[offset + 1] * targetY
      + topology.positions[offset + 2] * targetZ;
    if (dot > bestDot || (dot === bestDot && cell < bestCell)) {
      bestCell = cell;
      bestDot = dot;
    }
  }
  return bestCell;
}

function chordDistanceSquared(positions: Float32Array, leftCell: number, rightCell: number): number {
  const left = leftCell * 3;
  const right = rightCell * 3;
  const dx = positions[left] - positions[right];
  const dy = positions[left + 1] - positions[right + 1];
  const dz = positions[left + 2] - positions[right + 2];
  return dx * dx + dy * dy + dz * dz;
}

function countSelected(mask: Uint8Array): number {
  let count = 0;
  for (const value of mask) if (value === 1) count += 1;
  return count;
}

function validateInputs(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  parentMembership: Uint8Array,
): void {
  if (parentMembership.length !== topology.cellCount) throw new Error('Child partition parent membership must match topology.');
  const lengths = [
    layers.elevation.length,
    layers.water.length,
    layers.plates.length,
    layers.temperature.length,
    layers.wetness.length,
    layers.biomes.length,
    layers.river.length,
    layers.lakes.length,
  ];
  if (lengths.some((length) => length !== topology.cellCount)) {
    throw new Error('Child partition input layers must match topology.');
  }
}

function titleCase(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
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

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, Math.round(value)));
}

function hashText(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 0x01000193) >>> 0;
  }
  return hash;
}

function round(value: number, places: number): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

class ChildMinHeap {
  private readonly costs: number[] = [];
  private readonly cells: number[] = [];
  private readonly children: number[] = [];

  get size(): number {
    return this.costs.length;
  }

  push(cost: number, cell: number, childIndex: number): void {
    let index = this.costs.length;
    this.costs.push(cost);
    this.cells.push(cell);
    this.children.push(childIndex);
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (!this.precedes(index, parent)) break;
      this.swap(index, parent);
      index = parent;
    }
  }

  pop(): { cost: number; cell: number; childIndex: number } | null {
    if (this.costs.length === 0) return null;
    const result = { cost: this.costs[0], cell: this.cells[0], childIndex: this.children[0] };
    const last = this.costs.length - 1;
    if (last === 0) {
      this.costs.pop();
      this.cells.pop();
      this.children.pop();
      return result;
    }
    this.costs[0] = this.costs[last];
    this.cells[0] = this.cells[last];
    this.children[0] = this.children[last];
    this.costs.pop();
    this.cells.pop();
    this.children.pop();
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let next = index;
      if (left < this.costs.length && this.precedes(left, next)) next = left;
      if (right < this.costs.length && this.precedes(right, next)) next = right;
      if (next === index) break;
      this.swap(index, next);
      index = next;
    }
    return result;
  }

  private precedes(left: number, right: number): boolean {
    if (this.costs[left] !== this.costs[right]) return this.costs[left] < this.costs[right];
    if (this.children[left] !== this.children[right]) return this.children[left] < this.children[right];
    return this.cells[left] < this.cells[right];
  }

  private swap(left: number, right: number): void {
    [this.costs[left], this.costs[right]] = [this.costs[right], this.costs[left]];
    [this.cells[left], this.cells[right]] = [this.cells[right], this.cells[left]];
    [this.children[left], this.children[right]] = [this.children[right], this.children[left]];
  }
}

import type { CubedSphereTopology } from '@world-forge/shared';

export type GeographicTopologyAdjacency = {
  offsets: Uint32Array;
  neighbors: Int32Array;
};

const MAXIMUM_NEIGHBORS_PER_CELL = 8;
const cache = new WeakMap<CubedSphereTopology, GeographicTopologyAdjacency>();

export function geographicTopologyAdjacency(
  topology: CubedSphereTopology,
): GeographicTopologyAdjacency {
  const cached = cache.get(topology);
  if (cached) return cached;

  const table = new Int32Array(topology.cellCount * MAXIMUM_NEIGHBORS_PER_CELL);
  table.fill(-1);
  const counts = new Uint8Array(topology.cellCount);
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    for (let direction = 0; direction < 4; direction += 1) {
      const neighbor = topology.neighbors[cell * 4 + direction];
      if (neighbor < 0 || neighbor === cell) continue;
      addUnique(table, counts, cell, neighbor);
      addUnique(table, counts, neighbor, cell);
    }
  }

  const offsets = new Uint32Array(topology.cellCount + 1);
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    offsets[cell + 1] = offsets[cell] + counts[cell];
  }
  const neighbors = new Int32Array(offsets[topology.cellCount]);
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    const values = Array.from(
      table.subarray(
        cell * MAXIMUM_NEIGHBORS_PER_CELL,
        cell * MAXIMUM_NEIGHBORS_PER_CELL + counts[cell],
      ),
    ).sort((left, right) => left - right);
    neighbors.set(values, offsets[cell]);
  }

  const adjacency = { offsets, neighbors };
  cache.set(topology, adjacency);
  return adjacency;
}

function addUnique(
  table: Int32Array,
  counts: Uint8Array,
  cell: number,
  neighbor: number,
): void {
  const offset = cell * MAXIMUM_NEIGHBORS_PER_CELL;
  for (let index = 0; index < counts[cell]; index += 1) {
    if (table[offset + index] === neighbor) return;
  }
  if (counts[cell] >= MAXIMUM_NEIGHBORS_PER_CELL) {
    throw new Error(`Geographic topology cell ${cell} exceeds the adjacency safety bound.`);
  }
  table[offset + counts[cell]] = neighbor;
  counts[cell] += 1;
}

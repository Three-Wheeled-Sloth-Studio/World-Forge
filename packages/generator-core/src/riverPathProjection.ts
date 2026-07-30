import { cubedSphereCellForLonLat, type CubedSphereTopology } from '@world-forge/shared';

export function projectTopologyRiverPath(
  topologyPath: readonly number[],
  topology: CubedSphereTopology,
  width: number,
  height: number
): number[] {
  const path: number[] = [];
  let previousCell: number | undefined;
  for (const cell of topologyPath) {
    if (!Number.isInteger(cell) || cell < 0 || cell >= topology.cellCount) break;
    if (cell === previousCell) continue;
    if (previousCell !== undefined && !areTopologyNeighbors(topology, previousCell, cell)) break;
    const longitude = topology.longitudes[cell];
    const latitude = topology.latitudes[cell];
    const x = Math.max(0, Math.min(width - 1, Math.floor(((longitude + Math.PI) / (Math.PI * 2)) * width)));
    const y = Math.max(0, Math.min(height - 1, Math.floor((0.5 - latitude / Math.PI) * height)));
    const index = y * width + x;
    if (path[path.length - 1] !== index) path.push(index);
    previousCell = cell;
  }
  return path;
}

export function areTopologyNeighbors(topology: CubedSphereTopology, source: number, destination: number): boolean {
  for (let direction = 0; direction < 4; direction += 1) {
    if (topology.neighbors[source * 4 + direction] === destination) return true;
  }
  return false;
}

export function topologyCellAtRasterPoint(
  topology: CubedSphereTopology,
  x: number,
  y: number,
  width: number,
  height: number
): number {
  const longitude = ((x + 0.5) / width) * Math.PI * 2 - Math.PI;
  const latitude = Math.PI / 2 - ((y + 0.5) / height) * Math.PI;
  return cubedSphereCellForLonLat(topology, longitude, latitude);
}

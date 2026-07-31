import { cubedSphereCellForVector, type CubedSphereTopology } from '@world-forge/shared';

const maxCachedLookups = 2;
const lookupCache = new Map<string, Uint32Array>();

function cacheKey(topology: CubedSphereTopology, width: number, height: number): string {
  return `${topology.kind}:${topology.resolution}:${width}x${height}`;
}

export function equirectangularTopologyLookup(
  topology: CubedSphereTopology,
  requestedWidth: number,
  requestedHeight: number
): Uint32Array {
  const width = Math.max(1, Math.round(requestedWidth));
  const height = Math.max(1, Math.round(requestedHeight));
  const key = cacheKey(topology, width, height);
  const cached = lookupCache.get(key);
  if (cached) {
    lookupCache.delete(key);
    lookupCache.set(key, cached);
    return cached;
  }

  const longitudeCos = new Float64Array(width);
  const longitudeSin = new Float64Array(width);
  for (let x = 0; x < width; x += 1) {
    const longitude = ((x + 0.5) / width) * Math.PI * 2 - Math.PI;
    longitudeCos[x] = Math.cos(longitude);
    longitudeSin[x] = Math.sin(longitude);
  }

  const cells = new Uint32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const latitude = Math.PI / 2 - ((y + 0.5) / height) * Math.PI;
    const cosLatitude = Math.cos(latitude);
    const sinLatitude = Math.sin(latitude);
    const rowOffset = y * width;
    for (let x = 0; x < width; x += 1) {
      cells[rowOffset + x] = cubedSphereCellForVector(
        topology,
        cosLatitude * longitudeCos[x],
        sinLatitude,
        cosLatitude * longitudeSin[x]
      );
    }
  }

  lookupCache.set(key, cells);
  while (lookupCache.size > maxCachedLookups) {
    const oldest = lookupCache.keys().next().value as string | undefined;
    if (!oldest) break;
    lookupCache.delete(oldest);
  }
  return cells;
}

export function clearEquirectangularTopologyLookupCache(): void {
  lookupCache.clear();
}

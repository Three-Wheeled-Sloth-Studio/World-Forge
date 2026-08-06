import type { CubedSphereTopology, WorldHexOverlay } from '@world-forge/shared';
import type {
  GeographicRegionInputLayers,
  GeographicRegionScaleBudget,
  GeographicSurfaceDomain,
} from '@world-forge/shared/geographicRegions';
import { buildGeographicSurfaceDomains as buildBaseGeographicSurfaceDomains } from './geographicSurfaceDomainsBase';

export * from './geographicSurfaceDomainsBase';

const DOMINANT_MAINLAND_SHARE = 0.72;

export function surfaceDomainKindForComponentAreas(
  componentAreas: readonly number[],
): Extract<GeographicSurfaceDomain['kind'], 'landmass' | 'archipelago'> {
  const positiveAreas = componentAreas.filter((area) => Number.isFinite(area) && area > 0);
  if (positiveAreas.length <= 1) return 'landmass';
  const totalArea = positiveAreas.reduce((sum, area) => sum + area, 0);
  const largestArea = Math.max(...positiveAreas);
  return largestArea / Math.max(Number.EPSILON, totalArea) >= DOMINANT_MAINLAND_SHARE
    ? 'landmass'
    : 'archipelago';
}

export function buildGeographicSurfaceDomains(
  topology: CubedSphereTopology,
  layers: GeographicRegionInputLayers,
  overlay: WorldHexOverlay,
  scaleBudget: GeographicRegionScaleBudget,
): ReturnType<typeof buildBaseGeographicSurfaceDomains> {
  const result = buildBaseGeographicSurfaceDomains(topology, layers, overlay, scaleBudget);
  const componentAreasByDomain = landComponentAreasByDomain(
    topology,
    layers.water,
    result.domainIndexByTopologyCell,
  );
  const domains = result.domains.map((domain) => {
    if (domain.kind === 'open-ocean') return domain;
    const kind = surfaceDomainKindForComponentAreas(componentAreasByDomain.get(domain.index) ?? []);
    if (kind === domain.kind) return domain;
    return {
      ...domain,
      kind,
      id: domain.id.replace(/^surface-(?:archipelago|landmass)-/, `surface-${kind}-`),
    };
  });
  return { ...result, domains };
}

function landComponentAreasByDomain(
  topology: CubedSphereTopology,
  water: Uint8Array,
  domainIndexByTopologyCell: Uint16Array,
): Map<number, number[]> {
  const visited = new Uint8Array(topology.cellCount);
  const componentAreasByDomain = new Map<number, number[]>();
  const queue = new Int32Array(topology.cellCount);

  for (let start = 0; start < topology.cellCount; start += 1) {
    if (visited[start] === 1 || water[start] === 1) continue;
    const domainIndex = domainIndexByTopologyCell[start];
    let head = 0;
    let tail = 0;
    let area = 0;
    visited[start] = 1;
    queue[tail++] = start;

    while (head < tail) {
      const cell = queue[head++];
      area += topology.areaWeights[cell] || 1;
      for (let offset = 0; offset < 4; offset += 1) {
        const neighbor = topology.neighbors[cell * 4 + offset];
        if (
          neighbor < 0
          || visited[neighbor] === 1
          || water[neighbor] === 1
          || domainIndexByTopologyCell[neighbor] !== domainIndex
        ) continue;
        visited[neighbor] = 1;
        queue[tail++] = neighbor;
      }
    }

    const areas = componentAreasByDomain.get(domainIndex) ?? [];
    areas.push(area);
    componentAreasByDomain.set(domainIndex, areas);
  }
  return componentAreasByDomain;
}

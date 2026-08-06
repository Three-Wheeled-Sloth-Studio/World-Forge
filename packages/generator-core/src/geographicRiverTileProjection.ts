import {
  hexTerrainTypeNameFromRules,
  type CubedSphereTopology,
  type HexTileEdge,
  type River,
  type WorldProject,
} from '@world-forge/shared';
import type { GeographicAdaptiveHexScale } from '@world-forge/shared/geographicHierarchy';
import type {
  GeographicRiverTerminus,
  GeographicTileWindowTile,
} from '@world-forge/shared/geographicTileWindow';
import {
  assignCanonicalRiverEdges as assignBaseCanonicalRiverEdges,
  estimatedRiverWidthMiles,
  geographicPathTileCoordinates as sampledGeographicPathTileCoordinates,
} from './geographicRiverTileProjectionBase';

export * from './geographicRiverTileProjectionBase';

type TileCoordinate = { q: number; r: number };
type TileDirection = {
  edge: HexTileEdge;
  opposite: HexTileEdge;
  dqEven: number;
  drEven: number;
  dqOdd: number;
  drOdd: number;
};

const ODD_R_DIRECTIONS: TileDirection[] = [
  { edge: 'e', opposite: 'w', dqEven: 1, drEven: 0, dqOdd: 1, drOdd: 0 },
  { edge: 'se', opposite: 'nw', dqEven: 0, drEven: 1, dqOdd: 1, drOdd: 1 },
  { edge: 'sw', opposite: 'ne', dqEven: -1, drEven: 1, dqOdd: 0, drOdd: 1 },
  { edge: 'w', opposite: 'e', dqEven: -1, drEven: 0, dqOdd: -1, drOdd: 0 },
  { edge: 'nw', opposite: 'se', dqEven: -1, drEven: -1, dqOdd: 0, drOdd: -1 },
  { edge: 'ne', opposite: 'sw', dqEven: 0, drEven: -1, dqOdd: 1, drOdd: -1 },
];

export function geographicPathTileCoordinates(
  points: Array<{ latitude: number; longitude: number }>,
  scale: Pick<GeographicAdaptiveHexScale, 'worldColumns' | 'worldRows'>,
): TileCoordinate[] {
  return densifyGeographicTileRoute(
    sampledGeographicPathTileCoordinates(points, scale),
    scale,
  );
}

export function geographicTileCoordinateDistance(
  left: TileCoordinate,
  right: TileCoordinate,
  worldColumns: number,
): number {
  let best = Number.POSITIVE_INFINITY;
  const leftCube = oddRToCube(left.q, left.r);
  for (const shift of [-worldColumns, 0, worldColumns]) {
    const rightCube = oddRToCube(right.q + shift, right.r);
    best = Math.min(best, Math.max(
      Math.abs(leftCube.x - rightCube.x),
      Math.abs(leftCube.y - rightCube.y),
      Math.abs(leftCube.z - rightCube.z),
    ));
  }
  return best;
}

export function assignCanonicalRiverEdges(
  tiles: Map<string, GeographicTileWindowTile>,
  scale: GeographicAdaptiveHexScale,
  project: WorldProject,
  topology: CubedSphereTopology,
): void {
  assignBaseCanonicalRiverEdges(tiles, scale, project, topology);
  repairProjectedCanonicalRouteGaps(tiles, scale, project, topology);
}

function repairProjectedCanonicalRouteGaps(
  tiles: Map<string, GeographicTileWindowTile>,
  scale: GeographicAdaptiveHexScale,
  project: WorldProject,
  topology: CubedSphereTopology,
): void {
  for (const river of project.primaryWorld.rivers) {
    const points = riverGeographicPoints(river, project, topology);
    if (points.length < 2) continue;
    const sampledRoute = sampledGeographicPathTileCoordinates(points, scale);
    for (let index = 1; index < sampledRoute.length; index += 1) {
      const start = sampledRoute[index - 1];
      const end = sampledRoute[index];
      if (geographicTileCoordinateDistance(start, end, scale.worldColumns) <= 1) continue;
      const bridge = connectTileCoordinates(start, end, scale);
      applyBridgeEdges(bridge, tiles, scale, river.terminus);
    }
  }
}

function densifyGeographicTileRoute(
  sampledRoute: TileCoordinate[],
  scale: Pick<GeographicAdaptiveHexScale, 'worldColumns' | 'worldRows'>,
): TileCoordinate[] {
  if (sampledRoute.length < 2) return sampledRoute;
  const route: TileCoordinate[] = [sampledRoute[0]];
  for (let index = 1; index < sampledRoute.length; index += 1) {
    const start = route[route.length - 1];
    const end = sampledRoute[index];
    const segment = geographicTileCoordinateDistance(start, end, scale.worldColumns) <= 1
      ? [start, end]
      : connectTileCoordinates(start, end, scale);
    for (let segmentIndex = 1; segmentIndex < segment.length; segmentIndex += 1) {
      const coordinate = segment[segmentIndex];
      const previous = route[route.length - 1];
      if (coordinate.q !== previous.q || coordinate.r !== previous.r) route.push(coordinate);
    }
  }
  return route;
}

function connectTileCoordinates(
  start: TileCoordinate,
  end: TileCoordinate,
  scale: Pick<GeographicAdaptiveHexScale, 'worldColumns' | 'worldRows'>,
): TileCoordinate[] {
  const route: TileCoordinate[] = [start];
  const visited = new Set<string>([coordinateKey(start)]);
  let current = start;
  const maximumSteps = geographicTileCoordinateDistance(start, end, scale.worldColumns) + 4;

  for (let step = 0; step < maximumSteps && !sameCoordinate(current, end); step += 1) {
    const currentDistance = geographicTileCoordinateDistance(current, end, scale.worldColumns);
    const candidates = ODD_R_DIRECTIONS
      .map((direction) => neighborCoordinate(current, direction, scale))
      .filter((candidate) => candidate.r >= 0 && candidate.r < scale.worldRows)
      .filter((candidate) => !visited.has(coordinateKey(candidate)) || sameCoordinate(candidate, end))
      .map((candidate) => ({
        candidate,
        distance: geographicTileCoordinateDistance(candidate, end, scale.worldColumns),
      }))
      .filter(({ distance }) => distance < currentDistance)
      .sort((left, right) => (
        left.distance - right.distance
        || left.candidate.r - right.candidate.r
        || left.candidate.q - right.candidate.q
      ));
    const next = candidates[0]?.candidate;
    if (!next) break;
    route.push(next);
    visited.add(coordinateKey(next));
    current = next;
  }

  if (!sameCoordinate(route[route.length - 1], end)) route.push(end);
  return route;
}

function applyBridgeEdges(
  route: TileCoordinate[],
  tiles: Map<string, GeographicTileWindowTile>,
  scale: GeographicAdaptiveHexScale,
  terminus: GeographicRiverTerminus,
): void {
  for (let index = 1; index < route.length; index += 1) {
    const previous = tiles.get(tileId(scale, route[index - 1]));
    const next = tiles.get(tileId(scale, route[index]));
    if (!previous || !next || previous.id === next.id) continue;
    const direction = directionBetween(previous, next, scale);
    if (!direction) continue;
    const navigable = bridgeConnectionIsNavigable(previous, next);

    if (previous.water !== next.water) {
      const land = previous.water ? next : previous;
      const mouthEdge = previous.water ? direction.opposite : direction.edge;
      addRiverEdge(land, mouthEdge, navigable);
      addUnique(land.riverMouthEdges, mouthEdge);
      land.riverTerminus = terminus;
      finalizeBridgeTile(land, scale);
      continue;
    }

    if (!previous.water) {
      addRiverEdge(previous, direction.edge, navigable);
      finalizeBridgeTile(previous, scale);
    }
    if (!next.water) {
      addRiverEdge(next, direction.opposite, navigable);
      finalizeBridgeTile(next, scale);
    }
  }
}

function finalizeBridgeTile(
  tile: GeographicTileWindowTile,
  scale: GeographicAdaptiveHexScale,
): void {
  if (tile.minorRiverEdges.length > 0 && !tile.features.includes('minor-river')) {
    tile.features.push('minor-river');
  }
  if (tile.navigableRiverEdges.length === 0) return;
  if (!tile.features.includes('navigable-river')) tile.features.push('navigable-river');
  tile.morphology = 'navigable-river';
  tile.terrainType = hexTerrainTypeNameFromRules(tile.biome, tile.morphology);
  const physicallyDominant = estimatedRiverWidthMiles(tile.riverStrength) >= scale.nominalHexWidthMiles;
  tile.navigableRiverCenter = physicallyDominant;
  if (!physicallyDominant || tile.ice) return;
  tile.water = true;
  tile.biome = 'marine';
  tile.features = tile.features.filter((feature) => (
    feature === 'wet'
    || feature === 'floodplain'
    || feature === 'navigable-river'
    || feature === 'aquatic'
    || feature === 'ice'
  ));
  tile.featureDetails = tile.featureDetails.filter((detail) => (
    detail === 'aquatic'
    || detail === 'river'
    || detail === 'floodplain'
    || detail === 'ice'
  ));
  if (!tile.features.includes('aquatic')) tile.features.push('aquatic');
  tile.terrainType = hexTerrainTypeNameFromRules(tile.biome, tile.morphology);
}

function riverGeographicPoints(
  river: River,
  project: WorldProject,
  topology: CubedSphereTopology,
): Array<{ latitude: number; longitude: number }> {
  if (river.topologyPath && river.topologyPath.length >= 2) {
    return river.topologyPath
      .filter((cell) => cell >= 0 && cell < topology.cellCount)
      .map((cell) => ({
        latitude: topology.latitudes[cell] * 180 / Math.PI,
        longitude: topology.longitudes[cell] * 180 / Math.PI,
      }));
  }
  const resolution = project.primaryWorld.mapModel.resolution;
  return river.path
    .filter((index) => index >= 0 && index < resolution.width * resolution.height)
    .map((index) => ({
      latitude: 90 - ((Math.floor(index / resolution.width) + 0.5) / resolution.height) * 180,
      longitude: -180 + (((index % resolution.width) + 0.5) / resolution.width) * 360,
    }));
}

function directionBetween(
  tile: TileCoordinate,
  neighbor: TileCoordinate,
  scale: Pick<GeographicAdaptiveHexScale, 'worldColumns' | 'worldRows'>,
): TileDirection | null {
  return ODD_R_DIRECTIONS.find((direction) => (
    sameCoordinate(neighborCoordinate(tile, direction, scale), neighbor)
  )) ?? null;
}

function neighborCoordinate(
  tile: TileCoordinate,
  direction: TileDirection,
  scale: Pick<GeographicAdaptiveHexScale, 'worldColumns' | 'worldRows'>,
): TileCoordinate {
  const odd = tile.r % 2 === 1;
  return {
    q: mod(tile.q + (odd ? direction.dqOdd : direction.dqEven), scale.worldColumns),
    r: tile.r + (odd ? direction.drOdd : direction.drEven),
  };
}

function bridgeConnectionIsNavigable(
  left: GeographicTileWindowTile,
  right: GeographicTileWindowTile,
): boolean {
  const stronger = Math.max(left.riverStrength, right.riverStrength);
  const weaker = Math.min(left.riverStrength, right.riverStrength);
  return stronger >= 0.68 && (left.water || right.water || weaker >= 0.48);
}

function addRiverEdge(
  tile: GeographicTileWindowTile,
  edge: HexTileEdge,
  navigable: boolean,
): void {
  if (navigable) {
    tile.minorRiverEdges = tile.minorRiverEdges.filter((candidate) => candidate !== edge);
    addUnique(tile.navigableRiverEdges, edge);
  } else if (!tile.navigableRiverEdges.includes(edge)) {
    addUnique(tile.minorRiverEdges, edge);
  }
}

function tileId(scale: Pick<GeographicAdaptiveHexScale, 'id'>, coordinate: TileCoordinate): string {
  return `${scale.id}:q${coordinate.q}:r${coordinate.r}`;
}

function oddRToCube(q: number, r: number): { x: number; y: number; z: number } {
  const x = q - (r - (r & 1)) / 2;
  const z = r;
  return { x, y: -x - z, z };
}

function coordinateKey(coordinate: TileCoordinate): string {
  return `${coordinate.q},${coordinate.r}`;
}

function sameCoordinate(left: TileCoordinate | undefined, right: TileCoordinate | undefined): boolean {
  return Boolean(left && right && left.q === right.q && left.r === right.r);
}

function addUnique<T>(values: T[], value: T): void {
  if (!values.includes(value)) values.push(value);
}

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

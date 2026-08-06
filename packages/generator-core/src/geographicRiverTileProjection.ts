import {
  hexTerrainTypeNameFromRules,
  type CubedSphereTopology,
  type HexTileEdge,
  type River,
  type WorldProject,
} from '@world-forge/shared';
import type { GeographicAdaptiveHexScale } from '@world-forge/shared/geographicHierarchy';
import type { GeographicTileWindowTile } from '@world-forge/shared/geographicTileWindow';
import { worldHexCoordinateForLatLon } from './geographicAdaptiveScale';

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

export function assignCanonicalRiverEdges(
  tiles: Map<string, GeographicTileWindowTile>,
  scale: GeographicAdaptiveHexScale,
  project: WorldProject,
  topology: CubedSphereTopology,
): void {
  for (const river of project.primaryWorld.rivers) {
    const points = riverGeographicPoints(river, project, topology);
    if (points.length < 2) continue;
    const route = geographicPathTileCoordinates(points, scale);
    for (let index = 1; index < route.length; index += 1) {
      const previous = tiles.get(tileId(scale, route[index - 1].q, route[index - 1].r));
      const next = tiles.get(tileId(scale, route[index].q, route[index].r));
      if (!previous || !next || previous.id === next.id) continue;
      const direction = directionBetween(previous, next, scale);
      if (!direction) continue;
      const navigable = riverConnectionIsNavigable(previous, next);
      if (!previous.water) addRiverEdge(previous, direction.edge, navigable);
      if (!next.water) addRiverEdge(next, direction.opposite, navigable);
    }
  }
}

export function geographicPathTileCoordinates(
  points: Array<{ latitude: number; longitude: number }>,
  scale: Pick<GeographicAdaptiveHexScale, 'worldColumns' | 'worldRows'>,
): Array<{ q: number; r: number }> {
  const route: Array<{ q: number; r: number }> = [];
  const latitudeStep = 180 / Math.max(1, scale.worldRows);
  const longitudeStep = 360 / Math.max(1, scale.worldColumns);
  for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
    const start = points[pointIndex - 1];
    const end = points[pointIndex];
    const longitudeDelta = shortestLongitudeDelta(start.longitude, end.longitude);
    const sampleCount = Math.max(1, Math.ceil(Math.max(
      Math.abs(end.latitude - start.latitude) / Math.max(0.000001, latitudeStep),
      Math.abs(longitudeDelta) / Math.max(0.000001, longitudeStep),
    ) * 4));
    for (let sample = pointIndex === 1 ? 0 : 1; sample <= sampleCount; sample += 1) {
      const fraction = sample / sampleCount;
      const coordinate = worldHexCoordinateForLatLon(
        start.latitude + (end.latitude - start.latitude) * fraction,
        normalizeLongitude(start.longitude + longitudeDelta * fraction),
        scale.worldColumns,
        scale.worldRows,
      );
      const previous = route[route.length - 1];
      if (!previous || previous.q !== coordinate.q || previous.r !== coordinate.r) route.push(coordinate);
    }
  }
  return route;
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
    .map((index) => {
      const x = index % resolution.width;
      const y = Math.floor(index / resolution.width);
      return {
        latitude: 90 - ((y + 0.5) / resolution.height) * 180,
        longitude: -180 + ((x + 0.5) / resolution.width) * 360,
      };
    });
}

function directionBetween(
  tile: GeographicTileWindowTile,
  neighbor: GeographicTileWindowTile,
  scale: GeographicAdaptiveHexScale,
): TileDirection | null {
  for (const direction of ODD_R_DIRECTIONS) {
    const candidate = neighborCoordinate(tile, direction, scale);
    if (candidate.q === neighbor.q && candidate.r === neighbor.r) return direction;
  }
  return null;
}

function riverConnectionIsNavigable(
  left: GeographicTileWindowTile,
  right: GeographicTileWindowTile,
): boolean {
  const stronger = Math.max(left.riverStrength, right.riverStrength);
  const weaker = Math.min(left.riverStrength, right.riverStrength);
  return stronger >= 0.42 && (left.water || right.water || weaker >= 0.3);
}

function addRiverEdge(tile: GeographicTileWindowTile, edge: HexTileEdge, navigable: boolean): void {
  if (navigable) {
    tile.minorRiverEdges = tile.minorRiverEdges.filter((candidate) => candidate !== edge);
    addUnique(tile.navigableRiverEdges, edge);
    tile.navigableRiverCenter = true;
    tile.morphology = 'navigable-river';
    tile.terrainType = hexTerrainTypeNameFromRules(tile.biome, tile.morphology);
  } else if (!tile.navigableRiverEdges.includes(edge)) {
    addUnique(tile.minorRiverEdges, edge);
  }
}

function neighborCoordinate(
  tile: Pick<GeographicTileWindowTile, 'q' | 'r'>,
  direction: TileDirection,
  scale: Pick<GeographicAdaptiveHexScale, 'worldColumns'>,
): { q: number; r: number } {
  const odd = tile.r % 2 === 1;
  return {
    q: mod(tile.q + (odd ? direction.dqOdd : direction.dqEven), scale.worldColumns),
    r: tile.r + (odd ? direction.drOdd : direction.drEven),
  };
}

function shortestLongitudeDelta(start: number, end: number): number {
  let delta = normalizeLongitude(end) - normalizeLongitude(start);
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

function normalizeLongitude(longitude: number): number {
  let value = longitude;
  while (value < -180) value += 360;
  while (value >= 180) value -= 360;
  return value;
}

function addUnique<T>(values: T[], value: T): void {
  if (!values.includes(value)) values.push(value);
}

function tileId(scale: GeographicAdaptiveHexScale, q: number, r: number): string {
  return `${scale.id}:q${q}:r${r}`;
}

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

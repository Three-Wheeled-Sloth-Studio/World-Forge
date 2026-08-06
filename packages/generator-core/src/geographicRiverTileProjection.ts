import {
  cubedSphereCellForLonLat,
  hexTerrainTypeNameFromRules,
  type CubedSphereTopology,
  type HexTileEdge,
  type River,
  type WorldProject,
} from '@world-forge/shared';
import type { GeographicAdaptiveHexScale } from '@world-forge/shared/geographicHierarchy';
import type { GeographicTileWindowTile } from '@world-forge/shared/geographicTileWindow';
import { worldHexCenter, worldHexCoordinateForLatLon } from './geographicAdaptiveScale';

const DEGREES_TO_RADIANS = Math.PI / 180;

type TileCoordinate = { q: number; r: number };
type TerrainSample = { elevation: number; water: boolean; wetness: number; riverStrength: number };
type RouteContext = {
  project: WorldProject;
  topology: CubedSphereTopology;
  scale: GeographicAdaptiveHexScale;
  refinementRatio: number;
  sampleCache: Map<string, TerrainSample>;
};
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
  const context: RouteContext = {
    project,
    topology,
    scale,
    refinementRatio: sourceResolutionRatio(project, topology, scale),
    sampleCache: new Map(),
  };
  const segmentProximity = expandedTileWindowCoordinates(tiles, scale, 7);
  const majorChannel = new Set<string>();

  for (const river of project.primaryWorld.rivers) {
    const points = riverGeographicPoints(river, project, topology);
    if (points.length < 2) continue;
    const visibleRoute: TileCoordinate[] = [];

    for (let segmentIndex = 1; segmentIndex < points.length; segmentIndex += 1) {
      const baseline = geographicPathTileCoordinates([points[segmentIndex - 1], points[segmentIndex]], scale);
      if (baseline.length < 2 || !baseline.some((entry) => segmentProximity.has(coordinateKey(entry)))) continue;
      const route = context.refinementRatio > 1.35 && baseline.length > 2
        ? refineRouteThroughTerrain(baseline, context, `${river.id}:segment:${segmentIndex}`)
        : baseline;
      appendRoute(visibleRoute, route);
    }

    if (visibleRoute.length < 2) continue;
    applyRouteEdges(visibleRoute, tiles, scale, true);
    for (const coordinate of visibleRoute) majorChannel.add(coordinateKey(coordinate));
    assignDeterministicTributaries(river, visibleRoute, majorChannel, tiles, context);
  }

  finalizeRiverTiles(tiles, scale);
}

export function geographicPathTileCoordinates(
  points: Array<{ latitude: number; longitude: number }>,
  scale: Pick<GeographicAdaptiveHexScale, 'worldColumns' | 'worldRows'>,
): TileCoordinate[] {
  const route: TileCoordinate[] = [];
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

export function estimatedRiverWidthMiles(riverStrength: number): number {
  const normalized = clamp(riverStrength, 0, 1);
  return 0.02 + Math.pow(normalized, 3.1) * 2.8;
}

function refineRouteThroughTerrain(
  baseline: TileCoordinate[],
  context: RouteContext,
  routeKey: string,
): TileCoordinate[] {
  const goal = baseline[baseline.length - 1];
  const route: TileCoordinate[] = [baseline[0]];
  const visited = new Set<string>([coordinateKey(baseline[0])]);
  const corridorRadius = clampInteger(Math.ceil(Math.log2(context.refinementRatio + 1)), 1, 4);
  const maximumSteps = baseline.length * 3 + 12;

  while (route.length < maximumSteps) {
    const current = route[route.length - 1];
    if (sameCoordinate(current, goal)) return route;
    const currentSample = terrainSample(current, context);
    const candidates = ODD_R_DIRECTIONS
      .map((direction) => neighborCoordinate(current, direction, context.scale))
      .filter((candidate) => candidate.r >= 0 && candidate.r < context.scale.worldRows)
      .map((candidate) => ({
        candidate,
        routeDistance: distanceToRoute(candidate, baseline, context.scale.worldColumns),
      }))
      .filter(({ routeDistance }) => routeDistance <= corridorRadius)
      .map(({ candidate, routeDistance }) => {
        const sample = terrainSample(candidate, context);
        const uphillPenalty = Math.max(0, sample.elevation - currentSample.elevation) * 22;
        const visitedPenalty = visited.has(coordinateKey(candidate)) ? 7 : 0;
        const goalDistance = hexDistance(candidate, goal, context.scale.worldColumns);
        const inheritedBonus = sample.riverStrength * 0.2 + sample.wetness * 0.13 + (sample.water ? 0.34 : 0);
        const jitter = hashUnit(`${context.project.seed}:${context.scale.id}:${routeKey}:${candidate.q}:${candidate.r}`) * 0.38;
        return {
          candidate,
          score: goalDistance * 1.3 + routeDistance * 0.42 + uphillPenalty + visitedPenalty + jitter - inheritedBonus,
        };
      })
      .sort((left, right) => left.score - right.score || coordinateKey(left.candidate).localeCompare(coordinateKey(right.candidate)));
    const next = candidates[0]?.candidate;
    if (!next) break;
    route.push(next);
    visited.add(coordinateKey(next));
  }

  return appendBaselineTail(route, baseline, context.scale);
}

function assignDeterministicTributaries(
  river: River,
  route: TileCoordinate[],
  majorChannel: Set<string>,
  tiles: Map<string, GeographicTileWindowTile>,
  context: RouteContext,
): void {
  if (context.refinementRatio < 1.8 || route.length < 6) return;
  const spacing = clampInteger(Math.round(11 - Math.log2(context.refinementRatio + 1)), 5, 10);
  const chance = clamp(0.1 + Math.log2(context.refinementRatio + 1) * 0.07, 0.12, 0.42);
  const maximumBranches = clampInteger(Math.ceil(route.length / 18), 1, 5);
  let branches = 0;

  for (let index = spacing; index < route.length - 2 && branches < maximumBranches; index += spacing) {
    const anchor = route[index];
    const anchorSample = terrainSample(anchor, context);
    const branchKey = `${river.id}:tributary:${index}`;
    const strengthFactor = clamp(anchorSample.riverStrength / 0.5, 0.35, 1);
    if (hashUnit(`${context.project.seed}:${context.scale.id}:${branchKey}`) > chance * strengthFactor) continue;
    const source = selectTributarySource(anchor, majorChannel, context, branchKey);
    if (!source) continue;
    const sourcePoint = worldHexCenter(source.q, source.r, context.scale.worldColumns, context.scale.worldRows);
    const anchorPoint = worldHexCenter(anchor.q, anchor.r, context.scale.worldColumns, context.scale.worldRows);
    const baseline = geographicPathTileCoordinates([sourcePoint, anchorPoint], context.scale);
    let branch = refineRouteThroughTerrain(baseline, context, branchKey);
    const mergeIndex = branch.findIndex((entry, routeIndex) => routeIndex > 0 && majorChannel.has(coordinateKey(entry)));
    if (mergeIndex >= 1) branch = branch.slice(0, mergeIndex + 1);
    if (branch.length < 2 || !routeTouchesTileWindow(branch, tiles, context.scale)) continue;
    applyRouteEdges(branch, tiles, context.scale, false);
    branches += 1;
  }
}

function selectTributarySource(
  anchor: TileCoordinate,
  majorChannel: Set<string>,
  context: RouteContext,
  branchKey: string,
): TileCoordinate | null {
  const radius = clampInteger(Math.round(2 + Math.log2(context.refinementRatio + 1)), 2, 6);
  const anchorSample = terrainSample(anchor, context);
  const candidates = coordinatesWithinRadius(anchor, radius, context.scale)
    .filter((entry) => hexDistance(entry, anchor, context.scale.worldColumns) >= 2)
    .filter((entry) => !majorChannel.has(coordinateKey(entry)))
    .map((entry) => ({ entry, sample: terrainSample(entry, context) }))
    .filter(({ sample }) => !sample.water && sample.elevation >= anchorSample.elevation - 0.005)
    .map(({ entry, sample }) => ({
      entry,
      score: (sample.elevation - anchorSample.elevation) * 6
        + sample.wetness * 0.55
        + hexDistance(entry, anchor, context.scale.worldColumns) * 0.04
        + hashUnit(`${context.project.seed}:${context.scale.id}:${branchKey}:${entry.q}:${entry.r}`) * 0.2,
    }))
    .sort((left, right) => right.score - left.score || coordinateKey(left.entry).localeCompare(coordinateKey(right.entry)));
  return candidates[0]?.entry ?? null;
}

function applyRouteEdges(
  route: TileCoordinate[],
  tiles: Map<string, GeographicTileWindowTile>,
  scale: GeographicAdaptiveHexScale,
  allowNavigable: boolean,
): void {
  for (let index = 1; index < route.length; index += 1) {
    const previous = tiles.get(tileId(scale, route[index - 1].q, route[index - 1].r));
    const next = tiles.get(tileId(scale, route[index].q, route[index].r));
    if (!previous || !next || previous.id === next.id) continue;
    const direction = directionBetween(previous, next, scale);
    if (!direction) continue;
    const navigable = allowNavigable && riverConnectionIsNavigable(previous, next);
    if (!previous.water) addRiverEdge(previous, direction.edge, navigable);
    if (!next.water) addRiverEdge(next, direction.opposite, navigable);
  }
}

function finalizeRiverTiles(
  tiles: Map<string, GeographicTileWindowTile>,
  scale: GeographicAdaptiveHexScale,
): void {
  for (const tile of tiles.values()) {
    if (tile.minorRiverEdges.length > 0 && !tile.features.includes('minor-river')) tile.features.push('minor-river');
    if (tile.navigableRiverEdges.length === 0) {
      tile.navigableRiverCenter = false;
      continue;
    }
    if (!tile.features.includes('navigable-river')) tile.features.push('navigable-river');
    tile.morphology = 'navigable-river';
    tile.terrainType = hexTerrainTypeNameFromRules(tile.biome, tile.morphology);
    const dominant = estimatedRiverWidthMiles(tile.riverStrength) >= scale.nominalHexWidthMiles * 0.72;
    tile.navigableRiverCenter = dominant;
    if (!dominant || tile.ice) continue;
    tile.water = true;
    tile.biome = 'marine';
    tile.features = tile.features.filter((feature) => (
      feature === 'wet' || feature === 'floodplain' || feature === 'navigable-river' || feature === 'aquatic' || feature === 'ice'
    ));
    tile.featureDetails = tile.featureDetails.filter((detail) => (
      detail === 'aquatic' || detail === 'river' || detail === 'floodplain' || detail === 'ice'
    ));
    if (!tile.features.includes('aquatic')) tile.features.push('aquatic');
    tile.terrainType = hexTerrainTypeNameFromRules(tile.biome, tile.morphology);
  }
}

function terrainSample(coordinate: TileCoordinate, context: RouteContext): TerrainSample {
  const key = coordinateKey(coordinate);
  const cached = context.sampleCache.get(key);
  if (cached) return cached;
  const center = worldHexCenter(coordinate.q, coordinate.r, context.scale.worldColumns, context.scale.worldRows);
  const cell = cubedSphereCellForLonLat(
    context.topology,
    center.longitude * DEGREES_TO_RADIANS,
    center.latitude * DEGREES_TO_RADIANS,
  );
  const layers = context.project.primaryWorld.topologyLayers;
  const amplitude = clamp(0.004 + Math.log2(context.refinementRatio + 1) * 0.004, 0.004, 0.024);
  const microRelief = (hashUnit(
    `${context.project.seed}:${context.scale.id}:micro-relief:${coordinate.q}:${coordinate.r}`,
  ) * 2 - 1) * amplitude;
  const sample = {
    elevation: layers.elevation[cell] + microRelief,
    water: layers.water[cell] === 1 || layers.lakes[cell] === 1,
    wetness: layers.wetness[cell],
    riverStrength: layers.river[cell],
  };
  context.sampleCache.set(key, sample);
  return sample;
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

function sourceResolutionRatio(
  project: WorldProject,
  topology: CubedSphereTopology,
  scale: GeographicAdaptiveHexScale,
): number {
  const circumference = project.primaryWorld.hexOverlay?.planetCircumferenceMiles ?? 24881;
  return (circumference / Math.max(4, topology.resolution * 4)) / Math.max(0.1, scale.nominalHexWidthMiles);
}

function appendBaselineTail(
  route: TileCoordinate[],
  baseline: TileCoordinate[],
  scale: GeographicAdaptiveHexScale,
): TileCoordinate[] {
  const current = route[route.length - 1];
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  baseline.forEach((entry, index) => {
    const distance = hexDistance(current, entry, scale.worldColumns);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });
  const nearest = baseline[nearestIndex];
  const currentPoint = worldHexCenter(current.q, current.r, scale.worldColumns, scale.worldRows);
  const nearestPoint = worldHexCenter(nearest.q, nearest.r, scale.worldColumns, scale.worldRows);
  appendRoute(route, geographicPathTileCoordinates([currentPoint, nearestPoint], scale));
  appendRoute(route, baseline.slice(nearestIndex));
  return route;
}

function expandedTileWindowCoordinates(
  tiles: Map<string, GeographicTileWindowTile>,
  scale: GeographicAdaptiveHexScale,
  radius: number,
): Set<string> {
  const expanded = new Set<string>();
  for (const tile of tiles.values()) {
    for (const coordinate of coordinatesWithinRadius(tile, radius, scale)) expanded.add(coordinateKey(coordinate));
  }
  return expanded;
}

function routeTouchesTileWindow(
  route: TileCoordinate[],
  tiles: Map<string, GeographicTileWindowTile>,
  scale: GeographicAdaptiveHexScale,
): boolean {
  return route.some((coordinate) => coordinatesWithinRadius(coordinate, 1, scale)
    .some((nearby) => tiles.has(tileId(scale, nearby.q, nearby.r))));
}

function coordinatesWithinRadius(
  center: TileCoordinate,
  radius: number,
  scale: Pick<GeographicAdaptiveHexScale, 'worldColumns' | 'worldRows'>,
): TileCoordinate[] {
  const result = new Map<string, TileCoordinate>([[coordinateKey(center), center]]);
  let frontier = [center];
  for (let step = 0; step < radius; step += 1) {
    const nextFrontier: TileCoordinate[] = [];
    for (const coordinate of frontier) {
      for (const direction of ODD_R_DIRECTIONS) {
        const neighbor = neighborCoordinate(coordinate, direction, scale);
        if (neighbor.r < 0 || neighbor.r >= scale.worldRows || result.has(coordinateKey(neighbor))) continue;
        result.set(coordinateKey(neighbor), neighbor);
        nextFrontier.push(neighbor);
      }
    }
    frontier = nextFrontier;
  }
  return [...result.values()];
}

function distanceToRoute(coordinate: TileCoordinate, route: TileCoordinate[], worldColumns: number): number {
  return route.reduce(
    (distance, entry) => Math.min(distance, hexDistance(coordinate, entry, worldColumns)),
    Number.POSITIVE_INFINITY,
  );
}

function appendRoute(target: TileCoordinate[], source: TileCoordinate[]): void {
  for (const coordinate of source) {
    if (!sameCoordinate(target[target.length - 1], coordinate)) target.push(coordinate);
  }
}

function directionBetween(
  tile: GeographicTileWindowTile,
  neighbor: GeographicTileWindowTile,
  scale: GeographicAdaptiveHexScale,
): TileDirection | null {
  return ODD_R_DIRECTIONS.find((direction) => {
    const candidate = neighborCoordinate(tile, direction, scale);
    return candidate.q === neighbor.q && candidate.r === neighbor.r;
  }) ?? null;
}

function riverConnectionIsNavigable(left: GeographicTileWindowTile, right: GeographicTileWindowTile): boolean {
  const stronger = Math.max(left.riverStrength, right.riverStrength);
  const weaker = Math.min(left.riverStrength, right.riverStrength);
  return stronger >= 0.42 && (left.water || right.water || weaker >= 0.3);
}

function addRiverEdge(tile: GeographicTileWindowTile, edge: HexTileEdge, navigable: boolean): void {
  if (navigable) {
    tile.minorRiverEdges = tile.minorRiverEdges.filter((candidate) => candidate !== edge);
    addUnique(tile.navigableRiverEdges, edge);
  } else if (!tile.navigableRiverEdges.includes(edge)) {
    addUnique(tile.minorRiverEdges, edge);
  }
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

function hexDistance(left: TileCoordinate, right: TileCoordinate, worldColumns: number): number {
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

function oddRToCube(q: number, r: number): { x: number; y: number; z: number } {
  const x = q - (r - (r & 1)) / 2;
  const z = r;
  return { x, y: -x - z, z };
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

function sameCoordinate(left: TileCoordinate | undefined, right: TileCoordinate): boolean {
  return Boolean(left && left.q === right.q && left.r === right.r);
}

function coordinateKey(coordinate: TileCoordinate): string {
  return `${coordinate.q},${coordinate.r}`;
}

function addUnique<T>(values: T[], value: T): void {
  if (!values.includes(value)) values.push(value);
}

function tileId(scale: GeographicAdaptiveHexScale, q: number, r: number): string {
  return `${scale.id}:q${q}:r${r}`;
}

function hashUnit(value: string): number {
  let hash = 0x811c9dc5;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 0x01000193) >>> 0;
  return hash / 0xffffffff;
}

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, Math.round(value)));
}

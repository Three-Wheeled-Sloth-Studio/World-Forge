import {
  buildCubedSphereTopology,
  buildSurfaceStructureClassification,
  civ7StyleHexTileProfile,
  classifyHexBiomeFromRules,
  classifyHexFeatureDetailsFromRules,
  classifyHexFeaturesFromRules,
  classifyHexMorphologyFromRules,
  codeToBiome,
  cubedSphereCellForLonLat,
  defaultHexTileClassificationRules,
  hexTerrainTypeNameFromRules,
  surfaceMorphologyFromCode,
  type CubedSphereTopology,
  type HexTileBiome,
  type HexTileEdge,
  type HexTileFeature,
  type HexTileFeatureDetail,
  type HexTileMorphology,
  type WorldProject,
} from '@world-forge/shared';
import type {
  GeographicAdaptiveHexScale,
  GeographicHierarchyMapExtent,
} from '@world-forge/shared/geographicHierarchy';
import {
  GEOGRAPHIC_TILE_CLASSIFIER_VERSION,
  GEOGRAPHIC_TILE_WINDOW_VERSION,
  type GeographicTileWindow,
  type GeographicTileWindowTile,
} from '@world-forge/shared/geographicTileWindow';
import { worldHexCenter } from './geographicAdaptiveScale';
import { assignCanonicalRiverEdges } from './geographicRiverTileProjection';

const DEGREES_TO_RADIANS = Math.PI / 180;
const UNASSIGNED_CHILD = 0xffff;

export type GenerateGeographicTileWindowInput = {
  project: WorldProject;
  scale: GeographicAdaptiveHexScale;
  extent: GeographicHierarchyMapExtent;
  parentMembership: Uint8Array;
  childMembership?: Uint16Array | null;
  topology?: CubedSphereTopology;
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

export function generateGeographicTileWindow(input: GenerateGeographicTileWindowInput): GeographicTileWindow {
  const { project, scale, extent, parentMembership, childMembership } = input;
  const topology = input.topology ?? buildCubedSphereTopology(project.primaryWorld.topology.resolution);
  validateMembership(topology, parentMembership, childMembership);

  const world = project.primaryWorld;
  const surfaceStructure = buildSurfaceStructureClassification({
    seaLevel: world.seaLevel,
    topology,
    elevation: world.topologyLayers.elevation,
    water: world.topologyLayers.water,
    temperature: world.topologyLayers.temperature,
    ice: world.topologyLayers.ice,
  });

  const haloTiles = new Map<string, GeographicTileWindowTile>();
  for (let r = Math.max(0, extent.rMin - 1); r <= Math.min(scale.worldRows - 1, extent.rMax + 1); r += 1) {
    for (let offset = -1; offset <= extent.columns; offset += 1) {
      const q = mod(extent.qMin + offset, scale.worldColumns);
      const id = tileId(scale, q, r);
      if (!haloTiles.has(id)) {
        haloTiles.set(id, classifyTile(project, topology, surfaceStructure, scale, q, r, parentMembership, childMembership));
      }
    }
  }

  assignCanonicalRiverEdges(haloTiles, scale, project, topology);
  assignRidgeEdges(haloTiles, scale);

  const tiles: GeographicTileWindowTile[] = [];
  for (let r = extent.rMin; r <= extent.rMax; r += 1) {
    for (let offset = 0; offset < extent.columns; offset += 1) {
      const q = mod(extent.qMin + offset, scale.worldColumns);
      const tile = haloTiles.get(tileId(scale, q, r));
      if (tile) tiles.push(tile);
    }
  }

  return {
    modelVersion: GEOGRAPHIC_TILE_WINDOW_VERSION,
    classifierVersion: GEOGRAPHIC_TILE_CLASSIFIER_VERSION,
    sourceProjectId: project.projectId,
    sourceWorldId: world.id,
    worldSeed: project.seed,
    sourceTopologyKind: topology.kind,
    sourceTopologyResolution: topology.resolution,
    scale,
    extent,
    dimensions: {
      columns: extent.columns,
      rows: extent.rows,
      orientation: 'pointy-top-odd-r',
      wrapsLongitude: extent.wrapsLongitude,
    },
    tiles,
    signature: tileWindowSignature(project, scale, extent, tiles),
  };
}

function classifyTile(
  project: WorldProject,
  topology: CubedSphereTopology,
  surfaceStructure: ReturnType<typeof buildSurfaceStructureClassification>,
  scale: GeographicAdaptiveHexScale,
  q: number,
  r: number,
  parentMembership: Uint8Array,
  childMembership?: Uint16Array | null,
): GeographicTileWindowTile {
  const center = worldHexCenter(q, r, scale.worldColumns, scale.worldRows);
  const cell = cubedSphereCellForLonLat(
    topology,
    center.longitude * DEGREES_TO_RADIANS,
    center.latitude * DEGREES_TO_RADIANS,
  );
  const world = project.primaryWorld;
  const layers = world.topologyLayers;
  const elevation = layers.elevation[cell];
  const temperatureC = layers.temperature[cell];
  const wetness = layers.wetness[cell];
  const sourceWater = layers.water[cell] === 1;
  const lake = layers.lakes[cell] === 1;
  const water = sourceWater || lake;
  const riverStrength = layers.river[cell];
  const volcanism = layers.volcanism?.[cell] ?? 0;
  const sourceIce = layers.ice[cell] === 1;
  const permanentLandIce = surfaceStructure.permanentIceByCell[cell] === 1;
  const ice = water ? sourceIce : permanentLandIce;
  const elevationDrivenSnowline = surfaceStructure.elevationDrivenSnowlineByCell[cell] === 1;
  const rules = defaultHexTileClassificationRules;
  const elevationAboveSeaLevel = elevation - world.seaLevel;
  const biome = classifyHexBiomeFromRules({
    sourceBiome: codeToBiome(layers.biomes[cell]),
    water,
    lake,
    ice,
    temperatureC,
    wetness,
  }, rules.biomeRules);
  const morphology = water
    ? classifyHexMorphologyFromRules({
        biome,
        water,
        lake,
        depthBelowSeaLevel: Math.max(0, world.seaLevel - elevation),
        elevationAboveSeaLevel,
        slope: surfaceStructure.slopeByCell[cell],
      }, rules.morphologyRules)
    : morphologyFromSurface(surfaceMorphologyFromCode(surfaceStructure.morphologyByCell[cell]));
  const featureInput = {
    biome,
    morphology,
    water,
    river: riverStrength,
    lake,
    ice,
    wetness,
    temperatureC,
    elevationAboveSeaLevel,
    volcanism,
  };
  const canonicalFeatures: HexTileFeature[] = classifyHexFeaturesFromRules(featureInput, rules.featureRules)
    .filter((feature) => feature !== 'snow' && feature !== 'ice');
  if (water && ice) canonicalFeatures.push('ice');
  if (!water && (ice || elevationDrivenSnowline)) canonicalFeatures.push('snow');
  const features = [...new Set(canonicalFeatures)]
    .filter((feature) => civ7StyleHexTileProfile.features.includes(feature));
  const canonicalDetails: HexTileFeatureDetail[] = classifyHexFeatureDetailsFromRules(featureInput, rules.featureDetailRules)
    .filter((detail) => detail !== 'snow' && detail !== 'ice');
  if (ice) canonicalDetails.push('ice');
  if (!water && (ice || elevationDrivenSnowline)) canonicalDetails.push('snow');
  const normalizedBiome = normalizeAllowed(biome, civ7StyleHexTileProfile.biomes);
  const normalizedMorphology = normalizeAllowed(morphology, civ7StyleHexTileProfile.morphologies);
  const childIndex = childMembership?.[cell] ?? UNASSIGNED_CHILD;

  return {
    id: tileId(scale, q, r),
    q,
    r,
    longitude: round(center.longitude),
    latitude: round(center.latitude),
    topologyCell: cell,
    membershipRole: parentMembership[cell] === 1 ? 'parent' : 'context',
    childIndex: childIndex === UNASSIGNED_CHILD ? null : childIndex,
    plateId: layers.plates[cell],
    biome: normalizedBiome,
    morphology: normalizedMorphology,
    terrainType: hexTerrainTypeNameFromRules(normalizedBiome, normalizedMorphology, rules.terrainNameRules),
    features,
    featureDetails: [...new Set(canonicalDetails)],
    minorRiverEdges: [],
    navigableRiverEdges: [],
    riverMouthEdges: [],
    ridgeEdges: [],
    navigableRiverCenter: false,
    riverSource: false,
    riverTerminus: null,
    riverStrength: round(riverStrength),
    elevation: round(elevation),
    slope: round(surfaceStructure.slopeByCell[cell]),
    temperatureC: round(temperatureC),
    wetness: round(wetness),
    volcanism: round(volcanism),
    water,
    ice,
  };
}

function assignRidgeEdges(tiles: Map<string, GeographicTileWindowTile>, scale: GeographicAdaptiveHexScale): void {
  const forwardEdges = new Set<HexTileEdge>(['e', 'se', 'sw']);
  for (const tile of tiles.values()) {
    if (tile.water) continue;
    for (const direction of ODD_R_DIRECTIONS) {
      if (!forwardEdges.has(direction.edge)) continue;
      const neighbor = neighborTile(tile, direction, tiles, scale);
      if (!neighbor || neighbor.water) continue;
      const mountainous = tile.morphology === 'mountainous' || neighbor.morphology === 'mountainous';
      const steep = Math.max(tile.slope, neighbor.slope) >= 0.16;
      const plateBoundary = tile.plateId !== neighbor.plateId;
      const reliefBreak = Math.abs(tile.elevation - neighbor.elevation) >= 0.09;
      if (!(mountainous || steep) || !(plateBoundary || reliefBreak)) continue;
      addUnique(tile.ridgeEdges, direction.edge);
      addUnique(neighbor.ridgeEdges, direction.opposite);
    }
  }
}

function neighborTile(
  tile: GeographicTileWindowTile,
  direction: TileDirection,
  tiles: Map<string, GeographicTileWindowTile>,
  scale: GeographicAdaptiveHexScale,
): GeographicTileWindowTile | undefined {
  const odd = tile.r % 2 === 1;
  const q = mod(tile.q + (odd ? direction.dqOdd : direction.dqEven), scale.worldColumns);
  const r = tile.r + (odd ? direction.drOdd : direction.drEven);
  if (r < 0 || r >= scale.worldRows) return undefined;
  return tiles.get(tileId(scale, q, r));
}

function addUnique(values: HexTileEdge[], value: HexTileEdge): void {
  if (!values.includes(value)) values.push(value);
}

function morphologyFromSurface(morphology: ReturnType<typeof surfaceMorphologyFromCode>): HexTileMorphology {
  if (morphology === 'mountainous') return 'mountainous';
  if (morphology === 'flat') return 'flat';
  return 'rough';
}

function normalizeAllowed<T extends string>(value: T, allowed: readonly T[]): T {
  return allowed.includes(value) ? value : allowed[0];
}

function validateMembership(
  topology: CubedSphereTopology,
  parentMembership: Uint8Array,
  childMembership?: Uint16Array | null,
): void {
  if (parentMembership.length !== topology.cellCount) {
    throw new Error('Geographic tile-window parent membership must match the source topology.');
  }
  if (childMembership && childMembership.length !== topology.cellCount) {
    throw new Error('Geographic tile-window child membership must match the source topology.');
  }
}

function tileId(scale: GeographicAdaptiveHexScale, q: number, r: number): string {
  return `${scale.id}:q${q}:r${r}`;
}

function tileWindowSignature(
  project: WorldProject,
  scale: GeographicAdaptiveHexScale,
  extent: GeographicHierarchyMapExtent,
  tiles: GeographicTileWindowTile[],
): string {
  let hash = 0x811c9dc5;
  const add = (value: string | number) => {
    for (const character of String(value)) {
      hash = Math.imul(hash ^ character.charCodeAt(0), 0x01000193) >>> 0;
    }
  };
  add(GEOGRAPHIC_TILE_WINDOW_VERSION);
  add(GEOGRAPHIC_TILE_CLASSIFIER_VERSION);
  add(project.projectId);
  add(project.seed);
  add(scale.id);
  add(`${extent.qMin}:${extent.qMax}:${extent.rMin}:${extent.rMax}`);
  for (const tile of tiles) {
    add(tile.id);
    add(tile.topologyCell);
    add(tile.membershipRole);
    add(tile.childIndex ?? -1);
    add(tile.biome);
    add(tile.morphology);
    add(tile.elevation);
    add(tile.riverStrength);
    add(tile.ridgeEdges.join(','));
    add(tile.minorRiverEdges.join(','));
    add(tile.navigableRiverEdges.join(','));
    add(tile.riverMouthEdges.join(','));
    add(tile.riverSource ? 1 : 0);
    add(tile.riverTerminus ?? 'none');
  }
  return `wftw-v1-${hash.toString(16).padStart(8, '0')}`;
}

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}

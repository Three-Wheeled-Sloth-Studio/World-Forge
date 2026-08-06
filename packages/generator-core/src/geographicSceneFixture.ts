import {
  GEOGRAPHIC_TILE_CLASSIFIER_VERSION,
  GEOGRAPHIC_TILE_WINDOW_VERSION,
  type GeographicTileWindow,
  type GeographicTileWindowTile,
} from '@world-forge/shared/geographicTileWindow';

const COLUMNS = 9;
const ROWS = 7;

export function createRepresentativeGeographicTileWindowFixture(): GeographicTileWindow {
  const tiles: GeographicTileWindowTile[] = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      tiles.push(createFixtureTile(column, row));
    }
  }

  return {
    modelVersion: GEOGRAPHIC_TILE_WINDOW_VERSION,
    classifierVersion: GEOGRAPHIC_TILE_CLASSIFIER_VERSION,
    sourceProjectId: 'geographic-scene-fixture-project',
    sourceWorldId: 'geographic-scene-fixture-world',
    worldSeed: 'geographic-scene-fixture-seed',
    sourceTopologyKind: 'cubed-sphere',
    sourceTopologyResolution: 32,
    scale: {
      modelVersion: 'adaptive-world-hex-scale-v1',
      id: 'fixture-60mi',
      nominalHexWidthMiles: 60,
      verticalSpacingMiles: 51.9615,
      worldColumns: COLUMNS,
      worldRows: ROWS,
      targetViewportColumns: COLUMNS,
      targetViewportRows: ROWS,
      minimumViewportColumns: COLUMNS,
      minimumViewportRows: ROWS,
      maximumViewportColumns: COLUMNS,
      maximumViewportRows: ROWS,
      exactParentHexCount: COLUMNS * ROWS,
      contextualHexCount: 0,
      origin: 'world-equirectangular-pointy-odd-r',
      idFormat: 'fixture:q{q}:r{r}',
    },
    extent: {
      minLatitude: 30,
      maxLatitude: 48,
      minLongitude: -18,
      maxLongitude: 14,
      wrapsLongitude: false,
      qMin: 0,
      qMax: COLUMNS - 1,
      rMin: 0,
      rMax: ROWS - 1,
      columns: COLUMNS,
      rows: ROWS,
      contextPaddingHexes: 0,
      selectedMembershipFitsMaximum: true,
    },
    dimensions: {
      columns: COLUMNS,
      rows: ROWS,
      orientation: 'pointy-top-odd-r',
      wrapsLongitude: false,
    },
    tiles,
    signature: 'wftw-fixture-v1-continental-relief',
  };
}

function createFixtureTile(column: number, row: number): GeographicTileWindowTile {
  const normalizedX = (column - 4) / 4;
  const normalizedY = (row - 3) / 3;
  const continentalDistance = normalizedX * normalizedX + normalizedY * normalizedY;
  const inlet = column <= 2 && row >= 4;
  const water = continentalDistance > 0.96 || inlet;
  const ridge = Math.exp(-Math.pow((column - 4.5) / 1.15, 2));
  const northSouthShoulder = 0.72 + 0.28 * Math.cos(normalizedY * Math.PI);
  const coastalNoise = ((column * 17 + row * 31) % 9) / 100;
  const elevation = water
    ? -0.22 - Math.max(0, continentalDistance - 0.96) * 0.2
    : 0.08 + ridge * northSouthShoulder * 0.82 + coastalNoise;
  const slope = water ? 0.02 : Math.min(1, 0.08 + ridge * 0.48);
  const temperatureC = 27 - row * 2.2 - Math.max(0, elevation) * 8;
  const wetness = Math.max(0.08, Math.min(0.94, 0.58 - normalizedX * 0.18 + normalizedY * 0.08));
  const ice = !water && elevation > 0.72 && row < 3;
  const biome = water
    ? 'marine'
    : ice || temperatureC < 5
      ? 'tundra'
      : wetness < 0.3
        ? 'desert'
        : temperatureC > 22 && wetness > 0.62
          ? 'tropical'
          : wetness > 0.52
            ? 'grassland'
            : 'plains';
  const morphology = water
    ? 'ocean'
    : elevation > 0.55
      ? 'mountainous'
      : slope > 0.18
        ? 'rough'
        : 'flat';

  return {
    id: `fixture:q${column}:r${row}`,
    q: column,
    r: row,
    longitude: -18 + column * 4,
    latitude: 48 - row * 3,
    topologyCell: row * COLUMNS + column,
    membershipRole: continentalDistance <= 1.08 ? 'parent' : 'context',
    childIndex: null,
    plateId: column < 5 ? 1 : 2,
    biome,
    morphology,
    terrainType: `${biome}-${morphology}`,
    features: [
      ...(water ? ['aquatic' as const] : []),
      ...(!water && wetness > 0.48 ? ['vegetated' as const] : []),
      ...(ice ? ['snow' as const] : []),
    ],
    featureDetails: [
      ...(water ? ['aquatic' as const] : []),
      ...(!water && wetness > 0.66 ? ['forest' as const] : []),
      ...(ice ? ['snow' as const] : []),
    ],
    minorRiverEdges: [],
    navigableRiverEdges: [],
    riverMouthEdges: [],
    ridgeEdges: [],
    navigableRiverCenter: false,
    riverSource: false,
    riverTerminus: null,
    riverStrength: 0,
    elevation: round(elevation),
    slope: round(slope),
    temperatureC: round(temperatureC),
    wetness: round(wetness),
    volcanism: column === 5 && row === 2 ? 0.35 : 0,
    water,
    ice,
  };
}

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

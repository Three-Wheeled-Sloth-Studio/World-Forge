import {
  GEOGRAPHIC_SCENE_MODEL_VERSION,
  finalizeGeographicScene,
  reportGeographicSceneBuildProgress,
  throwIfGeographicSceneBuildCancelled,
  validateGeographicScenePatchSeams,
  type GeographicScene,
  type GeographicSceneBuildOptions,
  type GeographicSceneDraft,
  type GeographicSceneExtent,
  type GeographicSceneMaterial,
  type GeographicScenePatchEdge,
  type GeographicSceneSemanticScale,
  type GeographicSceneTerrainPatch,
  type GeographicSceneTerrainVertex,
  type GeographicSceneWaterSurface,
  type GeographicSceneWaterVertex,
} from '@world-forge/shared/geographicScene';
import type {
  GeographicTileWindow,
  GeographicTileWindowTile,
} from '@world-forge/shared/geographicTileWindow';

const MILES_TO_METERS = 1609.344;

export type BuildGeographicSceneFromTileWindowInput = {
  tileWindow: GeographicTileWindow;
  hierarchyNodeId: string;
  hierarchyLevel: GeographicSceneSemanticScale;
  waterLevel: number;
  replayVersion?: string;
  reliefHeightScale?: number;
  options?: GeographicSceneBuildOptions;
};

type AxisRange = {
  start: number;
  end: number;
};

type TerrainSample = {
  row: number;
  column: number;
  tile: GeographicTileWindowTile;
  position: readonly [number, number, number];
  geographic: readonly [number, number];
};

const MATERIALS: readonly GeographicSceneMaterial[] = [
  { id: 'terrain-marine', role: 'terrain', label: 'Marine terrain', baseColor: '#24475b', opacity: 1, roughness: 0.92, metalness: 0 },
  { id: 'terrain-tundra', role: 'terrain', label: 'Tundra', baseColor: '#9ca89d', opacity: 1, roughness: 0.96, metalness: 0 },
  { id: 'terrain-grassland', role: 'terrain', label: 'Grassland', baseColor: '#6f8f4e', opacity: 1, roughness: 0.94, metalness: 0 },
  { id: 'terrain-plains', role: 'terrain', label: 'Plains', baseColor: '#9a8a55', opacity: 1, roughness: 0.95, metalness: 0 },
  { id: 'terrain-desert', role: 'terrain', label: 'Desert', baseColor: '#b79a61', opacity: 1, roughness: 0.98, metalness: 0 },
  { id: 'terrain-tropical', role: 'terrain', label: 'Tropical', baseColor: '#3f7548', opacity: 1, roughness: 0.93, metalness: 0 },
  { id: 'terrain-mountain', role: 'terrain', label: 'Mountain', baseColor: '#77766d', opacity: 1, roughness: 0.9, metalness: 0 },
  { id: 'terrain-ice', role: 'ice', label: 'Permanent ice', baseColor: '#e9eef0', opacity: 1, roughness: 0.72, metalness: 0 },
  { id: 'water-ocean', role: 'water', label: 'Water', baseColor: '#2f7fa6', opacity: 0.72, roughness: 0.38, metalness: 0 },
];

export function buildGeographicSceneFromTileWindow(
  input: BuildGeographicSceneFromTileWindowInput,
): GeographicScene {
  const { tileWindow, options } = input;
  throwIfGeographicSceneBuildCancelled(options?.signal);
  validateTileWindow(tileWindow);
  reportGeographicSceneBuildProgress(options, 'prepare', 1, 1, 'Prepared canonical tile window.');

  const columns = tileWindow.dimensions.columns;
  const rows = tileWindow.dimensions.rows;
  const reliefHeightScale =
    input.reliefHeightScale ?? Math.max(1, tileWindow.scale.nominalHexWidthMiles * 0.18);
  const samples = buildTerrainSamples(tileWindow, input.waterLevel, reliefHeightScale);
  const rowRanges = splitAxis(rows);
  const columnRanges = splitAxis(columns);
  const patchIds = rowRanges.map((_, rowIndex) =>
    columnRanges.map((__, columnIndex) => terrainPatchId(rowIndex, columnIndex)),
  );
  const terrainPatches: GeographicSceneTerrainPatch[] = [];
  const patchTotal = rowRanges.length * columnRanges.length;

  for (let patchRow = 0; patchRow < rowRanges.length; patchRow += 1) {
    for (let patchColumn = 0; patchColumn < columnRanges.length; patchColumn += 1) {
      throwIfGeographicSceneBuildCancelled(options?.signal);
      terrainPatches.push(
        buildTerrainPatch({
          samples,
          columns,
          rowRange: rowRanges[patchRow],
          columnRange: columnRanges[patchColumn],
          patchRow,
          patchColumn,
          patchIds,
          rowRanges,
          columnRanges,
        }),
      );
      reportGeographicSceneBuildProgress(
        options,
        'terrain',
        terrainPatches.length,
        patchTotal,
        `Built terrain patch ${terrainPatches.length} of ${patchTotal}.`,
      );
    }
  }

  const seamIssues = validateGeographicScenePatchSeams(terrainPatches);
  if (seamIssues.length > 0) {
    throw new Error(
      `Geographic scene terrain seams are invalid: ${seamIssues
        .map((issue) => `${issue.patchId}:${issue.edge}:${issue.code}`)
        .join(', ')}`,
    );
  }

  throwIfGeographicSceneBuildCancelled(options?.signal);
  const waterSurface = buildWaterSurface(samples, rows, columns);
  const waterSurfaces = waterSurface ? [waterSurface] : [];
  reportGeographicSceneBuildProgress(
    options,
    'water',
    1,
    1,
    waterSurface ? 'Built separate water surface.' : 'No water surface was present.',
  );

  const extent = sceneExtent(samples, tileWindow);
  const terrainVertexCount = terrainPatches.reduce(
    (total, patch) => total + patch.vertices.length,
    0,
  );
  const terrainTriangleCount = terrainPatches.reduce(
    (total, patch) => total + patch.triangleIndices.length / 3,
    0,
  );
  const spanX = extent.max[0] - extent.min[0];
  const spanY = extent.max[1] - extent.min[1];
  const draft: GeographicSceneDraft = {
    modelVersion: GEOGRAPHIC_SCENE_MODEL_VERSION,
    source: {
      worldId: tileWindow.sourceWorldId,
      seed: tileWindow.worldSeed,
      hierarchyNodeId: input.hierarchyNodeId,
      hierarchyLevel: input.hierarchyLevel,
      tileWindowId: tileWindowId(tileWindow),
      tileWindowSignature: tileWindow.signature,
      replayVersion:
        input.replayVersion ??
        `${tileWindow.modelVersion}:${tileWindow.classifierVersion}:${tileWindow.sourceTopologyResolution}`,
    },
    projection: {
      kind: 'local-tangent-plane',
      origin: [
        round((tileWindow.extent.minLongitude + tileWindow.extent.maxLongitude) / 2),
        round((tileWindow.extent.minLatitude + tileWindow.extent.maxLatitude) / 2),
      ],
      metersPerUnit: MILES_TO_METERS,
      wrapsAntimeridian: tileWindow.dimensions.wrapsLongitude,
    },
    extent,
    materials: MATERIALS,
    terrainPatches,
    waterSurfaces,
    rivers: [],
    boundaries: [],
    hexOverlay: {
      scaleId: null,
      semanticScale: null,
      cells: [],
    },
    labels: [],
    selection: {
      selectedFeatureId: null,
      selectedFeatureType: null,
      highlightedFeatureIds: [],
    },
    context: {
      parentHierarchyNodeId: null,
      siblingHierarchyNodeIds: [],
      neighboringPatchIds: terrainPatches.map((patch) => patch.id),
      focus: [
        round((extent.min[0] + extent.max[0]) / 2),
        round((extent.min[1] + extent.max[1]) / 2),
        0,
      ],
      recommendedCameraDistance: round(Math.max(spanX, spanY) * 1.1),
      reliefExaggeration: 1,
    },
    diagnostics: {
      terrainPatchCount: terrainPatches.length,
      terrainVertexCount,
      terrainTriangleCount,
      waterSurfaceCount: waterSurfaces.length,
      riverCount: 0,
      boundaryCount: 0,
      hexCellCount: 0,
      labelCount: 0,
      unresolvedRiverIds: [],
      warnings: waterSurface ? [] : ['The selected tile window contains no renderable water surface.'],
    },
  };

  throwIfGeographicSceneBuildCancelled(options?.signal);
  const scene = finalizeGeographicScene(draft);
  reportGeographicSceneBuildProgress(options, 'finalize', 1, 1, 'Finalized geographic scene.');
  return scene;
}

function validateTileWindow(tileWindow: GeographicTileWindow): void {
  const { columns, rows } = tileWindow.dimensions;
  if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 2 || rows < 2) {
    throw new Error('Geographic scene terrain requires a tile window of at least 2 by 2 samples.');
  }
  if (tileWindow.tiles.length !== columns * rows) {
    throw new Error(
      `Geographic tile window expected ${columns * rows} tiles but received ${tileWindow.tiles.length}.`,
    );
  }
}

function buildTerrainSamples(
  tileWindow: GeographicTileWindow,
  waterLevel: number,
  reliefHeightScale: number,
): TerrainSample[] {
  const columns = tileWindow.dimensions.columns;
  const rows = tileWindow.dimensions.rows;
  const width = tileWindow.scale.nominalHexWidthMiles;
  const verticalSpacing = tileWindow.scale.verticalSpacingMiles;
  return tileWindow.tiles.map((tile, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = column * width + (row % 2 === 1 ? width / 2 : 0);
    const y = (rows - 1 - row) * verticalSpacing;
    const z = (tile.elevation - waterLevel) * reliefHeightScale;
    return {
      row,
      column,
      tile,
      position: [round(x), round(y), round(z)],
      geographic: [tile.longitude, tile.latitude],
    };
  });
}

function splitAxis(length: number): AxisRange[] {
  if (length < 4) {
    return [{ start: 0, end: length - 1 }];
  }
  const split = Math.floor((length - 1) / 2);
  return [
    { start: 0, end: split },
    { start: split, end: length - 1 },
  ];
}

function buildTerrainPatch({
  samples,
  columns,
  rowRange,
  columnRange,
  patchRow,
  patchColumn,
  patchIds,
  rowRanges,
  columnRanges,
}: {
  samples: readonly TerrainSample[];
  columns: number;
  rowRange: AxisRange;
  columnRange: AxisRange;
  patchRow: number;
  patchColumn: number;
  patchIds: readonly (readonly string[])[];
  rowRanges: readonly AxisRange[];
  columnRanges: readonly AxisRange[];
}): GeographicSceneTerrainPatch {
  const vertices: GeographicSceneTerrainVertex[] = [];
  const triangleIndices: number[] = [];
  const localColumns = columnRange.end - columnRange.start + 1;
  const sourceTileIds: string[] = [];

  for (let row = rowRange.start; row <= rowRange.end; row += 1) {
    for (let column = columnRange.start; column <= columnRange.end; column += 1) {
      const sample = samples[row * columns + column];
      vertices.push({
        id: `${terrainPatchId(patchRow, patchColumn)}:${sample.tile.id}`,
        position: sample.position,
        geographic: sample.geographic,
        sourceSampleId: sample.tile.id,
        materialWeights: [{ materialId: naturalMaterialId(sample.tile), weight: 1 }],
      });
      sourceTileIds.push(sample.tile.id);
    }
  }

  const localRows = rowRange.end - rowRange.start + 1;
  for (let row = 0; row < localRows - 1; row += 1) {
    for (let column = 0; column < localColumns - 1; column += 1) {
      const northWest = row * localColumns + column;
      const northEast = northWest + 1;
      const southWest = northWest + localColumns;
      const southEast = southWest + 1;
      triangleIndices.push(northWest, southWest, northEast);
      triangleIndices.push(northEast, southWest, southEast);
    }
  }

  const bounds = extentForVertices(vertices);
  return {
    id: patchIds[patchRow][patchColumn],
    levelOfDetail: 0,
    bounds,
    vertices,
    triangleIndices,
    seams: [
      buildPatchSeam('north', patchRow, patchColumn, patchIds, rowRanges, columnRanges, samples, columns),
      buildPatchSeam('east', patchRow, patchColumn, patchIds, rowRanges, columnRanges, samples, columns),
      buildPatchSeam('south', patchRow, patchColumn, patchIds, rowRanges, columnRanges, samples, columns),
      buildPatchSeam('west', patchRow, patchColumn, patchIds, rowRanges, columnRanges, samples, columns),
    ],
    sourceTileIds,
  };
}

function buildPatchSeam(
  edge: GeographicScenePatchEdge,
  patchRow: number,
  patchColumn: number,
  patchIds: readonly (readonly string[])[],
  rowRanges: readonly AxisRange[],
  columnRanges: readonly AxisRange[],
  samples: readonly TerrainSample[],
  columns: number,
): GeographicSceneTerrainPatch['seams'][number] {
  const rowRange = rowRanges[patchRow];
  const columnRange = columnRanges[patchColumn];
  const sampleIds: string[] = [];
  if (edge === 'north' || edge === 'south') {
    const row = edge === 'north' ? rowRange.start : rowRange.end;
    for (let column = columnRange.start; column <= columnRange.end; column += 1) {
      sampleIds.push(samples[row * columns + column].tile.id);
    }
  } else {
    const column = edge === 'west' ? columnRange.start : columnRange.end;
    for (let row = rowRange.start; row <= rowRange.end; row += 1) {
      sampleIds.push(samples[row * columns + column].tile.id);
    }
  }

  const neighborPosition = neighborPatchPosition(edge, patchRow, patchColumn);
  const neighborPatchId =
    neighborPosition.row >= 0 &&
    neighborPosition.row < patchIds.length &&
    neighborPosition.column >= 0 &&
    neighborPosition.column < patchIds[neighborPosition.row].length
      ? patchIds[neighborPosition.row][neighborPosition.column]
      : null;

  return {
    edge,
    neighborPatchId,
    neighborEdge: neighborPatchId ? oppositeEdge(edge) : null,
    sampleIds,
    orientation: 'same-order',
    stitchMode: 'shared-samples',
  };
}

function neighborPatchPosition(
  edge: GeographicScenePatchEdge,
  row: number,
  column: number,
): { row: number; column: number } {
  if (edge === 'north') return { row: row - 1, column };
  if (edge === 'east') return { row, column: column + 1 };
  if (edge === 'south') return { row: row + 1, column };
  return { row, column: column - 1 };
}

function oppositeEdge(edge: GeographicScenePatchEdge): GeographicScenePatchEdge {
  if (edge === 'north') return 'south';
  if (edge === 'east') return 'west';
  if (edge === 'south') return 'north';
  return 'east';
}

function buildWaterSurface(
  samples: readonly TerrainSample[],
  rows: number,
  columns: number,
): GeographicSceneWaterSurface | null {
  const vertices: GeographicSceneWaterVertex[] = [];
  const triangleIndices: number[] = [];
  const vertexIndexById = new Map<string, number>();

  const waterVertex = (sample: TerrainSample): number =>
    addWaterVertex(
      `water-sample:${sample.tile.id}`,
      [sample.position[0], sample.position[1], 0],
      sample.geographic,
      vertices,
      vertexIndexById,
    );
  const edgeVertex = (first: TerrainSample, second: TerrainSample): number => {
    const [left, right] = [first, second].sort((a, b) => a.tile.id.localeCompare(b.tile.id));
    return addWaterVertex(
      `water-edge:${left.tile.id}:${right.tile.id}`,
      [
        round((first.position[0] + second.position[0]) / 2),
        round((first.position[1] + second.position[1]) / 2),
        0,
      ],
      [
        round(interpolateLongitude(first.geographic[0], second.geographic[0], 0.5)),
        round((first.geographic[1] + second.geographic[1]) / 2),
      ],
      vertices,
      vertexIndexById,
    );
  };

  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const northWest = samples[row * columns + column];
      const northEast = samples[row * columns + column + 1];
      const southWest = samples[(row + 1) * columns + column];
      const southEast = samples[(row + 1) * columns + column + 1];
      appendClippedWaterTriangle(
        [northWest, southWest, northEast],
        waterVertex,
        edgeVertex,
        triangleIndices,
      );
      appendClippedWaterTriangle(
        [northEast, southWest, southEast],
        waterVertex,
        edgeVertex,
        triangleIndices,
      );
    }
  }

  if (triangleIndices.length === 0) return null;
  return {
    id: 'water-surface',
    kind: 'ocean',
    level: 0,
    materialId: 'water-ocean',
    vertices,
    triangleIndices,
    sourceFeatureIds: samples.filter((sample) => sample.tile.water).map((sample) => sample.tile.id),
  };
}

function appendClippedWaterTriangle(
  triangle: readonly [TerrainSample, TerrainSample, TerrainSample],
  waterVertex: (sample: TerrainSample) => number,
  edgeVertex: (first: TerrainSample, second: TerrainSample) => number,
  indices: number[],
): void {
  const waterSamples = triangle.filter((sample) => sample.tile.water);
  if (waterSamples.length === 0) return;
  if (waterSamples.length === 3) {
    indices.push(waterVertex(triangle[0]), waterVertex(triangle[1]), waterVertex(triangle[2]));
    return;
  }

  if (waterSamples.length === 1) {
    const water = waterSamples[0];
    const land = triangle.filter((sample) => !sample.tile.water);
    indices.push(waterVertex(water), edgeVertex(water, land[0]), edgeVertex(water, land[1]));
    return;
  }

  const land = triangle.find((sample) => !sample.tile.water);
  if (!land) return;
  const firstWater = waterSamples[0];
  const secondWater = waterSamples[1];
  const firstEdge = edgeVertex(firstWater, land);
  const secondEdge = edgeVertex(secondWater, land);
  indices.push(waterVertex(firstWater), waterVertex(secondWater), secondEdge);
  indices.push(waterVertex(firstWater), secondEdge, firstEdge);
}

function addWaterVertex(
  id: string,
  position: readonly [number, number, number],
  geographic: readonly [number, number],
  vertices: GeographicSceneWaterVertex[],
  vertexIndexById: Map<string, number>,
): number {
  const existing = vertexIndexById.get(id);
  if (existing !== undefined) return existing;
  const index = vertices.length;
  vertices.push({ id, position, geographic });
  vertexIndexById.set(id, index);
  return index;
}

function interpolateLongitude(start: number, end: number, ratio: number): number {
  let delta = end - start;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  const longitude = start + delta * ratio;
  if (longitude > 180) return longitude - 360;
  if (longitude < -180) return longitude + 360;
  return longitude;
}

function naturalMaterialId(tile: GeographicTileWindowTile): string {
  if (tile.ice) return 'terrain-ice';
  if (tile.morphology === 'mountainous') return 'terrain-mountain';
  if (tile.water || tile.biome === 'marine') return 'terrain-marine';
  if (tile.biome === 'tundra') return 'terrain-tundra';
  if (tile.biome === 'grassland') return 'terrain-grassland';
  if (tile.biome === 'plains') return 'terrain-plains';
  if (tile.biome === 'desert') return 'terrain-desert';
  return 'terrain-tropical';
}

function extentForVertices(
  vertices: readonly GeographicSceneTerrainVertex[],
): GeographicSceneExtent {
  const xs = vertices.map((vertex) => vertex.position[0]);
  const ys = vertices.map((vertex) => vertex.position[1]);
  const longitudes = vertices.map((vertex) => vertex.geographic[0]);
  const latitudes = vertices.map((vertex) => vertex.geographic[1]);
  return {
    min: [Math.min(...xs), Math.min(...ys)],
    max: [Math.max(...xs), Math.max(...ys)],
    geographicNorthWest: [Math.min(...longitudes), Math.max(...latitudes)],
    geographicSouthEast: [Math.max(...longitudes), Math.min(...latitudes)],
  };
}

function sceneExtent(
  samples: readonly TerrainSample[],
  tileWindow: GeographicTileWindow,
): GeographicSceneExtent {
  const xs = samples.map((sample) => sample.position[0]);
  const ys = samples.map((sample) => sample.position[1]);
  return {
    min: [Math.min(...xs), Math.min(...ys)],
    max: [Math.max(...xs), Math.max(...ys)],
    geographicNorthWest: [tileWindow.extent.minLongitude, tileWindow.extent.maxLatitude],
    geographicSouthEast: [tileWindow.extent.maxLongitude, tileWindow.extent.minLatitude],
  };
}

function terrainPatchId(row: number, column: number): string {
  return `terrain-r${row}-c${column}`;
}

function tileWindowId(tileWindow: GeographicTileWindow): string {
  return [
    tileWindow.scale.id,
    `q${tileWindow.extent.qMin}`,
    `r${tileWindow.extent.rMin}`,
    `${tileWindow.dimensions.columns}x${tileWindow.dimensions.rows}`,
  ].join(':');
}

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

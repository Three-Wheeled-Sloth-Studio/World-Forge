import * as THREE from 'three';
import type { HexTileEdge } from '@world-forge/shared';
import type {
  GeographicScene,
  GeographicSceneGeographicPoint,
} from '@world-forge/shared/geographicScene';
import type {
  GeographicTileWindow,
  GeographicTileWindowTile,
} from '@world-forge/shared/geographicTileWindow';
import { visibleGeographicAtlasTileIds } from './geographicTileWindowMap';

export type GeographicHexScenePresentation = 'natural' | 'elevation';

export type GeographicHexSceneOptions = {
  showHexes: boolean;
  selectedChildIndex?: number | null;
};

export type GeographicHexSceneBufferData = {
  positions: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  sourceSampleIds: readonly string[];
  geographicPoints: readonly GeographicSceneGeographicPoint[];
  hexLinePositions: Float32Array;
  childBoundaryPositions: Float32Array;
  selectedBoundaryPositions: Float32Array;
  parentBoundaryPositions: Float32Array;
};

type SceneSample = {
  z: number;
};

type HexTileGeometry = {
  tile: GeographicTileWindowTile;
  center: readonly [number, number];
  topZ: number;
  polygon: readonly (readonly [number, number])[];
};

const SQRT_THREE = Math.sqrt(3);
const EDGE_ORDER: readonly HexTileEdge[] = ['ne', 'e', 'se', 'sw', 'w', 'nw'];
const EDGE_VERTICES: Readonly<Record<HexTileEdge, readonly [number, number]>> = {
  ne: [0, 1],
  e: [1, 2],
  se: [2, 3],
  sw: [3, 4],
  w: [4, 5],
  nw: [5, 0],
};

export function buildGeographicHexSceneBufferData(
  scene: GeographicScene,
  tileWindow: GeographicTileWindow,
  presentation: GeographicHexScenePresentation,
  options: GeographicHexSceneOptions,
): GeographicHexSceneBufferData {
  const width = tileWindow.scale.nominalHexWidthMiles;
  const radius = width / SQRT_THREE;
  const visibleIds = visibleGeographicAtlasTileIds(tileWindow);
  const sampleById = sceneSamplesById(scene);
  const geometry = tileWindow.tiles
    .filter((tile) => visibleIds.has(tile.id))
    .map((tile) => buildTileGeometry(tile, tileWindow, sampleById.get(tile.id), radius));
  const geometryById = new Map(geometry.map((entry) => [entry.tile.id, entry]));
  const tileByCoordinate = new Map(tileWindow.tiles.map((tile) => [`${tile.q},${tile.r}`, tile]));
  const elevations = geometry.map((entry) => entry.topZ);
  const minElevation = elevations.length > 0 ? Math.min(...elevations) : 0;
  const maxElevation = elevations.length > 0 ? Math.max(...elevations) : 1;

  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const sourceSampleIds: string[] = [];
  const geographicPoints: GeographicSceneGeographicPoint[] = [];
  const hexLinePositions: number[] = [];
  const childBoundaryPositions: number[] = [];
  const selectedBoundaryPositions: number[] = [];
  const parentBoundaryPositions: number[] = [];
  const emittedHexEdges = new Set<string>();
  const emittedBoundaryEdges = new Set<string>();

  const addVertex = (
    entry: HexTileGeometry,
    point: readonly [number, number, number],
    color: THREE.Color,
  ): number => {
    const index = positions.length / 3;
    positions.push(point[0], point[1], point[2]);
    colors.push(color.r, color.g, color.b);
    sourceSampleIds.push(entry.tile.id);
    geographicPoints.push([entry.tile.longitude, entry.tile.latitude]);
    return index;
  };

  for (const entry of geometry) {
    const selected = options.selectedChildIndex !== null
      && options.selectedChildIndex !== undefined
      && entry.tile.childIndex === options.selectedChildIndex;
    const topColor = tileColor(entry.tile, presentation, entry.topZ, minElevation, maxElevation, selected);
    const roughness = tileCenterRoughness(entry.tile, width);
    const centerIndex = addVertex(
      entry,
      [entry.center[0], entry.center[1], entry.topZ + roughness],
      adjustColor(topColor, roughness / Math.max(1, width) * 0.65),
    );
    const cornerIndices = entry.polygon.map((point, cornerIndex) => addVertex(
      entry,
      [point[0], point[1], entry.topZ],
      adjustColor(topColor, (hashUnit(`${entry.tile.id}:corner:${cornerIndex}`) - 0.5) * 0.045),
    ));

    for (let corner = 0; corner < 6; corner += 1) {
      indices.push(centerIndex, cornerIndices[corner], cornerIndices[(corner + 1) % 6]);
    }

    for (const edge of EDGE_ORDER) {
      const neighbor = neighborFor(entry.tile, edge, tileByCoordinate, tileWindow);
      const neighborGeometry = neighbor ? geometryById.get(neighbor.id) : undefined;
      const lowerZ = neighborGeometry
        ? neighborGeometry.topZ
        : entry.topZ - Math.max(width * 0.08, Math.abs(entry.topZ) * 0.2);
      if (entry.topZ <= lowerZ + width * 0.001) continue;
      const [leftIndex, rightIndex] = EDGE_VERTICES[edge];
      const left = entry.polygon[leftIndex];
      const right = entry.polygon[rightIndex];
      const sideColor = adjustColor(topColor, -0.19);
      const topLeft = addVertex(entry, [left[0], left[1], entry.topZ], sideColor);
      const topRight = addVertex(entry, [right[0], right[1], entry.topZ], sideColor);
      const bottomRight = addVertex(entry, [right[0], right[1], lowerZ], adjustColor(sideColor, -0.08));
      const bottomLeft = addVertex(entry, [left[0], left[1], lowerZ], adjustColor(sideColor, -0.08));
      indices.push(topLeft, bottomRight, topRight, topLeft, bottomLeft, bottomRight);
    }

    for (const edge of EDGE_ORDER) {
      const neighbor = neighborFor(entry.tile, edge, tileByCoordinate, tileWindow);
      const neighborGeometry = neighbor ? geometryById.get(neighbor.id) : undefined;
      const edgeKey = canonicalEdgeKey(entry.tile, edge, neighbor);
      const [leftIndex, rightIndex] = EDGE_VERTICES[edge];
      const left = entry.polygon[leftIndex];
      const right = entry.polygon[rightIndex];
      const lineZ = Math.max(entry.topZ, neighborGeometry?.topZ ?? entry.topZ) + width * 0.012;

      if (options.showHexes && !emittedHexEdges.has(edgeKey)) {
        emittedHexEdges.add(edgeKey);
        pushLine(hexLinePositions, left, right, lineZ);
      }

      if (emittedBoundaryEdges.has(edgeKey)) continue;
      const parentBoundary = entry.tile.membershipRole === 'parent'
        && neighbor?.membershipRole !== 'parent';
      const childBoundary = entry.tile.membershipRole === 'parent'
        && neighbor?.membershipRole === 'parent'
        && entry.tile.childIndex !== null
        && neighbor.childIndex !== null
        && entry.tile.childIndex !== neighbor.childIndex;
      const selectedBoundary = options.selectedChildIndex !== null
        && options.selectedChildIndex !== undefined
        && entry.tile.membershipRole === 'parent'
        && entry.tile.childIndex === options.selectedChildIndex
        && neighbor?.childIndex !== options.selectedChildIndex;
      if (!(parentBoundary || childBoundary || selectedBoundary)) continue;
      emittedBoundaryEdges.add(edgeKey);
      if (parentBoundary) pushLine(parentBoundaryPositions, left, right, lineZ + width * 0.012);
      if (childBoundary) pushLine(childBoundaryPositions, left, right, lineZ + width * 0.018);
      if (selectedBoundary) pushLine(selectedBoundaryPositions, left, right, lineZ + width * 0.024);
    }
  }

  return {
    positions: Float32Array.from(positions),
    colors: Float32Array.from(colors),
    indices: Uint32Array.from(indices),
    sourceSampleIds,
    geographicPoints,
    hexLinePositions: Float32Array.from(hexLinePositions),
    childBoundaryPositions: Float32Array.from(childBoundaryPositions),
    selectedBoundaryPositions: Float32Array.from(selectedBoundaryPositions),
    parentBoundaryPositions: Float32Array.from(parentBoundaryPositions),
  };
}

export function createGeographicHexSceneThreeObject(
  scene: GeographicScene,
  tileWindow: GeographicTileWindow,
  presentation: GeographicHexScenePresentation,
  options: GeographicHexSceneOptions,
): THREE.Group {
  const data = buildGeographicHexSceneBufferData(scene, tileWindow, presentation, options);
  const group = new THREE.Group();
  group.name = `geographic-hex-scene:${scene.signature}:${tileWindow.signature}`;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const terrain = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.96,
      metalness: 0,
      side: THREE.DoubleSide,
    }),
  );
  terrain.name = 'hex-terrain';
  terrain.castShadow = true;
  terrain.receiveShadow = true;
  terrain.userData.geographicTerrainPickData = {
    patchId: 'hex-terrain',
    sourceSampleIds: data.sourceSampleIds,
    geographicPoints: data.geographicPoints,
  };
  group.add(terrain);

  addLineSegments(group, 'hex-grid', data.hexLinePositions, '#17262d', 0.62, 4);
  addLineSegments(group, 'child-boundaries', data.childBoundaryPositions, '#ffd67f', 0.98, 9);
  addLineSegments(group, 'selected-child-boundary', data.selectedBoundaryPositions, '#fff2a8', 1, 11);
  addLineSegments(group, 'parent-boundary', data.parentBoundaryPositions, '#fffdf1', 1, 10);
  return group;
}

function addLineSegments(
  group: THREE.Group,
  name: string,
  positions: Float32Array,
  color: string,
  opacity: number,
  renderOrder: number,
): void {
  if (positions.length === 0) return;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const lines = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      color,
      transparent: opacity < 1,
      opacity,
      depthTest: true,
      depthWrite: false,
    }),
  );
  lines.name = name;
  lines.renderOrder = renderOrder;
  lines.frustumCulled = false;
  group.add(lines);
}

function sceneSamplesById(scene: GeographicScene): Map<string, SceneSample> {
  const samples = new Map<string, SceneSample>();
  for (const patch of scene.terrainPatches) {
    for (const vertex of patch.vertices) {
      if (!samples.has(vertex.sourceSampleId)) samples.set(vertex.sourceSampleId, { z: vertex.position[2] });
    }
  }
  return samples;
}

function buildTileGeometry(
  tile: GeographicTileWindowTile,
  tileWindow: GeographicTileWindow,
  sample: SceneSample | undefined,
  radius: number,
): HexTileGeometry {
  const localColumn = mod(tile.q - tileWindow.extent.qMin, tileWindow.scale.worldColumns);
  const localRow = tile.r - tileWindow.extent.rMin;
  const width = tileWindow.scale.nominalHexWidthMiles;
  const centerX = localColumn * width + (tile.r % 2 === 1 ? width / 2 : 0);
  const centerY = (tileWindow.dimensions.rows - 1 - localRow) * tileWindow.scale.verticalSpacingMiles;
  const sourceZ = sample?.z ?? tile.elevation * width * 0.18;
  const topZ = displayTopZ(tile, sourceZ, width);
  const polygon: Array<readonly [number, number]> = [];
  for (let index = 0; index < 6; index += 1) {
    const angle = (-90 + index * 60) * Math.PI / 180;
    polygon.push([
      centerX + Math.cos(angle) * radius,
      centerY + Math.sin(angle) * radius,
    ]);
  }
  return { tile, center: [centerX, centerY], topZ, polygon };
}

function displayTopZ(tile: GeographicTileWindowTile, sourceZ: number, width: number): number {
  if (tile.water) return 0;
  const coastalStep = width * 0.025;
  return Math.max(coastalStep, sourceZ * 1.65 + coastalStep);
}

function tileCenterRoughness(tile: GeographicTileWindowTile, width: number): number {
  if (tile.water || tile.ice) return 0;
  const morphology = tile.morphology === 'mountainous'
    ? 0.085
    : tile.morphology === 'rough'
      ? 0.045
      : 0.016;
  const slope = clamp(tile.slope * 0.055, 0, 0.045);
  return width * (morphology + slope) * (0.35 + hashUnit(`${tile.id}:roughness`) * 0.65);
}

function tileColor(
  tile: GeographicTileWindowTile,
  presentation: GeographicHexScenePresentation,
  elevation: number,
  minElevation: number,
  maxElevation: number,
  selected: boolean,
): THREE.Color {
  let color = presentation === 'elevation'
    ? elevationColor(elevation, minElevation, maxElevation)
    : naturalTileColor(tile);
  if (tile.membershipRole === 'context') color = color.clone().multiplyScalar(0.5);
  if (selected) color = color.clone().lerp(new THREE.Color('#ffe69a'), 0.26);
  return color;
}

function naturalTileColor(tile: GeographicTileWindowTile): THREE.Color {
  if (tile.ice) return new THREE.Color('#dbe8e8');
  if (tile.water) {
    return new THREE.Color(tile.morphology === 'coastal' || tile.morphology === 'lake'
      ? '#397a9b'
      : '#225776');
  }
  switch (tile.biome) {
    case 'tundra': return new THREE.Color('#aeb9a2');
    case 'desert': return new THREE.Color('#c5a768');
    case 'tropical': return new THREE.Color('#3f7f4b');
    case 'grassland': return new THREE.Color('#789456');
    case 'plains': return new THREE.Color('#9a985d');
    default: return new THREE.Color('#55745c');
  }
}

function elevationColor(value: number, minimum: number, maximum: number): THREE.Color {
  const ratio = maximum <= minimum ? 0.5 : clamp((value - minimum) / (maximum - minimum), 0, 1);
  if (ratio < 0.5) {
    return new THREE.Color('#24475b').lerp(new THREE.Color('#6f8f4e'), ratio * 2);
  }
  return new THREE.Color('#6f8f4e').lerp(new THREE.Color('#f0eee4'), (ratio - 0.5) * 2);
}

function adjustColor(color: THREE.Color, lightness: number): THREE.Color {
  const adjusted = color.clone();
  adjusted.offsetHSL(0, 0, clamp(lightness, -0.35, 0.35));
  return adjusted;
}

function neighborFor(
  tile: GeographicTileWindowTile,
  edge: HexTileEdge,
  byCoordinate: ReadonlyMap<string, GeographicTileWindowTile>,
  tileWindow: GeographicTileWindow,
): GeographicTileWindowTile | undefined {
  const odd = tile.r % 2 === 1;
  const offsets: Readonly<Record<HexTileEdge, readonly [number, number, number, number]>> = {
    e: [1, 0, 1, 0],
    se: [0, 1, 1, 1],
    sw: [-1, 1, 0, 1],
    w: [-1, 0, -1, 0],
    nw: [-1, -1, 0, -1],
    ne: [0, -1, 1, -1],
  };
  const [dqEven, drEven, dqOdd, drOdd] = offsets[edge];
  const q = mod(tile.q + (odd ? dqOdd : dqEven), tileWindow.scale.worldColumns);
  const r = tile.r + (odd ? drOdd : drEven);
  return byCoordinate.get(`${q},${r}`);
}

function canonicalEdgeKey(
  tile: GeographicTileWindowTile,
  edge: HexTileEdge,
  neighbor: GeographicTileWindowTile | undefined,
): string {
  if (!neighbor) return `${tile.id}:${edge}:open`;
  return [tile.id, neighbor.id].sort().join('<->');
}

function pushLine(
  target: number[],
  left: readonly [number, number],
  right: readonly [number, number],
  z: number,
): void {
  target.push(left[0], left[1], z, right[0], right[1], z);
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

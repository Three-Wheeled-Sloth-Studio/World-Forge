export const GEOGRAPHIC_SCENE_MODEL_VERSION = 'geographic-scene-v1' as const;

export type GeographicSceneModelVersion = typeof GEOGRAPHIC_SCENE_MODEL_VERSION;

export type GeographicScenePoint2 = readonly [x: number, y: number];
export type GeographicScenePoint3 = readonly [x: number, y: number, z: number];
export type GeographicSceneGeographicPoint = readonly [longitudeDeg: number, latitudeDeg: number];
export type GeographicScenePatchEdge = 'north' | 'east' | 'south' | 'west';
export type GeographicSceneSemanticScale =
  | 'world'
  | 'macro'
  | 'region'
  | 'subregion'
  | 'local'
  | 'detail';

export interface GeographicSceneSource {
  readonly worldId: string;
  readonly seed: string;
  readonly hierarchyNodeId: string;
  readonly hierarchyLevel: GeographicSceneSemanticScale;
  readonly tileWindowId: string;
  readonly tileWindowSignature: string;
  readonly replayVersion: string;
}

export interface GeographicSceneProjection {
  readonly kind: 'local-tangent-plane' | 'equirectangular';
  readonly origin: GeographicSceneGeographicPoint;
  readonly metersPerUnit: number;
  readonly wrapsAntimeridian: boolean;
}

export interface GeographicSceneExtent {
  readonly min: GeographicScenePoint2;
  readonly max: GeographicScenePoint2;
  readonly geographicNorthWest: GeographicSceneGeographicPoint;
  readonly geographicSouthEast: GeographicSceneGeographicPoint;
}

export interface GeographicSceneMaterial {
  readonly id: string;
  readonly role:
    | 'terrain'
    | 'water'
    | 'ice'
    | 'river'
    | 'boundary'
    | 'hex'
    | 'selection';
  readonly label: string;
  readonly baseColor: string;
  readonly opacity: number;
  readonly roughness?: number;
  readonly metalness?: number;
}

export interface GeographicSceneMaterialWeight {
  readonly materialId: string;
  readonly weight: number;
}

export interface GeographicSceneTerrainVertex {
  readonly id: string;
  readonly position: GeographicScenePoint3;
  readonly geographic: GeographicSceneGeographicPoint;
  readonly sourceSampleId: string;
  readonly materialWeights: readonly GeographicSceneMaterialWeight[];
}

export interface GeographicScenePatchSeam {
  readonly edge: GeographicScenePatchEdge;
  readonly neighborPatchId: string | null;
  readonly neighborEdge: GeographicScenePatchEdge | null;
  readonly sampleIds: readonly string[];
  readonly orientation: 'same-order' | 'reverse-order';
  readonly stitchMode: 'shared-samples' | 'skirt';
  readonly skirtDepth?: number;
}

export interface GeographicSceneTerrainPatch {
  readonly id: string;
  readonly levelOfDetail: number;
  readonly bounds: GeographicSceneExtent;
  readonly vertices: readonly GeographicSceneTerrainVertex[];
  readonly triangleIndices: readonly number[];
  readonly seams: readonly GeographicScenePatchSeam[];
  readonly sourceTileIds: readonly string[];
}

export interface GeographicSceneWaterVertex {
  readonly id: string;
  readonly position: GeographicScenePoint3;
  readonly geographic: GeographicSceneGeographicPoint;
}

export interface GeographicSceneWaterSurface {
  readonly id: string;
  readonly kind: 'ocean' | 'lake' | 'inland-sea';
  readonly level: number;
  readonly materialId: string;
  readonly vertices: readonly GeographicSceneWaterVertex[];
  readonly triangleIndices: readonly number[];
  readonly sourceFeatureIds: readonly string[];
}

export interface GeographicSceneRiverPoint {
  readonly position: GeographicScenePoint3;
  readonly geographic: GeographicSceneGeographicPoint;
  readonly sourceSampleId: string;
  readonly width: number;
}

export interface GeographicSceneRiverPath {
  readonly id: string;
  readonly name?: string;
  readonly order: number;
  readonly materialId: string;
  readonly points: readonly GeographicSceneRiverPoint[];
  readonly terminus: 'ocean' | 'lake' | 'confluence' | 'unresolved';
  readonly sourceRiverIds: readonly string[];
}

export interface GeographicSceneBoundaryPath {
  readonly id: string;
  readonly hierarchyLevel: GeographicSceneSemanticScale;
  readonly materialId: string;
  readonly points: readonly GeographicScenePoint3[];
  readonly closed: boolean;
  readonly sourceRegionIds: readonly string[];
}

export interface GeographicSceneHexCell {
  readonly id: string;
  readonly scaleId: string;
  readonly center: GeographicScenePoint3;
  readonly polygon: readonly GeographicScenePoint3[];
  readonly hierarchyNodeId?: string;
  readonly candidateLocationIds: readonly string[];
  readonly selectable: boolean;
}

export interface GeographicSceneHexOverlay {
  readonly scaleId: string | null;
  readonly semanticScale: GeographicSceneSemanticScale | null;
  readonly cells: readonly GeographicSceneHexCell[];
}

export interface GeographicSceneLabel {
  readonly id: string;
  readonly text: string;
  readonly anchor: GeographicScenePoint3;
  readonly priority: number;
  readonly minScale: GeographicSceneSemanticScale;
  readonly maxScale: GeographicSceneSemanticScale;
  readonly sourceFeatureId: string;
}

export interface GeographicSceneSelection {
  readonly selectedFeatureId: string | null;
  readonly selectedFeatureType: 'region' | 'hex' | 'river' | 'location' | null;
  readonly highlightedFeatureIds: readonly string[];
}

export interface GeographicSceneContext {
  readonly parentHierarchyNodeId: string | null;
  readonly siblingHierarchyNodeIds: readonly string[];
  readonly neighboringPatchIds: readonly string[];
  readonly focus: GeographicScenePoint3;
  readonly recommendedCameraDistance: number;
  readonly reliefExaggeration: number;
}

export interface GeographicSceneDiagnostics {
  readonly terrainPatchCount: number;
  readonly terrainVertexCount: number;
  readonly terrainTriangleCount: number;
  readonly waterSurfaceCount: number;
  readonly riverCount: number;
  readonly boundaryCount: number;
  readonly hexCellCount: number;
  readonly labelCount: number;
  readonly unresolvedRiverIds: readonly string[];
  readonly warnings: readonly string[];
}

export interface GeographicScene {
  readonly modelVersion: GeographicSceneModelVersion;
  readonly source: GeographicSceneSource;
  readonly projection: GeographicSceneProjection;
  readonly extent: GeographicSceneExtent;
  readonly materials: readonly GeographicSceneMaterial[];
  readonly terrainPatches: readonly GeographicSceneTerrainPatch[];
  readonly waterSurfaces: readonly GeographicSceneWaterSurface[];
  readonly rivers: readonly GeographicSceneRiverPath[];
  readonly boundaries: readonly GeographicSceneBoundaryPath[];
  readonly hexOverlay: GeographicSceneHexOverlay;
  readonly labels: readonly GeographicSceneLabel[];
  readonly selection: GeographicSceneSelection;
  readonly context: GeographicSceneContext;
  readonly diagnostics: GeographicSceneDiagnostics;
  readonly signature: string;
}

export type GeographicSceneDraft = Omit<GeographicScene, 'signature'>;

export type GeographicSceneBuildPhase =
  | 'prepare'
  | 'terrain'
  | 'water'
  | 'rivers'
  | 'boundaries'
  | 'hexes'
  | 'labels'
  | 'finalize';

export interface GeographicSceneCancellationSignal {
  readonly aborted: boolean;
  readonly reason?: unknown;
}

export interface GeographicSceneBuildProgress {
  readonly phase: GeographicSceneBuildPhase;
  readonly completed: number;
  readonly total: number;
  readonly ratio: number;
  readonly message?: string;
}

export interface GeographicSceneBuildOptions {
  readonly signal?: GeographicSceneCancellationSignal;
  readonly onProgress?: (progress: GeographicSceneBuildProgress) => void;
}

export class GeographicSceneBuildCancelledError extends Error {
  public readonly reason: unknown;

  public constructor(reason?: unknown) {
    super('Geographic scene build cancelled.');
    this.name = 'AbortError';
    this.reason = reason;
  }
}

export interface GeographicSceneSeamValidationIssue {
  readonly code:
    | 'duplicate-patch-id'
    | 'empty-seam'
    | 'missing-neighbor'
    | 'missing-neighbor-edge'
    | 'missing-reciprocal-seam'
    | 'orientation-mismatch'
    | 'sample-mismatch'
    | 'stitch-mode-mismatch';
  readonly patchId: string;
  readonly edge: GeographicScenePatchEdge;
  readonly neighborPatchId: string | null;
  readonly message: string;
}

const OPPOSITE_PATCH_EDGE: Readonly<Record<GeographicScenePatchEdge, GeographicScenePatchEdge>> = {
  north: 'south',
  east: 'west',
  south: 'north',
  west: 'east',
};

export function getOppositeGeographicScenePatchEdge(
  edge: GeographicScenePatchEdge,
): GeographicScenePatchEdge {
  return OPPOSITE_PATCH_EDGE[edge];
}

export function createGeographicSceneSeamKey(
  patchId: string,
  edge: GeographicScenePatchEdge,
  neighborPatchId: string | null,
  neighborEdge: GeographicScenePatchEdge | null,
): string {
  const first = `${patchId}:${edge}`;
  const second = `${neighborPatchId ?? 'open'}:${neighborEdge ?? 'open'}`;
  return [first, second].sort().join('<->');
}

export function throwIfGeographicSceneBuildCancelled(
  signal?: GeographicSceneCancellationSignal,
): void {
  if (signal?.aborted) {
    throw new GeographicSceneBuildCancelledError(signal.reason);
  }
}

export function reportGeographicSceneBuildProgress(
  options: GeographicSceneBuildOptions | undefined,
  phase: GeographicSceneBuildPhase,
  completed: number,
  total: number,
  message?: string,
): void {
  if (!options?.onProgress) {
    return;
  }

  const normalizedTotal = Math.max(0, total);
  const normalizedCompleted = Math.min(Math.max(0, completed), normalizedTotal);
  const progress: GeographicSceneBuildProgress = {
    phase,
    completed: normalizedCompleted,
    total: normalizedTotal,
    ratio: normalizedTotal === 0 ? 1 : normalizedCompleted / normalizedTotal,
    ...(message ? { message } : {}),
  };

  options.onProgress(progress);
}

export function createGeographicSceneSignature(scene: unknown): string {
  const payload = removeRootSignature(scene);
  const canonical = JSON.stringify(canonicalize(payload));
  return `${GEOGRAPHIC_SCENE_MODEL_VERSION}:${fnv1a32(canonical)}`;
}

export function finalizeGeographicScene(scene: GeographicSceneDraft): GeographicScene {
  return {
    ...scene,
    signature: createGeographicSceneSignature(scene),
  };
}

export function validateGeographicScenePatchSeams(
  patches: readonly GeographicSceneTerrainPatch[],
): readonly GeographicSceneSeamValidationIssue[] {
  const issues: GeographicSceneSeamValidationIssue[] = [];
  const patchById = new Map<string, GeographicSceneTerrainPatch>();

  for (const patch of patches) {
    if (patchById.has(patch.id)) {
      issues.push({
        code: 'duplicate-patch-id',
        patchId: patch.id,
        edge: 'north',
        neighborPatchId: patch.id,
        message: `Terrain patch id ${patch.id} is duplicated.`,
      });
      continue;
    }
    patchById.set(patch.id, patch);
  }

  const inspectedSeams = new Set<string>();

  for (const patch of patches) {
    for (const seam of patch.seams) {
      const seamKey = createGeographicSceneSeamKey(
        patch.id,
        seam.edge,
        seam.neighborPatchId,
        seam.neighborEdge,
      );
      if (inspectedSeams.has(seamKey)) {
        continue;
      }
      inspectedSeams.add(seamKey);

      if (seam.sampleIds.length === 0) {
        issues.push(createSeamIssue('empty-seam', patch.id, seam, 'Seam has no shared sample ids.'));
      }

      if (seam.neighborPatchId === null) {
        continue;
      }

      const neighbor = patchById.get(seam.neighborPatchId);
      if (!neighbor) {
        issues.push(
          createSeamIssue(
            'missing-neighbor',
            patch.id,
            seam,
            `Neighbor patch ${seam.neighborPatchId} is not present in the scene.`,
          ),
        );
        continue;
      }

      if (seam.neighborEdge === null) {
        issues.push(
          createSeamIssue(
            'missing-neighbor-edge',
            patch.id,
            seam,
            `Seam to ${seam.neighborPatchId} does not identify the neighbor edge.`,
          ),
        );
        continue;
      }

      const reciprocal = neighbor.seams.find(
        (candidate) =>
          candidate.edge === seam.neighborEdge &&
          candidate.neighborPatchId === patch.id &&
          candidate.neighborEdge === seam.edge,
      );

      if (!reciprocal) {
        issues.push(
          createSeamIssue(
            'missing-reciprocal-seam',
            patch.id,
            seam,
            `Neighbor patch ${neighbor.id} does not provide the reciprocal seam.`,
          ),
        );
        continue;
      }

      if (reciprocal.orientation !== seam.orientation) {
        issues.push(
          createSeamIssue(
            'orientation-mismatch',
            patch.id,
            seam,
            `Reciprocal seam orientation differs for ${patch.id} and ${neighbor.id}.`,
          ),
        );
      }

      if (reciprocal.stitchMode !== seam.stitchMode) {
        issues.push(
          createSeamIssue(
            'stitch-mode-mismatch',
            patch.id,
            seam,
            `Reciprocal seam stitch mode differs for ${patch.id} and ${neighbor.id}.`,
          ),
        );
      }

      const reciprocalSamples =
        seam.orientation === 'same-order'
          ? reciprocal.sampleIds
          : [...reciprocal.sampleIds].reverse();
      if (!equalStringArrays(seam.sampleIds, reciprocalSamples)) {
        issues.push(
          createSeamIssue(
            'sample-mismatch',
            patch.id,
            seam,
            `Reciprocal seam samples differ for ${patch.id} and ${neighbor.id}.`,
          ),
        );
      }
    }
  }

  return issues.sort((left, right) =>
    [left.patchId, left.edge, left.code, left.neighborPatchId ?? ''].join('|').localeCompare(
      [right.patchId, right.edge, right.code, right.neighborPatchId ?? ''].join('|'),
    ),
  );
}

function createSeamIssue(
  code: GeographicSceneSeamValidationIssue['code'],
  patchId: string,
  seam: GeographicScenePatchSeam,
  message: string,
): GeographicSceneSeamValidationIssue {
  return {
    code,
    patchId,
    edge: seam.edge,
    neighborPatchId: seam.neighborPatchId,
    message,
  };
}

function equalStringArrays(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function removeRootSignature(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'signature'));
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .filter((key) => value[key] !== undefined)
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fnv1a32(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

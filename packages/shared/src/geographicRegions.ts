import type {
  Biome,
  TopologyKind,
  WorldHexOverlayCoverage,
  WorldHexOverlayLevelId,
  WorldRegionBiomeShare,
  WorldRegionEntity,
  WorldRegionPoint,
  WorldRegionRiverCandidate,
} from './types';

export const GEOGRAPHIC_REGION_ALGORITHM_VERSION = 'geographic-graph-partition-v1' as const;
export const GEOGRAPHIC_REGION_SLIVER_REPAIR_VERSION = 'geographic-sliver-merge-v1' as const;

export type GeographicRegionClassification = 'land' | 'water' | 'mixed' | 'archipelago';

export type GeographicRegionBoundaryKind =
  | 'coastline'
  | 'elevation-break'
  | 'biome-transition'
  | 'climate-transition'
  | 'hydrology-transition'
  | 'plate-boundary'
  | 'distance-balance';

export type GeographicRegionBoundaryRationale = {
  kind: GeographicRegionBoundaryKind;
  edgeCount: number;
  share: number;
};

export type GeographicRegionBounds = {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
  wrapsLongitude: boolean;
};

export type GeographicRegionScaleBudget = {
  overviewLevelId: 'world-500mi';
  targetDisplayLevelId: 'world-60mi';
  overviewHexCount: number;
  targetRegionCount: number;
  preferredOverviewHexesPerRegion: number;
  minOverviewHexesPerRegion: number;
  maxOverviewHexesPerRegion: number;
  minAreaShare: number;
  maxAreaShare: number;
};

export type GeographicRegionDiagnostics = {
  areaShare: number;
  compactness: number;
  cohesion: number;
  connectedComponentCount: number;
  boundaryEdgeCount: number;
  geographicBoundaryShare: number;
  sliver: boolean;
};

export type GeographicWorldRegionV2 = {
  id: string;
  index: number;
  level: 'region';
  parentId: 'primary-world';
  label: string;
  classification: GeographicRegionClassification;
  seedTopologyCellId: number;
  bounds: GeographicRegionBounds;
  center: {
    latitude: number;
    longitude: number;
  };
  topologyCellCount: number;
  areaWeight: number;
  landAreaShare: number;
  waterAreaShare: number;
  dominantBiomes: WorldRegionBiomeShare[];
  highestPoint: WorldRegionPoint | null;
  largestRiver: WorldRegionRiverCandidate | null;
  hexCoverage: WorldHexOverlayCoverage[];
  neighborRegionIds: string[];
  boundaryRationale: GeographicRegionBoundaryRationale[];
  diagnostics: GeographicRegionDiagnostics;
  subdivision: {
    scheme: typeof GEOGRAPHIC_REGION_ALGORITHM_VERSION;
    childLevel: 'subregion';
    status: 'deferred';
  };
};

export type GeographicRegionSetDiagnostics = {
  targetRegionCount: number;
  actualRegionCount: number;
  unassignedCellCount: number;
  disconnectedRegionCount: number;
  sliverRegionCount: number;
  minimumAreaShare: number;
  maximumAreaShare: number;
  meanAreaShare: number;
  geographicBoundaryShare: number;
  coastlineBoundaryShare: number;
  meridionalBoundaryShare: number;
};

export type GeographicRegionRepairSummary = {
  modelVersion: typeof GEOGRAPHIC_REGION_SLIVER_REPAIR_VERSION;
  initialRegionCount: number;
  finalRegionCount: number;
  mergeCount: number;
  unresolvedSliverCount: number;
  merges: Array<{
    removedRegionId: string;
    retainedRegionId: string;
    sharedBoundaryEdges: number;
    geographicBoundaryShare: number;
    sameSurfaceClass: boolean;
  }>;
};

export type GeographicWorldRegionSetV2 = {
  modelVersion: 'world-regions-v2';
  algorithmVersion: typeof GEOGRAPHIC_REGION_ALGORITHM_VERSION;
  scheme: 'geographic-graph-partition';
  regionLevel: 'region';
  sourceTopologyKind: TopologyKind;
  sourceTopologyResolution: number;
  targetDisplayLevelId: WorldHexOverlayLevelId;
  scaleBudget: GeographicRegionScaleBudget;
  membership: {
    encoding: 'uint16-region-index';
    regionIndexByTopologyCell: Uint16Array;
  };
  regions: GeographicWorldRegionV2[];
  crossRegionEntities: WorldRegionEntity[];
  diagnostics: GeographicRegionSetDiagnostics;
  repair?: GeographicRegionRepairSummary;
  signature: string;
};

export type GeographicRegionInputLayers = {
  elevation: Float32Array;
  water: Uint8Array;
  plates: Uint16Array;
  temperature: Float32Array;
  wetness: Float32Array;
  biomes: Uint8Array;
  river: Float32Array;
  lakes: Uint8Array;
};

export type GeographicRegionSeed = {
  topologyCellId: number;
  water: boolean;
};

export type GeographicRegionBuildOptions = {
  seed?: string;
  targetRegionCount?: number;
  maximumCandidateCells?: number;
};

export type GeographicRegionEvaluationSource = 'geographic-graph-partition' | 'lat-lon-grid';

export type GeographicRegionEvaluation = {
  modelVersion: 'geographic-region-evaluation-v1';
  source: GeographicRegionEvaluationSource;
  algorithmVersion: string;
  signature: string;
  validMembership: boolean;
  cellCount: number;
  assignedCellCount: number;
  regionCount: number;
  disconnectedRegionCount: number;
  sliverRegionCount: number;
  minimumAreaShare: number;
  maximumAreaShare: number;
  meanAreaShare: number;
  geographicBoundaryShare: number;
  coastlineBoundaryShare: number;
  meridionalBoundaryShare: number;
  latitudeBoundaryConcentration: number;
  longitudeBoundaryConcentration: number;
  axisBoundaryConcentration: number;
  regionComponentCounts: number[];
  regionCellCounts: number[];
};

export type GeographicRegionBiomeCodeResolver = (code: number) => Biome;

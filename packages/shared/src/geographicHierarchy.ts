import type { TopologyKind } from './types';
import type {
  GeographicRegionBounds,
  GeographicRegionClassification,
  GeographicRegionInputLayers,
  GeographicWorldRegionV2,
} from './geographicRegions';

export const GEOGRAPHIC_HIERARCHY_VERSION = 'geographic-hierarchy-v1' as const;
export const GEOGRAPHIC_ADAPTIVE_SCALE_VERSION = 'adaptive-world-hex-scale-v1' as const;
export const GEOGRAPHIC_CHILD_PARTITION_VERSION = 'geographic-child-partition-v1' as const;

export type GeographicHierarchyLevel = 'macro-area' | 'region' | 'subregion' | 'local' | 'detail';
export type GeographicMacroAreaKind = 'continent' | 'archipelago' | 'ocean-basin';

export type GeographicAdaptiveHexScale = {
  modelVersion: typeof GEOGRAPHIC_ADAPTIVE_SCALE_VERSION;
  id: string;
  nominalHexWidthMiles: number;
  verticalSpacingMiles: number;
  worldColumns: number;
  worldRows: number;
  targetViewportColumns: number;
  targetViewportRows: number;
  minimumViewportColumns: number;
  minimumViewportRows: number;
  maximumViewportColumns: number;
  maximumViewportRows: number;
  exactParentHexCount: number;
  contextualHexCount: number;
  origin: 'world-equirectangular-pointy-odd-r';
  idFormat: string;
};

export type GeographicHierarchyMapExtent = GeographicRegionBounds & {
  qMin: number;
  qMax: number;
  rMin: number;
  rMax: number;
  columns: number;
  rows: number;
  contextPaddingHexes: number;
  selectedMembershipFitsMaximum: boolean;
};

export type GeographicMacroArea = {
  id: string;
  index: number;
  level: 'macro-area';
  parentId: 'primary-world';
  kind: GeographicMacroAreaKind;
  sourceDomainIds: string[];
  label: string;
  classification: GeographicRegionClassification;
  topologyCellCount: number;
  areaWeight: number;
  landAreaShare: number;
  waterAreaShare: number;
  bounds: GeographicRegionBounds;
  labelPoint: {
    topologyCellId: number;
    latitude: number;
    longitude: number;
  };
  childRegionIds: string[];
  provisional: boolean;
};

export type GeographicMacroAreaSet = {
  modelVersion: typeof GEOGRAPHIC_HIERARCHY_VERSION;
  algorithmVersion: string;
  sourceTopologyKind: TopologyKind;
  sourceTopologyResolution: number;
  membership: {
    encoding: 'uint16-macro-area-index';
    macroAreaIndexByTopologyCell: Uint16Array;
  };
  macroAreas: GeographicMacroArea[];
  signature: string;
};

export type GeographicHierarchyNode = {
  id: string;
  index: number;
  level: Exclude<GeographicHierarchyLevel, 'macro-area'>;
  parentId: string;
  label: string;
  classification: GeographicRegionClassification;
  seedTopologyCellId: number;
  topologyCellCount: number;
  areaWeight: number;
  landAreaShare: number;
  waterAreaShare: number;
  bounds: GeographicRegionBounds;
  labelPoint: {
    topologyCellId: number;
    latitude: number;
    longitude: number;
  };
  neighborIds: string[];
  exactHexCount: number;
};

export type GeographicHierarchyPartition = {
  modelVersion: typeof GEOGRAPHIC_HIERARCHY_VERSION;
  algorithmVersion: typeof GEOGRAPHIC_CHILD_PARTITION_VERSION;
  hierarchyLevel: Exclude<GeographicHierarchyLevel, 'macro-area'>;
  parentLevel: Exclude<GeographicHierarchyLevel, 'detail'>;
  parentId: string;
  sourceTopologyKind: TopologyKind;
  sourceTopologyResolution: number;
  scale: GeographicAdaptiveHexScale;
  extent: GeographicHierarchyMapExtent;
  membership: {
    encoding: 'uint16-child-index';
    childIndexByTopologyCell: Uint16Array;
  };
  children: GeographicHierarchyNode[];
  signature: string;
};

export type GeographicHierarchySelection = {
  level: GeographicHierarchyLevel;
  id: string;
};

export type GeographicHierarchyBuildInput = {
  projectId: string;
  worldSeed: string;
  topologyResolution: number;
  layers: GeographicRegionInputLayers;
  firstLevelRegions: GeographicWorldRegionV2[];
};

import type {
  GeographicAdaptiveHexScale,
  GeographicHierarchyMapExtent,
} from './geographicHierarchy';
import type {
  HexTileBiome,
  HexTileEdge,
  HexTileFeature,
  HexTileFeatureDetail,
  HexTileMorphology,
  TopologyKind,
} from './index';

export const GEOGRAPHIC_TILE_WINDOW_VERSION = 'geographic-tile-window-v1' as const;
export const GEOGRAPHIC_TILE_CLASSIFIER_VERSION = 'geographic-tile-classifier-v1' as const;

export type GeographicTileMembershipRole = 'parent' | 'context';

export type GeographicTileWindowTile = {
  id: string;
  q: number;
  r: number;
  longitude: number;
  latitude: number;
  topologyCell: number;
  membershipRole: GeographicTileMembershipRole;
  childIndex: number | null;
  plateId: number;
  biome: HexTileBiome;
  morphology: HexTileMorphology;
  terrainType: string;
  features: HexTileFeature[];
  featureDetails: HexTileFeatureDetail[];
  minorRiverEdges: HexTileEdge[];
  navigableRiverEdges: HexTileEdge[];
  ridgeEdges: HexTileEdge[];
  navigableRiverCenter: boolean;
  riverStrength: number;
  elevation: number;
  slope: number;
  temperatureC: number;
  wetness: number;
  volcanism: number;
  water: boolean;
  ice: boolean;
};

export type GeographicTileWindow = {
  modelVersion: typeof GEOGRAPHIC_TILE_WINDOW_VERSION;
  classifierVersion: typeof GEOGRAPHIC_TILE_CLASSIFIER_VERSION;
  sourceProjectId: string;
  sourceWorldId: string;
  worldSeed: string;
  sourceTopologyKind: TopologyKind;
  sourceTopologyResolution: number;
  scale: GeographicAdaptiveHexScale;
  extent: GeographicHierarchyMapExtent;
  dimensions: {
    columns: number;
    rows: number;
    orientation: 'pointy-top-odd-r';
    wrapsLongitude: boolean;
  };
  tiles: GeographicTileWindowTile[];
  signature: string;
};

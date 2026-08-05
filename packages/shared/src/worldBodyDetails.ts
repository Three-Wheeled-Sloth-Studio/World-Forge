import type { Resolution } from './types';

export const WORLD_BODY_DETAIL_SCHEMA = 'world-forge-body-detail-v1' as const;

export type WorldBodyDetailTier = 'catalog' | 'presentation' | 'reference-surface' | 'geographic';
export type WorldBodyDetailOrigin = 'imported' | 'derived' | 'generated' | 'authored' | 'edited';
export type WorldBodyView = 'globe' | 'map' | 'explorer';

export type WorldBodyShapeModelV1 =
  | { kind: 'sphere' }
  | { kind: 'oblate-spheroid'; equatorialRadiusKm: number; polarRadiusKm: number }
  | { kind: 'triaxial-ellipsoid'; axisAKm: number; axisBKm: number; axisCKm: number }
  | { kind: 'irregular-mesh'; fallbackAxesKm?: { axisAKm: number; axisBKm: number; axisCKm: number } };

export type WorldBodyAssetRole =
  | 'albedo'
  | 'elevation'
  | 'radial-displacement'
  | 'mesh'
  | 'normal'
  | 'roughness'
  | 'clouds'
  | 'rings'
  | 'material-map'
  | 'feature-catalog';

export type NumericRasterDataType = 'uint8' | 'uint16' | 'int16' | 'float32';
export type NumericRasterByteOrder = 'little-endian' | 'big-endian';
export type NumericRasterInterpretation = 'absolute-elevation' | 'radius' | 'normalized-displacement' | 'scalar';

export type NumericRasterRangeV1 = {
  min: number;
  max: number;
};

export type NumericRasterNoDataV1 =
  | { kind: 'value'; value: number }
  | { kind: 'mask-asset'; assetId: string };

export type NumericRasterDescriptorV1 = {
  dataType: NumericRasterDataType;
  byteOrder?: NumericRasterByteOrder;
  units: string;
  scale: number;
  offset: number;
  datum?: string;
  noData?: NumericRasterNoDataV1;
  sourceRange?: NumericRasterRangeV1;
  preparedRange?: NumericRasterRangeV1;
  interpretation: NumericRasterInterpretation;
};

export type WorldBodyAssetRefV1 = {
  assetId: string;
  role: WorldBodyAssetRole;
  logicalPath: string;
  mediaType: string;
  encoding?: string;
  resolution?: Resolution;
  numericRaster?: NumericRasterDescriptorV1;
  byteLength?: number;
  sha256?: string;
  optional?: boolean;
};

type WorldBodyDetailBaseV1 = {
  schema: typeof WORLD_BODY_DETAIL_SCHEMA;
  tier: WorldBodyDetailTier;
  origin: WorldBodyDetailOrigin;
  assets?: WorldBodyAssetRefV1[];
};

export type CatalogBodyDetailV1 = WorldBodyDetailBaseV1 & {
  kind: 'catalog';
  tier: 'catalog';
  shape: WorldBodyShapeModelV1;
};

export type AtmosphericPresentationDetailV1 = WorldBodyDetailBaseV1 & {
  kind: 'atmospheric-presentation';
  tier: 'presentation';
  shape: Extract<WorldBodyShapeModelV1, { kind: 'sphere' | 'oblate-spheroid' }>;
  atmosphere: {
    paletteHex: string[];
    bandCount: number;
    bandContrast: number;
    hazeStrength: number;
    differentialRotationFraction?: number;
    storms?: Array<{
      id: string;
      label?: string;
      latitudeDeg: number;
      longitudeDeg: number;
      angularRadiusDeg: number;
    }>;
  };
  rings?: {
    innerRadiusRatio: number;
    outerRadiusRatio: number;
    opacity: number;
    tiltDeg: number;
  };
};

export type RasterSurfaceDetailV1 = WorldBodyDetailBaseV1 & {
  kind: 'raster-surface';
  tier: 'reference-surface';
  shape: Exclude<WorldBodyShapeModelV1, { kind: 'irregular-mesh' }>;
  projection: 'equirectangular';
  resolution: Resolution;
  layerRoles: Array<Extract<WorldBodyAssetRole, 'albedo' | 'elevation' | 'radial-displacement' | 'normal' | 'roughness' | 'material-map' | 'feature-catalog'>>;
};

export type IrregularMeshDetailV1 = WorldBodyDetailBaseV1 & {
  kind: 'irregular-mesh';
  tier: 'reference-surface';
  shape: Extract<WorldBodyShapeModelV1, { kind: 'irregular-mesh' }>;
};

export type GeographicSurfaceDetailV1 = WorldBodyDetailBaseV1 & {
  kind: 'geographic-surface';
  tier: 'geographic';
  shape: Exclude<WorldBodyShapeModelV1, { kind: 'irregular-mesh' }>;
  surfaceContract: 'PrimaryWorld';
};

export type PopulationDetailV1 = WorldBodyDetailBaseV1 & {
  kind: 'population';
  tier: 'catalog' | 'presentation';
  distribution: {
    innerRadiusKm: number;
    outerRadiusKm: number;
    verticalSpreadKm: number;
    inclinationMeanDeg?: number;
    eccentricityMean?: number;
    relativeDensity: number;
  };
  realizationSeed: string;
  maxPreviewParticles: number;
};

export type WorldBodyDetailV1 =
  | CatalogBodyDetailV1
  | AtmosphericPresentationDetailV1
  | RasterSurfaceDetailV1
  | IrregularMeshDetailV1
  | GeographicSurfaceDetailV1
  | PopulationDetailV1;

export function worldBodyDetailSupportsView(detail: WorldBodyDetailV1 | undefined, view: WorldBodyView): boolean {
  if (!detail) return false;
  if (detail.kind === 'geographic-surface') return true;
  if (detail.kind === 'raster-surface') return view === 'globe' || view === 'map';
  if (detail.kind === 'irregular-mesh' || detail.kind === 'atmospheric-presentation') return view === 'globe';
  return false;
}

export function worldBodyDetailCapabilities(detail: WorldBodyDetailV1 | undefined): {
  globe: boolean;
  map: boolean;
  explorer: boolean;
  irregularShape: boolean;
} {
  return {
    globe: worldBodyDetailSupportsView(detail, 'globe'),
    map: worldBodyDetailSupportsView(detail, 'map'),
    explorer: worldBodyDetailSupportsView(detail, 'explorer'),
    irregularShape: detail?.kind === 'irregular-mesh'
      || (detail?.kind === 'catalog' && detail.shape.kind === 'irregular-mesh'),
  };
}

export function isWorldBodyDetail(value: unknown): value is WorldBodyDetailV1 {
  if (!isRecord(value) || value.schema !== WORLD_BODY_DETAIL_SCHEMA || !isOrigin(value.origin)) return false;
  if (value.assets !== undefined && (!Array.isArray(value.assets) || !value.assets.every(isAssetRef))) return false;

  switch (value.kind) {
    case 'catalog':
      return value.tier === 'catalog' && isShape(value.shape);
    case 'atmospheric-presentation':
      return value.tier === 'presentation'
        && isAtmosphericShape(value.shape)
        && isAtmosphere(value.atmosphere)
        && (value.rings === undefined || isRings(value.rings));
    case 'raster-surface':
      return value.tier === 'reference-surface'
        && isRasterShape(value.shape)
        && value.projection === 'equirectangular'
        && isResolution(value.resolution)
        && Array.isArray(value.layerRoles)
        && value.layerRoles.length > 0
        && value.layerRoles.every((role) => ['albedo', 'elevation', 'radial-displacement', 'normal', 'roughness', 'material-map', 'feature-catalog'].includes(String(role)))
        && Array.isArray(value.assets)
        && value.assets.length > 0;
    case 'irregular-mesh':
      return value.tier === 'reference-surface'
        && isRecord(value.shape)
        && value.shape.kind === 'irregular-mesh'
        && isShape(value.shape)
        && Array.isArray(value.assets)
        && value.assets.some((asset) => isRecord(asset) && asset.role === 'mesh');
    case 'geographic-surface':
      return value.tier === 'geographic'
        && value.surfaceContract === 'PrimaryWorld'
        && isRasterShape(value.shape);
    case 'population':
      return (value.tier === 'catalog' || value.tier === 'presentation')
        && isDistribution(value.distribution)
        && Boolean(cleanText(value.realizationSeed))
        && positiveInteger(value.maxPreviewParticles);
    default:
      return false;
  }
}

function isAssetRef(value: unknown): boolean {
  if (!isRecord(value) || !cleanText(value.assetId) || !cleanText(value.mediaType)) return false;
  if (!['albedo', 'elevation', 'radial-displacement', 'mesh', 'normal', 'roughness', 'clouds', 'rings', 'material-map', 'feature-catalog'].includes(String(value.role))) return false;
  if (!safeLogicalPath(value.logicalPath)) return false;
  if (value.encoding !== undefined && !cleanText(value.encoding)) return false;
  if (value.resolution !== undefined && !isResolution(value.resolution)) return false;
  if (value.numericRaster !== undefined) {
    if (!['elevation', 'radial-displacement', 'roughness', 'material-map'].includes(String(value.role))) return false;
    if (!isResolution(value.resolution) || !isNumericRasterDescriptor(value.numericRaster)) return false;
  }
  if (value.byteLength !== undefined && !nonNegativeInteger(value.byteLength)) return false;
  if (value.sha256 !== undefined && !isSha256(value.sha256)) return false;
  return value.optional === undefined || typeof value.optional === 'boolean';
}

function isNumericRasterDescriptor(value: unknown): value is NumericRasterDescriptorV1 {
  if (!isRecord(value)) return false;
  if (!['uint8', 'uint16', 'int16', 'float32'].includes(String(value.dataType))) return false;
  if (!cleanText(value.units) || !finiteNumber(value.scale) || Number(value.scale) === 0 || !finiteNumber(value.offset)) return false;
  if (!['absolute-elevation', 'radius', 'normalized-displacement', 'scalar'].includes(String(value.interpretation))) return false;
  const multiByte = value.dataType !== 'uint8';
  if (multiByte && !['little-endian', 'big-endian'].includes(String(value.byteOrder))) return false;
  if (!multiByte && value.byteOrder !== undefined) return false;
  if (value.datum !== undefined && !cleanText(value.datum)) return false;
  if (value.noData !== undefined && !isNumericRasterNoData(value.noData)) return false;
  if (value.sourceRange !== undefined && !isNumericRasterRange(value.sourceRange)) return false;
  return value.preparedRange === undefined || isNumericRasterRange(value.preparedRange);
}

function isNumericRasterNoData(value: unknown): value is NumericRasterNoDataV1 {
  if (!isRecord(value)) return false;
  if (value.kind === 'value') return finiteNumber(value.value);
  return value.kind === 'mask-asset' && Boolean(cleanText(value.assetId));
}

function isNumericRasterRange(value: unknown): value is NumericRasterRangeV1 {
  return isRecord(value)
    && finiteNumber(value.min)
    && finiteNumber(value.max)
    && Number(value.max) >= Number(value.min);
}

function isShape(value: unknown): value is WorldBodyShapeModelV1 {
  if (!isRecord(value)) return false;
  if (value.kind === 'sphere') return true;
  if (value.kind === 'oblate-spheroid') return positiveNumber(value.equatorialRadiusKm) && positiveNumber(value.polarRadiusKm);
  if (value.kind === 'triaxial-ellipsoid') return positiveNumber(value.axisAKm) && positiveNumber(value.axisBKm) && positiveNumber(value.axisCKm);
  if (value.kind === 'irregular-mesh') return value.fallbackAxesKm === undefined || isAxes(value.fallbackAxesKm);
  return false;
}

function isAtmosphericShape(value: unknown): boolean {
  return isRecord(value) && (value.kind === 'sphere' || value.kind === 'oblate-spheroid') && isShape(value);
}

function isRasterShape(value: unknown): boolean {
  return isRecord(value) && value.kind !== 'irregular-mesh' && isShape(value);
}

function isAxes(value: unknown): boolean {
  return isRecord(value) && positiveNumber(value.axisAKm) && positiveNumber(value.axisBKm) && positiveNumber(value.axisCKm);
}

function isAtmosphere(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.paletteHex) || value.paletteHex.length < 1 || !value.paletteHex.every(isHexColor)) return false;
  if (!nonNegativeInteger(value.bandCount) || !unitInterval(value.bandContrast) || !unitInterval(value.hazeStrength)) return false;
  if (value.differentialRotationFraction !== undefined && !unitInterval(value.differentialRotationFraction)) return false;
  return value.storms === undefined || (Array.isArray(value.storms) && value.storms.every(isStorm));
}

function isStorm(value: unknown): boolean {
  return isRecord(value)
    && Boolean(cleanText(value.id))
    && optionalCleanText(value.label)
    && finiteNumber(value.latitudeDeg)
    && finiteNumber(value.longitudeDeg)
    && positiveNumber(value.angularRadiusDeg);
}

function isRings(value: unknown): boolean {
  return isRecord(value)
    && positiveNumber(value.innerRadiusRatio)
    && positiveNumber(value.outerRadiusRatio)
    && Number(value.outerRadiusRatio) > Number(value.innerRadiusRatio)
    && unitInterval(value.opacity)
    && finiteNumber(value.tiltDeg);
}

function isDistribution(value: unknown): boolean {
  return isRecord(value)
    && positiveNumber(value.innerRadiusKm)
    && positiveNumber(value.outerRadiusKm)
    && Number(value.outerRadiusKm) > Number(value.innerRadiusKm)
    && nonNegativeNumber(value.verticalSpreadKm)
    && optionalFinite(value.inclinationMeanDeg)
    && optionalUnitInterval(value.eccentricityMean)
    && positiveNumber(value.relativeDensity);
}

function isResolution(value: unknown): value is Resolution {
  return isRecord(value) && positiveInteger(value.width) && positiveInteger(value.height);
}

function isOrigin(value: unknown): value is WorldBodyDetailOrigin {
  return ['imported', 'derived', 'generated', 'authored', 'edited'].includes(String(value));
}

function isHexColor(value: unknown): boolean {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

function isSha256(value: unknown): boolean {
  return typeof value === 'string' && /^sha256:[0-9a-f]{64}$/i.test(value);
}

function safeLogicalPath(value: unknown): boolean {
  const path = cleanText(value);
  return Boolean(path) && !path!.startsWith('/') && !/^[A-Za-z]:/.test(path!) && !path!.split('/').includes('..');
}

function positiveNumber(value: unknown): boolean {
  return finiteNumber(value) && Number(value) > 0;
}

function nonNegativeNumber(value: unknown): boolean {
  return finiteNumber(value) && Number(value) >= 0;
}

function positiveInteger(value: unknown): boolean {
  return Number.isInteger(value) && Number(value) > 0;
}

function nonNegativeInteger(value: unknown): boolean {
  return Number.isInteger(value) && Number(value) >= 0;
}

function finiteNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

function unitInterval(value: unknown): boolean {
  return finiteNumber(value) && Number(value) >= 0 && Number(value) <= 1;
}

function optionalFinite(value: unknown): boolean {
  return value === undefined || finiteNumber(value);
}

function optionalUnitInterval(value: unknown): boolean {
  return value === undefined || unitInterval(value);
}

function optionalCleanText(value: unknown): boolean {
  return value === undefined || Boolean(cleanText(value));
}

function cleanText(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  WORLD_BODY_DETAIL_SCHEMA,
  isWorldBodyDetail,
  type RasterSurfaceDetailV1,
  type WorldBodyAssetRefV1,
  type WorldBodyDetailOrigin,
  type WorldBodyShapeModelV1,
} from '../packages/shared/src/worldBodyDetails';

export const REFERENCE_BODY_BUNDLE_SCHEMA = 'world-forge-reference-body-bundle-v1' as const;

export type ReferenceBodySourceV1 = {
  sourceId: string;
  title: string;
  publisher: string;
  url: string;
  license: string;
  credit?: string;
  role: string;
};

export type ReferenceBodyBundleAssetV1 = WorldBodyAssetRefV1 & {
  file: string;
  origin: WorldBodyDetailOrigin;
  transform?: Record<string, unknown>;
};

export type ReferenceBodyBundleManifestV1 = {
  schema: typeof REFERENCE_BODY_BUNDLE_SCHEMA;
  bodyId: string;
  name: string;
  detailKind: 'raster-surface';
  shape: Exclude<WorldBodyShapeModelV1, { kind: 'irregular-mesh' }>;
  projection: 'equirectangular';
  resolution: { width: number; height: number };
  sources: ReferenceBodySourceV1[];
  assets: ReferenceBodyBundleAssetV1[];
  notes?: string[];
};

export type LoadedReferenceBodyBundle = {
  manifest: ReferenceBodyBundleManifestV1;
  detail: RasterSurfaceDetailV1;
  payloads: Record<string, Uint8Array>;
};

export async function loadReferenceBodyBundle(directory: string): Promise<LoadedReferenceBodyBundle> {
  const root = path.resolve(directory);
  const manifestPath = path.join(root, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as ReferenceBodyBundleManifestV1;
  if (!isReferenceBodyBundleManifest(manifest)) {
    throw new Error(`Invalid reference body bundle manifest at ${manifestPath}.`);
  }

  const payloads: Record<string, Uint8Array> = {};
  for (const asset of manifest.assets) {
    const bytes = Uint8Array.from(await readFile(path.join(root, safeRelativePath(asset.file))));
    if (bytes.byteLength !== asset.byteLength) {
      throw new Error(`${asset.file} expected ${asset.byteLength} bytes but found ${bytes.byteLength}.`);
    }
    validatePayloadShape(asset, bytes);
    const digest = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
    if (digest !== asset.sha256!.toLowerCase()) {
      throw new Error(`${asset.file} checksum does not match its manifest.`);
    }
    payloads[asset.assetId] = bytes;
  }

  const detail: RasterSurfaceDetailV1 = {
    schema: WORLD_BODY_DETAIL_SCHEMA,
    kind: 'raster-surface',
    tier: 'reference-surface',
    origin: combinedOrigin(manifest.assets),
    shape: manifest.shape,
    projection: manifest.projection,
    resolution: manifest.resolution,
    layerRoles: [...new Set(manifest.assets.map((asset) => asset.role))] as RasterSurfaceDetailV1['layerRoles'],
    assets: manifest.assets.map(({ file: _file, origin: _origin, transform: _transform, ...asset }) => asset),
  };
  if (!isWorldBodyDetail(detail)) {
    throw new Error(`Reference body bundle for ${manifest.bodyId} does not produce a valid raster-surface detail.`);
  }

  return { manifest, detail, payloads };
}

export function isReferenceBodyBundleManifest(value: unknown): value is ReferenceBodyBundleManifestV1 {
  if (!isRecord(value) || value.schema !== REFERENCE_BODY_BUNDLE_SCHEMA) return false;
  if (!cleanText(value.bodyId) || !cleanText(value.name) || value.detailKind !== 'raster-surface') return false;
  if (!isRasterShape(value.shape) || value.projection !== 'equirectangular' || !isResolution(value.resolution)) return false;
  if (!Array.isArray(value.sources) || value.sources.length < 1 || !value.sources.every(isSource)) return false;
  if (!Array.isArray(value.assets) || value.assets.length < 1 || !value.assets.every(isBundleAsset)) return false;
  if (value.notes !== undefined && (!Array.isArray(value.notes) || !value.notes.every((note) => Boolean(cleanText(note))))) return false;

  const ids = new Set<string>();
  const files = new Set<string>();
  const logicalPaths = new Set<string>();
  for (const asset of value.assets) {
    if (ids.has(asset.assetId) || files.has(asset.file) || logicalPaths.has(asset.logicalPath)) return false;
    ids.add(asset.assetId);
    files.add(asset.file);
    logicalPaths.add(asset.logicalPath);
    if (asset.resolution?.width !== value.resolution.width || asset.resolution?.height !== value.resolution.height) return false;
    if (!asset.logicalPath.startsWith(`bodies/${safePathSegment(value.bodyId)}/`)) return false;
  }
  return true;
}

function isSource(value: unknown): boolean {
  return isRecord(value)
    && Boolean(cleanText(value.sourceId))
    && Boolean(cleanText(value.title))
    && Boolean(cleanText(value.publisher))
    && Boolean(cleanText(value.url))
    && Boolean(cleanText(value.license))
    && Boolean(cleanText(value.role))
    && (value.credit === undefined || Boolean(cleanText(value.credit)));
}

function isBundleAsset(value: unknown): value is ReferenceBodyBundleAssetV1 {
  if (!isRecord(value) || !safeRelativePathValue(value.file)) return false;
  if (!['imported', 'derived', 'generated', 'authored', 'edited'].includes(String(value.origin))) return false;
  if (!cleanText(value.assetId) || !cleanText(value.logicalPath) || !cleanText(value.mediaType)) return false;
  if (!['albedo', 'elevation', 'radial-displacement', 'normal', 'roughness', 'material-map', 'feature-catalog'].includes(String(value.role))) return false;
  if (!isResolution(value.resolution)) return false;
  if (!Number.isInteger(value.byteLength) || Number(value.byteLength) <= 0) return false;
  if (typeof value.sha256 !== 'string' || !/^sha256:[0-9a-f]{64}$/i.test(value.sha256)) return false;
  if (value.encoding !== undefined && !cleanText(value.encoding)) return false;
  if (value.transform !== undefined && !isRecord(value.transform)) return false;

  const detail: RasterSurfaceDetailV1 = {
    schema: WORLD_BODY_DETAIL_SCHEMA,
    kind: 'raster-surface',
    tier: 'reference-surface',
    origin: value.origin as WorldBodyDetailOrigin,
    shape: { kind: 'sphere' },
    projection: 'equirectangular',
    resolution: value.resolution as { width: number; height: number },
    layerRoles: [value.role as RasterSurfaceDetailV1['layerRoles'][number]],
    assets: [value as unknown as WorldBodyAssetRefV1],
  };
  return isWorldBodyDetail(detail);
}

function validatePayloadShape(asset: ReferenceBodyBundleAssetV1, bytes: Uint8Array): void {
  const resolution = asset.resolution!;
  if (asset.mediaType === 'application/vnd.world-forge.rgb565' && asset.encoding === 'rgb565-le') {
    const expectedBytes = resolution.width * resolution.height * 2;
    if (bytes.byteLength !== expectedBytes) {
      throw new Error(`${asset.file} expected ${expectedBytes} RGB565 bytes but found ${bytes.byteLength}.`);
    }
    return;
  }
  if (asset.mediaType === 'application/vnd.world-forge.numeric-raster' && asset.numericRaster) {
    const expectedBytes = resolution.width * resolution.height * bytesPerElement(asset.numericRaster.dataType);
    if (bytes.byteLength !== expectedBytes) {
      throw new Error(`${asset.file} expected ${expectedBytes} numeric raster bytes but found ${bytes.byteLength}.`);
    }
    return;
  }
  if (asset.mediaType.startsWith('image/')) return;
  if (asset.role === 'feature-catalog' && asset.mediaType === 'application/json') return;
  throw new Error(`Unsupported reference body payload ${asset.mediaType}${asset.encoding ? ` (${asset.encoding})` : ''}.`);
}

function bytesPerElement(dataType: string): number {
  switch (dataType) {
    case 'uint8': return 1;
    case 'uint16':
    case 'int16': return 2;
    case 'float32': return 4;
    default: throw new Error(`Unsupported numeric raster data type ${dataType}.`);
  }
}

function combinedOrigin(assets: ReferenceBodyBundleAssetV1[]): WorldBodyDetailOrigin {
  const origins = new Set(assets.map((asset) => asset.origin));
  if (origins.size === 1) return assets[0].origin;
  return origins.has('edited') ? 'edited' : origins.has('authored') ? 'authored' : origins.has('derived') ? 'derived' : 'imported';
}

function isRasterShape(value: unknown): value is Exclude<WorldBodyShapeModelV1, { kind: 'irregular-mesh' }> {
  if (!isRecord(value)) return false;
  if (value.kind === 'sphere') return true;
  if (value.kind === 'oblate-spheroid') return positiveNumber(value.equatorialRadiusKm) && positiveNumber(value.polarRadiusKm);
  return value.kind === 'triaxial-ellipsoid'
    && positiveNumber(value.axisAKm)
    && positiveNumber(value.axisBKm)
    && positiveNumber(value.axisCKm);
}

function isResolution(value: unknown): value is { width: number; height: number } {
  return isRecord(value) && positiveInteger(value.width) && positiveInteger(value.height);
}

function safeRelativePath(value: string): string {
  const normalized = path.normalize(value);
  if (path.isAbsolute(normalized) || normalized.startsWith('..') || normalized.includes(`..${path.sep}`)) {
    throw new Error(`Reference body asset path must remain inside the bundle: ${value}`);
  }
  return normalized;
}

function safeRelativePathValue(value: unknown): value is string {
  if (!cleanText(value)) return false;
  try {
    safeRelativePath(String(value));
    return true;
  } catch {
    return false;
  }
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

function positiveNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function positiveInteger(value: unknown): boolean {
  return Number.isInteger(value) && Number(value) > 0;
}

function cleanText(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

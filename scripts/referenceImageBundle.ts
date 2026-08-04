import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const REFERENCE_IMAGE_BUNDLE_SCHEMA = 'world-forge-reference-image-bundle-v1' as const;

export type ReferenceImageBundleManifestV1 = {
  schema: typeof REFERENCE_IMAGE_BUNDLE_SCHEMA;
  bodyId: string;
  sourceId: string;
  sourcePage: string;
  sourceAsset: string;
  credit: string;
  file: string;
  mediaType: string;
  projection: 'equirectangular';
  resolution: { width: number; height: number };
  byteLength: number;
  sha256: string;
};

export type LoadedReferenceImageBundle = ReferenceImageBundleManifestV1 & {
  bytes: Uint8Array;
};

export async function loadReferenceImageBundle(directory: string): Promise<LoadedReferenceImageBundle> {
  const manifestPath = path.join(directory, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as ReferenceImageBundleManifestV1;
  if (!isReferenceImageBundleManifest(manifest)) {
    throw new Error(`Invalid reference image bundle manifest at ${manifestPath}.`);
  }
  const bytes = Uint8Array.from(await readFile(path.join(directory, manifest.file)));
  if (bytes.byteLength !== manifest.byteLength) {
    throw new Error(`Reference image bundle expected ${manifest.byteLength} bytes but found ${bytes.byteLength}.`);
  }
  return { ...manifest, bytes };
}

export function readJpegResolution(bytes: Uint8Array): { width: number; height: number } {
  if (bytes.byteLength < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error('Reference image is not a JPEG file.');
  }
  let offset = 2;
  while (offset + 3 < bytes.byteLength) {
    while (offset < bytes.byteLength && bytes[offset] !== 0xff) offset += 1;
    while (offset < bytes.byteLength && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.byteLength) break;
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 1 >= bytes.byteLength) break;
    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.byteLength) break;
    if (isStartOfFrameMarker(marker)) {
      if (segmentLength < 7) break;
      const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      if (width <= 0 || height <= 0) break;
      return { width, height };
    }
    offset += segmentLength;
  }
  throw new Error('Unable to read JPEG dimensions from reference image.');
}

export function isReferenceImageBundleManifest(value: unknown): value is ReferenceImageBundleManifestV1 {
  if (!isRecord(value) || value.schema !== REFERENCE_IMAGE_BUNDLE_SCHEMA) return false;
  if (!cleanText(value.bodyId) || !cleanText(value.sourceId) || !cleanText(value.sourcePage) || !cleanText(value.sourceAsset)) return false;
  if (!cleanText(value.credit) || !cleanText(value.file) || value.mediaType !== 'image/jpeg' || value.projection !== 'equirectangular') return false;
  if (!isRecord(value.resolution) || !positiveInteger(value.resolution.width) || !positiveInteger(value.resolution.height)) return false;
  if (!Number.isInteger(value.byteLength) || Number(value.byteLength) <= 0) return false;
  return typeof value.sha256 === 'string' && /^sha256:[0-9a-f]{64}$/i.test(value.sha256);
}

function isStartOfFrameMarker(marker: number): boolean {
  return [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker);
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

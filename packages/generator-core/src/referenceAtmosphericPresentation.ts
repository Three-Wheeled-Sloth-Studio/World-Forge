import type { Resolution, WorldProject } from '@world-forge/shared';
import type {
  AtmosphericPresentationDetailV1,
  WorldBodyAssetRefV1,
} from '@world-forge/shared/worldBodyDetails';
import {
  readWorldBodyCatalog,
  type MultiBodyWorldProject,
} from '@world-forge/shared/worldBodies';

export const REFERENCE_ATMOSPHERIC_APPEARANCE_SCHEMA = 'world-forge-reference-atmospheric-appearance-v1' as const;

export type ReferenceAtmosphericAppearanceV1 = {
  schema: typeof REFERENCE_ATMOSPHERIC_APPEARANCE_SCHEMA;
  bodyId: string;
  assetId: string;
  logicalPath: string;
  mediaType: string;
  encoding?: string;
  bytes: Uint8Array;
  resolution?: Resolution;
};

export function attachReferenceAtmosphericAppearance(
  project: WorldProject,
  appearance: ReferenceAtmosphericAppearanceV1,
): MultiBodyWorldProject {
  validateAppearance(appearance);
  const catalog = readWorldBodyCatalog(project);
  const bodyIndex = catalog.bodies.findIndex((body) => body.bodyId === appearance.bodyId);
  if (bodyIndex < 0) {
    throw new Error(`Reference atmospheric appearance targets unknown body "${appearance.bodyId}".`);
  }
  const existing = catalog.bodies[bodyIndex];
  if (existing.detail?.kind !== 'atmospheric-presentation') {
    throw new Error(`Reference atmospheric appearance requires an atmospheric-presentation body, received "${existing.detail?.kind ?? 'none'}".`);
  }

  const asset: WorldBodyAssetRefV1 = {
    assetId: appearance.assetId,
    role: 'albedo',
    logicalPath: appearance.logicalPath,
    mediaType: appearance.mediaType,
    encoding: appearance.encoding,
    resolution: appearance.resolution,
    byteLength: appearance.bytes.byteLength,
  };
  const detail: AtmosphericPresentationDetailV1 = {
    ...existing.detail,
    origin: 'imported',
    assets: [
      ...(existing.detail.assets ?? []).filter((candidate) => candidate.assetId !== asset.assetId && candidate.role !== 'albedo'),
      asset,
    ],
  };
  const bodies = catalog.bodies.map((body, index) => index === bodyIndex
    ? {
        ...body,
        dataOrigin: 'imported' as const,
        capabilities: {
          ...body.capabilities,
          globe: true,
          map: false,
          explorer: false,
        },
        detail,
      }
    : body);
  const existingPayloads = (project as MultiBodyWorldProject).bodyAssetPayloads ?? {};

  return {
    ...project,
    bodyCatalog: { ...catalog, bodies },
    bodyAssetPayloads: {
      ...existingPayloads,
      [appearance.assetId]: Uint8Array.from(appearance.bytes),
    },
  };
}

function validateAppearance(appearance: ReferenceAtmosphericAppearanceV1): void {
  if (appearance.schema !== REFERENCE_ATMOSPHERIC_APPEARANCE_SCHEMA) {
    throw new Error('Unsupported reference atmospheric appearance schema.');
  }
  if (!cleanText(appearance.bodyId) || !cleanText(appearance.assetId)) {
    throw new Error('Reference atmospheric appearance requires bodyId and assetId.');
  }
  if (!(appearance.bytes instanceof Uint8Array) || appearance.bytes.byteLength === 0) {
    throw new Error('Reference atmospheric appearance requires non-empty binary appearance bytes.');
  }
  const bodyRoot = `bodies/${safePathSegment(appearance.bodyId)}/`;
  if (!safeLogicalPath(appearance.logicalPath) || !appearance.logicalPath.startsWith(bodyRoot)) {
    throw new Error(`Reference atmospheric appearance must use a body-local path below ${bodyRoot}.`);
  }
  if (appearance.resolution) {
    const { width, height } = appearance.resolution;
    if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
      throw new Error('Reference atmospheric appearance resolution must contain positive integers.');
    }
    if (Math.abs(width / height - 2) > 0.02) {
      throw new Error('Reference atmospheric appearance must be approximately 2:1 equirectangular imagery.');
    }
  }

  const ordinaryImage = cleanText(appearance.mediaType)?.startsWith('image/') && appearance.encoding === undefined;
  const compactRgb565 = appearance.mediaType === 'application/vnd.world-forge.rgb565'
    && appearance.encoding === 'rgb565-le'
    && appearance.resolution !== undefined
    && appearance.bytes.byteLength === appearance.resolution.width * appearance.resolution.height * 2;
  if (!ordinaryImage && !compactRgb565) {
    throw new Error('Reference atmospheric appearance requires a supported image or RGB565 payload contract.');
  }
}

function safeLogicalPath(value: string): boolean {
  return Boolean(cleanText(value))
    && !value.startsWith('/')
    && !/^[A-Za-z]:/.test(value)
    && !value.split('/').includes('..');
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

function cleanText(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}

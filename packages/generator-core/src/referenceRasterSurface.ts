import type { WorldProject } from '@world-forge/shared';
import {
  isWorldBodyDetail,
  type RasterSurfaceDetailV1,
} from '@world-forge/shared/worldBodyDetails';
import {
  readWorldBodyCatalog,
  type MultiBodyWorldProject,
} from '@world-forge/shared/worldBodies';

export const REFERENCE_RASTER_SURFACE_PACKAGE_SCHEMA = 'world-forge-reference-raster-surface-package-v1' as const;

export type ReferenceRasterSurfacePackageV1 = {
  schema: typeof REFERENCE_RASTER_SURFACE_PACKAGE_SCHEMA;
  bodyId: string;
  detail: RasterSurfaceDetailV1;
  payloads: Record<string, Uint8Array>;
};

export function attachReferenceRasterSurface(
  project: WorldProject,
  surfacePackage: ReferenceRasterSurfacePackageV1,
): MultiBodyWorldProject {
  validateSurfacePackage(surfacePackage);
  const catalog = readWorldBodyCatalog(project);
  const bodyIndex = catalog.bodies.findIndex((body) => body.bodyId === surfacePackage.bodyId);
  if (bodyIndex < 0) {
    throw new Error(`Reference raster surface targets unknown body "${surfacePackage.bodyId}".`);
  }

  const bodyRoot = `bodies/${safePathSegment(surfacePackage.bodyId)}/`;
  for (const asset of surfacePackage.detail.assets ?? []) {
    if (!asset.logicalPath.startsWith(bodyRoot)) {
      throw new Error(`Reference raster surface assets must use body-local paths below ${bodyRoot}.`);
    }
    const payload = surfacePackage.payloads[asset.assetId];
    if (!(payload instanceof Uint8Array) || payload.byteLength === 0) {
      throw new Error(`Reference raster surface is missing payload "${asset.assetId}".`);
    }
    if (asset.byteLength !== undefined && asset.byteLength !== payload.byteLength) {
      throw new Error(`Reference raster surface payload "${asset.assetId}" does not match its declared byte length.`);
    }
  }

  const bodies = catalog.bodies.map((body, index) => index === bodyIndex
    ? {
        ...body,
        dataOrigin: surfacePackage.detail.origin,
        // The durable detail can arrive before the body-local raster renderer.
        // Keep view capabilities honest until that runtime path is enabled.
        capabilities: {
          ...body.capabilities,
          globe: false,
          map: false,
          explorer: false,
          irregularShape: false,
        },
        detail: surfacePackage.detail,
      }
    : body);
  const existingPayloads = (project as MultiBodyWorldProject).bodyAssetPayloads ?? {};

  return {
    ...project,
    bodyCatalog: { ...catalog, bodies },
    bodyAssetPayloads: {
      ...existingPayloads,
      ...Object.fromEntries(Object.entries(surfacePackage.payloads).map(([assetId, bytes]) => [
        assetId,
        Uint8Array.from(bytes),
      ])),
    },
  };
}

function validateSurfacePackage(surfacePackage: ReferenceRasterSurfacePackageV1): void {
  if (surfacePackage.schema !== REFERENCE_RASTER_SURFACE_PACKAGE_SCHEMA) {
    throw new Error('Unsupported reference raster surface package schema.');
  }
  if (!cleanText(surfacePackage.bodyId)) {
    throw new Error('Reference raster surface package requires a bodyId.');
  }
  if (!isWorldBodyDetail(surfacePackage.detail) || surfacePackage.detail.kind !== 'raster-surface') {
    throw new Error('Reference raster surface package requires a valid raster-surface detail.');
  }
  if (!surfacePackage.detail.assets?.length) {
    throw new Error('Reference raster surface package requires at least one asset.');
  }
  if (!isRecord(surfacePackage.payloads)) {
    throw new Error('Reference raster surface package requires asset payloads.');
  }
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

function cleanText(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

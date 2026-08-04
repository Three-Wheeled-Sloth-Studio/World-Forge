import type JSZip from 'jszip';
import type { WorldProject } from '@world-forge/shared';
import type { WorldBodyAssetRefV1, WorldBodyDetailV1 } from '@world-forge/shared/worldBodyDetails';
import type {
  MultiBodyWorldProject,
  WorldBodyAssetPayloads,
  WorldBodyRecordV1,
} from '@world-forge/shared/worldBodies';

export type PackagedWorldBodyRecord = Omit<WorldBodyRecordV1, 'surface'> & {
  surfacePath?: string;
};

export type WorldBodyAssetSource = Blob | ArrayBuffer | ArrayBufferView;

export type WorldBodyAssetResolver = (input: {
  project: WorldProject;
  body: PackagedWorldBodyRecord;
  asset: WorldBodyAssetRefV1;
}) => WorldBodyAssetSource | null | undefined | Promise<WorldBodyAssetSource | null | undefined>;

export type BodyAssetPackageSummary = {
  includedAssetCount: number;
  includedAssetBytes: number;
  missingOptionalAssetCount: number;
};

export async function writeWorldBodyAssetEntries(
  zip: JSZip,
  project: WorldProject,
  bodies: readonly PackagedWorldBodyRecord[],
  resolver?: WorldBodyAssetResolver,
): Promise<{ bodies: PackagedWorldBodyRecord[]; summary: BodyAssetPackageSummary }> {
  const payloads = (project as MultiBodyWorldProject).bodyAssetPayloads ?? {};
  const seenAssetIds = new Set<string>();
  const seenPaths = new Set<string>();
  const summary: BodyAssetPackageSummary = {
    includedAssetCount: 0,
    includedAssetBytes: 0,
    missingOptionalAssetCount: 0,
  };
  const packagedBodies: PackagedWorldBodyRecord[] = [];

  for (const body of bodies) {
    const assets = body.detail?.assets;
    if (!assets?.length) {
      packagedBodies.push(body);
      continue;
    }

    const packagedAssets: WorldBodyAssetRefV1[] = [];
    for (const asset of assets) {
      validateAssetIdentityAndPath(body, asset, seenAssetIds, seenPaths);
      const source = payloads[asset.assetId] ?? await resolver?.({ project, body, asset });
      if (source === null || source === undefined) {
        if (!asset.optional) {
          throw new Error(`Cannot export .wforge package: required body asset "${asset.assetId}" is unavailable.`);
        }
        summary.missingOptionalAssetCount += 1;
        packagedAssets.push(asset);
        continue;
      }

      const bytes = await sourceBytes(source);
      validateDeclaredByteLength(asset, bytes.byteLength, 'export');
      const sha256 = await sha256Digest(bytes);
      validateDeclaredChecksum(asset, sha256, 'export');
      zip.file(asset.logicalPath, bytes);
      packagedAssets.push({ ...asset, byteLength: bytes.byteLength, sha256 });
      summary.includedAssetCount += 1;
      summary.includedAssetBytes += bytes.byteLength;
    }

    packagedBodies.push({
      ...body,
      detail: withAssets(body.detail!, packagedAssets),
    });
  }

  return { bodies: packagedBodies, summary };
}

export async function readWorldBodyAssetEntries(
  zip: JSZip,
  bodies: readonly PackagedWorldBodyRecord[],
): Promise<{
  bodies: PackagedWorldBodyRecord[];
  payloads: WorldBodyAssetPayloads;
  summary: BodyAssetPackageSummary;
}> {
  const seenAssetIds = new Set<string>();
  const seenPaths = new Set<string>();
  const payloads: WorldBodyAssetPayloads = {};
  const summary: BodyAssetPackageSummary = {
    includedAssetCount: 0,
    includedAssetBytes: 0,
    missingOptionalAssetCount: 0,
  };
  const hydratedBodies: PackagedWorldBodyRecord[] = [];

  for (const body of bodies) {
    const assets = body.detail?.assets;
    if (!assets?.length) {
      hydratedBodies.push(body);
      continue;
    }

    const hydratedAssets: WorldBodyAssetRefV1[] = [];
    for (const asset of assets) {
      validateAssetIdentityAndPath(body, asset, seenAssetIds, seenPaths);
      const entry = zip.file(asset.logicalPath);
      if (!entry) {
        if (!asset.optional) {
          throw new Error(`Invalid .wforge package: missing required body asset ${asset.logicalPath}.`);
        }
        summary.missingOptionalAssetCount += 1;
        hydratedAssets.push(asset);
        continue;
      }

      const bytes = await entry.async('uint8array');
      validateDeclaredByteLength(asset, bytes.byteLength, 'import');
      const sha256 = await sha256Digest(bytes);
      validateDeclaredChecksum(asset, sha256, 'import');
      payloads[asset.assetId] = Uint8Array.from(bytes);
      hydratedAssets.push({ ...asset, byteLength: bytes.byteLength, sha256 });
      summary.includedAssetCount += 1;
      summary.includedAssetBytes += bytes.byteLength;
    }

    hydratedBodies.push({
      ...body,
      detail: withAssets(body.detail!, hydratedAssets),
    });
  }

  return { bodies: hydratedBodies, payloads, summary };
}

function validateAssetIdentityAndPath(
  body: PackagedWorldBodyRecord,
  asset: WorldBodyAssetRefV1,
  seenAssetIds: Set<string>,
  seenPaths: Set<string>,
): void {
  if (seenAssetIds.has(asset.assetId)) {
    throw new Error(`Invalid body asset contract: duplicate asset ID "${asset.assetId}".`);
  }
  if (seenPaths.has(asset.logicalPath)) {
    throw new Error(`Invalid body asset contract: duplicate logical path "${asset.logicalPath}".`);
  }
  seenAssetIds.add(asset.assetId);
  seenPaths.add(asset.logicalPath);

  const bodyRoot = `bodies/${safePathSegment(body.bodyId)}/`;
  if (!asset.logicalPath.startsWith(bodyRoot)) {
    throw new Error(`Invalid body asset contract: ${asset.logicalPath} must be stored below ${bodyRoot}.`);
  }
  const relativePath = asset.logicalPath.slice(bodyRoot.length);
  if (!relativePath
    || relativePath === 'world.json'
    || relativePath.startsWith('layers/')
    || relativePath.startsWith('topology-layers/')) {
    throw new Error(`Invalid body asset contract: ${asset.logicalPath} conflicts with reserved body package entries.`);
  }
}

function validateDeclaredByteLength(asset: WorldBodyAssetRefV1, actual: number, operation: 'export' | 'import'): void {
  if (asset.byteLength !== undefined && asset.byteLength !== actual) {
    const prefix = operation === 'import' ? 'Invalid .wforge package' : 'Cannot export .wforge package';
    throw new Error(`${prefix}: body asset "${asset.assetId}" expected ${asset.byteLength} bytes but found ${actual}.`);
  }
}

function validateDeclaredChecksum(asset: WorldBodyAssetRefV1, actual: string, operation: 'export' | 'import'): void {
  if (asset.sha256 !== undefined && asset.sha256.toLowerCase() !== actual) {
    const prefix = operation === 'import' ? 'Invalid .wforge package' : 'Cannot export .wforge package';
    throw new Error(`${prefix}: checksum mismatch for body asset "${asset.assetId}".`);
  }
}

function withAssets(detail: WorldBodyDetailV1, assets: WorldBodyAssetRefV1[]): WorldBodyDetailV1 {
  return { ...detail, assets } as WorldBodyDetailV1;
}

async function sourceBytes(source: WorldBodyAssetSource): Promise<Uint8Array> {
  if (source instanceof Blob) return new Uint8Array(await source.arrayBuffer());
  if (source instanceof ArrayBuffer) return new Uint8Array(source.slice(0));
  return Uint8Array.from(new Uint8Array(source.buffer, source.byteOffset, source.byteLength));
}

async function sha256Digest(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes.slice().buffer);
  return `sha256:${Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

import JSZip from 'jszip';
import {
  biomeNames,
  type MapLayers,
  type PrimaryWorld,
  type SerializableLayer,
  type SerializableTopologyLayer,
  type TopologyLayers,
  type WorldProject,
} from '@world-forge/shared';
import {
  isWorldBodyCatalog,
  readWorldBodyCatalog,
  type MultiBodyWorldProject,
  type WorldBodyCatalogV1,
  type WorldBodyRecordV1,
} from '@world-forge/shared/worldBodies';
import {
  readWorldBodyAssetEntries,
  writeWorldBodyAssetEntries,
  type BodyAssetPackageSummary,
  type PackagedWorldBodyRecord,
  type WorldBodyAssetResolver,
} from './bodyAssetPackage';
import {
  deserializeProject as deserializeBaseProject,
  exportWforge as exportBaseWforge,
  importWforge as importBaseWforge,
  serializeProject as serializeBaseProject,
} from './index';

export const MULTI_BODY_WFORGE_EXTENSION = 'world-forge-multi-body-v1';
const CATALOG_PATH = 'system/body-catalog.json';

type PackagedBodyCatalog = Omit<WorldBodyCatalogV1, 'bodies'> & {
  bodies: PackagedWorldBodyRecord[];
};

type SerializedBodyRecord = Omit<WorldBodyRecordV1, 'surface'> & {
  surface?: SerializedPrimaryWorld;
};

type SerializedBodyCatalog = Omit<WorldBodyCatalogV1, 'bodies'> & {
  bodies: SerializedBodyRecord[];
};

type SerializedPrimaryWorld = Omit<PrimaryWorld, 'layers' | 'topologyLayers'> & {
  layers: SerializableLayer[];
  topologyLayers: SerializableTopologyLayer[];
};

export type MultiBodyWforgeExportOptions = {
  compressionLevel?: number;
  onProgress?: (percent: number) => void;
  resolveBodyAsset?: WorldBodyAssetResolver;
};

export async function exportMultiBodyWforge(
  project: WorldProject,
  options: MultiBodyWforgeExportOptions = {},
): Promise<Blob> {
  const baseBlob = await exportBaseWforge(stripBodyCatalog(project), {
    compressionLevel: options.compressionLevel,
    onProgress: (progress) => options.onProgress?.(progress * 0.35),
  });
  const zip = await JSZip.loadAsync(await baseBlob.arrayBuffer());
  const catalog = readWorldBodyCatalog(project);
  const packagedBodies: PackagedWorldBodyRecord[] = [];

  for (const body of catalog.bodies) {
    const surface = body.bodyId === catalog.primaryBodyId
      ? body.surface ?? project.primaryWorld
      : body.surface;
    if (!surface || body.bodyId === catalog.primaryBodyId) {
      packagedBodies.push(stripSurface(body));
      continue;
    }
    const surfacePath = `bodies/${safePathSegment(body.bodyId)}`;
    writeSurface(zip, surfacePath, surface);
    packagedBodies.push({ ...stripSurface(body), surfacePath });
  }

  const assetPackage = await writeWorldBodyAssetEntries(
    zip,
    project,
    packagedBodies,
    options.resolveBodyAsset,
  );
  const packagedCatalog: PackagedBodyCatalog = {
    schema: catalog.schema,
    primaryBodyId: catalog.primaryBodyId,
    activeBodyId: catalog.activeBodyId,
    bodies: assetPackage.bodies,
  };
  zip.file(CATALOG_PATH, JSON.stringify(packagedCatalog));
  await extendManifest(zip, packagedCatalog, assetPackage.summary);

  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: options.compressionLevel ?? 1 },
  }, (metadata) => options.onProgress?.(0.35 + metadata.percent / 100 * 0.65));
}

export async function importMultiBodyWforge(file: File): Promise<WorldProject> {
  const bytes = await file.arrayBuffer();
  const base = await importBaseWforge(new File([bytes], file.name, { type: file.type }));
  const zip = await JSZip.loadAsync(bytes);
  const catalogFile = zip.file(CATALOG_PATH);
  if (!catalogFile) return base;

  const packaged = JSON.parse(await catalogFile.async('string')) as PackagedBodyCatalog;
  const candidate: WorldBodyCatalogV1 = {
    schema: packaged.schema,
    primaryBodyId: packaged.primaryBodyId,
    activeBodyId: packaged.activeBodyId,
    bodies: packaged.bodies.map(({ surfacePath: _surfacePath, ...body }) => body),
  };
  if (!isWorldBodyCatalog(candidate)) throw new Error('Invalid .wforge package: malformed multi-body catalog.');

  const assetPackage = await readWorldBodyAssetEntries(zip, packaged.bodies);
  const bodies: WorldBodyRecordV1[] = [];
  for (const packagedBody of assetPackage.bodies) {
    const { surfacePath, ...body } = packagedBody;
    const surface = surfacePath ? await readSurface(zip, surfacePath) : undefined;
    bodies.push({ ...body, surface });
  }

  return {
    ...base,
    bodyCatalog: { ...candidate, bodies },
    bodyAssetPayloads: assetPackage.payloads,
  } as MultiBodyWorldProject;
}

export function serializeMultiBodyProject(
  project: WorldProject,
  options: { includeLayerData?: boolean } = {},
): ReturnType<typeof serializeBaseProject> & { bodyCatalog: SerializedBodyCatalog } {
  const includeLayerData = options.includeLayerData ?? true;
  const base = serializeBaseProject(stripBodyCatalog(project), options);
  const catalog = readWorldBodyCatalog(project);
  return {
    ...base,
    bodyCatalog: {
      schema: catalog.schema,
      primaryBodyId: catalog.primaryBodyId,
      activeBodyId: catalog.activeBodyId,
      bodies: catalog.bodies.map((body) => ({
        ...stripSurface(body),
        surface: body.bodyId === catalog.primaryBodyId || !body.surface
          ? undefined
          : serializeSurface(body.surface, includeLayerData),
      })),
    },
  };
}

export function deserializeMultiBodyProject(value: unknown): WorldProject {
  const base = deserializeBaseProject(value);
  if (!isRecord(value) || !isRecord(value.bodyCatalog)) return base;
  const serialized = value.bodyCatalog as unknown as SerializedBodyCatalog;
  const candidate: WorldBodyCatalogV1 = {
    schema: serialized.schema,
    primaryBodyId: serialized.primaryBodyId,
    activeBodyId: serialized.activeBodyId,
    bodies: Array.isArray(serialized.bodies)
      ? serialized.bodies.map(({ surface: _surface, ...body }) => body)
      : [],
  };
  if (!isWorldBodyCatalog(candidate)) return base;
  const bodies = serialized.bodies.map((body) => ({
    ...body,
    surface: body.surface ? deserializeSurface(body.surface) : undefined,
  }));
  return { ...base, bodyCatalog: { ...candidate, bodies } } as MultiBodyWorldProject;
}

function writeSurface(zip: JSZip, root: string, surface: PrimaryWorld): void {
  const serialized = serializeSurface(surface, false);
  zip.file(`${root}/world.json`, JSON.stringify({ ...serialized, layers: [], topologyLayers: [] }));
  for (const layer of serializeLayers(surface.layers, surface.mapModel.resolution, surface.mapModel.projection)) {
    zip.file(`${root}/layers/${layer.layerType}.json`, JSON.stringify(layer));
  }
  for (const layer of serializeTopologyLayers(surface.topologyLayers, surface.topology)) {
    zip.file(`${root}/topology-layers/${layer.layerType}.json`, JSON.stringify(layer));
  }
}

async function readSurface(zip: JSZip, root: string): Promise<PrimaryWorld> {
  const worldFile = zip.file(`${root}/world.json`);
  if (!worldFile) throw new Error(`Invalid .wforge package: missing ${root}/world.json`);
  const metadata = JSON.parse(await worldFile.async('string')) as SerializedPrimaryWorld;
  const layers = await readLayers<SerializableLayer>(zip, `${root}/layers`);
  const topologyLayers = await readLayers<SerializableTopologyLayer>(zip, `${root}/topology-layers`);
  return deserializeSurface({ ...metadata, layers, topologyLayers });
}

async function extendManifest(
  zip: JSZip,
  catalog: PackagedBodyCatalog,
  assetSummary: BodyAssetPackageSummary,
): Promise<void> {
  const manifestFile = zip.file('manifest.json');
  const manifest = manifestFile ? JSON.parse(await manifestFile.async('string')) as Record<string, unknown> : {};
  zip.file('manifest.json', JSON.stringify({
    ...manifest,
    extensions: {
      ...(isRecord(manifest.extensions) ? manifest.extensions : {}),
      multiBody: {
        schema: MULTI_BODY_WFORGE_EXTENSION,
        catalogFile: CATALOG_PATH,
        bodyCount: catalog.bodies.length,
        surfacedBodyCount: 1 + catalog.bodies.filter((body) => body.surfacePath).length,
        bodyAssetCount: assetSummary.includedAssetCount,
        bodyAssetBytes: assetSummary.includedAssetBytes,
        missingOptionalBodyAssetCount: assetSummary.missingOptionalAssetCount,
      },
    },
  }, null, 2));
}

function serializeSurface(surface: PrimaryWorld, includeLayerData: boolean): SerializedPrimaryWorld {
  const { layers: _layers, topologyLayers: _topologyLayers, ...metadata } = surface;
  return {
    ...metadata,
    layers: includeLayerData
      ? serializeLayers(surface.layers, surface.mapModel.resolution, surface.mapModel.projection)
      : [],
    topologyLayers: includeLayerData
      ? serializeTopologyLayers(surface.topologyLayers, surface.topology)
      : [],
    biomeLegend: biomeNames,
  } as SerializedPrimaryWorld;
}

function deserializeSurface(surface: SerializedPrimaryWorld): PrimaryWorld {
  return {
    ...surface,
    layers: deserializeMapLayers(surface.layers),
    topologyLayers: deserializeTopologyLayers(surface.topologyLayers),
  } as PrimaryWorld;
}

function serializeLayers(
  layers: MapLayers,
  resolution: PrimaryWorld['mapModel']['resolution'],
  projection: PrimaryWorld['mapModel']['projection'],
): SerializableLayer[] {
  return (Object.entries(layers) as Array<[keyof MapLayers, MapLayers[keyof MapLayers]]>).map(([layerType, data]) => ({
    layerId: `map:${layerType}`,
    layerType,
    resolution,
    projection,
    dataEncoding: encodingFor(data),
    ...rangeFor(data),
    data: Array.from(data),
  }));
}

function serializeTopologyLayers(
  layers: TopologyLayers,
  topology: PrimaryWorld['topology'],
): SerializableTopologyLayer[] {
  return (Object.entries(layers) as Array<[keyof TopologyLayers, TopologyLayers[keyof TopologyLayers]]>).map(([layerType, data]) => ({
    layerId: `topology:${layerType}`,
    layerType,
    topologyKind: topology.kind,
    topologyResolution: topology.resolution,
    dataEncoding: encodingFor(data),
    ...rangeFor(data),
    data: Array.from(data),
  }));
}

async function readLayers<T extends { layerType: string }>(zip: JSZip, root: string): Promise<T[]> {
  const files = Object.values(zip.files)
    .filter((entry) => !entry.dir && entry.name.startsWith(`${root}/`) && entry.name.endsWith('.json'))
    .sort((left, right) => left.name.localeCompare(right.name));
  return Promise.all(files.map(async (entry) => JSON.parse(await entry.async('string')) as T));
}

function deserializeMapLayers(layers: SerializableLayer[]): MapLayers {
  return Object.fromEntries(layers.map((layer) => [layer.layerType, typedArray(layer)])) as MapLayers;
}

function deserializeTopologyLayers(layers: SerializableTopologyLayer[]): TopologyLayers {
  return Object.fromEntries(layers.map((layer) => [layer.layerType, typedArray(layer)])) as TopologyLayers;
}

function typedArray(layer: SerializableLayer | SerializableTopologyLayer): Float32Array | Uint8Array | Uint16Array {
  if (layer.dataEncoding === 'uint8-array') return Uint8Array.from(layer.data);
  if (layer.dataEncoding === 'uint16-array') return Uint16Array.from(layer.data);
  return Float32Array.from(layer.data);
}

function encodingFor(data: ArrayBufferView): SerializableLayer['dataEncoding'] {
  if (data instanceof Uint8Array) return 'uint8-array';
  if (data instanceof Uint16Array) return 'uint16-array';
  return 'float32-array';
}

function rangeFor(data: ArrayLike<number>): { minValue: number; maxValue: number } {
  if (!data.length) return { minValue: 0, maxValue: 0 };
  let minValue = Number.POSITIVE_INFINITY;
  let maxValue = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < data.length; index += 1) {
    const value = Number(data[index]);
    if (value < minValue) minValue = value;
    if (value > maxValue) maxValue = value;
  }
  return { minValue, maxValue };
}

function stripBodyCatalog(project: WorldProject): WorldProject {
  const catalog = readWorldBodyCatalog(project);
  const primarySurface = catalog.bodies.find((body) => body.bodyId === catalog.primaryBodyId)?.surface
    ?? project.primaryWorld;
  const {
    bodyCatalog: _bodyCatalog,
    bodyAssetPayloads: _bodyAssetPayloads,
    ...base
  } = project as MultiBodyWorldProject;
  return { ...base, primaryWorld: primarySurface } as WorldProject;
}

function stripSurface(body: WorldBodyRecordV1): Omit<WorldBodyRecordV1, 'surface'> {
  const { surface: _surface, ...metadata } = body;
  return metadata;
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  REFERENCE_BODY_RASTER_SCHEMA,
  type ReferenceBodyRasterV1,
  type ReferenceLayerOrigin,
} from '../packages/generator-core/src/referenceBodyImport';

export const REFERENCE_RASTER_BUNDLE_SCHEMA = 'world-forge-reference-raster-bundle-v1' as const;

type BundleLayer = {
  file: string;
  encoding: 'float32-little-endian' | 'uint8';
  origin?: ReferenceLayerOrigin;
};

type ReferenceRasterBundleManifest = {
  schema: typeof REFERENCE_RASTER_BUNDLE_SCHEMA;
  bodyId: string;
  name: string;
  resolution: { width: number; height: number };
  topologyResolution?: number;
  physical: ReferenceBodyRasterV1['physical'];
  layers: {
    elevationMeters: BundleLayer;
    waterMask?: BundleLayer;
    temperatureC?: BundleLayer;
    wetness?: BundleLayer;
    iceMask?: BundleLayer;
    biomeCodes?: BundleLayer;
  };
};

export async function loadReferenceRasterBundle(directory: string): Promise<ReferenceBodyRasterV1> {
  const root = path.resolve(directory);
  const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8')) as ReferenceRasterBundleManifest;
  validateManifest(manifest);
  const expectedCells = manifest.resolution.width * manifest.resolution.height;
  const elevationMeters = await readFloat32Layer(root, manifest.layers.elevationMeters, expectedCells);
  const waterMask = manifest.layers.waterMask
    ? await readUint8Layer(root, manifest.layers.waterMask, expectedCells)
    : undefined;
  const temperatureC = manifest.layers.temperatureC
    ? await readFloat32Layer(root, manifest.layers.temperatureC, expectedCells)
    : undefined;
  const wetness = manifest.layers.wetness
    ? await readFloat32Layer(root, manifest.layers.wetness, expectedCells)
    : undefined;
  const iceMask = manifest.layers.iceMask
    ? await readUint8Layer(root, manifest.layers.iceMask, expectedCells)
    : undefined;
  const biomeCodes = manifest.layers.biomeCodes
    ? await readUint8Layer(root, manifest.layers.biomeCodes, expectedCells)
    : undefined;

  return {
    schema: REFERENCE_BODY_RASTER_SCHEMA,
    bodyId: manifest.bodyId,
    name: manifest.name,
    resolution: manifest.resolution,
    topologyResolution: manifest.topologyResolution,
    physical: manifest.physical,
    elevationMeters,
    waterMask,
    temperatureC,
    wetness,
    iceMask,
    biomeCodes,
    layerOrigins: {
      elevation: manifest.layers.elevationMeters.origin ?? 'imported',
      water: manifest.layers.waterMask?.origin,
      temperature: manifest.layers.temperatureC?.origin,
      wetness: manifest.layers.wetness?.origin,
      ice: manifest.layers.iceMask?.origin,
      biomes: manifest.layers.biomeCodes?.origin,
    },
  };
}

function validateManifest(manifest: ReferenceRasterBundleManifest): void {
  if (manifest.schema !== REFERENCE_RASTER_BUNDLE_SCHEMA) throw new Error('Unsupported reference raster bundle schema.');
  if (!manifest.bodyId?.trim() || !manifest.name?.trim()) throw new Error('Reference raster bundle is missing body identity.');
  if (!Number.isInteger(manifest.resolution?.width) || !Number.isInteger(manifest.resolution?.height)) {
    throw new Error('Reference raster bundle has an invalid resolution.');
  }
  if (!manifest.layers?.elevationMeters) throw new Error('Reference raster bundle is missing elevationMeters.');
}

async function readFloat32Layer(root: string, layer: BundleLayer, expectedCells: number): Promise<Float32Array> {
  if (layer.encoding !== 'float32-little-endian') throw new Error(`${layer.file} must use float32-little-endian encoding.`);
  const bytes = await readFile(path.join(root, safeRelativePath(layer.file)));
  if (bytes.byteLength !== expectedCells * 4) throw new Error(`${layer.file} contains ${bytes.byteLength / 4} cells; expected ${expectedCells}.`);
  const view = new Float32Array(bytes.buffer, bytes.byteOffset, expectedCells);
  return Float32Array.from(view);
}

async function readUint8Layer(root: string, layer: BundleLayer, expectedCells: number): Promise<Uint8Array> {
  if (layer.encoding !== 'uint8') throw new Error(`${layer.file} must use uint8 encoding.`);
  const bytes = await readFile(path.join(root, safeRelativePath(layer.file)));
  if (bytes.byteLength !== expectedCells) throw new Error(`${layer.file} contains ${bytes.byteLength} cells; expected ${expectedCells}.`);
  return Uint8Array.from(bytes);
}

function safeRelativePath(value: string): string {
  const normalized = path.normalize(value);
  if (path.isAbsolute(normalized) || normalized.startsWith('..') || normalized.includes(`..${path.sep}`)) {
    throw new Error(`Reference raster layer path must remain inside the bundle: ${value}`);
  }
  return normalized;
}

import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportMultiBodyWforge } from '../packages/exporters/src/multiBodyWforge';
import {
  attachReferenceAtmosphericAppearance,
  REFERENCE_ATMOSPHERIC_APPEARANCE_SCHEMA,
} from '../packages/generator-core/src/referenceAtmosphericPresentation';
import {
  attachReferenceRasterSurface,
  REFERENCE_RASTER_SURFACE_PACKAGE_SCHEMA,
} from '../packages/generator-core/src/referenceRasterSurface';
import { importReferenceBodyRaster } from '../packages/generator-core/src/referenceBodyImport';
import { createSolReferenceProject } from '../packages/generator-core/src/solReferenceProject';
import type { MultiBodyWorldProject } from '@world-forge/shared/worldBodies';
import { loadReferenceBodyBundle } from './referenceBodyBundle';
import { loadReferenceImageBundle } from './referenceImageBundle';
import { loadReferenceRasterBundle } from './referenceDataBundle';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const JUPITER_MEDIA_TYPE = 'application/vnd.world-forge.rgb565';
const JUPITER_ENCODING = 'rgb565-le';

async function main(): Promise<void> {
  const inputDirectory = resolveArgument('--input')
    ?? path.join(repositoryRoot, '.local', 'reference-data', 'earth-etopo');
  const outputFile = resolveArgument('--output')
    ?? path.join(repositoryRoot, '.local', 'reference-data', 'sol-earth-reference.wforge');
  const explicitJupiterDirectory = resolveArgument('--jupiter-input');
  const jupiterDirectory = explicitJupiterDirectory
    ?? path.join(repositoryRoot, '.local', 'reference-data', 'jupiter-cassini');
  const bodyDirectories = resolveArguments('--body-input');

  const normalized = await loadReferenceRasterBundle(inputDirectory);
  if (normalized.bodyId !== 'earth') {
    throw new Error(`The Earth reference build expected bodyId "earth", received "${normalized.bodyId}".`);
  }
  const earth = importReferenceBodyRaster(normalized);
  let project: MultiBodyWorldProject = createSolReferenceProject(earth, {
    appVersion: 'reference-etl-v1',
    sourceCommit: process.env.WORLD_FORGE_SOURCE_COMMIT?.trim() || undefined,
  });

  let jupiterResolution: { width: number; height: number } | null = null;
  if (explicitJupiterDirectory || await fileExists(path.join(jupiterDirectory, 'manifest.json'))) {
    const jupiter = await loadReferenceImageBundle(jupiterDirectory);
    if (jupiter.bodyId !== 'jupiter') {
      throw new Error(`The Jupiter reference build expected bodyId "jupiter", received "${jupiter.bodyId}".`);
    }
    if (jupiter.mediaType !== JUPITER_MEDIA_TYPE || jupiter.encoding !== JUPITER_ENCODING) {
      throw new Error('The Jupiter reference bundle uses the superseded JPEG contract. Rerun npm run reference:prepare-jupiter.');
    }
    project = attachReferenceAtmosphericAppearance(project, {
      schema: REFERENCE_ATMOSPHERIC_APPEARANCE_SCHEMA,
      bodyId: 'jupiter',
      assetId: 'jupiter-cassini-pia07782-albedo',
      logicalPath: 'bodies/jupiter/albedo.rgb565',
      mediaType: jupiter.mediaType,
      encoding: jupiter.encoding,
      bytes: jupiter.bytes,
      resolution: jupiter.resolution,
    });
    jupiterResolution = jupiter.resolution;
  }

  const attachedBodies: Array<{ bodyId: string; width: number; height: number; assets: number }> = [];
  const seenBodyIds = new Set<string>();
  for (const directory of bodyDirectories) {
    const bundle = await loadReferenceBodyBundle(directory);
    if (seenBodyIds.has(bundle.manifest.bodyId)) {
      throw new Error(`Duplicate --body-input bundle for body "${bundle.manifest.bodyId}".`);
    }
    seenBodyIds.add(bundle.manifest.bodyId);
    project = attachReferenceRasterSurface(project, {
      schema: REFERENCE_RASTER_SURFACE_PACKAGE_SCHEMA,
      bodyId: bundle.manifest.bodyId,
      detail: bundle.detail,
      payloads: bundle.payloads,
    });
    attachedBodies.push({
      bodyId: bundle.manifest.bodyId,
      width: bundle.manifest.resolution.width,
      height: bundle.manifest.resolution.height,
      assets: bundle.manifest.assets.length,
    });
  }

  const packageBlob = await exportMultiBodyWforge(project, {
    compressionLevel: 1,
    onProgress: (progress) => {
      const percent = Math.round(progress * 100);
      if (percent % 10 === 0) process.stdout.write(`\rPackaging Sol reference: ${percent}%`);
    },
  });

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, Buffer.from(await packageBlob.arrayBuffer()));
  process.stdout.write('\n');
  console.log(`Built ${outputFile}`);
  console.log(`Bodies: ${project.bodyCatalog?.bodies.length ?? 0}`);
  console.log(`Earth map: ${earth.mapModel.resolution.width} x ${earth.mapModel.resolution.height}`);
  console.log(jupiterResolution
    ? `Jupiter appearance: ${jupiterResolution.width} x ${jupiterResolution.height} RGB565`
    : 'Jupiter appearance: not included; run npm run reference:prepare-jupiter first.');
  for (const body of attachedBodies) {
    console.log(`${body.bodyId} prepared surface: ${body.width} x ${body.height}, ${body.assets} assets`);
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function resolveArgument(name: string): string | null {
  const values = resolveArguments(name);
  if (values.length > 1) throw new Error(`${name} may be supplied only once.`);
  return values[0] ?? null;
}

function resolveArguments(name: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] !== name) continue;
    const value = process.argv[index + 1]?.trim();
    if (!value || value.startsWith('--')) throw new Error(`${name} requires a value.`);
    values.push(path.resolve(process.cwd(), value));
    index += 1;
  }
  return values;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

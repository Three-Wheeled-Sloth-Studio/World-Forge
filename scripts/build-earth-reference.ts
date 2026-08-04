import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportMultiBodyWforge } from '../packages/exporters/src/multiBodyWforge';
import {
  attachReferenceAtmosphericAppearance,
  REFERENCE_ATMOSPHERIC_APPEARANCE_SCHEMA,
} from '../packages/generator-core/src/referenceAtmosphericPresentation';
import { importReferenceBodyRaster } from '../packages/generator-core/src/referenceBodyImport';
import { createSolReferenceProject } from '../packages/generator-core/src/solReferenceProject';
import type { MultiBodyWorldProject } from '../packages/shared/src/worldBodies';
import { loadReferenceImageBundle } from './referenceImageBundle';
import { loadReferenceRasterBundle } from './referenceDataBundle';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');

async function main(): Promise<void> {
  const inputDirectory = resolveArgument('--input')
    ?? path.join(repositoryRoot, '.local', 'reference-data', 'earth-etopo');
  const outputFile = resolveArgument('--output')
    ?? path.join(repositoryRoot, '.local', 'reference-data', 'sol-earth-reference.wforge');
  const explicitJupiterDirectory = resolveArgument('--jupiter-input');
  const jupiterDirectory = explicitJupiterDirectory
    ?? path.join(repositoryRoot, '.local', 'reference-data', 'jupiter-cassini');

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
    project = attachReferenceAtmosphericAppearance(project, {
      schema: REFERENCE_ATMOSPHERIC_APPEARANCE_SCHEMA,
      bodyId: 'jupiter',
      assetId: 'jupiter-cassini-pia07782-albedo',
      logicalPath: 'bodies/jupiter/albedo.jpg',
      mediaType: jupiter.mediaType,
      bytes: jupiter.bytes,
      resolution: jupiter.resolution,
    });
    jupiterResolution = jupiter.resolution;
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
    ? `Jupiter appearance: ${jupiterResolution.width} x ${jupiterResolution.height}`
    : 'Jupiter appearance: not included; run npm run reference:prepare-jupiter first.');
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
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  const value = process.argv[index + 1]?.trim();
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value.`);
  return path.resolve(process.cwd(), value);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

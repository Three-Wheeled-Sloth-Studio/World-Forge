import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportMultiBodyWforge } from '../packages/exporters/src/multiBodyWforge';
import { importReferenceBodyRaster } from '../packages/generator-core/src/referenceBodyImport';
import { createSolReferenceProject } from '../packages/generator-core/src/solReferenceProject';
import { loadReferenceRasterBundle } from './referenceDataBundle';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');

async function main(): Promise<void> {
  const inputDirectory = resolveArgument('--input')
    ?? path.join(repositoryRoot, '.local', 'reference-data', 'earth-etopo');
  const outputFile = resolveArgument('--output')
    ?? path.join(repositoryRoot, '.local', 'reference-data', 'sol-earth-reference.wforge');

  const normalized = await loadReferenceRasterBundle(inputDirectory);
  if (normalized.bodyId !== 'earth') {
    throw new Error(`The Earth reference build expected bodyId "earth", received "${normalized.bodyId}".`);
  }
  const earth = importReferenceBodyRaster(normalized);
  const project = createSolReferenceProject(earth, {
    appVersion: 'reference-etl-v1',
    sourceCommit: process.env.WORLD_FORGE_SOURCE_COMMIT?.trim() || undefined,
  });
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

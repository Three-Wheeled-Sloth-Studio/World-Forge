import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readJpegResolution,
  REFERENCE_IMAGE_BUNDLE_SCHEMA,
  type ReferenceImageBundleManifestV1,
} from './referenceImageBundle';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const defaultSourcePage = 'https://science.nasa.gov/photojournal/cassinis-best-maps-of-jupiter-cylindrical-map/';
const defaultSourceAsset = 'https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia07/pia07782/PIA07782.jpg';

async function main(): Promise<void> {
  const outputDirectory = resolveArgument('--output')
    ?? path.join(repositoryRoot, '.local', 'reference-data', 'jupiter-cassini');
  const inputFile = resolveArgument('--input');
  const sourceAsset = resolveTextArgument('--source-url') ?? defaultSourceAsset;
  const bytes = inputFile
    ? Uint8Array.from(await readFile(inputFile))
    : await downloadImage(sourceAsset);
  const resolution = readJpegResolution(bytes);
  if (Math.abs(resolution.width / resolution.height - 2) > 0.02) {
    throw new Error(`Expected approximately 2:1 cylindrical Jupiter imagery, received ${resolution.width} x ${resolution.height}.`);
  }

  const imageFileName = 'PIA07782.jpg';
  const digest = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
  const manifest: ReferenceImageBundleManifestV1 = {
    schema: REFERENCE_IMAGE_BUNDLE_SCHEMA,
    bodyId: 'jupiter',
    sourceId: 'PIA07782',
    sourcePage: defaultSourcePage,
    sourceAsset,
    credit: 'NASA/JPL/Space Science Institute',
    file: imageFileName,
    mediaType: 'image/jpeg',
    projection: 'equirectangular',
    resolution,
    byteLength: bytes.byteLength,
    sha256: digest,
  };

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, imageFileName), bytes);
  await writeFile(path.join(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log(`Prepared Jupiter reference image at ${outputDirectory}`);
  console.log(`Resolution: ${resolution.width} x ${resolution.height}`);
  console.log(`Bytes: ${bytes.byteLength}`);
  console.log(`Digest: ${digest}`);
}

async function downloadImage(url: string): Promise<Uint8Array> {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'World-Forge reference-data preparation',
      accept: 'image/jpeg',
    },
  });
  if (!response.ok) {
    throw new Error(`Unable to download Jupiter reference image: HTTP ${response.status} ${response.statusText}.`);
  }
  const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (contentType && contentType !== 'image/jpeg') {
    throw new Error(`Expected image/jpeg from Jupiter source, received ${contentType}.`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

function resolveArgument(name: string): string | null {
  const value = resolveTextArgument(name);
  return value ? path.resolve(process.cwd(), value) : null;
}

function resolveTextArgument(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  const value = process.argv[index + 1]?.trim();
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value.`);
  return value;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

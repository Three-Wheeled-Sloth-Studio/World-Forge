import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SOL_REFERENCE_PIPELINE_REPORT_SCHEMA = 'world-forge-sol-reference-pipeline-report-v1' as const;

export interface SolReferencePipelineOptions {
  repositoryRoot: string;
  earthWidth: number;
  earthHeight: number;
  topologyResolution: number;
  earthBundleDirectory: string;
  jupiterBundleDirectory: string;
  earthSourceFile: string | null;
  koppenSourceFile: string | null;
  jupiterSourceFile: string | null;
  outputFile: string;
  reportFile: string;
  preparedOnly: boolean;
}

export interface SolReferencePipelineCommand {
  stage: 'prepare-earth' | 'prepare-jupiter' | 'build-sol-package';
  command: string;
  args: string[];
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = path.resolve(scriptDirectory, '..');

export function parseSolReferencePipelineOptions(
  argv: string[],
  cwd = process.cwd(),
  repositoryRoot = defaultRepositoryRoot,
): SolReferencePipelineOptions {
  let earthWidth = 512;
  let earthHeight = 256;
  let topologyResolution = 64;
  let earthBundleDirectory = path.join(repositoryRoot, '.local', 'reference-data', 'earth-etopo');
  let jupiterBundleDirectory = path.join(repositoryRoot, '.local', 'reference-data', 'jupiter-cassini');
  let earthSourceFile: string | null = null;
  let koppenSourceFile: string | null = null;
  let jupiterSourceFile: string | null = null;
  let outputFile = path.join(repositoryRoot, '.local', 'reference-data', 'sol-earth-reference.wforge');
  let reportFile: string | null = null;
  let preparedOnly = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    switch (argument) {
      case '--width':
        earthWidth = positiveInteger(requireValue(argv, ++index, argument), argument);
        break;
      case '--height':
        earthHeight = positiveInteger(requireValue(argv, ++index, argument), argument);
        break;
      case '--topology-resolution':
        topologyResolution = positiveInteger(requireValue(argv, ++index, argument), argument);
        break;
      case '--earth-bundle':
        earthBundleDirectory = path.resolve(cwd, requireValue(argv, ++index, argument));
        break;
      case '--jupiter-bundle':
        jupiterBundleDirectory = path.resolve(cwd, requireValue(argv, ++index, argument));
        break;
      case '--earth-source':
        earthSourceFile = path.resolve(cwd, requireValue(argv, ++index, argument));
        break;
      case '--koppen-source':
        koppenSourceFile = path.resolve(cwd, requireValue(argv, ++index, argument));
        break;
      case '--jupiter-source':
        jupiterSourceFile = path.resolve(cwd, requireValue(argv, ++index, argument));
        break;
      case '--output':
        outputFile = path.resolve(cwd, requireValue(argv, ++index, argument));
        break;
      case '--report':
        reportFile = path.resolve(cwd, requireValue(argv, ++index, argument));
        break;
      case '--prepared-only':
        preparedOnly = true;
        break;
      default:
        throw new Error(`Unknown Sol reference pipeline argument: ${argument}`);
    }
  }

  if (earthWidth !== earthHeight * 2) {
    throw new Error(`Earth reference dimensions must remain 2:1; received ${earthWidth} x ${earthHeight}.`);
  }
  if (preparedOnly && (earthSourceFile || koppenSourceFile || jupiterSourceFile)) {
    throw new Error('--prepared-only cannot be combined with source-file overrides.');
  }

  return {
    repositoryRoot: path.resolve(repositoryRoot),
    earthWidth,
    earthHeight,
    topologyResolution,
    earthBundleDirectory,
    jupiterBundleDirectory,
    earthSourceFile,
    koppenSourceFile,
    jupiterSourceFile,
    outputFile,
    reportFile: reportFile ?? `${outputFile}.pipeline.json`,
    preparedOnly,
  };
}

export function buildSolReferencePipelineCommands(
  options: SolReferencePipelineOptions,
  env: NodeJS.ProcessEnv = process.env,
): SolReferencePipelineCommand[] {
  const python = cleanText(env.PYTHON) ?? 'python';
  const node = cleanText(env.NODE) ?? process.execPath;
  const tsxCli = path.join(options.repositoryRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const commands: SolReferencePipelineCommand[] = [];

  if (!options.preparedOnly) {
    const earthArgs = [
      path.join('tools', 'reference-etl', 'prepare_etopo_earth.py'),
      '--output', options.earthBundleDirectory,
      '--width', String(options.earthWidth),
      '--height', String(options.earthHeight),
      '--topology-resolution', String(options.topologyResolution),
    ];
    if (options.earthSourceFile) earthArgs.push('--input', options.earthSourceFile);
    if (options.koppenSourceFile) earthArgs.push('--koppen-input', options.koppenSourceFile);
    commands.push({ stage: 'prepare-earth', command: python, args: earthArgs });

    const jupiterArgs = [
      path.join('tools', 'reference-etl', 'prepare_jupiter_reference.py'),
      '--output', options.jupiterBundleDirectory,
    ];
    if (options.jupiterSourceFile) jupiterArgs.push('--input', options.jupiterSourceFile);
    commands.push({ stage: 'prepare-jupiter', command: python, args: jupiterArgs });
  }

  commands.push({
    stage: 'build-sol-package',
    command: node,
    args: [
      tsxCli,
      '--tsconfig', path.join(options.repositoryRoot, 'tsconfig.scripts.json'),
      path.join(options.repositoryRoot, 'scripts', 'build-earth-reference.ts'),
      '--input', options.earthBundleDirectory,
      '--jupiter-input', options.jupiterBundleDirectory,
      '--output', options.outputFile,
    ],
  });
  return commands;
}

export async function runSolReferencePipeline(
  options: SolReferencePipelineOptions,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const startedAt = Date.now();
  const commands = buildSolReferencePipelineCommands(options, env);

  for (const command of commands) {
    console.log(`\n[${command.stage}] ${command.command} ${command.args.map(quoteForLog).join(' ')}`);
    await runCommand(command, options.repositoryRoot, env);
  }

  const earthManifestPath = path.join(options.earthBundleDirectory, 'manifest.json');
  const jupiterManifestPath = path.join(options.jupiterBundleDirectory, 'manifest.json');
  await requireFile(earthManifestPath, 'Prepared Earth manifest');
  await requireFile(jupiterManifestPath, 'Prepared Jupiter manifest');
  await requireFile(options.outputFile, 'Sol reference package');

  const [earthManifest, jupiterManifest, packageBytes] = await Promise.all([
    readFile(earthManifestPath),
    readFile(jupiterManifestPath),
    readFile(options.outputFile),
  ]);
  const completedAt = Date.now();
  const report = {
    schema: SOL_REFERENCE_PIPELINE_REPORT_SCHEMA,
    pipelineVersion: 1,
    mode: options.preparedOnly ? 'prepared-bundles-to-package' : 'source-to-package',
    startedAt: new Date(startedAt).toISOString(),
    completedAt: new Date(completedAt).toISOString(),
    elapsedMs: completedAt - startedAt,
    sourceCommit: cleanText(env.WORLD_FORGE_SOURCE_COMMIT),
    parameters: {
      earthResolution: { width: options.earthWidth, height: options.earthHeight },
      topologyResolution: options.topologyResolution,
    },
    inputs: {
      earthManifest: fileEvidence(earthManifestPath, earthManifest, options.repositoryRoot),
      jupiterManifest: fileEvidence(jupiterManifestPath, jupiterManifest, options.repositoryRoot),
    },
    output: fileEvidence(options.outputFile, packageBytes, options.repositoryRoot),
    stages: commands.map((command) => command.stage),
  };

  await mkdir(path.dirname(options.reportFile), { recursive: true });
  await writeFile(options.reportFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`\nSol reference package: ${options.outputFile}`);
  console.log(`Package bytes: ${packageBytes.byteLength}`);
  console.log(`Package digest: ${sha256Label(packageBytes)}`);
  console.log(`Pipeline report: ${options.reportFile}`);
}

function fileEvidence(filePath: string, bytes: Uint8Array, repositoryRoot: string) {
  return {
    path: portablePath(path.relative(repositoryRoot, filePath) || path.basename(filePath)),
    byteLength: bytes.byteLength,
    sha256: sha256Label(bytes),
  };
}

function sha256Label(bytes: Uint8Array): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function portablePath(value: string): string {
  return value.split(path.sep).join('/');
}

function runCommand(
  command: SolReferencePipelineCommand,
  cwd: string,
  env: NodeJS.ProcessEnv,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command.command, command.args, {
      cwd,
      env,
      stdio: 'inherit',
      shell: false,
    });
    child.once('error', (error) => reject(new Error(`${command.stage} could not start: ${error.message}`)));
    child.once('close', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      const detail = signal ? `signal ${signal}` : `exit code ${code ?? 'unknown'}`;
      reject(new Error(`${command.stage} failed with ${detail}.`));
    });
  });
}

async function requireFile(filePath: string, label: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    throw new Error(`${label} is missing: ${filePath}`);
  }
}

function requireValue(argv: string[], index: number, name: string): string {
  const value = argv[index]?.trim();
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value.`);
  return value;
}

function positiveInteger(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

function cleanText(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}

function quoteForLog(value: string): string {
  return /\s/.test(value) ? JSON.stringify(value) : value;
}

async function main(): Promise<void> {
  const options = parseSolReferencePipelineOptions(process.argv.slice(2));
  await runSolReferencePipeline(options);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

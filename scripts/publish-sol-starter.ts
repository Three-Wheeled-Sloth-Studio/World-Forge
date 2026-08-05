import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  parseSolReferencePipelineOptions,
  runSolReferencePipeline,
} from './build-sol-reference-pipeline';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');

export function parchmentCandidateRoots(
  worldForgeRoot: string,
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const configured = cleanText(env.PARCHMENT_WORLDS_LOCAL_PATH);
  return uniquePaths([
    configured ? path.resolve(worldForgeRoot, configured) : null,
    path.resolve(worldForgeRoot, '..', 'Parchment-Worlds'),
    path.resolve(worldForgeRoot, '..', 'parchment-worlds'),
  ]);
}

export function parchmentChildEnvironment(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const childEnvironment = { ...env };
  delete childEnvironment.TSX_TSCONFIG_PATH;
  return childEnvironment;
}

export async function resolveParchmentRoot(
  worldForgeRoot: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  const candidates = parchmentCandidateRoots(worldForgeRoot, env);
  for (const candidate of candidates) {
    if (
      await fileExists(path.join(candidate, 'package.json'))
      && await fileExists(path.join(
        candidate,
        'packages',
        'project-model',
        'tools',
        'generateSolStarterPackage.ts',
      ))
    ) {
      return candidate;
    }
  }

  throw new Error([
    'A sibling Parchment-Worlds checkout was not found.',
    'Set PARCHMENT_WORLDS_LOCAL_PATH to the checkout directory or place it beside World-Forge.',
    'Searched:',
    ...candidates.map((candidate) => `  ${candidate}`),
  ].join('\n'));
}

export async function publishSolStarter(
  worldForgeRoot = repositoryRoot,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const marsBundle = path.join(
    worldForgeRoot,
    '.local',
    'reference-data',
    'mars-mola-viking',
  );
  await requireFile(path.join(marsBundle, 'manifest.json'), 'Prepared Mars bundle');

  const pipelineOptions = parseSolReferencePipelineOptions([
    '--prepared-only',
    '--body-input', marsBundle,
  ], worldForgeRoot, worldForgeRoot);

  await runSolReferencePipeline(pipelineOptions, env);

  const parchmentRoot = await resolveParchmentRoot(worldForgeRoot, env);
  const npmExecPath = cleanText(env.npm_execpath);
  if (!npmExecPath) {
    throw new Error(
      'npm_execpath is unavailable. Run this publisher through '
      + '`npm run reference:publish-sol-starter`.',
    );
  }

  const args = [
    npmExecPath,
    'run',
    'generate:sol-starter',
    '--',
    '--world-forge',
    pipelineOptions.outputFile,
  ];
  console.log(`\n[publish-parchment-starter] ${process.execPath} ${args.map(quoteForLog).join(' ')}`);
  await runCommand(
    process.execPath,
    args,
    parchmentRoot,
    parchmentChildEnvironment(env),
  );

  console.log('\nPublished the enriched Sol starter package for Parchment Worlds.');
  console.log(`World Forge package: ${pipelineOptions.outputFile}`);
  console.log(`Parchment checkout: ${parchmentRoot}`);
  console.log(
    `Starter package: ${path.join(
      parchmentRoot,
      'apps',
      'web',
      'public',
      'starter-projects',
      'sol-system.pworld',
    )}`,
  );
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: 'inherit',
      shell: false,
    });
    child.once('error', (error) => reject(new Error(
      `Parchment starter generation could not start: ${error.message}`,
    )));
    child.once('close', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      const detail = signal ? `signal ${signal}` : `exit code ${code ?? 'unknown'}`;
      reject(new Error(`Parchment starter generation failed with ${detail}.`));
    });
  });
}

async function requireFile(filePath: string, label: string): Promise<void> {
  if (!await fileExists(filePath)) {
    throw new Error(`${label} is missing: ${filePath}`);
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

function uniquePaths(values: Array<string | null>): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    if (!value) continue;
    const resolved = path.resolve(value);
    const key = process.platform === 'win32' ? resolved.toLowerCase() : resolved;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(resolved);
  }
  return output;
}

function cleanText(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}

function quoteForLog(value: string): string {
  return /\s/.test(value) ? JSON.stringify(value) : value;
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  publishSolStarter().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

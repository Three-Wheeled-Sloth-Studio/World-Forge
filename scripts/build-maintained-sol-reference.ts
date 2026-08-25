import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export type MaintainedSolBuildCommand = {
  stage: 'prepare-mars' | 'pipeline-sol';
  command: string;
  args: string[];
};

export type MaintainedSolBuildOptions = {
  env?: NodeJS.ProcessEnv;
  runCommand?: (command: MaintainedSolBuildCommand, env: NodeJS.ProcessEnv) => Promise<void>;
  prepareEnvironment?: (env: NodeJS.ProcessEnv) => Promise<NodeJS.ProcessEnv>;
  sleep?: (milliseconds: number) => Promise<void>;
  pipelineAttempts?: number;
};

export function maintainedSolBuildCommands(platform = process.platform): {
  prepareMars: MaintainedSolBuildCommand;
  pipelineSol: MaintainedSolBuildCommand;
} {
  const npm = platform === 'win32' ? 'npm.cmd' : 'npm';
  return {
    prepareMars: {
      stage: 'prepare-mars',
      command: npm,
      args: ['run', 'reference:prepare-mars'],
    },
    pipelineSol: {
      stage: 'pipeline-sol',
      command: npm,
      args: [
        'run',
        'reference:pipeline-sol',
        '--',
        '--body-input',
        '.local/reference-data/mars-mola-viking',
      ],
    },
  };
}

export function referencePythonPaths(
  repositoryRoot = process.cwd(),
  platform = process.platform,
): { root: string; python: string; bin: string; marker: string } {
  const root = path.join(repositoryRoot, '.local', 'reference-python');
  const bin = platform === 'win32' ? path.join(root, 'Scripts') : path.join(root, 'bin');
  return {
    root,
    python: path.join(bin, platform === 'win32' ? 'python.exe' : 'python'),
    bin,
    marker: path.join(root, 'world-forge-requirements.sha256'),
  };
}

export async function prepareReferenceEnvironment(
  env: NodeJS.ProcessEnv = process.env,
  repositoryRoot = process.cwd(),
): Promise<NodeJS.ProcessEnv> {
  const requirementsPath = path.join(repositoryRoot, 'tools', 'reference-etl', 'requirements.txt');
  const requirements = await readFile(requirementsPath);
  const requirementsDigest = createHash('sha256').update(requirements).digest('hex');
  const venv = referencePythonPaths(repositoryRoot);
  const bootstrapPython = cleanText(env.WORLD_FORGE_BOOTSTRAP_PYTHON) ?? cleanText(env.PYTHON) ?? 'python';

  if (!await fileExists(venv.python)) {
    await mkdir(path.dirname(venv.root), { recursive: true });
    console.log(`Creating World Forge reference Python environment at ${venv.root}`);
    await runSetupCommand(bootstrapPython, ['-m', 'venv', venv.root], repositoryRoot, env);
  }

  const installedDigest = await readTextIfPresent(venv.marker);
  if (installedDigest?.trim() !== requirementsDigest) {
    console.log('Installing World Forge reference ETL dependencies into the repo-local Python environment.');
    await runSetupCommand(
      venv.python,
      ['-m', 'pip', 'install', '--disable-pip-version-check', '-r', requirementsPath],
      repositoryRoot,
      env,
    );
    await writeFile(venv.marker, `${requirementsDigest}\n`, 'utf8');
  }

  const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
  const existingPath = env[pathKey] ?? process.env.PATH ?? '';
  return {
    ...env,
    [pathKey]: existingPath ? `${venv.bin}${path.delimiter}${existingPath}` : venv.bin,
    PYTHON: venv.python,
  };
}

export async function buildMaintainedSolReference(
  options: MaintainedSolBuildOptions = {},
): Promise<void> {
  const baseEnv = options.env ?? process.env;
  const prepareEnvironment = options.prepareEnvironment ?? prepareReferenceEnvironment;
  const env = await prepareEnvironment(baseEnv);
  const commands = maintainedSolBuildCommands();
  const runCommand = options.runCommand ?? runChildCommand;
  const sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const attempts = Math.max(1, options.pipelineAttempts ?? 3);

  await runCommand(commands.prepareMars, env);

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await runCommand(commands.pipelineSol, env);
      return;
    } catch (error) {
      lastError = error;
      if (attempt >= attempts) break;
      const delayMs = Math.min(30_000, 5_000 * attempt);
      const detail = error instanceof Error ? error.message : String(error);
      console.warn(
        `Maintained Sol source pipeline attempt ${attempt} of ${attempts} failed: ${detail}. Retrying in ${Math.round(delayMs / 1000)}s.`,
      );
      await sleep(delayMs);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Maintained Sol source pipeline failed after ${attempts} attempts.`);
}

function runChildCommand(
  command: MaintainedSolBuildCommand,
  env: NodeJS.ProcessEnv,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command.command, command.args, {
      cwd: process.cwd(),
      env,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command.stage} exited with code ${String(code)}.`));
    });
  });
}

function runSetupCommand(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: 'inherit' });
    child.once('error', (error) => {
      reject(new Error(
        `Unable to start Python while preparing the World Forge reference environment (${error.message}). `
        + 'Install Python 3 or set WORLD_FORGE_BOOTSTRAP_PYTHON to a Python 3 executable.',
      ));
    });
    child.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Reference Python setup exited with code ${String(code)}.`));
    });
  });
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readTextIfPresent(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

function cleanText(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  await buildMaintainedSolReference();
}

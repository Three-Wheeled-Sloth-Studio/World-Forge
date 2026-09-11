import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  buildMaintainedSolReference,
  childLaunchPlan,
  ensureReferencePythonEnvironment,
  maintainedSolBuildCommands,
  referencePipInstallArgs,
  referencePythonBootstrapPlans,
  referencePythonPaths,
  retryReferenceSetupOperation,
  type MaintainedSolBuildCommand,
} from './build-maintained-sol-reference.js';

describe('maintained Sol reference command', () => {
  it('routes the public npm entry point through the maintained orchestrator', () => {
    const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const packageFile = JSON.parse(readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageFile.scripts?.['reference:build-sol']).toBe(
      'tsx --tsconfig tsconfig.scripts.json scripts/build-maintained-sol-reference.ts',
    );
  });

  it('owns Mars preparation and the full source-to-package pipeline', () => {
    expect(maintainedSolBuildCommands('linux')).toEqual({
      prepareMars: {
        stage: 'prepare-mars',
        command: 'npm',
        args: ['run', 'reference:prepare-mars'],
      },
      pipelineSol: {
        stage: 'pipeline-sol',
        command: 'npm',
        args: [
          'run',
          'reference:pipeline-sol',
          '--',
          '--body-input',
          '.local/reference-data/mars-mola-viking',
        ],
      },
    });
    expect(maintainedSolBuildCommands('win32').prepareMars.command).toBe('npm.cmd');
  });

  it('launches Windows npm stages through Node when npm_execpath is available', () => {
    const command = maintainedSolBuildCommands('win32').prepareMars;
    const npmCli = 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js';
    expect(childLaunchPlan(command, { npm_execpath: npmCli }, 'win32')).toEqual({
      command: process.execPath,
      args: [npmCli, 'run', 'reference:prepare-mars'],
    });
  });

  it('falls back to cmd.exe rather than spawning a .cmd file directly on Windows', () => {
    const command = maintainedSolBuildCommands('win32').prepareMars;
    expect(childLaunchPlan(command, { ComSpec: 'C:\\Windows\\System32\\cmd.exe' }, 'win32')).toEqual({
      command: 'C:\\Windows\\System32\\cmd.exe',
      args: ['/d', '/s', '/c', 'npm.cmd', 'run', 'reference:prepare-mars'],
    });
  });

  it('keeps reference Python dependencies in a repo-local environment on each platform', () => {
    expect(referencePythonPaths('/repo', 'linux')).toMatchObject({
      root: path.join('/repo', '.local', 'reference-python'),
      python: path.join('/repo', '.local', 'reference-python', 'bin', 'python'),
    });
    expect(referencePythonPaths('C:\\repo', 'win32').python)
      .toBe(path.join('C:\\repo', '.local', 'reference-python', 'Scripts', 'python.exe'));
  });

  it('prefers the Windows Python launcher and keeps uv as a self-healing managed fallback', () => {
    const root = path.join('C:\\repo', '.local', 'reference-python');
    expect(referencePythonBootstrapPlans({}, root, 'win32').slice(0, 2)).toEqual([
      {
        label: 'Windows Python launcher',
        command: 'py',
        args: ['-3', '-m', 'venv', root],
      },
      {
        label: 'uv managed Python 3.11',
        command: 'uv',
        args: ['venv', '--python', '3.11', '--seed', root],
      },
    ]);
  });

  it('honors explicit Python overrides before automatic bootstrap discovery', () => {
    const root = path.join('C:\\repo', '.local', 'reference-python');
    const plans = referencePythonBootstrapPlans({
      WORLD_FORGE_BOOTSTRAP_PYTHON: 'C:\\Python311\\python.exe',
      PYTHON: 'C:\\OtherPython\\python.exe',
    }, root, 'win32');

    expect(plans.slice(0, 2)).toEqual([
      {
        label: 'WORLD_FORGE_BOOTSTRAP_PYTHON override',
        command: 'C:\\Python311\\python.exe',
        args: ['-m', 'venv', root],
      },
      {
        label: 'PYTHON environment override',
        command: 'C:\\OtherPython\\python.exe',
        args: ['-m', 'venv', root],
      },
    ]);
  });

  it('rejects false-success bootstrap commands and falls through until a usable venv exists', async () => {
    const repositoryRoot = 'C:\\repo';
    const venv = referencePythonPaths(repositoryRoot, 'win32');
    let pythonPresent = false;
    const removals: string[] = [];
    const calls: Array<{ command: string; args: string[] }> = [];

    await ensureReferencePythonEnvironment({}, repositoryRoot, {
      platform: 'win32',
      fileExists: async (filePath) => filePath === venv.python && pythonPresent,
      removeRoot: async (root) => { removals.push(root); },
      runSetup: async (command, args) => {
        calls.push({ command, args });
        if (command === 'py') throw new Error('launcher unavailable');
        if (command === 'uv') return; // Simulate a command that exits 0 but creates no interpreter.
        if (command === 'python3') {
          pythonPresent = true;
          return;
        }
        if (command === venv.python) return;
        throw new Error(`unexpected command ${command}`);
      },
    });

    expect(calls.map((call) => call.command)).toEqual(['py', 'uv', 'python3', venv.python]);
    expect(removals).toEqual([venv.root, venv.root, venv.root]);
  });

  it('repairs an existing venv whose Python or pip can no longer run', async () => {
    const repositoryRoot = 'C:\\repo';
    const venv = referencePythonPaths(repositoryRoot, 'win32');
    let firstHealthCheck = true;
    const removals: string[] = [];
    const calls: Array<{ command: string; args: string[] }> = [];

    await ensureReferencePythonEnvironment({}, repositoryRoot, {
      platform: 'win32',
      fileExists: async (filePath) => filePath === venv.python,
      removeRoot: async (root) => { removals.push(root); },
      runSetup: async (command, args) => {
        calls.push({ command, args });
        if (command === venv.python && firstHealthCheck) {
          firstHealthCheck = false;
          throw new Error('pip is broken');
        }
        if (command === 'py' || command === venv.python) return;
        throw new Error(`unexpected command ${command}`);
      },
    });

    expect(calls.map((call) => call.command)).toEqual([venv.python, 'py', venv.python]);
    expect(removals).toEqual([venv.root, venv.root]);
  });

  it('gives pip enough timeout and transport retries for slow reference dependency downloads', () => {
    expect(referencePipInstallArgs('requirements.txt')).toEqual([
      '-m',
      'pip',
      'install',
      '--disable-pip-version-check',
      '--timeout',
      '120',
      '--retries',
      '10',
      '-r',
      'requirements.txt',
    ]);
  });

  it('retries the dependency bootstrap process after pip exits', async () => {
    let attempts = 0;
    const sleep = vi.fn(async () => undefined);
    await retryReferenceSetupOperation(async () => {
      attempts += 1;
      if (attempts < 3) throw new Error('pip timed out');
    }, { sleep, attempts: 3, label: 'Reference Python dependency install' });

    expect(attempts).toBe(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 5_000);
    expect(sleep).toHaveBeenNthCalledWith(2, 10_000);
  });

  it('retries transient source-pipeline failures without re-preparing Mars', async () => {
    const calls: MaintainedSolBuildCommand[] = [];
    let pipelineAttempts = 0;
    const runCommand = vi.fn(async (command: MaintainedSolBuildCommand) => {
      calls.push(command);
      if (command.stage !== 'pipeline-sol') return;
      pipelineAttempts += 1;
      if (pipelineAttempts < 3) throw new Error('transient source failure');
    });
    const sleep = vi.fn(async () => undefined);

    await buildMaintainedSolReference({
      env: {},
      prepareEnvironment: async (env) => env,
      runCommand,
      sleep,
      pipelineAttempts: 3,
    });

    expect(calls.filter((command) => command.stage === 'prepare-mars')).toHaveLength(1);
    expect(calls.filter((command) => command.stage === 'pipeline-sol')).toHaveLength(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 5_000);
    expect(sleep).toHaveBeenNthCalledWith(2, 10_000);
  });

  it('passes the prepared reference environment to every build stage', async () => {
    const prepared = { PATH: '/reference/bin', PYTHON: '/reference/bin/python' };
    const seen: NodeJS.ProcessEnv[] = [];
    await buildMaintainedSolReference({
      env: { PATH: '/base' },
      prepareEnvironment: async () => prepared,
      runCommand: async (_command, env) => { seen.push(env); },
    });

    expect(seen).toHaveLength(2);
    expect(seen.every((env) => env === prepared)).toBe(true);
  });

  it('surfaces the final pipeline failure after the retry budget is exhausted', async () => {
    const runCommand = vi.fn(async (command: MaintainedSolBuildCommand) => {
      if (command.stage === 'pipeline-sol') throw new Error('source unavailable');
    });

    await expect(buildMaintainedSolReference({
      env: {},
      prepareEnvironment: async (env) => env,
      runCommand,
      sleep: async () => undefined,
      pipelineAttempts: 2,
    })).rejects.toThrow('source unavailable');
  });
});

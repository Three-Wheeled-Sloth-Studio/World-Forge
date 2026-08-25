import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  buildMaintainedSolReference,
  maintainedSolBuildCommands,
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
      runCommand,
      sleep,
      pipelineAttempts: 3,
    });

    expect(calls.filter((command) => command.stage === 'prepare-mars')).toHaveLength(1);
    expect(calls.filter((command) => command.stage === 'pipeline-sol')).toHaveLength(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 5_000);
    expect(sleep).toHaveBeenNthCalledWith(2, 10_000);
  });

  it('surfaces the final pipeline failure after the retry budget is exhausted', async () => {
    const runCommand = vi.fn(async (command: MaintainedSolBuildCommand) => {
      if (command.stage === 'pipeline-sol') throw new Error('source unavailable');
    });

    await expect(buildMaintainedSolReference({
      env: {},
      runCommand,
      sleep: async () => undefined,
      pipelineAttempts: 2,
    })).rejects.toThrow('source unavailable');
  });
});

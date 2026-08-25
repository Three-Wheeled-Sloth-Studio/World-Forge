import { spawn } from 'node:child_process';

export type MaintainedSolBuildCommand = {
  stage: 'prepare-mars' | 'pipeline-sol';
  command: string;
  args: string[];
};

export type MaintainedSolBuildOptions = {
  env?: NodeJS.ProcessEnv;
  runCommand?: (command: MaintainedSolBuildCommand, env: NodeJS.ProcessEnv) => Promise<void>;
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

export async function buildMaintainedSolReference(
  options: MaintainedSolBuildOptions = {},
): Promise<void> {
  const env = options.env ?? process.env;
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

if (import.meta.url === new URL(`file://${process.argv[1]?.replace(/\\/g, '/')}`).href) {
  await buildMaintainedSolReference();
}

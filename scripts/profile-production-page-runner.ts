#!/usr/bin/env node
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import process from 'node:process';

type CommandSpec = {
  command: string;
  args: string[];
};

type SpawnOptions = {
  env?: NodeJS.ProcessEnv;
  stdio?: 'inherit' | ['ignore', 'pipe', 'pipe'];
  detached?: boolean;
};

function sourceCommit(): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown-local-commit';
  }
}

function quoteCmdArgument(value: string): string {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(value)) return value;
  return `"${value.replace(/%/g, '%%').replace(/(["^&|<>])/g, '^$1')}"`;
}

export function npmCommand(
  args: string[],
  platform = process.platform,
  execPath = process.execPath,
  npmExecPath = process.env.npm_execpath,
  comSpec = process.env.ComSpec
): CommandSpec {
  if (npmExecPath?.trim()) {
    return {
      command: execPath,
      args: [npmExecPath, ...args]
    };
  }

  if (platform === 'win32') {
    return {
      command: comSpec?.trim() || 'cmd.exe',
      args: ['/d', '/s', '/c', `npm.cmd ${args.map(quoteCmdArgument).join(' ')}`]
    };
  }

  return { command: 'npm', args };
}

function spawnCommand(spec: CommandSpec, options: SpawnOptions = {}): ChildProcess {
  return spawn(spec.command, spec.args, {
    cwd: process.cwd(),
    env: options.env || process.env,
    stdio: options.stdio || 'inherit',
    detached: options.detached || false
  });
}

async function runCommand(spec: CommandSpec, env = process.env): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawnCommand(spec, { env });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${spec.command} ${spec.args.join(' ')} failed with ${signal ? `signal ${signal}` : `exit code ${code}`}.`));
    });
  });
}

function optionValue(args: string[], flag: string): string | undefined {
  const index = args.lastIndexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function positivePort(args: string[]): number {
  const raw = optionValue(args, '--port');
  if (!raw) return 4173;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65535) throw new Error('--port must be an integer from 1 through 65535.');
  return value;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url: string, child: ChildProcess, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Preview server exited with code ${child.exitCode}.`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The preview server is still starting.
    }
    await delay(250);
  }
  throw new Error(`Preview server did not become ready at ${url}.`);
}

function startPreviewServer(port: number): ChildProcess {
  const child = spawnCommand(npmCommand(['run', 'preview', '--', '--port', String(port), '--strictPort']), {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32'
  });
  child.stdout?.on('data', (chunk) => process.stdout.write(`[preview] ${String(chunk)}`));
  child.stderr?.on('data', (chunk) => process.stderr.write(`[preview] ${String(chunk)}`));
  return child;
}

async function stopPreviewServer(child: ChildProcess | undefined): Promise<void> {
  if (!child || child.exitCode !== null || !child.pid) return;
  if (process.platform === 'win32') {
    await new Promise<void>((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
      killer.once('exit', () => resolve());
      killer.once('error', () => resolve());
    });
    return;
  }
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }
  await delay(250);
}

export function innerHarnessArgs(args: string[], baseUrl: string): string[] {
  return ['run', 'profile:production-page:inner', '--', ...args, '--skip-build', '--base-url', baseUrl];
}

function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Runner self-test failed: ${message}`);
}

function runSelfTest(): void {
  const windowsViaNpmCli = npmCommand(
    ['run', 'build'],
    'win32',
    'C:\\Program Files\\nodejs\\node.exe',
    'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js',
    'C:\\Windows\\System32\\cmd.exe'
  );
  requireCondition(windowsViaNpmCli.command.endsWith('node.exe'), 'Windows should execute the npm CLI through Node.');
  requireCondition(windowsViaNpmCli.args[0]?.endsWith('npm-cli.js'), 'Windows npm CLI path should be preserved as one argument.');

  const windowsFallback = npmCommand(['run', 'build'], 'win32', 'node.exe', undefined, 'C:\\Windows\\System32\\cmd.exe');
  requireCondition(windowsFallback.command.endsWith('cmd.exe'), 'Windows fallback should use ComSpec.');
  requireCondition(windowsFallback.args[3] === 'npm.cmd run build', 'Windows fallback command should remain executable by cmd.exe.');

  const forwarded = innerHarnessArgs(['--plan', 'refs/testing/example plan.json'], 'http://127.0.0.1:4173');
  requireCondition(forwarded.includes('--skip-build'), 'Inner harness should not rebuild.');
  requireCondition(forwarded.at(-1) === 'http://127.0.0.1:4173', 'Inner harness should receive the managed preview URL.');
  console.log('Production page runner self-test passed.');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) {
    runSelfTest();
    return;
  }

  if (args.includes('--help') || args.includes('-h') || optionValue(args, '--base-url')) {
    await runCommand(npmCommand(['run', 'profile:production-page:inner', '--', ...args]));
    return;
  }

  const port = positivePort(args);
  const baseUrl = `http://127.0.0.1:${port}`;
  const commit = sourceCommit();
  let server: ChildProcess | undefined;

  try {
    if (!args.includes('--skip-build')) {
      console.log(`Building production page at ${commit}...`);
      await runCommand(npmCommand(['run', 'build']), {
        ...process.env,
        VITE_WORLD_FORGE_COMMIT_SHA: commit
      });
    }

    server = startPreviewServer(port);
    await waitForServer(baseUrl, server);
    await runCommand(npmCommand(innerHarnessArgs(args, baseUrl)));
  } finally {
    await stopPreviewServer(server);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});

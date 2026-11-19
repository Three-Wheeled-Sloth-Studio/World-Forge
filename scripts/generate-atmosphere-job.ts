/** Managed, one-shot JSON job endpoint for local consumers such as TWS-Video. */
import { createHash } from 'node:crypto';
import { readFile, mkdir, rename, writeFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { importMultiBodyWforge } from '../packages/exporters/src/multiBodyWforge';
import type { AtmosphericWeatherPresentationArtifact } from '@world-forge/shared';
import { projectForWorldBody, readWorldBodyCatalog } from '@world-forge/shared/worldBodies';
import {
  atmosphericWeatherSourceFromProject,
  isCurrentAtmosphericWeatherPresentationArtifact,
  runAtmosphericWeatherPresentationWorkflow,
} from '../packages/generation-runtime/src/enrichment/atmosphericWeatherPresentation';
import {
  isCurrentSystemOrbitalContextArtifact,
  runSystemOrbitalContextWorkflow,
  systemOrbitalContextSourceFromProject,
} from '../packages/generation-runtime/src/enrichment/systemOrbitalContext';

export const ATMOSPHERE_JOB_SCHEMA = 'world-forge-atmosphere-job-v1';
export const ATMOSPHERE_RESULT_SCHEMA = 'world-forge-atmosphere-result-v1';

export type AtmosphereJobRequest = {
  schema: typeof ATMOSPHERE_JOB_SCHEMA;
  sourceWforge: string;
  outputDirectory: string;
  simulationDays?: number;
  browserExecutable?: string;
  worldId?: string;
  sourceIdentity?: {
    parchmentProjectId: string;
    worldAssetId: string;
    requestedWorldProjectId: string;
    worldForgeProjectId: string;
  };
};

export function validateAtmosphereJobRequest(value: unknown): AtmosphereJobRequest {
  if (!value || typeof value !== 'object') throw new Error('INVALID_REQUEST: Request must be an object.');
  const request = value as Partial<AtmosphereJobRequest>;
  if (request.schema !== ATMOSPHERE_JOB_SCHEMA) throw new Error('INVALID_REQUEST: Unsupported job schema.');
  if (typeof request.sourceWforge !== 'string' || !path.isAbsolute(request.sourceWforge) ||
      path.extname(request.sourceWforge).toLowerCase() !== '.wforge') {
    throw new Error('INVALID_REQUEST: sourceWforge must be an absolute .wforge path.');
  }
  if (typeof request.outputDirectory !== 'string' || !path.isAbsolute(request.outputDirectory)) {
    throw new Error('INVALID_REQUEST: outputDirectory must be an absolute path.');
  }
  if (request.simulationDays !== undefined && !Number.isFinite(request.simulationDays)) {
    throw new Error('INVALID_REQUEST: simulationDays must be finite.');
  }
  if (request.browserExecutable !== undefined && (typeof request.browserExecutable !== 'string' || !path.isAbsolute(request.browserExecutable))) {
    throw new Error('INVALID_REQUEST: browserExecutable must be an absolute path.');
  }
  if (request.worldId !== undefined && !validIdentity(request.worldId)) {
    throw new Error('INVALID_REQUEST: worldId is invalid.');
  }
  if (request.sourceIdentity !== undefined) {
    if (!request.sourceIdentity || typeof request.sourceIdentity !== 'object') {
      throw new Error('INVALID_REQUEST: sourceIdentity is invalid.');
    }
    for (const field of ['parchmentProjectId', 'worldAssetId', 'requestedWorldProjectId', 'worldForgeProjectId'] as const) {
      if (!validIdentity(request.sourceIdentity[field])) throw new Error(`INVALID_REQUEST: sourceIdentity.${field} is invalid.`);
    }
  }
  if (path.resolve(request.sourceWforge) === path.resolve(request.outputDirectory)) {
    throw new Error('INVALID_REQUEST: Source and output must differ.');
  }
  return request as AtmosphereJobRequest;
}

type EventSink = (event: Record<string, unknown>) => void;
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const emitStdout: EventSink = (event) => process.stdout.write(JSON.stringify(event) + '\n');

export async function generateAtmosphereJob(
  requestValue: unknown,
  emit: EventSink = emitStdout,
  renderClouds: (weather: AtmosphericWeatherPresentationArtifact, days: number, browserExecutable?: string) => Promise<Buffer> = renderCloudsInChromium,
): Promise<void> {
  const request = validateAtmosphereJobRequest(requestValue);
  const sourceBytes = await readFile(request.sourceWforge);
  const sourceSha256 = sha256(sourceBytes);
  const importedProject = await importMultiBodyWforge(new File([sourceBytes], path.basename(request.sourceWforge)));
  if (request.sourceIdentity && request.sourceIdentity.worldForgeProjectId !== importedProject.projectId) {
    throw new Error('SOURCE_IDENTITY_MISMATCH: Persisted package project ID does not match the selected Parchment binding.');
  }
  const requestedBodyId = request.worldId ?? readWorldBodyCatalog(importedProject).primaryBodyId;
  const project = projectForWorldBody(importedProject, requestedBodyId);
  if (!project) throw new Error(`WORLD_UNAVAILABLE: Selected body ${requestedBodyId} has no persisted generated surface.`);
  let cancelled = false;
  const abort = () => { cancelled = true; };
  process.once('SIGINT', abort);
  process.once('SIGTERM', abort);
  const checkCancelled = () => { if (cancelled) throw new Error('CANCELLED: Job was cancelled.'); };
  const nodeEvent = (event: { nodeId: string; phase: string }) => {
    emit({ type: 'progress', stage: event.nodeId, phase: event.phase });
  };
  let staging: string | undefined;
  try {
    emit({ type: 'progress', stage: 'project-loaded', projectId: project.projectId });
    const orbitalKey = 'project.system-orbital-context';
    if (!isCurrentSystemOrbitalContextArtifact(project, project.enrichmentArtifacts?.[orbitalKey])) {
      const orbital = await runSystemOrbitalContextWorkflow(systemOrbitalContextSourceFromProject(project), {
        isCancelled: () => cancelled, onNodeEvent: nodeEvent,
      });
      project.enrichmentArtifacts = { ...project.enrichmentArtifacts, [orbitalKey]: orbital };
    }
    checkCancelled();
    const weatherKey = 'project.atmospheric-weather-presentation';
    const existingWeather = project.enrichmentArtifacts?.[weatherKey];
    const weather = isCurrentAtmosphericWeatherPresentationArtifact(project, existingWeather)
      ? existingWeather
      : await runAtmosphericWeatherPresentationWorkflow(atmosphericWeatherSourceFromProject(project), {
        isCancelled: () => cancelled, onNodeEvent: nodeEvent,
      });
    checkCancelled();
    emit({ type: 'progress', stage: 'render-clouds', phase: 'started' });
    const png = await renderClouds(weather, request.simulationDays ?? 0, request.browserExecutable);
    checkCancelled();
    const outputDirectory = path.resolve(request.outputDirectory);
    if (await stat(outputDirectory).then(() => true, error => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    })) throw new Error('OUTPUT_EXISTS: Completed output cannot be replaced.');
    await mkdir(path.dirname(outputDirectory), { recursive: true });
    staging = `${outputDirectory}.staging-${process.pid}-${Date.now()}`;
    await mkdir(staging);
    const atmosphere = {
      artifactKey: weather.artifactKey, artifactSignature: weather.artifactSignature,
      sourceSignature: weather.source.sourceSignature, workflow: weather.workflow,
      weatherAuthority: weather.weatherAuthority, epochIso: weather.epochIso,
      payload: weather.payload, validation: weather.validation,
    };
    const atmosphereBytes = Buffer.from(JSON.stringify(atmosphere, null, 2) + '\n');
    const manifest = {
      schema: ATMOSPHERE_RESULT_SCHEMA,
      source: {
        file: path.basename(request.sourceWforge), sha256: sourceSha256,
        projectId: project.projectId, worldId: project.primaryWorld.id, bodyId: requestedBodyId,
        ...(request.sourceIdentity ?? {}),
      },
      weather: { artifactSignature: weather.artifactSignature, sourceSignature: weather.source.sourceSignature,
        authority: 'illustrative', simulationDays: request.simulationDays ?? 0 },
      projection: 'equirectangular', resolution: weather.payload.textureResolution,
      files: {
        clouds: { path: 'clouds.png', sha256: sha256(png), bytes: png.length },
        atmosphere: { path: 'atmosphere.json', sha256: sha256(atmosphereBytes), bytes: atmosphereBytes.length },
      },
    };
    await writeFile(path.join(staging, 'clouds.png'), png);
    await writeFile(path.join(staging, 'atmosphere.json'), atmosphereBytes);
    await writeFile(path.join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    checkCancelled();
    // An immutable completed result is never overwritten. Consumer cache keys should include source SHA.
    await rename(staging, outputDirectory);
    staging = undefined;
    emit({ type: 'completed', outputDirectory, manifest });
  } finally {
    process.removeListener('SIGINT', abort);
    process.removeListener('SIGTERM', abort);
    if (staging) await rm(staging, { recursive: true, force: true });
  }
}

function validIdentity(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 240;
}

async function renderCloudsInChromium(weather: AtmosphericWeatherPresentationArtifact, days: number, browserExecutable?: string): Promise<Buffer> {
    const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const bundled = await build({
      entryPoints: [path.join(scriptRoot, 'apps/desktop/src/globe/weatherPresentationTexture.ts')],
      bundle: true, write: false, platform: 'browser', format: 'iife', globalName: 'WorldForgeWeather',
    });
    let browser;
    try {
      browser = await chromium.launch({ headless: true, ...(browserExecutable ? { executablePath: browserExecutable } : {}) });
    } catch (firstError) {
      if (browserExecutable) throw new Error(`BROWSER_UNAVAILABLE: Configured Chromium could not start: ${String(firstError)}`);
      try {
        // Windows users often have Chrome installed without Playwright's managed Chromium.
        browser = await chromium.launch({ headless: true, channel: 'chrome' });
      } catch (secondError) {
        throw new Error(`BROWSER_UNAVAILABLE: Neither Playwright Chromium nor local Chrome could start: ${String(secondError)}`);
      }
    }
    let png: Buffer;
    try {
      const page = await browser.newPage({ viewport: { width: 512, height: 256 } });
      await page.goto('about:blank');
      await page.addScriptTag({ content: bundled.outputFiles[0].text });
      const dataUrl = await page.evaluate(({ artifact, days: simulationDays }) => {
        const renderer = (window as unknown as { WorldForgeWeather: {
          createWeatherPresentationTexture: (a: typeof artifact, mode: string, days: number) => HTMLCanvasElement;
        } }).WorldForgeWeather;
        return renderer.createWeatherPresentationTexture(artifact, 'clouds', simulationDays).toDataURL('image/png');
      }, { artifact: weather, days });
      png = Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
    } finally {
      await browser.close();
    }
    return png;
}

async function main(): Promise<void> {
  if (process.argv.length !== 4 || process.argv[2] !== '--request') {
    throw new Error('INVALID_REQUEST: Expected --request <absolute-json-path>.');
  }
  const request = JSON.parse(await readFile(process.argv[3], 'utf8'));
  await generateAtmosphereJob(request);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    const message = error instanceof Error ? error.message : String(error);
    emitStdout({ type: 'error', code: message.match(/^([A-Z_]+):/)?.[1] ?? 'GENERATION_FAILED', message });
    process.exitCode = 1;
  });
}

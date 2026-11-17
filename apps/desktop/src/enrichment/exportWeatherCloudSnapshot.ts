import JSZip from 'jszip';
import type { AtmosphericWeatherPresentationArtifact } from '@world-forge/shared';
import { createWeatherPresentationTexture } from '../globe/weatherPresentationTexture';

export const WEATHER_CLOUD_SNAPSHOT_SCHEMA = 'world-forge-weather-cloud-snapshot-v1' as const;

function canvasPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Cloud PNG encoding failed')), 'image/png');
  });
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

export async function createWeatherCloudSnapshot(
  artifact: AtmosphericWeatherPresentationArtifact,
  simulationDays = 0
): Promise<Blob> {
  if (artifact.status !== 'complete' || artifact.validation.valid !== true ||
      artifact.weatherAuthority !== 'illustrative') {
    throw new Error('Cannot export incomplete or invalid World Forge weather presentation');
  }
  if (!Number.isFinite(simulationDays)) throw new Error('Simulation time must be finite');
  const canvas = createWeatherPresentationTexture(artifact, 'clouds', simulationDays);
  const png = await canvasPng(canvas);
  const pngBuffer = await png.arrayBuffer();
  const bytes = new Uint8Array(pngBuffer);
  const digest = await crypto.subtle.digest('SHA-256', pngBuffer);
  const manifest = {
    schema: WEATHER_CLOUD_SNAPSHOT_SCHEMA,
    role: 'presentation-cloud-opacity',
    authority: 'illustrative',
    bodyId: artifact.source.worldId,
    projectId: artifact.source.projectId,
    artifactKey: artifact.artifactKey,
    artifactSignature: artifact.artifactSignature,
    workflow: artifact.workflow.id,
    workflowVersion: artifact.workflow.version,
    sourceSignature: artifact.source.sourceSignature,
    seed: artifact.seed,
    epochIso: artifact.epochIso,
    simulationDays,
    projection: 'equirectangular',
    resolution: { width: canvas.width, height: canvas.height },
    file: 'clouds.png',
    sha256: hex(new Uint8Array(digest)),
    credit: 'World Forge atmospheric-weather-presentation, illustrative weather snapshot',
  };
  const zip = new JSZip();
  zip.file('clouds.png', bytes);
  zip.file('manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export async function downloadWeatherCloudSnapshot(artifact: AtmosphericWeatherPresentationArtifact): Promise<void> {
  const bundle = await createWeatherCloudSnapshot(artifact);
  const url = URL.createObjectURL(bundle);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'world-forge-' + artifact.source.projectId.replace(/[^a-z0-9_-]/gi, '-') + '-clouds.zip';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    // Release after the browser has taken the download from the click handler.
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
}

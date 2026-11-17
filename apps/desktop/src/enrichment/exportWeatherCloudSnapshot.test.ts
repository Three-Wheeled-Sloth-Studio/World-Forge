import { describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import type { AtmosphericWeatherPresentationArtifact } from '@world-forge/shared';

vi.mock('../globe/weatherPresentationTexture', () => ({
  createWeatherPresentationTexture: () => ({
    width: 512,
    height: 256,
    toBlob: (callback: (value: Blob) => void) => callback(new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }))
  })
}));
import { createWeatherCloudSnapshot, WEATHER_CLOUD_SNAPSHOT_SCHEMA } from './exportWeatherCloudSnapshot';

function artifact() {
  return {
    status: 'complete',
    validation: { valid: true, issues: [] },
    weatherAuthority: 'illustrative',
    artifactKey: 'project.atmospheric-weather-presentation',
    artifactSignature: 'weather-contract-example',
    source: { worldId: 'earth', projectId: 'sol-demo', sourceSignature: 'earth-signature' },
    workflow: { id: 'project.atmospheric-weather-presentation', version: '1.1.0' },
    seed: 'seed', epochIso: '2026-01-01T00:00:00Z'
  } as unknown as AtmosphericWeatherPresentationArtifact;
}

describe('cloud snapshot export', () => {
  it('packages validated provenance and checksummed presentation imagery', async () => {
    const blob = await createWeatherCloudSnapshot(artifact());
    const zip = await JSZip.loadAsync(new Uint8Array(await blob.arrayBuffer()));
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'));
    const image = await zip.file('clouds.png')!.async('uint8array');
    expect(manifest.schema).toBe(WEATHER_CLOUD_SNAPSHOT_SCHEMA);
    expect(manifest.authority).toBe('illustrative');
    expect(manifest.artifactSignature).toBe('weather-contract-example');
    expect(manifest.resolution).toEqual({ width: 512, height: 256 });
    const hash = await crypto.subtle.digest('SHA-256', Uint8Array.from(image).buffer);
    const actual = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
    expect(manifest.sha256).toBe(actual);
  });

  it('rejects incomplete or unvalidated weather artifacts', async () => {
    const unfinished = { ...artifact(), status: 'failed' } as unknown as AtmosphericWeatherPresentationArtifact;
    await expect(createWeatherCloudSnapshot(unfinished)).rejects.toThrow('incomplete or invalid');
  });
});

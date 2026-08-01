import type {
  AirlessRockyBodyArtifact,
  AtmosphericWeatherPresentationArtifact,
  GeneratedSystemBodyArtifact,
  StellarSurfacePresentationArtifact,
  SystemOrbitalContextArtifact
} from '@world-forge/shared';
import {
  runSystemOrbitalContextWorkflow,
  type ProjectEnrichmentNodeEvent,
  type SystemOrbitalContextSource
} from '@world-forge/generation-runtime/enrichment/systemOrbitalContext';
import {
  runAtmosphericWeatherPresentationWorkflow,
  type AtmosphericWeatherPresentationSource
} from '@world-forge/generation-runtime/enrichment/atmosphericWeatherPresentation';
import {
  runAirlessRockyBodyWorkflow,
  type AirlessRockyBodySource
} from '@world-forge/generation-runtime/enrichment/airlessRockyBody';
import {
  runSystemBodyGenerationWorkflow,
  type SystemBodyGenerationSource
} from '@world-forge/generation-runtime/enrichment/systemBodyGeneration';
import {
  runStellarSurfacePresentationWorkflow,
  type StellarSurfacePresentationSource
} from '@world-forge/generation-runtime/enrichment/stellarSurfacePresentation';

type RunOrbitalRequest = { type: 'run-system-orbital-context'; id: string; source: SystemOrbitalContextSource };
type RunWeatherRequest = { type: 'run-atmospheric-weather-presentation'; id: string; source: AtmosphericWeatherPresentationSource };
type RunAirlessRockyBodyRequest = { type: 'run-airless-rocky-body'; id: string; source: AirlessRockyBodySource };
type RunSystemBodyRequest = { type: 'run-system-body'; id: string; source: SystemBodyGenerationSource };
type RunStellarSurfaceRequest = { type: 'run-stellar-surface-presentation'; id: string; source: StellarSurfacePresentationSource };
type CancelRequest = { type: 'cancel'; id: string };
type Request = RunOrbitalRequest | RunWeatherRequest | RunAirlessRockyBodyRequest | RunSystemBodyRequest | RunStellarSurfaceRequest | CancelRequest;
type Response =
  | { type: 'stage'; id: string; stage: ProjectEnrichmentNodeEvent }
  | { type: 'complete'; id: string; artifact: SystemOrbitalContextArtifact | AtmosphericWeatherPresentationArtifact | StellarSurfacePresentationArtifact | AirlessRockyBodyArtifact | GeneratedSystemBodyArtifact }
  | { type: 'cancelled'; id: string }
  | { type: 'error'; id: string; message: string };

const cancelled = new Set<string>();

self.onmessage = async (event: MessageEvent<Request>) => {
  const message = event.data;
  if (message.type === 'cancel') { cancelled.add(message.id); return; }
  const messenger = self as unknown as { postMessage(response: Response): void };
  const options = {
    isCancelled: () => cancelled.has(message.id),
    yieldControl: () => new Promise<void>((resolve) => setTimeout(resolve, 0)),
    onNodeEvent: (stage: ProjectEnrichmentNodeEvent) => messenger.postMessage({ type: 'stage', id: message.id, stage })
  };
  try {
    const artifact = message.type === 'run-system-orbital-context'
      ? await runSystemOrbitalContextWorkflow(message.source, options)
      : message.type === 'run-atmospheric-weather-presentation'
        ? await runAtmosphericWeatherPresentationWorkflow(message.source, options)
        : message.type === 'run-stellar-surface-presentation'
          ? await runStellarSurfacePresentationWorkflow(message.source, options)
          : message.type === 'run-system-body'
            ? await runSystemBodyGenerationWorkflow(message.source, options)
            : await runAirlessRockyBodyWorkflow(message.source, options);
    if (cancelled.has(message.id)) messenger.postMessage({ type: 'cancelled', id: message.id });
    else messenger.postMessage({ type: 'complete', id: message.id, artifact });
  } catch (error) {
    if (cancelled.has(message.id)) messenger.postMessage({ type: 'cancelled', id: message.id });
    else messenger.postMessage({ type: 'error', id: message.id, message: error instanceof Error ? error.message : String(error) });
  } finally {
    cancelled.delete(message.id);
  }
};

import type { AtmosphericWeatherPresentationArtifact, SystemOrbitalContextArtifact } from '@world-forge/shared';
import {
  runSystemOrbitalContextWorkflow,
  type ProjectEnrichmentNodeEvent,
  type SystemOrbitalContextSource
} from '@world-forge/generation-runtime/enrichment/systemOrbitalContext';
import {
  runAtmosphericWeatherPresentationWorkflow,
  type AtmosphericWeatherPresentationSource
} from '@world-forge/generation-runtime/enrichment/atmosphericWeatherPresentation';

type RunOrbitalRequest = { type: 'run-system-orbital-context'; id: string; source: SystemOrbitalContextSource };
type RunWeatherRequest = { type: 'run-atmospheric-weather-presentation'; id: string; source: AtmosphericWeatherPresentationSource };
type CancelRequest = { type: 'cancel'; id: string };
type Request = RunOrbitalRequest | RunWeatherRequest | CancelRequest;
type Response =
  | { type: 'stage'; id: string; stage: ProjectEnrichmentNodeEvent }
  | { type: 'complete'; id: string; artifact: SystemOrbitalContextArtifact | AtmosphericWeatherPresentationArtifact }
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
      : await runAtmosphericWeatherPresentationWorkflow(message.source, options);
    if (cancelled.has(message.id)) messenger.postMessage({ type: 'cancelled', id: message.id });
    else messenger.postMessage({ type: 'complete', id: message.id, artifact });
  } catch (error) {
    if (cancelled.has(message.id)) messenger.postMessage({ type: 'cancelled', id: message.id });
    else messenger.postMessage({ type: 'error', id: message.id, message: error instanceof Error ? error.message : String(error) });
  } finally {
    cancelled.delete(message.id);
  }
};

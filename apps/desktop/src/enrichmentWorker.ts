import type { SystemOrbitalContextArtifact } from '@world-forge/shared';
import {
  runSystemOrbitalContextWorkflow,
  type ProjectEnrichmentNodeEvent,
  type SystemOrbitalContextSource
} from '@world-forge/generation-runtime/enrichment/systemOrbitalContext';

type RunRequest = { type: 'run-system-orbital-context'; id: string; source: SystemOrbitalContextSource };
type CancelRequest = { type: 'cancel'; id: string };
type Request = RunRequest | CancelRequest;
type Response =
  | { type: 'stage'; id: string; stage: ProjectEnrichmentNodeEvent }
  | { type: 'complete'; id: string; artifact: SystemOrbitalContextArtifact }
  | { type: 'cancelled'; id: string }
  | { type: 'error'; id: string; message: string };

const cancelled = new Set<string>();

self.onmessage = async (event: MessageEvent<Request>) => {
  const message = event.data;
  if (message.type === 'cancel') { cancelled.add(message.id); return; }
  const messenger = self as unknown as { postMessage(response: Response): void };
  try {
    const artifact = await runSystemOrbitalContextWorkflow(message.source, {
      isCancelled: () => cancelled.has(message.id),
      yieldControl: () => new Promise((resolve) => setTimeout(resolve, 0)),
      onNodeEvent: (stage) => messenger.postMessage({ type: 'stage', id: message.id, stage })
    });
    if (cancelled.has(message.id)) messenger.postMessage({ type: 'cancelled', id: message.id });
    else messenger.postMessage({ type: 'complete', id: message.id, artifact });
  } catch (error) {
    if (cancelled.has(message.id)) messenger.postMessage({ type: 'cancelled', id: message.id });
    else messenger.postMessage({ type: 'error', id: message.id, message: error instanceof Error ? error.message : String(error) });
  } finally {
    cancelled.delete(message.id);
  }
};

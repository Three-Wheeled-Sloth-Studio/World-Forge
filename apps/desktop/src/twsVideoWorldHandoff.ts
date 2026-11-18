import { exportWforge } from '@world-forge/exporters';
import { IndexedDbWorldStorageProvider } from './storage';

export type TwsWorldHandoffTarget = { port: number; token: string; worldId: string };
type HandoffPhase = 'connected' | 'loading' | 'packing' | 'sending' | 'error';

export function parseTwsWorldHandoff(search: string, hostname: string): TwsWorldHandoffTarget | null {
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') return null;
  const params = new URLSearchParams(search);
  const rawPort = params.get('twsWorldPort') ?? '';
  const token = params.get('twsWorldToken') ?? '';
  const worldId = params.get('twsWorldId') ?? '';
  const port = Number(rawPort);
  if (!/^\d{4,5}$/.test(rawPort) || !Number.isInteger(port) || port < 1024 || port > 65535 ||
      !/^[a-f0-9]{48}$/.test(token) || !worldId || worldId.length > 200) return null;
  return { port, token, worldId };
}

async function reportHandoff(target: TwsWorldHandoffTarget, phase: HandoffPhase, message: string): Promise<void> {
  const response = await fetch(`http://127.0.0.1:${target.port}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-TWS-Bridge-Token': target.token },
    body: JSON.stringify({ phase, message }),
  });
  if (!response.ok) throw new Error(`TWS-Video status receiver rejected the request (${response.status}).`);
}

export async function reportTwsHandoffFailure(target: TwsWorldHandoffTarget, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  try {
    await reportHandoff(target, 'error', message);
  } catch (reportError) {
    console.warn('World snapshot failed and TWS-Video could not receive its error status.', reportError, error);
  }
}

/** Initiated only by the selected-world action in TWS-Video. No modal or source mutation. */
export async function deliverWorldToTws(target: TwsWorldHandoffTarget): Promise<void> {
  await reportHandoff(target, 'connected', 'World Forge connected to TWS-Video.');
  await reportHandoff(target, 'loading', 'Reading selected world from World Forge browser storage...');
  const source = new IndexedDbWorldStorageProvider();
  const project = await source.loadWorld(target.worldId);
  if (!project) throw new Error('Selected world is not stored in this World Forge browser library. Open/save it in World Forge first.');
  await reportHandoff(target, 'packing', `Packaging temporary snapshot: ${project.projectName}`);
  const packageBlob = await exportWforge(project, { compressionLevel: 1 });
  await reportHandoff(target, 'sending', 'Transferring temporary world snapshot to TWS-Video...');
  const response = await fetch(`http://127.0.0.1:${target.port}/world`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', 'X-TWS-Bridge-Token': target.token },
    body: packageBlob,
  });
  if (!response.ok) throw new Error(`TWS-Video rejected the world snapshot (${response.status}).`);
}

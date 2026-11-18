import { exportWforge } from '@world-forge/exporters';
import type { WorldProject } from '@world-forge/shared';

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

/** Uses the current, potentially unsaved in-memory world in the already-open app. */
export async function deliverWorldToTws(target: TwsWorldHandoffTarget, project: WorldProject): Promise<void> {
  if (project.projectId !== target.worldId) throw new Error('Active World Forge project identity differs from the selected project.');
  await reportHandoff(target, 'connected', 'World Forge connected to TWS-Video.');
  await reportHandoff(target, 'loading', 'Reading active World Forge project...');
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

/** Polls only for the active world ID; no navigation or new World Forge tab is necessary. */
export async function takeActiveWorldHandoff(projectId: string): Promise<TwsWorldHandoffTarget | null> {
  const response = await fetch(`/__tws/world-handoff/pending?projectId=${encodeURIComponent(projectId)}`, {
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object' || !('request' in payload)) return null;
  const request = (payload as { request: unknown }).request;
  if (!request || typeof request !== 'object') return null;
  const record = request as Record<string, unknown>;
  if (record.projectId !== projectId || typeof record.port !== 'number' ||
      !Number.isInteger(record.port) || record.port < 1024 || record.port > 65535 ||
      typeof record.token !== 'string' || !/^[a-f0-9]{48}$/.test(record.token)) return null;
  return { worldId: projectId, port: record.port, token: record.token };
}

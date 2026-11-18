import { exportWforge } from '@world-forge/exporters';
import { IndexedDbWorldStorageProvider } from './storage';

export type TwsWorldHandoffTarget = { port: number; token: string; worldId: string };

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

/** Only invoked after an explicit TWS-Video request. Neither library nor active project is changed. */
export async function deliverWorldToTws(target: TwsWorldHandoffTarget): Promise<void> {
  const source = new IndexedDbWorldStorageProvider();
  const project = await source.loadWorld(target.worldId);
  if (!project) throw new Error('World is not stored in this World Forge browser library.');
  if (!window.confirm(`Send a temporary, read-only snapshot of "${project.projectName}" to local TWS-Video?`)) {
    throw new Error('World handoff declined.');
  }
  const packageBlob = await exportWforge(project, { compressionLevel: 1 });
  const response = await fetch(`http://127.0.0.1:${target.port}/world`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', 'X-TWS-Bridge-Token': target.token },
    body: packageBlob,
  });
  if (!response.ok) throw new Error(`TWS-Video rejected the world snapshot (${response.status}).`);
}

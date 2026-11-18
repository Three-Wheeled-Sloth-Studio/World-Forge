import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

export type LocalWorldHandoffRequest = {
  projectId: string;
  port: number;
  token: string;
};

const ttlMs = 120_000;

export function parseLocalWorldHandoffRequest(body: unknown): LocalWorldHandoffRequest | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  if (typeof record.projectId !== 'string' || !record.projectId || record.projectId.length > 200 ||
      typeof record.port !== 'number' || !Number.isInteger(record.port) || record.port < 1024 || record.port > 65535 ||
      typeof record.token !== 'string' || !/^[a-f0-9]{48}$/.test(record.token)) return null;
  return { projectId: record.projectId, port: record.port, token: record.token };
}

export function createLocalWorldHandoffQueue(now: () => number = Date.now) {
  const pending: Array<LocalWorldHandoffRequest & { added: number }> = [];
  function prune() {
    for (let index = pending.length - 1; index >= 0; index--) {
      if (now() - pending[index].added >= ttlMs) pending.splice(index, 1);
    }
  }
  return {
    enqueue(request: LocalWorldHandoffRequest) {
      prune();
      pending.push({ ...request, added: now() });
      if (pending.length > 8) pending.shift();
    },
    take(projectId: string): LocalWorldHandoffRequest | null {
      prune();
      const index = pending.findIndex((request) => request.projectId === projectId);
      if (index < 0) return null;
      const [request] = pending.splice(index, 1);
      return { projectId: request.projectId, port: request.port, token: request.token };
    },
  };
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

function loopbackRequest(request: IncomingMessage): boolean {
  const remote = request.socket.remoteAddress;
  return remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1';
}

/** Dev-only loopback rendezvous. The World Forge browser owns active project state. */
export function twsWorldHandoffPlugin(): Plugin {
  const queue = createLocalWorldHandoffQueue();
  return {
    name: 'local-tws-world-handoff',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__tws/world-handoff', (request, response, next) => {
        if (!loopbackRequest(request)) {
          sendJson(response, 403, { error: 'Loopback only' });
          return;
        }
        if (request.method === 'POST' && request.url === '/request') {
          if (request.headers.origin || request.headers['x-tws-local-request'] !== '1') {
            sendJson(response, 403, { error: 'Local app request required' });
            return;
          }
          let data = '';
          request.on('data', (chunk: Buffer) => {
            data += chunk.toString('utf-8');
            if (data.length > 4096) request.destroy();
          });
          request.on('end', () => {
            let parsed: LocalWorldHandoffRequest | null = null;
            try { parsed = parseLocalWorldHandoffRequest(JSON.parse(data)); } catch { /* invalid request */ }
            if (!parsed) return sendJson(response, 400, { error: 'Invalid world handoff request' });
            queue.enqueue(parsed);
            sendJson(response, 202, { accepted: true });
          });
          return;
        }
        if (request.method === 'GET' && request.url?.startsWith('/pending?')) {
          const params = new URL(request.url, 'http://localhost');
          const projectId = params.searchParams.get('projectId') ?? '';
          if (!projectId || projectId.length > 200) return sendJson(response, 400, { error: 'Invalid project ID' });
          sendJson(response, 200, { request: queue.take(projectId) });
          return;
        }
        next();
      });
    },
  };
}

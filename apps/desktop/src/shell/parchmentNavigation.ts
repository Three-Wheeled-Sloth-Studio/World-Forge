export type ParchmentNavigation = {
  landingUrl: string;
  projectsUrl: string;
  accountUrl: string;
};

const DEFAULT_PARCHMENT_ORIGIN = 'https://parchmentworlds.theanaloggamingsociety.org';
const LOCAL_PARCHMENT_PORT = '5273';

export function resolveParchmentNavigation(
  currentUrl: string,
  fallbackOrigin?: string,
): ParchmentNavigation {
  const current = new URL(currentUrl);
  const returnUrl = current.searchParams.get('pwReturnUrl');
  const origin = safeOrigin(returnUrl)
    ?? safeOrigin(fallbackOrigin ?? null)
    ?? inferredParchmentOrigin(current)
    ?? DEFAULT_PARCHMENT_ORIGIN;

  return {
    landingUrl: new URL('/', origin).toString(),
    projectsUrl: new URL('/projects', origin).toString(),
    accountUrl: new URL('/login', origin).toString(),
  };
}

function inferredParchmentOrigin(current: URL): string | null {
  if (current.hostname === 'localhost' || current.hostname === '127.0.0.1') {
    return `${current.protocol}//${current.hostname}:${LOCAL_PARCHMENT_PORT}`;
  }
  if (current.pathname === '/apps/world-forge' || current.pathname.startsWith('/apps/world-forge/')) {
    return current.origin;
  }
  return null;
}

function safeOrigin(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

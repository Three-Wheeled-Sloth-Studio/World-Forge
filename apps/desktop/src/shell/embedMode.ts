export function isParchmentShellEmbed(locationHref = window.location.href) {
  try {
    return new URL(locationHref).searchParams.get('embed') === 'shell';
  } catch {
    return false;
  }
}

export function applyParchmentShellEmbedFlag() {
  if (isParchmentShellEmbed()) {
    document.documentElement.dataset.parchmentShellEmbed = 'true';
  } else {
    delete document.documentElement.dataset.parchmentShellEmbed;
  }
}

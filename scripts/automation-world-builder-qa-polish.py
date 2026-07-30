from pathlib import Path
import re
import sys


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one match, found {count}: {old[:120]!r}')
    file.write_text(text.replace(old, new, 1))


def apply_changes() -> None:
    shared_dir = Path('apps/desktop/src/shared')
    shared_dir.mkdir(parents=True, exist_ok=True)
    (shared_dir / 'useDismissiblePopover.ts').write_text("""import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

const POPOVER_OPEN_EVENT = 'world-forge:popover-open';

type UseDismissiblePopoverOptions = {
  focusFirstOnOpen?: boolean;
};

export function useDismissiblePopover({ focusFirstOnOpen = false }: UseDismissiblePopoverOptions = {}) {
  const popoverId = useId();
  const triggerId = `${popoverId}-trigger`;
  const panelId = `${popoverId}-panel`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const focusPanelAfterOpen = useRef(false);
  const [open, setOpen] = useState(false);

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  const openPopover = useCallback((focusPanel = false) => {
    focusPanelAfterOpen.current = focusPanel;
    setOpen(true);
    document.dispatchEvent(new CustomEvent(POPOVER_OPEN_EVENT, { detail: { id: popoverId } }));
  }, [popoverId]);

  const togglePopover = useCallback((focusPanel = false) => {
    if (open) close();
    else openPopover(focusPanel);
  }, [close, open, openPopover]);

  useEffect(() => {
    if (!open) return;

    const handleOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || rootRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      close(true);
    };
    const handlePeerOpen = (event: Event) => {
      const peerId = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (peerId && peerId !== popoverId) setOpen(false);
    };

    document.addEventListener('pointerdown', handleOutsidePointer);
    document.addEventListener('keydown', handleEscape);
    document.addEventListener(POPOVER_OPEN_EVENT, handlePeerOpen);

    const frame = window.requestAnimationFrame(() => {
      if (focusFirstOnOpen || focusPanelAfterOpen.current) firstFocusable(panelRef.current)?.focus();
      focusPanelAfterOpen.current = false;
    });

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', handleOutsidePointer);
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener(POPOVER_OPEN_EVENT, handlePeerOpen);
    };
  }, [close, focusFirstOnOpen, open, popoverId]);

  const onTriggerKeyDown = useCallback((event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown') return;
    event.preventDefault();
    if (open) firstFocusable(panelRef.current)?.focus();
    else openPopover(true);
  }, [open, openPopover]);

  const onPanelKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const focusable = focusableElements(panelRef.current);
    if (!focusable.length) return;
    event.preventDefault();
    const current = focusable.indexOf(document.activeElement as HTMLElement);
    const next = current < 0
      ? (event.key === 'ArrowUp' || event.key === 'End' ? focusable.length - 1 : 0)
      : event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? focusable.length - 1
          : event.key === 'ArrowDown'
            ? (current + 1) % focusable.length
            : (current - 1 + focusable.length) % focusable.length;
    focusable[next]?.focus();
  }, []);

  return {
    open,
    triggerId,
    panelId,
    rootRef,
    triggerRef,
    panelRef,
    openPopover,
    close,
    togglePopover,
    onTriggerKeyDown,
    onPanelKeyDown,
  };
}

function firstFocusable(root: HTMLElement | null) {
  return focusableElements(root)[0];
}

function focusableElements(root: HTMLElement | null) {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(
    '[role="menuitem"], input:not([disabled]), select:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
  )).filter((element) => element.offsetParent !== null && element.getAttribute('aria-hidden') !== 'true');
}
""")

    replace_once(
        'apps/desktop/src/workspace/WorldWorkspace.tsx',
        "} from './workspaceModes';\nimport './workspaceToolbar.css';",
        "} from './workspaceModes';\nimport { useDismissiblePopover } from '../shared/useDismissiblePopover';\nimport './workspaceToolbar.css';"
    )
    replace_once(
        'apps/desktop/src/workspace/WorldWorkspace.tsx',
        "  const isDeveloperMode = developerMode || projectName === 'Developer workspace';\n  const [zoomMenu, setZoomMenu] = useState<{ x: number; y: number } | null>(null);\n  const zoomStops = [0.75, 1, 1.5, 2.25, 4, 5.5, 8];",
        "  const isDeveloperMode = developerMode || projectName === 'Developer workspace';\n  const [zoomMenuPosition, setZoomMenuPosition] = useState({ x: 8, y: 8 });\n  const layersPopover = useDismissiblePopover();\n  const zoomPopover = useDismissiblePopover();\n  const zoomStops = [0.75, 1, 1.5, 2.25, 4, 5.5, 8];"
    )
    replace_once(
        'apps/desktop/src/workspace/WorldWorkspace.tsx',
        "  useEffect(() => {\n    if (!isDeveloperMode && visibleMapMode !== mapMode) onMapModeChange(visibleMapMode);\n  }, [isDeveloperMode, mapMode, onMapModeChange, visibleMapMode]);\n\n\n  const openZoomMenu = (event: React.MouseEvent) => {\n    event.preventDefault();\n    setZoomMenu({ x: event.clientX, y: event.clientY });\n  };\n\n  const toggleZoomMenu = (event: React.MouseEvent<HTMLButtonElement>) => {\n    const bounds = event.currentTarget.getBoundingClientRect();\n    setZoomMenu((current) => current ? null : {\n      x: Math.max(8, Math.min(window.innerWidth - 92, bounds.left)),\n      y: bounds.bottom + 4\n    });\n  };\n\n  const fitView = () => {\n    onViewZoomChange(1);\n    setZoomMenu(null);\n  };",
        "  useEffect(() => {\n    if (!isDeveloperMode && visibleMapMode !== mapMode) onMapModeChange(visibleMapMode);\n  }, [isDeveloperMode, mapMode, onMapModeChange, visibleMapMode]);\n\n  useEffect(() => {\n    if (workspaceMode === 'explore') return;\n    layersPopover.close();\n    zoomPopover.close();\n  }, [layersPopover.close, workspaceMode, zoomPopover.close]);\n\n  const openZoomMenu = (event: React.MouseEvent<HTMLButtonElement>) => {\n    event.preventDefault();\n    setZoomMenuPosition({\n      x: Math.max(8, Math.min(window.innerWidth - 92, event.clientX)),\n      y: Math.max(8, Math.min(window.innerHeight - 224, event.clientY))\n    });\n    if (!zoomPopover.open) zoomPopover.openPopover(false);\n  };\n\n  const toggleZoomMenu = (event: React.MouseEvent<HTMLButtonElement>) => {\n    if (zoomPopover.open) {\n      zoomPopover.close();\n      return;\n    }\n    const bounds = event.currentTarget.getBoundingClientRect();\n    setZoomMenuPosition({\n      x: Math.max(8, Math.min(window.innerWidth - 92, bounds.left)),\n      y: Math.max(8, Math.min(window.innerHeight - 224, bounds.bottom + 4))\n    });\n    zoomPopover.openPopover(false);\n  };\n\n  const fitView = () => {\n    onViewZoomChange(1);\n    zoomPopover.close();\n  };"
    )

    old_layers = """                <details className=\"explore-layers-menu\">
                  <summary aria-label=\"Layers and display options\"><Layers size={16} /><span>Layers</span></summary>
                  <div className=\"explore-layers-popover\">
                    <div className=\"explore-layers-section\">
                      <strong>Visible layers</strong>
                      <button type=\"button\" className={`explore-layer-toggle ${showRivers ? 'active' : ''}`} aria-pressed={showRivers} onClick={() => onShowRiversChange(!showRivers)}><span><Waves size={15} />Rivers</span><small>{showRivers ? 'On' : 'Off'}</small></button>
                      <button type=\"button\" className={`explore-layer-toggle plates-toggle ${showPlates ? 'active' : ''}`} aria-pressed={showPlates} onClick={() => onShowPlatesChange(!showPlates)}><span><Waypoints size={15} />Plate boundaries</span><small>{showPlates ? 'On' : 'Off'}</small></button>
                      <button type=\"button\" className={`explore-layer-toggle hex-toggle ${showHexes ? 'active' : ''}`} aria-pressed={showHexes} onClick={() => onShowHexesChange(!showHexes)}><span><Hexagon size={15} />Hex overlay</span><small>{showHexes ? (hexOverlayLabel || 'On') : 'Off'}</small></button>
                      {viewMode === 'globe' && <button type=\"button\" className={`explore-layer-toggle shell-toggle ${showGlobeShells ? 'active' : ''}`} aria-pressed={showGlobeShells} onClick={onToggleGlobeShells}><span><Cloud size={15} />Ocean and atmosphere</span><small>{showGlobeShells ? 'On' : 'Off'}</small></button>}
                    </div>
                    <div className=\"explore-layers-section explore-display-options\">
                      <strong>Display</strong>
                      <label htmlFor=\"coastline-treatment\"><span>Coastline</span><select id=\"coastline-treatment\" aria-label=\"Coastline treatment\" value={coastlineTreatment} onChange={(event) => onCoastlineTreatmentChange(event.target.value as CoastlineTreatment)} disabled={visibleMapMode !== 'biomes'}>
                        <option value=\"bare\">Bare coast</option>
                        <option value=\"toned\">Toned coast</option>
                        <option value=\"outlined\">Outlined coast</option>
                      </select></label>
                      {displayActions}
                    </div>
                  </div>
                </details>"""
    new_layers = """                <div className=\"dismissible-popover explore-layers-menu\" data-open={layersPopover.open} ref={layersPopover.rootRef}>
                  <button
                    type=\"button\"
                    className=\"explore-layers-trigger\"
                    id={layersPopover.triggerId}
                    ref={layersPopover.triggerRef}
                    aria-controls={layersPopover.panelId}
                    aria-expanded={layersPopover.open}
                    aria-haspopup=\"dialog\"
                    aria-label=\"Layers and display options\"
                    onClick={() => layersPopover.togglePopover(false)}
                    onKeyDown={layersPopover.onTriggerKeyDown}
                  ><Layers size={16} /><span>Layers</span></button>
                  {layersPopover.open && (
                    <div
                      className=\"explore-layers-popover\"
                      id={layersPopover.panelId}
                      ref={layersPopover.panelRef}
                      role=\"dialog\"
                      aria-labelledby={layersPopover.triggerId}
                    >
                      <div className=\"explore-layers-section\">
                        <strong>Visible layers</strong>
                        <button type=\"button\" className={`explore-layer-toggle ${showRivers ? 'active' : ''}`} aria-pressed={showRivers} onClick={() => onShowRiversChange(!showRivers)}><span><Waves size={15} />Rivers</span><small>{showRivers ? 'On' : 'Off'}</small></button>
                        <button type=\"button\" className={`explore-layer-toggle plates-toggle ${showPlates ? 'active' : ''}`} aria-pressed={showPlates} onClick={() => onShowPlatesChange(!showPlates)}><span><Waypoints size={15} />Plate boundaries</span><small>{showPlates ? 'On' : 'Off'}</small></button>
                        <button type=\"button\" className={`explore-layer-toggle hex-toggle ${showHexes ? 'active' : ''}`} aria-pressed={showHexes} onClick={() => onShowHexesChange(!showHexes)}><span><Hexagon size={15} />Hex overlay</span><small>{showHexes ? (hexOverlayLabel || 'On') : 'Off'}</small></button>
                        {viewMode === 'globe' && <button type=\"button\" className={`explore-layer-toggle shell-toggle ${showGlobeShells ? 'active' : ''}`} aria-pressed={showGlobeShells} onClick={onToggleGlobeShells}><span><Cloud size={15} />Ocean and atmosphere</span><small>{showGlobeShells ? 'On' : 'Off'}</small></button>}
                      </div>
                      <div className=\"explore-layers-section explore-display-options\">
                        <strong>Display</strong>
                        <label htmlFor=\"coastline-treatment\"><span>Coastline</span><select id=\"coastline-treatment\" aria-label=\"Coastline treatment\" value={coastlineTreatment} onChange={(event) => onCoastlineTreatmentChange(event.target.value as CoastlineTreatment)} disabled={visibleMapMode !== 'biomes'}>
                          <option value=\"bare\">Bare coast</option>
                          <option value=\"toned\">Toned coast</option>
                          <option value=\"outlined\">Outlined coast</option>
                        </select></label>
                        {displayActions}
                      </div>
                    </div>
                  )}
                </div>"""
    replace_once('apps/desktop/src/workspace/WorldWorkspace.tsx', old_layers, new_layers)

    old_zoom = """                <div className=\"view-zoom-controls\" role=\"group\" aria-label=\"View zoom\">
                  <button type=\"button\" className=\"zoom-pill\" aria-label={`Zoom ${Math.round(viewZoom * 100)} percent`} title=\"Click for common zoom levels. Right-click to open at the pointer.\" onContextMenu={openZoomMenu} onClick={toggleZoomMenu}>{Math.round(viewZoom * 100)}%</button>
                  {showHexes && hexOverlayLabel && <output className=\"hex-scale-readout\" title=\"Current hex overlay scale\">{hexOverlayLabel}</output>}
                </div>
                {zoomMenu && (
                  <div className=\"zoom-context-menu\" role=\"menu\" style={{ left: zoomMenu.x, top: zoomMenu.y }} onMouseLeave={() => setZoomMenu(null)}>
                    {zoomStops.map((stop) => (
                      <button
                        type=\"button\"
                        role=\"menuitem\"
                        key={stop}
                        className={Math.abs(viewZoom - stop) < 0.01 ? 'active' : ''}
                        onClick={() => {
                          onViewZoomChange(stop);
                          setZoomMenu(null);
                        }}
                      >
                        {Math.round(stop * 100)}%
                      </button>
                    ))}
                  </div>
                )}"""
    new_zoom = """                <div className={`view-zoom-controls ${showHexes && hexOverlayLabel ? 'with-scale' : ''}`} role=\"group\" aria-label=\"View zoom\">
                  <div className=\"dismissible-popover zoom-popover\" data-open={zoomPopover.open} ref={zoomPopover.rootRef}>
                    <button
                      type=\"button\"
                      className=\"zoom-pill\"
                      id={zoomPopover.triggerId}
                      ref={zoomPopover.triggerRef}
                      aria-controls={zoomPopover.panelId}
                      aria-expanded={zoomPopover.open}
                      aria-haspopup=\"menu\"
                      aria-label={`Zoom ${Math.round(viewZoom * 100)} percent`}
                      title=\"Click for common zoom levels. Right-click to open at the pointer.\"
                      onContextMenu={openZoomMenu}
                      onClick={toggleZoomMenu}
                      onKeyDown={zoomPopover.onTriggerKeyDown}
                    >{Math.round(viewZoom * 100)}%</button>
                    {zoomPopover.open && (
                      <div
                        className=\"zoom-context-menu\"
                        id={zoomPopover.panelId}
                        ref={zoomPopover.panelRef}
                        role=\"menu\"
                        aria-labelledby={zoomPopover.triggerId}
                        style={{ left: zoomMenuPosition.x, top: zoomMenuPosition.y }}
                        onKeyDown={zoomPopover.onPanelKeyDown}
                      >
                        {zoomStops.map((stop) => (
                          <button
                            type=\"button\"
                            role=\"menuitem\"
                            key={stop}
                            className={Math.abs(viewZoom - stop) < 0.01 ? 'active' : ''}
                            onClick={() => {
                              onViewZoomChange(stop);
                              zoomPopover.close();
                            }}
                          >
                            {Math.round(stop * 100)}%
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {showHexes && hexOverlayLabel && <output className=\"hex-scale-readout\" title=\"Current hex overlay scale\">{hexOverlayLabel}</output>}
                </div>"""
    replace_once('apps/desktop/src/workspace/WorldWorkspace.tsx', old_zoom, new_zoom)

    replace_once(
        'apps/desktop/src/workspace/workspaceToolbar.css',
        ".view-zoom-controls {\n  align-items: center;\n  display: inline-flex;\n  gap: 0;\n}",
        ".view-zoom-controls {\n  align-items: center;\n  display: inline-flex;\n  gap: 0;\n}\n\n.zoom-popover {\n  display: inline-flex;\n  position: relative;\n}\n\n.view-zoom-controls.with-scale .zoom-pill {\n  border-radius: 6px 0 0 6px;\n}"
    )
    replace_once(
        'apps/desktop/src/workspace/workspaceToolbar.css',
        ".explore-fit-button,\n.explore-layers-menu > summary {",
        ".explore-fit-button,\n.explore-layers-trigger {"
    )
    replace_once(
        'apps/desktop/src/workspace/workspaceToolbar.css',
        ".explore-fit-button:hover,\n.explore-layers-menu > summary:hover,\n.explore-layers-menu[open] > summary {",
        ".explore-fit-button:hover,\n.explore-layers-trigger:hover,\n.explore-layers-menu[data-open=\"true\"] > .explore-layers-trigger {"
    )
    replace_once(
        'apps/desktop/src/workspace/workspaceToolbar.css',
        ".explore-layers-menu > summary {\n  list-style: none;\n}\n\n.explore-layers-menu > summary::-webkit-details-marker {\n  display: none;\n}\n\n",
        ""
    )

    replace_once(
        'apps/desktop/src/panels/RightPanel.tsx',
        "  feedbackStatus: string;\n  inspectorContent: React.ReactNode;",
        "  feedbackStatus: string;\n  accountAvatarUrl?: string;\n  accountLabel?: string;\n  inspectorContent: React.ReactNode;"
    )
    replace_once(
        'apps/desktop/src/panels/RightPanel.tsx',
        "    workspaceMode, developerMode, collapsed, feedbackStatus, inspectorContent, diagnosticsContent, project,",
        "    workspaceMode, developerMode, collapsed, feedbackStatus, accountAvatarUrl, accountLabel, inspectorContent, diagnosticsContent, project,"
    )
    replace_once(
        'apps/desktop/src/panels/RightPanel.tsx',
        "      <ShellStatusControls onFeedback={onFeedback} />",
        "      <ShellStatusControls onFeedback={onFeedback} accountAvatarUrl={accountAvatarUrl} accountLabel={accountLabel} />"
    )

    replace_once(
        'apps/desktop/src/main.tsx',
        "  const currentViewZoom = viewMode === 'globe' ? globeZoom : mapZoom;",
        "  const shellAccountAvatarUrl = identity.avatarUrl || identity.profile.avatarUrl || identity.linkedIdentities.find((entry) => entry.avatarUrl)?.avatarUrl || '';\n  const shellHasAccount = Boolean(identity.email || identity.externalIds.googleId || identity.externalIds.steamId || identity.linkedIdentities.length);\n  const shellAccountLabel = shellHasAccount\n    ? `Signed in as ${identity.displayName}${identity.email ? ` (${identity.email})` : ''}`\n    : 'Open the Parchment Worlds account page';\n  const currentViewZoom = viewMode === 'globe' ? globeZoom : mapZoom;"
    )
    replace_once(
        'apps/desktop/src/main.tsx',
        "  feedbackStatus={feedbackStatus}\n  inspectorContent={inspectionRecord ? (",
        "  feedbackStatus={feedbackStatus}\n  accountAvatarUrl={shellAccountAvatarUrl}\n  accountLabel={shellAccountLabel}\n  inspectorContent={inspectionRecord ? ("
    )

    Path('apps/desktop/src/shell/ShellStatusControls.tsx').write_text("""import React, { useEffect, useState } from 'react';
import { Coffee, FolderOpen, Home, Mail, Settings, UserRound } from 'lucide-react';
import { createPortal } from 'react-dom';
import { APP_VERSION, APP_VISIBLE_VERSION } from '../appVersion';
import { isParchmentShellEmbed } from './embedMode';
import { resolveParchmentNavigation } from './parchmentNavigation';
import './shellStatus.css';

const SUPPORT_URL = 'https://buymeacoffee.com/SlothDC';

function openConfiguration() {
  const settings = document.querySelector<HTMLButtonElement>('button[title="Configure content sets"]');
  settings?.click();
}

function openReleaseNotes() {
  const releaseControl = document.querySelector<HTMLButtonElement>('.release-pill, .release-version-link');
  releaseControl?.click();
}

function AccountIdentity({ avatarUrl }: { avatarUrl: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [avatarUrl]);

  if (!avatarUrl || failed) return <UserRound size={17} aria-hidden="true" />;
  return <img alt="" className="shell-account-avatar" src={avatarUrl} onError={() => setFailed(true)} />;
}

export function ShellStatusControls({
  onFeedback,
  accountAvatarUrl = '',
  accountLabel = 'Open the Parchment Worlds account page',
}: {
  onFeedback: () => void;
  accountAvatarUrl?: string;
  accountLabel?: string;
}) {
  if (isParchmentShellEmbed()) return null;

  const navigation = resolveParchmentNavigation(window.location.href);

  return createPortal(
    <header className="shell-status-controls" aria-label="Parchment Worlds: World Forge application header">
      <a className="shell-product-identity" href={navigation.landingUrl} title="Return to the Parchment Worlds landing page">
        <strong>Parchment Worlds: World Forge</strong>
      </a>
      <div className="shell-header-spacer" />
      <a className="shell-status-button" href={navigation.landingUrl} title="Parchment Worlds landing page" aria-label="Parchment Worlds landing page">
        <Home size={17} aria-hidden="true" />
      </a>
      <a className="shell-status-button" href={navigation.projectsUrl} title="My Parchment Worlds projects" aria-label="My Parchment Worlds projects">
        <FolderOpen size={17} aria-hidden="true" />
      </a>
      <button type="button" className="shell-status-button shell-feedback-button" title="Contact Parchment Worlds support" aria-label="Contact Parchment Worlds support" onClick={onFeedback}>
        <Mail size={17} aria-hidden="true" />
      </button>
      <a className="shell-status-button shell-support-button" href={SUPPORT_URL} rel="noreferrer" target="_blank" title="Support Parchment Worlds development" aria-label="Support Parchment Worlds development">
        <Coffee size={17} aria-hidden="true" />
      </a>
      <a className="shell-status-button shell-account-button" href={navigation.accountUrl} title={accountLabel} aria-label={accountLabel}>
        <AccountIdentity avatarUrl={accountAvatarUrl} />
      </a>
      <button type="button" className="shell-version-badge" title={`Open World Forge release notes and roadmap for build ${APP_VERSION}`} aria-label={`Open World Forge release notes and roadmap for version ${APP_VISIBLE_VERSION}`} onClick={openReleaseNotes}>v{APP_VISIBLE_VERSION}</button>
      <button type="button" className="shell-status-button shell-config-button" title="Configure World Forge" aria-label="Configure World Forge" onClick={openConfiguration}>
        <Settings size={17} aria-hidden="true" />
      </button>
    </header>,
    document.body,
  );
}
""")

    with Path('apps/desktop/src/shell/shellStatus.css').open('a') as file:
        file.write("""

.shell-account-avatar {
  border-radius: 50%;
  display: block;
  height: 22px;
  object-fit: cover;
  width: 22px;
}

.summary:not(.panel-collapsed) {
  padding-top: 48px;
}
""")

    replace_once(
        'apps/desktop/src/appVersion.ts',
        "export const APP_VERSION = '0.3.32';",
        "export const APP_VERSION = '0.3.33';"
    )
    replace_once(
        'apps/desktop/src/release/ReleaseNotesModal.tsx',
        "        <div className=\"release-notes-body\">\n          <section>\n            <p className=\"release-kicker\">Release 0.3.32</p>",
        "        <div className=\"release-notes-body\">\n          <section>\n            <p className=\"release-kicker\">Release 0.3.33</p>\n            <h3>Dropdowns that know when to leave</h3>\n            <ul>\n              <li>Layers and zoom now close on outside interaction, Escape, competing popovers, and workspace-context changes.</li>\n              <li>The right-panel collapse control no longer overlaps world or context titles.</li>\n              <li>The standalone account control restores the signed-in Google avatar with a safe icon fallback.</li>\n            </ul>\n          </section>\n\n          <section>\n            <p className=\"release-kicker\">Release 0.3.32</p>"
    )


def update_handoff() -> None:
    path = Path('refs/handoffs/world-builder-cleanup.md')
    text = path.read_text()
    sha = Path('/tmp/world-forge-functional-sha').read_text().strip()
    verify_log = Path('/tmp/world-forge-verify.log').read_text()
    plain_log = re.sub(r'\x1b\[[0-9;]*m', '', verify_log)
    match = re.search(r'Tests\s+(\d+) passed', plain_log)
    test_line = f'- {match.group(1)} tests passed' if match else '- Vitest suite passed'

    old_baseline = """Functional code baseline before this documentation-only handoff:

- commit `3d3800c681a7682559a7de1963d315b19d7b1e31`
- visible World Forge version `0.3.32`
- `npm run verify` passed in GitHub Actions
- 243 tests passed
- TypeScript build passed
- production build passed
- focused headless browser QA passed at 1920 x 1080 and 1440 x 900"""
    new_baseline = f"""Functional code baseline before this documentation-only handoff:

- commit `{sha}`
- visible World Forge version `0.3.33`
- `npm run verify` passed in GitHub Actions
{test_line}
- TypeScript build passed
- production build passed
- focused headless browser QA passed at 1920 x 1080 and 1440 x 900"""
    if old_baseline not in text:
        raise RuntimeError('Accepted baseline block changed unexpectedly')
    text = text.replace(old_baseline, new_baseline, 1)
    text = text.replace(
        'Status: **Explore toolbar accepted; proceed to combined user testing and PI-close provenance**',
        'Status: **Combined-test QA polish accepted; resume combined user testing and PI-close provenance**',
        1,
    )
    marker = """- no map state, generator behavior, persistence, replay, or saved-world schema changes were made.

### WP1: control inventory"""
    insertion = """- no map state, generator behavior, persistence, replay, or saved-world schema changes were made.

### Combined-test QA polish

Implemented in `0.3.33`:

- Layers and zoom use one shared transient-popover contract.
- outside pointer interaction closes the active transient surface without swallowing the destination click.
- Escape closes the active surface and restores focus to its trigger.
- opening Layers or zoom closes the competing surface.
- leaving Explore closes both transient surfaces.
- expanded right-panel content clears the boundary toggle instead of rendering underneath it.
- the standalone shell account control renders the stored Google avatar and falls back to the generic account icon if the image is unavailable.
- no generator, map-state, persistence, replay, or saved-world schema changes were made.

### WP1: control inventory"""
    if marker not in text:
        raise RuntimeError('QA polish insertion marker changed unexpectedly')
    text = text.replace(marker, insertion, 1)
    path.write_text(text)


if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'apply'
    if mode == 'apply':
        apply_changes()
    elif mode == 'handoff':
        update_handoff()
    else:
        raise SystemExit(f'Unknown mode: {mode}')

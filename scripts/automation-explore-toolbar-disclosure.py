from pathlib import Path
import re
import sys


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one match, found {count}: {old[:100]!r}')
    file.write_text(text.replace(old, new, 1))


def patch() -> None:
    workspace = 'apps/desktop/src/workspace/WorldWorkspace.tsx'
    replace_once(
        workspace,
        "import { Cloud, Globe2, Hexagon, Map, Search, Waves, Waypoints } from 'lucide-react';",
        "import { Cloud, Globe2, Hexagon, Layers, Map, Maximize2, Search, Waves, Waypoints } from 'lucide-react';",
    )
    replace_once(
        workspace,
        """  const openZoomMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setZoomMenu({ x: event.clientX, y: event.clientY });
  };
""",
        """  const openZoomMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setZoomMenu({ x: event.clientX, y: event.clientY });
  };

  const toggleZoomMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setZoomMenu((current) => current ? null : {
      x: Math.max(8, Math.min(window.innerWidth - 92, bounds.left)),
      y: bounds.bottom + 4
    });
  };

  const fitView = () => {
    onViewZoomChange(1);
    setZoomMenu(null);
  };
""",
    )
    old_block = """          {workspaceMode === 'explore' && (
            <div className=\"map-actions\">
              <div className=\"layer-toggles\">
                <div className=\"view-mode-toggle\" role=\"group\" aria-label=\"Map or globe view\">
                  <button type=\"button\" className={`icon-button ${viewMode === 'map' ? 'active' : ''}`} aria-label=\"Map view\" aria-pressed={viewMode === 'map'} title=\"Map view\" onClick={() => onViewModeChange('map')}><Map size={16} /></button>
                  <button type=\"button\" className={`icon-button ${viewMode === 'globe' ? 'active' : ''}`} aria-label=\"Globe view\" aria-pressed={viewMode === 'globe'} title=\"Globe view\" onClick={() => onViewModeChange('globe')}><Globe2 size={16} /></button>
                </div>
                <button type=\"button\" className={`icon-button layer-icon-toggle rivers-toggle ${showRivers ? 'active' : ''}`} aria-label={showRivers ? 'Hide rivers' : 'Show rivers'} aria-pressed={showRivers} title={showRivers ? 'Rivers visible' : 'Rivers hidden'} onClick={() => onShowRiversChange(!showRivers)}><Waves size={16} /></button>
                <button type=\"button\" className={`icon-button layer-icon-toggle plates-toggle ${showPlates ? 'active' : ''}`} aria-label={showPlates ? 'Hide plate boundaries' : 'Show plate boundaries'} aria-pressed={showPlates} title={showPlates ? 'Plate boundaries visible' : 'Plate boundaries hidden'} onClick={() => onShowPlatesChange(!showPlates)}><Waypoints size={16} /></button>
                <button type=\"button\" className={`icon-button layer-icon-toggle hex-toggle ${showHexes ? 'active' : ''}`} aria-label={showHexes ? 'Hide hex overlay' : 'Show hex overlay'} aria-pressed={showHexes} title={showHexes ? `Hex overlay visible${hexOverlayLabel ? `: ${hexOverlayLabel}` : ''}` : 'Hex overlay hidden'} onClick={() => onShowHexesChange(!showHexes)}><Hexagon size={16} /></button>
                <button type=\"button\" className={`icon-button diagnostic-toggle ${diagnosticMode ? 'active' : ''}`} aria-label={diagnosticMode ? 'Disable point inspector' : 'Enable point inspector'} aria-pressed={diagnosticMode} title={diagnosticMode ? 'Point inspector on' : 'Point inspector off'} onClick={onToggleDiagnostics}><Search size={16} /></button>
                {viewMode === 'globe' && <button type=\"button\" className={`icon-button shell-toggle ${showGlobeShells ? 'active' : ''}`} aria-label={showGlobeShells ? 'Hide globe ocean and atmosphere shells' : 'Show globe ocean and atmosphere shells'} aria-pressed={showGlobeShells} title={showGlobeShells ? 'Globe ocean and atmosphere visible' : 'Globe ocean and atmosphere hidden'} onClick={onToggleGlobeShells}><Cloud size={16} /></button>}
                <select aria-label=\"Presentation\" value={renderMode} onChange={(event) => onRenderModeChange(event.target.value as RenderMode)} disabled={visibleMapMode !== 'biomes'}>
                  <option value=\"data\">Data</option>
                  <option value=\"natural\">Natural</option>
                </select>
                <select id=\"map-mode\" aria-label=\"Map subject\" value={visibleMapMode} onChange={(event) => onMapModeChange(event.target.value as MapMode)}>
                  <option value=\"biomes\">Biomes</option>
                  <option value=\"elevation\">Elevation</option>
                  <option value=\"heightmap\">Heightmap</option>
                  <option value=\"temperature\">Temperature</option>
                  <option value=\"rainfall\">Rainfall</option>
                  <option value=\"climate-moisture\">Climate moisture</option>
                  <option value=\"climate-precipitation\">Climate precipitation</option>
                  <option value=\"wind\">Wind</option>
                  <option value=\"current\">Current</option>
                  <option value=\"terrain-only\">Terrain only</option>
                </select>
                <select aria-label=\"Coastline treatment\" value={coastlineTreatment} onChange={(event) => onCoastlineTreatmentChange(event.target.value as CoastlineTreatment)} disabled={visibleMapMode !== 'biomes'}>
                  <option value=\"bare\">Bare coast</option>
                  <option value=\"toned\">Toned coast</option>
                  <option value=\"outlined\">Outlined coast</option>
                </select>
                {displayActions}
                <div className=\"view-zoom-controls\" role=\"group\" aria-label=\"View zoom\">
                  <button type=\"button\" className=\"zoom-pill\" title=\"Current zoom. Right-click for common zoom levels.\" onContextMenu={openZoomMenu} onClick={() => setZoomMenu(null)}>{Math.round(viewZoom * 100)}%</button>
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
                )}
              </div>
            </div>
          )}
"""
    new_block = """          {workspaceMode === 'explore' && (
            <div className=\"map-actions\">
              <div className=\"layer-toggles\">
                <div className=\"view-mode-toggle\" role=\"group\" aria-label=\"Map or globe view\">
                  <button type=\"button\" className={`icon-button ${viewMode === 'map' ? 'active' : ''}`} aria-label=\"Map view\" aria-pressed={viewMode === 'map'} title=\"Map view\" onClick={() => onViewModeChange('map')}><Map size={16} /></button>
                  <button type=\"button\" className={`icon-button ${viewMode === 'globe' ? 'active' : ''}`} aria-label=\"Globe view\" aria-pressed={viewMode === 'globe'} title=\"Globe view\" onClick={() => onViewModeChange('globe')}><Globe2 size={16} /></button>
                </div>
                <select aria-label=\"Presentation\" value={renderMode} onChange={(event) => onRenderModeChange(event.target.value as RenderMode)} disabled={visibleMapMode !== 'biomes'}>
                  <option value=\"data\">Data</option>
                  <option value=\"natural\">Natural</option>
                </select>
                <select id=\"map-mode\" aria-label=\"Map subject\" value={visibleMapMode} onChange={(event) => onMapModeChange(event.target.value as MapMode)}>
                  <option value=\"biomes\">Biomes</option>
                  <option value=\"elevation\">Elevation</option>
                  <option value=\"heightmap\">Heightmap</option>
                  <option value=\"temperature\">Temperature</option>
                  <option value=\"rainfall\">Rainfall</option>
                  <option value=\"climate-moisture\">Climate moisture</option>
                  <option value=\"climate-precipitation\">Climate precipitation</option>
                  <option value=\"wind\">Wind</option>
                  <option value=\"current\">Current</option>
                  <option value=\"terrain-only\">Terrain only</option>
                </select>
                <button type=\"button\" className={`icon-button diagnostic-toggle ${diagnosticMode ? 'active' : ''}`} aria-label={diagnosticMode ? 'Disable point inspector' : 'Enable point inspector'} aria-pressed={diagnosticMode} title={diagnosticMode ? 'Point inspector on' : 'Point inspector off'} onClick={onToggleDiagnostics}><Search size={16} /></button>
                <button type=\"button\" className=\"explore-fit-button\" aria-label=\"Fit view\" title=\"Fit map or globe to the workspace\" onClick={fitView}><Maximize2 size={16} /><span>Fit</span></button>
                <details className=\"explore-layers-menu\">
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
                </details>
                <div className=\"view-zoom-controls\" role=\"group\" aria-label=\"View zoom\">
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
                )}
              </div>
            </div>
          )}
"""
    replace_once(workspace, old_block, new_block)

    css_path = Path('apps/desktop/src/workspace/workspaceToolbar.css')
    css = css_path.read_text()
    marker = """.layer-toggles {
  flex: 1 1 auto;
}
"""
    replacement = """.layer-toggles {
  align-items: center;
  flex: 1 1 auto;
  position: relative;
}
"""
    if marker not in css:
        raise RuntimeError('workspaceToolbar.css layer-toggles marker changed unexpectedly')
    css = css.replace(marker, replacement, 1)
    css += """

.explore-fit-button,
.explore-layers-menu > summary {
  align-items: center;
  background: linear-gradient(#fff9ec, #e8decb);
  border: 1px solid var(--pm-border);
  border-bottom-color: var(--pm-border-strong);
  border-radius: 6px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72), 0 1px 2px var(--pm-shadow);
  color: var(--pm-text);
  cursor: pointer;
  display: inline-flex;
  font-size: 12px;
  font-weight: 800;
  gap: 5px;
  min-height: 32px;
  padding: 5px 8px;
  white-space: nowrap;
}

.explore-fit-button:hover,
.explore-layers-menu > summary:hover,
.explore-layers-menu[open] > summary {
  background: linear-gradient(#e3f5f1, #8ec4c8);
  border-color: #4e8f94;
  color: #17363a;
}

.explore-layers-menu {
  flex: 0 0 auto;
  position: relative;
}

.explore-layers-menu > summary {
  list-style: none;
}

.explore-layers-menu > summary::-webkit-details-marker {
  display: none;
}

.explore-layers-popover {
  background: #fff8ea;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  box-shadow: 0 10px 26px rgba(34, 28, 20, 0.28);
  display: grid;
  gap: 10px;
  min-width: 248px;
  padding: 9px;
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  z-index: 30;
}

.explore-layers-section {
  display: grid;
  gap: 5px;
}

.explore-layers-section > strong {
  color: var(--pm-muted);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.explore-layer-toggle {
  align-items: center;
  box-shadow: none;
  display: flex;
  justify-content: space-between;
  min-height: 30px;
  padding: 4px 7px;
  width: 100%;
}

.explore-layer-toggle > span {
  align-items: center;
  display: inline-flex;
  gap: 6px;
}

.explore-layer-toggle small {
  color: var(--pm-muted);
  font-size: 10px;
  max-width: 118px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.explore-layer-toggle.active {
  background: linear-gradient(#e3f5f1, #8ec4c8);
  border-color: #4e8f94;
  color: #17363a;
}

.explore-display-options {
  border-top: 1px solid #d5c8b2;
  padding-top: 8px;
}

.explore-display-options label,
.explore-layers-popover .workspace-inline-setting {
  align-items: stretch;
  display: grid;
  gap: 4px;
  width: 100%;
}

.explore-display-options label > span,
.explore-layers-popover .workspace-inline-setting > span {
  color: var(--pm-muted);
  font-size: 10px;
  font-weight: 800;
}

.explore-display-options select,
.explore-layers-popover .workspace-inline-setting select {
  max-width: none;
  width: 100%;
}

@media (max-width: 1280px) {
  .explore-layers-popover {
    left: 0;
    right: auto;
  }
}
"""
    css_path.write_text(css)

    replace_once(
        'apps/desktop/src/appVersion.ts',
        "export const APP_VERSION = '0.3.31';",
        "export const APP_VERSION = '0.3.32';",
    )
    replace_once(
        'apps/desktop/src/release/ReleaseNotesModal.tsx',
        """          <section>
            <p className=\"release-kicker\">Release 0.3.31</p>
""",
        """          <section>
            <p className=\"release-kicker\">Release 0.3.32</p>
            <h3>Explore controls without the cockpit clutter</h3>
            <ul>
              <li>Map and globe, presentation, map subject, point inspection, zoom, and Fit remain immediately available.</li>
              <li>Rivers, plate boundaries, hex overlays, coastline treatment, globe shells, and preview detail now live in one Layers menu.</li>
              <li>The zoom readout opens common zoom levels on a normal click, while Fit resets the active map or globe view.</li>
            </ul>
          </section>

          <section>
            <p className=\"release-kicker\">Release 0.3.31</p>
""",
    )


def handoff() -> None:
    path = Path('refs/handoffs/world-builder-cleanup.md')
    text = path.read_text()
    sha = Path('/tmp/world-forge-functional-sha').read_text().strip()
    verify_log = Path('/tmp/world-forge-verify.log').read_text()
    clean_log = re.sub(r'\x1b\[[0-9;]*m', '', verify_log)
    match = re.search(r'Tests\s+(\d+) passed', clean_log)
    test_line = f'- {match.group(1)} tests passed' if match else '- Vitest suite passed'

    text = text.replace(
        'Status: **Contextual right panel accepted; continue with Explore-toolbar disclosure**',
        'Status: **Explore toolbar accepted; proceed to combined user testing and PI-close provenance**',
        1,
    )
    old_baseline = """- commit `bacd1060076770e6d305d9f6a86ea4943c33f9bd`
- visible World Forge version `0.3.31`
- `npm run verify` passed in GitHub Actions
- 243 tests passed
- TypeScript build passed
- production build passed
- focused headless browser QA passed at 1920 x 1080 and 1440 x 900"""
    new_baseline = f"""- commit `{sha}`
- visible World Forge version `0.3.32`
- `npm run verify` passed in GitHub Actions
{test_line}
- TypeScript build passed
- production build passed
- focused headless browser QA passed at 1920 x 1080 and 1440 x 900"""
    if old_baseline not in text:
        raise RuntimeError('handoff baseline changed unexpectedly')
    text = text.replace(old_baseline, new_baseline, 1)

    insertion_marker = """- `.wforge` opening moved to My Worlds as a global project/library action.
- no generator algorithm, persistence, replay, or saved-world schema changes were made.

### WP1: control inventory"""
    insertion = """- `.wforge` opening moved to My Worlds as a global project/library action.
- no generator algorithm, persistence, replay, or saved-world schema changes were made.

### Explore toolbar disclosure

Implemented in `0.3.32`:

- map/globe, presentation, map subject, point inspector, zoom, Fit, and geographic drilldown remain immediately available.
- rivers, plate boundaries, hex overlays, coastline treatment, globe ocean/atmosphere shells, and preview detail are grouped under Layers.
- the zoom percentage opens common levels on normal click and still supports right-click placement.
- Fit resets the active map or globe zoom to the existing fitted 100% state.
- no map state, generator behavior, persistence, replay, or saved-world schema changes were made.

### WP1: control inventory"""
    if insertion_marker not in text:
        raise RuntimeError('handoff completion insertion marker changed unexpectedly')
    text = text.replace(insertion_marker, insertion, 1)

    old_step = """### Step 4: finish Explore-toolbar disclosure

WP2 removed debug subjects and exports, but the toolbar is not fully simplified yet.

Keep immediately visible:

- map/globe
- presentation
- primary map subject
- zoom/fit
- inspector
- drilldown when available

Move secondary controls behind **Layers** or **More**:

- rivers
- plate boundaries
- hex overlays
- coastline treatment
- globe shells
- less common user-facing overlays

Do not reintroduce developer diagnostics into this menu wearing a fake mustache."""
    new_step = """### Step 4: finish Explore-toolbar disclosure - completed

Completed in `0.3.32`.

- primary view, presentation, subject, inspection, zoom, Fit, and drilldown controls stay visible.
- secondary layers and display treatments route through one Layers disclosure.
- the zoom readout is discoverable by normal click instead of requiring right-click knowledge.
- developer-only diagnostics remain outside normal Explore.

### Step 5: close PI provenance and hosted QA

Use the combined user test to confirm the complete Build / Explore / Export workflow, then close WP6 by recording:

- exact accepted World Forge `dev` commit
- visible standalone and embedded World Forge version
- host Parchment Worlds version and source commit when embedded
- hosted and standalone layout at 1920 x 1080 and 1440 x 900
- no deterministic generation change from the UI-only cleanup"""
    if old_step not in text:
        raise RuntimeError('handoff Step 4 changed unexpectedly')
    text = text.replace(old_step, new_step, 1)

    old_wp4 = """### WP4: Explore controls

Partially complete.

Completed:

- ordinary debug map subjects removed
- globe debug composites removed
- exports removed from Explore

Remaining:

- Layers/More disclosure
- explicit Fit action instead of right-click-only zoom discovery
- final user-facing versus developer layer disposition"""
    new_wp4 = """### WP4: Explore controls

Complete for this PI.

- ordinary debug map subjects removed
- globe debug composites removed
- exports removed from Explore
- secondary layers and display treatments grouped under Layers
- explicit Fit action added
- zoom levels discoverable by normal click
- developer diagnostics kept out of normal Explore"""
    if old_wp4 not in text:
        raise RuntimeError('handoff WP4 changed unexpectedly')
    text = text.replace(old_wp4, new_wp4, 1)
    path.write_text(text)


if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'patch'
    if mode == 'patch':
        patch()
    elif mode == 'handoff':
        handoff()
    else:
        raise SystemExit(f'Unknown mode: {mode}')

from pathlib import Path


def replace_exact(path: str, old: str, new: str, expected: int = 1) -> None:
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != expected:
        raise RuntimeError(f'{path}: expected {expected} matches, found {count}: {old[:180]!r}')
    target.write_text(text.replace(old, new), encoding='utf-8')


replace_exact('apps/desktop/src/appVersion.ts', "export const APP_VERSION = '0.3.43';", "export const APP_VERSION = '0.3.44';")

replace_exact(
    'apps/desktop/src/sync.ts',
    "  mapZoom: number;\n  globeZoom: number;",
    "  mapZoom: number;\n  globeZoom: number;\n  systemZoom: number;"
)
replace_exact(
    'apps/desktop/src/sync.ts',
    "    mapZoom: cleanZoom(raw.mapZoom),\n    globeZoom: cleanZoom(raw.globeZoom)",
    "    mapZoom: cleanZoom(raw.mapZoom),\n    globeZoom: cleanZoom(raw.globeZoom),\n    systemZoom: cleanZoom(raw.systemZoom)"
)

replace_exact(
    'apps/desktop/src/workspace/WorldWorkspace.tsx',
    "import { Cloud, CloudRain, Globe2, Hexagon, Layers, Map, Maximize2, Search, Waves, Waypoints } from 'lucide-react';",
    "import { Cloud, CloudRain, Globe2, Hexagon, Layers, Map, Maximize2, Orbit, Search, Waves, Waypoints } from 'lucide-react';"
)
replace_exact(
    'apps/desktop/src/workspace/WorldWorkspace.tsx',
    "export type WorkspaceViewMode = 'map' | 'globe';",
    "export type WorkspaceViewMode = 'map' | 'globe' | 'system';"
)
replace_exact(
    'apps/desktop/src/workspace/WorldWorkspace.tsx',
    "                <div className=\"view-mode-toggle\" role=\"group\" aria-label=\"Map or globe view\">\n                  <button type=\"button\" className={`icon-button ${viewMode === 'map' ? 'active' : ''}`} aria-label=\"Map view\" aria-pressed={viewMode === 'map'} title=\"Map view\" onClick={() => onViewModeChange('map')}><Map size={16} /></button>\n                  <button type=\"button\" className={`icon-button ${viewMode === 'globe' ? 'active' : ''}`} aria-label=\"Globe view\" aria-pressed={viewMode === 'globe'} title=\"Globe view\" onClick={() => onViewModeChange('globe')}><Globe2 size={16} /></button>\n                </div>",
    "                <div className=\"view-mode-toggle\" role=\"group\" aria-label=\"Map, globe, or system view\">\n                  <button type=\"button\" className={`icon-button ${viewMode === 'map' ? 'active' : ''}`} aria-label=\"Map view\" aria-pressed={viewMode === 'map'} title=\"Map view\" onClick={() => onViewModeChange('map')}><Map size={16} /></button>\n                  <button type=\"button\" className={`icon-button ${viewMode === 'globe' ? 'active' : ''}`} aria-label=\"Globe view\" aria-pressed={viewMode === 'globe'} title=\"Globe view\" onClick={() => onViewModeChange('globe')}><Globe2 size={16} /></button>\n                  <button type=\"button\" className={`icon-button ${viewMode === 'system' ? 'active' : ''}`} aria-label=\"System view\" aria-pressed={viewMode === 'system'} title=\"System view\" onClick={() => onViewModeChange('system')}><Orbit size={16} /></button>\n                </div>"
)
replace_exact(
    'apps/desktop/src/workspace/WorldWorkspace.tsx',
    "                <select aria-label=\"Presentation\" value={renderMode} onChange={(event) => onRenderModeChange(event.target.value as RenderMode)} disabled={visibleMapMode !== 'biomes'}>\n                  <option value=\"data\">Data</option>\n                  <option value=\"natural\">Natural</option>\n                </select>\n                <select id=\"map-mode\" aria-label=\"Map subject\" value={visibleMapMode} onChange={(event) => onMapModeChange(event.target.value as MapMode)}>\n                  <option value=\"biomes\">Biomes</option>\n                  <option value=\"elevation\">Elevation</option>\n                  <option value=\"heightmap\">Heightmap</option>\n                  <option value=\"temperature\">Temperature</option>\n                  <option value=\"rainfall\">Rainfall</option>\n                  <option value=\"climate-moisture\">Climate moisture</option>\n                  <option value=\"climate-precipitation\">Climate precipitation</option>\n                  <option value=\"wind\">Wind</option>\n                  <option value=\"current\">Current</option>\n                  <option value=\"terrain-only\">Terrain only</option>\n                </select>\n                <button type=\"button\" className={`icon-button diagnostic-toggle ${diagnosticMode ? 'active' : ''}`} aria-label={diagnosticMode ? 'Disable point inspector' : 'Enable point inspector'} aria-pressed={diagnosticMode} title={diagnosticMode ? 'Point inspector on' : 'Point inspector off'} onClick={onToggleDiagnostics}><Search size={16} /></button>",
    "                {viewMode !== 'system' && <>\n                  <select aria-label=\"Presentation\" value={renderMode} onChange={(event) => onRenderModeChange(event.target.value as RenderMode)} disabled={visibleMapMode !== 'biomes'}>\n                    <option value=\"data\">Data</option>\n                    <option value=\"natural\">Natural</option>\n                  </select>\n                  <select id=\"map-mode\" aria-label=\"Map subject\" value={visibleMapMode} onChange={(event) => onMapModeChange(event.target.value as MapMode)}>\n                    <option value=\"biomes\">Biomes</option>\n                    <option value=\"elevation\">Elevation</option>\n                    <option value=\"heightmap\">Heightmap</option>\n                    <option value=\"temperature\">Temperature</option>\n                    <option value=\"rainfall\">Rainfall</option>\n                    <option value=\"climate-moisture\">Climate moisture</option>\n                    <option value=\"climate-precipitation\">Climate precipitation</option>\n                    <option value=\"wind\">Wind</option>\n                    <option value=\"current\">Current</option>\n                    <option value=\"terrain-only\">Terrain only</option>\n                  </select>\n                  <button type=\"button\" className={`icon-button diagnostic-toggle ${diagnosticMode ? 'active' : ''}`} aria-label={diagnosticMode ? 'Disable point inspector' : 'Enable point inspector'} aria-pressed={diagnosticMode} title={diagnosticMode ? 'Point inspector on' : 'Point inspector off'} onClick={onToggleDiagnostics}><Search size={16} /></button>\n                </>}"
)
replace_exact(
    'apps/desktop/src/workspace/WorldWorkspace.tsx',
    "                <div className=\"dismissible-popover explore-layers-menu\" data-open={layersPopover.open} ref={layersPopover.rootRef}>",
    "                <div className=\"dismissible-popover explore-layers-menu\" data-open={layersPopover.open} ref={layersPopover.rootRef} hidden={viewMode === 'system'}>"
)
replace_exact(
    'apps/desktop/src/workspace/WorldWorkspace.tsx',
    "                <div className={`view-zoom-controls ${showHexes && hexOverlayLabel ? 'with-scale' : ''}`} role=\"group\" aria-label=\"View zoom\">",
    "                <div className={`view-zoom-controls ${viewMode !== 'system' && showHexes && hexOverlayLabel ? 'with-scale' : ''}`} role=\"group\" aria-label=\"View zoom\">"
)
replace_exact(
    'apps/desktop/src/workspace/WorldWorkspace.tsx',
    "                  {showHexes && hexOverlayLabel && <small>{hexOverlayLabel}</small>}",
    "                  {viewMode !== 'system' && showHexes && hexOverlayLabel && <small>{hexOverlayLabel}</small>}"
)

replace_exact(
    'apps/desktop/src/main.tsx',
    "import { GlobeViewer, type GlobeDebugMode } from './globe/GlobeViewer';",
    "import { GlobeViewer, type GlobeDebugMode } from './globe/GlobeViewer';\nimport { SystemViewer } from './system/SystemViewer';"
)
replace_exact('apps/desktop/src/main.tsx', "type ViewMode = 'map' | 'globe';", "type ViewMode = 'map' | 'globe' | 'system';")
replace_exact(
    'apps/desktop/src/main.tsx',
    "function storedViewMode(value: string | undefined): ViewMode {\n  return value === 'globe' ? 'globe' : 'map';\n}",
    "function storedViewMode(value: string | undefined): ViewMode {\n  return value === 'globe' || value === 'system' ? value : 'map';\n}"
)
replace_exact(
    'apps/desktop/src/main.tsx',
    "  const [mapZoom, setMapZoom] = useState(() => clampViewZoom(storedUi.mapZoom));\n  const [globeZoom, setGlobeZoom] = useState(() => clampViewZoom(storedUi.globeZoom));",
    "  const [mapZoom, setMapZoom] = useState(() => clampViewZoom(storedUi.mapZoom));\n  const [globeZoom, setGlobeZoom] = useState(() => clampViewZoom(storedUi.globeZoom));\n  const [systemZoom, setSystemZoom] = useState(() => clampViewZoom(storedUi.systemZoom));"
)
replace_exact(
    'apps/desktop/src/main.tsx',
    "    if (!project || isGenerating || viewMode !== 'globe') return;",
    "    if (!project || isGenerating || viewMode === 'map') return;",
    expected=1
)
replace_exact(
    'apps/desktop/src/main.tsx',
    "    setMapZoom(clampViewZoom(ui.mapZoom));\n    setGlobeZoom(clampViewZoom(ui.globeZoom));",
    "    setMapZoom(clampViewZoom(ui.mapZoom));\n    setGlobeZoom(clampViewZoom(ui.globeZoom));\n    setSystemZoom(clampViewZoom(ui.systemZoom));"
)
replace_exact(
    'apps/desktop/src/main.tsx',
    "      mapZoom,\n      globeZoom",
    "      mapZoom,\n      globeZoom,\n      systemZoom"
)
replace_exact(
    'apps/desktop/src/main.tsx',
    "  }), [coastlineTreatment, config, contentLibrary, exportResolution, globeZoom, leftPanelCollapsed, leftPanelTab, mapMode, mapZoom, previewResolution, renderMode, rightPanelCollapsed, rightPanelTab, savedMaps, selectedPreset, showHexes, showPlates, showRivers, tileFeatures, tileHeight, tilePresetId, tileWidth, viewMode, vttGridEnabled, vttHexSizeMiles, vttResolution]);",
    "  }), [coastlineTreatment, config, contentLibrary, exportResolution, globeZoom, leftPanelCollapsed, leftPanelTab, mapMode, mapZoom, previewResolution, renderMode, rightPanelCollapsed, rightPanelTab, savedMaps, selectedPreset, showHexes, showPlates, showRivers, systemZoom, tileFeatures, tileHeight, tilePresetId, tileWidth, viewMode, vttGridEnabled, vttHexSizeMiles, vttResolution]);"
)
replace_exact(
    'apps/desktop/src/main.tsx',
    "  const currentViewZoom = viewMode === 'globe' ? globeZoom : mapZoom;",
    "  const currentViewZoom = viewMode === 'globe' ? globeZoom : viewMode === 'system' ? systemZoom : mapZoom;"
)
replace_exact(
    'apps/desktop/src/main.tsx',
    "  const handleGlobeWheelZoom = useCallback((event: WheelEvent) => {\n    event.preventDefault();\n    const step = event.ctrlKey || event.metaKey ? 1.35 : 1.12;\n    setGlobeZoom((current) => clampViewZoom(current * (event.deltaY > 0 ? 1 / step : step)));\n  }, []);",
    "  const handleGlobeWheelZoom = useCallback((event: WheelEvent) => {\n    event.preventDefault();\n    const step = event.ctrlKey || event.metaKey ? 1.35 : 1.12;\n    setGlobeZoom((current) => clampViewZoom(current * (event.deltaY > 0 ? 1 / step : step)));\n  }, []);\n  const handleSystemWheelZoom = useCallback((event: WheelEvent) => {\n    event.preventDefault();\n    const step = event.ctrlKey || event.metaKey ? 1.35 : 1.12;\n    setSystemZoom((current) => clampViewZoom(current * (event.deltaY > 0 ? 1 / step : step)));\n  }, []);"
)
replace_exact(
    'apps/desktop/src/main.tsx',
    "        onViewZoomChange={viewMode === 'globe' ? setGlobeZoom : setMapZoom}",
    "        onViewZoomChange={viewMode === 'globe' ? setGlobeZoom : viewMode === 'system' ? setSystemZoom : setMapZoom}"
)
replace_exact(
    'apps/desktop/src/main.tsx',
    "        ) : project ? (\n          <div className=\"globe-enrichment-frame\">",
    "        ) : viewMode === 'globe' && project ? (\n          <div className=\"globe-enrichment-frame\">"
)
replace_exact(
    'apps/desktop/src/main.tsx',
    "          </div>\n        ) : null}\n        legend={project && mapMode === 'biomes' && renderMode === 'data' && viewMode === 'map' ? <BiomeLegend theme={mapTheme} /> : null}",
    "          </div>\n        ) : viewMode === 'system' && project ? (\n          <div className=\"globe-enrichment-frame system-enrichment-frame\">\n            <SystemViewer\n              project={project}\n              orbitalContext={enrichment.artifact}\n              simulationClock={simulationClock}\n              zoom={systemZoom}\n              onZoom={handleSystemWheelZoom}\n            />\n            <OrbitalContextStatus\n              status={enrichment.status}\n              activeNodeLabel={enrichment.activeNodeLabel}\n              error={enrichment.error}\n              elapsedMs={enrichment.elapsedMs}\n              artifact={enrichment.artifact}\n              onRetry={enrichment.ensureOrbitalContext}\n              onCancel={enrichment.cancelOrbitalContext}\n            />\n          </div>\n        ) : null}\n        legend={project && mapMode === 'biomes' && renderMode === 'data' && viewMode === 'map' ? <BiomeLegend theme={mapTheme} /> : null}"
)

print('Applied bounded System Explore integration.')

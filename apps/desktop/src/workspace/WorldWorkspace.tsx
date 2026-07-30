import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { Cloud, Globe2, Hexagon, Map, Search, Waves, Waypoints } from 'lucide-react';
import type { CoastlineTreatment, MapMode, RenderMode } from '@world-forge/renderer';
import {
  normalizeUserFacingMapMode,
  workspaceModeOptions,
  type WorkspaceMode
} from './workspaceModes';
import './workspaceToolbar.css';

export type WorkspaceViewMode = 'map' | 'globe';
export type WorkspaceGlobeDebugMode = 'final' | 'albedo' | 'lit' | 'water-mask' | 'sea-level' | 'coast-mask' | 'ocean-shell' | 'neutral-mesh' | 'topology-face' | 'uv-grid' | 'shade' | 'gyres';

export type WorldWorkspaceProps = {
  projectName?: string;
  isGenerating: boolean;
  generationStage: string;
  generationProgress: number;
  generationNodeProgress: Array<{
    nodeId: string;
    label: string;
    progress: number;
    status: 'waiting' | 'running' | 'complete' | 'failed';
    elapsedMs?: number;
  }>;
  viewMode: WorkspaceViewMode;
  showRivers: boolean;
  showPlates: boolean;
  showHexes: boolean;
  hexOverlayLabel?: string;
  diagnosticMode: boolean;
  showGlobeShells: boolean;
  renderMode: RenderMode;
  mapMode: MapMode;
  coastlineTreatment: CoastlineTreatment;
  globeDebugMode: WorkspaceGlobeDebugMode;
  viewZoom: number;
  onViewZoomChange: (zoom: number) => void;
  exportActions: ReactNode;
  developerActions?: ReactNode;
  developerMode?: boolean;
  mapContent: ReactNode;
  legend?: ReactNode;
  onViewModeChange: (mode: WorkspaceViewMode) => void;
  onShowRiversChange: (visible: boolean) => void;
  onShowPlatesChange: (visible: boolean) => void;
  onShowHexesChange: (visible: boolean) => void;
  onToggleDiagnostics: () => void;
  onToggleGlobeShells: () => void;
  onRenderModeChange: (mode: RenderMode) => void;
  onMapModeChange: (mode: MapMode) => void;
  onCoastlineTreatmentChange: (treatment: CoastlineTreatment) => void;
  onGlobeDebugModeChange: (mode: WorkspaceGlobeDebugMode) => void;
};

export function WorldWorkspace({
  projectName,
  isGenerating,
  generationStage,
  generationProgress,
  generationNodeProgress,
  viewMode,
  showRivers,
  showPlates,
  showHexes,
  hexOverlayLabel,
  diagnosticMode,
  showGlobeShells,
  renderMode,
  mapMode,
  coastlineTreatment,
  viewZoom,
  onViewZoomChange,
  exportActions,
  developerActions,
  developerMode = false,
  mapContent,
  legend,
  onViewModeChange,
  onShowRiversChange,
  onShowPlatesChange,
  onShowHexesChange,
  onToggleDiagnostics,
  onToggleGlobeShells,
  onRenderModeChange,
  onMapModeChange,
  onCoastlineTreatmentChange
}: WorldWorkspaceProps) {
  const isDeveloperMode = developerMode || projectName === 'Developer workspace';
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(projectName ? 'explore' : 'build');
  const previousProjectNameRef = useRef(projectName);
  const wasGeneratingRef = useRef(isGenerating);
  const [zoomMenu, setZoomMenu] = useState<{ x: number; y: number } | null>(null);
  const zoomStops = [0.75, 1, 1.5, 2.25, 4, 5.5, 8];
  const visibleMapMode = normalizeUserFacingMapMode(mapMode);
  const activeWorkspaceMode = workspaceModeOptions.find((option) => option.id === workspaceMode) ?? workspaceModeOptions[0];

  useEffect(() => {
    if (!isDeveloperMode && visibleMapMode !== mapMode) onMapModeChange(visibleMapMode);
  }, [isDeveloperMode, mapMode, onMapModeChange, visibleMapMode]);

  useEffect(() => {
    const projectAppeared = !previousProjectNameRef.current && Boolean(projectName);
    const generationCompleted = wasGeneratingRef.current && !isGenerating && Boolean(projectName);
    if (projectAppeared || generationCompleted) setWorkspaceMode('explore');
    previousProjectNameRef.current = projectName;
    wasGeneratingRef.current = isGenerating;
  }, [isGenerating, projectName]);

  const openZoomMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setZoomMenu({ x: event.clientX, y: event.clientY });
  };

  return (
    <section className={`map-pane ${isDeveloperMode ? 'developer-mode' : ''}`} aria-label={isDeveloperMode ? 'Developer generation workspace' : 'Generated world map'}>
      {!isDeveloperMode && (
        <div className="workspace-toolbar-stack">
          <div className="workspace-mode-bar">
            <div className="workspace-mode-toggle" role="tablist" aria-label="World workspace mode">
              {workspaceModeOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={workspaceMode === option.id}
                  className={workspaceMode === option.id ? 'active' : ''}
                  onClick={() => setWorkspaceMode(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <span>{activeWorkspaceMode.description}</span>
          </div>

          {workspaceMode === 'explore' && (
            <div className="map-actions">
              <div className="layer-toggles">
                <div className="view-mode-toggle" role="group" aria-label="Map or globe view">
                  <button type="button" className={`icon-button ${viewMode === 'map' ? 'active' : ''}`} aria-label="Map view" aria-pressed={viewMode === 'map'} title="Map view" onClick={() => onViewModeChange('map')}><Map size={16} /></button>
                  <button type="button" className={`icon-button ${viewMode === 'globe' ? 'active' : ''}`} aria-label="Globe view" aria-pressed={viewMode === 'globe'} title="Globe view" onClick={() => onViewModeChange('globe')}><Globe2 size={16} /></button>
                </div>
                <button type="button" className={`icon-button layer-icon-toggle rivers-toggle ${showRivers ? 'active' : ''}`} aria-label={showRivers ? 'Hide rivers' : 'Show rivers'} aria-pressed={showRivers} title={showRivers ? 'Rivers visible' : 'Rivers hidden'} onClick={() => onShowRiversChange(!showRivers)}><Waves size={16} /></button>
                <button type="button" className={`icon-button layer-icon-toggle plates-toggle ${showPlates ? 'active' : ''}`} aria-label={showPlates ? 'Hide plate boundaries' : 'Show plate boundaries'} aria-pressed={showPlates} title={showPlates ? 'Plate boundaries visible' : 'Plate boundaries hidden'} onClick={() => onShowPlatesChange(!showPlates)}><Waypoints size={16} /></button>
                <button type="button" className={`icon-button layer-icon-toggle hex-toggle ${showHexes ? 'active' : ''}`} aria-label={showHexes ? 'Hide hex overlay' : 'Show hex overlay'} aria-pressed={showHexes} title={showHexes ? `Hex overlay visible${hexOverlayLabel ? `: ${hexOverlayLabel}` : ''}` : 'Hex overlay hidden'} onClick={() => onShowHexesChange(!showHexes)}><Hexagon size={16} /></button>
                <button type="button" className={`icon-button diagnostic-toggle ${diagnosticMode ? 'active' : ''}`} aria-label={diagnosticMode ? 'Disable point inspector' : 'Enable point inspector'} aria-pressed={diagnosticMode} title={diagnosticMode ? 'Point inspector on' : 'Point inspector off'} onClick={onToggleDiagnostics}><Search size={16} /></button>
                {viewMode === 'globe' && <button type="button" className={`icon-button shell-toggle ${showGlobeShells ? 'active' : ''}`} aria-label={showGlobeShells ? 'Hide globe ocean and atmosphere shells' : 'Show globe ocean and atmosphere shells'} aria-pressed={showGlobeShells} title={showGlobeShells ? 'Globe ocean and atmosphere visible' : 'Globe ocean and atmosphere hidden'} onClick={onToggleGlobeShells}><Cloud size={16} /></button>}
                <select aria-label="Presentation" value={renderMode} onChange={(event) => onRenderModeChange(event.target.value as RenderMode)} disabled={visibleMapMode !== 'biomes'}>
                  <option value="data">Data</option>
                  <option value="natural">Natural</option>
                </select>
                <select id="map-mode" aria-label="Map subject" value={visibleMapMode} onChange={(event) => onMapModeChange(event.target.value as MapMode)}>
                  <option value="biomes">Biomes</option>
                  <option value="elevation">Elevation</option>
                  <option value="heightmap">Heightmap</option>
                  <option value="temperature">Temperature</option>
                  <option value="rainfall">Rainfall</option>
                  <option value="climate-moisture">Climate moisture</option>
                  <option value="climate-precipitation">Climate precipitation</option>
                  <option value="wind">Wind</option>
                  <option value="current">Current</option>
                  <option value="terrain-only">Terrain only</option>
                </select>
                <select aria-label="Coastline treatment" value={coastlineTreatment} onChange={(event) => onCoastlineTreatmentChange(event.target.value as CoastlineTreatment)} disabled={visibleMapMode !== 'biomes'}>
                  <option value="bare">Bare coast</option>
                  <option value="toned">Toned coast</option>
                  <option value="outlined">Outlined coast</option>
                </select>
                <div className="view-zoom-controls" role="group" aria-label="View zoom">
                  <button type="button" className="zoom-pill" title="Current zoom. Right-click for common zoom levels." onContextMenu={openZoomMenu} onClick={() => setZoomMenu(null)}>{Math.round(viewZoom * 100)}%</button>
                  {showHexes && hexOverlayLabel && <output className="hex-scale-readout" title="Current hex overlay scale">{hexOverlayLabel}</output>}
                </div>
                {zoomMenu && (
                  <div className="zoom-context-menu" role="menu" style={{ left: zoomMenu.x, top: zoomMenu.y }} onMouseLeave={() => setZoomMenu(null)}>
                    {zoomStops.map((stop) => (
                      <button
                        type="button"
                        role="menuitem"
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

          {workspaceMode === 'export' && (
            <div className="map-actions export-mode-actions">
              <div className="export-mode-copy">
                <strong>Export current world</strong>
                <span>Common formats are here. Tile and VTT options remain in the details panel for this slice.</span>
              </div>
              <div className="download-actions">{exportActions}</div>
            </div>
          )}
        </div>
      )}
      {isDeveloperMode && developerActions}
      <div className="canvas-wrap">
        {isGenerating && (
          <div className="generation-progress" role="status" aria-live="polite">
            <div className="generation-progress-total">
              <span>{generationStage || 'Generating world'}</span><progress value={generationProgress} max={1} /><output>{Math.round(generationProgress * 100)}%</output>
            </div>
            <div className="generation-node-progress" aria-label="Generation node progress">
              {generationNodeProgress.map((node) => (
                <span
                  key={node.nodeId}
                  className={`generation-node-segment status-${node.status}`}
                  title={`${node.label}: ${Math.round(node.progress * 100)}%${node.elapsedMs !== undefined ? ` · ${Math.round(node.elapsedMs)} ms` : ''}`}
                >
                  <i style={{ transform: `scaleX(${Math.max(0, Math.min(1, node.progress))})` }} />
                </span>
              ))}
            </div>
          </div>
        )}
        {!projectName && !isGenerating ? <div className="empty-map"><strong>No map on the table</strong><span>Choose a seed or preset, then generate a world or open a .wforge package.</span></div> : mapContent}
      </div>
      {legend}
    </section>
  );
}

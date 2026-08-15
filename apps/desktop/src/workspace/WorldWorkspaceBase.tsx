import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { Cloud, CloudRain, Globe2, Hexagon, Layers, Map, Maximize2, Orbit, Search, Waves, Waypoints } from 'lucide-react';
import type { CoastlineTreatment, MapMode, RenderMode } from '@world-forge/renderer';
import {
  normalizeUserFacingMapMode,
  workspaceModeOptions,
  type WorkspaceMode
} from './workspaceModes';
import { worldPresentationOptions } from './workspacePresentations';
import { useDismissiblePopover } from '../shared/useDismissiblePopover';
import { formatGenerationDuration } from '../generation/generationTiming';
import './workspaceToolbar.css';

export type WorkspaceViewMode = 'map' | 'globe' | 'system';
export type WorkspaceGlobeDebugMode = 'final' | 'albedo' | 'lit' | 'water-mask' | 'sea-level' | 'coast-mask' | 'ocean-shell' | 'neutral-mesh' | 'topology-face' | 'uv-grid' | 'shade' | 'gyres';

export type WorldWorkspaceProps = {
  projectName?: string;
  workspaceMode: WorkspaceMode;
  isGenerating: boolean;
  generationStage: string;
  generationProgress: number;
  generationElapsedMs: number;
  generationStageElapsedMs: number;
  generationNodeProgress: Array<{
    nodeId: string;
    label: string;
    progress: number;
    status: 'waiting' | 'running' | 'complete' | 'failed' | 'skipped';
    elapsedMs?: number;
  }>;
  viewMode: WorkspaceViewMode;
  showRivers: boolean;
  showPlates: boolean;
  showHexes: boolean;
  hexOverlayLabel?: string;
  diagnosticMode: boolean;
  showGlobeShells: boolean;
  showClouds: boolean;
  showWeather: boolean;
  renderMode: RenderMode;
  mapMode: MapMode;
  coastlineTreatment: CoastlineTreatment;
  globeDebugMode: WorkspaceGlobeDebugMode;
  viewZoom: number;
  onViewZoomChange: (zoom: number) => void;
  displayActions?: ReactNode;
  developerActions?: ReactNode;
  developerMode?: boolean;
  mapContent: ReactNode;
  legend?: ReactNode;
  onWorkspaceModeChange: (mode: WorkspaceMode) => void;
  onViewModeChange: (mode: WorkspaceViewMode) => void;
  onShowRiversChange: (visible: boolean) => void;
  onShowPlatesChange: (visible: boolean) => void;
  onShowHexesChange: (visible: boolean) => void;
  onToggleDiagnostics: () => void;
  onToggleGlobeShells: () => void;
  onShowCloudsChange: (visible: boolean) => void;
  onShowWeatherChange: (visible: boolean) => void;
  onRenderModeChange: (mode: RenderMode) => void;
  onMapModeChange: (mode: MapMode) => void;
  onCoastlineTreatmentChange: (treatment: CoastlineTreatment) => void;
  onGlobeDebugModeChange: (mode: WorkspaceGlobeDebugMode) => void;
};

export function WorldWorkspace({
  projectName,
  workspaceMode,
  isGenerating,
  generationStage,
  generationProgress,
  generationElapsedMs,
  generationStageElapsedMs,
  generationNodeProgress,
  viewMode,
  showRivers,
  showPlates,
  showHexes,
  hexOverlayLabel,
  diagnosticMode,
  showGlobeShells,
  showClouds,
  showWeather,
  renderMode,
  mapMode,
  coastlineTreatment,
  globeDebugMode,
  viewZoom,
  onViewZoomChange,
  displayActions,
  developerActions,
  developerMode = false,
  mapContent,
  legend,
  onWorkspaceModeChange,
  onViewModeChange,
  onShowRiversChange,
  onShowPlatesChange,
  onShowHexesChange,
  onToggleDiagnostics,
  onToggleGlobeShells,
  onShowCloudsChange,
  onShowWeatherChange,
  onRenderModeChange,
  onMapModeChange,
  onCoastlineTreatmentChange,
  onGlobeDebugModeChange
}: WorldWorkspaceProps) {
  const isDeveloperMode = developerMode || projectName === 'Developer workspace';
  const [zoomMenuPosition, setZoomMenuPosition] = useState({ x: 8, y: 8 });
  const layersPopover = useDismissiblePopover();
  const zoomPopover = useDismissiblePopover();
  const zoomStops = [0.35, 0.5, 0.75, 1, 1.5, 2.25, 4, 5.5, 8];
  const visibleMapMode = normalizeUserFacingMapMode(mapMode);
  const activeWorkspaceMode = workspaceModeOptions.find((option) => option.id === workspaceMode) ?? workspaceModeOptions[0];
  const analyticalGlobeActiveRef = useRef(false);
  const naturalGlobeLayersRef = useRef({ shells: showGlobeShells, clouds: showClouds, weather: showWeather });

  useEffect(() => {
    if (!isDeveloperMode && visibleMapMode !== mapMode) onMapModeChange(visibleMapMode);
  }, [isDeveloperMode, mapMode, onMapModeChange, visibleMapMode]);

  useEffect(() => {
    if (isDeveloperMode || viewMode !== 'globe') return;
    const analytical = visibleMapMode !== 'biomes';
    if (analytical) {
      if (!analyticalGlobeActiveRef.current) {
        naturalGlobeLayersRef.current = { shells: showGlobeShells, clouds: showClouds, weather: showWeather };
        analyticalGlobeActiveRef.current = true;
      }
      if (globeDebugMode !== 'albedo') onGlobeDebugModeChange('albedo');
      if (showGlobeShells) onToggleGlobeShells();
      if (showClouds) onShowCloudsChange(false);
      if (showWeather) onShowWeatherChange(false);
      return;
    }

    if (globeDebugMode === 'albedo') onGlobeDebugModeChange('final');
    if (!analyticalGlobeActiveRef.current) return;
    const natural = naturalGlobeLayersRef.current;
    analyticalGlobeActiveRef.current = false;
    if (showGlobeShells !== natural.shells) onToggleGlobeShells();
    if (showClouds !== natural.clouds) onShowCloudsChange(natural.clouds);
    if (showWeather !== natural.weather) onShowWeatherChange(natural.weather);
  }, [
    globeDebugMode,
    isDeveloperMode,
    onGlobeDebugModeChange,
    onShowCloudsChange,
    onShowWeatherChange,
    onToggleGlobeShells,
    showClouds,
    showGlobeShells,
    showWeather,
    viewMode,
    visibleMapMode
  ]);

  useEffect(() => {
    if (workspaceMode === 'explore') return;
    layersPopover.close();
    zoomPopover.close();
  }, [layersPopover.close, workspaceMode, zoomPopover.close]);

  const openZoomMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setZoomMenuPosition({
      x: Math.max(8, Math.min(window.innerWidth - 92, event.clientX)),
      y: Math.max(8, Math.min(window.innerHeight - 224, event.clientY))
    });
    if (!zoomPopover.open) zoomPopover.openPopover(false);
  };

  const toggleZoomMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (zoomPopover.open) {
      zoomPopover.close();
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    setZoomMenuPosition({
      x: Math.max(8, Math.min(window.innerWidth - 92, bounds.left)),
      y: Math.max(8, Math.min(window.innerHeight - 224, bounds.bottom + 4))
    });
    zoomPopover.openPopover(false);
  };

  const fitView = () => {
    onViewZoomChange(1);
    zoomPopover.close();
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
                  onClick={() => onWorkspaceModeChange(option.id)}
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
                <div className="view-mode-toggle" role="group" aria-label="Map, globe, or system view">
                  <button type="button" className={`icon-button ${viewMode === 'map' ? 'active' : ''}`} aria-label="Map view" aria-pressed={viewMode === 'map'} title="Map view" onClick={() => onViewModeChange('map')}><Map size={16} /></button>
                  <button type="button" className={`icon-button ${viewMode === 'globe' ? 'active' : ''}`} aria-label="Globe view" aria-pressed={viewMode === 'globe'} title="Globe view" onClick={() => onViewModeChange('globe')}><Globe2 size={16} /></button>
                  <button type="button" className={`icon-button ${viewMode === 'system' ? 'active' : ''}`} aria-label="System view" aria-pressed={viewMode === 'system'} title="System view" onClick={() => onViewModeChange('system')}><Orbit size={16} /></button>
                </div>
                {viewMode !== 'system' && <>
                  <select aria-label="Presentation" value={renderMode as string} onChange={(event) => onRenderModeChange(event.target.value as RenderMode)} disabled={visibleMapMode !== 'biomes'}>
                    {worldPresentationOptions.map((option) => (
                      <option key={option.value} value={option.value} disabled={option.mapOnly && viewMode !== 'map'}>{option.label}</option>
                    ))}
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
                  <button type="button" className={`icon-button diagnostic-toggle ${diagnosticMode ? 'active' : ''}`} aria-label={diagnosticMode ? 'Disable point inspector' : 'Enable point inspector'} aria-pressed={diagnosticMode} title={diagnosticMode ? 'Point inspector on' : 'Point inspector off'} onClick={onToggleDiagnostics}><Search size={16} /></button>
                </>}
                <button type="button" className="explore-fit-button" aria-label="Fit view" title="Fit map or globe to the workspace" onClick={fitView}><Maximize2 size={16} /><span>Fit</span></button>
                <div className="dismissible-popover explore-layers-menu" data-open={layersPopover.open} ref={layersPopover.rootRef} hidden={viewMode === 'system'}>
                  <button
                    type="button"
                    className="explore-layers-trigger"
                    id={layersPopover.triggerId}
                    ref={layersPopover.triggerRef}
                    aria-controls={layersPopover.panelId}
                    aria-expanded={layersPopover.open}
                    aria-haspopup="dialog"
                    aria-label="Layers and display options"
                    onClick={() => layersPopover.togglePopover(false)}
                    onKeyDown={layersPopover.onTriggerKeyDown}
                  ><Layers size={16} /><span>Layers</span></button>
                  {layersPopover.open && (
                    <div
                      className="explore-layers-popover"
                      id={layersPopover.panelId}
                      ref={layersPopover.panelRef}
                      role="dialog"
                      aria-labelledby={layersPopover.triggerId}
                    >
                      <div className="explore-layers-section">
                        <strong>Visible layers</strong>
                        <button type="button" className={`explore-layer-toggle ${showRivers ? 'active' : ''}`} aria-pressed={showRivers} onClick={() => onShowRiversChange(!showRivers)}><span><Waves size={15} />Rivers</span><small>{showRivers ? 'On' : 'Off'}</small></button>
                        <button type="button" className={`explore-layer-toggle plates-toggle ${showPlates ? 'active' : ''}`} aria-pressed={showPlates} onClick={() => onShowPlatesChange(!showPlates)}><span><Waypoints size={15} />Plate boundaries</span><small>{showPlates ? 'On' : 'Off'}</small></button>
                        <button type="button" className={`explore-layer-toggle hex-toggle ${showHexes ? 'active' : ''}`} aria-pressed={showHexes} onClick={() => onShowHexesChange(!showHexes)}><span><Hexagon size={15} />Hex overlay</span><small>{showHexes ? (hexOverlayLabel || 'On') : 'Off'}</small></button>
                        {viewMode === 'globe' && <>
                          <button type="button" className={`explore-layer-toggle shell-toggle ${showGlobeShells ? 'active' : ''}`} aria-pressed={showGlobeShells} onClick={onToggleGlobeShells}><span><Cloud size={15} />Ocean and atmosphere</span><small>{showGlobeShells ? 'On' : 'Off'}</small></button>
                          <button type="button" className={`explore-layer-toggle cloud-toggle ${showClouds ? 'active' : ''}`} aria-pressed={showClouds} onClick={() => onShowCloudsChange(!showClouds)}><span><Cloud size={15} />Clouds</span><small>{showClouds ? 'On' : 'Off'}</small></button>
                          <button type="button" className={`explore-layer-toggle weather-toggle ${showWeather ? 'active' : ''}`} aria-pressed={showWeather} onClick={() => onShowWeatherChange(!showWeather)}><span><CloudRain size={15} />Weather systems</span><small>{showWeather ? 'On' : 'Off'}</small></button>
                        </>}
                      </div>
                      <div className="explore-layers-section explore-display-options">
                        <strong>Display</strong>
                        <label htmlFor="coastline-treatment"><span>Coastline</span><select id="coastline-treatment" aria-label="Coastline treatment" value={coastlineTreatment} onChange={(event) => onCoastlineTreatmentChange(event.target.value as CoastlineTreatment)} disabled={visibleMapMode !== 'biomes'}>
                          <option value="bare">Bare coast</option>
                          <option value="toned">Toned coast</option>
                          <option value="outlined">Outlined coast</option>
                        </select></label>
                        {displayActions}
                      </div>
                    </div>
                  )}
                </div>
                <div className={`view-zoom-controls ${viewMode !== 'system' && showHexes && hexOverlayLabel ? 'with-scale' : ''}`} role="group" aria-label="View zoom">
                  <div className="dismissible-popover zoom-popover" data-open={zoomPopover.open} ref={zoomPopover.rootRef}>
                    <button
                      type="button"
                      className="zoom-pill"
                      id={zoomPopover.triggerId}
                      ref={zoomPopover.triggerRef}
                      aria-controls={zoomPopover.panelId}
                      aria-expanded={zoomPopover.open}
                      aria-haspopup="menu"
                      aria-label={`Zoom ${Math.round(viewZoom * 100)} percent`}
                      title="Click for common zoom levels. Right-click to open at the pointer."
                      onContextMenu={openZoomMenu}
                      onClick={toggleZoomMenu}
                      onKeyDown={zoomPopover.onTriggerKeyDown}
                    >{Math.round(viewZoom * 100)}%</button>
                    {zoomPopover.open && (
                      <div
                        className="zoom-context-menu"
                        id={zoomPopover.panelId}
                        ref={zoomPopover.panelRef}
                        role="menu"
                        aria-labelledby={zoomPopover.triggerId}
                        style={{ left: zoomMenuPosition.x, top: zoomMenuPosition.y }}
                        onKeyDown={zoomPopover.onPanelKeyDown}
                      >
                        {zoomStops.map((stop) => (
                          <button
                            type="button"
                            role="menuitem"
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
                  {showHexes && hexOverlayLabel && <output className="hex-scale-readout" title="Current hex overlay scale">{hexOverlayLabel}</output>}
                </div>
              </div>
            </div>
          )}

          {workspaceMode === 'export' && (
            <div className="map-actions export-mode-actions">
              <div className="export-mode-copy">
                <strong>Export current world</strong>
                <span>Choose common files or configure tile and VTT packages in the Export panel.</span>
              </div>
            </div>
          )}
        </div>
      )}
      {isDeveloperMode && developerActions}
      <div className="canvas-wrap">
        {isGenerating && (
          <div className="generation-progress" role="status" aria-live="polite">
            <div className="generation-progress-total">
              <span className="generation-progress-copy">
                <strong>{generationStage || 'Generating world'}</strong>
                <small>Total {formatGenerationDuration(generationElapsedMs)} · Stage {formatGenerationDuration(generationStageElapsedMs)}</small>
              </span>
              <progress value={generationProgress} max={1} />
              <output>{Math.round(generationProgress * 100)}%</output>
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

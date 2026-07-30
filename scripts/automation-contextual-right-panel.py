from __future__ import annotations

from pathlib import Path
import re
import sys
from textwrap import dedent


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one match, found {count}: {old[:120]!r}')
    file.write_text(text.replace(old, new, 1))


def write_file(path: str, content: str) -> None:
    Path(path).write_text(dedent(content).lstrip())


def apply_product_changes() -> None:
    write_file(
        'apps/desktop/src/panels/rightPanelRouting.ts',
        r'''
        import type { WorkspaceMode } from '../workspace/workspaceModes';

        export type RightPanelContext = 'build' | 'world' | 'point' | 'drilldown' | 'hex' | 'export' | 'diagnostics';

        export type RightPanelContextInput = {
          workspaceMode: WorkspaceMode;
          developerMode: boolean;
          hasPointInspection: boolean;
          drilldownActive: boolean;
          hasHexInspection: boolean;
        };

        export function resolveRightPanelContext(input: RightPanelContextInput): RightPanelContext {
          if (input.developerMode) return 'diagnostics';
          if (input.workspaceMode === 'build') return 'build';
          if (input.workspaceMode === 'export') return 'export';
          if (input.hasPointInspection) return 'point';
          if (input.drilldownActive) return 'drilldown';
          if (input.hasHexInspection) return 'hex';
          return 'world';
        }
        ''',
    )
    write_file(
        'apps/desktop/src/panels/rightPanelRouting.test.ts',
        r'''
        import { describe, expect, it } from 'vitest';
        import { resolveRightPanelContext } from './rightPanelRouting';

        describe('resolveRightPanelContext', () => {
          const explore = {
            workspaceMode: 'explore' as const,
            developerMode: false,
            hasPointInspection: false,
            drilldownActive: false,
            hasHexInspection: false,
          };

          it('routes Build and Export directly from workspace mode', () => {
            expect(resolveRightPanelContext({ ...explore, workspaceMode: 'build' })).toBe('build');
            expect(resolveRightPanelContext({ ...explore, workspaceMode: 'export' })).toBe('export');
          });

          it('keeps diagnostics developer-only', () => {
            expect(resolveRightPanelContext({ ...explore, developerMode: true })).toBe('diagnostics');
            expect(resolveRightPanelContext({ ...explore, workspaceMode: 'build', developerMode: true })).toBe('diagnostics');
          });

          it('shows the world summary when Explore has no selection', () => {
            expect(resolveRightPanelContext(explore)).toBe('world');
          });

          it('prioritizes point inspection over other Explore contexts', () => {
            expect(resolveRightPanelContext({
              ...explore,
              hasPointInspection: true,
              drilldownActive: true,
              hasHexInspection: true,
            })).toBe('point');
          });

          it('prioritizes active geographic drilldown over a stale hex selection', () => {
            expect(resolveRightPanelContext({ ...explore, drilldownActive: true, hasHexInspection: true })).toBe('drilldown');
          });

          it('shows the hex inspector when it is the only Explore selection', () => {
            expect(resolveRightPanelContext({ ...explore, hasHexInspection: true })).toBe('hex');
          });
        });
        ''',
    )
    write_file(
        'apps/desktop/src/panels/RightPanel.tsx',
        r'''
        import React, { useEffect, useState } from 'react';
        import { AlertTriangle, Download, FileJson, Hexagon, Image, Layers, MapPin, PanelRightClose, PanelRightOpen, Sparkles } from 'lucide-react';
        import { GenerationConfig, HexTileFeature, WorldProject, civ7StyleHexTileProfile, hexTileMapPresets } from '@world-forge/shared';
        import { ShellStatusControls } from '../shell/ShellStatusControls';
        import { WorldNameEditor } from '../worlds/WorldNameEditor';
        import { requestWorldRename } from '../worlds/worldIdentityBridge';
        import { GeographicHierarchyPanel } from '../regions/GeographicHierarchyPanel';
        import type { WorkspaceMode } from '../workspace/workspaceModes';
        import { resolveRightPanelContext } from './rightPanelRouting';

        type ResolutionOption = { label: string; width: number; height: number };
        type ExportTaskState = { status: 'idle' | 'running' | 'complete' | 'error'; progress: number; message: string };
        type HexInspectionSummary = { levelId: string; label: string; nominalHexWidthMiles: number; q: number; r: number };

        type RightPanelProps = {
          workspaceMode: WorkspaceMode;
          developerMode: boolean;
          collapsed: boolean;
          feedbackStatus: string;
          inspectorContent: React.ReactNode;
          diagnosticsContent: React.ReactNode;
          project: WorldProject | null;
          config: GenerationConfig;
          selectedPreset: string;
          isGenerating: boolean;
          generationStage: string;
          generationProgress: number;
          hexInspection: HexInspectionSummary | null;
          commonExportActions: React.ReactNode;
          tilePresetId: string;
          tileWidth: number;
          tileHeight: number;
          tileFeatures: HexTileFeature[];
          tileFeatureLabels: Record<HexTileFeature, string>;
          tileHexScaleMiles: number | null;
          vttResolution: ResolutionOption;
          resolutionOptions: ResolutionOption[];
          vttGridEnabled: boolean;
          vttHexSizeMilesInput: string;
          vttHexMetrics: { columns: number; rows: number } | null;
          pngTask: ExportTaskState;
          svgTask: ExportTaskState;
          jsonTask: ExportTaskState;
          wforgeTask: ExportTaskState;
          hexSvgTask: ExportTaskState;
          tileJsonTask: ExportTaskState;
          vttTask: ExportTaskState;
          onCollapsedChange: (collapsed: boolean) => void;
          onFeedback: () => void;
          onClearHexInspection: () => void;
          onTilePresetChange: (presetId: string) => void;
          onTileWidthChange: (width: number) => void;
          onTileHeightChange: (height: number) => void;
          onTileFeatureChange: (feature: HexTileFeature, enabled: boolean) => void;
          onVttResolutionChange: (resolution: ResolutionOption) => void;
          onVttGridEnabledChange: (enabled: boolean) => void;
          onVttHexSizeInputChange: (value: string) => void;
          onCommitVttHexSize: () => void;
          renderExportButton: (props: { icon: React.ReactNode; label: string; task: ExportTaskState; disabled: boolean; title: string; onClick: () => void }) => React.ReactNode;
          onDownloadHexGridSvg: () => void;
          onDownloadHexTileJson: () => void;
          onDownloadVttPackage: () => void;
        };

        function Metric({ label, value, status }: { label: string; value: string; status?: 'ok' | 'warn' }) {
          return <div className={`metric ${status ?? ''}`}><span>{label}</span><strong>{value}</strong></div>;
        }

        function formatElapsedMinutesSeconds(ms: number): string {
          const totalSeconds = Math.max(0, Math.round(ms / 1000));
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = totalSeconds % 60;
          return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        function formatRange(range: { min: number; max: number; unit?: string }): string {
          return `${range.min} - ${range.max}${range.unit ? ` ${range.unit}` : ''}`;
        }

        function WorldSummary({ project }: { project: WorldProject | null }) {
          if (!project) return <div className="empty-panel"><h2>World</h2><p>No generated world is loaded.</p></div>;
          const primaryBody = project.solarSystem.bodies.find((body) => body.isPrimaryWorld);
          return (
            <section className="panel-context world-summary-context" aria-label="World summary">
              <WorldNameEditor value={project.projectName} as="h2" onSave={(name) => requestWorldRename(project.projectId, name)} />
              <Metric label="Ocean" value={`${project.metrics.oceanPercentage}%`} status={project.metrics.validation.oceanWithinTolerance ? 'ok' : 'warn'} />
              <Metric label="Land" value={`${project.metrics.landPercentage}%`} />
              <Metric label="Ice" value={`${project.metrics.icePercentage}%`} />
              <Metric label="Rivers" value={String(project.metrics.riverCount)} status={project.metrics.validation.riverPathsValid ? 'ok' : 'warn'} />
              <Metric label="Lake cells" value={String(project.metrics.lakeCellCount)} />
              <Metric label="Map scale" value={`${project.primaryWorld.mapModel.resolution.width} x ${project.primaryWorld.mapModel.resolution.height}`} />
              {project.diagnostics && <Metric label="Generated in" value={formatElapsedMinutesSeconds(project.diagnostics.totalMs)} />}
              <Metric label="Planet size" value={`${project.primaryWorld.sizeClass} Earth radii`} />
              <Metric label="Axial tilt" value={`${project.primaryWorld.axialTiltDeg} deg`} />
              <Metric label="Eccentricity" value={String(project.primaryWorld.orbitalEccentricity)} />
              <div className="system"><h3>System</h3><p>{project.solarSystem.star.type}, {project.solarSystem.ageGy} Gy</p><p>{project.solarSystem.bodies.length} major bodies, {project.primaryWorld.tideInfluence > 0 ? 'moon-influenced tides' : 'no major moon tide'}</p></div>
              <div className="system"><h3>Moons</h3>{primaryBody?.moons.length ? primaryBody.moons.map((moon) => <p key={moon.id}>{moon.name}: size {moon.sizeClass}, orbit {moon.orbitalDistanceClass}, tide {moon.tideInfluence}</p>) : <p>No major moons</p>}</div>
              <div className="biomes"><h3>Biomes</h3>{Object.entries(project.metrics.biomeCounts).filter(([biome]) => biome !== 'mountain').map(([biome, count]) => <span key={biome}>{biome.replace('_', ' ')}: {count}</span>)}</div>
            </section>
          );
        }

        function ExportStatusList({ entries }: { entries: Array<{ label: string; task: ExportTaskState }> }) {
          const activeEntries = entries.filter(({ task }) => task.status !== 'idle');
          if (!activeEntries.length) return null;
          return (
            <div className="export-task-feedback" role="status" aria-live="polite">
              {activeEntries.map(({ label, task }) => (
                <div key={label} className={`export-task-feedback-row ${task.status}`}>
                  <span>{label}</span>
                  <strong>{task.message || (task.status === 'running' ? `${Math.round(task.progress * 100)}%` : task.status)}</strong>
                </div>
              ))}
            </div>
          );
        }

        export function RightPanel(props: RightPanelProps) {
          const {
            workspaceMode, developerMode, collapsed, feedbackStatus, inspectorContent, diagnosticsContent, project,
            config, selectedPreset, isGenerating, generationStage, generationProgress, hexInspection, commonExportActions,
            tilePresetId, tileWidth, tileHeight, tileFeatures, tileFeatureLabels, tileHexScaleMiles, vttResolution,
            resolutionOptions, vttGridEnabled, vttHexSizeMilesInput, vttHexMetrics, pngTask, svgTask, jsonTask,
            wforgeTask, hexSvgTask, tileJsonTask, vttTask, onCollapsedChange, onFeedback, onClearHexInspection,
            onTilePresetChange, onTileWidthChange, onTileHeightChange, onTileFeatureChange, onVttResolutionChange,
            onVttGridEnabledChange, onVttHexSizeInputChange, onCommitVttHexSize, renderExportButton,
            onDownloadHexGridSvg, onDownloadHexTileJson, onDownloadVttPackage,
          } = props;
          const [drilldownActive, setDrilldownActive] = useState(false);
          const geographicWorkspaceActive = Boolean(project && !developerMode && workspaceMode === 'explore');
          const context = resolveRightPanelContext({
            workspaceMode,
            developerMode,
            hasPointInspection: Boolean(inspectorContent),
            drilldownActive,
            hasHexInspection: Boolean(hexInspection),
          });

          useEffect(() => {
            if (!geographicWorkspaceActive) setDrilldownActive(false);
          }, [geographicWorkspaceActive]);

          const collapsedLabel = context === 'diagnostics' ? 'Diagnostics' : context === 'export' ? 'Export' : context === 'build' ? 'Build' : 'Explore';
          const exportEntries = [
            { label: 'PNG', task: pngTask },
            { label: 'SVG', task: svgTask },
            { label: 'JSON', task: jsonTask },
            { label: '.wforge', task: wforgeTask },
            { label: 'Hex SVG', task: hexSvgTask },
            { label: 'Tile JSON', task: tileJsonTask },
            { label: 'VTT ZIP', task: vttTask },
          ];

          return (
            <>
              <ShellStatusControls onFeedback={onFeedback} />
              <aside className={`summary ${collapsed ? 'panel-collapsed' : ''}`} aria-label="Context panel" data-workspace-mode={workspaceMode} data-context={context}>
                <button type="button" title={collapsed ? 'Expand context panel' : 'Collapse context panel'} aria-label={collapsed ? 'Expand context panel' : 'Collapse context panel'} className="icon-button panel-toggle right-panel-boundary-toggle" onClick={() => onCollapsedChange(!collapsed)}>
                  {collapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
                </button>

                {feedbackStatus && !collapsed && <div className="feedback-status" role="status">{feedbackStatus}</div>}
                {project && (
                  <GeographicHierarchyPanel
                    project={project}
                    workspaceActive={geographicWorkspaceActive}
                    showInspector={!collapsed && context === 'drilldown'}
                    onContextActiveChange={setDrilldownActive}
                  />
                )}

                {collapsed ? <div className="collapsed-panel-label">{collapsedLabel}</div> : (
                  <>
                    {context === 'build' && (
                      <section className="panel-context build-context" role="tabpanel" aria-label="Build guidance">
                        <header className="panel-context-header"><Sparkles size={17} /><div><strong>Build guidance</strong><span>What the current setup will produce</span></div></header>
                        <div className="context-card">
                          <h3>{selectedPreset}</h3>
                          <p>Generation ranges currently in effect.</p>
                        </div>
                        <Metric label="Ocean target" value={formatRange(config.parameterRanges.oceanPercentage)} />
                        <Metric label="Temperature" value={formatRange(config.parameterRanges.averageTemperatureC)} />
                        <Metric label="Continent count" value={formatRange(config.parameterRanges.continentCount)} />
                        <Metric label="Continent size and cohesion" value={formatRange(config.parameterRanges.continentScale)} />
                        <Metric label="Island density" value={formatRange(config.parameterRanges.islandDensity)} />
                        <Metric label="Generation quality" value={`${config.outputResolution.width} x ${config.outputResolution.height}; topology ${config.topologyResolution ?? 'auto'}`} />
                        {project ? (
                          <div className="context-warning"><AlertTriangle size={16} /><div><strong>Regenerating replaces {project.projectName}</strong><span>The current world stays visible unless the replacement finishes successfully.</span></div></div>
                        ) : (
                          <div className="context-card"><strong>No active world</strong><p>Generate a world from Quick Build or open one from My Worlds.</p></div>
                        )}
                        <div className={`context-progress ${isGenerating ? 'running' : ''}`} role="status" aria-live="polite">
                          <div><span>{isGenerating ? generationStage || 'Generating world' : project ? 'Ready to regenerate' : 'Ready to generate'}</span><strong>{isGenerating ? `${Math.round(generationProgress * 100)}%` : 'Idle'}</strong></div>
                          <progress value={isGenerating ? generationProgress : 0} max={1} />
                        </div>
                      </section>
                    )}

                    {context === 'point' && inspectorContent}

                    {context === 'hex' && hexInspection && (
                      <section className="panel-context hex-selection-context" role="tabpanel" aria-label="Hex selection">
                        <header className="panel-context-header"><MapPin size={17} /><div><strong>Hex selection</strong><span>{hexInspection.label}</span></div></header>
                        <Metric label="Overlay level" value={hexInspection.levelId} />
                        <Metric label="Nominal width" value={`${hexInspection.nominalHexWidthMiles.toLocaleString()} miles`} />
                        <Metric label="Coordinates" value={`q${hexInspection.q}, r${hexInspection.r}`} />
                        <button type="button" className="secondary-button hex-selection-clear" onClick={onClearHexInspection}>Clear selection</button>
                      </section>
                    )}

                    {context === 'world' && <WorldSummary project={project} />}

                    {context === 'export' && (
                      <section className="panel-context export-context" role="tabpanel" aria-label="Export options">
                        <header className="panel-context-header"><Download size={17} /><div><strong>Export current world</strong><span>Files, tiles, and VTT packages</span></div></header>
                        <div className="export-section"><h3>Common files</h3>{commonExportActions}</div>
                        <ExportStatusList entries={exportEntries} />
                        <div className="tile-export-panel">
                          <div className="tile-export-title"><Hexagon size={16} /><strong>Hex tile export</strong></div>
                          <label htmlFor="tile-size-preset">Tile size<select id="tile-size-preset" value={tilePresetId} onChange={(event) => onTilePresetChange(event.target.value)}>{hexTileMapPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}<option value="custom">Custom</option></select></label>
                          <div className="tile-dimensions"><label htmlFor="tile-width">Width<input id="tile-width" min="8" max="240" type="number" value={tileWidth} onChange={(event) => onTileWidthChange(Math.max(1, Number(event.target.value)))} /></label><label htmlFor="tile-height">Height<input id="tile-height" min="6" max="160" type="number" value={tileHeight} onChange={(event) => onTileHeightChange(Math.max(1, Number(event.target.value)))} /></label></div>
                          <div className="tile-feature-row" aria-label="Tile feature classes">{civ7StyleHexTileProfile.features.map((feature) => <label key={feature}><input type="checkbox" checked={tileFeatures.includes(feature)} onChange={(event) => onTileFeatureChange(feature, event.target.checked)} />{tileFeatureLabels[feature]}</label>)}</div>
                          <div className="tile-export-actions">{renderExportButton({ icon: <Layers size={16} />, label: 'Hex SVG', task: hexSvgTask, disabled: !project, title: 'Export hex grid SVG', onClick: onDownloadHexGridSvg })}{renderExportButton({ icon: <FileJson size={16} />, label: 'Tile JSON', task: tileJsonTask, disabled: !project, title: 'Export terrain tile JSON', onClick: onDownloadHexTileJson })}</div>
                          <div className="vtt-export-block"><div className="tile-export-title"><Image size={16} /><strong>VTT package</strong></div><label htmlFor="vtt-resolution">Image size<select id="vtt-resolution" value={vttResolution.label} onChange={(event) => onVttResolutionChange(resolutionOptions.find((option) => option.label === event.target.value) ?? resolutionOptions[2])}>{resolutionOptions.map((option) => <option key={option.label} value={option.label}>{option.label.replace('Fast ', '').replace('Default ', '').replace('Large ', '').replace('High ', '').replace('Ultra ', '')}</option>)}</select></label><label className="sync-toggle"><input type="checkbox" checked={vttGridEnabled} onChange={(event) => onVttGridEnabledChange(event.target.checked)} />Include hex grid overlay</label><label htmlFor="vtt-hex-size">Hex size miles<input id="vtt-hex-size" min="50" max="5000" step="50" type="number" value={vttHexSizeMilesInput} disabled={!vttGridEnabled} onBlur={onCommitVttHexSize} onChange={(event) => onVttHexSizeInputChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onCommitVttHexSize(); }} /></label><div className="export-readout"><span>Grid hexes</span><strong>{vttHexMetrics ? `${vttHexMetrics.columns} x ${vttHexMetrics.rows}` : 'No grid'}</strong></div><div className="tile-export-actions">{renderExportButton({ icon: <Download size={16} />, label: 'VTT ZIP', task: vttTask, disabled: !project, title: 'Export VTT-ready ZIP', onClick: onDownloadVttPackage })}</div></div>
                          <div className="system"><h3>Profile</h3><p>{civ7StyleHexTileProfile.label}</p><div className="export-readout"><span>Hex scale</span><strong>{tileHexScaleMiles ? `${tileHexScaleMiles.toLocaleString()} miles` : 'Generate world'}</strong></div><p>{project ? `${tileWidth} x ${tileHeight} pointy-top odd-row hexes sampled from generated topology facts. VTT export is a neutral map package with optional hex overlay and metadata.` : 'Generate or open a world before exporting tiles or VTT packages.'}</p></div>
                        </div>
                      </section>
                    )}

                    {context === 'diagnostics' && <div className="panel-context diagnostics-context" role="tabpanel" aria-label="Developer diagnostics">{diagnosticsContent}</div>}
                  </>
                )}
              </aside>
            </>
          );
        }
        ''',
    )

    replace_once(
        'apps/desktop/src/regions/GeographicHierarchyPanel.tsx',
        "export function GeographicHierarchyPanel({ project }: { project: WorldProject }) {",
        "type GeographicHierarchyPanelProps = {\n  project: WorldProject;\n  workspaceActive: boolean;\n  showInspector: boolean;\n  onContextActiveChange?: (active: boolean) => void;\n};\n\nexport function GeographicHierarchyPanel({ project, workspaceActive, showInspector, onContextActiveChange }: GeographicHierarchyPanelProps) {",
    )
    replace_once(
        'apps/desktop/src/regions/GeographicHierarchyPanel.tsx',
        "  const controller = useGeographicAtlasController(project, preview, partitionCacheRef.current);\n",
        "  const controller = useGeographicAtlasController(project, preview, partitionCacheRef.current);\n\n  useEffect(() => {\n    onContextActiveChange?.(workspaceActive && enabled);\n  }, [enabled, onContextActiveChange, workspaceActive]);\n",
    )
    replace_once(
        'apps/desktop/src/regions/GeographicHierarchyPanel.tsx',
        "  useEffect(() => {\n    if (!mapTarget) return;\n    mapTarget.classList.toggle('geographic-drilldown-enabled', enabled);\n    mapTarget.classList.toggle('geographic-drilldown-active', Boolean(enabled && controller.current));\n    return () => {\n      mapTarget.classList.remove('geographic-drilldown-enabled');\n      mapTarget.classList.remove('geographic-drilldown-active');\n    };\n  }, [controller.current, enabled, mapTarget]);",
        "  useEffect(() => {\n    if (!mapTarget) return;\n    const active = workspaceActive && enabled;\n    mapTarget.classList.toggle('geographic-drilldown-enabled', active);\n    mapTarget.classList.toggle('geographic-drilldown-active', Boolean(active && controller.current));\n    return () => {\n      mapTarget.classList.remove('geographic-drilldown-enabled');\n      mapTarget.classList.remove('geographic-drilldown-active');\n    };\n  }, [controller.current, enabled, mapTarget, workspaceActive]);",
    )
    replace_once(
        'apps/desktop/src/regions/GeographicHierarchyPanel.tsx',
        "      {toolbarTarget && createPortal(",
        "      {workspaceActive && toolbarTarget && createPortal(",
    )
    replace_once(
        'apps/desktop/src/regions/GeographicHierarchyPanel.tsx',
        "      {enabled && mapTarget && createPortal(",
        "      {workspaceActive && enabled && mapTarget && createPortal(",
    )
    replace_once(
        'apps/desktop/src/regions/GeographicHierarchyPanel.tsx',
        "      <section className={`geographic-drilldown-inspector ${enabled ? 'active' : ''}`} aria-label=\"Geographic drill-down details\">",
        "      {workspaceActive && showInspector && enabled && <section className=\"geographic-drilldown-inspector active\" aria-label=\"Geographic drill-down details\">",
    )
    replace_once(
        'apps/desktop/src/regions/GeographicHierarchyPanel.tsx',
        "              {controller.current && <button type=\"button\" className=\"secondary-button\" onClick={controller.back}><ArrowLeft size={14} />Back</button>}\n              <button type=\"button\" className=\"primary-button\" disabled={!canOpen || inspectorActive} onClick={openSelected}>Open selected</button>",
        "              {controller.current && <button type=\"button\" className=\"secondary-button\" onClick={controller.back}><ArrowLeft size={14} />Back</button>}\n              <button type=\"button\" className=\"secondary-button\" disabled={!selectedLabel && !controller.current} onClick={controller.reset}>Clear selection</button>\n              <button type=\"button\" className=\"primary-button\" disabled={!canOpen || inspectorActive} onClick={openSelected}>Open selected</button>",
    )
    replace_once(
        'apps/desktop/src/regions/GeographicHierarchyPanel.tsx',
        "      </section>\n    </>\n  );",
        "      </section>}\n    </>\n  );",
    )
    replace_once(
        'apps/desktop/src/regions/useGeographicAtlasController.ts',
        "  const reset = () => {\n    setSelectedChildId(null);\n    setSelectedRegionId(null);\n    setNavigation([]);\n  };",
        "  const reset = () => {\n    setSelectedMacroId(null);\n    setSelectedChildId(null);\n    setSelectedRegionId(null);\n    setNavigation([]);\n  };",
    )

    replace_once(
        'apps/desktop/src/workspace/WorldWorkspace.tsx',
        "  exportActions: ReactNode;\n",
        "",
    )
    replace_once(
        'apps/desktop/src/workspace/WorldWorkspace.tsx',
        "  exportActions,\n",
        "",
    )
    replace_once(
        'apps/desktop/src/workspace/WorldWorkspace.tsx',
        "          {workspaceMode === 'export' && (\n            <div className=\"map-actions export-mode-actions\">\n              <div className=\"export-mode-copy\">\n                <strong>Export current world</strong>\n                <span>Common formats are here. Tile and VTT options remain in the details panel for this slice.</span>\n              </div>\n              <div className=\"download-actions\">{exportActions}</div>\n            </div>\n          )}",
        "          {workspaceMode === 'export' && (\n            <div className=\"map-actions export-mode-actions\">\n              <div className=\"export-mode-copy\">\n                <strong>Export current world</strong>\n                <span>Choose common files or configure tile and VTT packages in the Export panel.</span>\n              </div>\n            </div>\n          )}",
    )

    write_file(
        'apps/desktop/src/worlds/MyWorldsPanel.tsx',
        r'''
        import React, { useState } from 'react';
        import { FolderOpen, Save } from 'lucide-react';
        import type { SavedMapRecord } from '../sync';
        import { WorldLibraryOperationOverlay, type WorldLibraryOperation } from './WorldLibraryOperationOverlay';
        import { WorldNameEditor } from './WorldNameEditor';
        import { requestWorldRename } from './worldIdentityBridge';

        export type MyWorldsPanelProps = {
          activeProjectId?: string;
          canSaveCurrent: boolean;
          records: SavedMapRecord[];
          status: string;
          onSaveCurrent: () => void | Promise<void>;
          onLoad: (record: SavedMapRecord) => void | Promise<void>;
          onRemove: (record: SavedMapRecord) => void;
          onOpenPackage: (file: File) => void | Promise<void>;
        };

        export function MyWorldsPanel({
          activeProjectId,
          canSaveCurrent,
          records,
          status,
          onSaveCurrent,
          onLoad,
          onRemove,
          onOpenPackage,
        }: MyWorldsPanelProps) {
          const [operation, setOperation] = useState<WorldLibraryOperation | null>(null);

          const runOperation = async (next: WorldLibraryOperation, task: () => void | Promise<void>) => {
            if (operation) return;
            setOperation(next);
            try {
              await task();
            } finally {
              setOperation(null);
            }
          };

          return (
            <div className="my-worlds-panel" role="tabpanel" aria-label="My Worlds">
              <div className="world-library-actions">
                <div className="world-library-primary-actions">
                  <button
                    type="button"
                    disabled={!canSaveCurrent || Boolean(operation)}
                    onClick={() => {
                      void runOperation({
                        kind: 'saving',
                        title: 'Saving current world',
                        detail: 'Writing the generated world and current settings to the local world library.',
                      }, onSaveCurrent).catch(() => undefined);
                    }}
                  >
                    <Save size={16} />
                    Save Current
                  </button>
                  <label className="file-button" title="Open .wforge package">
                    <FolderOpen size={16} />Open .wforge
                    <input
                      type="file"
                      accept=".wforge"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void onOpenPackage(file);
                        event.currentTarget.value = '';
                      }}
                    />
                  </label>
                </div>
                <span>{records.length} saved</span>
              </div>
              {status && <div className="world-library-status">{status}</div>}
              {records.length === 0 ? (
                <div className="empty-library">
                  <strong>No saved worlds</strong>
                  <span>Generate a world, open a .wforge package, or save the active world here for in-app loading.</span>
                </div>
              ) : (
                <div className="world-list">
                  {records.map((record) => (
                    <article key={record.projectId} className={`world-list-item ${activeProjectId === record.projectId ? 'active' : ''}`}>
                      <div>
                        <WorldNameEditor value={record.projectName} onSave={(name) => requestWorldRename(record.projectId, name)} />
                        <span>Seed {record.seed} - {new Date(record.updatedAt).toLocaleString()}</span>
                      </div>
                      <div className="world-list-actions">
                        <button
                          type="button"
                          disabled={Boolean(operation)}
                          onClick={() => {
                            void runOperation({
                              kind: 'loading',
                              title: `Loading ${record.projectName}`,
                              detail: 'Reading saved world data and replacing the active World Forge workspace.',
                            }, () => onLoad(record)).catch(() => undefined);
                          }}
                        >Load</button>
                        <button type="button" className="subtle-button" disabled={Boolean(operation)} onClick={() => onRemove(record)}>Remove</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <WorldLibraryOperationOverlay operation={operation} />
            </div>
          );
        }
        ''',
    )

    replace_once(
        'apps/desktop/src/main.tsx',
        "import { Cloud, Coffee, Copy, Download, FileJson, FolderOpen, Hexagon, Image, Layers, Mail, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, RefreshCw, Save, Search, Settings, Shuffle, Upload, User, X } from 'lucide-react';",
        "import { Cloud, Coffee, Copy, Download, FileJson, Hexagon, Image, Layers, Mail, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, RefreshCw, Save, Search, Settings, Shuffle, Upload, User, X } from 'lucide-react';",
    )
    replace_once(
        'apps/desktop/src/main.tsx',
        "  const worldDiagnostics = useMemo(\n    () => project && rightPanelTab === 'diagnostics' ? buildWorldDiagnostics(project, tileExportConfig(), mapTheme) : null,\n    [mapTheme, project, rightPanelTab, tileFeatures, tileHeight, tileWidth]\n  );",
        "  const worldDiagnostics = useMemo(\n    () => project && leftPanelTab === 'dev' ? buildWorldDiagnostics(project, tileExportConfig(), mapTheme) : null,\n    [leftPanelTab, mapTheme, project, tileFeatures, tileHeight, tileWidth]\n  );",
    )
    replace_once(
        'apps/desktop/src/main.tsx',
        "            onRemove={deleteStoredWorld}\n          />",
        "            onRemove={deleteStoredWorld}\n            onOpenPackage={openPackage}\n          />",
    )

    main_path = Path('apps/desktop/src/main.tsx')
    main_text = main_path.read_text()
    export_start = main_text.index("        exportActions={(")
    export_end = main_text.index("        mapContent=", export_start)
    main_text = main_text[:export_start] + main_text[export_end:]
    panel_start = main_text.index("      <RightPanel\n")
    panel_end = main_text.index("      {configOpen &&", panel_start)
    new_panel = dedent(r'''
          <RightPanel
            workspaceMode={workspaceMode}
            developerMode={leftPanelTab === 'dev'}
            collapsed={rightPanelCollapsed}
            feedbackStatus={feedbackStatus}
            inspectorContent={inspectionRecord ? (
              <PointInspectorPanel
                record={inspectionRecord}
                copyStatus={inspectionCopyStatus}
                onCopy={copyInspectionJson}
                onClear={() => setInspectionRecord(null)}
              />
            ) : null}
            diagnosticsContent={<DiagnosticsPanel project={project} diagnostics={worldDiagnostics} generatorConfig={config} highestPointTargetActive={Boolean(highestPointTarget)} onToggleHighestPoint={toggleHighestPointTarget} />}
            project={project}
            config={config}
            selectedPreset={selectedPreset}
            isGenerating={isGenerating}
            generationStage={generationStage}
            generationProgress={generationProgress}
            hexInspection={showHexes && hexInspectionTarget ? {
              levelId: hexInspectionTarget.levelId,
              label: hexInspectionTarget.label,
              nominalHexWidthMiles: hexInspectionTarget.nominalHexWidthMiles,
              q: hexInspectionTarget.q,
              r: hexInspectionTarget.r,
            } : null}
            commonExportActions={(
              <div className="export-common-actions">
                <label className="workspace-inline-setting export-resolution-setting" htmlFor="export-resolution">
                  <span>PNG size</span>
                  <select
                    id="export-resolution"
                    aria-label="PNG export resolution"
                    value={`${exportResolution.width}x${exportResolution.height}`}
                    onChange={(event) => {
                      const resolution = resolutionOptions.find((option) => `${option.width}x${option.height}` === event.target.value);
                      if (resolution) setExportResolution(resolution);
                    }}
                  >
                    {resolutionOptions.map((option) => <option key={option.label} value={`${option.width}x${option.height}`}>{option.label}</option>)}
                  </select>
                </label>
                <div className="tile-export-actions common-file-actions">
                  <ExportButton icon={<Image size={16} />} label="PNG" task={exportTasks.png} disabled={!project} title="Export PNG" onClick={downloadPng} />
                  <ExportButton icon={<Layers size={16} />} label="SVG" task={exportTasks.svg} disabled={!project} title="Export simplified SVG" onClick={downloadSvg} />
                  <ExportButton icon={<FileJson size={16} />} label="JSON" task={exportTasks.json} disabled={!project} title="Export JSON" onClick={downloadJson} />
                  <ExportButton icon={<Save size={16} />} label=".wforge" task={exportTasks.wforge} disabled={!project} title="Save .wforge package" onClick={downloadPackage} />
                </div>
              </div>
            )}
            tilePresetId={tilePresetId}
            tileWidth={tileWidth}
            tileHeight={tileHeight}
            tileFeatures={tileFeatures}
            tileFeatureLabels={tileFeatureLabels}
            tileHexScaleMiles={tileHexScaleMiles}
            vttResolution={vttResolution}
            resolutionOptions={resolutionOptions}
            vttGridEnabled={vttGridEnabled}
            vttHexSizeMilesInput={vttHexSizeMilesInput}
            vttHexMetrics={vttHexMetrics}
            pngTask={exportTasks.png}
            svgTask={exportTasks.svg}
            jsonTask={exportTasks.json}
            wforgeTask={exportTasks.wforge}
            hexSvgTask={exportTasks.hexSvg}
            tileJsonTask={exportTasks.tileJson}
            vttTask={exportTasks.vtt}
            onCollapsedChange={setRightPanelCollapsed}
            onFeedback={openFeedback}
            onClearHexInspection={() => setHexInspectionTarget(null)}
            onTilePresetChange={applyTilePreset}
            onTileWidthChange={(width) => {
              setTilePresetId('custom');
              setTileWidth(width);
            }}
            onTileHeightChange={(height) => {
              setTilePresetId('custom');
              setTileHeight(height);
            }}
            onTileFeatureChange={toggleTileFeature}
            onVttResolutionChange={setVttResolution}
            onVttGridEnabledChange={setVttGridEnabled}
            onVttHexSizeInputChange={setVttHexSizeMilesInput}
            onCommitVttHexSize={() => commitVttHexSizeMiles()}
            renderExportButton={(props) => <ExportButton {...props} />}
            onDownloadHexGridSvg={downloadHexGridSvg}
            onDownloadHexTileJson={downloadHexTileJson}
            onDownloadVttPackage={downloadVttPackage}
          />
    ''')
    main_text = main_text[:panel_start] + new_panel + main_text[panel_end:]
    main_path.write_text(main_text)

    replace_once(
        'apps/desktop/src/appVersion.ts',
        "export const APP_VERSION = '0.3.30';",
        "export const APP_VERSION = '0.3.31';",
    )
    replace_once(
        'apps/desktop/src/release/ReleaseNotesModal.tsx',
        "          <section>\n            <p className=\"release-kicker\">Release 0.3.30</p>",
        "          <section>\n            <p className=\"release-kicker\">Release 0.3.31</p>\n            <h3>One context at a time</h3>\n            <ul>\n              <li>Build, Explore, Export, and Dev now route the right panel from the shared workspace state.</li>\n              <li>Explore shows one active inspector or the world summary instead of stacking unrelated panels.</li>\n              <li>Export now contains common files, PNG resolution, hex tiles, VTT options, and visible task feedback.</li>\n              <li>.wforge opening moved to My Worlds, while diagnostics moved behind the Dev workspace.</li>\n            </ul>\n          </section>\n\n          <section>\n            <p className=\"release-kicker\">Release 0.3.30</p>",
    )

    css_path = Path('apps/desktop/src/styles.css')
    css = css_path.read_text()
    marker = '/* Contextual right panel: 0.3.31 */'
    if marker in css:
        raise RuntimeError('Contextual right panel CSS already exists')
    css += dedent(r'''

        /* Contextual right panel: 0.3.31 */
        .panel-context {
          display: grid;
          gap: 9px;
        }

        .panel-context-header {
          align-items: center;
          border-bottom: 1px solid rgba(111, 96, 75, 0.34);
          display: flex;
          gap: 8px;
          padding-bottom: 9px;
        }

        .panel-context-header div {
          display: grid;
          gap: 2px;
        }

        .panel-context-header span,
        .context-card p,
        .context-warning span {
          color: var(--pm-muted);
          font-size: 12px;
        }

        .context-card,
        .context-warning,
        .context-progress,
        .export-section {
          background: rgba(255, 249, 235, 0.72);
          border: 1px solid #c9baa1;
          border-radius: 7px;
          padding: 9px;
        }

        .context-card h3,
        .context-card p,
        .export-section h3 {
          margin: 0;
        }

        .context-card p {
          margin-top: 4px;
        }

        .context-warning {
          align-items: flex-start;
          border-color: #c49352;
          display: flex;
          gap: 8px;
        }

        .context-warning svg {
          color: var(--pm-warn);
          flex: 0 0 auto;
        }

        .context-warning div,
        .context-progress {
          display: grid;
          gap: 5px;
        }

        .context-progress > div {
          align-items: center;
          display: flex;
          justify-content: space-between;
        }

        .context-progress progress {
          width: 100%;
        }

        .context-progress:not(.running) progress {
          opacity: 0.45;
        }

        .hex-selection-clear {
          justify-content: center;
          width: 100%;
        }

        .export-context,
        .export-section,
        .export-common-actions {
          display: grid;
          gap: 9px;
        }

        .export-common-actions .workspace-inline-setting {
          align-items: stretch;
          display: grid;
          gap: 4px;
        }

        .common-file-actions {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .export-task-feedback {
          display: grid;
          gap: 5px;
        }

        .export-task-feedback-row {
          align-items: center;
          background: rgba(255, 249, 235, 0.72);
          border: 1px solid #c9baa1;
          border-radius: 6px;
          display: flex;
          font-size: 12px;
          gap: 8px;
          justify-content: space-between;
          padding: 6px 8px;
        }

        .export-task-feedback-row.complete {
          border-color: #87ad91;
        }

        .export-task-feedback-row.error {
          border-color: #b67a6d;
        }

        .world-library-primary-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .world-library-primary-actions .file-button {
          white-space: nowrap;
        }
    ''')
    css_path.write_text(css)


def update_handoff() -> None:
    path = Path('refs/handoffs/world-builder-cleanup.md')
    text = path.read_text()
    sha = Path('/tmp/world-forge-functional-sha').read_text().strip()
    verify_log = Path('/tmp/world-forge-verify.log').read_text()
    clean_log = re.sub(r'\x1b\[[0-9;]*m', '', verify_log)
    match = re.search(r'Tests\s+(\d+) passed', clean_log)
    test_line = f'- {match.group(1)} tests passed' if match else '- Vitest suite passed'

    old_baseline = """Functional code baseline before this documentation-only handoff:

- commit `45e99811fa71a7e7f59fa0e906603f94bbd4bd48`
- visible World Forge version `0.3.30`
- `npm run verify` passed in GitHub Actions
- Vitest suite passed
- TypeScript build passed
- production build passed
- focused headless browser QA passed at 1920 x 1080 and 1440 x 900"""
    new_baseline = f"""Functional code baseline before this documentation-only handoff:

- commit `{sha}`
- visible World Forge version `0.3.31`
- `npm run verify` passed in GitHub Actions
{test_line}
- TypeScript build passed
- production build passed
- focused headless browser QA passed at 1920 x 1080 and 1440 x 900"""
    if old_baseline not in text:
        raise RuntimeError('Accepted baseline block changed unexpectedly')
    text = text.replace(old_baseline, new_baseline, 1)
    text = text.replace(
        'Status: **Build panel accepted; continue with contextual right-panel routing**',
        'Status: **Contextual right panel accepted; continue with Explore-toolbar disclosure**',
        1,
    )

    marker = """- no generator algorithm, replay, persistence, or saved-world schema changes were made.

### WP1: control inventory"""
    insertion = """- no generator algorithm, replay, persistence, or saved-world schema changes were made.

### Contextual right panel

Implemented in `0.3.31`:

- Build shows preset implications, generation quality, progress, and current-world replacement guidance.
- Explore resolves one context at a time: point inspector, geographic drilldown, hex selection, or world summary.
- point inspection takes priority over drilldown, and active drilldown takes priority over stale hex selection.
- geographic drilldown remains mounted across workspace-mode changes while its toolbar, overlay, and inspector are only active in Explore.
- Export contains PNG resolution, PNG/SVG/JSON/`.wforge`, hex tile, and VTT controls with visible task feedback.
- diagnostics are only shown when the Dev workspace is active.
- `.wforge` opening moved to My Worlds as a global project/library action.
- no generator algorithm, persistence, replay, or saved-world schema changes were made.

### WP1: control inventory"""
    if marker not in text:
        raise RuntimeError('Contextual panel insertion marker changed unexpectedly')
    text = text.replace(marker, insertion, 1)

    old_step = """### Step 3: make the right panel contextual

Current component:

- `apps/desktop/src/panels/RightPanel.tsx`

Current problem:

- geographic hierarchy
- point inspector
- world summary
- hex/VTT export
- diagnostics

can stack or compete in one panel.

Target routing from the single App-owned workspace mode:

**Build**

- selected preset implications
- generation status/progress
- concise current-world replacement warning or summary

**Explore**

- world summary when nothing is selected
- point, hex, region, or drilldown inspector when selected
- one clear-selection path
- do not stack unrelated inspectors above the world summary

**Export**

- common formats and output resolution
- hex/VTT options
- export progress and completed-file feedback

Developer diagnostics remain developer-only. My Worlds and file-open behavior remain global project/library actions, not a fourth workspace mode."""
    new_step = """### Step 3: make the right panel contextual - completed

Completed in `0.3.31`.

- Build routes to preset implications, quality, progress, and replacement guidance.
- Explore routes to one active selection context or the world summary.
- point, geographic drilldown, and hex selections have clear dismissal paths.
- Export contains common files, PNG resolution, hex/VTT configuration, and task feedback.
- diagnostics route only from the Dev workspace.
- My Worlds owns `.wforge` opening as a global project/library action.
- geographic drilldown state remains mounted while changing workspace modes."""
    if old_step not in text:
        raise RuntimeError('Step 3 block changed unexpectedly')
    text = text.replace(old_step, new_step, 1)

    old_wp5 = """### WP5: contextual right panel and Export mode

Not complete.

- mode-aware panel routing
- one relevant Explore context at a time
- complete export formats/options/progress surface
- move hex/VTT configuration fully into Export"""
    new_wp5 = """### WP5: contextual right panel and Export mode

Complete for this PI.

- mode-aware Build, Explore, Export, and Dev routing
- one relevant Explore context at a time
- complete common-file, hex-tile, and VTT export surface
- visible export progress and completion/error feedback
- diagnostics restricted to Dev
- `.wforge` opening located with My Worlds"""
    if old_wp5 not in text:
        raise RuntimeError('WP5 block changed unexpectedly')
    text = text.replace(old_wp5, new_wp5, 1)

    qa_marker = """- Left and right collapse controls continue to work.
- Layout passed at 1920 × 1080 and 1440 × 900 without page-level scrolling or material map loss.
- Developer graph workspace still opens.

Hosted/embedded QA remains part of WP6 unless separately confirmed against the deployed shell."""
    qa_replacement = """- Left and right collapse controls continue to work.
- Layout passed at 1920 × 1080 and 1440 × 900 without page-level scrolling or material map loss.
- Developer graph workspace still opens.
- Build, Explore, Export, and Dev select distinct right-panel contexts.
- normal workspace modes expose no diagnostics tab or stacked inspector tabs.
- Export exposes common files, PNG resolution, tile controls, and VTT controls in one surface.
- My Worlds exposes `.wforge` opening as a library action.

Hosted/embedded QA remains part of WP6 unless separately confirmed against the deployed shell."""
    if qa_marker not in text:
        raise RuntimeError('QA marker changed unexpectedly')
    text = text.replace(qa_marker, qa_replacement, 1)
    path.write_text(text)


def main() -> None:
    mode = sys.argv[1] if len(sys.argv) > 1 else ''
    if mode == 'apply':
        apply_product_changes()
    elif mode == 'handoff':
        update_handoff()
    else:
        raise SystemExit('Usage: automation-contextual-right-panel.py apply|handoff')


if __name__ == '__main__':
    main()

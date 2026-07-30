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
  accountAvatarUrl?: string;
  accountLabel?: string;
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
    workspaceMode, developerMode, collapsed, feedbackStatus, accountAvatarUrl, accountLabel, inspectorContent, diagnosticsContent, project,
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
      <ShellStatusControls onFeedback={onFeedback} accountAvatarUrl={accountAvatarUrl} accountLabel={accountLabel} />
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

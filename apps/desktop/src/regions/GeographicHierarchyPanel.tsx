import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ChevronRight, LoaderCircle, MapPinned } from 'lucide-react';
import {
  cubedSphereCellForLonLat,
  type WorldProject,
} from '@world-forge/shared';
import type { GeographicHierarchyPartition, GeographicMacroArea } from '@world-forge/shared/geographicHierarchy';
import {
  buildGeographicHierarchyPreview,
  macroAreaAtTopologyCell,
  type GeographicHierarchyPreview,
} from './geographicHierarchyPreview';
import { geographicRegionPreviewProjectKey } from './geographicRegionPreview';
import { useGeographicAtlasController } from './useGeographicAtlasController';
import './geographicHierarchy.css';

const UNASSIGNED_INDEX = 0xffff;

export type GeographicHierarchyBuildStatus = 'idle' | 'building' | 'ready' | 'error';

type DrilldownController = ReturnType<typeof useGeographicAtlasController>;
type DrilldownContextMenu = { x: number; y: number; label: string };

export function GeographicHierarchyPanel({ project }: { project: WorldProject }) {
  const projectKey = geographicRegionPreviewProjectKey(project);
  const previewCacheRef = useRef(new Map<string, GeographicHierarchyPreview>());
  const partitionCacheRef = useRef(new Map<string, GeographicHierarchyPartition>());
  const [status, setStatus] = useState<GeographicHierarchyBuildStatus>('idle');
  const [preview, setPreview] = useState<GeographicHierarchyPreview | null>(null);
  const [error, setError] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [inspectorActive, setInspectorActive] = useState(false);
  const [toolbarTarget, setToolbarTarget] = useState<HTMLElement | null>(null);
  const [mapTarget, setMapTarget] = useState<HTMLElement | null>(null);
  const controller = useGeographicAtlasController(project, preview, partitionCacheRef.current);

  useEffect(() => {
    const cached = previewCacheRef.current.get(projectKey) ?? null;
    setPreview(cached);
    setStatus(cached ? 'ready' : 'idle');
    setError('');
    setEnabled(false);
    controller.reset();
  }, [projectKey]);

  useEffect(() => {
    const locateTargets = () => {
      const nextToolbar = document.querySelector<HTMLElement>('.map-actions .layer-toggles');
      const nextMap = document.querySelector<HTMLElement>('.map-canvas-frame');
      const diagnosticToggle = document.querySelector<HTMLButtonElement>('.diagnostic-toggle');
      setToolbarTarget((current) => current === nextToolbar ? current : nextToolbar);
      setMapTarget((current) => current === nextMap ? current : nextMap);
      setInspectorActive(diagnosticToggle?.getAttribute('aria-pressed') === 'true');
    };
    locateTargets();
    const observer = new MutationObserver(locateTargets);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['aria-pressed'],
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (inspectorActive && controller.current) controller.reset();
  }, [inspectorActive, controller.current?.id]);

  useEffect(() => {
    if (!mapTarget) return;
    mapTarget.classList.toggle('geographic-drilldown-enabled', enabled);
    mapTarget.classList.toggle('geographic-drilldown-active', Boolean(enabled && controller.current));
    return () => {
      mapTarget.classList.remove('geographic-drilldown-enabled');
      mapTarget.classList.remove('geographic-drilldown-active');
    };
  }, [controller.current, enabled, mapTarget]);

  const buildPreview = () => {
    if (preview || status === 'building') return;
    const cached = previewCacheRef.current.get(projectKey);
    if (cached) {
      setPreview(cached);
      setStatus('ready');
      return;
    }
    setStatus('building');
    setError('');
    window.setTimeout(() => {
      try {
        const next = buildGeographicHierarchyPreview(project);
        previewCacheRef.current.set(projectKey, next);
        setPreview(next);
        setStatus('ready');
      } catch (reason) {
        setStatus('error');
        setError(reason instanceof Error ? reason.message : 'Geographic drill-down failed to build.');
      }
    }, 30);
  };

  const toggleEnabled = () => {
    setEnabled((current) => {
      const next = !current;
      if (next) buildPreview();
      else controller.reset();
      return next;
    });
  };

  const selectedMacro = preview?.macroAreaSet.macroAreas.find((entry) => entry.id === controller.selectedMacroId) ?? null;
  const selectedChild = controller.partition?.children.find((entry) => entry.id === controller.selectedChildId) ?? null;
  const selectedLabel = controller.current ? selectedChild?.label : selectedMacro?.label;
  const canOpen = controller.current ? Boolean(selectedChild && controller.childLevel) : Boolean(selectedMacro);
  const openSelected = controller.current ? controller.openSelectedChild : controller.openSelectedMacro;

  return (
    <>
      {toolbarTarget && createPortal(
        <button
          type="button"
          className={`icon-button geographic-drilldown-toggle ${enabled ? 'active' : ''}`}
          aria-label={enabled ? 'Disable geographic drill-down' : 'Enable geographic drill-down'}
          aria-pressed={enabled}
          title={enabled ? 'Geographic drill-down enabled' : 'Enable geographic drill-down'}
          onClick={toggleEnabled}
        >
          {status === 'building' && enabled
            ? <LoaderCircle className="geographic-atlas-spinner" size={16} />
            : <MapPinned size={16} />}
        </button>,
        toolbarTarget,
      )}

      {enabled && mapTarget && createPortal(
        <GeographicDrilldownSurface
          project={project}
          preview={preview}
          status={status}
          error={error}
          inspectorActive={inspectorActive}
          mapTarget={mapTarget}
          controller={controller}
          onDisable={() => {
            controller.reset();
            setEnabled(false);
          }}
        />,
        mapTarget,
      )}

      <section className={`geographic-drilldown-inspector ${enabled ? 'active' : ''}`} aria-label="Geographic drill-down details">
        <header>
          <span><MapPinned size={15} /><strong>Drill-down</strong></span>
          <small>{enabled ? (controller.current?.level ?? 'world') : 'off'}</small>
        </header>
        {!enabled && <p>Enable drill-down from the map toolbar to select geographic areas directly on the world map.</p>}
        {enabled && inspectorActive && <p>Point diagnostics are active. Drill-down remains visible at world level while clicks go to the world inspector.</p>}
        {enabled && status === 'building' && <p>Building continent and ocean boundaries.</p>}
        {enabled && status === 'error' && <p className="geographic-atlas-error" role="alert">{error}</p>}
        {enabled && status === 'ready' && preview && (
          <>
            <dl>
              <div><dt>Level</dt><dd>{controller.current?.level.replace('-', ' ') ?? 'world'}</dd></div>
              <div><dt>Area</dt><dd>{controller.current?.label ?? project.projectName}</dd></div>
              <div><dt>Selected</dt><dd>{selectedLabel ?? 'None'}</dd></div>
              <div><dt>Hex scale</dt><dd>{controller.current ? `${controller.current.scale.nominalHexWidthMiles.toLocaleString()} mi` : 'World overlay'}</dd></div>
              <div><dt>Viewport</dt><dd>{controller.current ? `${controller.current.extent.columns} x ${controller.current.extent.rows}` : 'Full world'}</dd></div>
              <div><dt>Child regions</dt><dd>{controller.buildingChildren ? 'Building' : controller.partition?.children.length ?? 0}</dd></div>
            </dl>
            <div className="geographic-drilldown-inspector-actions">
              {controller.current && <button type="button" className="secondary-button" onClick={controller.back}><ArrowLeft size={14} />Back</button>}
              <button type="button" className="primary-button" disabled={!canOpen || inspectorActive} onClick={openSelected}>Open selected</button>
            </div>
            <p className="geographic-drilldown-help">Left-click selects. Right-click opens an action menu. Double-click or Enter opens the selected area.</p>
            {controller.childError && <p className="geographic-atlas-error" role="alert">{controller.childError}</p>}
          </>
        )}
      </section>
    </>
  );
}

function GeographicDrilldownSurface({
  project,
  preview,
  status,
  error,
  inspectorActive,
  mapTarget,
  controller,
  onDisable,
}: {
  project: WorldProject;
  preview: GeographicHierarchyPreview | null;
  status: GeographicHierarchyBuildStatus;
  error: string;
  inspectorActive: boolean;
  mapTarget: HTMLElement;
  controller: DrilldownController;
  onDisable: () => void;
}) {
  const current = controller.current;
  const [contextMenu, setContextMenu] = useState<DrilldownContextMenu | null>(null);

  useEffect(() => setContextMenu(null), [current?.id]);

  useEffect(() => {
    if (!preview || status !== 'ready' || current || !controller.canvasRef.current) return;
    const draw = () => {
      const baseCanvas = mapTarget.querySelector<HTMLCanvasElement>(':scope > canvas:first-of-type');
      drawWorldMacroOverlay(
        controller.canvasRef.current!,
        baseCanvas,
        preview,
        controller.selectedMacroId,
      );
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(mapTarget);
    return () => observer.disconnect();
  }, [controller.canvasRef, controller.selectedMacroId, current, mapTarget, preview, status]);

  const macroAtEvent = (event: React.MouseEvent<HTMLCanvasElement>): GeographicMacroArea | null => {
    if (!preview) return null;
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const xRatio = (event.clientX - rect.left) / Math.max(1, rect.width);
    const yRatio = (event.clientY - rect.top) / Math.max(1, rect.height);
    const longitude = (xRatio * Math.PI * 2) - Math.PI;
    const latitude = (Math.PI / 2) - (yRatio * Math.PI);
    const cell = cubedSphereCellForLonLat(preview.regionPreview.topology, longitude, latitude);
    return macroAreaAtTopologyCell(preview, cell);
  };

  const selectWorldMacro = (event: React.MouseEvent<HTMLCanvasElement>): GeographicMacroArea | null => {
    const macroArea = macroAtEvent(event);
    if (macroArea) controller.setSelectedMacroId(macroArea.id);
    return macroArea;
  };

  const openWorldMacro = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const macroArea = selectWorldMacro(event);
    if (macroArea) controller.openMacro(macroArea);
  };

  const onClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    setContextMenu(null);
    if (current) controller.onCanvasClick(event);
    else selectWorldMacro(event);
  };

  const onContextMenu = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    let label: string | null = null;
    if (current) {
      const childId = controller.onCanvasContextMenu(event);
      label = controller.partition?.children.find((entry) => entry.id === childId)?.label ?? null;
    } else {
      label = selectWorldMacro(event)?.label ?? null;
    }
    if (!label) {
      setContextMenu(null);
      return;
    }
    setContextMenu({
      x: Math.max(8, Math.min(event.clientX - rect.left, rect.width - 190)),
      y: Math.max(44, Math.min(event.clientY - rect.top, rect.height - 88)),
      label,
    });
  };

  const onDoubleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    setContextMenu(null);
    if (current) controller.onCanvasDoubleClick(event);
    else openWorldMacro(event);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (contextMenu) {
        setContextMenu(null);
        return;
      }
      if (current) controller.back();
      else onDisable();
      return;
    }
    if (current) controller.onCanvasKeyDown(event);
    else if (event.key === 'Enter') controller.openSelectedMacro();
  };

  const openContextSelection = () => {
    if (current) controller.openSelectedChild();
    else controller.openSelectedMacro();
    setContextMenu(null);
  };

  return (
    <div className={`geographic-drilldown-surface ${current ? 'drilled' : 'world'} ${inspectorActive ? 'inspecting' : ''}`}>
      <div className="geographic-drilldown-bar" onPointerDown={(event) => { event.stopPropagation(); setContextMenu(null); }}>
        {current && <button type="button" className="icon-button" title="Back to parent" aria-label="Back to parent" onClick={controller.back}><ArrowLeft size={15} /></button>}
        <nav className="geographic-drilldown-breadcrumbs" aria-label="Geographic hierarchy">
          <button type="button" onClick={controller.reset}>World</button>
          {controller.navigation.map((entry, index) => (
            <React.Fragment key={`${entry.level}:${entry.id}`}>
              <ChevronRight size={12} />
              <button type="button" onClick={() => controller.navigateTo(index)}>{entry.label}</button>
            </React.Fragment>
          ))}
        </nav>
        {current && (
          <div className="geographic-drilldown-presentations" role="group" aria-label="Drill-down map presentation">
            <button type="button" className={controller.presentation === 'auto' ? 'active' : ''} onClick={() => controller.setPresentation('auto')}>Auto</button>
            <button type="button" className={controller.presentation === 'overlay' ? 'active' : ''} onClick={() => controller.setPresentation('overlay')}>Terrain + hex</button>
            <button type="button" className={controller.presentation === 'tiles' ? 'active' : ''} onClick={() => controller.setPresentation('tiles')}>Tiles</button>
          </div>
        )}
        {inspectorActive && <span className="geographic-drilldown-inspection-chip">Point inspector</span>}
        <label><input type="checkbox" checked={controller.showHexes} onChange={(event) => controller.setShowHexes(event.target.checked)} />Hexes</label>
        <button type="button" className="geographic-drilldown-exit" onClick={onDisable}>Exit</button>
      </div>
      {status === 'building' && <div className="geographic-drilldown-status"><LoaderCircle className="geographic-atlas-spinner" size={18} />Building geography</div>}
      {status === 'error' && <div className="geographic-drilldown-status geographic-atlas-error">{error}</div>}
      <canvas
        ref={controller.canvasRef}
        className="geographic-drilldown-canvas"
        aria-label={current ? `${current.label} drill-down map` : 'World geographic drill-down map'}
        aria-disabled={inspectorActive}
        tabIndex={inspectorActive ? -1 : 0}
        onClick={onClick}
        onContextMenu={onContextMenu}
        onDoubleClick={onDoubleClick}
        onKeyDown={onKeyDown}
      />
      {contextMenu && (
        <div
          className="geographic-drilldown-context-menu"
          role="menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button type="button" role="menuitem" onClick={openContextSelection}>Open {contextMenu.label}</button>
          <button type="button" role="menuitem" onClick={() => setContextMenu(null)}>Keep selected</button>
        </div>
      )}
    </div>
  );
}

function drawWorldMacroOverlay(
  canvas: HTMLCanvasElement,
  baseCanvas: HTMLCanvasElement | null,
  preview: GeographicHierarchyPreview,
  selectedMacroId: string | null,
): void {
  const width = Math.max(512, baseCanvas?.width ?? 1024);
  const height = Math.max(256, baseCanvas?.height ?? 512);
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, width, height);

  const rasterWidth = Math.min(1024, width);
  const rasterHeight = Math.max(1, Math.round(rasterWidth * height / width));
  const macroIndexes = new Uint16Array(rasterWidth * rasterHeight);
  macroIndexes.fill(UNASSIGNED_INDEX);
  const topology = preview.regionPreview.topology;
  const membership = preview.macroAreaSet.membership.macroAreaIndexByTopologyCell;
  const selectedIndex = preview.macroAreaSet.macroAreas.find((entry) => entry.id === selectedMacroId)?.index ?? -1;

  for (let y = 0; y < rasterHeight; y += 1) {
    const latitude = Math.PI / 2 - ((y + 0.5) / rasterHeight) * Math.PI;
    for (let x = 0; x < rasterWidth; x += 1) {
      const longitude = -Math.PI + ((x + 0.5) / rasterWidth) * Math.PI * 2;
      const cell = cubedSphereCellForLonLat(topology, longitude, latitude);
      macroIndexes[y * rasterWidth + x] = membership[cell] ?? UNASSIGNED_INDEX;
    }
  }

  const image = context.createImageData(rasterWidth, rasterHeight);
  for (let y = 0; y < rasterHeight; y += 1) {
    for (let x = 0; x < rasterWidth; x += 1) {
      const index = y * rasterWidth + x;
      const macroIndex = macroIndexes[index];
      const pixel = index * 4;
      if (macroIndex === selectedIndex) {
        image.data[pixel] = 240;
        image.data[pixel + 1] = 190;
        image.data[pixel + 2] = 88;
        image.data[pixel + 3] = 34;
      }
      const left = y * rasterWidth + ((x - 1 + rasterWidth) % rasterWidth);
      const right = y * rasterWidth + ((x + 1) % rasterWidth);
      const above = y > 0 ? index - rasterWidth : index;
      const below = y + 1 < rasterHeight ? index + rasterWidth : index;
      const boundary = macroIndex !== macroIndexes[left]
        || macroIndex !== macroIndexes[right]
        || macroIndex !== macroIndexes[above]
        || macroIndex !== macroIndexes[below];
      if (!boundary) continue;
      const selectedBoundary = macroIndex === selectedIndex
        || macroIndexes[left] === selectedIndex
        || macroIndexes[right] === selectedIndex
        || macroIndexes[above] === selectedIndex
        || macroIndexes[below] === selectedIndex;
      image.data[pixel] = selectedBoundary ? 255 : 238;
      image.data[pixel + 1] = selectedBoundary ? 221 : 232;
      image.data[pixel + 2] = selectedBoundary ? 139 : 211;
      image.data[pixel + 3] = selectedBoundary ? 245 : 220;
    }
  }

  const overlay = document.createElement('canvas');
  overlay.width = rasterWidth;
  overlay.height = rasterHeight;
  overlay.getContext('2d')?.putImageData(image, 0, 0);
  context.imageSmoothingEnabled = false;
  context.drawImage(overlay, 0, 0, width, height);
  drawMacroLabels(context, width, height, preview, selectedMacroId);
}

function drawMacroLabels(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  preview: GeographicHierarchyPreview,
  selectedMacroId: string | null,
): void {
  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `600 ${Math.max(11, Math.min(16, width / 90))}px Inter, system-ui, sans-serif`;
  for (const macroArea of preview.macroAreaSet.macroAreas) {
    const x = ((macroArea.labelPoint.longitude + 180) / 360) * width;
    const y = ((90 - macroArea.labelPoint.latitude) / 180) * height;
    context.lineWidth = macroArea.id === selectedMacroId ? 4 : 3;
    context.strokeStyle = 'rgba(9, 18, 22, 0.92)';
    context.strokeText(macroArea.label, x, y);
    context.fillStyle = macroArea.id === selectedMacroId ? '#ffe39b' : '#f6f1df';
    context.fillText(macroArea.label, x, y);
  }
  context.restore();
}

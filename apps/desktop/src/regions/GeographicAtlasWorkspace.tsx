import React, { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, LoaderCircle } from 'lucide-react';
import {
  cubedSphereCellForLonLat,
  type WorldProject,
} from '@world-forge/shared';
import type { GeographicMacroArea } from '@world-forge/shared/geographicHierarchy';
import {
  macroAreaAtTopologyCell,
  type GeographicHierarchyPreview,
} from './geographicHierarchyPreview';
import type { useGeographicAtlasController } from './useGeographicAtlasController';
import { GeographicAtlasContextMap } from './GeographicAtlasContextMap';
import { drawWorldMacroOverlay } from './geographicAtlasWorldOverlay';
import './geographicAtlasWorkspace.css';

export type GeographicHierarchyBuildStatus = 'idle' | 'building' | 'ready' | 'error';

type GeographicAtlasController = ReturnType<typeof useGeographicAtlasController>;
type DrilldownContextMenu = { x: number; y: number; label: string };

export function GeographicAtlasWorkspace({
  project,
  preview,
  status,
  error,
  inspectorActive,
  mapTarget,
  controller,
  onExit,
}: {
  project: WorldProject;
  preview: GeographicHierarchyPreview | null;
  status: GeographicHierarchyBuildStatus;
  error: string;
  inspectorActive: boolean;
  mapTarget: HTMLElement;
  controller: GeographicAtlasController;
  onExit: () => void;
}) {
  const current = controller.current;
  const [contextMenu, setContextMenu] = useState<DrilldownContextMenu | null>(null);

  useEffect(() => setContextMenu(null), [current?.id]);

  useEffect(() => {
    if (!inspectorActive) controller.canvasRef.current?.focus();
  }, [controller.canvasRef, current?.id, inspectorActive]);

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
      else onExit();
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

  const selectedMacro = preview?.macroAreaSet.macroAreas.find((entry) => entry.id === controller.selectedMacroId) ?? null;
  const selectedChildIndex = controller.partition?.children.findIndex((entry) => entry.id === controller.selectedChildId) ?? -1;
  const compactInspector = current
    ? {
        title: current.label,
        level: current.level.replace('-', ' '),
        detail: `${current.scale.nominalHexWidthMiles.toLocaleString()} mi hexes`,
        viewport: `${current.extent.columns} x ${current.extent.rows}`,
        children: controller.buildingChildren ? 'Building' : `${controller.partition?.children.length ?? 0}`,
      }
    : {
        title: project.projectName,
        level: 'world atlas',
        detail: selectedMacro?.label ?? 'Select a geographic area',
        viewport: 'Full world',
        children: `${preview?.macroAreaSet.macroAreas.length ?? 0}`,
      };

  return (
    <div className={`geographic-atlas-workspace geographic-drilldown-surface ${current ? 'drilled' : 'world'} ${inspectorActive ? 'inspecting' : ''}`}>
      <div className="geographic-drilldown-bar" onPointerDown={(event) => { event.stopPropagation(); setContextMenu(null); }}>
        {current && <button type="button" className="icon-button" title="Back to parent" aria-label="Back to parent" onClick={controller.back}><ArrowLeft size={15} /></button>}
        <nav className="geographic-drilldown-breadcrumbs" aria-label="Geographic hierarchy">
          <button type="button" onClick={onExit}>World map</button>
          <ChevronRight size={12} />
          <button type="button" onClick={controller.reset}>Atlas</button>
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
        <button type="button" className="geographic-drilldown-exit" onClick={onExit}>World map</button>
      </div>
      {status === 'building' && <div className="geographic-drilldown-status"><LoaderCircle className="geographic-atlas-spinner" size={18} />Building geography</div>}
      {status === 'error' && <div className="geographic-drilldown-status geographic-atlas-error">{error}</div>}
      {status === 'ready' && (
        <aside className="geographic-atlas-compact-inspector" aria-label="Geographic drill-down details">
          <strong>{compactInspector.title}</strong>
          <span>{compactInspector.level}</span>
          <dl>
            <div><dt>Scale</dt><dd>{compactInspector.detail}</dd></div>
            <div><dt>Window</dt><dd>{compactInspector.viewport}</dd></div>
            <div><dt>Children</dt><dd>{compactInspector.children}</dd></div>
          </dl>
        </aside>
      )}
      {current && preview && (
        <GeographicAtlasContextMap
          overviewCanvas={mapTarget.querySelector<HTMLCanvasElement>(':scope > canvas:first-of-type')}
          topology={preview.regionPreview.topology}
          parentMembership={current.membership}
          childMembership={controller.partition?.membership.childIndexByTopologyCell ?? null}
          selectedChildIndex={selectedChildIndex >= 0 ? selectedChildIndex : null}
          extent={current.extent}
          label={current.label}
        />
      )}
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

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, LoaderCircle } from 'lucide-react';
import {
  cubedSphereCellForLonLat,
  type WorldProject,
} from '@world-forge/shared';
import type {
  GeographicScene,
  GeographicSceneSemanticScale,
} from '@world-forge/shared/geographicScene';
import type { GeographicTileWindow } from '@world-forge/shared/geographicTileWindow';
import type { GeographicMacroArea } from '@world-forge/shared/geographicHierarchy';
import { generateGeographicTileWindow } from '@world-forge/generator-core/geographicTileWindow';
import { buildGeographicSceneFromTileWindow } from '@world-forge/generator-core/geographicSceneBuilder';
import {
  macroAreaAtTopologyCell,
  type GeographicHierarchyPreview,
} from './geographicHierarchyPreview';
import type { useGeographicAtlasController } from './useGeographicAtlasController';
import { GeographicAtlasContextMap } from './GeographicAtlasContextMap';
import type { GeographicSceneCameraFootprint } from './geographicSceneInteraction';
import {
  GeographicSceneViewer,
  type GeographicSceneInteractionKind,
  type GeographicScenePick,
  type GeographicScenePresentation,
} from './GeographicSceneViewer';
import { drawWorldMacroOverlay } from './geographicAtlasWorldOverlay';
import './geographicAtlasWorkspace.css';

export type GeographicHierarchyBuildStatus = 'idle' | 'building' | 'ready' | 'error';

type GeographicAtlasController = ReturnType<typeof useGeographicAtlasController>;
type DrilldownContextMenu = { x: number; y: number; label: string };
type PickedSceneTile = {
  id: string;
  label: string;
  longitude: number;
  latitude: number;
};
type GeographicSceneBuildState =
  | { status: 'idle'; scene: null; tileWindow: null; error: '' }
  | { status: 'ready'; scene: GeographicScene; tileWindow: GeographicTileWindow; error: '' }
  | { status: 'cancelled' | 'unsupported' | 'failed'; scene: null; tileWindow: null; error: string };

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
  const [sceneEnabled, setSceneEnabled] = useState(false);
  const [scenePresentation, setScenePresentation] =
    useState<GeographicScenePresentation>('natural');
  const [sceneCameraFootprint, setSceneCameraFootprint] =
    useState<GeographicSceneCameraFootprint | null>(null);
  const [pickedSceneTile, setPickedSceneTile] = useState<PickedSceneTile | null>(null);

  useEffect(() => setContextMenu(null), [current?.id]);
  useEffect(() => {
    setSceneCameraFootprint(null);
    setPickedSceneTile(null);
  }, [current?.id, sceneEnabled]);
  useEffect(() => {
    if (!current) setSceneEnabled(false);
  }, [current]);

  useEffect(() => {
    if (!inspectorActive && !sceneEnabled) controller.canvasRef.current?.focus();
  }, [controller.canvasRef, current?.id, inspectorActive, sceneEnabled]);

  useEffect(() => {
    if (!preview || status !== 'ready' || current || !controller.canvasRef.current) return;
    const baseCanvas = mapTarget.querySelector<HTMLCanvasElement>(':scope > canvas:first-of-type');
    const draw = () => {
      drawWorldMacroOverlay(
        controller.canvasRef.current!,
        baseCanvas,
        project,
        preview,
        controller.selectedMacroId,
      );
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(mapTarget);
    if (baseCanvas) observer.observe(baseCanvas);
    window.addEventListener('resize', draw);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', draw);
    };
  }, [controller.canvasRef, controller.selectedMacroId, current, mapTarget, preview, project, status]);

  const sceneBuild = useMemo<GeographicSceneBuildState>(() => {
    if (!sceneEnabled) return { status: 'idle', scene: null, tileWindow: null, error: '' };
    if (!preview || !current) {
      return {
        status: 'unsupported',
        scene: null,
        tileWindow: null,
        error: '3D terrain requires an open bounded geographic area.',
      };
    }

    try {
      const tileWindow = generateGeographicTileWindow({
        project,
        topology: preview.regionPreview.topology,
        scale: current.scale,
        extent: current.extent,
        parentMembership: current.membership,
        childMembership: controller.partition?.membership.childIndexByTopologyCell ?? null,
      });
      const scene = buildGeographicSceneFromTileWindow({
        tileWindow,
        hierarchyNodeId: current.id,
        hierarchyLevel: geographicSceneSemanticLevel(current.level),
        waterLevel: project.primaryWorld.seaLevel,
        replayVersion: `${tileWindow.classifierVersion}:${project.primaryWorld.topology.resolution}`,
      });
      return { status: 'ready', scene, tileWindow, error: '' };
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Geographic scene construction failed.';
      if (reason instanceof Error && reason.name === 'AbortError') {
        return { status: 'cancelled', scene: null, tileWindow: null, error: message };
      }
      return { status: 'failed', scene: null, tileWindow: null, error: message };
    }
  }, [controller.partition, current, preview, project, sceneEnabled]);

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

  const handleScenePick = (
    pick: GeographicScenePick,
    interaction: GeographicSceneInteractionKind,
    pointer: { clientX: number; clientY: number },
  ) => {
    if (sceneBuild.status !== 'ready') return;
    const tile = sceneBuild.tileWindow.tiles.find((candidate) => candidate.id === pick.sourceSampleId);
    if (!tile) return;
    const child = tile.membershipRole === 'parent' && tile.childIndex !== null
      ? controller.partition?.children[tile.childIndex] ?? null
      : null;
    setPickedSceneTile({
      id: tile.id,
      label: child?.label ?? tile.terrainType,
      longitude: tile.longitude,
      latitude: tile.latitude,
    });
    setContextMenu(null);
    if (child) controller.setSelectedChildId(child.id);
    if (interaction === 'open' && child) {
      controller.openChildById(child.id);
      return;
    }
    if (interaction === 'context' && child) {
      const rect = mapTarget.getBoundingClientRect();
      setContextMenu({
        x: Math.max(8, Math.min(pointer.clientX - rect.left, rect.width - 190)),
        y: Math.max(44, Math.min(pointer.clientY - rect.top, rect.height - 88)),
        label: child.label,
      });
    }
  };

  const selectedMacro = preview?.macroAreaSet.macroAreas.find((entry) => entry.id === controller.selectedMacroId) ?? null;
  const selectedChildIndex = controller.partition?.children.findIndex((entry) => entry.id === controller.selectedChildId) ?? -1;
  const naturalPresentationActive = controller.presentation !== 'terrain' && controller.presentation !== 'overlay';
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
    <div className={`geographic-atlas-workspace geographic-drilldown-surface ${current ? 'drilled' : 'world'} ${inspectorActive ? 'inspecting' : ''} ${sceneEnabled ? 'scene-enabled' : ''}`}>
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
          <>
            <button
              type="button"
              className={sceneEnabled ? 'active' : ''}
              aria-label={sceneEnabled ? 'Return to 2D map' : 'Open 3D terrain'}
              aria-pressed={sceneEnabled}
              title={sceneEnabled ? 'Return to the 2D tile map' : 'Open stepped 3D hex terrain'}
              onClick={() => setSceneEnabled((enabled) => !enabled)}
            >
              {sceneEnabled ? '2D map' : '3D terrain'}
            </button>
            <div className="geographic-drilldown-presentations" role="group" aria-label={sceneEnabled ? '3D terrain presentation' : '2D map presentation'}>
              {sceneEnabled ? (
                <>
                  <button type="button" className={scenePresentation === 'natural' ? 'active' : ''} onClick={() => setScenePresentation('natural')}>Natural</button>
                  <button type="button" className={scenePresentation === 'elevation' ? 'active' : ''} onClick={() => setScenePresentation('elevation')}>Elevation</button>
                </>
              ) : (
                <>
                  <button type="button" className={naturalPresentationActive ? 'active' : ''} onClick={() => controller.setPresentation('natural')}>Natural</button>
                  <button type="button" className={controller.presentation === 'terrain' ? 'active' : ''} onClick={() => controller.setPresentation('terrain')}>Terrain</button>
                </>
              )}
            </div>
          </>
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
            {sceneEnabled && sceneBuild.status === 'ready' && (
              <div><dt>Terrain</dt><dd>{sceneBuild.tileWindow.tiles.length} hex tiles</dd></div>
            )}
            {sceneEnabled && pickedSceneTile && (
              <div><dt>Pick</dt><dd title={`${pickedSceneTile.id} · ${pickedSceneTile.latitude.toFixed(3)}, ${pickedSceneTile.longitude.toFixed(3)}`}>{pickedSceneTile.label}</dd></div>
            )}
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
          cameraFootprint={sceneEnabled ? sceneCameraFootprint : null}
          label={current.label}
        />
      )}
      <canvas
        ref={controller.canvasRef}
        className="geographic-drilldown-canvas"
        aria-label={current ? `${current.label} drill-down map` : 'World geographic drill-down map'}
        aria-disabled={inspectorActive || sceneEnabled}
        aria-hidden={sceneEnabled}
        tabIndex={inspectorActive || sceneEnabled ? -1 : 0}
        onClick={onClick}
        onContextMenu={onContextMenu}
        onDoubleClick={onDoubleClick}
        onKeyDown={onKeyDown}
      />
      {sceneEnabled && (
        <div className="geographic-scene-layer">
          {sceneBuild.status === 'ready' ? (
            <GeographicSceneViewer
              scene={sceneBuild.scene}
              tileWindow={sceneBuild.tileWindow}
              presentation={scenePresentation}
              showHexes={controller.showHexes}
              selectedChildIndex={selectedChildIndex >= 0 ? selectedChildIndex : null}
              selectedSourceSampleId={pickedSceneTile?.id ?? null}
              onPick={handleScenePick}
              onCameraFootprintChange={setSceneCameraFootprint}
            />
          ) : (
            <div className={`geographic-scene-status ${sceneBuild.status}`}>
              <strong>3D terrain unavailable</strong>
              <span>{sceneBuild.error || 'No scene was produced.'}</span>
            </div>
          )}
        </div>
      )}
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

function geographicSceneSemanticLevel(
  level: 'macro-area' | 'region' | 'subregion' | 'local' | 'detail',
): GeographicSceneSemanticScale {
  return level === 'macro-area' ? 'macro' : level;
}

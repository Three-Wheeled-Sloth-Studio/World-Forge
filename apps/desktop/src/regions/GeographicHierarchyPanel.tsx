import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, LoaderCircle, MapPinned } from 'lucide-react';
import type { WorldProject } from '@world-forge/shared';
import type { GeographicHierarchyPartition } from '@world-forge/shared/geographicHierarchy';
import {
  buildGeographicHierarchyPreview,
  type GeographicHierarchyPreview,
} from './geographicHierarchyPreview';
import { geographicRegionPreviewProjectKey } from './geographicRegionPreview';
import { useGeographicAtlasController } from './useGeographicAtlasController';
import {
  GeographicAtlasWorkspace,
  type GeographicHierarchyBuildStatus,
} from './GeographicAtlasWorkspace';
import './geographicHierarchy.css';

export type { GeographicHierarchyBuildStatus } from './GeographicAtlasWorkspace';

type GeographicHierarchyPanelProps = {
  project: WorldProject;
  workspaceActive: boolean;
  showInspector: boolean;
  onContextActiveChange?: (active: boolean) => void;
};

export function GeographicHierarchyPanel({ project, workspaceActive, showInspector, onContextActiveChange }: GeographicHierarchyPanelProps) {
  const projectKey = geographicRegionPreviewProjectKey(project);
  const previewCacheRef = useRef(new Map<string, GeographicHierarchyPreview>());
  const toggleRef = useRef<HTMLButtonElement>(null);
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
    onContextActiveChange?.(workspaceActive && enabled);
  }, [enabled, onContextActiveChange, workspaceActive]);

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
    const active = workspaceActive && enabled;
    mapTarget.classList.toggle('geographic-drilldown-enabled', active);
    mapTarget.classList.toggle('geographic-drilldown-active', Boolean(active && controller.current));
    return () => {
      mapTarget.classList.remove('geographic-drilldown-enabled');
      mapTarget.classList.remove('geographic-drilldown-active');
    };
  }, [controller.current, enabled, mapTarget, workspaceActive]);

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
      {workspaceActive && toolbarTarget && createPortal(
        <button
          ref={toggleRef}
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

      {workspaceActive && enabled && mapTarget && createPortal(
        <GeographicAtlasWorkspace
          project={project}
          preview={preview}
          status={status}
          error={error}
          inspectorActive={inspectorActive}
          mapTarget={mapTarget}
          controller={controller}
          onExit={() => {
            controller.reset();
            setEnabled(false);
            window.requestAnimationFrame(() => toggleRef.current?.focus());
          }}
        />,
        mapTarget,
      )}

      {workspaceActive && showInspector && enabled && <section className="geographic-drilldown-inspector active" aria-label="Geographic drill-down details">
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
              <button type="button" className="secondary-button" disabled={!selectedLabel && !controller.current} onClick={controller.reset}>Clear selection</button>
              <button type="button" className="primary-button" disabled={!canOpen || inspectorActive} onClick={openSelected}>Open selected</button>
            </div>
            <p className="geographic-drilldown-help">Left-click selects. Right-click opens an action menu. Double-click or Enter opens the selected area.</p>
            {controller.childError && <p className="geographic-atlas-error" role="alert">{controller.childError}</p>}
          </>
        )}
      </section>}
    </>
  );
}

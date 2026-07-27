import React from 'react';
import { ArrowLeft, ChevronRight, LoaderCircle, X } from 'lucide-react';
import type { WorldProject } from '@world-forge/shared';
import type { GeographicHierarchyPartition } from '@world-forge/shared/geographicHierarchy';
import type { GeographicHierarchyBuildStatus } from './GeographicHierarchyPanel';
import type { GeographicHierarchyPreview } from './geographicHierarchyPreview';
import { useGeographicAtlasController } from './useGeographicAtlasController';
import {
  MacroAreaChooser,
  MapContract,
  RegionSelection,
  SubregionSelection,
} from './GeographicAtlasCards';

export function GeographicAtlasModal({
  project,
  preview,
  status,
  error,
  partitionCache,
  onClose,
}: {
  project: WorldProject;
  preview: GeographicHierarchyPreview | null;
  status: GeographicHierarchyBuildStatus;
  error: string;
  partitionCache: Map<string, GeographicHierarchyPartition>;
  onClose: () => void;
}) {
  const controller = useGeographicAtlasController(project, preview, partitionCache);
  const current = controller.current;

  return (
    <div className="geographic-atlas-backdrop" role="dialog" aria-modal="true" aria-label="Geographic atlas">
      <div className="geographic-atlas-modal">
        <header className="geographic-atlas-header">
          <div>
            <span className="geographic-atlas-eyebrow">Diagnostic hierarchy prototype</span>
            <h2>{current ? current.label : project.projectName}</h2>
            <div className="geographic-atlas-breadcrumbs">
              <button type="button" onClick={controller.reset}>World</button>
              {controller.navigation.map((entry, index) => (
                <React.Fragment key={`${entry.level}:${entry.id}`}>
                  <ChevronRight size={13} />
                  <button type="button" onClick={() => controller.navigateTo(index)}>{entry.label}</button>
                </React.Fragment>
              ))}
            </div>
          </div>
          <button type="button" className="icon-button" title="Close geographic atlas" aria-label="Close geographic atlas" onClick={onClose}><X size={18} /></button>
        </header>

        {status === 'building' && (
          <div className="geographic-atlas-loading">
            <LoaderCircle className="geographic-atlas-spinner" size={28} />
            <p>Building macro areas and adaptive scale contracts.</p>
          </div>
        )}
        {status === 'error' && <div className="geographic-atlas-loading"><p className="geographic-atlas-error">{error}</p></div>}
        {status === 'ready' && preview && !current && (
          <MacroAreaChooser macroAreas={preview.macroAreaSet.macroAreas} onOpen={controller.openMacro} />
        )}
        {status === 'ready' && preview && current && (
          <div className="geographic-atlas-workspace">
            <div className="geographic-atlas-map-column">
              <div className="geographic-atlas-toolbar">
                <button type="button" className="secondary-button" onClick={controller.back}><ArrowLeft size={15} />Back to parent</button>
                <div className="geographic-atlas-segmented" role="group" aria-label="Map presentation">
                  <button type="button" className={controller.presentation === 'natural' ? 'active' : ''} onClick={() => controller.setPresentation('natural')}>Natural</button>
                  <button type="button" className={controller.presentation === 'terrain' ? 'active' : ''} onClick={() => controller.setPresentation('terrain')}>Terrain</button>
                </div>
                <label><input type="checkbox" checked={controller.showHexes} onChange={(event) => controller.setShowHexes(event.target.checked)} />Hexes</label>
              </div>
              <div className="geographic-atlas-canvas-frame">
                <canvas ref={controller.canvasRef} onClick={controller.onCanvasClick} />
              </div>
            </div>
            <aside className="geographic-atlas-inspector">
              <MapContract current={current} />
              {current.level === 'macro-area' && (
                <RegionSelection
                  regions={controller.macroRegions}
                  selectedRegionId={controller.selectedRegionId}
                  onSelect={controller.setSelectedRegionId}
                  onOpen={controller.openSelectedRegion}
                />
              )}
              {current.level === 'region' && (
                <>
                  <SubregionSelection
                    partition={controller.partition}
                    selectedChildId={controller.selectedChildId}
                    building={controller.buildingChildren}
                    onShow={controller.showSubregions}
                    onSelect={controller.setSelectedChildId}
                    onOpen={controller.openSelectedSubregion}
                  />
                  {controller.childError && <p className="geographic-atlas-error" role="alert">{controller.childError}</p>}
                </>
              )}
              {current.level === 'subregion' && (
                <div className="geographic-atlas-card">
                  <h3>Subregion proof</h3>
                  <p>This view retains world-relative hex coordinates and a seam-aware context rectangle. Local and detail children remain deferred.</p>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

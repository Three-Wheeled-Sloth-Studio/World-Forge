import React from 'react';
import { LoaderCircle, MapPinned, Mountain, Shapes, Waves } from 'lucide-react';
import type {
  GeographicHierarchyPartition,
  GeographicMacroArea,
} from '@world-forge/shared/geographicHierarchy';
import type { GeographicWorldRegionV2 } from '@world-forge/shared/geographicRegions';
import type { GeographicHierarchyOpenMap } from './geographicHierarchyPreview';

export function MacroAreaChooser({
  macroAreas,
  onOpen,
}: {
  macroAreas: GeographicMacroArea[];
  onOpen: (macroArea: GeographicMacroArea) => void;
}) {
  const continents = macroAreas.filter((area) => area.kind !== 'ocean-basin');
  const oceanBasins = macroAreas.filter((area) => area.kind === 'ocean-basin');
  return (
    <div className="geographic-atlas-chooser">
      <div className="geographic-atlas-intro">
        <Shapes size={28} />
        <div><h3>Choose a macro area</h3><p>Continents and archipelagos are stable geographic parents. Ocean basins are available as a provisional first pass.</p></div>
      </div>
      <MacroAreaGroup title="Continents and archipelagos" icon={<Mountain size={18} />} areas={continents} onOpen={onOpen} />
      <MacroAreaGroup title="Ocean basins" icon={<Waves size={18} />} areas={oceanBasins} onOpen={onOpen} />
    </div>
  );
}

function MacroAreaGroup({
  title,
  icon,
  areas,
  onOpen,
}: {
  title: string;
  icon: React.ReactNode;
  areas: GeographicMacroArea[];
  onOpen: (macroArea: GeographicMacroArea) => void;
}) {
  return (
    <section className="geographic-atlas-area-group">
      <h3>{icon}{title}</h3>
      <div className="geographic-atlas-area-grid">
        {areas.map((area) => (
          <button type="button" key={area.id} onClick={() => onOpen(area)}>
            <strong>{area.label}</strong>
            <span>{area.childRegionIds.length} regions</span>
            <span>{percent(area.landAreaShare)} land / {percent(area.waterAreaShare)} water</span>
            {area.provisional && <em>Provisional basin</em>}
          </button>
        ))}
      </div>
    </section>
  );
}

export function MapContract({ current }: { current: GeographicHierarchyOpenMap }) {
  return (
    <div className="geographic-atlas-card">
      <h3>Map contract</h3>
      <dl>
        <div><dt>Level</dt><dd>{current.level.replace('-', ' ')}</dd></div>
        <div><dt>Hex scale</dt><dd>{formatMiles(current.scale.nominalHexWidthMiles)}</dd></div>
        <div><dt>Viewport</dt><dd>{current.extent.columns} × {current.extent.rows}</dd></div>
        <div><dt>Exact parent hexes</dt><dd>{current.scale.exactParentHexCount}</dd></div>
        <div><dt>Context hexes</dt><dd>{current.scale.contextualHexCount}</dd></div>
        <div><dt>World grid</dt><dd>{current.scale.worldColumns} × {current.scale.worldRows}</dd></div>
        <div><dt>Seam</dt><dd>{current.extent.wrapsLongitude ? 'Wrapped' : 'No wrap'}</dd></div>
        <div><dt>Maximum fit</dt><dd>{current.extent.selectedMembershipFitsMaximum ? 'Yes' : 'Exceeded'}</dd></div>
      </dl>
    </div>
  );
}

export function RegionSelection({
  regions,
  selectedRegionId,
  onSelect,
  onOpen,
}: {
  regions: GeographicWorldRegionV2[];
  selectedRegionId: string | null;
  onSelect: (id: string) => void;
  onOpen: () => void;
}) {
  const selected = regions.find((region) => region.id === selectedRegionId) ?? null;
  return (
    <div className="geographic-atlas-card">
      <h3>Regions</h3>
      <p>Click a numbered region on the map or select it here.</p>
      <select value={selectedRegionId ?? ''} onChange={(event) => onSelect(event.target.value)}>
        <option value="">Select region</option>
        {regions.map((region) => <option key={region.id} value={region.id}>{region.label}</option>)}
      </select>
      {selected && <NodeSummary label={selected.label} classification={selected.classification} land={selected.landAreaShare} water={selected.waterAreaShare} cells={selected.topologyCellCount} />}
      <button type="button" className="primary-button" disabled={!selected} onClick={onOpen}><MapPinned size={15} />Open region</button>
    </div>
  );
}

export function SubregionSelection({
  partition,
  selectedChildId,
  building,
  onShow,
  onSelect,
  onOpen,
}: {
  partition: GeographicHierarchyPartition | null;
  selectedChildId: string | null;
  building: boolean;
  onShow: () => void;
  onSelect: (id: string) => void;
  onOpen: () => void;
}) {
  const selected = partition?.children.find((child) => child.id === selectedChildId) ?? null;
  return (
    <div className="geographic-atlas-card">
      <h3>Subregions</h3>
      {!partition ? (
        <button type="button" className="primary-button" disabled={building} onClick={onShow}>
          {building ? <LoaderCircle className="geographic-atlas-spinner" size={15} /> : <Shapes size={15} />}
          {building ? 'Generating subregions' : 'Show subregions'}
        </button>
      ) : (
        <>
          <p>{partition.children.length} deterministic children at {formatMiles(partition.scale.nominalHexWidthMiles)}.</p>
          <select value={selectedChildId ?? ''} onChange={(event) => onSelect(event.target.value)}>
            <option value="">Select subregion</option>
            {partition.children.map((child) => <option key={child.id} value={child.id}>{child.label}</option>)}
          </select>
          {selected && <NodeSummary label={selected.label} classification={selected.classification} land={selected.landAreaShare} water={selected.waterAreaShare} cells={selected.topologyCellCount} />}
          <button type="button" className="primary-button" disabled={!selected} onClick={onOpen}><MapPinned size={15} />Open subregion</button>
        </>
      )}
    </div>
  );
}

function NodeSummary({
  label,
  classification,
  land,
  water,
  cells,
}: {
  label: string;
  classification: string;
  land: number;
  water: number;
  cells: number;
}) {
  return (
    <dl className="geographic-atlas-node-summary">
      <div><dt>Name</dt><dd>{label}</dd></div>
      <div><dt>Type</dt><dd>{classification}</dd></div>
      <div><dt>Land / water</dt><dd>{percent(land)} / {percent(water)}</dd></div>
      <div><dt>Topology cells</dt><dd>{cells}</dd></div>
    </dl>
  );
}

function formatMiles(value: number): string {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} mi hexes`;
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

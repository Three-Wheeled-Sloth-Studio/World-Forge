import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import type { WorldProject } from '@world-forge/shared';
import type { GeographicHierarchyPartition, GeographicMacroArea } from '@world-forge/shared/geographicHierarchy';
import type { GeographicWorldRegionV2 } from '@world-forge/shared/geographicRegions';
import { generateGeographicTileWindow } from '@world-forge/generator-core/geographicTileWindow';
import {
  buildHierarchyChildren,
  hierarchyCacheKey,
  nextHierarchyLevel,
  openHierarchyChildMap,
  openMacroAreaMap,
  openRegionMap,
  regionsForMacroArea,
  type GeographicHierarchyOpenMap,
  type GeographicHierarchyPreview,
} from './geographicHierarchyPreview';
import {
  topologyCellAtWindowPoint,
  type GeographicWindowTransform,
} from './geographicWindowedMap';
import {
  renderGeographicTileWindowToCanvas,
  type GeographicTileWindowPresentation,
} from './geographicTileWindowMap';

type MapPresentation = GeographicTileWindowPresentation;

export function useGeographicAtlasController(
  project: WorldProject,
  preview: GeographicHierarchyPreview | null,
  partitionCache: Map<string, GeographicHierarchyPartition>,
) {
  const [navigation, setNavigation] = useState<GeographicHierarchyOpenMap[]>([]);
  const [partition, setPartition] = useState<GeographicHierarchyPartition | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [presentation, setPresentation] = useState<MapPresentation>('natural');
  const [showHexes, setShowHexes] = useState(true);
  const [buildingChildren, setBuildingChildren] = useState(false);
  const [childError, setChildError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transformRef = useRef<GeographicWindowTransform | null>(null);
  const current = navigation[navigation.length - 1] ?? null;
  const childLevel = current ? nextHierarchyLevel(current.level) : null;

  useEffect(() => {
    setChildError('');
    setBuildingChildren(false);
    if (!current || !childLevel) {
      setPartition(null);
      setSelectedChildId(null);
      return;
    }
    const cacheKey = hierarchyCacheKey(project, current.id, childLevel, current.scale.id);
    const cached = partitionCache.get(cacheKey) ?? null;
    setPartition(cached);
    if (!cached?.children.some((entry) => entry.id === selectedChildId)) setSelectedChildId(null);
  }, [childLevel, current?.id, current?.level, current?.scale.id, partitionCache, project]);

  const macroRegions = useMemo(() => {
    if (!preview || current?.level !== 'macro-area') return [];
    return regionsForMacroArea(preview, current.id);
  }, [current, preview]);

  useEffect(() => {
    if (!preview || !current || !canvasRef.current) return;
    const childMembership = current.level === 'macro-area'
      ? filteredMacroRegionMembership(preview, current, macroRegions)
      : partition?.membership.childIndexByTopologyCell ?? null;
    const selectedChildIndex = current.level === 'macro-area'
      ? preview.regionPreview.regionSet.regions.findIndex((region) => region.id === selectedRegionId)
      : partition?.children.findIndex((entry) => entry.id === selectedChildId) ?? -1;
    const tileWindow = generateGeographicTileWindow({
      project,
      topology: preview.regionPreview.topology,
      scale: current.scale,
      extent: current.extent,
      parentMembership: current.membership,
      childMembership,
    });
    const transform = renderGeographicTileWindowToCanvas(
      canvasRef.current,
      tileWindow,
      {
        presentation,
        showHexes,
        selectedChildIndex: selectedChildIndex >= 0 ? selectedChildIndex : null,
      },
    );
    transformRef.current = transform;
    drawLabels(
      canvasRef.current,
      transform,
      current.level === 'macro-area'
        ? macroRegions.map((region) => ({ id: region.id, label: region.label, point: region.labelPoint }))
        : partition?.children.map((entry) => ({ id: entry.id, label: entry.label, point: entry.labelPoint })) ?? [],
      current.level === 'macro-area' ? selectedRegionId : selectedChildId,
    );
  }, [current, macroRegions, partition, presentation, preview, project, selectedChildId, selectedRegionId, showHexes]);

  const openMacro = (macroArea: GeographicMacroArea) => {
    if (!preview) return;
    const regions = regionsForMacroArea(preview, macroArea.id);
    if (!regions.some((region) => region.id === selectedRegionId)) setSelectedRegionId(null);
    setSelectedChildId(null);
    setNavigation([openMacroAreaMap(project, preview, macroArea.id)]);
  };

  const openSelectedRegion = () => {
    if (!preview || !selectedRegionId) return;
    setSelectedChildId(null);
    setNavigation((entries) => [...entries, openRegionMap(project, preview, selectedRegionId)]);
  };

  const showChildren = () => {
    if (!preview || !current || !childLevel) return;
    const cacheKey = hierarchyCacheKey(project, current.id, childLevel, current.scale.id);
    const cached = partitionCache.get(cacheKey);
    if (cached) {
      setPartition(cached);
      return;
    }
    setBuildingChildren(true);
    setChildError('');
    window.setTimeout(() => {
      try {
        const next = buildHierarchyChildren(project, preview, current);
        partitionCache.set(cacheKey, next);
        setPartition(next);
        if (!next.children.some((entry) => entry.id === selectedChildId)) setSelectedChildId(null);
      } catch (reason) {
        setChildError(reason instanceof Error ? reason.message : `${childLevel} generation failed.`);
      } finally {
        setBuildingChildren(false);
      }
    }, 30);
  };

  const openSelectedChild = () => {
    if (!preview || !partition || !selectedChildId) return;
    setSelectedChildId(null);
    setNavigation((entries) => [...entries, openHierarchyChildMap(project, preview, partition, selectedChildId)]);
  };

  const back = () => {
    setSelectedChildId(null);
    setNavigation((entries) => entries.slice(0, -1));
  };
  const reset = () => {
    setSelectedRegionId(null);
    setSelectedChildId(null);
    setNavigation([]);
  };
  const navigateTo = (index: number) => {
    setSelectedChildId(null);
    setNavigation((entries) => entries.slice(0, index + 1));
  };

  const onCanvasClick = (event: MouseEvent<HTMLCanvasElement>) => {
    if (!preview || !current || !transformRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvasRef.current.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvasRef.current.height;
    const cell = topologyCellAtWindowPoint(preview.regionPreview.topology, transformRef.current, x, y);
    if (current.membership[cell] !== 1) return;
    if (current.level === 'macro-area') {
      const regionIndex = preview.regionPreview.regionSet.membership.regionIndexByTopologyCell[cell];
      const region = preview.regionPreview.regionSet.regions[regionIndex];
      if (region && macroRegions.some((candidate) => candidate.id === region.id)) setSelectedRegionId(region.id);
    } else if (partition) {
      const childIndex = partition.membership.childIndexByTopologyCell[cell];
      const entry = partition.children[childIndex];
      if (entry) setSelectedChildId(entry.id);
    }
  };

  return {
    navigation,
    current,
    childLevel,
    partition,
    macroRegions,
    selectedRegionId,
    selectedChildId,
    presentation,
    showHexes,
    buildingChildren,
    childError,
    canvasRef,
    setSelectedRegionId,
    setSelectedChildId,
    setPresentation,
    setShowHexes,
    openMacro,
    openSelectedRegion,
    showChildren,
    openSelectedChild,
    back,
    reset,
    navigateTo,
    onCanvasClick,
  };
}

function filteredMacroRegionMembership(
  preview: GeographicHierarchyPreview,
  current: GeographicHierarchyOpenMap,
  regions: GeographicWorldRegionV2[],
): Uint16Array {
  const allowed = new Set(regions.map((region) => region.index));
  const source = preview.regionPreview.regionSet.membership.regionIndexByTopologyCell;
  const filtered = new Uint16Array(source.length);
  filtered.fill(0xffff);
  for (let cell = 0; cell < source.length; cell += 1) {
    if (current.membership[cell] === 1 && allowed.has(source[cell])) filtered[cell] = source[cell];
  }
  return filtered;
}

function drawLabels(
  canvas: HTMLCanvasElement,
  transform: GeographicWindowTransform,
  labels: Array<{ id: string; label: string; point: { latitude: number; longitude: number } }>,
  selectedId: string | null,
): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '600 12px Inter, system-ui, sans-serif';
  for (const entry of labels) {
    const point = transform.geoToCanvasPoint(entry.point.latitude, entry.point.longitude);
    if (point.x < -30 || point.x > canvas.width + 30 || point.y < -20 || point.y > canvas.height + 20) continue;
    const text = entry.label.replace(/^(Region|Subregion|Local|Detail)\s+/i, '');
    context.lineWidth = entry.id === selectedId ? 4 : 3;
    context.strokeStyle = 'rgba(8, 12, 18, 0.9)';
    context.strokeText(text, point.x, point.y);
    context.fillStyle = entry.id === selectedId ? '#fff4c7' : '#fffdf3';
    context.fillText(text, point.x, point.y);
  }
  context.restore();
}

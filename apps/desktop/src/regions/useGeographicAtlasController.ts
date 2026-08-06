import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import type { CubedSphereTopology, WorldProject } from '@world-forge/shared';
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
  renderGeographicWindowToCanvas,
  topologyCellAtWindowPoint,
  type GeographicWindowTransform,
} from './geographicWindowedMap';
import {
  renderGeographicTileWindowToCanvas,
  type GeographicTileWindowCanvasTransform,
  type GeographicTileWindowPresentation,
} from './geographicTileWindowMap';
import { drawGeographicChildBoundaryOverlay } from './geographicDrilldownBoundaryOverlay';

export type GeographicDrilldownPresentation = 'auto' | 'overlay' | 'tiles' | 'natural' | 'terrain';

export function childIdAtGeographicCanvasPoint({
  topology,
  transform,
  parentMembership,
  partition,
  x,
  y,
}: {
  topology: CubedSphereTopology;
  transform: GeographicWindowTransform;
  parentMembership: Uint8Array;
  partition: GeographicHierarchyPartition;
  x: number;
  y: number;
}): string | null {
  const tileTransform = transform as GeographicWindowTransform & Partial<GeographicTileWindowCanvasTransform>;
  if (typeof tileTransform.tileAtCanvasPoint === 'function') {
    const tile = tileTransform.tileAtCanvasPoint(x, y);
    if (!tile || tile.membershipRole !== 'parent' || tile.childIndex === null) return null;
    return partition.children[tile.childIndex]?.id ?? null;
  }

  const cell = topologyCellAtWindowPoint(topology, transform, x, y);
  if (parentMembership[cell] !== 1) return null;
  const childIndex = partition.membership.childIndexByTopologyCell[cell];
  return partition.children[childIndex]?.id ?? null;
}

export function useGeographicAtlasController(
  project: WorldProject,
  preview: GeographicHierarchyPreview | null,
  partitionCache: Map<string, GeographicHierarchyPartition>,
) {
  const [navigation, setNavigation] = useState<GeographicHierarchyOpenMap[]>([]);
  const [partition, setPartition] = useState<GeographicHierarchyPartition | null>(null);
  const [selectedMacroId, setSelectedMacroId] = useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [presentation, setPresentation] = useState<GeographicDrilldownPresentation>('auto');
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
    if (!preview || !current || !childLevel) {
      setPartition(null);
      setSelectedChildId(null);
      return;
    }

    const cacheKey = hierarchyCacheKey(project, current.id, childLevel, current.scale.id);
    const cached = partitionCache.get(cacheKey) ?? null;
    if (cached) {
      setPartition(cached);
      setSelectedChildId((selected) => cached.children.some((entry) => entry.id === selected) ? selected : null);
      return;
    }

    let cancelled = false;
    setPartition(null);
    setBuildingChildren(true);
    const timer = window.setTimeout(() => {
      try {
        const next = buildHierarchyChildren(project, preview, current);
        if (cancelled) return;
        partitionCache.set(cacheKey, next);
        setPartition(next);
        setSelectedChildId(null);
      } catch (reason) {
        if (!cancelled) setChildError(reason instanceof Error ? reason.message : `${childLevel} generation failed.`);
      } finally {
        if (!cancelled) setBuildingChildren(false);
      }
    }, 20);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [childLevel, current?.id, current?.level, current?.scale.id, partitionCache, preview, project]);

  const macroRegions = useMemo(() => {
    if (!preview || current?.level !== 'macro-area') return [];
    return regionsForMacroArea(preview, current.id);
  }, [current, preview]);

  useEffect(() => {
    if (!preview || !current || !canvasRef.current) return;
    const childMembership = partition?.membership.childIndexByTopologyCell ?? null;
    const selectedChildIndex = partition?.children.findIndex((entry) => entry.id === selectedChildId) ?? -1;
    const resolvedPresentation = resolvePresentation(presentation, current.level);
    let transform: GeographicWindowTransform;

    if (resolvedPresentation.mode === 'overlay') {
      transform = renderGeographicWindowToCanvas(
        canvasRef.current,
        project,
        preview.regionPreview.topology,
        current.scale,
        current.extent,
        {
          mapMode: 'biomes',
          renderMode: 'natural',
          rivers: true,
          showHexes,
          parentMembership: current.membership,
          childMembership: null,
          selectedChildIndex: null,
        },
      );
    } else {
      const tileWindow = generateGeographicTileWindow({
        project,
        topology: preview.regionPreview.topology,
        scale: current.scale,
        extent: current.extent,
        parentMembership: current.membership,
        childMembership,
      });
      transform = renderGeographicTileWindowToCanvas(
        canvasRef.current,
        tileWindow,
        {
          presentation: resolvedPresentation.tilePresentation,
          showHexes,
          selectedChildIndex: selectedChildIndex >= 0 ? selectedChildIndex : null,
        },
      );
    }

    transformRef.current = transform;
    if (resolvedPresentation.mode === 'overlay') {
      drawGeographicChildBoundaryOverlay(
        canvasRef.current,
        preview.regionPreview.topology,
        transform,
        current.membership,
        childMembership,
        selectedChildIndex >= 0 ? selectedChildIndex : null,
      );
    }
    drawLabels(
      canvasRef.current,
      transform,
      partition?.children.map((entry) => ({ id: entry.id, label: entry.label, point: entry.labelPoint })) ?? [],
      selectedChildId,
    );
  }, [current, partition, presentation, preview, project, selectedChildId, showHexes]);

  const openMacro = (macroArea: GeographicMacroArea) => {
    if (!preview) return;
    setSelectedMacroId(macroArea.id);
    setSelectedRegionId(null);
    setSelectedChildId(null);
    setNavigation([openMacroAreaMap(project, preview, macroArea.id)]);
  };

  const openMacroById = (macroAreaId: string) => {
    const macroArea = preview?.macroAreaSet.macroAreas.find((entry) => entry.id === macroAreaId);
    if (macroArea) openMacro(macroArea);
  };

  const openSelectedMacro = () => {
    if (selectedMacroId) openMacroById(selectedMacroId);
  };

  const openSelectedRegion = () => {
    if (!preview || !selectedRegionId) return;
    setSelectedChildId(null);
    setNavigation((entries) => [...entries, openRegionMap(project, preview, selectedRegionId)]);
  };

  const showChildren = () => {
    if (!preview || !current || !childLevel || partition || buildingChildren) return;
    const cacheKey = hierarchyCacheKey(project, current.id, childLevel, current.scale.id);
    const cached = partitionCache.get(cacheKey);
    if (cached) setPartition(cached);
  };

  const openChildById = (childId: string) => {
    if (!preview || !partition) return;
    const nextMap = openHierarchyChildMap(project, preview, partition, childId);
    setSelectedChildId(null);
    setNavigation((entries) => [...entries, nextMap]);
  };

  const openSelectedChild = () => {
    if (selectedChildId) openChildById(selectedChildId);
  };

  const back = () => {
    setSelectedChildId(null);
    setNavigation((entries) => entries.slice(0, -1));
  };

  const reset = () => {
    setSelectedMacroId(null);
    setSelectedChildId(null);
    setSelectedRegionId(null);
    setNavigation([]);
  };

  const navigateTo = (index: number) => {
    setSelectedChildId(null);
    setNavigation((entries) => entries.slice(0, index + 1));
  };

  const childIdAtCanvasEvent = (event: MouseEvent<HTMLCanvasElement>): string | null => {
    if (!preview || !current || !partition || !transformRef.current || !canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * canvasRef.current.width;
    const y = ((event.clientY - rect.top) / Math.max(1, rect.height)) * canvasRef.current.height;
    return childIdAtGeographicCanvasPoint({
      topology: preview.regionPreview.topology,
      transform: transformRef.current,
      parentMembership: current.membership,
      partition,
      x,
      y,
    });
  };

  const onCanvasClick = (event: MouseEvent<HTMLCanvasElement>): string | null => {
    const childId = childIdAtCanvasEvent(event);
    if (childId) setSelectedChildId(childId);
    return childId;
  };

  const onCanvasContextMenu = (event: MouseEvent<HTMLCanvasElement>): string | null => {
    event.preventDefault();
    return onCanvasClick(event);
  };

  const onCanvasDoubleClick = (event: MouseEvent<HTMLCanvasElement>) => {
    const childId = childIdAtCanvasEvent(event);
    if (!childId) return;
    setSelectedChildId(childId);
    openChildById(childId);
  };

  const onCanvasKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === 'Enter' && selectedChildId) {
      event.preventDefault();
      openChildById(selectedChildId);
    }
  };

  return {
    navigation,
    current,
    childLevel,
    partition,
    macroRegions,
    selectedMacroId,
    selectedRegionId,
    selectedChildId,
    presentation,
    showHexes,
    buildingChildren,
    childError,
    canvasRef,
    setSelectedMacroId,
    setSelectedRegionId,
    setSelectedChildId,
    setPresentation,
    setShowHexes,
    openMacro,
    openMacroById,
    openSelectedMacro,
    openSelectedRegion,
    showChildren,
    openChildById,
    openSelectedChild,
    back,
    reset,
    navigateTo,
    onCanvasClick,
    onCanvasContextMenu,
    onCanvasDoubleClick,
    onCanvasKeyDown,
  };
}

function resolvePresentation(
  presentation: GeographicDrilldownPresentation,
  level: GeographicHierarchyOpenMap['level'],
): { mode: 'overlay'; tilePresentation: GeographicTileWindowPresentation } | { mode: 'tiles'; tilePresentation: GeographicTileWindowPresentation } {
  if (presentation === 'overlay') return { mode: 'overlay', tilePresentation: 'natural' };
  if (presentation === 'terrain') return { mode: 'tiles', tilePresentation: 'terrain' };
  if (presentation === 'natural' || presentation === 'tiles') return { mode: 'tiles', tilePresentation: 'natural' };
  return level === 'local' || level === 'detail'
    ? { mode: 'tiles', tilePresentation: 'natural' }
    : { mode: 'overlay', tilePresentation: 'natural' };
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

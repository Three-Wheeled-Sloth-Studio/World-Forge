import { useEffect, useState } from 'react';
import type { WorldProject } from '@world-forge/shared';
import type { GeographicHierarchyPartition } from '@world-forge/shared/geographicHierarchy';
import { generateGeographicTileWindow } from '@world-forge/generator-core/geographicTileWindow';
import { useGeographicAtlasController as useBaseGeographicAtlasController } from './useGeographicAtlasControllerBase';
import type { GeographicHierarchyPreview } from './geographicHierarchyPreview';
import {
  renderGeographicTileWindowToCanvas,
  type GeographicTileWindowCanvasTransform,
} from './geographicTileWindowMap';
import {
  shouldDrawTtrpgHierarchyLabel,
  subscribeTtrpgMapIconSprite,
} from './ttrpgMapSymbols';

export {
  childIdAtGeographicCanvasPoint,
  resolveGeographicDrilldownPresentation,
  type GeographicDrilldownPresentation,
  type ResolvedGeographicDrilldownPresentation,
} from './useGeographicAtlasControllerBase';

export function useGeographicAtlasController(
  project: WorldProject,
  preview: GeographicHierarchyPreview | null,
  partitionCache: Map<string, GeographicHierarchyPartition>,
) {
  const controller = useBaseGeographicAtlasController(project, preview, partitionCache);
  const [assetRevision, setAssetRevision] = useState(0);

  useEffect(() => {
    if (controller.presentation !== 'ttrpg') return undefined;
    return subscribeTtrpgMapIconSprite(() => setAssetRevision((revision) => revision + 1));
  }, [controller.presentation]);

  useEffect(() => {
    if (
      controller.presentation !== 'ttrpg'
      || !preview
      || !controller.current
      || !controller.canvasRef.current
    ) return undefined;

    // The base controller also paints labels in a passive effect. Redraw on the next
    // frame so the TTRPG pass is definitively last: it clears generated numeric labels,
    // then adds only meaningful cartographic names and any loaded terrain symbols.
    const frame = window.requestAnimationFrame(() => {
      if (!controller.canvasRef.current || !controller.current) return;
      const childMembership = controller.partition?.membership.childIndexByTopologyCell ?? null;
      const selectedChildIndex = controller.partition?.children.findIndex(
        (entry) => entry.id === controller.selectedChildId,
      ) ?? -1;
      const tileWindow = generateGeographicTileWindow({
        project,
        topology: preview.regionPreview.topology,
        scale: controller.current.scale,
        extent: controller.current.extent,
        parentMembership: controller.current.membership,
        childMembership,
      });
      const transform = renderGeographicTileWindowToCanvas(
        controller.canvasRef.current,
        tileWindow,
        {
          presentation: 'ttrpg',
          showHexes: controller.showHexes,
          selectedChildIndex: selectedChildIndex >= 0 ? selectedChildIndex : null,
        },
      );
      drawMeaningfulTtrpgLabels(
        controller.canvasRef.current,
        transform,
        controller.partition?.children.map((entry) => ({
          id: entry.id,
          label: entry.label,
          point: entry.labelPoint,
        })) ?? [],
        controller.selectedChildId,
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    assetRevision,
    controller.current,
    controller.partition,
    controller.presentation,
    controller.selectedChildId,
    controller.showHexes,
    preview,
    project,
  ]);

  return controller;
}

function drawMeaningfulTtrpgLabels(
  canvas: HTMLCanvasElement,
  transform: GeographicTileWindowCanvasTransform,
  labels: Array<{ id: string; label: string; point: { latitude: number; longitude: number } }>,
  selectedId: string | null,
): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '600 13px Georgia, "Times New Roman", serif';
  for (const entry of labels) {
    if (!shouldDrawTtrpgHierarchyLabel(entry.label)) continue;
    const point = transform.geoToCanvasPoint(entry.point.latitude, entry.point.longitude);
    if (point.x < -30 || point.x > canvas.width + 30 || point.y < -20 || point.y > canvas.height + 20) continue;
    context.lineWidth = entry.id === selectedId ? 4 : 3;
    context.strokeStyle = 'rgba(224, 208, 171, 0.92)';
    context.strokeText(entry.label, point.x, point.y);
    context.fillStyle = entry.id === selectedId ? '#7b451f' : '#493927';
    context.fillText(entry.label, point.x, point.y);
  }
  context.restore();
}

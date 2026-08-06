import { cubedSphereCellForLonLat } from '@world-forge/shared';
import type { GeographicHierarchyPreview } from './geographicHierarchyPreview';

const UNASSIGNED_INDEX = 0xffff;

export function drawWorldMacroOverlay(
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

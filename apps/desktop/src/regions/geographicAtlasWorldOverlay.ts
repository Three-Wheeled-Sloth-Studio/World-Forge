import type { WorldProject } from '@world-forge/shared';
import { equirectangularTopologyLookup } from '@world-forge/generator-core/equirectangularTopologyLookup';
import type { GeographicHierarchyPreview } from './geographicHierarchyPreview';

const UNASSIGNED_INDEX = 0xffff;

export function drawWorldMacroOverlay(
  canvas: HTMLCanvasElement,
  baseCanvas: HTMLCanvasElement | null,
  project: WorldProject,
  preview: GeographicHierarchyPreview,
  selectedMacroId: string | null,
): void {
  const width = Math.max(1, baseCanvas?.width ?? project.primaryWorld.mapModel.resolution.width);
  const height = Math.max(1, baseCanvas?.height ?? project.primaryWorld.mapModel.resolution.height);
  alignWorldMacroOverlayCanvas(canvas, baseCanvas);
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, width, height);

  const topology = preview.regionPreview.topology;
  const topologyByPixel = equirectangularTopologyLookup(topology, width, height);
  const membership = preview.macroAreaSet.membership.macroAreaIndexByTopologyCell;
  const water = project.primaryWorld.topologyLayers.water;
  const macroIndexes = new Uint16Array(width * height);
  macroIndexes.fill(UNASSIGNED_INDEX);
  const selectedIndex = preview.macroAreaSet.macroAreas.find((entry) => entry.id === selectedMacroId)?.index ?? -1;

  for (let index = 0; index < topologyByPixel.length; index += 1) {
    macroIndexes[index] = membership[topologyByPixel[index]] ?? UNASSIGNED_INDEX;
  }

  const image = context.createImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const topologyCell = topologyByPixel[index];
      const macroIndex = macroIndexes[index];
      const pixel = index * 4;

      if (water[topologyCell] !== 1) {
        image.data[pixel] = 173;
        image.data[pixel + 1] = 153;
        image.data[pixel + 2] = 91;
        image.data[pixel + 3] = 26;
      }
      if (macroIndex === selectedIndex) {
        image.data[pixel] = 240;
        image.data[pixel + 1] = 190;
        image.data[pixel + 2] = 88;
        image.data[pixel + 3] = 42;
      }

      const left = y * width + ((x - 1 + width) % width);
      const right = y * width + ((x + 1) % width);
      const above = y > 0 ? index - width : index;
      const below = y + 1 < height ? index + width : index;
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

  context.putImageData(image, 0, 0);
  drawMacroLabels(context, width, height, preview, selectedMacroId);
}

export function alignWorldMacroOverlayCanvas(
  canvas: HTMLCanvasElement,
  baseCanvas: HTMLCanvasElement | null,
): void {
  if (!baseCanvas || !canvas.parentElement) {
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    return;
  }
  const baseRect = baseCanvas.getBoundingClientRect();
  const hostRect = canvas.parentElement.getBoundingClientRect();
  canvas.style.inset = 'auto';
  canvas.style.left = `${baseRect.left - hostRect.left}px`;
  canvas.style.top = `${baseRect.top - hostRect.top}px`;
  canvas.style.width = `${baseRect.width}px`;
  canvas.style.height = `${baseRect.height}px`;
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

import React, { useEffect, useRef } from 'react';
import {
  cubedSphereCellForLonLat,
  type CubedSphereTopology,
} from '@world-forge/shared';
import type { GeographicRegionBounds } from '@world-forge/shared/geographicRegions';
import { geographicAtlasContextRects } from './geographicAtlasContextGeometry';
import type { GeographicSceneCameraFootprint } from './geographicSceneInteraction';

const CONTEXT_WIDTH = 320;
const CONTEXT_HEIGHT = 160;
const UNASSIGNED_INDEX = 0xffff;
const DEGREES_TO_RADIANS = Math.PI / 180;

type GeographicAtlasContextMapProps = {
  overviewCanvas: HTMLCanvasElement | null;
  topology: CubedSphereTopology;
  parentMembership: Uint8Array;
  childMembership: Uint16Array | null;
  selectedChildIndex: number | null;
  extent: GeographicRegionBounds;
  cameraFootprint?: GeographicSceneCameraFootprint | null;
  label: string;
};

export function GeographicAtlasContextMap({
  overviewCanvas,
  topology,
  parentMembership,
  childMembership,
  selectedChildIndex,
  extent,
  cameraFootprint = null,
  label,
}: GeographicAtlasContextMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawContextMap(
      canvas,
      overviewCanvas,
      topology,
      parentMembership,
      childMembership,
      selectedChildIndex,
      extent,
      cameraFootprint,
    );
  }, [
    cameraFootprint,
    childMembership,
    extent.maxLatitude,
    extent.maxLongitude,
    extent.minLatitude,
    extent.minLongitude,
    extent.wrapsLongitude,
    overviewCanvas,
    parentMembership,
    selectedChildIndex,
    topology,
  ]);

  return (
    <figure className="geographic-atlas-context-map" aria-label={`${label} world context map`}>
      <canvas ref={canvasRef} width={CONTEXT_WIDTH} height={CONTEXT_HEIGHT} />
      <figcaption>
        <strong>{label}</strong>
        <span>{cameraFootprint ? 'Camera context' : 'World context'}</span>
      </figcaption>
    </figure>
  );
}

function drawContextMap(
  canvas: HTMLCanvasElement,
  overviewCanvas: HTMLCanvasElement | null,
  topology: CubedSphereTopology,
  parentMembership: Uint8Array,
  childMembership: Uint16Array | null,
  selectedChildIndex: number | null,
  extent: GeographicRegionBounds,
  cameraFootprint: GeographicSceneCameraFootprint | null,
): void {
  canvas.width = CONTEXT_WIDTH;
  canvas.height = CONTEXT_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) return;

  context.clearRect(0, 0, CONTEXT_WIDTH, CONTEXT_HEIGHT);
  context.fillStyle = '#0b151b';
  context.fillRect(0, 0, CONTEXT_WIDTH, CONTEXT_HEIGHT);
  if (overviewCanvas && overviewCanvas.width > 0 && overviewCanvas.height > 0) {
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(overviewCanvas, 0, 0, CONTEXT_WIDTH, CONTEXT_HEIGHT);
  }
  context.fillStyle = 'rgba(4, 10, 14, 0.2)';
  context.fillRect(0, 0, CONTEXT_WIDTH, CONTEXT_HEIGHT);

  const parentRaster = new Uint8Array(CONTEXT_WIDTH * CONTEXT_HEIGHT);
  const childRaster = new Uint16Array(CONTEXT_WIDTH * CONTEXT_HEIGHT);
  childRaster.fill(UNASSIGNED_INDEX);
  for (let y = 0; y < CONTEXT_HEIGHT; y += 1) {
    const latitude = 90 - ((y + 0.5) / CONTEXT_HEIGHT) * 180;
    for (let x = 0; x < CONTEXT_WIDTH; x += 1) {
      const longitude = -180 + ((x + 0.5) / CONTEXT_WIDTH) * 360;
      const cell = cubedSphereCellForLonLat(
        topology,
        longitude * DEGREES_TO_RADIANS,
        latitude * DEGREES_TO_RADIANS,
      );
      const index = y * CONTEXT_WIDTH + x;
      parentRaster[index] = parentMembership[cell] === 1 ? 1 : 0;
      childRaster[index] = childMembership?.[cell] ?? UNASSIGNED_INDEX;
    }
  }

  const image = context.createImageData(CONTEXT_WIDTH, CONTEXT_HEIGHT);
  for (let y = 0; y < CONTEXT_HEIGHT; y += 1) {
    for (let x = 0; x < CONTEXT_WIDTH; x += 1) {
      const index = y * CONTEXT_WIDTH + x;
      const pixel = index * 4;
      const inside = parentRaster[index] === 1;
      const childIndex = childRaster[index];
      const selectedChild = selectedChildIndex !== null && childIndex === selectedChildIndex;
      if (inside) {
        image.data[pixel] = selectedChild ? 255 : 236;
        image.data[pixel + 1] = selectedChild ? 224 : 192;
        image.data[pixel + 2] = selectedChild ? 142 : 92;
        image.data[pixel + 3] = selectedChild ? 118 : 62;
      } else {
        image.data[pixel] = 5;
        image.data[pixel + 1] = 10;
        image.data[pixel + 2] = 14;
        image.data[pixel + 3] = 50;
      }

      const left = y * CONTEXT_WIDTH + ((x - 1 + CONTEXT_WIDTH) % CONTEXT_WIDTH);
      const right = y * CONTEXT_WIDTH + ((x + 1) % CONTEXT_WIDTH);
      const above = y > 0 ? index - CONTEXT_WIDTH : index;
      const below = y + 1 < CONTEXT_HEIGHT ? index + CONTEXT_WIDTH : index;
      const parentBoundary = parentRaster[index] !== parentRaster[left]
        || parentRaster[index] !== parentRaster[right]
        || parentRaster[index] !== parentRaster[above]
        || parentRaster[index] !== parentRaster[below];
      const selectedChildBoundary = selectedChild && (
        childRaster[left] !== selectedChildIndex
        || childRaster[right] !== selectedChildIndex
        || childRaster[above] !== selectedChildIndex
        || childRaster[below] !== selectedChildIndex
      );
      if (parentBoundary) {
        image.data[pixel] = 255;
        image.data[pixel + 1] = 252;
        image.data[pixel + 2] = 231;
        image.data[pixel + 3] = 230;
      }
      if (selectedChildBoundary) {
        image.data[pixel] = 255;
        image.data[pixel + 1] = 225;
        image.data[pixel + 2] = 132;
        image.data[pixel + 3] = 255;
      }
    }
  }
  const overlay = document.createElement('canvas');
  overlay.width = CONTEXT_WIDTH;
  overlay.height = CONTEXT_HEIGHT;
  overlay.getContext('2d')?.putImageData(image, 0, 0);
  context.drawImage(overlay, 0, 0);

  context.save();
  context.strokeStyle = '#fff1b0';
  context.lineWidth = 2;
  context.setLineDash([5, 3]);
  for (const rect of geographicAtlasContextRects(extent)) {
    context.strokeRect(
      Math.max(1, rect.x * CONTEXT_WIDTH),
      Math.max(1, rect.y * CONTEXT_HEIGHT),
      Math.max(1, rect.width * CONTEXT_WIDTH),
      Math.max(1, rect.height * CONTEXT_HEIGHT),
    );
  }
  context.restore();

  if (cameraFootprint?.corners.length === 4) {
    drawWrappedCameraFootprint(context, cameraFootprint);
  }
}

function drawWrappedCameraFootprint(
  context: CanvasRenderingContext2D,
  footprint: GeographicSceneCameraFootprint,
): void {
  const points = [...footprint.corners, footprint.corners[0]].map(([longitude, latitude]) => ({
    x: ((normalizeLongitude(longitude) + 180) / 360) * CONTEXT_WIDTH,
    y: ((90 - Math.max(-90, Math.min(90, latitude))) / 180) * CONTEXT_HEIGHT,
  }));
  context.save();
  context.strokeStyle = '#73d8ff';
  context.lineWidth = 2;
  context.setLineDash([]);
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    let adjustedEndX = end.x;
    if (adjustedEndX - start.x > CONTEXT_WIDTH / 2) adjustedEndX -= CONTEXT_WIDTH;
    if (start.x - adjustedEndX > CONTEXT_WIDTH / 2) adjustedEndX += CONTEXT_WIDTH;
    for (const offset of [-CONTEXT_WIDTH, 0, CONTEXT_WIDTH]) {
      context.beginPath();
      context.moveTo(start.x + offset, start.y);
      context.lineTo(adjustedEndX + offset, end.y);
      context.stroke();
    }
  }
  context.restore();
}

function normalizeLongitude(value: number): number {
  let normalized = value;
  while (normalized < -180) normalized += 360;
  while (normalized > 180) normalized -= 360;
  return normalized;
}

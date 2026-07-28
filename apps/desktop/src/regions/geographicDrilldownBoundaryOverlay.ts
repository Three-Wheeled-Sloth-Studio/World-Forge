import {
  cubedSphereCellForLonLat,
  type CubedSphereTopology,
} from '@world-forge/shared';
import type { GeographicWindowTransform } from './geographicWindowedMap';

const UNASSIGNED_CHILD = 0xffff;
const DEGREES_TO_RADIANS = Math.PI / 180;

export function drawGeographicChildBoundaryOverlay(
  canvas: HTMLCanvasElement,
  topology: CubedSphereTopology,
  transform: GeographicWindowTransform,
  parentMembership: Uint8Array,
  childMembership: Uint16Array | null,
  selectedChildIndex: number | null,
): void {
  if (!childMembership) return;
  const context = canvas.getContext('2d');
  if (!context) return;

  const sampleColumns = Math.max(96, Math.min(360, transform.extent.columns * 7));
  const sampleRows = Math.max(64, Math.min(280, Math.round(sampleColumns * canvas.height / Math.max(1, canvas.width))));
  const sampledChildren = new Uint16Array(sampleColumns * sampleRows);
  sampledChildren.fill(UNASSIGNED_CHILD);
  const sampledParent = new Uint8Array(sampleColumns * sampleRows);

  for (let row = 0; row < sampleRows; row += 1) {
    for (let column = 0; column < sampleColumns; column += 1) {
      const point = transform.canvasPointToGeo(
        ((column + 0.5) / sampleColumns) * canvas.width,
        ((row + 0.5) / sampleRows) * canvas.height,
      );
      const cell = cubedSphereCellForLonLat(
        topology,
        point.longitude * DEGREES_TO_RADIANS,
        point.latitude * DEGREES_TO_RADIANS,
      );
      const index = row * sampleColumns + column;
      sampledParent[index] = parentMembership[cell] === 1 ? 1 : 0;
      sampledChildren[index] = childMembership[cell] ?? UNASSIGNED_CHILD;
    }
  }

  const stepX = canvas.width / sampleColumns;
  const stepY = canvas.height / sampleRows;
  context.save();

  if (selectedChildIndex !== null) {
    context.fillStyle = 'rgba(255, 223, 132, 0.2)';
    for (let row = 0; row < sampleRows; row += 1) {
      for (let column = 0; column < sampleColumns; column += 1) {
        const index = row * sampleColumns + column;
        if (sampledParent[index] !== 1 || sampledChildren[index] !== selectedChildIndex) continue;
        context.fillRect(column * stepX, row * stepY, stepX + 0.5, stepY + 0.5);
      }
    }
  }

  context.lineWidth = 1.65;
  context.lineCap = 'round';
  context.setLineDash([3, 3]);
  for (let row = 0; row < sampleRows; row += 1) {
    for (let column = 0; column < sampleColumns; column += 1) {
      const index = row * sampleColumns + column;
      if (sampledParent[index] !== 1 || sampledChildren[index] === UNASSIGNED_CHILD) continue;
      const childIndex = sampledChildren[index];
      const selectedBoundary = selectedChildIndex !== null && childIndex === selectedChildIndex;
      context.strokeStyle = selectedBoundary
        ? 'rgba(255, 232, 153, 0.98)'
        : 'rgba(255, 250, 232, 0.82)';

      if (column + 1 < sampleColumns) {
        const right = index + 1;
        if (sampledParent[right] === 1 && sampledChildren[right] !== childIndex) {
          context.beginPath();
          context.moveTo((column + 1) * stepX, row * stepY);
          context.lineTo((column + 1) * stepX, (row + 1) * stepY);
          context.stroke();
        }
      }
      if (row + 1 < sampleRows) {
        const below = index + sampleColumns;
        if (sampledParent[below] === 1 && sampledChildren[below] !== childIndex) {
          context.beginPath();
          context.moveTo(column * stepX, (row + 1) * stepY);
          context.lineTo((column + 1) * stepX, (row + 1) * stepY);
          context.stroke();
        }
      }
    }
  }
  context.restore();
}

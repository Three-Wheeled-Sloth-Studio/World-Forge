import type { PrimaryWorld } from '@world-forge/shared';
import { splitWrappedRiverPath, type MapTheme, type RenderMode } from './legacyRenderer';

export function authoritativeRiverPathsForPresentation(world: Pick<PrimaryWorld, 'rivers'>) {
  return world.rivers.filter((river) => river.path.length >= 8);
}

export function drawAuthoritativeRiverPaths(
  canvas: HTMLCanvasElement,
  world: PrimaryWorld,
  theme: MapTheme,
  renderMode: RenderMode,
): void {
  const rivers = authoritativeRiverPathsForPresentation(world);
  if (!rivers.length) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to acquire canvas context');
  const { width, height } = world.mapModel.resolution;
  const scaleX = canvas.width / Math.max(1, width);
  const scaleY = canvas.height / Math.max(1, height);
  const natural = renderMode === 'natural';
  const shadowColor = natural ? '#123b35' : theme.colors.riverShadow;
  const channelColor = natural ? '#4f7f69' : theme.colors.river;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const river of rivers) {
    const visiblePath = river.path.filter((index, pathIndex) => pathIndex === 0 || world.layers.water[river.path[pathIndex - 1]] === 0);
    const segments = splitWrappedRiverPath(visiblePath, width, scaleX, scaleY);
    if (!segments.length) continue;

    ctx.lineWidth = Math.max(
      natural ? 1.2 : 2.4,
      Math.min(natural ? 3.2 : 5.6, river.path.length / (natural ? 64 : 44)) * Math.max(scaleX, scaleY),
    );
    ctx.strokeStyle = shadowColor;
    ctx.globalAlpha = natural ? 0.42 : 0.82;
    for (const points of segments) {
      drawSmoothPath(ctx, points);
      ctx.stroke();
    }

    ctx.lineWidth = Math.max(
      natural ? 0.65 : 1.25,
      Math.min(natural ? 1.7 : 3.2, river.path.length / (natural ? 105 : 70)) * Math.max(scaleX, scaleY),
    );
    ctx.strokeStyle = channelColor;
    ctx.globalAlpha = natural ? 0.54 : 1;
    for (const points of segments) {
      drawSmoothPath(ctx, points);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawSmoothPath(ctx: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>): void {
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  if (points.length === 1) return;
  for (let index = 1; index < points.length - 1; index += 1) {
    const midpointX = (points[index].x + points[index + 1].x) / 2;
    const midpointY = (points[index].y + points[index + 1].y) / 2;
    ctx.quadraticCurveTo(points[index].x, points[index].y, midpointX, midpointY);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
}

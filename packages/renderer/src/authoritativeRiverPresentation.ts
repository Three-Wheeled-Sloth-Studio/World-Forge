import type { PrimaryWorld, River } from '@world-forge/shared';
import { splitWrappedRiverPath, type MapTheme, type RenderMode } from './legacyRenderer';

export function authoritativeRiverPathsForPresentation(world: Pick<PrimaryWorld, 'rivers'>) {
  return world.rivers.filter((river) => river.path.length >= 8);
}

export function authoritativeRiverTerminiForPresentation(world: Pick<PrimaryWorld, 'rivers'>): Array<{
  riverId: string;
  terminus: Exclude<River['terminus'], 'ocean'>;
  mouthIndex: number;
}> {
  return authoritativeRiverPathsForPresentation(world)
    .filter((river): river is typeof river & { terminus: Exclude<River['terminus'], 'ocean'> } => river.terminus !== 'ocean')
    .map((river) => ({
      riverId: river.id,
      terminus: river.terminus,
      mouthIndex: river.path[river.path.length - 1] ?? river.mouthIndex,
    }));
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
  const ttrpg = theme.name.includes('TTRPG Parchment Map');
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

    if (ttrpg && river.terminus !== 'ocean' && river.terminus !== 'lake') {
      const lastSegment = segments[segments.length - 1];
      const endpoint = lastSegment?.[lastSegment.length - 1];
      if (endpoint) drawTtrpgRiverTerminus(ctx, endpoint.x, endpoint.y, river.terminus, theme, Math.max(scaleX, scaleY));
    }
  }
  ctx.restore();
}

function drawTtrpgRiverTerminus(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  terminus: Exclude<River['terminus'], 'ocean' | 'lake'>,
  theme: MapTheme,
  mapScale: number,
): void {
  const radius = Math.max(2.4, Math.min(5.2, mapScale * 2.4));
  ctx.strokeStyle = terminus === 'wetland' ? theme.colors.river : theme.colors.coastline;
  ctx.globalAlpha = terminus === 'wetland' ? 0.76 : 0.7;
  ctx.lineWidth = Math.max(0.8, radius * 0.28);
  ctx.beginPath();

  if (terminus === 'wetland') {
    ctx.moveTo(x - radius * 1.1, y + radius * 0.45);
    ctx.quadraticCurveTo(x - radius * 0.55, y, x, y + radius * 0.42);
    ctx.quadraticCurveTo(x + radius * 0.55, y + radius * 0.82, x + radius * 1.1, y + radius * 0.42);
    for (const offset of [-0.55, 0, 0.55]) {
      const reedX = x + offset * radius;
      ctx.moveTo(reedX, y + radius * 0.3);
      ctx.lineTo(reedX, y - radius * 0.7);
    }
  } else {
    ctx.moveTo(x - radius, y);
    ctx.quadraticCurveTo(x, y - radius * 0.7, x + radius, y);
    ctx.quadraticCurveTo(x, y + radius * 0.7, x - radius, y);
    ctx.closePath();
  }
  ctx.stroke();
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

import { codeToBiome, type PrimaryWorld } from '@world-forge/shared';

export type TtrpgWorldMapSymbolKind = 'mountain' | 'hills' | 'forest' | 'rainforest' | 'swamp';

export type TtrpgWorldMapSymbolPlacement = {
  kind: TtrpgWorldMapSymbolKind;
  x: number;
  y: number;
  size: number;
  priority: number;
  opacity: number;
  sourceIndex: number;
  tieBreaker: number;
};

export type TtrpgWorldMapSymbolWorld = Pick<PrimaryWorld, 'mapModel' | 'seaLevel'> & {
  layers: Pick<PrimaryWorld['layers'], 'water' | 'ice' | 'lakes' | 'biomes' | 'elevation'>;
  rivers: Array<Pick<PrimaryWorld['rivers'][number], 'path'>>;
};

export function ttrpgWorldMapSymbolPlacements(
  world: TtrpgWorldMapSymbolWorld,
  targetWidth: number,
  targetHeight: number,
): TtrpgWorldMapSymbolPlacement[] {
  if (targetWidth <= 0 || targetHeight <= 0) return [];
  const sourceWidth = world.mapModel.resolution.width;
  const sourceHeight = world.mapModel.resolution.height;
  if (sourceWidth <= 0 || sourceHeight <= 0) return [];

  const columns = clampInt(Math.round(targetWidth / 30), 24, 54);
  const rows = clampInt(Math.round(targetHeight / 28), 12, 28);
  const cellWidth = targetWidth / columns;
  const cellHeight = targetHeight / rows;
  const samples: Array<{ index: number; x: number; y: number; elevation: number; biome: string }> = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const centerX = (column + 0.5) * cellWidth;
      const centerY = (row + 0.5) * cellHeight;
      const index = sourceIndexForTarget(centerX, centerY, targetWidth, targetHeight, sourceWidth, sourceHeight);
      if (world.layers.water[index] === 1 || world.layers.ice[index] === 1 || world.layers.lakes[index] === 1) continue;
      samples.push({
        index,
        x: centerX,
        y: centerY,
        elevation: world.layers.elevation[index],
        biome: codeToBiome(world.layers.biomes[index]),
      });
    }
  }
  if (!samples.length) return [];

  const elevations = samples.map((sample) => sample.elevation).sort((left, right) => left - right);
  const hillFloor = percentile(elevations, 0.74);
  const mountainFloor = percentile(elevations, 0.9);
  const riverCells = expandedRiverCellSet(world.rivers, sourceWidth, sourceHeight, 2);
  const baseSize = Math.max(19, Math.min(42, targetWidth / 31));
  const candidates: TtrpgWorldMapSymbolPlacement[] = [];

  for (const sample of samples) {
    if (riverCells.has(sample.index)) continue;
    const kind = symbolKind(sample.biome, sample.elevation, hillFloor, mountainFloor);
    if (!kind) continue;
    const tieBreaker = stableUnit(`${sample.index}:${kind}`);
    const jitterX = (stableUnit(`${sample.index}:${kind}:x`) - 0.5) * cellWidth * 0.52;
    const jitterY = (stableUnit(`${sample.index}:${kind}:y`) - 0.5) * cellHeight * 0.44;
    const style = styleForKind(kind, baseSize);
    candidates.push({
      kind,
      x: clamp(sample.x + jitterX, style.size * 0.62, targetWidth - style.size * 0.62),
      y: clamp(sample.y + jitterY, style.size * 0.5, targetHeight - style.size * 0.5),
      size: style.size,
      priority: style.priority,
      opacity: style.opacity,
      sourceIndex: sample.index,
      tieBreaker,
    });
  }

  candidates.sort((left, right) => right.priority - left.priority || left.tieBreaker - right.tieBreaker);
  const maximum = clampInt(Math.round((targetWidth * targetHeight) / 9800), 28, 78);
  const accepted: TtrpgWorldMapSymbolPlacement[] = [];
  for (const candidate of candidates) {
    if (accepted.length >= maximum) break;
    if (accepted.some((placed) => overlaps(candidate, placed))) continue;
    accepted.push(candidate);
  }
  return accepted.sort((left, right) => left.priority - right.priority || left.tieBreaker - right.tieBreaker);
}

export function drawTtrpgWorldMapSymbols(
  canvas: HTMLCanvasElement,
  world: TtrpgWorldMapSymbolWorld,
  inkColor = '#4a3828',
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const placements = ttrpgWorldMapSymbolPlacements(world, canvas.width, canvas.height);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = inkColor;
  for (const placement of placements) {
    ctx.globalAlpha = placement.opacity;
    ctx.lineWidth = Math.max(0.9, placement.size * 0.055);
    drawSymbol(ctx, placement);
  }
  drawCompassRose(ctx, canvas.width, canvas.height, inkColor);
  ctx.restore();
}

function symbolKind(
  biome: string,
  elevation: number,
  hillFloor: number,
  mountainFloor: number,
): TtrpgWorldMapSymbolKind | null {
  if (biome === 'wetland') return 'swamp';
  if (biome === 'rainforest') return 'rainforest';
  if (biome === 'forest') return elevation >= mountainFloor ? 'mountain' : 'forest';
  if (biome === 'mountain' || elevation >= mountainFloor) return 'mountain';
  if (elevation >= hillFloor && biome !== 'ice_cap' && biome !== 'ocean') return 'hills';
  return null;
}

function styleForKind(kind: TtrpgWorldMapSymbolKind, baseSize: number) {
  switch (kind) {
    case 'mountain': return { size: baseSize * 1.3, priority: 100, opacity: 0.88 };
    case 'swamp': return { size: baseSize * 0.95, priority: 88, opacity: 0.76 };
    case 'rainforest': return { size: baseSize, priority: 80, opacity: 0.79 };
    case 'forest': return { size: baseSize * 0.94, priority: 72, opacity: 0.77 };
    case 'hills': return { size: baseSize, priority: 56, opacity: 0.7 };
  }
}

function drawSymbol(ctx: CanvasRenderingContext2D, placement: TtrpgWorldMapSymbolPlacement): void {
  switch (placement.kind) {
    case 'mountain':
      drawMountain(ctx, placement.x, placement.y, placement.size);
      break;
    case 'hills':
      drawHills(ctx, placement.x, placement.y, placement.size);
      break;
    case 'forest':
      drawForest(ctx, placement.x, placement.y, placement.size, false);
      break;
    case 'rainforest':
      drawForest(ctx, placement.x, placement.y, placement.size, true);
      break;
    case 'swamp':
      drawSwamp(ctx, placement.x, placement.y, placement.size);
      break;
  }
}

function drawMountain(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const half = size * 0.5;
  ctx.beginPath();
  ctx.moveTo(x - half, y + size * 0.3);
  ctx.lineTo(x - size * 0.12, y - size * 0.48);
  ctx.lineTo(x + size * 0.12, y - size * 0.08);
  ctx.lineTo(x + size * 0.28, y - size * 0.35);
  ctx.lineTo(x + half, y + size * 0.3);
  ctx.moveTo(x - size * 0.26, y + size * 0.03);
  ctx.lineTo(x - size * 0.12, y - size * 0.48);
  ctx.lineTo(x + size * 0.01, y - size * 0.22);
  ctx.stroke();
}

function drawHills(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.beginPath();
  ctx.moveTo(x - size * 0.5, y + size * 0.22);
  ctx.quadraticCurveTo(x - size * 0.24, y - size * 0.34, x + size * 0.02, y + size * 0.2);
  ctx.quadraticCurveTo(x + size * 0.25, y - size * 0.22, x + size * 0.5, y + size * 0.2);
  ctx.stroke();
}

function drawForest(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, broadleaf: boolean): void {
  const offsets = [-0.26, 0.02, 0.28];
  ctx.beginPath();
  for (let index = 0; index < offsets.length; index += 1) {
    const treeX = x + offsets[index] * size;
    const treeY = y + (index === 1 ? -0.08 : 0.12) * size;
    const treeSize = size * (index === 1 ? 0.62 : 0.48);
    if (broadleaf) {
      ctx.moveTo(treeX - treeSize * 0.35, treeY);
      ctx.quadraticCurveTo(treeX - treeSize * 0.2, treeY - treeSize * 0.45, treeX, treeY - treeSize * 0.28);
      ctx.quadraticCurveTo(treeX + treeSize * 0.22, treeY - treeSize * 0.46, treeX + treeSize * 0.36, treeY);
      ctx.quadraticCurveTo(treeX, treeY + treeSize * 0.14, treeX - treeSize * 0.35, treeY);
    } else {
      ctx.moveTo(treeX, treeY - treeSize * 0.52);
      ctx.lineTo(treeX - treeSize * 0.38, treeY + treeSize * 0.14);
      ctx.lineTo(treeX + treeSize * 0.38, treeY + treeSize * 0.14);
      ctx.lineTo(treeX, treeY - treeSize * 0.52);
    }
    ctx.moveTo(treeX, treeY - treeSize * 0.02);
    ctx.lineTo(treeX, treeY + treeSize * 0.42);
  }
  ctx.stroke();
}

function drawSwamp(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.beginPath();
  ctx.moveTo(x - size * 0.45, y + size * 0.26);
  ctx.quadraticCurveTo(x - size * 0.22, y + size * 0.12, x, y + size * 0.26);
  ctx.quadraticCurveTo(x + size * 0.22, y + size * 0.4, x + size * 0.45, y + size * 0.26);
  for (const offset of [-0.26, 0, 0.25]) {
    const reedX = x + offset * size;
    ctx.moveTo(reedX, y + size * 0.22);
    ctx.lineTo(reedX, y - size * 0.28);
    ctx.moveTo(reedX, y - size * 0.1);
    ctx.lineTo(reedX - size * 0.12, y - size * 0.2);
    ctx.moveTo(reedX, y - size * 0.04);
    ctx.lineTo(reedX + size * 0.11, y - size * 0.15);
  }
  ctx.stroke();
}

function drawCompassRose(ctx: CanvasRenderingContext2D, width: number, height: number, inkColor: string): void {
  if (width < 120 || height < 80) return;
  const size = Math.max(16, Math.min(30, width / 36));
  const x = width - size * 1.35;
  const y = height - size * 1.35;
  ctx.globalAlpha = 0.62;
  ctx.strokeStyle = inkColor;
  ctx.lineWidth = Math.max(0.9, size * 0.055);
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);
  ctx.moveTo(x - size * 0.55, y - size * 0.55);
  ctx.lineTo(x + size * 0.55, y + size * 0.55);
  ctx.moveTo(x + size * 0.55, y - size * 0.55);
  ctx.lineTo(x - size * 0.55, y + size * 0.55);
  ctx.stroke();
}

function expandedRiverCellSet(
  rivers: Array<Pick<PrimaryWorld['rivers'][number], 'path'>>,
  width: number,
  height: number,
  radius: number,
): Set<number> {
  const cells = new Set<number>();
  for (const river of rivers) {
    for (const index of river.path) {
      const x = index % width;
      const y = Math.floor(index / width);
      for (let dy = -radius; dy <= radius; dy += 1) {
        const nextY = y + dy;
        if (nextY < 0 || nextY >= height) continue;
        for (let dx = -radius; dx <= radius; dx += 1) {
          const nextX = (x + dx + width) % width;
          cells.add(nextY * width + nextX);
        }
      }
    }
  }
  return cells;
}

function sourceIndexForTarget(
  x: number,
  y: number,
  targetWidth: number,
  targetHeight: number,
  sourceWidth: number,
  sourceHeight: number,
): number {
  const sourceX = Math.max(0, Math.min(sourceWidth - 1, Math.floor((x / targetWidth) * sourceWidth)));
  const sourceY = Math.max(0, Math.min(sourceHeight - 1, Math.floor((y / targetHeight) * sourceHeight)));
  return sourceY * sourceWidth + sourceX;
}

function overlaps(left: TtrpgWorldMapSymbolPlacement, right: TtrpgWorldMapSymbolPlacement): boolean {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  const minimum = (left.size + right.size) * 0.48;
  return dx * dx + dy * dy < minimum * minimum;
}

function percentile(sorted: number[], fraction: number): number {
  if (!sorted.length) return 0;
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction)));
  return sorted[index];
}

function stableUnit(value: string): number {
  let hash = 0x811c9dc5;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 0x01000193) >>> 0;
  return hash / 0xffffffff;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function clampInt(value: number, minimum: number, maximum: number): number {
  return Math.round(clamp(value, minimum, maximum));
}

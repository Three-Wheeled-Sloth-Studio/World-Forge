import { describe, expect, it } from 'vitest';
import { createDefaultConfig, generateProject } from '@world-forge/generator-core';
import { authoritativeRiverTerminiForPresentation } from './authoritativeRiverPresentation';
import { renderWorldToCanvas } from './index';

class MemoryCanvas {
  width = 0;
  height = 0;
  pixels = new Uint8ClampedArray();
  readonly context = new MemoryContext(this);

  getContext(kind: string): CanvasRenderingContext2D | null {
    return kind === '2d' ? this.context as unknown as CanvasRenderingContext2D : null;
  }
}

class MemoryContext {
  globalAlpha = 1;
  lineCap: CanvasLineCap = 'butt';
  lineJoin: CanvasLineJoin = 'miter';
  lineWidth = 1;
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000000';
  strokeCount = 0;

  constructor(private readonly canvas: MemoryCanvas) {}

  createImageData(width: number, height: number): ImageData {
    return {
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height,
      colorSpace: 'srgb',
    } as ImageData;
  }

  putImageData(image: ImageData): void {
    this.canvas.pixels = Uint8ClampedArray.from(image.data);
  }

  getImageData(_x: number, _y: number, width: number, height: number): ImageData {
    return {
      data: Uint8ClampedArray.from(this.canvas.pixels),
      width,
      height,
      colorSpace: 'srgb',
    } as ImageData;
  }

  clearRect(): void {}
  save(): void {}
  restore(): void {}
  beginPath(): void {}
  moveTo(): void {}
  lineTo(): void {}
  quadraticCurveTo(): void {}
  closePath(): void {}
  stroke(): void { this.strokeCount += 1; }
}

function generatedProject(seed: string) {
  return generateProject(createDefaultConfig(seed, { width: 64, height: 32 }));
}

function scalarOnlyRiverProject() {
  const project = generatedProject('scalar-river-presentation-regression');
  project.primaryWorld.rivers = [];
  project.primaryWorld.layers.river.fill(1);
  project.primaryWorld.topologyLayers.river.fill(1);
  return project;
}

function explicitRiverProject() {
  const project = generatedProject('authoritative-river-presentation');
  const path = Array.from({ length: 8 }, (_, index) => index);
  for (const index of path) {
    project.primaryWorld.layers.water[index] = 0;
  }
  project.primaryWorld.rivers = [{
    id: 'test-authoritative-river',
    path,
    sourceIndex: path[0],
    mouthIndex: path[path.length - 1],
    terminus: 'basin',
  }];
  return project;
}

function renderProject(project: ReturnType<typeof generatedProject>, renderMode: 'data' | 'ttrpg', rivers: boolean) {
  const canvas = new MemoryCanvas();
  renderWorldToCanvas(canvas as unknown as HTMLCanvasElement, project, undefined, {
    rivers,
    plates: false,
    heightmap: false,
    coastlineTreatment: 'bare',
    renderMode: renderMode as 'data',
    mode: 'biomes',
    targetResolution: { width: 64, height: 32 },
  });
  return { pixels: canvas.pixels, strokeCount: canvas.context.strokeCount };
}

describe('authoritative full-world river presentation', () => {
  it('does not repaint Data land from a scalar-only river field', () => {
    const project = scalarOnlyRiverProject();
    const withRivers = renderProject(project, 'data', true);
    const withoutRivers = renderProject(project, 'data', false);
    expect(withRivers.strokeCount).toBe(0);
    expect(withRivers.pixels).toEqual(withoutRivers.pixels);
  });

  it('does not repaint TTRPG parchment from a scalar-only river field', () => {
    const project = scalarOnlyRiverProject();
    const withRivers = renderProject(project, 'ttrpg', true);
    const withoutRivers = renderProject(project, 'ttrpg', false);
    expect(withRivers.strokeCount).toBe(withoutRivers.strokeCount);
    expect(withRivers.pixels).toEqual(withoutRivers.pixels);
  });

  it('still draws explicit authoritative river paths', () => {
    expect(renderProject(explicitRiverProject(), 'data', true).strokeCount).toBeGreaterThan(0);
  });

  it('keeps non-ocean termini explicit for cartographic endpoint treatment', () => {
    const project = explicitRiverProject();
    project.primaryWorld.rivers.push({
      id: 'test-ocean-river',
      path: Array.from({ length: 8 }, (_, index) => 64 + index),
      sourceIndex: 64,
      mouthIndex: 71,
      terminus: 'ocean',
    });
    expect(authoritativeRiverTerminiForPresentation(project.primaryWorld)).toEqual([{
      riverId: 'test-authoritative-river',
      terminus: 'basin',
      mouthIndex: 7,
    }]);
  });
});

from pathlib import Path
import re


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    if old not in text:
        raise RuntimeError(f'Expected text not found in {path}: {old[:120]!r}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once(
    'apps/desktop/src/appVersion.ts',
    "export const APP_VERSION = '0.3.40';",
    "export const APP_VERSION = '0.3.41';"
)
replace_once(
    'apps/desktop/src/main.tsx',
    'return Math.max(0.75, Math.min(8, Number.isFinite(value) ? value : 1));',
    'return Math.max(0.35, Math.min(8, Number.isFinite(value) ? value : 1));'
)
replace_once(
    'apps/desktop/src/workspace/WorldWorkspace.tsx',
    'const zoomStops = [0.75, 1, 1.5, 2.25, 4, 5.5, 8];',
    'const zoomStops = [0.35, 0.5, 0.75, 1, 1.5, 2.25, 4, 5.5, 8];'
)

viewer_path = Path('apps/desktop/src/globe/GlobeViewer.tsx')
viewer = viewer_path.read_text(encoding='utf-8')
viewer = viewer.replace(
    "} from './orbitalPresentation';\nimport './globeSimulation.css';",
    "} from './orbitalPresentation';\nimport { createWeatherPresentationTexture, renderWeatherPresentationTexture } from './weatherPresentationTexture';\nimport './globeSimulation.css';",
    1
)
viewer = viewer.replace(
    'const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);',
    'const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);',
    1
)
viewer = viewer.replace(
    "opacity: 0.72,\n        alphaTest: 0.025,",
    "opacity: 0.62,\n        alphaTest: 0.012,",
    1
)
viewer = viewer.replace('clouds.castShadow = true;', 'clouds.castShadow = false;', 1)
viewer = viewer.replace(
    "opacity: 0.84,\n        alphaTest: 0.03,",
    "opacity: 0.76,\n        alphaTest: 0.016,",
    1
)
viewer = viewer.replace('weatherSystems.castShadow = true;', 'weatherSystems.castShadow = false;', 1)
viewer = viewer.replace(
    "scene.add(sun);\n\n  const moons",
    "sun.target.position.set(0, 0, 0);\n  scene.add(sun);\n  scene.add(sun.target);\n\n  const moons",
    1
)
viewer = viewer.replace(
    "presentation.sun.position.copy(starDirection).multiplyScalar(6.5);\n\n  for (const visual",
    "presentation.sun.position.copy(starDirection).multiplyScalar(6.5);\n  presentation.sun.target.position.set(0, 0, 0);\n  presentation.sun.target.updateMatrixWorld();\n  presentation.sun.updateMatrixWorld();\n\n  for (const visual",
    1
)
viewer = viewer.replace(
    "if (orbitalPresentation && orbitalContext) updateOrbitalPresentationScene(orbitalPresentation, orbitalContext, simulationDays);",
    "if (orbitalPresentation && orbitalContext) {\n        updateOrbitalPresentationScene(orbitalPresentation, orbitalContext, simulationDays);\n        const firstMoon = orbitalPresentation.moons[0]?.group.position;\n        host.dataset.shadowLightVector = orbitalPresentation.sun.position.toArray().map((value) => value.toFixed(5)).join(',');\n        host.dataset.primaryMoonPosition = firstMoon ? firstMoon.toArray().map((value) => value.toFixed(5)).join(',') : 'none';\n        host.dataset.moonShadowAlignment = firstMoon\n          ? firstMoon.clone().normalize().dot(orbitalPresentation.sun.position.clone().normalize()).toFixed(6)\n          : 'none';\n      }\n      host.dataset.cameraDistance = camera.position.length().toFixed(6);",
    1
)
viewer = viewer.replace(
    "data-moon-shadow-mode={orbitalContext ? 'pcf-soft-proof' : 'disabled'}\n      data-weather-presentation",
    "data-moon-shadow-mode={orbitalContext ? 'pcf-soft-tracked' : 'disabled'}\n      data-moon-shadow-caster-count={moonCount}\n      data-cloud-shadow-mode=\"disabled-until-soft-shadow\"\n      data-cloud-renderer=\"layered-noise-v2\"\n      data-minimum-globe-zoom=\"35\"\n      data-weather-presentation",
    1
)
viewer = viewer.replace(
    "const clamped = Math.max(0.75, Math.min(4, Number.isFinite(zoom) ? zoom : 1));",
    "const clamped = Math.max(0.35, Math.min(4, Number.isFinite(zoom) ? zoom : 1));",
    1
)
viewer = viewer.replace(
    "presentation.sun.parent?.remove(presentation.sun);\n  presentation.haloTexture.dispose();",
    "presentation.sun.parent?.remove(presentation.sun);\n  presentation.sun.target.parent?.remove(presentation.sun.target);\n  presentation.haloTexture.dispose();",
    1
)
pattern = re.compile(r"\ntype WeatherTextureMode = 'clouds' \| 'weather';\n.*?\nfunction createUvGridTexture\(\): HTMLCanvasElement \{", re.S)
viewer, count = pattern.subn("\nfunction createUvGridTexture(): HTMLCanvasElement {", viewer, count=1)
if count != 1:
    raise RuntimeError('Could not extract weather texture implementation from GlobeViewer.tsx')
viewer_path.write_text(viewer, encoding='utf-8')

weather_module = r'''import type { AtmosphericWeatherPresentationArtifact, WeatherPresentationSystem } from '@world-forge/shared';

export type WeatherTextureMode = 'clouds' | 'weather';

export function createWeatherPresentationTexture(
  artifact: AtmosphericWeatherPresentationArtifact | null,
  mode: WeatherTextureMode,
  simulationDays: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = artifact?.payload.textureResolution.width ?? 512;
  canvas.height = artifact?.payload.textureResolution.height ?? 256;
  renderWeatherPresentationTexture(canvas, artifact, mode, simulationDays);
  return canvas;
}

export function renderWeatherPresentationTexture(
  canvas: HTMLCanvasElement,
  artifact: AtmosphericWeatherPresentationArtifact | null,
  mode: WeatherTextureMode,
  simulationDays: number
): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.save();
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#000000';
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (!artifact) {
    context.restore();
    return;
  }

  context.globalCompositeOperation = 'lighter';
  if (mode === 'clouds') drawLayeredCloudField(context, canvas, artifact, simulationDays);
  for (const system of artifact.payload.systems) {
    drawWeatherPresentationSystem(context, canvas, artifact.seed, system, mode, simulationDays);
  }
  context.restore();
  normalizeHorizontalTextureSeam(canvas, 3);
}

function drawLayeredCloudField(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  artifact: AtmosphericWeatherPresentationArtifact,
  simulationDays: number
): void {
  const field = document.createElement('canvas');
  field.width = Math.max(128, Math.floor(canvas.width / 2));
  field.height = Math.max(64, Math.floor(canvas.height / 2));
  const fieldContext = field.getContext('2d');
  if (!fieldContext) return;
  const image = fieldContext.createImageData(field.width, field.height);

  for (let y = 0; y < field.height; y += 1) {
    const v = (y + 0.5) / field.height;
    for (let x = 0; x < field.width; x += 1) {
      const u = (x + 0.5) / field.width;
      const coverage = cloudCoverageSample(artifact, u, v, simulationDays);
      const value = Math.round(Math.pow(coverage, 0.88) * 255);
      const index = (y * field.width + x) * 4;
      image.data[index] = value;
      image.data[index + 1] = value;
      image.data[index + 2] = value;
      image.data[index + 3] = 255;
    }
  }
  fieldContext.putImageData(image, 0, 0);

  context.save();
  context.imageSmoothingEnabled = true;
  context.filter = 'blur(1.15px)';
  context.globalAlpha = 0.92;
  context.drawImage(field, 0, 0, canvas.width, canvas.height);
  context.restore();
}

export function cloudCoverageSample(
  artifact: Pick<AtmosphericWeatherPresentationArtifact, 'seed' | 'payload'>,
  u: number,
  v: number,
  simulationDays: number
): number {
  const latitudeDeg = 90 - clamp01(v) * 180;
  const longitudeDeg = wrapUnit(u) * 360 - 180;
  let bandEnvelope = 0;

  for (const band of artifact.payload.cloudBands) {
    const phase = band.phaseRad + degreesToRadians(longitudeDeg * band.waveNumber + band.driftDegPerDay * simulationDays);
    const centerLatitude = band.centerLatitudeDeg + Math.sin(phase) * band.waveAmplitudeDeg;
    const halfWidth = Math.max(2, band.widthDeg * 0.72);
    const normalizedDistance = (latitudeDeg - centerLatitude) / halfWidth;
    const envelope = Math.exp(-0.5 * normalizedDistance * normalizedDistance) * band.density;
    bandEnvelope = Math.max(bandEnvelope, envelope);
  }

  const latitudeRadians = degreesToRadians(latitudeDeg);
  const latitudeFlow = 0.42 + Math.pow(Math.cos(latitudeRadians), 2) * 0.58;
  const eastwardAdvection = simulationDays * (0.0012 + latitudeFlow * 0.0021);
  const macro = fractalCloudNoise(wrapUnit(u + eastwardAdvection), v * 0.94 + simulationDays * 0.00012, `${artifact.seed}:macro`);
  const filament = fractalCloudNoise(wrapUnit(u * 1.85 + eastwardAdvection * 1.7), v * 1.65 - simulationDays * 0.00018, `${artifact.seed}:filament`);
  const cells = fractalCloudNoise(wrapUnit(u * 4.4 - eastwardAdvection * 0.55), v * 3.9 + simulationDays * 0.00031, `${artifact.seed}:cells`);
  const texture = macro * 0.48 + filament * 0.34 + cells * 0.18;
  const threshold = 0.59 - bandEnvelope * 0.29;
  const formed = smoothStep(threshold, 0.87, texture + bandEnvelope * 0.31);
  const breakup = smoothStep(0.34, 0.73, filament * 0.66 + cells * 0.34);
  return clamp01(formed * (0.48 + breakup * 0.72) * (0.52 + bandEnvelope * 0.88));
}

function drawWeatherPresentationSystem(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  seed: string,
  system: WeatherPresentationSystem,
  mode: WeatherTextureMode,
  simulationDays: number
): void {
  const longitudeDeg = wrapSignedDegrees(system.longitudeDeg + system.driftEastDegPerDay * simulationDays);
  const latitudeDeg = Math.max(-88, Math.min(88, system.latitudeDeg + Math.sin(system.phaseRad + simulationDays * 0.08) * system.driftNorthDegPerDay));
  const x = (longitudeDeg + 180) / 360 * canvas.width;
  const y = (90 - latitudeDeg) / 180 * canvas.height;
  const radius = Math.max(3, system.radiusDeg / 360 * canvas.width);
  const density = clamp01(system.density);
  const rotation = system.phaseRad + system.spinRadiansPerDay * simulationDays;
  const puffCount = system.kind === 'cyclone' ? 34 : system.kind === 'front' ? 28 : 22;

  for (const offset of [-canvas.width, 0, canvas.width]) {
    const cx = x + offset;
    context.save();
    context.filter = mode === 'weather' ? 'blur(0.65px)' : 'blur(0.9px)';
    for (let index = 0; index < puffCount; index += 1) {
      const t = puffCount <= 1 ? 0 : index / (puffCount - 1);
      const angleNoise = (seededUnit(`${seed}:${system.id}:angle`, index, 0) - 0.5) * 0.9;
      const radialNoise = seededUnit(`${seed}:${system.id}:radius`, index, 1);
      const sizeNoise = seededUnit(`${seed}:${system.id}:size`, index, 2);
      let px: number;
      let py: number;

      if (system.kind === 'front') {
        const along = (t - 0.5) * radius * 1.9;
        const curve = Math.sin(t * Math.PI * 2 + rotation) * radius * 0.22;
        px = cx + Math.cos(rotation) * along - Math.sin(rotation) * curve;
        py = y + (Math.sin(rotation) * along + Math.cos(rotation) * curve) * 0.58;
      } else {
        const turns = system.kind === 'cyclone' ? 2.55 : 1.15;
        const angle = rotation + t * Math.PI * 2 * turns + angleNoise;
        const distance = radius * (0.08 + Math.pow(t, 0.72) * 0.86) * (0.82 + radialNoise * 0.25);
        px = cx + Math.cos(angle) * distance;
        py = y + Math.sin(angle) * distance * 0.62;
      }

      const puffRadius = radius * (0.07 + sizeNoise * (mode === 'weather' ? 0.17 : 0.22));
      const strength = clamp01((0.34 + density * 0.72) * (0.72 + radialNoise * 0.36));
      drawSoftPuff(context, px, py, puffRadius, strength, system.kind === 'front' ? 1.75 : 1);
    }
    context.restore();
  }
}

function drawSoftPuff(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  strength: number,
  stretchX: number
): void {
  context.save();
  context.translate(x, y);
  context.scale(stretchX, 1);
  const gradient = context.createRadialGradient(0, 0, radius * 0.08, 0, 0, radius);
  const core = Math.round(150 + clamp01(strength) * 105);
  gradient.addColorStop(0, `rgba(${core}, ${core}, ${core}, ${0.45 + strength * 0.45})`);
  gradient.addColorStop(0.48, `rgba(${Math.round(core * 0.82)}, ${Math.round(core * 0.82)}, ${Math.round(core * 0.82)}, ${0.22 + strength * 0.34})`);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function normalizeHorizontalTextureSeam(canvas: HTMLCanvasElement, columns = 2): void {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context || canvas.width < 2 || canvas.height < 1) return;
  const width = canvas.width;
  const height = canvas.height;
  const seamColumns = Math.max(1, Math.min(columns, Math.floor(width / 2)));
  const image = context.getImageData(0, 0, width, height);
  for (let y = 0; y < height; y += 1) {
    for (let offset = 0; offset < seamColumns; offset += 1) {
      const left = (y * width + offset) * 4;
      const right = (y * width + (width - 1 - offset)) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        const value = Math.round((image.data[left + channel] + image.data[right + channel]) / 2);
        image.data[left + channel] = value;
        image.data[right + channel] = value;
      }
    }
  }
  context.putImageData(image, 0, 0);
}

function fractalCloudNoise(u: number, v: number, seed: string): number {
  let amplitude = 0.58;
  let frequency = 2.1;
  let total = 0;
  let weight = 0;
  for (let octave = 0; octave < 5; octave += 1) {
    total += smoothValueNoise(u * frequency, v * frequency, `${seed}:cloud:${octave}`) * amplitude;
    weight += amplitude;
    amplitude *= 0.52;
    frequency *= 2.05;
  }
  return weight > 0 ? total / weight : 0;
}

function smoothValueNoise(x: number, y: number, seed: string): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smoothStep(0, 1, x - x0);
  const fy = smoothStep(0, 1, y - y0);
  const a = seededUnit(seed, x0, y0);
  const b = seededUnit(seed, x0 + 1, y0);
  const c = seededUnit(seed, x0, y0 + 1);
  const d = seededUnit(seed, x0 + 1, y0 + 1);
  return linearInterpolate(linearInterpolate(a, b, fx), linearInterpolate(c, d, fx), fy);
}

function seededUnit(seed: string, x: number, y: number): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619);
  hash ^= Math.imul(x + 374761393, 668265263);
  hash ^= Math.imul(y + 2246822519, 3266489917);
  hash = Math.imul(hash ^ (hash >>> 15), 2246822507);
  return ((hash ^ (hash >>> 13)) >>> 0) / 4294967295;
}

function smoothStep(edge0: number, edge1: number, value: number): number {
  const span = edge1 - edge0;
  if (Math.abs(span) < 0.000001) return value >= edge1 ? 1 : 0;
  const t = clamp01((value - edge0) / span);
  return t * t * (3 - 2 * t);
}

function linearInterpolate(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function degreesToRadians(value: number): number {
  return value * Math.PI / 180;
}

function wrapUnit(value: number): number {
  return ((value % 1) + 1) % 1;
}

function wrapSignedDegrees(value: number): number {
  return ((value + 180) % 360 + 360) % 360 - 180;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
'''
Path('apps/desktop/src/globe/weatherPresentationTexture.ts').write_text(weather_module, encoding='utf-8')

weather_test = r'''import { describe, expect, it } from 'vitest';
import type { AtmosphericWeatherPresentationArtifact } from '@world-forge/shared';
import { cloudCoverageSample } from './weatherPresentationTexture';

const artifact = {
  seed: 'weather-qa-seed',
  payload: {
    cloudBands: [
      { id: 'north', centerLatitudeDeg: 42, widthDeg: 18, density: 0.72, phaseRad: 0.4, waveNumber: 2.2, waveAmplitudeDeg: 7, driftDegPerDay: 0.8 },
      { id: 'equator', centerLatitudeDeg: 2, widthDeg: 22, density: 0.84, phaseRad: 1.1, waveNumber: 1.5, waveAmplitudeDeg: 5, driftDegPerDay: 1.25 },
      { id: 'south', centerLatitudeDeg: -46, widthDeg: 16, density: 0.66, phaseRad: 2.4, waveNumber: 2.7, waveAmplitudeDeg: 8, driftDegPerDay: 0.65 }
    ]
  }
} as AtmosphericWeatherPresentationArtifact;

describe('layered cloud presentation', () => {
  it('is deterministic for the same artifact and time', () => {
    expect(cloudCoverageSample(artifact, 0.33, 0.44, 12.5)).toBe(cloudCoverageSample(artifact, 0.33, 0.44, 12.5));
  });

  it('breaks broad climate bands into varied local coverage', () => {
    const samples = Array.from({ length: 96 }, (_, index) => cloudCoverageSample(artifact, index / 96, 0.49, 4));
    const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    const variance = samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) / samples.length;
    expect(Math.max(...samples) - Math.min(...samples)).toBeGreaterThan(0.25);
    expect(variance).toBeGreaterThan(0.004);
  });

  it('advects rather than remaining fixed over simulation time', () => {
    const before = Array.from({ length: 48 }, (_, index) => cloudCoverageSample(artifact, index / 48, 0.36, 0));
    const after = Array.from({ length: 48 }, (_, index) => cloudCoverageSample(artifact, index / 48, 0.36, 18));
    const change = before.reduce((sum, value, index) => sum + Math.abs(value - after[index]), 0) / before.length;
    expect(change).toBeGreaterThan(0.015);
  });
});
'''
Path('apps/desktop/src/globe/weatherPresentationTexture.test.ts').write_text(weather_test, encoding='utf-8')

handoff_path = Path('refs/handoffs/system-visualization-enrichment.md')
handoff = handoff_path.read_text(encoding='utf-8')
handoff = handoff.replace(
    'Status: Visualizer Cycle 2 atmospheric-weather slice implemented for validation',
    'Status: Visualizer Cycle 2.1 cloud and shadow correction implemented for validation',
    1
)
handoff += '''\n## Visualizer Cycle 2.1 QA correction\n\n- Replaced continuous stroked cloud bands with a layered, multi-scale noise field constrained by the saved climatological bands.\n- Added differential time advection so cloud texture evolves instead of behaving like a painted stripe shell.\n- Rebuilt fronts, cyclones, and convective systems from overlapping soft puffs for less geometric edges.\n- Disabled the current alpha-map cloud shadow pass because it produced oversized hard bands; soft cloud shadows remain a later shader task.\n- Kept moons as the only local-system shadow casters and explicitly update the directional-light target and matrices with the shared clock.\n- Added 35% and 50% Globe zoom stops so moon/light geometry can be inspected in the local-system view.\n'''
handoff_path.write_text(handoff, encoding='utf-8')

Path('refs/testing/atmospheric-weather-visual-qa.md').write_text('''# Atmospheric Weather Visual QA\n\nUpdated: 2026-07-31\n\n## Acceptance path\n\n1. Generate the fast 256 x 128 world.\n2. Open Globe view and enable Clouds, then Weather systems.\n3. Confirm the lazy atmospheric-weather workflow completes.\n4. Confirm clouds are locally broken and irregular rather than continuous latitude-width strokes.\n5. Advance the shared clock and confirm cloud texture and systems move.\n6. Set Globe zoom to 35% and confirm the primary moons remain visible.\n7. Confirm cloud shells no longer cast the oversized hard shadow bands.\n8. Confirm moon positions and the directional stellar light vector both update under the shared clock.\n9. Verify 1440 x 900 and 1920 x 1080 without page-level overflow or browser errors.\n\n## Boundary\n\nCloud shadows are intentionally disabled until a soft transmittance-based shadow implementation exists. The current proof isolates moon-shadow geometry instead of allowing an alpha-tested shell to impersonate a planetary-scale Venetian blind.\n''', encoding='utf-8')

print('Applied weather cloud and shadow QA corrections.')

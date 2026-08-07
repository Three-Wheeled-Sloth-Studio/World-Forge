import type { CubedSphereTopology } from '@world-forge/shared';
import type { GeographicHierarchyMapExtent } from '@world-forge/shared/geographicHierarchy';
import {
  deriveAdaptiveGeographicScale,
  type GeographicAdaptiveScaleResult,
} from './geographicAdaptiveScale';

export const GEOGRAPHIC_DRILLDOWN_TARGET_COLUMNS = 50;
export const GEOGRAPHIC_DRILLDOWN_MAX_SCALE_RATIO = 2.5;
export const GEOGRAPHIC_CHILD_TARGET_HEXES = 400;

const MINIMUM_SCALE_MILES = 0.5;
const CANONICAL_TARGET_SCALES = [60, 24, 6, 1, 0.5] as const;
const NICE_SCALE_MILES = [
  8000, 6000, 5000, 4000, 3000, 2500, 2000, 1500, 1250, 1000, 750, 600,
  500, 400, 375, 300, 250, 200, 180, 150, 125, 100, 90, 75, 60, 50, 45,
  40, 36, 30, 25, 24, 20, 18, 15, 12, 10, 9, 7.5, 6, 5, 4, 3, 2.5,
  2, 1.5, 1.25, 1, 0.75, 0.5,
] as const;

export type GeographicWidthScaleOptions = {
  targetColumns?: number;
  contextPaddingHexes?: number;
};

export function deriveInitialGeographicScale(
  topology: CubedSphereTopology,
  planetCircumferenceMiles: number,
  membership: Uint8Array,
  options: GeographicWidthScaleOptions = {},
): GeographicAdaptiveScaleResult {
  const targetColumns = cleanTargetColumns(options.targetColumns);
  const longitudeSpan = selectedLongitudeSpanDegrees(topology, membership);
  const renderedWidthMiles = planetCircumferenceMiles * (longitudeSpan / 360);
  const rawScaleMiles = Math.max(MINIMUM_SCALE_MILES, renderedWidthMiles / targetColumns);
  const scaleMiles = niceScaleAtOrAbove(rawScaleMiles);
  return deriveScaleAtMiles(
    topology,
    planetCircumferenceMiles,
    membership,
    scaleMiles,
    options,
  );
}

export function deriveNextGeographicScale(
  topology: CubedSphereTopology,
  planetCircumferenceMiles: number,
  membership: Uint8Array,
  currentScaleMiles: number,
  options: GeographicWidthScaleOptions = {},
): GeographicAdaptiveScaleResult {
  return deriveScaleAtMiles(
    topology,
    planetCircumferenceMiles,
    membership,
    nextGeographicScaleMiles(currentScaleMiles),
    options,
  );
}

export function deriveScaleAtMiles(
  topology: CubedSphereTopology,
  planetCircumferenceMiles: number,
  membership: Uint8Array,
  scaleMiles: number,
  options: GeographicWidthScaleOptions = {},
): GeographicAdaptiveScaleResult {
  const targetColumns = cleanTargetColumns(options.targetColumns);
  const fixedScaleMiles = Math.max(MINIMUM_SCALE_MILES, round(scaleMiles, 4));
  return deriveAdaptiveGeographicScale(
    topology,
    planetCircumferenceMiles,
    membership,
    {
      contextPaddingHexes: options.contextPaddingHexes ?? 2,
      targetViewportColumns: targetColumns,
      targetViewportRows: 1,
      minimumViewportColumns: 1,
      minimumViewportRows: 1,
      maximumViewportColumns: Math.max(240, targetColumns * 4),
      maximumViewportRows: 320,
      minimumScaleMiles: fixedScaleMiles,
      maximumScaleMiles: fixedScaleMiles,
    },
  );
}

export function nextGeographicScaleMiles(currentScaleMiles: number): number {
  const current = Math.max(MINIMUM_SCALE_MILES, currentScaleMiles);
  const canonicalTarget = CANONICAL_TARGET_SCALES.find((target) => target < current - 1e-6)
    ?? Math.max(MINIMUM_SCALE_MILES, current / GEOGRAPHIC_DRILLDOWN_MAX_SCALE_RATIO);
  const minimumSmoothStep = current / GEOGRAPHIC_DRILLDOWN_MAX_SCALE_RATIO;
  const desired = Math.max(canonicalTarget, minimumSmoothStep, MINIMUM_SCALE_MILES);
  const next = niceScaleAtOrAbove(desired, current);
  if (next < current - 1e-6) return next;
  return round(Math.max(MINIMUM_SCALE_MILES, current / GEOGRAPHIC_DRILLDOWN_MAX_SCALE_RATIO), 4);
}

export function targetChildCountForExtent(
  extent: GeographicHierarchyMapExtent,
  targetHexesPerChild = GEOGRAPHIC_CHILD_TARGET_HEXES,
): number {
  const padding = Math.max(0, extent.contextPaddingHexes);
  const contentColumns = Math.max(1, extent.columns - padding * 2);
  const contentRows = Math.max(1, extent.rows - padding * 2);
  const estimatedParentHexes = contentColumns * contentRows;
  const target = Math.max(25, Math.round(targetHexesPerChild));
  return Math.max(2, Math.min(64, Math.ceil(estimatedParentHexes / target)));
}

function selectedLongitudeSpanDegrees(
  topology: CubedSphereTopology,
  membership: Uint8Array,
): number {
  if (membership.length !== topology.cellCount) {
    throw new Error('Width-driven geographic scale membership must match the topology cell count.');
  }
  const longitudes: number[] = [];
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    if (membership[cell] !== 1) continue;
    longitudes.push(normalize360(topology.longitudes[cell] * 180 / Math.PI));
  }
  if (longitudes.length === 0) {
    throw new Error('Width-driven geographic scale requires at least one selected topology cell.');
  }
  if (longitudes.length === 1) {
    return Math.max(360 / Math.max(4, topology.resolution * 4), 0.25);
  }
  longitudes.sort((left, right) => left - right);
  let largestGap = 0;
  for (let index = 0; index < longitudes.length; index += 1) {
    const current = longitudes[index];
    const next = index === longitudes.length - 1 ? longitudes[0] + 360 : longitudes[index + 1];
    largestGap = Math.max(largestGap, next - current);
  }
  return Math.max(0.25, 360 - largestGap);
}

function niceScaleAtOrAbove(value: number, maximumExclusive = Number.POSITIVE_INFINITY): number {
  const candidates = [...NICE_SCALE_MILES]
    .filter((candidate) => candidate >= value - 1e-6 && candidate < maximumExclusive - 1e-6)
    .sort((left, right) => left - right);
  return candidates[0] ?? round(value, 4);
}

function cleanTargetColumns(value: number | undefined): number {
  return Math.max(8, Math.round(value ?? GEOGRAPHIC_DRILLDOWN_TARGET_COLUMNS));
}

function normalize360(value: number): number {
  return ((value % 360) + 360) % 360;
}

function round(value: number, digits: number): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

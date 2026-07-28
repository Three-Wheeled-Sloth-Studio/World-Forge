import {
  cubedSphereCellForLonLat,
  type CubedSphereTopology,
} from '@world-forge/shared';
import {
  GEOGRAPHIC_ADAPTIVE_SCALE_VERSION,
  type GeographicAdaptiveHexScale,
  type GeographicHierarchyMapExtent,
} from '@world-forge/shared/geographicHierarchy';

const TARGET_VIEWPORT_COLUMNS = 20;
const TARGET_VIEWPORT_ROWS = 20;
const MINIMUM_VIEWPORT_COLUMNS = 10;
const MINIMUM_VIEWPORT_ROWS = 10;
const MAXIMUM_VIEWPORT_COLUMNS = 50;
const MAXIMUM_VIEWPORT_ROWS = 50;
const DEFAULT_CONTEXT_PADDING_HEXES = 2;
const RADIANS_TO_DEGREES = 180 / Math.PI;
const DEGREES_TO_RADIANS = Math.PI / 180;

const REFERENCE_SCALE_LADDER_MILES = [
  4000, 3000, 2000, 1500, 1000, 750, 500, 375, 250, 180, 125, 90, 60, 45,
  30, 24, 18, 12, 9, 6, 4, 3, 2, 1, 0.5,
] as const;

export type GeographicAdaptiveScaleResult = {
  scale: GeographicAdaptiveHexScale;
  extent: GeographicHierarchyMapExtent;
};

export type GeographicAdaptiveScaleOptions = {
  contextPaddingHexes?: number;
  targetViewportColumns?: number;
  targetViewportRows?: number;
  minimumViewportColumns?: number;
  minimumViewportRows?: number;
  maximumViewportColumns?: number;
  maximumViewportRows?: number;
  maximumScaleMiles?: number;
  minimumScaleMiles?: number;
};

export function deriveAdaptiveGeographicScale(
  topology: CubedSphereTopology,
  planetCircumferenceMiles: number,
  parentMembership: Uint8Array,
  options: GeographicAdaptiveScaleOptions = {},
): GeographicAdaptiveScaleResult {
  if (parentMembership.length !== topology.cellCount) {
    throw new Error('Adaptive geographic scale membership must match the topology cell count.');
  }
  const selectedCells = collectSelectedCells(parentMembership);
  if (selectedCells.length === 0) {
    throw new Error('Adaptive geographic scale requires at least one selected topology cell.');
  }

  const targetColumns = cleanInteger(options.targetViewportColumns, TARGET_VIEWPORT_COLUMNS, 1);
  const targetRows = cleanInteger(options.targetViewportRows, TARGET_VIEWPORT_ROWS, 1);
  const minimumColumns = cleanInteger(options.minimumViewportColumns, MINIMUM_VIEWPORT_COLUMNS, 1);
  const minimumRows = cleanInteger(options.minimumViewportRows, MINIMUM_VIEWPORT_ROWS, 1);
  const maximumColumns = cleanInteger(options.maximumViewportColumns, MAXIMUM_VIEWPORT_COLUMNS, minimumColumns);
  const maximumRows = cleanInteger(options.maximumViewportRows, MAXIMUM_VIEWPORT_ROWS, minimumRows);
  const padding = cleanInteger(options.contextPaddingHexes, DEFAULT_CONTEXT_PADDING_HEXES, 0);
  const bounds = membershipBounds(topology, selectedCells);
  const ladder = adaptiveScaleLadder(
    planetCircumferenceMiles,
    options.minimumScaleMiles,
    options.maximumScaleMiles,
  );

  let best: CandidateResult | null = null;
  let coarsest: Omit<CandidateResult, 'exactParentHexCount' | 'score'> | null = null;
  for (const nominalMiles of ladder) {
    const dimensions = worldHexDimensions(planetCircumferenceMiles, nominalMiles);
    const extent = extentForBounds(
      bounds,
      dimensions.columns,
      dimensions.rows,
      padding,
      minimumColumns,
      minimumRows,
      maximumColumns,
      maximumRows,
    );
    coarsest ??= { nominalMiles, dimensions, extent };

    // An over-fine candidate already violates the footprint contract. Exact
    // membership sampling across that enormous rectangle cannot make it valid,
    // so reject it before doing potentially millions of topology lookups.
    if (!extent.selectedMembershipFitsMaximum) continue;

    const exactParentHexCount = countExactParentHexes(
      topology,
      parentMembership,
      dimensions.columns,
      dimensions.rows,
      extent,
    );
    const score = candidateScore(
      extent,
      targetColumns,
      targetRows,
      maximumColumns,
      maximumRows,
      exactParentHexCount,
    );
    const candidate = { nominalMiles, dimensions, extent, exactParentHexCount, score };
    if (!best || candidate.score < best.score || (
      candidate.score === best.score && candidate.nominalMiles < best.nominalMiles
    )) best = candidate;
  }

  // The coarsest candidate is bounded by the planet grid itself and is safe to
  // sample. Keep it as an explicit no-crop fallback for unusual custom limits.
  if (!best && coarsest) {
    const exactParentHexCount = countExactParentHexes(
      topology,
      parentMembership,
      coarsest.dimensions.columns,
      coarsest.dimensions.rows,
      coarsest.extent,
    );
    best = {
      ...coarsest,
      exactParentHexCount,
      score: candidateScore(
        coarsest.extent,
        targetColumns,
        targetRows,
        maximumColumns,
        maximumRows,
        exactParentHexCount,
      ),
    };
  }

  if (!best) throw new Error('Adaptive geographic scale could not select a scale.');
  const verticalSpacingMiles = best.nominalMiles * Math.sqrt(3) / 2;
  const scale: GeographicAdaptiveHexScale = {
    modelVersion: GEOGRAPHIC_ADAPTIVE_SCALE_VERSION,
    id: adaptiveScaleId(best.nominalMiles),
    nominalHexWidthMiles: best.nominalMiles,
    verticalSpacingMiles: round(verticalSpacingMiles, 4),
    worldColumns: best.dimensions.columns,
    worldRows: best.dimensions.rows,
    targetViewportColumns: targetColumns,
    targetViewportRows: targetRows,
    minimumViewportColumns: minimumColumns,
    minimumViewportRows: minimumRows,
    maximumViewportColumns: maximumColumns,
    maximumViewportRows: maximumRows,
    exactParentHexCount: best.exactParentHexCount,
    contextualHexCount: best.extent.columns * best.extent.rows,
    origin: 'world-equirectangular-pointy-odd-r',
    idFormat: `${adaptiveScaleId(best.nominalMiles)}:q{q}:r{r}`,
  };

  return { scale, extent: best.extent };
}

export function membershipMaskFromRegionIndex(
  membership: Uint16Array,
  regionIndex: number,
): Uint8Array {
  const mask = new Uint8Array(membership.length);
  for (let cell = 0; cell < membership.length; cell += 1) {
    if (membership[cell] === regionIndex) mask[cell] = 1;
  }
  return mask;
}

export function membershipMaskFromCellIndexes(
  cellCount: number,
  indexes: Iterable<number>,
): Uint8Array {
  const mask = new Uint8Array(cellCount);
  for (const index of indexes) {
    if (index >= 0 && index < cellCount) mask[index] = 1;
  }
  return mask;
}

export function worldHexCenter(
  q: number,
  r: number,
  worldColumns: number,
  worldRows: number,
): { latitude: number; longitude: number } {
  const latitude = 90 - ((r + 0.5) / worldRows) * 180;
  const rowOffset = (r & 1) === 1 ? 0.5 : 0;
  const longitude = normalizeLongitude(-180 + ((q + rowOffset + 0.5) / worldColumns) * 360);
  return { latitude, longitude };
}

export function worldHexCoordinateForLatLon(
  latitude: number,
  longitude: number,
  worldColumns: number,
  worldRows: number,
): { q: number; r: number } {
  const r = clampInteger(
    Math.floor(((90 - clamp(latitude, -90, 90)) / 180) * worldRows),
    0,
    worldRows - 1,
  );
  const rowOffset = (r & 1) === 1 ? 0.5 : 0;
  const normalizedColumn = ((normalizeLongitude(longitude) + 180) / 360) * worldColumns;
  const q = mod(Math.floor(normalizedColumn - rowOffset), worldColumns);
  return { q, r };
}

type CandidateResult = {
  nominalMiles: number;
  dimensions: { columns: number; rows: number };
  extent: GeographicHierarchyMapExtent;
  exactParentHexCount: number;
  score: number;
};

function adaptiveScaleLadder(
  circumferenceMiles: number,
  minimumScaleMiles?: number,
  maximumScaleMiles?: number,
): number[] {
  const minimum = Math.max(0.1, minimumScaleMiles ?? 0.5);
  const maximum = Math.max(minimum, maximumScaleMiles ?? Math.max(4000, circumferenceMiles / 4));
  const values = new Set<number>();
  for (const value of REFERENCE_SCALE_LADDER_MILES) {
    if (value >= minimum && value <= maximum) values.add(value);
  }
  for (let power = -1; power <= 5; power += 1) {
    for (const multiplier of [1, 1.5, 2, 2.5, 3, 4, 5, 7.5]) {
      const value = multiplier * 10 ** power;
      if (value >= minimum && value <= maximum) values.add(round(value, 4));
    }
  }
  values.add(round(minimum, 4));
  values.add(round(maximum, 4));
  return [...values].sort((left, right) => right - left);
}

function membershipBounds(
  topology: CubedSphereTopology,
  selectedCells: number[],
): {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
  wrapsLongitude: boolean;
} {
  let minLatitude = Number.POSITIVE_INFINITY;
  let maxLatitude = Number.NEGATIVE_INFINITY;
  const longitudes = selectedCells.map((cell) => {
    const latitude = topology.latitudes[cell] * RADIANS_TO_DEGREES;
    minLatitude = Math.min(minLatitude, latitude);
    maxLatitude = Math.max(maxLatitude, latitude);
    return normalize360(topology.longitudes[cell] * RADIANS_TO_DEGREES);
  }).sort((left, right) => left - right);

  if (longitudes.length === 1) {
    const longitude = normalizeLongitude(longitudes[0]);
    return { minLatitude, maxLatitude, minLongitude: longitude, maxLongitude: longitude, wrapsLongitude: false };
  }

  let largestGap = Number.NEGATIVE_INFINITY;
  let gapEndIndex = 0;
  for (let index = 0; index < longitudes.length; index += 1) {
    const current = longitudes[index];
    const next = index === longitudes.length - 1 ? longitudes[0] + 360 : longitudes[index + 1];
    const gap = next - current;
    if (gap > largestGap) {
      largestGap = gap;
      gapEndIndex = index;
    }
  }
  const arcStart = longitudes[(gapEndIndex + 1) % longitudes.length];
  const arcEnd = longitudes[gapEndIndex];
  const minLongitude = normalizeLongitude(arcStart);
  const maxLongitude = normalizeLongitude(arcEnd);
  return {
    minLatitude,
    maxLatitude,
    minLongitude,
    maxLongitude,
    wrapsLongitude: minLongitude > maxLongitude,
  };
}

function extentForBounds(
  bounds: {
    minLatitude: number;
    maxLatitude: number;
    minLongitude: number;
    maxLongitude: number;
    wrapsLongitude: boolean;
  },
  worldColumns: number,
  worldRows: number,
  contextPaddingHexes: number,
  minimumColumns: number,
  minimumRows: number,
  maximumColumns: number,
  maximumRows: number,
): GeographicHierarchyMapExtent {
  const north = worldHexCoordinateForLatLon(bounds.maxLatitude, bounds.minLongitude, worldColumns, worldRows);
  const south = worldHexCoordinateForLatLon(bounds.minLatitude, bounds.maxLongitude, worldColumns, worldRows);
  let qMin = north.q;
  let qMax = south.q;
  let rMin = Math.min(north.r, south.r);
  let rMax = Math.max(north.r, south.r);
  let selectedColumns = wrappedColumnCount(qMin, qMax, worldColumns, bounds.wrapsLongitude);
  let selectedRows = rMax - rMin + 1;

  const paddedColumns = Math.max(minimumColumns, selectedColumns + contextPaddingHexes * 2);
  const paddedRows = Math.max(minimumRows, selectedRows + contextPaddingHexes * 2);
  const contextColumns = Math.min(
    worldColumns,
    Math.max(selectedColumns, Math.min(maximumColumns, paddedColumns)),
  );
  const contextRows = Math.min(
    worldRows,
    Math.max(selectedRows, Math.min(maximumRows, paddedRows)),
  );
  const qPadding = Math.max(0, Math.floor((contextColumns - selectedColumns) / 2));
  const rPadding = Math.max(0, Math.floor((contextRows - selectedRows) / 2));
  qMin = mod(qMin - qPadding, worldColumns);
  qMax = mod(qMin + contextColumns - 1, worldColumns);
  rMin = Math.max(0, rMin - rPadding);
  rMax = Math.min(worldRows - 1, rMin + contextRows - 1);
  if (rMax - rMin + 1 < contextRows) rMin = Math.max(0, rMax - contextRows + 1);

  selectedColumns = wrappedColumnCount(north.q, south.q, worldColumns, bounds.wrapsLongitude);
  selectedRows = Math.abs(south.r - north.r) + 1;
  const minCenter = worldHexCenter(qMin, rMax, worldColumns, worldRows);
  const maxCenter = worldHexCenter(qMax, rMin, worldColumns, worldRows);

  return {
    minLatitude: clamp(minCenter.latitude - 90 / worldRows, -90, 90),
    maxLatitude: clamp(maxCenter.latitude + 90 / worldRows, -90, 90),
    minLongitude: normalizeLongitude(minCenter.longitude - 180 / worldColumns),
    maxLongitude: normalizeLongitude(maxCenter.longitude + 180 / worldColumns),
    wrapsLongitude: qMin > qMax,
    qMin,
    qMax,
    rMin,
    rMax,
    columns: wrappedColumnCount(qMin, qMax, worldColumns, qMin > qMax),
    rows: rMax - rMin + 1,
    contextPaddingHexes,
    selectedMembershipFitsMaximum: selectedColumns <= maximumColumns && selectedRows <= maximumRows,
  };
}

function countExactParentHexes(
  topology: CubedSphereTopology,
  membership: Uint8Array,
  worldColumns: number,
  worldRows: number,
  extent: GeographicHierarchyMapExtent,
): number {
  let count = 0;
  for (let r = extent.rMin; r <= extent.rMax; r += 1) {
    for (let offset = 0; offset < extent.columns; offset += 1) {
      const q = mod(extent.qMin + offset, worldColumns);
      const center = worldHexCenter(q, r, worldColumns, worldRows);
      const topologyCell = cubedSphereCellForLonLat(
        topology,
        center.longitude * DEGREES_TO_RADIANS,
        center.latitude * DEGREES_TO_RADIANS,
      );
      if (membership[topologyCell] === 1) count += 1;
    }
  }
  return count;
}

function candidateScore(
  extent: GeographicHierarchyMapExtent,
  targetColumns: number,
  targetRows: number,
  maximumColumns: number,
  maximumRows: number,
  exactParentHexCount: number,
): number {
  const columnError = Math.abs(Math.log(Math.max(1, extent.columns) / targetColumns));
  const rowError = Math.abs(Math.log(Math.max(1, extent.rows) / targetRows));
  const overflow = Math.max(0, extent.columns - maximumColumns) + Math.max(0, extent.rows - maximumRows);
  const noCoveragePenalty = exactParentHexCount === 0 ? 1000 : 0;
  const fitPenalty = extent.selectedMembershipFitsMaximum ? 0 : 100 + overflow * 10;
  return round(columnError + rowError + fitPenalty + noCoveragePenalty, 8);
}

function worldHexDimensions(
  circumferenceMiles: number,
  nominalHexWidthMiles: number,
): { columns: number; rows: number } {
  const columns = Math.max(1, Math.round(circumferenceMiles / nominalHexWidthMiles));
  const verticalSpacingMiles = nominalHexWidthMiles * Math.sqrt(3) / 2;
  const rows = Math.max(1, Math.round((circumferenceMiles / 2) / verticalSpacingMiles));
  return { columns, rows };
}

function collectSelectedCells(membership: Uint8Array): number[] {
  const selected: number[] = [];
  for (let cell = 0; cell < membership.length; cell += 1) {
    if (membership[cell] === 1) selected.push(cell);
  }
  return selected;
}

function wrappedColumnCount(
  qMin: number,
  qMax: number,
  worldColumns: number,
  wraps: boolean,
): number {
  if (!wraps && qMax >= qMin) return qMax - qMin + 1;
  return worldColumns - qMin + qMax + 1;
}

function adaptiveScaleId(nominalMiles: number): string {
  const value = Number.isInteger(nominalMiles) ? String(nominalMiles) : String(nominalMiles).replace('.', 'p');
  return `world-adaptive-${value}mi-v1`;
}

function cleanInteger(value: number | undefined, fallback: number, minimum: number): number {
  return Math.max(minimum, Math.round(value ?? fallback));
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, Math.round(value)));
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function normalize360(longitude: number): number {
  let value = longitude % 360;
  if (value < 0) value += 360;
  return value;
}

function normalizeLongitude(longitude: number): number {
  let value = longitude;
  while (value < -180) value += 360;
  while (value > 180) value -= 360;
  return value;
}

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function round(value: number, places: number): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

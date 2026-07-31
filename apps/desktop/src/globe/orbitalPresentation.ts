import type { OrbitalPresentationBody } from '@world-forge/shared';

export type OrbitalPoint = { x: number; y: number; z: number };
export type DeterministicStarDirection = OrbitalPoint & { brightness: number };

const TAU = Math.PI * 2;

export function orbitalPositionAtDays(body: OrbitalPresentationBody, simulationDays: number): OrbitalPoint {
  const periodDays = finitePositive(body.orbitalPeriodDays, 1);
  const eccentricity = clamp(body.eccentricity, 0, 0.92);
  const meanAnomaly = normalizeRadians(body.phaseAtEpochRad + TAU * simulationDays / periodDays);
  let eccentricAnomaly = meanAnomaly;
  for (let iteration = 0; iteration < 6; iteration += 1) {
    const denominator = Math.max(0.08, 1 - eccentricity * Math.cos(eccentricAnomaly));
    eccentricAnomaly -= (eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly) / denominator;
  }

  const scale = finitePositive(body.semiMajorAxisAu ?? body.semiMajorAxisParentRadii ?? 1, 1);
  const x = scale * (Math.cos(eccentricAnomaly) - eccentricity);
  const y = scale * Math.sqrt(Math.max(0.001, 1 - eccentricity * eccentricity)) * Math.sin(eccentricAnomaly);
  return rotateOrbitalPoint(
    { x, y, z: 0 },
    body.argumentOfPeriapsisDeg,
    body.inclinationDeg,
    body.longitudeAscendingNodeDeg
  );
}

export function relativeOrbitalPositionAtDays(
  body: OrbitalPresentationBody,
  primary: OrbitalPresentationBody,
  simulationDays: number
): OrbitalPoint {
  const bodyPosition = orbitalPositionAtDays(body, simulationDays);
  const primaryPosition = orbitalPositionAtDays(primary, simulationDays);
  return {
    x: bodyPosition.x - primaryPosition.x,
    y: bodyPosition.y - primaryPosition.y,
    z: bodyPosition.z - primaryPosition.z
  };
}

export function displayRadiusForMoon(body: OrbitalPresentationBody): number {
  const parentRadii = finitePositive(body.semiMajorAxisParentRadii ?? 6, 6);
  return clamp(1.36 + Math.log10(parentRadii + 1) * 0.62, 1.55, 3.25);
}

export function displayRadiusForVisibleBody(body: OrbitalPresentationBody): number {
  return clamp(4.6 + Math.max(0, body.orbitalOrder) * 0.62, 5, 9.5);
}

export function displaySizeForBody(body: OrbitalPresentationBody): number {
  const base = body.kind === 'moon' ? 0.035 : body.kind === 'gas-giant' ? 0.12 : 0.065;
  const multiplier = body.kind === 'moon' ? 0.045 : 0.052;
  return clamp(base + Math.max(0, body.sizeClass) * multiplier, body.kind === 'moon' ? 0.045 : 0.075, 0.24);
}

export function deterministicStarDirections(seed: string, count: number): DeterministicStarDirection[] {
  const directions: DeterministicStarDirection[] = [];
  const total = Math.max(0, Math.floor(count));
  for (let index = 0; index < total; index += 1) {
    const u = unit(seed, `${index}:u`);
    const v = unit(seed, `${index}:v`);
    const z = 1 - 2 * u;
    const radial = Math.sqrt(Math.max(0, 1 - z * z));
    const angle = TAU * v;
    directions.push({
      x: radial * Math.cos(angle),
      y: radial * Math.sin(angle),
      z,
      brightness: 0.42 + unit(seed, `${index}:brightness`) * 0.58
    });
  }
  return directions;
}

function rotateOrbitalPoint(point: OrbitalPoint, periapsisDeg: number, inclinationDeg: number, nodeDeg: number): OrbitalPoint {
  const periapsis = degreesToRadians(periapsisDeg);
  const inclination = degreesToRadians(inclinationDeg);
  const node = degreesToRadians(nodeDeg);

  const periX = point.x * Math.cos(periapsis) - point.y * Math.sin(periapsis);
  const periY = point.x * Math.sin(periapsis) + point.y * Math.cos(periapsis);
  const inclinedY = periY * Math.cos(inclination);
  const inclinedZ = periY * Math.sin(inclination);
  return {
    x: periX * Math.cos(node) - inclinedY * Math.sin(node),
    y: periX * Math.sin(node) + inclinedY * Math.cos(node),
    z: inclinedZ
  };
}

function unit(seed: string, label: string): number {
  let hash = 2166136261;
  const text = `${seed}:${label}`;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function normalizeRadians(value: number): number {
  return ((value % TAU) + TAU) % TAU;
}

function degreesToRadians(value: number): number {
  return Number.isFinite(value) ? value * Math.PI / 180 : 0;
}

function finitePositive(value: number | null | undefined, fallback: number): number {
  return Number.isFinite(value) && (value ?? 0) > 0 ? value as number : fallback;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

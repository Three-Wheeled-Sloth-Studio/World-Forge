export type UnitVector3 = {
  x: number;
  y: number;
  z: number;
};

export type RigidSphericalRotation = {
  axisX: number;
  axisY: number;
  axisZ: number;
  angleRadians: number;
};

const EPSILON = 1e-9;

export function normalizeUnitVector(vector: UnitVector3): UnitVector3 {
  const length = Math.max(EPSILON, Math.hypot(vector.x, vector.y, vector.z));
  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length
  };
}

export function buildTangentSphericalRotation(
  centroid: UnitVector3,
  motionEast: number,
  motionNorth: number,
  angleRadians: number
): RigidSphericalRotation {
  const center = normalizeUnitVector(centroid);
  const longitude = Math.atan2(center.z, center.x);
  const latitude = Math.asin(Math.max(-1, Math.min(1, center.y)));
  const east = {
    x: -Math.sin(longitude),
    y: 0,
    z: Math.cos(longitude)
  };
  const north = {
    x: -Math.sin(latitude) * Math.cos(longitude),
    y: Math.cos(latitude),
    z: -Math.sin(latitude) * Math.sin(longitude)
  };
  const tangent = normalizeUnitVector({
    x: east.x * motionEast + north.x * motionNorth,
    y: east.y * motionEast + north.y * motionNorth,
    z: east.z * motionEast + north.z * motionNorth
  });
  const axis = normalizeUnitVector(cross(center, tangent));
  return {
    axisX: axis.x,
    axisY: axis.y,
    axisZ: axis.z,
    angleRadians: Number.isFinite(angleRadians) ? angleRadians : 0
  };
}

export function buildRotationBetweenUnitVectors(start: UnitVector3, end: UnitVector3): RigidSphericalRotation {
  const from = normalizeUnitVector(start);
  const to = normalizeUnitVector(end);
  const dot = Math.max(-1, Math.min(1, dotProduct(from, to)));
  const angleRadians = Math.acos(dot);
  const rawAxis = cross(from, to);
  const axisLength = Math.hypot(rawAxis.x, rawAxis.y, rawAxis.z);
  if (axisLength > EPSILON) {
    const axis = normalizeUnitVector(rawAxis);
    return { axisX: axis.x, axisY: axis.y, axisZ: axis.z, angleRadians };
  }
  if (dot > 0) return { axisX: 0, axisY: 1, axisZ: 0, angleRadians: 0 };
  const fallback = Math.abs(from.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  const axis = normalizeUnitVector(cross(from, fallback));
  return { axisX: axis.x, axisY: axis.y, axisZ: axis.z, angleRadians };
}

export function rotateUnitVector(vector: UnitVector3, rotation: RigidSphericalRotation): UnitVector3 {
  const source = normalizeUnitVector(vector);
  if (Math.abs(rotation.angleRadians) <= EPSILON) return source;
  const axis = normalizeUnitVector({ x: rotation.axisX, y: rotation.axisY, z: rotation.axisZ });
  const cosine = Math.cos(rotation.angleRadians);
  const sine = Math.sin(rotation.angleRadians);
  const axisCrossSource = cross(axis, source);
  const axisDotSource = dotProduct(axis, source);
  return normalizeUnitVector({
    x: source.x * cosine + axisCrossSource.x * sine + axis.x * axisDotSource * (1 - cosine),
    y: source.y * cosine + axisCrossSource.y * sine + axis.y * axisDotSource * (1 - cosine),
    z: source.z * cosine + axisCrossSource.z * sine + axis.z * axisDotSource * (1 - cosine)
  });
}

export function unitVectorToLonLat(vector: UnitVector3): { longitude: number; latitude: number } {
  const unit = normalizeUnitVector(vector);
  return {
    longitude: Math.atan2(unit.z, unit.x),
    latitude: Math.asin(Math.max(-1, Math.min(1, unit.y)))
  };
}

export function angularDistanceBetweenUnitVectors(left: UnitVector3, right: UnitVector3): number {
  const a = normalizeUnitVector(left);
  const b = normalizeUnitVector(right);
  return Math.acos(Math.max(-1, Math.min(1, dotProduct(a, b))));
}

function dotProduct(left: UnitVector3, right: UnitVector3): number {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

function cross(left: UnitVector3, right: UnitVector3): UnitVector3 {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x
  };
}

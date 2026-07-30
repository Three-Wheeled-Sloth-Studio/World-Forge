import {
  buildCubedSphereTopology,
  cubedSphereCellIndex,
  type CubedSphereTopology
} from '@world-forge/shared';

export type TopologyScaleFieldOptions = {
  referenceResolution?: number;
  passes?: number;
  blend?: number;
};

export function broadenTopologySignal(
  source: Float32Array,
  topology: CubedSphereTopology,
  options: TopologyScaleFieldOptions = {}
): Float32Array {
  const referenceResolution = Math.max(
    16,
    Math.min(topology.resolution, Math.round(options.referenceResolution ?? 64))
  );
  const passes = Math.max(0, Math.round(options.passes ?? 7));
  const blend = Math.max(0, Math.min(1, options.blend ?? 0.5));
  if (topology.resolution === referenceResolution) {
    const result = new Float32Array(source);
    smoothTopologyLayer(result, topology, passes, blend);
    return result;
  }

  const referenceTopology = buildCubedSphereTopology(referenceResolution);
  const reference = reduceToReferenceScale(source, topology.resolution, referenceResolution);
  smoothTopologyLayer(reference, referenceTopology, passes, blend);
  const result = expandFromReferenceScale(reference, topology.resolution, referenceResolution);
  smoothTopologyLayer(result, topology, 2, 0.35);
  return result;
}

export function stabilizeTopologyField(
  source: Float32Array,
  topology: CubedSphereTopology,
  mask: Uint8Array,
  options: TopologyScaleFieldOptions = {}
): void {
  const referenceResolution = Math.max(
    16,
    Math.min(topology.resolution, Math.round(options.referenceResolution ?? 64))
  );
  const passes = Math.max(0, Math.round(options.passes ?? 4));
  const blend = Math.max(0, Math.min(1, options.blend ?? 0.9));
  let candidate: Float32Array;
  let candidateMask: Uint8Array;
  let candidateTopology: CubedSphereTopology;
  if (topology.resolution === referenceResolution) {
    candidate = new Float32Array(source);
    candidateMask = new Uint8Array(mask);
    candidateTopology = topology;
  } else {
    candidate = reduceAverageToReferenceScale(source, topology.resolution, referenceResolution);
    candidateMask = reduceMaskToReferenceScale(mask, topology.resolution, referenceResolution);
    candidateTopology = buildCubedSphereTopology(referenceResolution);
  }
  propagateIntoMaskedCorridors(candidate, candidateMask, candidateTopology, passes);
  if (topology.resolution !== referenceResolution) {
    candidate = expandFromReferenceScale(candidate, topology.resolution, referenceResolution);
    smoothTopologyLayer(candidate, topology, 2, 0.35);
  }
  for (let cell = 0; cell < source.length; cell += 1) {
    if (mask[cell]) source[cell] = lerp(source[cell], candidate[cell], blend);
  }
}

function reduceMaskToReferenceScale(
  source: Uint8Array,
  sourceResolution: number,
  referenceResolution: number
): Uint8Array {
  const result = new Uint8Array(6 * referenceResolution * referenceResolution);
  const sourceFaceSize = sourceResolution * sourceResolution;
  for (let cell = 0; cell < source.length; cell += 1) {
    if (!source[cell]) continue;
    const face = Math.floor(cell / sourceFaceSize);
    const local = cell - face * sourceFaceSize;
    const x = local % sourceResolution;
    const y = Math.floor(local / sourceResolution);
    const referenceX = Math.min(referenceResolution - 1, Math.floor((x / sourceResolution) * referenceResolution));
    const referenceY = Math.min(referenceResolution - 1, Math.floor((y / sourceResolution) * referenceResolution));
    result[cubedSphereCellIndex(face, referenceX, referenceY, referenceResolution)] = 1;
  }
  return result;
}

function propagateIntoMaskedCorridors(
  layer: Float32Array,
  mask: Uint8Array,
  topology: CubedSphereTopology,
  passes: number
): void {
  for (let pass = 0; pass < passes; pass += 1) {
    const source = new Float32Array(layer);
    for (let cell = 0; cell < layer.length; cell += 1) {
      if (!mask[cell]) continue;
      let candidate = source[cell];
      for (let direction = 0; direction < 4; direction += 1) {
        const neighbor = topology.neighbors[cell * 4 + direction];
        if (neighbor >= 0) candidate = Math.max(candidate, source[neighbor]);
      }
      layer[cell] = candidate;
    }
  }
}

function reduceToReferenceScale(
  source: Float32Array,
  sourceResolution: number,
  referenceResolution: number
): Float32Array {
  const result = new Float32Array(6 * referenceResolution * referenceResolution);
  const sourceFaceSize = sourceResolution * sourceResolution;
  for (let cell = 0; cell < source.length; cell += 1) {
    const value = source[cell];
    if (value === 0) continue;
    const face = Math.floor(cell / sourceFaceSize);
    const local = cell - face * sourceFaceSize;
    const x = local % sourceResolution;
    const y = Math.floor(local / sourceResolution);
    const referenceX = Math.min(referenceResolution - 1, Math.floor((x / sourceResolution) * referenceResolution));
    const referenceY = Math.min(referenceResolution - 1, Math.floor((y / sourceResolution) * referenceResolution));
    const referenceCell = cubedSphereCellIndex(face, referenceX, referenceY, referenceResolution);
    if (Math.abs(value) > Math.abs(result[referenceCell])) result[referenceCell] = value;
  }
  return result;
}

function reduceAverageToReferenceScale(
  source: Float32Array,
  sourceResolution: number,
  referenceResolution: number
): Float32Array {
  const result = new Float32Array(6 * referenceResolution * referenceResolution);
  const counts = new Uint32Array(result.length);
  const sourceFaceSize = sourceResolution * sourceResolution;
  for (let cell = 0; cell < source.length; cell += 1) {
    const face = Math.floor(cell / sourceFaceSize);
    const local = cell - face * sourceFaceSize;
    const x = local % sourceResolution;
    const y = Math.floor(local / sourceResolution);
    const referenceX = Math.min(referenceResolution - 1, Math.floor((x / sourceResolution) * referenceResolution));
    const referenceY = Math.min(referenceResolution - 1, Math.floor((y / sourceResolution) * referenceResolution));
    const referenceCell = cubedSphereCellIndex(face, referenceX, referenceY, referenceResolution);
    result[referenceCell] += source[cell];
    counts[referenceCell] += 1;
  }
  for (let cell = 0; cell < result.length; cell += 1) {
    result[cell] /= Math.max(1, counts[cell]);
  }
  return result;
}

function expandFromReferenceScale(
  source: Float32Array,
  targetResolution: number,
  referenceResolution: number
): Float32Array {
  const result = new Float32Array(6 * targetResolution * targetResolution);
  const targetFaceSize = targetResolution * targetResolution;
  for (let cell = 0; cell < result.length; cell += 1) {
    const face = Math.floor(cell / targetFaceSize);
    const local = cell - face * targetFaceSize;
    const x = local % targetResolution;
    const y = Math.floor(local / targetResolution);
    const referenceX = ((x + 0.5) / targetResolution) * referenceResolution - 0.5;
    const referenceY = ((y + 0.5) / targetResolution) * referenceResolution - 0.5;
    result[cell] = bilinearFaceSample(source, face, referenceX, referenceY, referenceResolution);
  }
  return result;
}

function bilinearFaceSample(
  source: Float32Array,
  face: number,
  x: number,
  y: number,
  resolution: number
): number {
  const x0 = Math.max(0, Math.min(resolution - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(resolution - 1, Math.floor(y)));
  const x1 = Math.min(resolution - 1, x0 + 1);
  const y1 = Math.min(resolution - 1, y0 + 1);
  const tx = Math.max(0, Math.min(1, x - Math.floor(x)));
  const ty = Math.max(0, Math.min(1, y - Math.floor(y)));
  const top = lerp(
    source[cubedSphereCellIndex(face, x0, y0, resolution)],
    source[cubedSphereCellIndex(face, x1, y0, resolution)],
    tx
  );
  const bottom = lerp(
    source[cubedSphereCellIndex(face, x0, y1, resolution)],
    source[cubedSphereCellIndex(face, x1, y1, resolution)],
    tx
  );
  return lerp(top, bottom, ty);
}

function smoothTopologyLayer(
  layer: Float32Array,
  topology: CubedSphereTopology,
  passes: number,
  blend: number
): void {
  for (let pass = 0; pass < passes; pass += 1) {
    const source = new Float32Array(layer);
    for (let cell = 0; cell < layer.length; cell += 1) {
      let sum = source[cell];
      let count = 1;
      for (let direction = 0; direction < 4; direction += 1) {
        const neighbor = topology.neighbors[cell * 4 + direction];
        if (neighbor < 0) continue;
        sum += source[neighbor];
        count += 1;
      }
      layer[cell] = lerp(source[cell], sum / count, blend);
    }
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

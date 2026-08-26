import {
  buildCubedSphereTopology,
  cubedSphereCellIndex,
  type CubedSphereTopology
} from '@world-forge/shared';
import {
  generationPerformanceTracingEnabled,
  traceGenerationPerformance
} from './generationPerformanceTrace';

export type TopologyScaleFieldOptions = {
  referenceResolution?: number;
  passes?: number;
  blend?: number;
  activeMaskValue?: 0 | 1;
};

const referenceTopologyCache = new Map<number, CubedSphereTopology>();

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

  const referenceTopology = referenceTopologyForResolution(referenceResolution);
  const activeCells = generationPerformanceTracingEnabled() ? countActiveFloatCells(source) : undefined;
  const reference = traceGenerationPerformance(
    'reference-scale-signal-reduction',
    {
      topologyCells: topology.cellCount,
      activeCells,
      fullTopologyPasses: 1,
      allocatedBufferBytes: referenceTopology.cellCount * Float32Array.BYTES_PER_ELEMENT
    },
    () => reduceToReferenceScale(source, topology.resolution, referenceResolution)
  );
  traceGenerationPerformance(
    'reference-scale-signal-smoothing',
    {
      topologyCells: referenceTopology.cellCount,
      activeCells,
      fullTopologyPasses: passes,
      allocatedBufferBytes: referenceTopology.cellCount * Float32Array.BYTES_PER_ELEMENT * passes
    },
    () => smoothTopologyLayer(reference, referenceTopology, passes, blend)
  );
  const result = traceGenerationPerformance(
    'authoritative-topology-signal-expansion',
    {
      topologyCells: topology.cellCount,
      activeCells,
      fullTopologyPasses: 1,
      allocatedBufferBytes: topology.cellCount * Float32Array.BYTES_PER_ELEMENT
    },
    () => expandFromReferenceScale(reference, topology.resolution, referenceResolution)
  );
  traceGenerationPerformance(
    'authoritative-topology-post-expansion-smoothing',
    {
      topologyCells: topology.cellCount,
      activeCells,
      fullTopologyPasses: 2,
      allocatedBufferBytes: topology.cellCount * Float32Array.BYTES_PER_ELEMENT * 2
    },
    () => smoothTopologyLayer(result, topology, 2, 0.35)
  );
  return result;
}

/**
 * Diffuses a generated signal within a masked surface at a fixed reference
 * scale. The authoritative field is visited only for reduction and expansion,
 * so propagation distance and cost remain stable as topology resolution grows.
 */
export function spreadMaskedTopologySignal(
  source: Float32Array,
  topology: CubedSphereTopology,
  mask: Uint8Array,
  options: TopologyScaleFieldOptions = {}
): Float32Array {
  const referenceResolution = Math.max(
    16,
    Math.min(topology.resolution, Math.round(options.referenceResolution ?? 64))
  );
  const passes = Math.max(0, Math.round(options.passes ?? 5));
  const blend = Math.max(0, Math.min(1, options.blend ?? 0.65));
  const activeMaskValue = options.activeMaskValue ?? 1;

  if (topology.resolution === referenceResolution) {
    const result = new Float32Array(source);
    smoothMaskedTopologyLayer(result, mask, activeMaskValue, topology, passes, blend);
    return result;
  }

  const referenceTopology = referenceTopologyForResolution(referenceResolution);
  const reduced = traceGenerationPerformance(
    'reference-scale-masked-signal-reduction',
    {
      topologyCells: topology.cellCount,
      fullTopologyPasses: 1,
      allocatedBufferBytes: referenceTopology.cellCount
        * (Float32Array.BYTES_PER_ELEMENT + Uint32Array.BYTES_PER_ELEMENT + Uint8Array.BYTES_PER_ELEMENT)
    },
    () => reduceMaskedAverageToReferenceScale(
      source,
      mask,
      activeMaskValue,
      topology.resolution,
      referenceResolution
    )
  );
  traceGenerationPerformance(
    'reference-scale-masked-signal-diffusion',
    {
      topologyCells: referenceTopology.cellCount,
      fullTopologyPasses: passes,
      allocatedBufferBytes: referenceTopology.cellCount * Float32Array.BYTES_PER_ELEMENT * passes
    },
    () => smoothMaskedTopologyLayer(
      reduced.values,
      reduced.mask,
      1,
      referenceTopology,
      passes,
      blend
    )
  );
  return traceGenerationPerformance(
    'authoritative-topology-masked-signal-expansion',
    {
      topologyCells: topology.cellCount,
      fullTopologyPasses: 1,
      allocatedBufferBytes: topology.cellCount * Float32Array.BYTES_PER_ELEMENT
    },
    () => expandFromReferenceScale(reduced.values, topology.resolution, referenceResolution)
  );
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
  const activeCellIndices = markedCellIndices(mask);
  const activeCells = activeCellIndices.length;
  if (topology.resolution === referenceResolution) {
    candidate = new Float32Array(source);
    candidateMask = new Uint8Array(mask);
    candidateTopology = topology;
  } else {
    candidateTopology = referenceTopologyForResolution(referenceResolution);
    candidateMask = traceGenerationPerformance(
      'reference-scale-mask-reduction',
      {
        topologyCells: topology.cellCount,
        activeCells,
        fullTopologyPasses: 1,
        allocatedBufferBytes: 6 * referenceResolution * referenceResolution
      },
      () => reduceMaskCellsToReferenceScale(activeCellIndices, topology.resolution, referenceResolution)
    );
    const reductionMask = expandMaskNeighborhood(candidateMask, candidateTopology, passes + 1);
    candidate = traceGenerationPerformance(
      'reference-scale-field-reduction',
      {
        topologyCells: topology.cellCount,
        activeCells,
        fullTopologyPasses: 0,
        allocatedBufferBytes: 6 * referenceResolution * referenceResolution
          * (Float32Array.BYTES_PER_ELEMENT + Uint8Array.BYTES_PER_ELEMENT)
      },
      () => reduceAverageToReferenceScaleMasked(
        source,
        topology.resolution,
        referenceResolution,
        reductionMask
      )
    );
  }
  traceGenerationPerformance(
    'reference-scale-corridor-propagation',
    {
      topologyCells: candidateTopology.cellCount,
      activeCells,
      fullTopologyPasses: passes,
      allocatedBufferBytes: candidateTopology.cellCount * Float32Array.BYTES_PER_ELEMENT * passes
    },
    () => propagateIntoMaskedCorridors(candidate, candidateMask, candidateTopology, passes)
  );
  if (topology.resolution !== referenceResolution) {
    traceGenerationPerformance(
      'masked-topology-field-expansion-and-blend',
      {
        topologyCells: topology.cellCount,
        activeCells,
        fullTopologyPasses: 0,
        allocatedBufferBytes: activeCellIndices.length * Uint32Array.BYTES_PER_ELEMENT
      },
      () => blendReferenceScaleIntoMaskedCells(
        source,
        candidate,
        activeCellIndices,
        topology.resolution,
        referenceResolution,
        blend
      )
    );
  } else {
    traceGenerationPerformance(
      'masked-topology-field-blend',
      { topologyCells: topology.cellCount, activeCells, fullTopologyPasses: 0, allocatedBufferBytes: 0 },
      () => {
        for (const cell of activeCellIndices) {
          source[cell] = lerp(source[cell], candidate[cell], blend);
        }
      }
    );
  }
}

function reduceMaskCellsToReferenceScale(
  sourceCells: number[],
  sourceResolution: number,
  referenceResolution: number
): Uint8Array {
  const result = new Uint8Array(6 * referenceResolution * referenceResolution);
  const sourceFaceSize = sourceResolution * sourceResolution;
  for (const cell of sourceCells) {
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

function expandMaskNeighborhood(
  source: Uint8Array,
  topology: CubedSphereTopology,
  passes: number
): Uint8Array {
  const result = new Uint8Array(source);
  let frontier = markedCellIndices(result);
  for (let pass = 0; pass < passes; pass += 1) {
    const nextFrontier: number[] = [];
    for (const cell of frontier) {
      for (let direction = 0; direction < 4; direction += 1) {
        const neighbor = topology.neighbors[cell * 4 + direction];
        if (neighbor < 0 || result[neighbor]) continue;
        result[neighbor] = 1;
        nextFrontier.push(neighbor);
      }
    }
    if (nextFrontier.length === 0) break;
    frontier = nextFrontier;
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

function reduceMaskedAverageToReferenceScale(
  source: Float32Array,
  mask: Uint8Array,
  activeMaskValue: 0 | 1,
  sourceResolution: number,
  referenceResolution: number
): { values: Float32Array; mask: Uint8Array } {
  const values = new Float32Array(6 * referenceResolution * referenceResolution);
  const counts = new Uint32Array(values.length);
  const reducedMask = new Uint8Array(values.length);
  const sourceFaceSize = sourceResolution * sourceResolution;
  for (let cell = 0; cell < source.length; cell += 1) {
    if (mask[cell] !== activeMaskValue) continue;
    const face = Math.floor(cell / sourceFaceSize);
    const local = cell - face * sourceFaceSize;
    const x = local % sourceResolution;
    const y = Math.floor(local / sourceResolution);
    const referenceX = Math.min(referenceResolution - 1, Math.floor((x / sourceResolution) * referenceResolution));
    const referenceY = Math.min(referenceResolution - 1, Math.floor((y / sourceResolution) * referenceResolution));
    const referenceCell = cubedSphereCellIndex(face, referenceX, referenceY, referenceResolution);
    values[referenceCell] += source[cell];
    counts[referenceCell] += 1;
    reducedMask[referenceCell] = 1;
  }
  for (let cell = 0; cell < values.length; cell += 1) {
    if (counts[cell]) values[cell] /= counts[cell];
  }
  return { values, mask: reducedMask };
}

function reduceAverageToReferenceScaleMasked(
  source: Float32Array,
  sourceResolution: number,
  referenceResolution: number,
  referenceMask: Uint8Array
): Float32Array {
  const result = new Float32Array(6 * referenceResolution * referenceResolution);
  const sourceFaceSize = sourceResolution * sourceResolution;
  const referenceFaceSize = referenceResolution * referenceResolution;
  for (let referenceCell = 0; referenceCell < result.length; referenceCell += 1) {
    if (!referenceMask[referenceCell]) continue;
    const face = Math.floor(referenceCell / referenceFaceSize);
    const local = referenceCell - face * referenceFaceSize;
    const referenceX = local % referenceResolution;
    const referenceY = Math.floor(local / referenceResolution);
    const startX = Math.floor((referenceX / referenceResolution) * sourceResolution);
    const endX = Math.max(startX + 1, Math.floor(((referenceX + 1) / referenceResolution) * sourceResolution));
    const startY = Math.floor((referenceY / referenceResolution) * sourceResolution);
    const endY = Math.max(startY + 1, Math.floor(((referenceY + 1) / referenceResolution) * sourceResolution));
    let sum = 0;
    let count = 0;
    for (let y = startY; y < endY; y += 1) {
      for (let x = startX; x < endX; x += 1) {
        sum += source[face * sourceFaceSize + y * sourceResolution + x];
        count += 1;
      }
    }
    result[referenceCell] = sum / Math.max(1, count);
  }
  return result;
}

function blendReferenceScaleIntoMaskedCells(
  target: Float32Array,
  reference: Float32Array,
  targetCells: number[],
  targetResolution: number,
  referenceResolution: number,
  blend: number
): void {
  const targetFaceSize = targetResolution * targetResolution;
  for (const cell of targetCells) {
    const face = Math.floor(cell / targetFaceSize);
    const local = cell - face * targetFaceSize;
    const x = local % targetResolution;
    const y = Math.floor(local / targetResolution);
    const referenceX = ((x + 0.5) / targetResolution) * referenceResolution - 0.5;
    const referenceY = ((y + 0.5) / targetResolution) * referenceResolution - 0.5;
    const candidate = bilinearFaceSample(reference, face, referenceX, referenceY, referenceResolution);
    target[cell] = lerp(target[cell], candidate, blend);
  }
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

function smoothMaskedTopologyLayer(
  layer: Float32Array,
  mask: Uint8Array,
  activeMaskValue: 0 | 1,
  topology: CubedSphereTopology,
  passes: number,
  blend: number
): void {
  for (let pass = 0; pass < passes; pass += 1) {
    const source = new Float32Array(layer);
    for (let cell = 0; cell < layer.length; cell += 1) {
      if (mask[cell] !== activeMaskValue) continue;
      let sum = source[cell];
      let count = 1;
      for (let direction = 0; direction < 4; direction += 1) {
        const neighbor = topology.neighbors[cell * 4 + direction];
        if (neighbor < 0 || mask[neighbor] !== activeMaskValue) continue;
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

function countActiveFloatCells(source: Float32Array): number {
  let count = 0;
  for (let cell = 0; cell < source.length; cell += 1) {
    if (source[cell] !== 0) count += 1;
  }
  return count;
}

function markedCellIndices(source: Uint8Array): number[] {
  const result: number[] = [];
  for (let cell = 0; cell < source.length; cell += 1) {
    if (source[cell]) result.push(cell);
  }
  return result;
}

function referenceTopologyForResolution(resolution: number): CubedSphereTopology {
  const cached = referenceTopologyCache.get(resolution);
  if (cached) return cached;
  const topology = buildCubedSphereTopology(resolution);
  referenceTopologyCache.set(resolution, topology);
  return topology;
}

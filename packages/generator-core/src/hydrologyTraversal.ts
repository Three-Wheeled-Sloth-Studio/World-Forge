export type CachedDownstreamPath<TTerminus extends string> = {
  path: number[];
  terminus: TTerminus;
};

/**
 * Stable descending ordering for finite Float32 values.
 *
 * This preserves the existing Array.sort ordering contract, including ascending
 * source-index order for equal values, while avoiding comparison-sort overhead.
 */
export function stableDescendingFloat32Indices(values: Float32Array): Uint32Array {
  const count = values.length;
  let indices = new Uint32Array(count);
  let scratch = new Uint32Array(count);
  const keys = new Uint32Array(count);
  const bits = new Uint32Array(values.buffer, values.byteOffset, values.length);

  for (let index = 0; index < count; index += 1) {
    const value = values[index];
    if (!Number.isFinite(value)) throw new Error(`Hydrology elevation at ${index} is not finite.`);
    indices[index] = index;
    const normalizedBits = value === 0 ? 0 : bits[index];
    const ascendingKey = (normalizedBits & 0x80000000) !== 0
      ? (~normalizedBits >>> 0)
      : ((normalizedBits ^ 0x80000000) >>> 0);
    keys[index] = ~ascendingKey >>> 0;
  }

  const counts = new Uint32Array(256);
  const offsets = new Uint32Array(256);
  for (let shift = 0; shift < 32; shift += 8) {
    counts.fill(0);
    for (let position = 0; position < count; position += 1) {
      counts[(keys[indices[position]] >>> shift) & 0xff] += 1;
    }
    let cursor = 0;
    for (let bucket = 0; bucket < 256; bucket += 1) {
      offsets[bucket] = cursor;
      cursor += counts[bucket];
    }
    for (let position = 0; position < count; position += 1) {
      const index = indices[position];
      const bucket = (keys[index] >>> shift) & 0xff;
      scratch[offsets[bucket]] = index;
      offsets[bucket] += 1;
    }
    const previous = indices;
    indices = scratch;
    scratch = previous;
  }

  return indices;
}

/**
 * Trace a deterministic downstream route while caching shared suffixes.
 * Returned paths are read-only by convention; callers must not mutate them.
 */
export function traceCachedDownstreamPath<TTerminus extends string>(args: {
  source: number;
  downstream: Int32Array;
  maxSteps: number;
  defaultTerminus: TTerminus;
  terminusAt: (cell: number) => TTerminus | undefined;
  cache: Map<number, CachedDownstreamPath<TTerminus>>;
}): CachedDownstreamPath<TTerminus> {
  const existing = args.cache.get(args.source);
  if (existing) return existing;

  const prefix: number[] = [];
  const visited = new Set<number>();
  let cell = args.source;
  let terminus = args.defaultTerminus;
  let complete = false;

  for (let step = 0; step < args.maxSteps; step += 1) {
    if (visited.has(cell)) break;

    if (prefix.length > 0) {
      const suffix = args.cache.get(cell);
      if (suffix) {
        const remaining = Math.max(0, args.maxSteps - prefix.length);
        prefix.push(...suffix.path.slice(0, remaining));
        if (suffix.path.length <= remaining) {
          terminus = suffix.terminus;
          complete = true;
        }
        break;
      }
    }

    visited.add(cell);
    prefix.push(cell);
    const resolved = args.terminusAt(cell);
    if (resolved !== undefined) {
      terminus = resolved;
      complete = true;
      break;
    }

    const next = args.downstream[cell];
    if (next < 0) {
      complete = true;
      break;
    }
    cell = next;
  }

  const result = { path: prefix, terminus };
  if (complete) {
    for (let index = 0; index < prefix.length; index += 1) {
      const suffixSource = prefix[index];
      if (!args.cache.has(suffixSource)) {
        args.cache.set(suffixSource, {
          path: prefix.slice(index),
          terminus
        });
      }
    }
  }
  args.cache.set(args.source, result);
  return result;
}

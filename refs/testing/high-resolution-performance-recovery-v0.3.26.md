---
type: "Testing Reference"
title: "High-Resolution Performance Recovery"
tags:
- world-forge
- testing
---
# High-Resolution Performance Recovery

Date: 2026-07-30

Version: `0.3.26`

Branch: `agent/investigate-map-lines-polar-ice`

Case: star seed `1001001`, world seed `5336649`, Earthlike

Workflow: `core.performance-foundation`

Output resolution: `2048 x 1024`

Topology resolution: `512` (`1,572,864` cubed-sphere cells)

## Conclusion

The controlled command-line comparison did not reproduce a generator regression
between `0.3.24` and the accepted `0.3.25` quality commit. The `0.3.25` median
was 6.2% faster than `0.3.24`. The reported three-minute browser run was
therefore not caused solely by the `0.3.25` terrain correction. Host contention
was independently observed during this investigation and produced large
run-to-run variation.

The profile did expose avoidable full-topology work in the new repair path.
Limiting corridor repair and stabilization to their active neighborhoods
reduced those internal stages by 61.8% to 75.0%. The clean final median is
`115.30 s`, 1.1% faster than the controlled `0.3.25` median and 7.3% faster
than `0.3.24`.

The remaining High duration is dominated by pre-existing deep-time aging and
climate work, not the quality-repair stages changed in `0.3.25`.

## Controlled Medians

Each commit received one warm-up followed by three measured runs. All values
below are medians from the exact case above.

| Revision | Measured runs (seconds) | Median | Change |
| --- | --- | ---: | ---: |
| `45e4d8c` (`0.3.24`) | 124.34, 122.92, 128.23 | 124.34 s | baseline |
| `a4cdb4d` (`0.3.25`) | 113.03, 116.57, 124.96 | 116.57 s | -6.2% |
| optimized (`0.3.26`) | 93.78, 130.04, 115.30 | 115.30 s | -1.1% vs `0.3.25`; -7.3% vs `0.3.24` |

The spread remains large despite warm-up. The optimized output signature was
identical across all three measured runs:
`2d688fcd702d5df0daaff96d17b6d12b7ff4bcf7c3c2d5e4ed2bb5785dc9a4c6`.

Raw aggregate reports:

- [0.3.24 baseline](high-resolution-performance-v0.3.26/45e4d8c-baseline-report.json)
- [0.3.25 baseline](high-resolution-performance-v0.3.26/a4cdb4d-baseline-report.json)
- [Optimized baseline](high-resolution-performance-v0.3.26/optimized-baseline-report.json)

## Isolated Hotspots

The before and after internal traces are single diagnostic runs used to locate
work, not substitutes for the three-run end-to-end medians.

| Boundary | Before | After | Change |
| --- | ---: | ---: | ---: |
| Authoritative fragment transforms (parent) | 2520.62 ms | 1880.39 ms | -25.4% |
| Topology field stabilization (parent) | 730.24 ms | 279.08 ms | -61.8% |
| Reference-scale field reduction | 505.37 ms | 197.48 ms | -60.9% |
| Vacated-fragment corridor repair | 281.90 ms | 70.55 ms | -75.0% |
| Fragment-history deformation (parent) | 1024.02 ms | 966.83 ms | -5.6% |
| Final topology-to-raster projection | 804.37 ms | 797.80 ms | -0.8% |
| Permanent-ice classification | 705.37 ms | 733.61 ms | +4.0% |

The corridor repair previously allocated a `6 MiB` topology clone on as many
as eight passes and scanned all `1,572,864` cells on every pass. It now performs
one eligibility scan, retains `59,234` active indices (about `231 KiB` of
index storage), and performs repair passes only over those candidates.

Stabilization previously reduced the entire authoritative topology, expanded a
full `6 MiB` candidate back to resolution 512, then ran two more full-topology
smoothing passes. It now:

- reuses a cached reference topology;
- reduces only reference blocks near the `113,485` active cells;
- propagates at reference resolution;
- bilinearly samples and blends only active authoritative cells.

Trace evidence:

- [Before internal trace](high-resolution-performance-v0.3.26/a4cdb4d-internal-trace.json)
- [After internal trace](high-resolution-performance-v0.3.26/optimized-internal-trace.json)

## Timing Semantics

The UI phase list contains overlapping boundaries:

- `world.deep-time-aging` is a parent graph-node duration.
- `topology.climate` is contained by
  `topology.climate-glaciation-node`.
- `topology.terrain.aging` is contained by
  `topology.terrain.finalization-node`.

Parent and child durations must not be added together. The new performance
trace marks parent boundaries explicitly and reports invocation count, topology
cells, active cells, full-topology passes, and estimated typed-buffer
allocation for each isolated operation.

## Retained Quality

The optimized exact reproduction retains the accepted `0.3.25` projection:

- narrow High-resolution terrain streaks remain removed;
- broad rifts and ocean basins remain open;
- north/south polar ice shares are `32.66%` / `33.44%`;
- topology/raster ice mismatch is `0`;
- invalid river topology jumps are `0`;
- repeated measured runs have one deterministic output signature.

See the [optimized quality report](high-resolution-performance-v0.3.26/optimized-quality-report.json).
The accepted before/after images remain in
[the 0.3.25 quality report](map-lines-polar-ice-high-resolution-followup-v0.3.25.md).

## Follow-up

Further material High-path gains require a separate optimization slice against
deep-time aging and climate. Those stages predate this quality fix and should
be profiled independently rather than weakening the topology-resolution or
terrain-width correction.

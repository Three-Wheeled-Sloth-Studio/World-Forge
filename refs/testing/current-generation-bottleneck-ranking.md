---
type: "Testing Reference"
title: "Current Generation Bottleneck Ranking"
tags:
- world-forge
- testing
---
# Current Generation Bottleneck Ranking

Updated: 2026-08-02

Status: measurement complete; next candidate selected

Source profile commit: `9fced66219acfe8bf8ff314f024be322a7fba7c1`

Workflow: `core.performance-foundation@1.2.0`

Evidence:

- `refs/testing/current-generation-profile-512x256.json`
- `refs/testing/current-generation-profile-512x256.md`
- `refs/testing/current-generation-profile-1024x512.json`
- `refs/testing/current-generation-profile-1024x512.md`
- `refs/planning/current-generation-bottleneck-profiling.md`

## Measurement matrix

Standard matrix:

- resolution: 512 x 256;
- seeds: `1001001`, `3141592`, `8675309`;
- scenarios: Earthlike standard, Archipelago standard, and geological/glacial stress;
- nine total runs.

Production scaling probe:

- resolution: 1024 x 512;
- seeds: `1001001`, `3141592`;
- Earthlike standard scenario;
- two total runs.

Hosted-runner absolute times vary between executions. Candidate selection therefore uses within-run phase share, cross-seed consistency, scaling behavior, and direct parent/child attribution rather than comparing raw milliseconds from different runner allocations.

## Ranked finding

### 1. Basin-aware gyre packing

`deep-time.final.basin-circulation` is the largest measured operation in the current generation pipeline. Its child timer shows that the cost is overwhelmingly inside `packGyres` rather than basin labeling, coast-distance construction, current assignment, or final validation.

At 512 x 256:

- basin circulation: 385.3 ms average, 11.58 percent of total generation;
- gyre packing: 291.2 ms average, 8.78 percent of total generation;
- gyre packing accounts for approximately 75.6 percent of basin-circulation time;
- basin labeling: 10.9 ms;
- coast-distance construction: 8.8 ms.

At 1024 x 512:

- basin circulation: 2,219.1 ms average, 16.45 percent of total generation;
- gyre packing: 1,978.6 ms average, 14.66 percent of total generation;
- gyre packing accounts for approximately 89.2 percent of basin-circulation time;
- basin labeling: 33.5 ms;
- coast-distance construction: 32.3 ms.

The raster contains four times as many cells at 1024 x 512, while gyre-packing time grows by approximately 6.8 times. Its measured cost per topology cell rises from roughly 2,962 ns to 5,032 ns. That superlinear growth is the strongest current performance defect.

## Why the current algorithm scales poorly

`packGyres` performs up to fourteen placement iterations. During each iteration it:

1. scans nearly the full projected raster;
2. filters cells by basin, ownership, latitude, coast clearance, and basin size;
3. checks clearance against every previously placed gyre;
4. performs west, east, north, and south directional scans for each viable cell;
5. allows each directional scan to extend to a limit proportional to map height;
6. rescans ownership when a proposed gyre territory is rejected.

The effective shape is approximately proportional to:

```text
gyre iterations x raster cells x (directional scan length + existing gyres)
```

The directional scan length doubles when linear resolution doubles, which explains the observed worse-than-cell-linear growth.

## Selected next candidate

Implement an output-equivalent `basin-circulation.pack-gyres-v2` candidate in Experimental.

### Intended optimization shape

Preserve the current scoring, scan order, tie-breaking, territory assignment, wrap behavior, and diagnostics while changing how candidate geometry is obtained:

1. Build a compact static candidate list once from basin membership, basin size, latitude suitability, coast clearance, and other immutable filters.
2. At each gyre-placement iteration, compute exact west, east, north, and south available spans for all cells with linear row and column sweeps over basin IDs and the current owner mask.
3. Read the four spans in constant time while scoring candidates instead of walking up to the scan limit four times per candidate.
4. Maintain nearest placed-gyre boundary clearance incrementally by updating one candidate-clearance array after each accepted gyre.
5. Track cells assigned to the current proposed territory so a rejected proposal can roll back only those cells rather than scanning the complete owner array.
6. Preserve deterministic iteration order and floating-point expression order where they influence selection.

This changes the dominant search from repeated long directional walks toward approximately:

```text
gyre iterations x (raster cells + eligible candidates)
```

### Workflow boundary

- Detailed `core.performance-foundation@1.2.0` remains the control.
- Experimental advances to a new version and enables `pack-gyres-v2` only.
- No climate, hydrology, terrain, orbit, parameter, rendering, or presentation change is part of the candidate.
- The permanent profiling phase names remain available in both workflows.

### Output gate

Because the candidate is intended to be an exact work-reduction rewrite, promotion requires exact matched-seed equality for:

- packed-gyre diagnostics and order;
- gyre ownership raster;
- final wind and current layers;
- basin-circulation diagnostics;
- authoritative topology and projected world layers;
- generated metrics and river paths;
- deterministic replay.

Timing telemetry and source/workflow provenance are excluded from byte equality.

If exact equality cannot be maintained, do not quietly relax the gate. Reclassify the work as an output-changing quality candidate with separate planning and visual QA.

### Performance gate

Across the standard matrix and production scaling probe:

- reduce `basin-circulation.pack-gyres` average time by at least 50 percent at 512 x 256;
- reduce it by at least 60 percent at 1024 x 512;
- reduce total generation time by at least 8 percent at 1024 x 512;
- introduce no greater than 3 percent regression in unrelated measured phases;
- keep additional transient allocation at or below 16 MB at 1024 x 512.

These are minimum promotion gates, not predicted ceilings. The work-shape change should support substantially larger gains if implemented cleanly.

## Second queued candidate

Initial foundation climate traversal remains the next measured candidate after gyre packing.

At 1024 x 512:

- wetness traversal: 663.4 ms, 4.93 percent of total;
- moisture-candidate traversal: 363.6 ms, 2.70 percent;
- atmospheric flow: 200.4 ms, 1.49 percent;
- ocean currents: 198.2 ms, 1.47 percent.

The likely shape is to port the already-proven topology direction-geometry cache, terrain-gradient reuse, and bounded marine skipping into the initial climate path. Do not combine that work with gyre packing; each candidate needs independent attribution and output gates.

## Deferred candidates

- Basin labeling and coast-distance construction are close to cell-linear and too small to prioritize.
- Final biome classification, projection, and metrics validation are measurable but individually modest.
- Initial hydrology drainage is material but below basin packing and climate traversal.
- Surface aging and deep-time climate remain broad expensive stages, but their next optimization requires additional operation-level attribution after the two clearer candidates above.
- Physical moisture fetch, lake-width carry, parameter correlations, target-versus-achieved auditing, and geographic drilldown remain outside this performance slice.

# Current Generation Bottleneck Profiling Increment

Updated: 2026-08-02

Status: active measurement plan

Related:

- Issue #14: Generation performance foundation PI
- Issue #111: Restore coherent Earthlike polar temperature gradients and permanent ice
- PR #112: Experimental polar climate and fine foundation profiling
- `refs/planning/pi-generation-performance-foundation.md`
- `refs/planning/polar-climate-and-foundation-profiling.md`

## Decision context

Manual visual QA accepted the `mean-centered-power-v1` polar climate profile. That profile is promoted from Experimental into World Generation (Detailed) before performance work continues. Experimental is then realigned with Detailed and reserved for the next isolated optimization candidate.

The visual approval also records one deferred scientific refinement: the equator-to-pole gradient should eventually respond to axial tilt and orbital eccentricity. That future calibration must preserve the global-mean contract and receive its own workflow version, deterministic tests, and visual QA. It is not part of this performance increment.

## Goal

Use the fine-grained Initial world foundation traces introduced in version 0.3.54 to identify the current dominant CPU costs after all previously promoted optimizations.

This increment is measurement and candidate selection first. It must not smuggle an optimization into the same change that defines how the bottleneck is measured.

## Authoritative workflow

Profile `core.performance-foundation`, the current Detailed production workflow, after polar-climate promotion.

The workflow contract for this measurement includes:

- semantic-node seeds;
- bounded three-era surface aging;
- present-climate derived-field reuse;
- optimized hydrology traversal;
- cached present-climate traversal;
- high-resolution terrain continuity;
- `mean-centered-power-v1` polar climate.

Experimental must match this contract until a measured candidate is selected.

## Benchmark matrix

Primary matrix:

- resolution: 512 x 256;
- seeds: `1001001`, `3141592`, `8675309`;
- scenarios:
  - Earthlike standard activity;
  - Archipelago standard activity;
  - high-age geological and glacial stress;
- at least one run per pair for initial attribution;
- repeat the selected hot-path comparison with multiple runs before promotion.

Scaling probe:

- resolution: 1024 x 512;
- Earthlike standard activity;
- at least two fixed seeds where runner capacity permits.

The scaling probe is evidence about cost growth, not a substitute for the broader scenario matrix.

## Measurement contract

Use `npm run profile:generation`.

The report must retain:

- exact source commit;
- workflow ID and version;
- scenario, seed, resolution, and run index;
- total and measured wall time;
- broad deep-time substage timings;
- non-parent performance trace records;
- average, median, and p90 phase durations;
- average share of total generation time;
- topology-cell cost where available;
- active-cell share, full-topology-pass count, and allocation size where available;
- output metrics needed to catch obviously invalid runs.

The report ranks phases but does not automatically declare an optimization target.

## Candidate selection rules

A phase is a valid next target only when it is:

1. consistently expensive across seeds and scenarios;
2. materially expensive at production-like resolution;
3. attributable to an inspectable operation or work shape;
4. isolated behind a versioned workflow or implementation boundary;
5. addressable without changing unrelated climate, hydrology, terrain, system, or presentation behavior;
6. testable with deterministic and quality gates.

Prefer removal of redundant full-topology passes, repeated sorting, repeated distance fields, repeated geometry construction, or avoidable allocation before approximate algorithms.

## Expected candidate families

The profiler should resolve the current ranking among, at minimum:

- initial climate distance-field construction and traversal;
- initial hydrology drainage fill, elevation ordering, accumulation, and river tracing;
- terrain aging impacts, weathering, hydraulic erosion, and coast shaping;
- scalar and vector topology-to-raster lookup/copy;
- projected river-object assembly;
- remaining deep-time climate, hydrology, and biome/projection work.

These are hypotheses, not conclusions.

## Output and decision artifact

Commit a durable report under `refs/testing/` containing:

- the measured matrix;
- the top fine phases;
- the broad substage ranking;
- scaling observations;
- the selected next candidate;
- rejected or deferred candidates and why;
- the proposed control/candidate workflow boundary;
- validation and promotion gates.

Update issue #14 with the resulting ranking and next implementation slice.

## Guardrails

- No optimization is promoted from a single seed.
- Do not merge parent and child timings into one percentage total.
- Profiling must not alter authoritative generation output.
- Detailed remains usable throughout measurement.
- Keep geographic drilldown work outside this PI.
- Do not bundle physical moisture fetch, parameter correlations, or the target-achievement ledger into the selected performance slice.

---
type: "Testing Reference"
title: "Polar Climate and Foundation Profiling Validation Status"
tags:
- world-forge
- testing
---
# Polar Climate and Foundation Profiling Validation Status

Updated: 2026-08-02

Status: accepted and promoted

Implementation PR: #112

Promotion branch: `agent/promote-polar-profile-performance-bottlenecks`

## Automated result

The Experimental candidate passed full repository validation before manual review:

- TypeScript project build passed;
- 90 test files passed;
- 334 tests passed;
- production Vite build passed;
- npm audit reported zero vulnerabilities.

The complete generation and reconciliation integration tests established:

- Experimental used `mean-centered-power-v1` while the prior Detailed baseline retained the legacy climate formula;
- selected parameter values remained identical between matched workflows;
- stellar model and planetary dynamics remained identical;
- both northern and southern high-latitude means were materially colder in Experimental for the reference Earthlike seed;
- Experimental permanent ice percentage was not lower than Detailed;
- warm worlds remained ice-poor relative to cold worlds;
- cold worlds expanded permanent ice;
- repeated Experimental runs produced identical final temperature, ice, and diagnostic output.

## Manual visual QA

Manual generation review on 2026-08-02 accepted the candidate.

Accepted observations:

- generated polar climate and permanent ice looked coherent;
- no blocking symmetric painted-cap appearance;
- no blocking low-latitude ice leakage;
- no blocking excess permanent sea ice;
- overall generated world quality remained acceptable.

The accepted calibration is documented in `refs/planning/polar-climate-calibration-decision.md`.

## Promotion result

- `mean-centered-power-v1` is promoted into `core.performance-foundation` / World Generation (Detailed).
- Detailed advances to workflow version `1.2.0`.
- Experimental advances to `0.6.0` and is realigned with Detailed for the next isolated candidate.
- Legacy and developer controls retain the old latitude behavior for rollback and attribution.
- Issue #111 can close as completed after the promotion commit lands on `dev`.

## Foundation profiling result

The finer Initial world foundation profiling remains accepted as output-neutral shared infrastructure. It emits stable trace records for:

- terrain impacts, thermal weathering, hydraulic erosion, and coastal shelf shaping;
- climate water-distance, temperature field, atmospheric flow, ocean currents, wetness traversal, moisture-candidate distance fields, traversal, and smoothing;
- hydrology water-distance, drainage fill, elevation ordering, receiver initialization, flow accumulation, channel marking, source ordering, and river tracing;
- scalar and vector topology-to-raster lookup and copy;
- projected river-object assembly.

Existing native-stage aggregation, deterministic output under telemetry, and lifecycle ordering remain mandatory.

## Deferred scientific note

The version 1 latitude gradient is fixed for deterministic provenance. A future version should evaluate modulation by axial tilt and orbital eccentricity while preserving the global-mean contract. This is a future climate calibration item, not part of current performance optimization.

## Next evidence

Current bottleneck measurement proceeds under:

`refs/planning/current-generation-bottleneck-profiling.md`

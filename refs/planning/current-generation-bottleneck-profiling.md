# Current Generation Bottleneck Profiling Increment

Updated: 2026-08-02

Status: measurement complete; gyre-packing candidate selected

Related:

- Issue #14: Generation performance foundation PI
- Issue #111: Restore coherent Earthlike polar temperature gradients and permanent ice
- PR #112: Experimental polar climate and fine foundation profiling
- PR #113: Polar promotion and current bottleneck measurement
- `refs/planning/pi-generation-performance-foundation.md`
- `refs/planning/polar-climate-and-foundation-profiling.md`
- `refs/testing/current-generation-bottleneck-ranking.md`

## Decision context

Manual visual QA accepted `mean-centered-power-v1`. This increment promotes that profile into World Generation (Detailed), realigns Experimental with Detailed, and records axial-tilt/eccentricity modulation as a separate future climate-calibration item.

Performance work then proceeds measurement-first. No optimization is included in the same increment that defines and validates the current bottleneck ranking.

## Authoritative measurement workflow

The profile uses `core.performance-foundation@1.2.0`, including:

- semantic-node seeds;
- bounded three-era surface aging;
- present-climate derived-field reuse;
- optimized hydrology traversal;
- cached present-climate traversal;
- high-resolution terrain continuity;
- `mean-centered-power-v1` polar climate.

Experimental remains behavior-aligned with this workflow until the selected optimization candidate begins.

## Benchmark matrix completed

Standard matrix:

- resolution: 512 x 256;
- seeds: `1001001`, `3141592`, `8675309`;
- scenarios: Earthlike standard, Archipelago standard, and geological/glacial stress;
- nine runs.

Production scaling probe:

- resolution: 1024 x 512;
- Earthlike standard;
- seeds: `1001001`, `3141592`;
- two runs.

Durable raw evidence:

- `refs/testing/current-generation-profile-512x256.json`
- `refs/testing/current-generation-profile-512x256.md`
- `refs/testing/current-generation-profile-1024x512.json`
- `refs/testing/current-generation-profile-1024x512.md`

The reusable command is:

```text
npm run profile:generation
```

## Result

The dominant operation is final basin-aware circulation, specifically `packGyres`.

At 512 x 256:

- basin circulation: 385.3 ms average, 11.58 percent of total;
- gyre packing: 291.2 ms, 8.78 percent of total and 75.6 percent of its parent.

At 1024 x 512:

- basin circulation: 2,219.1 ms average, 16.45 percent of total;
- gyre packing: 1,978.6 ms, 14.66 percent of total and 89.2 percent of its parent.

Four times as many pixels produce approximately 6.8 times the gyre-packing cost. Basin labeling and coast-distance construction remain small and close to linear.

The detailed ranking, work-shape analysis, candidate architecture, and promotion gates are authoritative in:

`refs/testing/current-generation-bottleneck-ranking.md`

## Selected next implementation slice

Create an Experimental-only, output-equivalent `basin-circulation.pack-gyres-v2` candidate.

The intended rewrite:

- builds the immutable candidate list once;
- replaces per-candidate directional walks with exact row/column span sweeps per placement iteration;
- maintains nearest placed-gyre clearance incrementally;
- rolls back only territory cells touched by a rejected candidate;
- preserves score math, scan order, tie-breaking, wrap behavior, ownership, diagnostics, and final current fields.

Detailed `1.2.0` remains the control. Promotion requires exact output equality plus minimum performance gains documented in the ranking report.

## Next queued candidate

Initial foundation climate traversal is second:

- wetness traversal;
- moisture-candidate traversal;
- atmospheric flow;
- ocean currents.

The likely candidate ports cached topology direction geometry and terrain-gradient reuse into the initial climate path. It remains separate from gyre packing so attribution and rollback stay clean.

## Guardrails

- No optimization is promoted from a single seed.
- Parent and child timings are not added together as independent percentages.
- Profiling must not alter authoritative generation output.
- Detailed remains usable throughout candidate work.
- Keep geographic drilldown outside this PI.
- Do not bundle physical moisture fetch, lake-width carry, parameter correlations, target-achievement auditing, or climate tilt/eccentricity calibration into the gyre-packing slice.

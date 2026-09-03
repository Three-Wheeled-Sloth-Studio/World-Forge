---
type: "Planning Reference"
title: "Current Generation Bottleneck Profiling Increment"
tags:
- world-forge
- planning
---
# Current Generation Bottleneck Profiling Increment

Updated: 2026-08-02

Status: synthetic measurement complete; production bottleneck ranking pending instrumentation parity

Related:

- Issue #14: Generation performance foundation PI
- Issue #111: Restore coherent Earthlike polar temperature gradients and permanent ice
- PR #112: Experimental polar climate and fine foundation profiling
- PR #113: Polar promotion and current bottleneck measurement
- `refs/planning/pi-generation-performance-foundation.md`
- `refs/planning/polar-climate-and-foundation-profiling.md`
- `refs/planning/production-performance-instrumentation-plan.md`
- `refs/testing/current-generation-bottleneck-ranking.md`

## Decision context

Manual visual QA accepted `mean-centered-power-v1`. This increment promoted that profile into World Generation (Detailed), realigned Experimental with Detailed, and recorded axial-tilt/eccentricity modulation as a separate future climate-calibration item.

The profiling work then added useful fine-operation attribution and exposed a serious `packGyres` scaling risk. It did **not** establish a production-parity performance baseline. The Node profiler used smaller resolutions, a lower-level generation entrypoint, and a different runtime; it omitted parts of the native production pipeline, worker transfer, and UI completion.

Production instrumentation is therefore the source of truth. The required corrective increment is defined in:

`refs/planning/production-performance-instrumentation-plan.md`

No optimization candidate should be promoted until that plan produces an accepted instrumented in-app baseline and reconciled bottleneck ranking.

## Synthetic profiling workflow

The profile used `core.performance-foundation@1.2.0`, including:

- semantic-node seeds;
- bounded three-era surface aging;
- present-climate derived-field reuse;
- optimized hydrology traversal;
- cached present-climate traversal;
- high-resolution terrain continuity;
- `mean-centered-power-v1` polar climate.

Experimental remained behavior-aligned with this workflow during measurement.

The reusable command is:

```text
npm run profile:generation
```

This command is an algorithm-attribution tool. Its absolute timings are not expected in-app durations and must not be reported as such.

## Benchmark matrix completed

Standard synthetic matrix:

- resolution: 512 x 256;
- seeds: `1001001`, `3141592`, `8675309`;
- scenarios: Earthlike standard, Archipelago standard, and geological/glacial stress;
- nine runs.

Synthetic scaling probe:

- resolution: 1024 x 512;
- Earthlike standard;
- seeds: `1001001`, `3141592`;
- two runs.

Durable raw evidence:

- `refs/testing/current-generation-profile-512x256.json`
- `refs/testing/current-generation-profile-512x256.md`
- `refs/testing/current-generation-profile-1024x512.json`
- `refs/testing/current-generation-profile-1024x512.md`

## Synthetic result

Within the measured lower-level Node path, the dominant fine operation was final basin-aware circulation, specifically `packGyres`.

At 512 x 256:

- basin circulation: 385.3 ms average, 11.58 percent of measured total;
- gyre packing: 291.2 ms, 8.78 percent of measured total and 75.6 percent of its parent.

At 1024 x 512:

- basin circulation: 2,219.1 ms average, 16.45 percent of measured total;
- gyre packing: 1,978.6 ms, 14.66 percent of measured total and 89.2 percent of its parent.

Four times as many pixels produced approximately 6.8 times the gyre-packing cost. Basin labeling and coast-distance construction remained small and close to linear in this harness.

This establishes `packGyres` as a credible synthetic hotspot and scaling-risk candidate. It does **not** prove that `packGyres` is the largest contributor to user-visible in-app generation time.

The detailed synthetic ranking and work-shape analysis remain in:

`refs/testing/current-generation-bottleneck-ranking.md`

Treat that report as historical supporting evidence until it is reconciled against the production instrumentation baseline.

## Previously selected candidate — paused

The profiling increment proposed an Experimental-only, output-equivalent `basin-circulation.pack-gyres-v2` candidate.

The intended rewrite:

- builds the immutable candidate list once;
- replaces per-candidate directional walks with exact row/column span sweeps per placement iteration;
- maintains nearest placed-gyre clearance incrementally;
- rolls back only territory cells touched by a rejected candidate;
- preserves score math, scan order, tie-breaking, wrap behavior, ownership, diagnostics, and final current fields.

This remains a plausible candidate, but implementation and promotion are paused pending the production instrumentation increment. It may resume first only if the reconciled in-app ranking confirms that it is material to the actual user-visible wall time.

## Required next increment

Implement `refs/planning/production-performance-instrumentation-plan.md` before resuming optimization work.

That increment must:

- emit a versioned production generation timing record;
- separate worker generation, preview work, final project handoff, UI acceptance, and first interactive render;
- expose and export the record from the app;
- capture production-path baselines at 1024 x 512, the actual 2048 x 1024 default, and 4096 x 2048;
- build a matched production-entrypoint harness;
- reconcile production and synthetic evidence;
- publish a new authoritative bottleneck ranking.

## Queued synthetic candidate

Initial foundation climate traversal was second in the synthetic ranking:

- wetness traversal;
- moisture-candidate traversal;
- atmospheric flow;
- ocean currents.

The likely candidate ports cached topology direction geometry and terrain-gradient reuse into the initial climate path. It remains separate from gyre packing, and it is also subordinate to the production instrumentation ranking.

## Guardrails

- Production instrumentation is the source of truth for performance decisions.
- CI and test-suite duration are not product-performance metrics.
- Synthetic profiling may identify and explain candidates but may not independently justify promotion.
- No optimization is promoted from a single seed.
- Before/after claims must use matched workflow, resolution, configuration, environment, version, and commit evidence.
- Parent and child timings are not added together as independent percentages.
- Profiling must not alter authoritative generation output.
- Detailed remains usable throughout candidate work.
- Keep geographic drilldown outside this PI.
- Do not bundle physical moisture fetch, lake-width carry, parameter correlations, target-achievement auditing, or climate tilt/eccentricity calibration into this instrumentation correction.

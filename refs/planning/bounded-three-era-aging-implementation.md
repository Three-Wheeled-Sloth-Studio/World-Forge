---
type: "Planning Reference"
title: "Bounded Three-Era Aging Implementation"
tags:
- world-forge
- planning
---
# Bounded Three-Era Aging Implementation

Updated: 2026-07-29

Status: validated experimental algorithm replacement for issue #14

## Evidence

The initial workflow benchmark at 512 x 256 attributed about 97 percent of deep-time runtime. Surface aging was the largest single substage across Earthlike, Archipelago, and geological/glacial stress scenarios, accounting for roughly 30 to 34 percent of deep-time runtime.

The production-versus-candidate nine-pair run showed a 20.16 percent mean total-runtime reduction, but that comparison mixed production's shared random stream with the candidate's semantic-node streams. A developer-only semantic-seed control workflow was added to isolate the aging schedule from starting-world differences.

The final control-versus-candidate matrix used three seeds across Earthlike, Archipelago, and high-age geological/glacial stress scenarios. It showed:

- 72.95 percent lower surface-aging runtime;
- 24.22 percent lower deep-time runtime;
- 19.25 percent lower total runtime;
- identical ocean-tolerance outcomes, five of nine for both workflows;
- valid river paths in all eighteen generated worlds;
- no quality regressions relative to the matched control;
- nearly identical mean projected ocean percentages within each scenario;
- slightly stronger candidate ice response in Earthlike, Archipelago, and stress scenarios.

The two Earthlike ocean-tolerance failures seen in the earlier production comparison were reproduced by both semantic-seed workflows. They are a geometry/projection issue in the semantic-node path, not a regression caused by bounded aging.

Present climate and hydrology rebuilds remain the next two performance targets. Fragment placement accounted for only about 1 to 2 percent in the original profile and should not lead the next optimization slice.

## Workflow comparison shape

`core.live-world` retains:

- the existing six epochs;
- fourteen orbital-forcing samples;
- 103 scheduled process iterations;
- the existing shared random-stream contract;
- workflow version `1.0.0`.

`core.performance-foundation-control` provides an attribution baseline with:

- the legacy six-epoch schedule;
- fourteen orbital-forcing samples;
- 103 scheduled process iterations;
- semantic node random streams;
- developer-only Generator visibility;
- deep-time implementation ID `core.world.deep-time-aging.semantic-seed-control`.

`core.performance-foundation` uses:

- ancient, mature, and recent eras;
- five orbital-forcing samples;
- 24 scheduled process iterations;
- semantic node random streams;
- workflow version `0.2.0`;
- deep-time implementation ID `core.world.deep-time-aging.bounded-three-era-v1`.

Production versus candidate measures the user-visible end-to-end path. Control versus candidate isolates the aging schedule and process budget because both use the same semantic-node random strategy.

## Era model

### Ancient era

- 34 percent of system age;
- strongest impact pressure;
- two tectonic iterations;
- one climate sample;
- one erosion iteration;
- no glacial or coastal pass.

### Mature era

- 38 percent of system age;
- moderate impact pressure;
- two tectonic iterations;
- two climate samples;
- one erosion and one glacial iteration.

### Recent era

- 28 percent of system age;
- low impact pressure;
- one tectonic iteration;
- two climate samples;
- one erosion, glacial, and coastal iteration.

This reduces scheduled surface-aging process passes by about 77 percent. The existing tectonic, impact, erosion, glacial, coastal, and sediment mechanics remain in place; this slice changes temporal sampling and process budgets rather than rewriting those mechanics.

## Ledger alignment

The mutation ledger derives its sample plan from the same aging profile used by the generator. This prevents the experimental schedule from being measured against a stale six-epoch classification plan.

## Validation result

The implementation cleared its merge requirements:

- repository typecheck, tests, and build passed;
- production fixed-seed behavior remained unchanged;
- the control reported six epochs and fourteen forcing samples;
- the candidate reported three epochs and five forcing samples;
- mutation-ledger classification completed without sample-plan overflow;
- control and candidate differed only at the deep-time implementation contract;
- no candidate river-validity or ocean-tolerance regressions occurred relative to control;
- stress-world ice response remained active and slightly stronger than control.

## Next step

Merge this bounded-aging slice. The next optimization increment should reduce present-climate and hydrology rebuild cost through derived-field reuse and invalidation-aware finalization. The semantic-seed Earthlike projection bias should be tracked separately as a quality issue rather than folded into the aging algorithm.

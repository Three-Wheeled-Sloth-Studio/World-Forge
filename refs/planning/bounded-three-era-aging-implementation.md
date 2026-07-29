# Bounded Three-Era Aging Implementation

Updated: 2026-07-29

Status: first experimental algorithm replacement for issue #14

## Evidence

The bounded one-seed benchmark at 512 x 256 attributed about 97 percent of deep-time runtime. Surface aging was the largest single substage across Earthlike, Archipelago, and geological/glacial stress scenarios, accounting for roughly 30 to 34 percent of deep-time runtime.

Present climate and hydrology rebuilds remain the next two targets. Fragment placement accounted for only about 1 to 2 percent at this setting.

## Scope

This change affects only `core.performance-foundation`.

`core.live-world` retains:

- the existing six epochs;
- fourteen orbital-forcing samples;
- 103 scheduled process iterations;
- the existing shared random-stream contract;
- workflow version `1.0.0`.

`core.performance-foundation` now uses:

- ancient, mature, and recent eras;
- five orbital-forcing samples;
- 24 scheduled process iterations;
- semantic node random streams;
- workflow version `0.2.0`;
- deep-time implementation ID `core.world.deep-time-aging.bounded-three-era-v1`.

This reduces scheduled surface-aging process passes by about 77 percent. The existing tectonic, impact, erosion, glacial, coastal, and sediment mechanics remain in place; this slice changes the temporal sampling and process budget rather than rewriting those mechanics.

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

## Ledger alignment

The mutation ledger now derives its sample plan from the same aging profile used by the generator. This prevents the experimental schedule from being measured against a stale six-epoch classification plan.

## Validation requirements

Before merge:

- full repository typecheck, tests, and build pass;
- production fixed-seed outputs remain unchanged;
- experimental diagnostics report three epochs and five forcing samples;
- mutation ledger completes without sample-plan overflow;
- benchmark comparison records the new workflow version and implementation contract;
- quality review covers ocean tolerance, river validity, ice response, fragment retention, and visible terrain plausibility.

## Next step

Run the full three-seed scenario matrix. If quality remains acceptable, the next optimization slice should reduce present-climate and hydrology rebuild cost through derived-field reuse and invalidation-aware finalization.

# Bounded Three-Era Aging Implementation

Updated: 2026-07-29

Status: first experimental algorithm replacement for issue #14

## Evidence

The initial workflow benchmark at 512 x 256 attributed about 97 percent of deep-time runtime. Surface aging was the largest single substage across Earthlike, Archipelago, and geological/glacial stress scenarios, accounting for roughly 30 to 34 percent of deep-time runtime.

The first full nine-pair run showed:

- 73.37 percent lower surface-aging runtime;
- 24.69 percent lower deep-time runtime;
- 20.16 percent lower total runtime;
- valid river paths in all production and candidate runs.

That run also exposed a comparison flaw: production and candidate used different random-stream strategies, so quality differences could not be attributed to the aging schedule alone. A developer-only semantic-seed control workflow was added before deciding whether to merge the candidate.

Present climate and hydrology rebuilds remain the next two performance targets. Fragment placement accounted for only about 1 to 2 percent at this setting.

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

## Validation requirements

Before merge:

- full repository typecheck, tests, and build pass;
- production fixed-seed outputs remain unchanged;
- the control reports six epochs and fourteen forcing samples;
- the candidate reports three epochs and five forcing samples;
- mutation ledger completes without sample-plan overflow;
- control and candidate differ only at the deep-time implementation contract;
- no candidate river-validity regression relative to control;
- no new ocean-tolerance regression relative to control;
- stress-world ice response and visible terrain remain plausible.

## Next step

Run the full control-versus-candidate three-seed scenario matrix. If quality remains acceptable, merge this bounded-aging slice and then reduce present-climate and hydrology rebuild cost through derived-field reuse and invalidation-aware finalization.

# Present-Climate Derived-Field Reuse

Updated: 2026-07-29

Status: validated second experimental performance slice for issue #14

## Evidence

After bounded three-era aging, present-climate and hydrology reconciliation remained the dominant deep-time costs. The present-climate diagnostics pass recomputed several fields immediately after climate generation had already calculated the same physics.

The final matched benchmark compared `core.performance-foundation-aging-control` with `core.performance-foundation` across three seeds and three scenarios at 512 x 256. Both workflows used semantic node seeds and bounded three-era aging. They differed only at the derived-field reuse implementation.

Results across nine matched world pairs:

- total runtime decreased 9.27 percent on average;
- deep-time runtime decreased 11.66 percent on average;
- hydrology rebuild plus present-climate diagnostics decreased 36.76 percent;
- every scenario and seed improved total runtime, ranging from 5.28 to 15.53 percent;
- all nine coarse terrain signatures matched;
- all nine normalized authoritative-world signatures matched;
- no metric mismatches occurred;
- no ocean-tolerance or river-validity regressions occurred.

The climate-rebuild stage itself remained nearly unchanged because the reusable fields are produced during that pass. The gain appears in the following hydrology stage, whose timing boundary also contains final present-climate diagnostics.

## Candidate-only change

`core.performance-foundation@0.3.0` retains and reuses:

- the 16-cell ocean influence field used for coastal versus inland diagnostics;
- per-cell orographic lift;
- per-cell orographic shadow.

The climate pass already computes wind and orographic response for every topology cell. Final diagnostics run immediately after hydrology, which changes river and lake fields but does not change elevation, temperature, water masks, or the orographic inputs. Reusing those fields removes a second wind, terrain-gradient, and upwind barrier walk across every land cell.

Production and the existing six-epoch semantic control retain the original recomputation path.

## Matched reuse control

`core.performance-foundation-aging-control` is a developer-only comparison workflow with:

- semantic node seeds;
- bounded three-era aging;
- five forcing samples and 24 scheduled process iterations;
- the original present-climate diagnostic recomputation path.

The candidate shares the same semantic seeds, bounded aging profile, graph nodes, and all non-deep-time implementations. It differs only at the deep-time implementation contract, where derived-field reuse is enabled. This isolates the reuse increment from both RNG strategy and the earlier aging optimization.

## Influence-field reuse

The candidate derives the 28-cell climate ocean influence and 16-cell diagnostic ocean influence from one maximum-radius topology distance pass. Tests verify that each derived radius is byte-for-byte equal to an independently computed field using the previous algorithm.

## Validation result

The slice cleared all merge requirements:

- repository typecheck, tests, and build passed;
- every fixed-seed pair matched the coarse terrain signature;
- every fixed-seed pair matched a normalized authoritative-world signature covering configuration, selected values, solar system, primary world, metrics, topology arrays, projected arrays, and deep-time diagnostics while ignoring only workflow ID;
- present-climate diagnostics remained exactly equal for all benchmark scenarios;
- ocean tolerance, river validity, stress-world ice, and headline metrics remained unchanged;
- the matched bounded-aging control benchmark showed a material runtime reduction.

Durable evidence is stored in:

- `refs/testing/present-climate-derived-field-reuse-benchmark.json`;
- `refs/testing/present-climate-derived-field-reuse-benchmark.md`;
- `refs/testing/present-climate-derived-field-reuse-summary.json`.

## Next step

Merge this slice. The next optimization should address hydrology's full-cell elevation sort and repeated candidate tracing. Those changes are more algorithmically invasive and should remain separate from this exact-output reuse increment.

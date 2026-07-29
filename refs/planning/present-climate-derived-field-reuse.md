# Present-Climate Derived-Field Reuse

Updated: 2026-07-29

Status: second experimental performance slice for issue #14

## Evidence

After bounded three-era aging, present-climate and hydrology reconciliation remain the dominant deep-time costs. In the matched control benchmark, mean substage runtime was approximately:

- present-climate rebuild: 1,955 ms;
- hydrology rebuild plus present-climate diagnostics: 1,496 ms;
- surface aging after optimization: 601 ms.

The present-climate diagnostics pass currently recomputes several fields that were just calculated during climate generation.

## Candidate-only change

`core.performance-foundation@0.3.0` now retains and reuses:

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

## Output-equivalence gate

This slice is intended to change runtime only. Before merge:

- repository typecheck, tests, and build pass;
- every fixed-seed pair matches the coarse terrain signature;
- every fixed-seed pair matches a normalized authoritative-world signature covering configuration, selected values, solar system, primary world, metrics, topology arrays, projected arrays, and deep-time diagnostics while ignoring only workflow ID;
- present-climate diagnostics remain exactly equal for all benchmark scenarios;
- ocean tolerance, river validity, and stress-world ice metrics remain unchanged;
- the matched bounded-aging control benchmark shows a material reduction in climate or hydrology reconciliation cost.

## Next step

If the reuse gate passes, merge the slice and then address hydrology's full-cell elevation sort and repeated candidate tracing. Those changes are more algorithmically invasive and should remain separate from this exact-output reuse increment.

---
type: "Testing Reference"
title: "Vertical Striping Root Cause and Correction"
tags:
- world-forge
- testing
---
# Vertical Striping Root Cause and Correction

Date: 2026-07-26

Version: World Forge 0.3.16; generator 0.1.1-mvp

## Finding

The fixed-seed investigator previously compared `generateProject` with
`generateProjectWithMotionAwareDeepTime`, while the application executes
`generateProjectWithNativeStages`. The investigator now runs the native entry
point once and captures defensive copies of authoritative topology fields at
six mutation boundaries.

For `2850873:1001001` at topology 256, the earliest material discontinuity
amplification occurred during authoritative fragment placement:

- pre-placement topology p90 neighbor delta: `0.01598585`
- post-placement p90 neighbor delta before correction: `0.04655075`
- amplification: `2.91x`

Plate components remained `27`, boundary edges remained `6,656`, and plate
boundary orientation did not change. The defect was therefore elevation
rasterization inside fragment placement, not plate fragmentation, surface
aging, fragment-history response, or projection.

## Controlled Bypass

Restoring pre-placement elevation, plate, and volcanism fields before surface
aging reduced final topology p90 neighbor delta from `0.05359866` to
`0.01730701`. The final projected elevation also became materially smoother:

- horizontal p90 delta: `0.04197165` to `0.01148988`
- vertical p90 delta: `0.05747518` to `0.02307132`

This control established `applyAuthoritativeFragmentTransforms` as the owner.

## Root Cause

The v1 transform rotated every source cell forward to its nearest cubed-sphere
target. It then:

1. sank every vacated continental source cell to young ocean crust,
2. spilled colliding claims through a directional topology search, and
3. left forward-sampling gaps between transformed target claims.

That process preserved connected plate ownership but introduced large,
grid-aligned elevation discontinuities and repeated spill structures.

## Correction

Fragment placement v2 keeps rigid spherical rotation but reconstructs each
transformed fragment by inverse sampling over a bounded target neighborhood.
Every accepted target maps back to a source cell belonging to the same
fragment. Overlapping fragments merge relief at the collision target without
reassigning coherent plate ownership.

This is an authoritative generator change, not presentation smoothing.

## Validation

Reference seed `2850873:1001001`, topology 512, output 2048 x 1024:

- pre-placement p90 neighbor delta: `0.00949582`
- post-placement p90 neighbor delta: `0.00982372`
- amplification: `1.035x`
- meridional high-gradient share: `0.558641` to `0.546337`

Additional seed `9776542:9776542`, topology 256, output 1024 x 512:

- pre-placement p90 neighbor delta: `0.02043682`
- post-placement p90 neighbor delta: `0.02038034`
- amplification: `0.997x`

The fixed-seed regression fails against the old transform at `1.63x` and
requires amplification below `1.3x` at its compact test resolution.

## Remaining Boundary

The additional seed gains north-south gradient bias during initial tectonic
elevation, before fragment placement. That is a separate broader tectonic
orientation issue and remains deferred; the corrected fragment transform no
longer materially amplifies it.

Saved replay manifests from generator `0.1.0-mvp` are intentionally
incompatible with generator `0.1.1-mvp`. Regeneration is required for exact
comparison.

## Browser QA

Browser QA passed on the deployed dev build on 2026-07-26. The corrected
terrain was accepted as good enough for the current release boundary.

The broader initial-tectonic orientation bias remains a documented future
follow-up rather than a blocker for this PI.

# Polar Climate Calibration Decision

Updated: 2026-08-02

Status: implementation correction discovered during integration validation

Related:

- `refs/planning/polar-climate-and-foundation-profiling.md`
- Issue #111
- PR #112

## Discovery

The initial implementation plan correctly identified the shallow latitude profile in the Initial world foundation climate pass:

```text
average target + 14 C at the equator
average target - 14 C at the poles
```

Integration validation then exposed a second authoritative temperature solve in deep-time reconciliation. That solve replaces the initial temperature field with:

```text
average target + 10 C - 38 C * polarLatitude^1.3
```

The final deep-time profile is already steeper than the initial 28 C linear profile, but it is not mean-centered. Its spherical area-weighted latitude contribution is approximately -1.1 C before ocean moderation, elevation, local forcing, and final system/orbit adjustment.

A 40 C mean-centered linear profile would not materially cool the reconciled high latitudes and would warm the exact pole relative to the current final profile. It would therefore satisfy the initial formula replacement while failing the actual product goal.

## Revised candidate

Use one Experimental-only mean-centered power profile in both the initial and deep-time climate solves:

```text
profile exponent: 1.3
spherical mean of polarLatitude^1.3: approximately 0.291719
latitude offset = contrast * (0.291719 - polarLatitude^1.3)
```

Calibration candidate:

- equator-to-pole contrast: 52 C;
- equatorial offset: approximately +15.2 C;
- polar offset: approximately -36.8 C;
- spherical area-weighted latitude offset: approximately 0 C.

Against the current final deep-time profile, this candidate is approximately:

- 5.2 C warmer at the equator;
- 4 C colder around 65 degrees latitude;
- 8.8 C colder at the exact pole.

This is a redistribution around the selected global target, not an unexplained global cooling adjustment. For an Earthlike 15 C target, the unmodified sea-level latitude baseline is approximately 30 C at the equator and -22 C at the poles before ocean moderation, elevation, weather, and stellar/orbital forcing.

## Contract changes

- Rename the candidate algorithm ID from `mean-centered-linear-v1` to `mean-centered-power-v1`.
- Apply the selected profile consistently during both initial climate construction and final deep-time climate reconciliation.
- Keep the current deep-time formula byte-for-byte for Detailed, Legacy, and developer controls.
- Keep the candidate isolated to Experimental version 0.5.0.
- Default omitted profile inputs to the legacy profile for direct node tests and compatibility callers.

## Validation adjustments

The fixed-seed integration test must prove that the Experimental high-latitude means are materially colder after the complete generation and reconciliation path, not merely after the initial climate node.

Initial automated threshold:

- both northern and southern high-latitude means at least 2 C colder than matched Detailed output for the reference Earthlike seed;
- Experimental permanent ice percentage no lower than Detailed;
- warm/cold ordering remains correct;
- system and orbit artifacts remain identical;
- deterministic replay remains exact.

Manual visual QA remains the promotion authority. The 52 C contrast is a candidate, not a permanent scientific constant, and should be revised if it produces painted caps, excessive equatorial heat, low-latitude leakage, or implausibly broad permanent sea ice.

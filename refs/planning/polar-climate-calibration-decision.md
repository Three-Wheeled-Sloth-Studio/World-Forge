# Polar Climate Calibration Decision

Updated: 2026-08-02

Status: accepted and promoted into Detailed

Related:

- `refs/planning/polar-climate-and-foundation-profiling.md`
- `refs/planning/current-generation-bottleneck-profiling.md`
- Issue #111
- PR #112

## Discovery

The initial implementation plan identified the shallow latitude profile in the Initial world foundation climate pass:

```text
average target + 14 C at the equator
average target - 14 C at the poles
```

Integration validation then exposed a second authoritative temperature solve in deep-time reconciliation. That solve replaced the initial temperature field with:

```text
average target + 10 C - 38 C * polarLatitude^1.3
```

The final deep-time profile was already steeper than the initial 28 C linear profile, but it was not mean-centered. A 40 C mean-centered linear profile would therefore have changed the initial formula while failing the actual product goal after reconciliation.

## Accepted profile

The accepted profile is used in both initial and deep-time climate solves:

```text
algorithm ID: mean-centered-power-v1
profile exponent: 1.3
spherical mean of polarLatitude^1.3: approximately 0.291719
latitude offset = 52 C * (0.291719 - polarLatitude^1.3)
```

Approximate calibration:

- equator-to-pole contrast: 52 C;
- equatorial offset: +15.2 C;
- polar offset: -36.8 C;
- spherical area-weighted latitude offset: approximately 0 C.

Against the superseded final deep-time profile, this is approximately:

- 5.2 C warmer at the equator;
- 4 C colder around 65 degrees latitude;
- 8.8 C colder at the exact pole.

This is redistribution around the selected global target, not an unexplained global cooling adjustment. For an Earthlike 15 C target, the unmodified sea-level latitude baseline is approximately 30 C at the equator and -22 C at the poles before ocean moderation, elevation, weather, and stellar/orbital forcing.

## Final workflow contract

- World Generation (Detailed) uses `mean-centered-power-v1`.
- World Generation (Experimental) is aligned with Detailed after promotion.
- Legacy and developer controls retain the old latitude behavior for rollback and attribution.
- Detailed workflow version is `1.2.0`.
- Experimental workflow version is `0.6.0`.
- The climate/glaciation graph node uses `core.climate.glaciation.mean-centered-power-v1` version `2` in both Detailed and Experimental.

## Validation and approval

Automated integration established:

- materially colder northern and southern high-latitude means after the complete generation and reconciliation path;
- no lower permanent-ice percentage than the matched prior Detailed baseline;
- correct warm-world and cold-world ordering;
- identical system and orbital artifacts;
- deterministic replay;
- passing repository tests, TypeScript build, and production build.

Manual visual QA accepted the generated worlds on 2026-08-02. The profile produced coherent polar climate and permanent ice without blocking painted caps, low-latitude leakage, or excessive sea ice. The candidate is approved for promotion into Detailed.

## Deferred calibration note

The fixed 52 C contrast is accepted for version 1, not declared a universal planetary constant.

A future version should evaluate whether the latitude-gradient contrast or shape should respond to:

- axial tilt;
- orbital eccentricity;
- periapsis season and hemisphere;
- existing stellar/orbital forcing.

That refinement must remain mean-centered, versioned, deterministic, and independently validated. It is explicitly deferred from the current performance work.

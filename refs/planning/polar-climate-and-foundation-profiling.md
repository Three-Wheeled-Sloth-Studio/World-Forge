---
type: "Planning Reference"
title: "Polar Climate and Initial Foundation Profiling Increment"
tags:
- world-forge
- planning
---
# Polar Climate and Initial Foundation Profiling Increment

Updated: 2026-08-02

Status: accepted and promoted

Related:

- Issue #14: Generation performance foundation PI
- Issue #111: Restore coherent Earthlike polar temperature gradients and permanent ice
- PR #112: Experimental polar climate and fine foundation profiling
- `refs/planning/pi-generation-performance-foundation.md`
- `refs/planning/polar-climate-calibration-decision.md`
- `refs/planning/current-generation-bottleneck-profiling.md`

## Final decision

The increment delivered two separately gated changes:

1. the output-changing `mean-centered-power-v1` polar climate profile;
2. output-neutral fine-grained profiling of the native Initial world foundation path.

Automated validation passed in PR #112. Manual flat-map and Globe QA subsequently accepted the generated polar temperature gradient and permanent ice behavior. The climate profile is therefore promoted into World Generation (Detailed), and Experimental is realigned with Detailed for the next isolated candidate.

The profiling infrastructure remains shared and output-neutral.

## Accepted climate model

The initial 40 C linear proposal was superseded during integration validation after a second authoritative temperature solve was found in deep-time reconciliation. The accepted model is applied consistently in both initial climate construction and final deep-time climate reconciliation:

```text
profile ID: mean-centered-power-v1
exponent: 1.3
spherical mean of polarLatitude^1.3: approximately 0.291719
latitude offset = 52 C * (0.291719 - polarLatitude^1.3)
```

Approximate latitude-only offsets:

- equator: +15.2 C;
- pole: -36.8 C;
- equator-to-pole contrast: 52 C;
- spherical area-weighted mean: approximately 0 C.

The selected `averageTemperatureC` remains the intended planet-wide target. Elevation, ocean moderation, stellar forcing, orbital state, circulation, and local variation remain explicit downstream contributors.

## Promotion boundary

- `core.performance-foundation` / World Generation (Detailed) uses `mean-centered-power-v1`.
- `core.world-generation-experimental` uses the same climate implementation until a new isolated candidate is selected.
- `core.live-world` and developer attribution controls retain the legacy latitude profile for rollback and comparison.
- The climate/glaciation graph implementation ID is `core.climate.glaciation.mean-centered-power-v1`.
- Detailed workflow version advances to `1.2.0`.
- Experimental workflow version advances to `0.6.0` and is behavior-aligned with Detailed.

No system-generation, orbit-generation, parameter-distribution, moisture-fetch, runoff, or biome-rule change is part of this promotion.

## Accepted diagnostics

The climate pipeline records:

- selected latitude-profile algorithm ID and contrast;
- authoritative mean temperature;
- equatorial mean temperature;
- north high-latitude mean temperature;
- south high-latitude mean temperature;
- north and south permanent-ice share;
- land-ice and water-ice counts.

These diagnostics support inspection and later parameter-ledger work but do not replace a full target-versus-achieved ledger.

## Accepted validation evidence

Automated validation established that:

- Detailed and Experimental system/orbit artifacts remained identical during candidate comparison;
- selected parameter values remained identical;
- both polar regions became materially colder after the complete generation and reconciliation path;
- permanent ice did not regress relative to the prior Detailed baseline;
- warm worlds remained comparatively ice-poor;
- cold worlds expanded permanent ice;
- deterministic replay remained exact;
- all repository tests and the production build passed.

Manual QA then accepted:

- flat-map polar climate and biome behavior;
- Globe appearance at both poles;
- coherent permanent ice rather than symmetric painted circles;
- acceptable asymmetric land/ocean responses;
- no blocking low-latitude leakage or excessive sea-ice coverage.

Issue #111 may close as completed after the promotion commit lands on `dev`.

## Fine foundation profiling delivered

The user-facing `Initial world foundation` stage remains stable while the performance tracer records coherent child operations beneath it.

### Terrain

- `topology.terrain.aging.impacts`
- `topology.terrain.aging.weathering`
- `topology.terrain.aging.hydraulic`
- `topology.terrain.aging.coasts`

### Climate

- `foundation.climate.water-distance`
- `foundation.climate.temperature-field`
- `foundation.climate.atmospheric-flow`
- `foundation.climate.ocean-currents`
- `foundation.climate.wetness-traversal`
- `foundation.climate.moisture-candidate-water-distance`
- `foundation.climate.moisture-candidate-traversal`
- associated smoothing operations

### Hydrology

- `foundation.hydrology.water-distance`
- `foundation.hydrology.drainage-surface`
- `foundation.hydrology.elevation-ordering`
- `foundation.hydrology.receiver-flow-initialization`
- `foundation.hydrology.flow-accumulation`
- channel marking
- `foundation.hydrology.source-ordering`
- `foundation.hydrology.river-path-tracing`

### Projection

- `foundation.projection.scalar-lookup`
- `foundation.projection.scalar-copy`
- `foundation.projection.vector-lookup`
- `foundation.projection.vector-copy`
- projected river-object assembly

Profiling does not affect authoritative output, native-stage aggregation, lifecycle ordering, or deterministic replay.

## Deferred climate refinement

Future climate calibration should consider making the latitude-gradient shape or contrast respond to:

- axial tilt, especially its effect on high-latitude seasonal energy;
- orbital eccentricity, including interaction with periapsis season and hemisphere;
- potentially stellar/orbital forcing already available to the climate pipeline.

That work must preserve the global-mean contract. It requires a new versioned algorithm ID, matched deterministic tests, warm/cold/high-tilt/high-eccentricity cases, and manual visual QA. It is not part of the current performance increment.

## Next increment

Use the accepted fine profiling to rank current production bottlenecks before selecting another optimization. The authoritative measurement plan is:

`refs/planning/current-generation-bottleneck-profiling.md`

Explicitly keep the following outside that optimization slice unless selected by separate planning:

- physical-distance moisture fetch and source-water width;
- preliminary lake generation before climate;
- parameter correlations;
- the complete target-versus-achieved ledger;
- geographic drilldown work.

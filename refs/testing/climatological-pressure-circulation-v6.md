---
type: "Testing Reference"
title: "Climatological pressure and circulation v6 acceptance"
tags:
- world-forge
- testing
---
# Climatological pressure and circulation v6 acceptance

## Purpose

Validate the v6 replacement for local gyre packing and confirm that analytical map subjects remain readable in both Map and Globe views.

The acceptance target is broad climatological plausibility, deterministic output, and a major reduction in circulation cost. It is not an instantaneous weather simulation.

## Build identity

Record all of the following with evidence:

- visible application version;
- source commit;
- workflow ID and version;
- world preset and seed;
- output resolution and topology resolution;
- browser and operating system.

The first accepted v6 implementation reports visible version `0.3.60`.

## Required worlds

Use the focused production-rerank cases:

| Case | Preset | Seed | Resolution |
|---|---|---:|---|
| Earthlike | Earthlike | `1001001` | `2048x1024` |
| Archipelago | Archipelago | `3141592` | `2048x1024` |

Additional low-ocean, high-ocean, and Pangea checks are useful for edge behavior but are not required for the first acceptance gate.

## Pressure-system acceptance

Inspect the retained `world.climate.pressureSystems` diagnostics.

Required:

- `modelVersion` is `climatological-pressure-v1`;
- reference resolution is exactly `128x64` at every output resolution;
- both high and low centers exist;
- subtropical highs and equatorial trough centers exist on ordinary habitable worlds;
- subpolar lows exist where broad ocean sectors permit them;
- center lists and reference arrays are deterministic for the same generation contract;
- subtropical regions show greater subsidence than the equatorial trough;
- mid-latitude storm-track potential exceeds subtropical storm-track potential in representative samples;
- elevation does not create mountain-top pressure highs.

## Wind acceptance

Map and Globe views should show the same underlying vector field.

Required broad grammar:

- tropical trade winds are predominantly east-to-west;
- mid-latitude winds are predominantly west-to-east;
- polar easterlies are present but weaker;
- terrain steering is visible but does not dissolve the global bands into local turbulence;
- the field is deterministic and horizontally seamless.

## Ocean-current acceptance

Required broad grammar:

- ordinary Earthlike worlds show a small number of dominant basin-scale circulation cells;
- northern subtropical gyres rotate clockwise;
- southern subtropical gyres rotate counterclockwise;
- subpolar gyres, when present, use the opposite rotation;
- equatorial westward currents and an eastward countercurrent are legible;
- western-boundary currents are stronger than broad eastern returns;
- circumpolar flow is only present when the fixed-resolution model finds a genuinely open high-latitude path;
- small enclosed seas do not each receive a dominant gyre;
- Archipelago geography may fragment or weaken gyres, but must not reproduce the old carpet of small swirls.

The debug fields retain the compatibility names `packedGyres` and `gyreOwner`; they now describe broad analytical territories rather than iterative packing results.

## Analytical Globe acceptance

For each user-facing analytical subject, select the subject in Map view, switch to Globe, and then change subjects while Globe remains active:

- Elevation
- Heightmap
- Temperature
- Rainfall
- Climate moisture
- Climate precipitation
- Wind
- Current
- Terrain only

Required:

- the selected analytical texture appears on the globe;
- presentation is unlit and is not color-distorted by orbital lighting;
- ocean and atmosphere shells are suppressed;
- clouds and weather systems are suppressed;
- seasonal recoloring is suppressed;
- changing back to Biomes restores the normal lit globe and the user's prior shell/cloud/weather visibility state;
- switching between Map and Globe does not change the selected subject.

## Precipitation acceptance

Required:

- equatorial convergence increases projected precipitation relative to adjacent subtropical subsidence zones;
- subtropical highs produce broad drying pressure rather than narrow pixel artifacts;
- mid-latitude storm tracks add broad precipitation support;
- projected climate-moisture, climate-precipitation, wetness, and biome layers remain bounded and deterministic.

Known boundary:

- v6 pressure correction is currently applied after authoritative topology hydrology;
- it does not reroute topology rivers or recreate topology lakes;
- river-network coupling requires moving the fixed-resolution pressure artifact earlier into the topology climate pipeline and is not part of this acceptance gate.

## Performance acceptance

Run:

```powershell
git checkout dev
git pull
npm run profile:production-rerank -- --plan refs/testing/production-attribution-rerank-plan.example.json --browser chrome
```

Required evidence:

- six completed isolated runs;
- exact v6 source commit and visible version;
- no `basin-circulation.pack-gyres` fine-operation record;
- new pressure and circulation operations are present:
  - `climatological-pressure.build-reference-model`
  - `climatological-pressure.apply-fields`
  - `basin-circulation.build-large-scale-gyres`
  - `basin-circulation.evaluate-large-scale-field`
- production-stage totals close against worker time;
- Earthlike and Archipelago medians are compared against the accepted v0.3.59 rerank;
- visual QA is performed on generated outputs before accepting a speed improvement.

Do not claim a High-resolution speedup from CI smoke timings. The focused local production rerank is the performance decision gate.

## Regression checks

- exact same-resolution generation remains deterministic under v6;
- validation remains green;
- water mask, coastlines, plate structure, terrain, and unrelated geography do not change because of presentation-only behavior;
- `.wforge` export/import retains the new climate diagnostics;
- existing production-page and production-rerank browser smokes pass.
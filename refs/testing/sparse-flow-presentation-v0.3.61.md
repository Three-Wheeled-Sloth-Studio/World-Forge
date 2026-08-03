# Sparse wind and current presentation acceptance — v0.3.61

## Purpose

Validate the renderer-only replacement for the dense Wind and Current arrow carpet.

The authoritative wind and current vectors remain unchanged. This increment changes only how those vectors are presented in Map view, Globe view, and rendered exports.

## Build identity

Record:

- visible version `0.3.61`;
- exact source commit;
- world preset and seed;
- output and topology resolution;
- browser and operating system.

## Required worlds

Use the accepted focused cases:

| Case | Preset | Seed | Resolution |
|---|---|---:|---|
| Earthlike | Earthlike | `1001001` | `2048x1024` |
| Archipelago | Archipelago | `3141592` | `2048x1024` |

Generation does not need to be rerun solely for presentation QA when an exact v0.3.60 `.wforge` package is available. The renderer consumes the existing authoritative vectors.

## Wind acceptance

Required:

- default presentation uses no more than 28 global paths;
- paths are long enough to reveal trade-wind, westerly, and polar-easterly bands;
- pressure-center influence is visible without creating a dense local-arrow field;
- nearby duplicate trajectories are suppressed;
- arrowheads appear at sparse intervals rather than on every sample;
- warm, cold, and neutral air paths remain distinguishable;
- paths cross the horizontal map seam cleanly;
- the background field remains readable without competing with the paths;
- Map and Globe show the same circulation grammar.

Reject when:

- the result still reads as a vector debugger;
- local terrain deflections visually dominate global circulation;
- most of the map is covered by arrows or short segments;
- seam discontinuities create false direction changes.

## Current acceptance

Required:

- default presentation uses no more than 20 global paths;
- each major subtropical gyre is represented by one or a few coherent ribbons;
- western-boundary currents read as stronger paths;
- broad eastern returns remain quieter;
- equatorial current and countercurrent paths are legible;
- subpolar and circumpolar paths appear only where present in the authoritative field;
- paths stop at land rather than crossing continents;
- warm, cold, and neutral transport remain distinguishable;
- Archipelago retains fragmented basin behavior without returning to a carpet of small swirls;
- Map and Globe use the same rendered texture.

Reject when:

- every coastal bend receives its own arrow;
- gyres are represented as dozens of disconnected marks;
- current paths cross land;
- the visual result implies circulation absent from the underlying vectors.

## Determinism and authority

Required automated checks:

- identical world data produces identical path IDs, counts, endpoints, speeds, and color classes;
- path generation does not mutate `windX`, `windY`, `currentX`, or `currentY`;
- current path samples remain on water;
- path counts stay within the bounded defaults;
- the old detailed-vector renderer remains available through `flowPresentation: 'detailed'` for internal diagnostics.

## Regression checks

- all non-Wind and non-Current map subjects are delegated to the existing renderer unchanged;
- natural biome rendering remains unchanged;
- analytical Globe presentation remains unlit and unobstructed;
- PNG/export rendering uses the sparse presentation entrypoint;
- point inspection continues to report authoritative source values, not streamline interpolation;
- production-page and attribution browser smokes remain green.

## Performance

This is a presentation increment. It must not trigger a production generation rerank.

The renderer should remain interactive at the standard `2048x1024` texture size. Any material regression in render-to-interactive-paint time should be investigated, but generation-worker timing is out of scope.
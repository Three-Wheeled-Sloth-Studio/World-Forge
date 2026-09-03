---
type: "Testing Reference"
title: "System Visualization and Enrichment QA"
tags:
- world-forge
- testing
---
# System Visualization and Enrichment QA

Updated: 2026-07-31

## Automated contract coverage

- Simulation clock advances deterministically from a fixed epoch and preserves time while paused.
- Orbital positions, visible-body vectors, star directions, and display compression remain deterministic.
- Atmospheric-weather payload and artifact signatures are deterministic for fixed climate inputs.
- Weather source signatures change when sampled climate or wind inputs change.
- Weather workflow emits six ordered, timed graph-node records.
- Cloud bands, systems, density, placement, and motion remain finite and within presentation bounds.
- The enrichment registry exposes both orbital-context and atmospheric-weather graphs to the Dev workspace.

## Focused browser acceptance

1. Generate a Fast world.
2. Confirm ordinary generation creates neither orbital nor weather enrichment.
3. Enter Globe and wait for the saved orbital artifact to complete.
4. Open Layers and enable Clouds.
5. Confirm the weather workflow visibly transitions through running to complete and persists an illustrative artifact.
6. Confirm Clouds is visible while Weather systems remains hidden.
7. Increase simulation speed and confirm the weather texture advances with shared simulation time.
8. Enable Weather systems and confirm the second moving shell is visible.
9. Disable Clouds and confirm Weather systems can remain visible independently.
10. Confirm the Globe reports non-zero band/system counts and `weatherAuthority=illustrative`.
11. Confirm no browser console errors or page-level overflow at 1440x900 and 1920x1080.

## Frame-of-reference acceptance

- Grabbing the globe pauses the shared clock and all orbital/weather motion.
- Horizontal and vertical drag change camera yaw/pitch while physical spin, stellar light, generated axial tilt, geography, and weather state remain fixed.
- Camera orbit can inspect daylight, night, poles, terminator, clouds, and weather systems without changing local planetary time.
- Releasing restores the previous play/pause state.

## Manual visual review

- Cloud bands read as broad coherent atmospheric structures rather than white noise.
- Weather systems appear as distinct fronts, cyclones, or convective concentrations without overwhelming the surface.
- Cloud and weather layers receive the same stellar lighting as the planet.
- Motion is smooth across the equirectangular seam and remains deterministic for the same artifact and clock time.
- Clouds and Weather systems can be toggled independently.
- The presentation reads as plausible and illustrative, not as a claim of forecast-grade simulation.

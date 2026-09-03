---
type: "Handoff Record"
title: "Handoff: sparse flow presentation v0.3.61"
tags:
- world-forge
- handoffs
---
# Handoff: sparse flow presentation v0.3.61

## Status

Implementation is on `agent/sparse-circulation-rendering-final` through PR #122.

Visible version: `0.3.61`.

This is a renderer-only follow-up to the accepted v0.3.60 climatological pressure and basin-circulation model.

## Architecture

`packages/renderer/src/presentation.ts` is the public renderer entrypoint.

- Re-exports the established renderer API.
- Delegates every map subject except Wind and Current to the existing renderer unchanged.
- Replaces the default Wind and Current overlay with sparse integrated paths.
- Retains the original dense renderer as `renderDetailedWorldToCanvas` and through `flowPresentation: 'detailed'`.

Desktop, exporter, script, and Vite aliases now resolve bare `@world-forge/renderer` imports to `presentation.ts`.

## Wind presentation

Seeds are drawn from:

- retained climatological pressure centers;
- representative tropical, mid-latitude, and polar latitude bands.

Paths are integrated forward and backward through the authoritative `windX` and `windY` layers. A coarse occupancy grid rejects nearby duplicate trajectories. The default is capped at 28 paths.

## Current presentation

Seeds are drawn from:

- retained basin-scale gyre diagnostics;
- equatorial current/countercurrent bands;
- open northern or southern circumpolar routes.

Paths are integrated through `currentX` and `currentY`, stop at land, and are capped at 20 paths. Current ribbons are wider than wind paths and retain warm/cold/neutral transport coloring.

## Authority and saved data

No generator, workflow, `.wforge`, topology, or climate model changes are included.

Path generation is read-only. The authoritative vector arrays remain the source for inspection, export data, simulation, and diagnostic rendering.

## Automated coverage

`packages/renderer/src/presentation.test.ts` checks:

- bounded wind and current path counts;
- long-path behavior;
- deterministic path signatures;
- current paths remain on water;
- authoritative vector arrays are not mutated.

## Manual QA

Use `refs/testing/sparse-flow-presentation-v0.3.61.md`.

The visual decision is qualitative but explicit: the default should read like a physical-geography circulation diagram, not a dense vector debugger.

## Follow-on boundary

Do not change the pressure or basin-circulation model to address presentation density.

If visual QA still finds excessive clutter, tune only:

- seed count and priority;
- duplicate-overlap thresholds;
- minimum path length;
- ribbon width and arrowhead frequency;
- background contrast.

A future user-facing presentation-density control is reasonable, but is not required for this increment. The detailed renderer already remains available as an internal contract.
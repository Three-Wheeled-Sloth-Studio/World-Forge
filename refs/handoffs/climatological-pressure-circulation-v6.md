# Handoff: climatological pressure and basin-scale circulation v6

## Status

Implementation is complete on `agent/climatological-pressure-circulation` and targets `dev` through PR #121.

Visible version: `0.3.60`.

The increment replaces iterative local gyre packing, adds a fixed-resolution climatological pressure artifact, couples that artifact into projected precipitation and prevailing winds, and restores analytical subjects in Globe view.

## Accepted architecture

### Fixed-resolution pressure model

`packages/generator-core/src/climatologicalPressure.ts`

- fixed `128x64` reference grid;
- explicit high/low centers;
- equatorial trough, subtropical, subpolar, and polar regimes;
- retained pressure, subsidence, convergence, storm-track, and prevailing-wind arrays;
- broad ocean sectors used as the atmospheric and gyre anchors;
- deterministic bilinear sampling into the output raster;
- terrain is steering, not a direct pressure source.

### Basin circulation v6

`packages/generator-core/src/basinCirculation.ts`

- removes repeated full-raster gyre candidate packing;
- creates a small deterministic list of subtropical and subpolar descriptors;
- evaluates the descriptors analytically in one current-field pass;
- adds equatorial and conditionally circumpolar components;
- applies western-boundary intensification and limited coastal steering;
- retains `packedGyres` and `gyreOwner` diagnostic names only for compatibility;
- reports `basin-circulation-v6`.

### Projected precipitation coupling

The pressure model applies bounded corrections to projected:

- climate precipitation;
- climate moisture;
- wetness;
- wetness delta;
- biome classification.

This occurs after authoritative topology hydrology. Do not claim that v6 pressure systems reroute topology rivers. Earlier topology integration is a separate increment.

### Analytical Globe restoration

`apps/desktop/src/workspace/WorldWorkspace.tsx`

When Globe view displays a non-biome subject:

- globe debug presentation changes to unlit `albedo`;
- ocean and atmosphere shells are disabled;
- clouds and weather systems are disabled;
- seasonal surface presentation is suppressed by the non-final globe mode;
- the selected data subject remains the texture source.

Returning to Biomes restores `final` globe presentation and the user's saved shell/cloud/weather state.

## Instrumentation

Removed operation:

```text
basin-circulation.pack-gyres
```

New operations:

```text
climatological-pressure.build-reference-model
climatological-pressure.apply-fields
basin-circulation.build-large-scale-gyres
basin-circulation.evaluate-large-scale-field
```

The production attribution ledger remains authoritative. Fine operations are nested attribution and must not be added to production-stage totals.

## Validation completed before merge

The implementation branch passed:

- TypeScript project build;
- full Vitest suite;
- new climatological-pressure determinism and regime tests;
- new basin-scale gyre tests;
- updated profiling-operation contract;
- standard production-page browser smoke;
- production-attribution rerank browser smoke.

The first CI attempt failed only because the profiling test still named the intentionally removed v5.1 operations. That test was updated to the v6 contract; the second full run passed.

## Required post-merge evidence

Run the focused High-resolution production rerank:

```powershell
git checkout dev
git pull
npm run profile:production-rerank -- --plan refs/testing/production-attribution-rerank-plan.example.json --browser chrome
```

Attach:

- `summary.json`
- `summary.md`
- `runs.csv`

Then compare against v0.3.59:

- Earthlike worker median: `75.74s`
- Archipelago worker median: `82.54s`
- Earthlike old `pack-gyres` median: `9.15s`
- Archipelago old `pack-gyres` median: `16.25s`

Do not accept performance alone. Perform the visual checklist in `refs/testing/climatological-pressure-circulation-v6.md` on the generated Earthlike and Archipelago outputs.

## Likely follow-on work

Only proceed after the v6 rerank and visual QA identify the remaining bottleneck or model gap.

Potential follow-ons, not yet authorized:

1. Move the fixed pressure artifact before topology hydrology so precipitation can influence authoritative drainage and river source selection.
2. Replace arrow sampling with dedicated sparse streamline rendering if the new broad vector field is still visually too busy.
3. Add explicit user-facing pressure-system and storm-track map subjects.
4. Optimize `foundation.climate.wetness-traversal`, previously the next independent hotspot at about eight seconds in both focused v0.3.59 cases.

## Guardrails

- Do not restore iterative gyre packing.
- Do not scale pressure-model resolution with export resolution without new evidence.
- Do not convert this into a full weather simulation.
- Do not claim pressure-driven river routing until topology hydrology consumes the pressure artifact.
- Do not treat analytical Globe subjects as lit natural surfaces.
- Keep issue #10 geographic drilldown out of this performance/climate increment.
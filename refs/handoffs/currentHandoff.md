# Current Handoff

Updated: 2026-08-15

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Tracking issue: `#10`

## Accepted generated-surface repair

The broad pale `Ice Cap` regression on freshly generated Earthlike worlds is resolved and visually accepted.

Accepted implementation checkpoint:

- commit: `0c2af70265fd862d34bbc517c84e3b24a8657892`
- message: `fix: use final sea level for permanent ice`
- GitHub Actions: Validate World Forge run `#824` / `31843938037`
- tests: 135 files / 488 tests green
- type-check, production build, harness tests, and production smokes green

Root defect: post-deep-time system/orbit reconciliation re-ran permanent-ice classification against `project.selectedValues.seaLevel`, an earlier sampled generation parameter, instead of authoritative present-day `primaryWorld.seaLevel`. Because alpine permanent ice depends on elevation above sea level, the stale datum could promote ordinary continental terrain into permanent ice and then stamp `ice_cap` back into topology and raster biomes.

The accepted repair passes `world.seaLevel` to the final permanent-ice classification. The temporary production latitude-profile rollback from `d59d568b...` was reverted because exact visual QA disproved it as the root cause.

A dedicated regression test covers the reported Sol-like / Earthlike `sol-reference-v1` path and proves the reconciled ice field matches a fresh classification using authoritative final sea level, with broad and low-latitude land-ice ceilings.

Human visual acceptance was completed on 2026-08-15: the user regenerated the reported `sol-reference-v1` case and confirmed the result looks good.

`npm run evaluate:regions` remains unclaimed for that checkpoint because the available GitHub connector does not expose the manual workflow dispatch path. Geographic region and harness tests passed in the standard exact-head suite.

## Current active item: TTRPG/cartographic atlas presentation

With the generated-surface regression closed, work returns to the bounded atlas presentation pass introduced at `7bc6b0b8775bbb023e365cfd127439aeffbe3d2e`.

The first 2D `TTRPG` presentation is already implemented over canonical `GeographicTileWindow` facts. It currently provides:

- parchment-colored map surface;
- restrained warm land palette;
- muted cool open/coastal/lake water;
- explicit inked coastlines;
- secondary water-side coast hachures;
- canonical rivers and ridge accents;
- restrained child boundaries and heavier parent boundary;
- cartographic serif labels with a paper-colored halo;
- selected-child treatment without debug/neon styling;
- optional world-anchored hex lines;
- unchanged tile IDs, hierarchy membership, picking, and navigation.

The next work is visual acceptance and bounded refinement of that presentation, not a new renderer or geography model.

Read:

- `refs/testing/geographic-atlas-presentation-qa.md`
- `refs/handoffs/archive/geographic-atlas-v0.3.71-paused.md`
- `refs/handoffs/geographic-drilldown-rendering-roadmap.md`

Primary code seams:

- `apps/desktop/src/regions/geographicAtlasPalette.ts`
- `apps/desktop/src/regions/geographicTileWindowMap.ts`
- `apps/desktop/src/regions/useGeographicAtlasController.ts`
- `apps/desktop/src/regions/GeographicAtlasWorkspace.tsx`

## TTRPG acceptance path

Use a bounded geographic drilldown, remain in `2D map`, and select `TTRPG`. Check at least one coastal region and one region/local interior with Hexes both on and off.

Acceptance should focus on whether the presentation reads as a clean hand-drawn/tabletop cartographic map rather than merely a recolored debug hex map:

- land and water separation is immediate;
- coastline is the strongest natural feature edge;
- coast hachures add cartographic character without noise;
- rivers and ridges remain legible but subordinate;
- hierarchy boundaries remain clear but restrained;
- labels fit the parchment/ink language;
- optional hexes are useful for tabletop play without dominating the clean map when disabled.

If refinement is needed, keep it presentation-only and derive any additional marks from existing canonical tile facts. Do not create a second terrain or geography classifier.

## Guardrails

- Do not reopen broad 2.5D or PBR experimentation as part of this pass.
- Do not change geographic hierarchy, tile IDs, membership, generation, or saved-world contracts for visual styling.
- Do not add politics, settlements, roads, resources, or generated names to solve a cartographic-style problem.
- Do not imitate a copyrighted game's map assets or exact visual style.
- Preserve Natural/Terrain behavior while refining TTRPG.
- Follow the repair-loop breaker: after repeated non-improving visual changes, stop tweaking and reassess from screenshot evidence.

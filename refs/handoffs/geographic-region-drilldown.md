# Current Handoff: Adaptive Geographic Drill-Down

Updated: 2026-07-27

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Visible version: `0.3.19`

Predecessor: `refs/handoffs/geography-aware-macro-regions.md`

Rendering follow-up: `refs/handoffs/geographic-drilldown-rendering-roadmap.md`

## Status

The first functional hierarchy prototype is implemented directly on `dev` and has completed an initial human browser pass through subregion level.

The accepted `0.3.18` geography-aware region candidate remains diagnostic-only and is still not the authoritative saved-world region contract. The new drilldown is also in-memory and diagnostic. No generator-version, replay-compatibility, or saved-project schema change has been made.

Repository validation passed on the user checkout after:

- correcting the Lucide `Map` name collision;
- patching adaptive-scale candidate evaluation so unusably fine scales are rejected before exact topology sampling;
- updating the lockfile to patched PostCSS and NanoID versions;
- confirming `npm audit` reports zero vulnerabilities;
- confirming `npm run verify` passes.

The prototype now supports:

1. World-level selection of continents, archipelagos, and provisional ocean basins.
2. Adaptive continent or basin maps using a deterministic world-anchored hex scale.
3. First-level region boundaries inside the selected macro area.
4. Region selection and an explicit **Open region** action.
5. On-demand deterministic subregion generation inside the exact selected-region membership.
6. Subregion selection and an explicit **Open subregion** action.
7. Reliable breadcrumb and parent navigation during the current session.
8. Seam-aware rectangular context maps that retain terrain outside the selected parent.

## Initial browser verdict

The hierarchy and breakdowns look broadly credible. Region and subregion shapes are coherent enough to continue the approach.

The main problems exposed by the browser pass are presentation and depth:

- the atlas should bias toward a widescreen desktop layout;
- horizontal space is plentiful, vertical space is constrained;
- the current header, breadcrumbs, controls, map, and inspector consume too much height;
- the hierarchy needs to continue through local and detail levels;
- enlarged world-map raster data becomes visibly soft and splotchy at region and subregion scales;
- Explorer-style rendering or canonical hex-tile translation should replace direct raster enlargement for close-scale maps.

The current windowed raster renderer is therefore accepted as a hierarchy proof, not as the production rendering path for regional maps.

## Resolved product rules

### Hierarchy

Use:

`World → continent / archipelago / ocean basin → region → subregion → local → detail`

The four `world-500mi` overview sectors remain simple navigation sectors. They are not geographic parents.

Continents and archipelagos are derived from the accepted surface-domain model. Open-ocean display domains are exposed as provisional ocean basins. More nuanced ocean and sea chunking is desired, but is not a blocker for validating the land hierarchy and drilldown interaction.

### Adaptive scales

Hierarchy levels do not hardcode miles-per-hex values.

The familiar 500, 60, 24, 6, and 1 mile values are reference points on a canonical scale ladder. The selected parent geography and the viewport footprint contract determine the actual scale.

Every opened map targets:

- hard minimum `10 x 10` contextual hexes;
- preferred `20 x 20`;
- hard maximum `50 x 50` where the selected membership can fit.

The scale contract records:

- nominal miles per hex;
- global world-grid dimensions;
- world-relative `q/r` ID format;
- exact parent hex count;
- contextual hex count;
- seam behavior;
- whether the selected membership fits the maximum footprint.

### Exact membership versus context

Child budgets use exact parent membership sampled through world-anchored hex centers.

Rectangular map coverage is rendering context only. Context terrain outside the selected parent remains visible but cannot be selected as a child of the open parent.

### Small geographic features

Display eligibility is recalculated at each generated scale.

The original geographic identity remains available through surface-domain metadata even when a small island or coastal feature is too small to own a useful display partition at a higher scale.

### Rendering

The current drilldown uses a seam-aware windowed canvas renderer. It renders existing world facts into a geographic extent and does not use a CSS crop.

The selected parent has a heavy high-contrast border. Child boundaries are lighter. Neighboring terrain remains visible across the full rectangle.

For production regional and deeper maps, the selected extent should drive a canonical world-anchored hex-tile window. The tile window should feed both 2D and future 3D renderers from the same classified tile facts.

## Implemented contracts and engine

### Shared hierarchy contract

`packages/shared/src/geographicHierarchy.ts`

Defines:

- scale-neutral hierarchy levels;
- continent, archipelago, and ocean-basin macro areas;
- adaptive hex-scale contracts;
- seam-aware rectangular map extents;
- generic hierarchy nodes;
- deterministic child partitions;
- versioned signatures.

### Adaptive scale selection

`packages/generator-core/src/geographicAdaptiveScale.ts`

Provides:

- deterministic scale selection from a canonical ladder;
- world-anchored pointy odd-row coordinates;
- compact seam-aware bounds;
- exact parent-hex counting through topology membership;
- contextual padding;
- stable ID formats;
- early rejection of over-fine candidates that already violate the maximum footprint.

### Macro areas

`packages/generator-core/src/geographicMacroAreas.ts`

Builds macro parents from first-level display-domain ownership:

- landmass domains become continents;
- archipelago domains remain archipelagos;
- open-ocean domains become provisional ocean basins;
- macro membership covers the complete display-domain topology;
- child first-level region IDs remain stable.

The current ocean implementation generally yields one basin per open-ocean display domain. Subdivision into more natural ocean and sea units remains a later refinement.

### Child partition

`packages/generator-core/src/geographicChildPartition.ts`

Generates children on demand from exact parent membership.

The implementation:

- detects disconnected parent components;
- allocates at least one deterministic seed per component;
- derives child count from exact next-scale hex coverage;
- grows only through parent membership;
- uses the established coastline, elevation, biome, climate, plate, lake, and river evidence;
- completely covers all and only the parent;
- produces stable IDs from project, world, parent, level, scale, and seed cell;
- retains world-relative coordinates;
- produces a deterministic partition signature.

### Windowed renderer

`apps/desktop/src/regions/geographicWindowedMap.ts`

Provides:

- seam-aware rectangular rendering;
- Natural and Terrain presentations;
- context outside the selected parent;
- heavy parent boundaries;
- child boundaries and selection tint;
- a world-anchored hex overlay.

Known limitation: it resamples the existing world map and becomes visibly splotchy when enlarged. It should be superseded at region and deeper scales by the canonical tile-window rendering path.

### Atlas UI

Relevant files:

- `apps/desktop/src/regions/GeographicHierarchyPanel.tsx`
- `apps/desktop/src/regions/GeographicAtlasModal.tsx`
- `apps/desktop/src/regions/GeographicAtlasCards.tsx`
- `apps/desktop/src/regions/useGeographicAtlasController.ts`
- `apps/desktop/src/regions/geographicHierarchyPreview.ts`
- `apps/desktop/src/regions/geographicHierarchy.css`
- `apps/desktop/src/panels/RightPanel.tsx`

The right-side World panel includes **Geographic atlas → Open geographic atlas**.

The atlas provides:

- continent, archipelago, and ocean-basin cards;
- adaptive scale and footprint diagnostics;
- Natural and Terrain toggles;
- optional world-relative hex display;
- region selection and opening;
- on-demand subregion generation;
- subregion selection and opening;
- breadcrumb and parent navigation.

## Existing tile translation work

The current hex-tile export pipeline already classifies:

- biome;
- morphology;
- elevation;
- temperature;
- wetness;
- water and ice;
- river strength and river edges;
- ridge edges;
- volcanism;
- terrain and feature details.

Relevant implementation begins in `packages/exporters/src/index.ts` with `generateHexTileMap(...)`.

The next implementation should extract this classification into a canonical extent-aware runtime tile translation layer. Exporters should serialize or draw the shared tile model rather than own the classification logic.

## Automated coverage

Focused tests cover:

- deterministic adaptive scale selection;
- `10 x 10` through `50 x 50` viewport behavior;
- compact longitude-seam extents;
- exact parent membership;
- deterministic child IDs and signatures;
- complete parent-only child coverage;
- disconnected island components.

The full repository suite passed after the adaptive-scale performance correction.

## Browser inspection

Use:

`refs/testing/geographic-region-drilldown-qa.md`

The initial pass completed at least one full:

`World → archipelago → region → subregion`

sequence and confirmed the hierarchy is usable enough to continue.

Additional required coverage remains:

- fixed seed `2850873 / 1001001`;
- world seed `9776542`;
- one Pangea world;
- a longitude-seam parent;
- repeatability after closing and reopening;
- larger-topology performance.

## Current boundaries

This slice does not:

- activate `world-regions-v2` as saved-world authority;
- persist macro areas or child partitions;
- generate new higher-resolution terrain facts;
- provide final URL routing or context menus;
- generate local or detail children;
- split a global open ocean into multiple scientifically named basins and seas;
- provide production 3D terrain or procedural PBR materials;
- define politics, cultures, settlements, roads, or resources.

The windowed renderer resamples the existing world map facts. Higher-resolution regional terrain generation and tile translation remain separate product increments.

## Next owner priorities

Work directly on `dev`.

1. Read `refs/handoffs/geographic-drilldown-rendering-roadmap.md`.
2. Refactor the existing hex-tile classifier into an extent-aware, world-anchored canonical tile-window generator.
3. Correct the atlas to a widescreen-first layout with a compact header and right-side inspector.
4. Replace direct raster enlargement at region and deeper levels with a clean 2D tile renderer.
5. Implement local and detail hierarchy levels using inherited parent facts as constraints.
6. Retain exact membership, context-only tiles, seam behavior, stable IDs, and deterministic regeneration.
7. Complete the remaining browser QA worlds and capture screenshots under `refs/testing/`.
8. Begin the 3D proof only after the canonical tile model is stable and visually cleaner than the current raster path.

## Acceptance boundary for the next slice

The tile-window and deeper-drilldown slice is ready to advance when:

- the atlas is usable without page-level vertical scrolling at a common widescreen desktop resolution;
- region, subregion, local, and detail maps use canonical world-anchored tile windows;
- exact parent membership remains distinct from contextual tiles;
- tile IDs remain stable across reopening and adjacent windows;
- coastlines, major rivers, ridges, climate, and biome remain consistent with parent facts;
- close-scale maps are materially cleaner and more legible than the current enlarged raster;
- local and detail children cover all and only their parent;
- seam-crossing windows remain compact;
- deterministic regeneration reproduces IDs and membership;
- `npm audit` reports zero vulnerabilities;
- `npm run verify` passes;
- browser QA accepts the full world-to-detail path.

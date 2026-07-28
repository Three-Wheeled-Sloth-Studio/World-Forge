# Current Handoff: Canonical Geographic Tile-Window Drilldown

Updated: 2026-07-28

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Visible version: `0.3.20`

Predecessor: `refs/handoffs/geography-aware-macro-regions.md`

Rendering direction: `refs/handoffs/geographic-drilldown-rendering-roadmap.md`

Browser QA: `refs/testing/geographic-region-drilldown-qa.md`

Tracking issue: `#10 [PI] Build canonical tile-window geographic drilldown`

## Working model

This repository is maintained by one active developer. Routine increments are implemented directly on `dev`, then the exact accepted commit is promoted through `qa` and `main`.

The permanent directive is recorded in root `AGENTS.md`. Do not create feature branches or pull requests for ordinary implementation work unless the user explicitly changes this workflow.

## Status

The geographic hierarchy now has an implementation path from:

`World -> continent / archipelago / ocean basin -> region -> subregion -> local -> detail`

The initial hierarchy prototype through subregion remains diagnostic and in-memory. The new `0.3.20` work adds:

1. A versioned canonical geographic tile-window contract.
2. An extent-aware, world-anchored runtime tile-window generator.
3. Explicit parent versus context-only tile roles.
4. Stable tile IDs based on adaptive scale and world-relative `q/r` coordinates.
5. Seam-aware one-tile classification halos for bounded edge context.
6. Deterministic river and ridge edge classification for regional rendering.
7. A clean 2D canvas tile renderer with Natural and Terrain presentations.
8. Heavy parent boundaries, lighter child boundaries, selection tint, labels, rivers, ridges, ice, and optional hex lines.
9. Generic child orchestration through subregion, local, and detail.
10. A widescreen-first atlas composition with compact navigation and a right-side inspector.
11. Focused deterministic, overlap, seam, context-role, and deep-partition tests.

The current implementation was committed directly to `dev` in small milestones. No saved-world schema, generator version, or replay contract was changed.

## Validation state

Validation is not yet accepted.

- GitHub Actions is configured to run `npm run verify` on every push to `dev`.
- The available GitHub connector has returned no check records for the implementation commits.
- No claim is made that the current `dev` head passes until a real workflow result or user-checkout run confirms it.
- Browser QA has not yet been completed for `0.3.20`.
- Promotion to `qa` or `main` must wait for verification and the required browser pass.

## Resolved product rules

### Hierarchy

Use:

`World -> continent / archipelago / ocean basin -> region -> subregion -> local -> detail`

The four `world-500mi` overview sectors remain navigation sectors, not geographic parents.

Continents and archipelagos derive from the accepted surface-domain model. Open-ocean display domains remain provisional ocean basins.

### Adaptive scales

Hierarchy levels do not hardcode miles-per-hex values.

The familiar 500, 60, 24, 6, and 1 mile values are reference points on a canonical scale ladder. Selected geography and viewport footprint determine the actual scale.

Every opened map targets:

- hard minimum `10 x 10` contextual hexes;
- preferred `20 x 20`;
- hard maximum `50 x 50` where selected membership can fit.

### Exact membership and context

Child budgets use exact parent membership sampled through world-anchored hex centers.

Rectangular coverage is rendering context only. Context terrain remains visible but cannot be selected as a child of the opened parent.

The tile-window contract records this as an explicit tile role rather than inferring it from color or overlay state.

### Determinism

- Tile IDs are world-relative and include the adaptive scale identity.
- Tile coordinates do not restart at `0,0` inside each parent.
- Overlapping windows must produce identical facts for the same tile ID.
- Child IDs and memberships remain deterministic across close and reopen.
- Presentation noise must not alter authoritative world facts.

### Persistence boundary

This remains diagnostic and in-memory.

Do not activate or persist `world-regions-v2`, macro areas, child partitions, or tile windows without a separate approved increment.

## Implemented contracts and engine

### Shared hierarchy contract

`packages/shared/src/geographicHierarchy.ts`

Defines:

- scale-neutral hierarchy levels;
- macro areas;
- adaptive scales;
- seam-aware extents;
- hierarchy nodes and partitions;
- stable signatures.

### Canonical tile-window contract

`packages/shared/src/geographicTileWindow.ts`

Defines:

- `geographic-tile-window-v1`;
- `geographic-tile-classifier-v1`;
- source project, world, topology, scale, and extent identity;
- stable world-relative tile identity;
- topology-cell provenance;
- parent versus context membership role;
- optional child membership index;
- biome, morphology, features, elevation, slope, climate, water, ice, volcanism, rivers, ridges, and plate facts;
- deterministic window signature.

The contract intentionally excludes canvas coordinates, UI colors, tooltip copy, 3D materials, and persistence concerns.

### Extent-aware tile-window generator

`packages/generator-core/src/geographicTileWindow.ts`

Provides:

- selected-extent generation rather than a fine full-world grid;
- world-relative `q/r` iteration;
- compact longitude wrapping;
- exact parent and context role classification;
- a one-tile halo for deterministic edge decisions;
- stable river and ridge edges across overlapping windows;
- deterministic window signatures.

Current boundary: the runtime classifier mirrors established exporter classification behavior, but `packages/exporters/src/index.ts` still owns its existing parallel implementation. Moving exporter generation onto the canonical runtime classifier remains required before issue #10 is complete.

### Generic hierarchy orchestration

`apps/desktop/src/regions/geographicHierarchyPreview.ts`

Now supports:

- opening macro areas and regions;
- generic child construction for region, subregion, and local parents;
- opening subregion, local, and detail children through one path;
- cache keys including project, algorithm versions, parent, child level, and scale.

The established `buildGeographicChildPartition(...)` engine remains the source of child membership and stable child IDs.

### Canonical 2D renderer

`apps/desktop/src/regions/geographicTileWindowMap.ts`

Provides:

- direct tile-window rendering without enlarging the world raster;
- Natural and Terrain fills from the same canonical tile facts;
- context dimming;
- heavy parent borders;
- child boundaries and selected-child tint;
- river and ridge rendering;
- optional hex lines.

The old `geographicWindowedMap.ts` remains available for geographic transforms and as historical hierarchy-proof code. The atlas no longer uses its raster enlargement as the primary map surface.

### Atlas UI

Relevant files:

- `apps/desktop/src/regions/GeographicAtlasModal.tsx`
- `apps/desktop/src/regions/GeographicAtlasCards.tsx`
- `apps/desktop/src/regions/useGeographicAtlasController.ts`
- `apps/desktop/src/regions/geographicHierarchyPreview.ts`
- `apps/desktop/src/regions/geographicHierarchy.css`

The atlas now provides:

- a compact title and breadcrumb row;
- compact map controls;
- a dominant map area;
- a bounded right-side inspector;
- macro, region, subregion, local, and detail navigation;
- generic child generation and selection;
- a terminal detail-level card;
- responsive stacking only at narrower widths.

## Automated coverage

Existing tests continue to cover:

- deterministic adaptive scale selection;
- `10 x 10` through `50 x 50` footprint behavior;
- compact seam extents;
- exact membership;
- deterministic child IDs and signatures;
- complete parent-only child coverage;
- disconnected island components.

New tests cover:

- deterministic tile-window signatures and tile facts;
- stable tile IDs;
- explicit parent and context roles;
- overlapping-window fact equality;
- seam-crossing world coordinates;
- sequential subregion, local, and detail partition generation.

These tests are committed but are not recorded as passing until repository verification produces a real result.

## Required browser QA

Use `refs/testing/geographic-region-drilldown-qa.md`.

At minimum inspect:

- star seed `2850873`, world seed `1001001`;
- world seed `9776542`;
- one fresh Archipelago preset;
- one fresh Pangea preset;
- one seam-crossing parent;
- one maximum-footprint or larger-topology case.

Complete at least one full:

`World -> macro area -> region -> subregion -> local -> detail`

Record:

- commit SHA and visible version;
- topology and map resolution;
- every adaptive scale and viewport;
- child counts and generation times;
- overlap and reopen stability;
- Natural and Terrain readability;
- river, ridge, coastline, biome, and boundary continuity;
- widescreen layout behavior;
- screenshots under `refs/testing/`.

## Current boundaries

This slice does not:

- activate `world-regions-v2` as saved-world authority;
- persist hierarchy or tile-window results;
- modify generator or replay compatibility;
- produce final high-resolution erosion or hydrology simulation at local scales;
- provide final URL routing or context menus;
- scientifically decompose oceans and seas;
- define politics, cultures, settlements, roads, or resources;
- provide 3D terrain, PBR materials, blend maps, or procedural transition systems.

## Immediate next actions

1. Obtain a real `npm audit` and `npm run verify` result for the current `dev` head.
2. Fix any type, test, or build failures before browser evaluation.
3. Complete the required browser QA matrix through detail level.
4. Capture screenshots and record findings in the QA reference.
5. Refactor exporter hex generation to consume the canonical classifier rather than retaining parallel ownership.
6. Confirm overlapping windows and adjacent hierarchy levels preserve rivers, ridges, coastlines, and tile facts.
7. Update this handoff and the rendering roadmap with the accepted verdict.
8. Promote the exact accepted `dev` commit to `qa`, then `main`, following the established single-developer promotion process.
9. Begin the regional 3D proof only after this tile model is accepted.

## Acceptance boundary

The tile-window increment is ready to promote when:

- `npm audit` reports zero vulnerabilities;
- `npm run verify` passes;
- region, subregion, local, and detail maps use canonical world-anchored tile windows;
- the full world-to-detail path passes browser QA;
- the atlas requires no normal page-level vertical scrolling at a recorded widescreen resolution;
- close-scale rendering is materially cleaner than the former enlarged raster;
- exact parent membership remains distinct from contextual tiles;
- tile IDs and facts remain stable across reopening and overlapping windows;
- seam-crossing windows remain compact and usable;
- local and detail children cover all and only their parent;
- exporters consume the canonical classifier or the remaining duplication is explicitly split into a separately approved follow-up;
- updated QA evidence and handoff status are committed to `dev`.

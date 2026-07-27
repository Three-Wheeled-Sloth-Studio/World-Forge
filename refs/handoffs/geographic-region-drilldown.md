# Current Handoff: Adaptive Geographic Drill-Down

Updated: 2026-07-27

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Visible version: `0.3.19`

Predecessor: `refs/handoffs/geography-aware-macro-regions.md`

## Status

The first functional hierarchy prototype is implemented directly on `dev`.

The accepted `0.3.18` geography-aware region candidate remains diagnostic-only and is still not the authoritative saved-world region contract. The new drilldown is also in-memory and diagnostic. No generator-version, replay-compatibility, or saved-project schema change has been made.

The prototype now supports:

1. World-level selection of continents, archipelagos, and provisional ocean basins.
2. Adaptive continent or basin maps using a deterministic world-anchored hex scale.
3. First-level region boundaries inside the selected macro area.
4. Region selection and an explicit **Open region** action.
5. On-demand deterministic subregion generation inside the exact selected-region membership.
6. Subregion selection and an explicit **Open subregion** action.
7. Reliable breadcrumb and parent navigation during the current session.
8. Seam-aware rectangular context maps that retain terrain outside the selected parent.

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

- hard minimum `10 x 10` contextual hexes,
- preferred `20 x 20`,
- hard maximum `50 x 50` where the selected membership can fit.

The scale contract records:

- nominal miles per hex,
- global world-grid dimensions,
- world-relative `q/r` ID format,
- exact parent hex count,
- contextual hex count,
- seam behavior,
- and whether the selected membership fits the maximum footprint.

### Exact membership versus context

Child budgets use exact parent membership sampled through world-anchored hex centers.

Rectangular map coverage is rendering context only. Context terrain outside the selected parent remains visible but cannot be selected as a child of the open parent.

### Small geographic features

Display eligibility is recalculated at each generated scale.

The original geographic identity remains available through surface-domain metadata even when a small island or coastal feature is too small to own a useful display partition at a higher scale.

### Rendering

The drilldown uses a seam-aware windowed canvas renderer. It renders existing world facts into a geographic extent and does not use a CSS crop.

The selected parent has a heavy high-contrast border. Child boundaries are lighter. Neighboring terrain remains visible across the full rectangle.

## Implemented contracts and engine

### Shared hierarchy contract

`packages/shared/src/geographicHierarchy.ts`

Defines:

- scale-neutral hierarchy levels,
- continent, archipelago, and ocean-basin macro areas,
- adaptive hex-scale contracts,
- seam-aware rectangular map extents,
- generic hierarchy nodes,
- deterministic child partitions,
- and versioned signatures.

### Adaptive scale selection

`packages/generator-core/src/geographicAdaptiveScale.ts`

Provides:

- deterministic scale selection from a canonical ladder,
- world-anchored pointy odd-row coordinates,
- compact seam-aware bounds,
- exact parent-hex counting through topology membership,
- contextual padding,
- and stable ID formats.

### Macro areas

`packages/generator-core/src/geographicMacroAreas.ts`

Builds macro parents from first-level display-domain ownership:

- landmass domains become continents,
- archipelago domains remain archipelagos,
- open-ocean domains become provisional ocean basins,
- macro membership covers the complete display-domain topology,
- and child first-level region IDs remain stable.

The current ocean implementation generally yields one basin per open-ocean display domain. Subdivision into more natural ocean and sea units remains a later refinement.

### Child partition

`packages/generator-core/src/geographicChildPartition.ts`

Generates children on demand from exact parent membership.

The implementation:

- detects disconnected parent components,
- allocates at least one deterministic seed per component,
- derives child count from exact next-scale hex coverage,
- grows only through parent membership,
- uses the established coastline, elevation, biome, climate, plate, lake, and river evidence,
- completely covers all and only the parent,
- produces stable IDs from project, world, parent, level, scale, and seed cell,
- retains world-relative coordinates,
- and produces a deterministic partition signature.

### Windowed renderer

`apps/desktop/src/regions/geographicWindowedMap.ts`

Provides:

- seam-aware rectangular rendering,
- Natural and Terrain presentations,
- context outside the selected parent,
- heavy parent boundaries,
- child boundaries and selection tint,
- and a world-anchored hex overlay.

### Atlas UI

Relevant files:

- `apps/desktop/src/regions/GeographicHierarchyPanel.tsx`
- `apps/desktop/src/regions/GeographicAtlasModal.tsx`
- `apps/desktop/src/regions/GeographicAtlasCards.tsx`
- `apps/desktop/src/regions/useGeographicAtlasController.ts`
- `apps/desktop/src/regions/geographicHierarchyPreview.ts`
- `apps/desktop/src/regions/geographicHierarchy.css`
- `apps/desktop/src/panels/RightPanel.tsx`

The right-side World panel now includes **Geographic atlas → Open geographic atlas**.

The atlas provides:

- continent, archipelago, and ocean-basin cards,
- adaptive scale and footprint diagnostics,
- Natural and Terrain toggles,
- optional world-relative hex display,
- region selection and opening,
- on-demand subregion generation,
- subregion selection and opening,
- and breadcrumb and parent navigation.

## Automated coverage

Added focused tests for:

- deterministic adaptive scale selection,
- `10 x 10` through `50 x 50` viewport behavior,
- compact longitude-seam extents,
- exact parent membership,
- deterministic child IDs and signatures,
- complete parent-only child coverage,
- and disconnected island components.

## Browser inspection

Use:

`refs/testing/geographic-region-drilldown-qa.md`

Required first pass:

- star seed `2850873`, world seed `1001001`,
- world seed `9776542`,
- one Archipelago world,
- one Pangea world,
- one continent or region crossing the longitude seam,
- Natural and Terrain presentations,
- hexes on and off,
- and at least one complete world → macro area → region → subregion sequence.

## Current boundaries

This slice does not:

- activate `world-regions-v2` as saved-world authority,
- persist macro areas or child partitions,
- generate new higher-resolution terrain facts,
- provide final URL routing or context menus,
- generate local or detail children,
- split a global open ocean into multiple scientifically named basins and seas,
- or define politics, cultures, settlements, roads, or resources.

The windowed renderer resamples the existing world map facts. It proves hierarchy, coordinates, context, and interaction. Higher-resolution regional terrain generation remains a separate product increment.

## Next owner priorities

Work directly on `dev`.

1. Run `npm run verify` and repair any repository-level type or test failures.
2. Complete the browser drilldown checklist and retain screenshots under `refs/testing/`.
3. Confirm scale selection keeps ordinary maps near the preferred `20 x 20` footprint without cropping selected geography.
4. Confirm exact parent membership and context-only behavior by clicking near the heavy boundary.
5. Confirm seam-crossing extents remain compact and do not create a false map-edge boundary.
6. Confirm child IDs and membership reproduce after closing and reopening the atlas.
7. Record performance for large topologies and repeated subregion generation.
8. Make bounded corrections before considering local/detail levels or authoritative activation.

## Acceptance boundary

The prototype is ready to advance when:

- continent and region extents are compact and seam-safe,
- adaptive scales consistently prioritize the viewport footprint contract,
- exact parent membership drives child budgets,
- surrounding context remains visible but cannot become a child,
- first-level regions appear inside their macro area,
- subregions cover all and only the selected region,
- selection and heavy borders match visible geography,
- world-relative hex coordinates remain stable,
- Back restores the previous level and selection context,
- deterministic regeneration reproduces IDs and membership,
- `npm run verify` passes,
- and browser QA accepts the full world-to-subregion path.

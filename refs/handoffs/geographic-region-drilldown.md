# Geographic Region Drilldown Handoff

Updated: 2026-07-28

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Visible version: `0.3.23`

Tracking issues:

- `#10` Canonical tile-window geographic drilldown
- `#12` Split oversized landmasses at narrow isthmuses

## Working model

This repository has one active developer. Routine implementation lands directly on `dev` in small functional increments, then the exact accepted commit is promoted through `qa` and `main`. Root `AGENTS.md` is authoritative for this workflow.

The geographic hierarchy remains diagnostic and in-memory. No saved schema, generator-version, replay, or persistence contract changed.

## Current hierarchy

`World -> continent / archipelago / ocean basin -> region -> subregion -> local -> detail`

The drilldown begins on the normal world map. The former separate Atlas workflow is no longer the intended product path.

## Main-map drilldown status

Implemented:

- Compact drilldown toggle in the existing world-map toolbar.
- Normal world terrain with continent, archipelago, and ocean-basin borders.
- Left-click selection.
- Right-click selection plus an action menu.
- Double-click and Enter as direct open shortcuts.
- Escape, Back, and breadcrumbs for navigation.
- Immediate light dashed child borders after opening a parent.
- Width-driven adaptive scales targeting approximately 50 hexes across.
- Maximum adjacent scale ratio of 2.5x, with intermediate scales inserted as needed.
- Child budgets based on how many next-scale viewports fit inside the current parent.
- Readable right-panel level, area, selection, scale, viewport, and child-count data.
- `Auto`, `Terrain + hex`, and `Tiles` presentation controls.
- Point diagnostics and geographic drilldown coexist at world level.

### Presentation behavior

- World through subregion: `Auto` retains the natural raster-backed terrain and overlays geographic borders and the world-anchored hex grid.
- Local and detail: `Auto` uses the canonical natural tile renderer.
- `Terrain + hex` forces the inherited terrain crop with overlays.
- `Tiles` forces canonical naturally colored tiles.

Known rendering follow-ups:

- Raster-backed maps become soft at deeper zoom levels.
- The current scale path may stall around 6-mile hexes for some parents instead of reaching 1-mile and 0.5-mile targets.
- These are separate from the macro-area decomposition increment and should be addressed after continent QA.

## Continent and macro-area decomposition

Version `0.3.23` replaces the one-connected-domain-equals-one-continent assumption with deterministic isthmus-aware macro decomposition.

### Inputs

The macro builder now receives:

- authoritative topology water membership;
- the requested world `continentCount`;
- the existing accepted landmass, archipelago, and open-ocean display domains.

### Algorithm

For each connected landmass assigned more than one requested continent:

1. Build actual land-only membership inside the display domain.
2. Measure topology-graph distance from every land cell to the nearest coast or non-land boundary.
3. Erode the landmass at progressively deeper thresholds to expose broad interior cores.
4. Find connected interior-core components.
5. Reject components below absolute and parent-relative cell and area budgets.
6. Select up to the allocated continent target using retained-core coverage, area balance, stable topology seed, and shallowest viable erosion.
7. Assign all removed coastline, peninsula, and isthmus cells back to accepted cores with deterministic multi-source graph growth.
8. Extend that ownership across the display domain's territorial-water cells.

The physical terrain and land bridge remain unchanged. Only macro-area membership is split.

### Intended behavior

- Two independently large land bodies connected by a narrow isthmus may become separate continents.
- A small peninsula remains attached because it does not contain a second substantial interior core.
- Archipelagos retain their existing grouping behavior.
- Ocean basins are unchanged.
- Split continent IDs include the stable core topology cell.
- Region children are assigned to the split macro area with the greatest weighted topology overlap.
- Algorithm and signatures include `isthmus-core-v1`.

### Automated coverage

`packages/generator-core/src/geographicMacroAreas.test.ts` covers:

- two continent-sized lobes joined by a narrow bridge splitting into two macro areas;
- an ordinary narrow peninsula remaining attached;
- deterministic core IDs and memberships;
- complete assignment of land and territorial-water display-domain cells.

## Guardrails

- Do not alter terrain merely to make continent borders easier.
- Do not use a one-cell articulation-point rule as the primary splitter.
- Do not split ordinary peninsulas without a second substantial interior core.
- Do not introduce a second authoritative geography model.
- Do not reset coordinates at parent boundaries.
- Keep exact parent membership separate from rectangular rendering context.
- Keep all hierarchy generation deterministic and world-anchored.
- Do not activate or persist `world-regions-v2` as part of this work.
- Do not begin 3D or procedural material work until the 2D hierarchy and canonical tile model are stable.

## Browser QA required for 0.3.23

Use the same saved world that previously collapsed its large land bodies into one macro continent, plus at least one fresh Pangea and one fresh Archipelago world.

Record:

- selected `continentCount`;
- connected landmass count before macro decomposition;
- resulting continent, archipelago, and ocean-basin counts;
- visible split locations;
- whether each side of a split is independently substantial;
- whether ordinary peninsulas remain attached;
- close/reopen ID and border stability;
- whether all child regions remain reachable from exactly one macro parent.

## Acceptance still required

1. `npm audit` reports no unresolved vulnerability.
2. `npm run verify` passes on the exact `dev` commit.
3. Browser QA confirms useful isthmus splits on real generated worlds without excessive peninsula splitting.
4. Browser QA covers the prescribed seed/preset matrix and longitude seam case.
5. Screenshots show world selection, macro borders, and at least one accepted isthmus split.
6. Reopening the same area produces stable IDs, boundaries, and inherited facts.
7. The exact accepted `dev` commit is promoted to `qa`, then `main`.

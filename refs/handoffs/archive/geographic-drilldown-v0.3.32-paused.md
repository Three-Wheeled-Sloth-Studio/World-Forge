# Geographic Drilldown Status at Pause

Updated: 2026-07-28

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Runtime version observed during QA: `0.3.32`

Source version currently declared in `apps/desktop/src/appVersion.ts`: `0.3.23`

Tracking issues:

- `#10` Canonical tile-window geographic drilldown
- `#12` Split oversized landmasses at narrow isthmuses

Status: **paused, usable for testing, not accepted or promoted**

## Why this work is being paused

The main drilldown interaction is now coherent enough for product testing, but the continent decomposition change did not alter the real generated-world behavior observed in the browser. Continuing to tune the splitter without first proving which runtime code and inputs are active risks another round of algorithm work aimed at the wrong execution path.

The project is pivoting to world-builder cleanup. Geographic work remains preserved and resumable, but is no longer the active increment.

## Progress completed

### Product workflow

- Drilldown begins on the normal world map rather than a separate Atlas modal.
- A compact map-toolbar toggle enables and disables geographic drilldown.
- World view retains the normal terrain display with macro-area overlays.
- Left-click selects.
- Right-click selects and opens an action menu.
- Double-click and Enter open the selected area directly.
- Escape, Back, and breadcrumbs navigate upward.
- Child boundaries appear immediately after a parent opens.
- The right panel reports level, area, selection, scale, viewport, and child count.
- `Auto`, `Terrain + hex`, and `Tiles` presentation controls are available.
- Point inspection and world-level drilldown can coexist.

### Scale and partition model

- The working target is approximately 50 hexes across.
- Initial scale is width-driven and height follows the selected shape.
- Adjacent scale steps are limited to 2.5x.
- Intermediate scale steps are inserted between canonical targets.
- Child counts are derived from the next target scale instead of a fixed raw-hex quota.
- The generic hierarchy reaches:

`World -> continent / archipelago / ocean basin -> region -> subregion -> local -> detail`

### Canonical tiles

- Runtime drilldown uses world-anchored canonical tile windows.
- Tile IDs remain stable across overlapping windows.
- Exact parent membership is separated from rectangular rendering context.
- Region through detail maps can use the clean 2D tile renderer.
- Terrain presentation at detail scale is a strong visual proof of the underlying tile model.

### Macro-area decomposition attempt

- Macro generation was extended to receive topology water membership and the requested `continentCount`.
- Connected landmasses can be eroded into interior cores.
- Synthetic tests cover two large lobes joined by a narrow neck, an ordinary peninsula, determinism, and complete membership assignment.
- The intended algorithm preserves the physical land bridge and changes only macro-area membership.

## QA findings at pause

### Working well enough for testing

- Selection and right-click behavior now match the intended interaction.
- Drilldown scale changes generally feel appropriate.
- Region, subregion, local, and detail traversal is coherent.
- Detail-level Terrain rendering looks good and provides a useful foundation for future icons and inspectors.

### Unresolved

1. **Real continent behavior is unchanged.**
   - The tested world still collapses several large land bodies into one macro continent.
   - The synthetic isthmus tests therefore do not prove that the production runtime path is using the expected decomposition inputs or thresholds.

2. **Runtime provenance is unclear.**
   - Browser QA reports `0.3.32`.
   - The `dev` source constant currently reports `0.3.23`.
   - Before more algorithm changes, the exact deployed World Forge commit and embedded-module version must be visible and trustworthy.

3. **Raster-backed views become soft after several drill levels.**
   - The normal terrain crop is being enlarged beyond its useful source resolution.
   - Canonical tiles remain sharper but currently look flatter at some scales.

4. **Some paths appear to stop around 6-mile hexes.**
   - The hierarchy may reach deeper logical levels without advancing to the intended 1-mile and 0.5-mile scale targets.

5. **Macro-area source geography still contains suspicious ribbon land.**
   - Thin land strips can join otherwise separate masses.
   - Continent classification should tolerate narrow connections, but terrain-generation ribbon defects need their own diagnostics and repair path.

6. **Exporter convergence remains incomplete.**
   - Runtime and exporter classifiers remain parallel implementations.

## Likely causes of the unchanged continent result

These remain hypotheses until instrumented:

1. The browser may not be running the expected World Forge commit.
2. A cached hierarchy preview may be reusing pre-decomposition macro membership.
3. The production macro builder may not be receiving the requested `continentCount` or authoritative water layer.
4. Requested continent pieces may be allocated, but the real landmass may not produce multiple accepted cores under current area and erosion thresholds.
5. The connected surface domain may contain broad or numerous ribbon connections that survive the erosion depth cap.
6. The displayed macro overlay may still be reading an older membership array than the hierarchy opener.

## Required instrumentation before resuming continent work

Do not tune thresholds first. Add an inspectable macro-decomposition report containing:

- exact source commit and visible runtime version;
- project ID, world seed, topology resolution, and selected `continentCount`;
- connected land-component count;
- accepted landmass and archipelago domain count;
- desired continent pieces allocated to each landmass;
- land cell count and weighted area per landmass;
- maximum coast distance and erosion depths attempted;
- candidate core count at each depth;
- rejection reason for each discarded core;
- selected core seeds and weighted areas;
- final macro-area count and membership signature;
- whether a cached preview was used;
- source membership array used by the world overlay.

The report should be available in development diagnostics and exportable as JSON for a saved test world.

## Resume sequence

1. Fix runtime provenance so the browser shows the exact embedded World Forge commit.
2. Add the macro-decomposition diagnostics above.
3. Reproduce the saved failing world and capture its report before changing thresholds.
4. Confirm that the intended builder receives `continentCount` and water membership.
5. Confirm that the world overlay and drilldown opener use the same macro membership.
6. Adjust erosion depth, core-area budgets, or domain preparation only after the failing stage is identified.
7. Add the saved world or a derived deterministic fixture as a regression case.
8. Revisit ribbon-land diagnostics as a separate terrain-quality increment.

## Promotion status

This increment is not accepted for promotion to `qa` or `main` as a completed geography milestone.

The current drilldown may remain on `dev` for testing because it is additive and useful, but issues `#10` and `#12` remain open and paused.

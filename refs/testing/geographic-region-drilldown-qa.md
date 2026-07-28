# Geographic Region Drill-Down: Browser QA

Updated: 2026-07-27

Branch: `dev`

Visible version: `0.3.19`

Status: Initial browser inspection completed through subregion level. Hierarchy behavior is promising; layout and rendering follow-ups are required before production acceptance.

## Initial observed result

A complete `World → Archipelago 1 → Region 56 → Subregion 1` path was opened successfully.

Observed positives:

- hierarchy navigation and breadcrumbs worked;
- region and subregion breakdowns looked broadly coherent;
- adaptive hex presentation and heavy parent boundary were readable;
- the approach is credible enough to continue through local and detail levels.

Observed issues:

- the atlas should assume a widescreen desktop layout;
- the current title, breadcrumb, controls, and inspector consume too much vertical space;
- the map should occupy more of the available horizontal area;
- the enlarged source raster becomes visibly soft and splotchy at close scales;
- region and deeper maps should move to Explorer-style rendering or the canonical hex-tile translation path;
- local and detail drilldown still need implementation.

Rendering follow-up is documented in:

`refs/handoffs/geographic-drilldown-rendering-roadmap.md`

## Setup

1. Pull the latest `dev` branch.
2. Run `npm install` if dependencies changed locally.
3. Run `npm run dev` and restart any Parchment Worlds shell embedding the app.
4. Generate a fresh world or open a compatible existing world.
5. Use Map view and open the right-side World tab.
6. In **Geographic atlas**, choose **Open geographic atlas**.

The atlas is diagnostic and in-memory. It does not replace the saved-world region contract.

## Required worlds

Inspect at minimum:

- star seed `2850873`, world seed `1001001`;
- world seed `9776542`;
- one fresh Archipelago preset;
- one fresh Pangea preset;
- one macro area or region that crosses the longitude seam.

Record the exact seed, preset, topology resolution, map resolution, and dev commit for each run.

## World to macro-area pass

1. Open the atlas.
2. Confirm continent and archipelago cards are listed separately from provisional ocean basins.
3. Open at least one large continent, one small continent or archipelago, and one ocean basin.
4. Confirm the macro map reports:
   - a deterministic miles-per-hex scale;
   - a world grid size;
   - exact parent hexes;
   - contextual hexes;
   - a viewport generally between `10 x 10` and `50 x 50`;
   - seam status.
5. Confirm first-level region boundaries and labels appear inside the selected macro area.
6. Confirm terrain outside the heavy macro boundary remains visible.
7. Click outside the heavy boundary and confirm no region outside the macro area is selected.

## Macro-area to region pass

1. Select a region by clicking its label or using the region selector.
2. Confirm selection highlighting matches the visible region.
3. Choose **Open region**.
4. Confirm the opened region uses its own adaptive scale rather than inheriting a hardcoded 60-mile scale.
5. Confirm the selected region has a heavy border.
6. Confirm neighboring terrain, water, islands, biomes, and rivers remain visible across the rectangular context.
7. Toggle Natural and Terrain presentations.
8. Toggle hexes off and on.
9. Confirm the world-relative hex grid does not visibly jump when returning to the same region.
10. Record whether the close-scale raster appears too soft or splotchy to be useful.

## Region to subregion pass

1. Choose **Show subregions**.
2. Record generation time and child count.
3. Confirm child boundaries completely cover the selected region.
4. Confirm no child boundary or selectable child exists outside the heavy parent border.
5. Confirm disconnected island components remain represented.
6. Select a child on the map and through the selector.
7. Choose **Open subregion**.
8. Confirm the subregion receives its own adaptive context rectangle and heavy border.
9. Confirm local and detail generation are not presented as complete functionality.
10. Record whether tile translation would materially improve readability at this scale.

## Navigation pass

1. From an open subregion, choose **Back to parent**.
2. Confirm the region map returns.
3. Confirm the prior subregion partition can be regenerated deterministically.
4. Use the breadcrumb to return to the macro area and world chooser.
5. Reopen the same macro area and region.
6. Confirm scale IDs, region IDs, subregion IDs, and visible boundaries reproduce.

## Longitude seam pass

1. Open a seam-crossing macro area or region.
2. Confirm the contextual rectangle is compact rather than nearly world-wide.
3. Confirm terrain wraps naturally from the right source edge to the left source edge.
4. Confirm no false heavy boundary appears solely at the rectangular map edge.
5. Confirm labels, child selection, and hexes remain usable across both sides of the seam.

## Footprint pass conditions

- Ordinary opened maps remain near the preferred `20 x 20` footprint.
- Small parents expand context toward the `10 x 10` minimum.
- Large parents choose a coarser scale before exceeding `50 x 50`.
- Selected geography is never cropped to satisfy the maximum.
- If a parent cannot fit the maximum even at the selected scale, the UI reports **Maximum fit: Exceeded** rather than hiding geography.
- Child budgets reflect only exact parent membership, not the contextual rectangle.

## Widescreen layout pass conditions

- At a common widescreen desktop resolution, the map receives most of the available height and width.
- Title and breadcrumb share a compact header row where practical.
- Controls do not consume a full extra vertical band unless needed.
- Diagnostics live primarily in a right-side inspector.
- Normal drilldown does not require page-level vertical scrolling.
- Narrower responsive layouts may stack, but must not dictate the primary desktop composition.

## Visual pass conditions

- The heavy parent border is clearly distinct from child boundaries and the map frame.
- Context outside the parent remains normally rendered but visually secondary.
- Natural View and Terrain both preserve the same hierarchy boundaries.
- Hexes remain world-anchored and reasonably aligned with the context map.
- Labels stay inside their displayed region or subregion.
- Clicking near a boundary selects the visible side consistently.
- The canvas remains usable at common desktop sizes without horizontal UI collapse.
- Region and deeper maps are legible without depending on enlarged low-resolution raster data.

## Findings template

```text
Seed:
Preset:
Dev commit:
Topology resolution:
Map resolution:
Window resolution:

Macro area:
Kind: continent / archipelago / ocean basin
Scale ID:
Miles per hex:
Viewport columns x rows:
Exact parent hexes:
Context hexes:
Seam wrapped: yes / no
Maximum fit: yes / exceeded

Selected region:
Region scale:
Subregion count:
Subregion scale:
Generation time:

Visual result:
- Natural:
- Terrain:
- Heavy parent border:
- Child boundaries:
- Context outside parent:
- Hex alignment:
- Seam:
- Back navigation:
- Widescreen layout:
- Vertical space usage:
- Raster clarity:
- Tile translation recommendation:

Defects:
- Level:
- Visible IDs or labels:
- Screenshot path:
- Repeatable after reopen: yes / no
- Recommended action:
```

## Verification

Run:

```bash
npm audit
npm run verify
npm run evaluate:regions
```

Current user-checkout result on 2026-07-27:

- `npm audit`: zero vulnerabilities;
- `npm run verify`: passed after the adaptive-scale performance correction.

Retain at least one world → continent or basin → region → subregion screenshot sequence under `refs/testing/`.

## Deferred

This pass does not approve:

- authoritative activation of `world-regions-v2`;
- persistence of child partitions;
- local or detail generation;
- high-resolution regional terrain generation;
- final context-menu behavior;
- scientific ocean and sea decomposition beyond the provisional basin layer;
- production 3D terrain or procedural PBR materials.

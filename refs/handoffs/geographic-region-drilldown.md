# Current Handoff: Geographic Region Drill-Down

Updated: 2026-07-27

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Starting version: `0.3.18`

Predecessor: `refs/handoffs/geography-aware-macro-regions.md`

## Status

The geography-aware first-level region candidate passed initial visual QA. The accepted baseline provides:

- four stable `world-500mi` overview sectors,
- first-level regions partitioned at `world-60mi`,
- a `10 x 10` minimum, `20 x 20` preferred, and `50 x 50` maximum map-footprint contract,
- retained geographic identity for undersized islands without forcing tiny display regions,
- deterministic raw and repaired partitions,
- and label points guaranteed to lie inside their displayed regions.

The candidate remains diagnostic-only. Do not activate it as the authoritative saved-world region contract during this slice.

## Objective

Prove the hierarchical map interaction:

1. Select a first-level region on the world map.
2. Open a rectangular map centered on that region at the region's current hex scale.
3. Show the full terrain and water contained by that rectangular map extent, including context outside the selected region.
4. Draw a heavy boundary around the selected region.
5. Generate or reveal the selected region's next-scale child partition.
6. Select a child subregion and repeat the same drill-down behavior.

The interaction may initially use buttons in the Geographic regions preview. A context menu is not required for the functional prototype.

## Scale hierarchy

Use the existing overlay levels:

| Navigation level | Hex level | Purpose |
| --- | --- | --- |
| World overview | `world-500mi` | Four stable overview sectors; no inferred geographic partition |
| Region | `world-60mi` | First geography-aware region layer |
| Subregion | `regional-24mi` | First on-demand child partition within a selected region |
| Local | `local-6mi` | Later child partition for local-area maps |
| Detail | `local-1mi` | Later encounter/detail map support |

At every generated level, retain the map-footprint contract:

- hard minimum `10 x 10` hexes,
- preferred `20 x 20` hexes,
- hard maximum `50 x 50` hexes.

The parent footprint and next hex scale determine the child target count. Do not hard-code a universal number of children per parent.

## Region map behavior

### Rectangular context

The drill-down map must be rectangular. Determine a stable latitude/longitude extent from the selected region's bounds, add enough padding for map context, and fit that extent to the viewport contract.

Do not mask or blank pixels outside the selected region. Render neighboring land, islands, water, terrain, biomes, rivers, and other available world data normally across the entire rectangle.

The selected region boundary must remain visually dominant:

- use a heavy, high-contrast boundary,
- correctly handle the longitude seam,
- avoid drawing a false boundary at the rectangular map edge,
- and keep neighboring parent-region boundaries secondary or hidden for the first prototype.

### Hex overlay

The opened region map uses the selected level's hex overlay:

- first-level region view: `world-60mi`,
- selected subregion view: `regional-24mi`.

Hexes should fill the rectangular map extent rather than only the selected polygon. Hex IDs and coordinates must remain stable relative to the world overlay so later persistence and cross-region entities do not require coordinate translation.

### Navigation

The prototype needs:

- an explicit **Open region** action for the selected first-level region,
- an explicit **Show subregions** action in the opened region view,
- selection of a child subregion,
- an explicit **Open subregion** action,
- and a reliable **Back to parent** action.

Preserve world, region, and subregion selection while navigating during the current session. Permanent UI design and URL routing can follow after the functional path is validated.

## Child decomposition

Build the child partition on demand from the selected parent's authoritative topology membership and next-scale hex coverage.

The child algorithm should:

- never assign a child outside its parent region,
- completely cover the parent membership,
- remain deterministic for the same compatible world and parent ID,
- derive child count from next-scale hex coverage and the viewport footprint contract,
- follow the same terrain, coastline, hydrology, climate, and biome evidence used by the first-level candidate,
- preserve small geographic features without forcing unusable child maps,
- support parents that cross the longitude seam,
- and produce stable IDs derived from the world, parent, level, and deterministic seed.

The first implementation may compute children in memory. Keep the contract suitable for later on-demand persistence or cheap deterministic reconstruction.

## Suggested implementation order

1. Define scale-neutral parent/child region contracts and deterministic IDs.
2. Add a bounds-to-rectangular-map extent helper with seam tests.
3. Add a scale-aware child budget derived from parent hex coverage.
4. Generalize the graph partition to accept parent membership and a child level.
5. Add focused synthetic and fixed-world tests before UI work.
6. Add region-view state and rectangular contextual rendering.
7. Add heavy selected-parent borders and the appropriate hex overlay.
8. Add Show subregions, child selection, Open subregion, and Back actions.
9. Retain screenshots and diagnostics for accepted and failed boundaries.

Bias toward concrete contracts and a TDD approach. Do not solve the prototype by copying the first-level partition into a second one-off implementation.

## Acceptance criteria

### Contracts and generation

- A selected first-level region produces deterministic `regional-24mi` children.
- Children cover all and only the parent topology membership.
- No child belongs to multiple parents.
- Child IDs reproduce for the same compatible project.
- Child footprint diagnostics expose minimum, preferred, and maximum map sizes.
- Seam-crossing parents and children retain valid rectangular extents.

### Region view

- Opening a region replaces the world extent with a rectangular contextual map.
- Terrain outside the selected region remains visible.
- The selected region has a heavy border that is not confused with the map frame.
- The `world-60mi` hex overlay fills the complete rectangle.
- The view provides a Show subregions action.

### Subregion view

- Child boundaries can be toggled in the parent region view.
- A child can be selected and opened.
- The opened child map uses `regional-24mi` hexes across its rectangular context.
- The selected child has a heavy border.
- Back navigation restores the previous extent and selection.

### Verification

- `npm run verify`
- `npm run evaluate:regions`
- browser visual QA for star seed `2850873`, world seed `1001001`
- browser visual QA for seed `9776542`
- one Archipelago world
- one seam-crossing region

Inspect Terrain only and Natural View. Retain at least one world-to-region-to-subregion screenshot sequence under `refs/testing/`.

## Deferred

- production activation of `world-regions-v2`,
- durable cloud persistence of generated child partitions,
- final context-menu and navigation design,
- political entities spanning multiple regions,
- collaborative editing,
- natural-wonder placement,
- settlements and roads,
- local `6mi` and detail `1mi` generation beyond proving the reusable hierarchy,
- and globe-to-flat-map animated transitions.

## Risks

- Bounding boxes near the longitude seam can accidentally expand to almost the full world.
- A rectangular view can imply that context outside the selected parent is editable; keep the heavy parent border unambiguous.
- Reprojecting to local coordinates would break stable world hex IDs; retain world-relative coordinates.
- Dense labels and boundaries can overwhelm the contextual map; gate child labels by zoom if necessary.
- High child counts can make on-demand generation feel blocking; retain instrumentation and cache the in-memory result by project, parent ID, algorithm version, and scale.

# Geographic Tile-Window Drilldown: Browser QA

Updated: 2026-07-28

Branch: `dev`

Visible version: `0.3.20`

Status: Implementation is present through detail level. Repository verification and browser acceptance are pending.

## Scope of this pass

Validate the full diagnostic hierarchy:

`World -> continent / archipelago / ocean basin -> region -> subregion -> local -> detail`

Confirm that opened maps use canonical world-anchored tile windows rather than enlarged world-raster crops, and that the widescreen atlas composition keeps the map usable without normal page-level vertical scrolling.

This pass does not approve persistence, `world-regions-v2` activation, replay changes, 3D terrain, or PBR materials.

## Setup

1. Pull the latest `dev` commit.
2. Record the exact commit SHA.
3. Run `npm ci` if dependencies are not current.
4. Run:

```bash
npm audit
npm run verify
npm run evaluate:regions
```

5. Record each result exactly. Do not convert a missing result into a pass.
6. Run `npm run dev` and restart any Parchment Worlds shell embedding the app.
7. Generate a fresh world or open a compatible existing world.
8. Use Map view and open the right-side World tab.
9. In **Geographic atlas**, choose **Open geographic atlas**.

The atlas remains diagnostic and in-memory.

## Required worlds

Inspect at minimum:

- star seed `2850873`, world seed `1001001`;
- world seed `9776542`;
- one fresh Archipelago preset;
- one fresh Pangea preset;
- one macro area or child that crosses the longitude seam;
- one larger-topology or near-maximum-footprint case.

For every run record:

- exact seed and preset;
- dev commit;
- visible version;
- topology resolution;
- map resolution;
- browser and window resolution.

## Widescreen layout pass

Primary target: `1920 x 1080` desktop window.

Secondary target: `1440 x 900` desktop window.

Confirm:

- title, current map name, and breadcrumbs share a compact header;
- back, presentation, hex, and level controls fit in the compact map toolbar;
- the map receives most of the available width and height;
- diagnostics and selection controls remain in the right-side inspector;
- normal drilldown does not require page-level vertical scrolling;
- the inspector may scroll independently;
- breadcrumbs remain usable at detail depth;
- narrower responsive behavior stacks without dictating the desktop layout;
- close and Back controls remain keyboard accessible;
- visible focus states remain readable.

## World to macro-area pass

1. Open the atlas.
2. Confirm continents and archipelagos are listed separately from provisional ocean basins.
3. Open at least one large continent, one small continent or archipelago, and one ocean basin.
4. Confirm each macro map reports:
   - deterministic miles per hex;
   - world grid dimensions;
   - exact parent hexes;
   - contextual hexes;
   - viewport dimensions generally between `10 x 10` and `50 x 50`;
   - seam status;
   - maximum-fit status.
5. Confirm first-level region boundaries and labels appear inside the selected macro area.
6. Confirm terrain outside the heavy macro boundary remains visible and visually secondary.
7. Click outside the heavy boundary and confirm no region outside the macro area is selected.
8. Toggle Natural and Terrain presentations.
9. Toggle hexes off and on.

## Macro area to region pass

1. Select a region on the map and through the selector.
2. Confirm selection highlighting matches the visible region.
3. Choose **Open region**.
4. Confirm the region uses its own adaptive scale.
5. Confirm the selected region has a heavy border.
6. Confirm neighboring terrain remains visible across the rectangular context.
7. Confirm the map is rendered as discrete clean tiles rather than an enlarged soft raster.
8. Confirm water, ice, biome, morphology, rivers, and ridges remain legible.
9. Toggle Natural and Terrain and confirm boundaries do not move.
10. Reopen the same region and confirm its scale ID and visible tile IDs reproduce.

## Region to subregion pass

1. Choose **Show subregions**.
2. Record generation time and child count.
3. Confirm child boundaries cover all and only the region.
4. Confirm no selectable child exists outside the heavy parent border.
5. Confirm disconnected island components remain represented.
6. Select a child on the map and through the selector.
7. Choose **Open subregion**.
8. Confirm the subregion receives its own adaptive scale, context rectangle, and heavy border.
9. Confirm the tile presentation remains materially clearer than the former raster enlargement.
10. Record river, ridge, coastline, and biome continuity at the transition.

## Subregion to local pass

1. Choose **Show local areas**.
2. Record generation time and child count.
3. Confirm local children cover all and only the subregion.
4. Select a local area from the map and selector.
5. Choose **Open local**.
6. Confirm the local map uses world-relative coordinates rather than restarting at `0,0`.
7. Confirm inherited coastline, water identity, broad relief, major rivers, ridges, climate, biome, volcanism, and permanent ice are not contradicted.
8. Confirm context-only tiles remain visible but not selectable as local children.
9. Toggle presentations and hexes.
10. Record whether repeated topology sampling creates any visibly duplicated or blocky terrain pattern.

## Local to detail pass

1. Choose **Show details**.
2. Record generation time and child count.
3. Confirm detail children cover all and only the local parent.
4. Select a detail child on the map and selector.
5. Choose **Open detail**.
6. Confirm the detail-level terminal card appears.
7. Confirm no further child-generation action is offered.
8. Confirm the detail map retains stable tile IDs, inherited geography, context-only behavior, and compact layout.
9. Record any scale where source topology is no longer sufficient to support useful visual detail.

## Navigation and repeatability pass

1. From detail, choose **Back** repeatedly through local, subregion, region, and macro area.
2. Confirm each parent map restores the correct level and cached child partition.
3. Use breadcrumbs to jump directly to each ancestor.
4. Close the atlas.
5. Reopen the same hierarchy path.
6. Regenerate any child partitions on demand.
7. Confirm scale IDs, child IDs, memberships, tile IDs, and visible boundaries reproduce.
8. Confirm presentation changes do not alter hierarchy identity.

## Overlapping-window consistency pass

1. Open two neighboring parents whose contextual rectangles overlap.
2. Identify shared world-relative tile IDs in the overlap.
3. Confirm shared tiles retain identical:
   - biome;
   - morphology;
   - elevation treatment;
   - water and ice identity;
   - river edges;
   - ridge edges;
   - terrain label.
4. Confirm a tile may change from parent to context role without changing its terrain identity.
5. Record any river or ridge discontinuity at a window edge.

## Longitude-seam pass

1. Open a seam-crossing macro area or child.
2. Confirm the context rectangle is compact rather than nearly world-wide.
3. Confirm tile coordinates wrap from high `q` values to `q0` without restarting the map model.
4. Confirm no false heavy boundary appears solely at the rectangular frame edge.
5. Confirm labels, child selection, rivers, ridges, and hexes remain usable on both sides of the seam.
6. Close and reopen the seam parent and confirm stable tile facts.

## Footprint and performance pass

Confirm:

- ordinary maps remain near the preferred `20 x 20` footprint;
- small parents expand context toward the `10 x 10` minimum;
- large parents choose a coarser scale before exceeding `50 x 50`;
- selected geography is never cropped to satisfy the maximum;
- impossible maximum fits report **Exceeded**;
- child budgets use exact membership rather than the context rectangle;
- only the opened tile window is generated;
- normal navigation does not trigger full-world fine-grid classification;
- a `50 x 50` window remains interactive;
- larger-topology generation does not create an unexplained multi-second frozen UI.

## Visual pass conditions

- The heavy parent border is distinct from child boundaries and the map frame.
- Context is normally rendered but clearly secondary.
- Natural and Terrain preserve identical hierarchy geometry.
- Hexes remain world anchored.
- Labels remain legible and inside the intended child where practical.
- Clicking near a boundary selects the visible side consistently.
- Water and ice read clearly.
- Major rivers connect through tiles and reach plausible water destinations.
- Major ridges remain coherent across adjacent tiles.
- Region and deeper maps are materially cleaner than the old enlarged raster.
- The tile presentation is useful without requiring 3D or PBR assets.

## Findings template

```text
Seed:
Preset:
Dev commit:
Visible version:
Topology resolution:
Map resolution:
Window resolution:
Browser:

Hierarchy path:
Macro area:
Region:
Subregion:
Local:
Detail:

Level results:
- Macro scale / viewport / generation time:
- Region scale / viewport / generation time:
- Subregion scale / child count / generation time:
- Local scale / child count / generation time:
- Detail scale / child count / generation time:

Identity and consistency:
- Stable child IDs after reopen:
- Stable tile IDs after reopen:
- Overlapping tile facts identical:
- Seam compact and continuous:
- Parent-only selection:

Visual result:
- Natural:
- Terrain:
- Parent border:
- Child boundaries:
- Context treatment:
- Rivers:
- Ridges:
- Coastline and water:
- Hex alignment:
- Labels:
- Widescreen layout:
- Vertical scrolling:
- Improvement over raster proof:

Performance:
- Maximum footprint:
- Larger topology:
- UI freezes or progress gaps:

Defects:
- Level:
- Visible IDs or labels:
- Steps:
- Screenshot path:
- Repeatable after reopen:
- Recommended action:
```

## Evidence

Retain at least one complete world-to-detail screenshot sequence under `refs/testing/`.

Include at least:

- macro area;
- region;
- subregion;
- local;
- detail;
- one Natural and Terrain comparison;
- one seam case;
- one widescreen full-atlas screenshot.

## Acceptance

This pass is accepted only when:

- `npm audit` reports zero vulnerabilities;
- `npm run verify` passes;
- `npm run evaluate:regions` passes or any known unrelated failure is explicitly documented;
- the full world-to-detail path succeeds;
- no normal page-level vertical scrolling is required at the primary widescreen target;
- close-scale rendering is materially cleaner than the raster proof;
- deterministic IDs, memberships, and tile facts reproduce;
- seam and overlap checks pass;
- required screenshots and findings are committed;
- the current handoff records the accepted verdict.

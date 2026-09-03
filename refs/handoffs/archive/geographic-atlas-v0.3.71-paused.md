---
type: "Handoff Record"
title: "Current Handoff: Geographic Atlas WP3 Stepped Hex Terrain"
tags:
- world-forge
- handoffs
---
# Current Handoff: Geographic Atlas WP3 Stepped Hex Terrain

Updated: 2026-08-06

Status: **WP0/WP1 complete; WP2 repository validation complete; WP2 visual acceptance superseded by the stepped-hex correction; WP3 interaction, renderer ownership, canonical stepped hex terrain, and internal child-region borders are implemented and exact-head CI validated on `dev`; desktop visual acceptance remains open**

Primary tracking:

- World Forge issue `#10`
- `refs/decisions/geographic-atlas-2.5d-architecture-pivot-2026-08-06.md`
- `refs/planning/geographic-atlas-2.5d-architecture-spike.md`
- `refs/handoffs/geographic-drilldown-rendering-roadmap.md`

Implementation baseline:

- repository: `Three-Wheeled-Sloth-Studio/World-Forge`
- branch: `dev`
- architecture commit: `3144aa7fafad45118bc28c92b04efbc20a0155da`
- WP0/WP1 contract commit: `df752d39f31f485643a9c5819ac33b710b91f6a6`
- WP2 continuous-terrain proof: `30fd1cb0b0e4f5cc22d6200890f6c68191b049c4`
- WP2 renderer validation fix: `db1f5163bf713f892776e950a4fb11ae784c034b`
- final-river diagnostic validation fix: `9a852f8c03039d382f86ff9afffdcba209c5641a`
- last user-validated descendant before WP3: `d02ed81b2bd63d10c91ca48d861fe8a06b00f997`
- WP3 interaction handoff baseline: `7fc559fd5ce2c91f45e45c9f8ecc7afe0c86b5c7`
- drilled-atlas layer ownership correction: `3321b89b793f4d2342795eba726ef71ce228ea12`
- stepped hex terrain implementation: `28edbb2fd8cc5622c199226fe234cc0e6b98cdc7`
- stepped hex Three.js integration: `16ad9acb3e7ac3af2cd0053dd97e062e70401924`
- stepped terrain workspace wiring: `0ba1b5ba03cccaab37e9eff2930ab9c2ef32e19a`
- child-partition cache invalidation: `61227839775430f3d313edf17316d1c57e13f892`
- exact validated head: `725c53189c98646ecd0329495589fd587657ef5e`
- visible version: `0.3.71`

## Completed foundations

### WP0/WP1

The repository inventory and renderer-neutral `GeographicScene` contract are complete. The scene contract owns deterministic source identity, projected extent, terrain source samples, separate water facts, diagnostics, progress, and cancellation without importing React, DOM, Canvas, WebGL, or Three.js types.

### WP2 continuous-terrain proof

The original bounded scene builder proved deterministic scene construction, camera-scale terrain, seam validation, water separation, and canonical source identity. User visual QA on 2026-08-06 rejected its displayed form: the joined center-sample surface read as a smooth torn sheet, exposed patch-shaped silhouettes, had no visible hex structure, and did not resemble the desired Civilization/Humankind close-map language.

The underlying renderer-neutral scene remains useful for elevation scaling, picking provenance, camera extent, and later non-hex presentations. It is no longer the accepted displayed terrain shape for the atlas.

## WP3 interaction foundation

### Pure camera model

`apps/desktop/src/regions/geographicSceneInteraction.ts` defines a testable map-camera model with:

- north-up default;
- orthographic continuous zoom from `0.65x` through `20x`;
- map-relative pan;
- bounded focus overscroll;
- shallow pitch with a near-top-down toggle;
- rotation limited to plus or minus 30 degrees;
- deterministic reset;
- projected-scene to geographic-coordinate conversion.

### Interactive Three.js adapter

`GeographicSceneViewer.tsx` provides:

- drag-to-pan;
- mouse-wheel and keyboard zoom;
- Alt-drag or middle-drag shallow pitch/rotation;
- Reset, Tilt, rotate, and zoom controls;
- camera state retained across Natural/Elevation presentation changes;
- canonical source-tile picking;
- explicit GPU and DOM cleanup.

### Hierarchy semantics

The atlas retains the canonical `GeographicTileWindow` beside the rendered scene. Terrain picks resolve to canonical tile IDs and child membership, so context-only terrain remains non-selectable, selectable child terrain can be opened, and the existing select / double-click / context-menu semantics remain intact.

### Context-map synchronization

The viewer projects its four viewport corners onto the scene plane, converts them back to geographic coordinates, and emits a camera footprint. `GeographicAtlasContextMap.tsx` draws that footprint in cyan and handles longitude wrapping per edge.

## Exclusive drilled-atlas layer ownership

User screenshot feedback exposed a paint-order race where the legacy full-world canvas could redraw above the atlas. The corrected path:

- applies ownership changes in `useLayoutEffect`, before paint;
- marks direct legacy canvases and markers `hidden`, `inert`, and `aria-hidden` for bounded atlas views;
- restores their exact prior state on exit;
- suppresses only direct map-frame children, leaving nested Three.js canvases active;
- retains CSS `display: none !important` and isolated opaque atlas stacking as defensive layers.

The full-world atlas overview intentionally remains 2D for macro-area selection. The workspace now makes the transition explicit with `3D terrain` and `2D map` actions rather than the ambiguous `2.5D spike` label.

## Stepped canonical hex terrain correction

User visual feedback on visible version `0.3.70` established the accepted target language:

- recognizable 3D hex tiles rather than a continuous smoothed sheet;
- discrete elevation changes between neighboring tiles;
- bounded roughness within a tile;
- optional visible hex lines;
- internal hierarchy borders in both 2D and 3D;
- a strategic-map look closer to Civilization or Humankind, without copying their assets or exact styling.

`apps/desktop/src/regions/geographicHexScene.ts` now builds a merged Three.js representation directly from the canonical `GeographicTileWindow`:

- one merged indexed terrain mesh, not one object per tile;
- faceted hex tops with deterministic center relief for sub-tile roughness;
- vertical side walls where adjacent tile elevations differ;
- flat water elevation and differentiated water colors;
- flat shading, high material roughness, and directional relief lighting;
- context-only tile darkening;
- selected-child tinting;
- separate line layers for the hex grid, child boundaries, selected-child boundary, and parent boundary;
- canonical tile IDs and geographic coordinates retained for picking.

Natural and Elevation presentations change color only. Geometry, hierarchy membership, boundaries, and picking remain shared.

## Internal child-region border correction

The missing internal border report was not primarily a draw-order defect. `targetChildCountForExtent(...)` created one child for a normal roughly `50 x 30` atlas window because it counted 50-column buckets. One child means no internal boundary can exist.

The corrected area-based target:

- subtracts context padding;
- estimates usable parent hex area;
- targets roughly 400 usable hexes per child;
- clamps non-terminal partitions to 2 through 64 children;
- yields 3 target children for a representative `50 x 30` window and 11 for `99 x 49`;
- invalidates prior in-memory single-child partitions through `width-driven-scale-v2:area-child-count-v1` in the hierarchy cache key.

The existing 2D renderer already draws child boundaries from canonical `childIndex` differences. The 3D renderer now draws the same relationship as an elevated line layer.

## Validation status

Exact head `725c53189c98646ecd0329495589fd587657ef5e` passed GitHub Actions workflow `Validate World Forge`, run `31138942068`, on 2026-08-06.

Green jobs include:

- unit and integration tests;
- TypeScript type-check and production frontend build;
- production page harness tests and smoke checks;
- production attribution-rerank tests and smoke checks.

Focused coverage now includes:

```bash
npx vitest run \
  apps/desktop/src/regions/geographicAtlasLayerVisibility.test.ts \
  apps/desktop/src/regions/geographicHexScene.test.ts \
  apps/desktop/src/regions/geographicSceneInteraction.test.ts \
  apps/desktop/src/regions/GeographicSceneViewer.test.ts \
  packages/generator-core/src/geographicWidthScale.test.ts \
  packages/generator-core/src/geographicSceneBuilder.test.ts
```

Repository validation is green. Browser/GPU visual acceptance is still required.

## Combined desktop QA path

1. Pull exact `dev` head `725c53189c98646ecd0329495589fd587657ef5e`, restart or rebuild the running app, and confirm visible version `0.3.71`.
2. Enable geographic drill-down. Confirm the full-world overview remains a clearly labeled 2D selection view.
3. Open a continent, archipelago, ocean basin, region, or deeper bounded area.
4. In the compact inspector, confirm the generated child count is greater than one for an ordinary non-terminal map.
5. In 2D, confirm internal child-region borders appear even when the Hexes checkbox is off.
6. Toggle Hexes and confirm world-anchored hex lines appear without changing the borders or selection.
7. Select a child and confirm its outline/highlight is distinct from ordinary internal borders.
8. Choose `3D terrain`.
9. Confirm the display is composed of contiguous hex tops with visible elevation steps and no torn four-patch silhouette.
10. Confirm bounded within-tile roughness reads as low-relief terrain rather than smooth interpolation or extreme spikes.
11. Toggle Hexes in 3D and confirm the grid appears and disappears without rebuilding hierarchy facts.
12. Confirm internal child borders, selected-child border, and heavy parent border are visible above terrain in 3D.
13. Switch Natural/Elevation after moving the camera; confirm geometry, camera, borders, and selection remain stable.
14. Click terrain; confirm the compact inspector updates and the matching child is selected where one exists.
15. Double-click selectable child terrain and confirm the hierarchy opens the child.
16. Right-click selectable child terrain and confirm Open / Keep selected behavior.
17. Pan, zoom, tilt, and rotate while watching the context map; confirm the cyan footprint follows the camera.
18. Confirm no legacy blue map flashes above either bounded renderer during load, redraw, presentation changes, or resize.
19. Exit the atlas and confirm the original world map and overlays restore normally.
20. Capture exact commit, OS, GPU, viewport, and screenshots in issue `#10`.

## Remaining visual work after acceptance of this increment

- tune elevation exaggeration and within-tile roughness from real browser screenshots;
- improve strategic-map material and lighting language without introducing copied assets;
- add screen-space labels with collision and visibility limits;
- add rivers and ridge accents as explicit canonical overlays;
- measure interaction and rebuild performance against the under-100-ms target;
- decide whether the full-world overview should eventually receive a separate low-detail 3D mode.

## Guardrails

- Do not create a second geography or hierarchy model.
- Do not derive hierarchy membership from terrain geometry, colors, or raycast coordinates.
- Build displayed terrain from canonical tile-window facts and stable tile IDs.
- Use merged/batched geometry; do not create one Three.js object per hex.
- Do not allocate a full-world fine terrain mesh.
- Do not add unrestricted flight controls.
- Do not persist presentation-only camera or mesh artifacts into saved worlds.
- Do not change `.wforge`, `.pworld`, or Parchment host contracts for this visual correction.
- Do not absorb issue `#12` tuning or issue `#126` location actions.

## Existing Sol reference status

The Sol package pipeline remains operational. Earth, Jupiter, and Mars remain the accepted body-presentation baseline. Broader body presentation remains outside this atlas work.
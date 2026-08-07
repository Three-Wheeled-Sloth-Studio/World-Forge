# Current Handoff: Geographic Atlas WP3 Interaction Foundation

Updated: 2026-08-06

Status: **WP0/WP1 complete; WP2 implementation and repository validation complete; WP2 visual acceptance remains open; WP3 camera, picking, context synchronization, and exclusive drilled-atlas layer ownership are implemented on `dev` pending exact-head validation and desktop QA**

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
- WP2 implementation commit: `30fd1cb0b0e4f5cc22d6200890f6c68191b049c4`
- WP2 renderer validation fix: `db1f5163bf713f892776e950a4fb11ae784c034b`
- final-river diagnostic validation fix: `9a852f8c03039d382f86ff9afffdcba209c5641a`
- last user-validated descendant before WP3: `d02ed81b2bd63d10c91ca48d861fe8a06b00f997`
- WP3 interaction handoff baseline: `7fc559fd5ce2c91f45e45c9f8ecc7afe0c86b5c7`
- drilled-atlas layer ownership correction: `3321b89b793f4d2342795eba726ef71ce228ea12`
- visible version: `0.3.70`

## Completed foundations

### WP0/WP1

The repository inventory and renderer-neutral `GeographicScene` contract are complete. The scene contract owns deterministic source identity, projected extent, terrain patches and seams, separate water surfaces, later vector/overlay seams, diagnostics, progress, and cancellation without importing React, DOM, Canvas, WebGL, or Three.js types.

### WP2 terrain proof

The bounded scene builder and direct Three.js adapter provide:

- elevation-displaced continuous terrain;
- four seam-sharing indexed patches for the representative fixture;
- explicit seam validation;
- a separate clipped water surface;
- Natural and Elevation presentations on identical geometry;
- deterministic signatures and diagnostics;
- explicit unsupported, cancelled, and failed workspace states;
- no saved-world, `.wforge`, `.pworld`, or Parchment contract change.

The user reported `npm run validate` passing on the exact WP2 correction descendant on 2026-08-06, including the complete 129-file / 468-test Vitest suite and the other validation steps chained by that repository script.

## WP3 interaction foundation now on `dev`

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

Focused tests cover initial state, continuous zoom limits, pan/clamping, pitch/rotation limits, and geographic corner mapping.

### Interactive Three.js adapter

`GeographicSceneViewer.tsx` now provides:

- drag-to-pan;
- mouse-wheel and keyboard zoom;
- Alt-drag or middle-drag shallow pitch/rotation;
- explicit Reset, Tilt, rotate, and zoom controls;
- keyboard arrows, `+`, `-`, `R`, `T`, `[` and `]`;
- camera state retained when switching Natural/Elevation presentation;
- raycast terrain picking that resolves the nearest canonical `sourceSampleId` and geographic coordinate from the renderer-neutral scene vertex metadata;
- explicit GPU and DOM cleanup for the interaction path.

The synthetic-intersection test verifies that a Three.js terrain hit resolves to canonical source identity rather than a presentation-only mesh identifier.

### Hierarchy semantics

The atlas workspace retains the canonical `GeographicTileWindow` beside the rendered scene. A terrain pick is resolved back to that window and therefore:

- context-only terrain remains non-selectable as a hierarchy child;
- parent terrain with a `childIndex` selects the canonical child ID;
- double-click opens that child;
- right-click uses the existing Open / Keep selected semantics;
- pick details appear in the compact inspector;
- selection does not rebuild the WebGL canvas, preserving native double-click sequencing.

### Context-map synchronization

The viewer projects its four viewport corners onto the scene plane, converts them back to geographic coordinates, and emits a camera footprint. `GeographicAtlasContextMap.tsx` draws that footprint in cyan and handles longitude wrapping per edge.

## Drilled-atlas layer ownership correction

User screenshot feedback on 2026-08-06 showed visible version `0.3.68`, a brief presentation-color change, and the full-world 2D map remaining visible. Two distinctions matter:

- the screenshot was from an older bundle because the current source version at the time was already `0.3.69`;
- the full-world atlas overview remains intentionally 2D for macro-area selection. The 2.5D renderer starts only after opening a bounded macro area, region, or deeper map and toggling `2.5D`.

The feedback still exposed a weak implementation seam: drilled mode depended only on a CSS class applied in a normal React effect to hide the original map canvas. Commit `3321b89b793f4d2342795eba726ef71ce228ea12` hardens that boundary:

- `GeographicHierarchyPanel` now applies ownership changes in `useLayoutEffect`, before paint;
- direct legacy canvases and map markers are explicitly marked `hidden`, `inert`, and `aria-hidden` while a bounded atlas map is open;
- exact previous element state is restored on atlas exit;
- only direct map-frame children are suppressed, so the nested Three.js canvas remains active;
- CSS `display: none !important` remains as a second line of defense;
- the drilled atlas and 2.5D scene use isolated, opaque stacking surfaces above the legacy renderer;
- a focused classifier test protects the direct-child layer boundary;
- visible version is now `0.3.70`.

## Validation status

The prior WP2 descendant is locally validated. The WP3 and layer-ownership descendants have source-level inspection and focused automated tests committed, but this execution environment cannot clone the public repository because outbound DNS is blocked. Do not mark current-head validation green until a local or CI run completes.

Run from the repository root:

```bash
npm run validate
```

Focused tests:

```bash
npx vitest run \
  apps/desktop/src/regions/geographicAtlasLayerVisibility.test.ts \
  apps/desktop/src/regions/geographicSceneInteraction.test.ts \
  apps/desktop/src/regions/GeographicSceneViewer.test.ts \
  packages/generator-core/src/geographicSceneBuilder.test.ts
```

## Combined desktop QA path

1. Pull the exact `dev` head, restart or rebuild the running app, and confirm visible version `0.3.70`.
2. Enable geographic drill-down. The full-world overview is expected to remain 2D.
3. Select and open a continent, archipelago, ocean basin, region, or deeper bounded area.
4. Confirm the original full-world canvas disappears completely after opening the bounded area.
5. Toggle `2.5D`.
6. Verify useful relief, separate water, and no cracks at the four patch joins.
7. Confirm no blue-dominated legacy map flashes above the scene during initial load, delayed world redraw, presentation changes, or resize.
8. Drag to pan and use the wheel to zoom continuously beyond the old hierarchy ceiling.
9. Use Reset and confirm the original north-up framing returns.
10. Use Tilt and the rotation buttons; confirm pitch remains shallow and rotation remains constrained.
11. Switch Natural/Elevation after moving the camera; confirm the camera and geometry do not reset.
12. Click terrain; confirm the compact inspector updates and the matching child is selected where one exists.
13. Double-click selectable child terrain; confirm the hierarchy opens the child.
14. Right-click selectable child terrain; confirm Open / Keep selected behavior.
15. Pan, zoom, tilt, and rotate while watching the context map; confirm the cyan footprint follows the camera.
16. Exit the atlas and confirm the original world map, overlays, and inspection markers restore normally.
17. Resize repeatedly and confirm controls, rendering, picking, footprint, and layer ownership remain aligned.
18. Capture exact commit, OS, GPU, viewport, and screenshots in issue `#10`.

## Remaining WP3 work after this increment

- parent and child boundaries as explicit scene overlays;
- selected-region fill or outline independent of terrain materials;
- screen-space labels with collision and visibility limits;
- visual selection treatment that does not rebuild the renderer;
- interaction/performance measurements against the under-100-ms target.

Do not pull rivers or progressive hex rendering forward. They remain WP4.

## Guardrails

- Do not create a second geography model.
- Do not derive hierarchy membership from terrain triangles or colors.
- Do not build production terrain from raised hex columns.
- Do not allocate a full-world fine terrain mesh.
- Do not create one Three.js object per hex.
- Do not add unrestricted flight controls.
- Do not persist spike-only camera or scene artifacts.
- Do not change `.wforge`, `.pworld`, or Parchment host contracts.
- Do not absorb issue `#12` tuning or issue `#126` location actions.

## Existing Sol reference status

The Sol package pipeline remains operational. Earth, Jupiter, and Mars remain the accepted body-presentation baseline. Broader body presentation remains outside this atlas spike.

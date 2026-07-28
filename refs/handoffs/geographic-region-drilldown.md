# Geographic Region Drilldown Handoff

## Current implementation status

The geographic hierarchy remains diagnostic and in-memory. No saved schema, generator-version, replay, or persistence contract changed.

### Main-map drilldown increment: implemented on `dev`

The drilldown now starts from the primary world map rather than a separate atlas modal.

Implemented interaction:

- A compact drilldown toggle is injected into the existing world-map toolbar.
- World view retains the normal terrain rendering and overlays thin continent and ocean-basin borders.
- Left-click selects a macro area or child region.
- Right-click and double-click open the selected area.
- Enter opens the selected area; Escape backs out or exits drilldown.
- The right panel reports the current level, selected area, active hex scale, viewport dimensions, and generated child count.
- Child borders appear immediately as light dashed boundaries after a parent opens.
- A compact over-map control row provides breadcrumbs, back, `Auto`, `Terrain + hex`, `Tiles`, hex visibility, and exit.

### Scale and partition behavior

- The working viewport target is now 50 hexes wide.
- Scale selection is width-driven. The selected shape retains its natural aspect ratio and height follows width.
- Adjacent drilldown scales may not differ by more than 2.5x.
- Canonical targets currently include 60, 24, 6, 1, and 0.5 mile hexes, with intermediate scales inserted when needed.
- Child count is based on how many next-scale 50-hex viewports fit across the parent extent, rather than a fixed raw-hex quota.
- Macro areas now generate their immediate regions from this same next-scale rule instead of displaying the overly granular global region preview.

### Presentation behavior

- `Auto` uses the normal terrain map plus hex/border overlay at macro-area scale.
- `Auto` uses terrain tiles at region and deeper scales.
- `Terrain + hex` forces the normal terrain crop and geographic overlays.
- `Tiles` forces canonical terrain tile rendering.
- The existing clean tile renderer remains the canonical detailed presentation path.

### Known follow-up work

- Browser QA and screenshot capture are required for the prescribed seed/preset matrix.
- Seas remain a later child classification beneath ocean basins.
- Small islands and archipelagos still need explicit grouping policy.
- Terrain icons, tile hover/click inspection, and richer tile surface treatment remain later increments.
- Exporter convergence remains open: the runtime canonical tile classifier and exporter classifier are still parallel implementations.

## Active hierarchy

`World -> continent / archipelago / ocean basin -> region -> subregion -> local -> detail`

## Guardrails

- Do not introduce a second authoritative geography model.
- Do not reset coordinates at parent boundaries.
- Keep exact parent membership separate from rectangular rendering context.
- Keep drilldown generation deterministic and world-anchored.
- Do not activate or persist `world-regions-v2` as part of this work.
- Do not begin 3D or procedural material work until the 2D hierarchy and canonical tile model are stable.

## Acceptance still required

1. `npm audit` reports no unresolved vulnerability.
2. `npm run verify` passes on the exact `dev` commit.
3. Browser QA covers the required seed/preset matrix and longitude seam case.
4. Screenshots show world selection, macro overlay, region, subregion, local, and detail views.
5. No page-level vertical scroll is introduced by drilldown controls.
6. Reopening the same area produces stable IDs, boundaries, and inherited facts.

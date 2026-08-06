# Geographic drilldown scale-fidelity findings

Updated: 2026-08-06

Tracking: World Forge issue `#10`

Context-menu follow-up: issue `#126`

Observed runtime sequence:

- `0.3.61`: initial tile-window browser QA;
- `0.3.62`: canonical-path density correction;
- `0.3.63`: sub-source river refinement and first tile-hit correction;
- `0.3.64`: direct rendered-tile selection, canonical Terrain presentation, and explicit boundary-versus-center river grammar;
- `0.3.65`: world-overlay alignment, non-ice land color correction, bounded context halo, physical-width guardrails, endpoint markers, and tributary rebalancing.

## Accepted behavior from the browser pass

The main-workspace drilldown path remains usable from world through detail. Hierarchy navigation, Back behavior, contextual map, and right-click action menu remain the interaction baseline.

Canonical generated river paths remain the authoritative anchors, with bounded deterministic decomposition below source resolution. This is not full issue `#10` acceptance.

## Selection-coordinate defect

### Initial defect

Tile presentation uses a centered pointy-top odd-row layout with margins and row offsets. Selection originally treated the canvas as a rectangular latitude/longitude raster, causing large misses near the lower and side edges.

### Why v0.3.63 did not finish the fix

v0.3.63 added rendered-hex hit testing, but the controller still converted the hit tile back to latitude/longitude and then asked the coarse topology which child owned that location.

At deep scales, many fine tiles share coarse topology provenance. The round trip could therefore select a different coarse child from the child visibly drawn under the pointer.

### Current correction

Tile presentation returns the clicked canonical tile directly to the controller. Selection uses the hit tile's `membershipRole`, exact `childIndex`, and world-relative tile identity. It does not fall back to rectangular topology selection when the pointer misses the rendered grid.

Overlay/raster presentation retains its continuous geographic lookup path.

## World atlas outline offset

The world atlas overlay had two independent projection errors:

1. macro membership was sampled into a separate fixed-size raster rather than the same equirectangular topology lookup used by the visible world map;
2. the overlay canvas filled the workspace while the base canvas occupied a measured aspect-preserving rectangle inside that workspace.

v0.3.65 now:

- projects macro membership with `equirectangularTopologyLookup` at the base canvas's exact intrinsic resolution;
- sizes and positions the overlay over the base canvas's measured display rectangle;
- observes both the map host and base canvas for resize changes;
- uses the same aligned overlay surface for pointer selection.

A focused geometry regression verifies that the overlay uses the base-canvas box rather than the workspace box.

## Pale blue land regression

The water mask was not the cause. Some projected land cells retained an `ice_cap` biome code after authoritative surface-structure classification determined they were not permanent ice.

Natural View previously chose the ice-cap palette before consulting permanent-ice facts. Large cold land areas could therefore read as shallow coastal water.

v0.3.65 makes the surface permanent-ice layer authoritative for natural presentation:

- `ice_cap` plus permanent ice remains ice;
- `ice_cap` without permanent ice presents through the tundra palette;
- point-inspection base-color diagnostics use the same presentation fallback;
- pale-land parity diagnostics no longer exclude stale non-permanent `ice_cap` cells.

The atlas world overlay also applies a subtle land-only warm tint so macro boundaries remain legible without warming ocean pixels.

## Terrain presentation

The control labeled **Terrain + hex** previously used legacy raster-overlay presentation, where refined tile rivers were absent. It now selects canonical terrain-tile presentation at every drilldown level.

Natural Tiles and Terrain consume the same tile facts and hydrology; only fill treatment differs. Auto may still use the raster overview at broader levels.

## Context halo

The tile generator needs nearby land and water facts for coastlines, islands, routing, and continuity. Rendering the entire rectangular extent as context hexes created large artificial ocean rectangles.

v0.3.65 retains context facts but presents only a connected halo around parent tiles:

- parent tiles are always visible;
- neighboring context expands by the requested padding, capped at two rings;
- disconnected rectangular corners remain hidden and cannot be selected;
- nearby ocean, lakes, islands, and adjacent land remain available where they touch the selected area.

## River hierarchy and endpoint legibility

### Sources and mouths

A visible river endpoint now carries runtime-only derived metadata:

- `riverSource` for a visible canonical or procedural source;
- `riverMouthEdges` where a land channel meets a water tile;
- `riverTerminus` for ocean, basin, lake, or wetland termination.

The renderer adds small source and mouth/terminus markers. These facts are generated with the tile window and are not persisted to `.wforge`.

### Main channels versus tributaries

v0.3.64 over-promoted inherited main channels while generating too few tributaries. v0.3.65:

- raises the navigable/main-channel strength threshold;
- increases bounded tributary opportunity below source resolution;
- shortens tributary spacing and raises the branch budget;
- permits early tributary convergence into existing channels;
- keeps canonical source rivers authoritative;
- selects procedural tributary sources from world, scale, terrain, and route facts rather than the currently open window;
- keeps overlapping-window tributary routes stable, while only displaying a source marker when the true source is inside the visible tile set.

This is still a cheap cartographic decomposition, not a full drainage-basin or discharge simulation.

## River visual grammar

### Boundary river

A notable river that does not dominate the active hex follows the hex perimeter from one crossed edge midpoint to another through one or more vertices. It does not enter the center.

This is an atlas cartographic treatment. It does not yet assert that the stored edge is the final strategy-game movement-penalty boundary.

### Center river and water tile

Center routing and water-tile conversion are now reserved for a river whose estimated physical width meets or exceeds the active nominal hex width.

The source physical-width estimate currently tops out below three miles. A 10-mile or 6-mile hex therefore remains land with a channel, not a fully painted water tile.

### Subhex display width

A strong but subhex main channel can occupy at most 65 percent of the flat-to-flat hex width. Minor tributaries cap at a substantially smaller fraction.

Main channels and tributaries use the same blue hue; width and opacity provide hierarchy so confluences do not look like two unrelated water systems.

## v0.3.65 implementation summary

- direct rendered-tile selection retained;
- canonical terrain-tile hydrology retained;
- world atlas overlay uses canonical equirectangular projection and the measured base-canvas box;
- stale non-permanent ice-cap land falls back to tundra presentation;
- rectangular context fields replaced by bounded connected halos;
- runtime-only source, mouth, and terminus metadata added;
- tributary generation increased and main-channel classification tightened;
- tributary refinement remains stable across overlapping windows;
- invented nine-mile atlas corridor estimate removed;
- physical river estimate again controls true water-tile conversion;
- subhex main rivers cap at 65 percent display width;
- main and minor rivers share a hue with width/opacity hierarchy.

## Context-menu direction

The right-click menu is accepted as the location-action surface.

Issue `#126` and `refs/planning/geographic-context-menu-and-centered-map.md` track:

- Hex details;
- Center map here;
- a future context-action registry;
- editing actions after versioning/editor prerequisites.

These do not block the current issue `#10` acceptance path.

## Required follow-ups

A later full local-hydrology and strategy-map model should provide:

- explicit discharge and river order;
- drainage-basin-aware tributary budgets;
- physically grounded bank-to-bank channel width;
- deltas, distributaries, floodplains, wetlands, and intermittent streams;
- semantic edge-river ownership for crossing penalties;
- semantic center/water-tile ownership for navigation;
- exporter and game-pack mappings;
- overlap, seam, reopen, and performance evidence at the finest supported scales.

Terrain refinement remains separate.

## v0.3.65 browser retest

1. Confirm pale non-ice land no longer reads as shallow water in the normal world map and atlas.
2. Confirm world macro outlines sit directly on the land and water boundaries they represent at multiple window sizes.
3. Repeat the southeast Region 15 left-click and right-click selection.
4. Confirm surrounding context is a connected coastal halo rather than a rectangular ocean field.
5. Compare the same river reach in Tiles and Terrain at region, subregion, local, and detail levels.
6. Confirm visible sources and mouths/termini read as intentional endpoints rather than clipped lines.
7. Confirm tributaries usually outnumber or at least materially supplement main trunks in deeply refined river basins.
8. Confirm main and minor channels blend through one hue family.
9. Confirm a strong river in a 10-mile or 6-mile hex remains capped near 65 percent unless its estimated physical width truly exceeds the hex.
10. Record river-window generation delay and any overlap/seam discontinuity.

## Acceptance impact

- workspace and hierarchy behavior: provisionally passed;
- direct tile selection: implemented, browser re-verification required;
- world atlas alignment: implemented for v0.3.65, browser verification required;
- land/water color separation: implemented for v0.3.65, browser verification required;
- bounded context halo: implemented for v0.3.65, browser verification required;
- source/mouth legibility and tributary hierarchy: implemented for v0.3.65, browser verification required;
- local/detail terrain refinement: unresolved;
- issue `#10`: remains open.

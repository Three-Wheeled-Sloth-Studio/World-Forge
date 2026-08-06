# Geographic drilldown scale-fidelity findings

Updated: 2026-08-06

Tracking: World Forge issue `#10`

Context-menu follow-up: issue `#126`

Observed runtime sequence:

- `0.3.61`: initial tile-window browser QA;
- `0.3.62`: canonical-path density correction;
- `0.3.63`: sub-source river refinement and first tile-hit correction;
- `0.3.64`: direct rendered-tile selection, canonical Terrain presentation, and explicit boundary-versus-center river grammar.

## Accepted behavior from the browser pass

The main-workspace drilldown path remains usable from world through detail. Hierarchy navigation, Back behavior, contextual map, and right-click action menu are useful enough to retain as the interaction baseline.

The v0.3.62 and v0.3.63 changes materially reduced the original local/detail river spam. Canonical generated paths remain the anchors, with bounded deterministic refinement below source resolution.

This is not full issue `#10` acceptance.

## Selection-coordinate defect

### Initial defect

Tile presentation uses a centered pointy-top odd-row layout with margins and row offsets. Selection originally treated the canvas as a rectangular latitude/longitude raster, causing large misses near the lower and side edges.

### Why v0.3.63 did not finish the fix

v0.3.63 added rendered-hex hit testing, but the controller still converted the hit tile back to latitude/longitude and then asked the coarse topology which child owned that location.

At deep scales, many fine tiles share coarse topology provenance. The round trip could therefore select a different coarse child from the child visibly drawn under the pointer.

### v0.3.64 correction

Tile presentation now returns the clicked canonical tile directly to the controller.

Selection uses:

- the hit tile's `membershipRole`;
- the hit tile's exact `childIndex`;
- the partition child at that index.

It does not fall back to rectangular topology selection when the pointer misses the rendered tile grid. Overlay/raster presentation retains its continuous geographic lookup path.

A regression deliberately makes rendered-tile child membership disagree with coarse topology membership and verifies that the rendered tile wins.

## Terrain presentation defect

The control labeled **Terrain + hex** was still wired to legacy raster-overlay presentation. Canonical refined rivers existed only in the tile renderer, so the Terrain view showed no rivers at deep levels and could lose them at broader levels through raster scaling.

In v0.3.64, **Terrain + hex** selects canonical terrain-tile presentation at every drilldown level. Natural Tiles and Terrain now consume the same tile facts and river layer; only their fill treatment differs.

Auto may still use the raster overview at broader hierarchy levels.

## Terrain fidelity ceiling

Around subregion scale and below, inherited terrain information is still reused beyond its useful source resolution. Tile presentation removes raster blur but exposes repeated coarse facts as broad, blocky areas.

Local/detail terrain acceptance still requires deterministic scale-specific refinement constrained by:

- coastline and water identity;
- broad relief and drainage;
- climate and biome;
- major ridges and rivers;
- stable world anchoring.

Sharpening alone is not a solution.

## River overgrowth diagnosis

The original local/detail renderer copied one coarse topology-cell river value into many fine tiles and let every tile choose downstream directions independently. Repeated source values and deterministic tie-breaking manufactured combs, spokes, and chevrons.

The current model instead:

- anchors to canonical generated river paths;
- refines routes only inside a bounded inherited corridor;
- uses elevation, water, wetness, river strength, and small deterministic micro-relief;
- permits bounded minor tributaries and early convergence;
- keeps scalar river strength unable to invent a network without canonical paths.

## River visual grammar

The following definitions apply to the geographic atlas.

### Boundary river

A notable river that does not dominate the active hex is drawn along the hex perimeter from one crossed edge midpoint to another through one or more hex vertices.

It does not enter the center of the hex.

This is currently an atlas cartographic treatment intended to break repeated geometric centerlines. It does **not** yet assert that the stored river edge is the exact strategy-game movement-penalty boundary. That stronger semantic contract belongs to game-map/export work.

### Center river

A center river runs from one or more edge midpoints into the hex interior. It is reserved for water that visually dominates the tile at the active scale.

### Water-dominant tile

The atlas estimates a bounded river corridor width from inherited river strength. When that display corridor reaches 72 percent of the active hex width:

- the tile receives water-dominant river fill;
- the river may enter the tile center;
- its stroke occupies a materially larger portion of the hex.

The estimate is cartographic, not yet authoritative bank-to-bank discharge geometry.

### Scale hierarchy

The same river's width is divided by the active nominal hex width. It must therefore occupy progressively more of the tile when drilling down:

- regional view: relatively light;
- local view: heavier;
- detail view: potentially dominant water terrain.

Minor tributaries retain a lower multiplier than major/navigable channels.

## v0.3.64 implementation

- direct rendered-tile child selection;
- no topology fallback outside the rendered tile grid;
- Terrain button routed to canonical tile presentation;
- rivers present in Natural Tiles and Terrain Tiles;
- ordinary rivers drawn on the hex perimeter;
- center routing limited to water-dominant channels;
- scale-relative corridor and stroke width;
- display-dominant river tiles filled as water;
- focused tests for direct tile selection, outside-grid rejection, context-tile rejection, perimeter route choice, scale hierarchy, and minor-versus-major visual weight.

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
- physically grounded channel width;
- deltas, distributaries, floodplains, wetlands, and intermittent streams;
- semantic edge-river ownership for crossing penalties;
- semantic center/water-tile ownership for navigation;
- exporter and game-pack mappings;
- overlap, seam, reopen, and performance evidence at the finest supported scales.

Terrain refinement remains separate.

## v0.3.64 browser retest

1. Repeat the reported southeast Region 15 selection with left-click and right-click.
2. Click near every map edge and in the black margin; margins must not select a child.
3. Compare the same river reach in Tiles and Terrain at region, subregion, local, and detail levels.
4. Confirm Terrain contains the same canonical river network as Tiles.
5. Confirm ordinary channels visibly hug hex boundaries rather than entering centers.
6. Confirm the same major channel becomes heavier relative to the hex at finer levels.
7. Confirm any water-dominant detail tile is filled and uses center routing.
8. Record any river-window generation delay.

## Acceptance impact

- workspace and hierarchy behavior: provisionally passed;
- canonical-path density correction: visually improved;
- direct tile selection: implemented for v0.3.64, browser verification required;
- Terrain river parity: implemented for v0.3.64, browser verification required;
- boundary-versus-center grammar: implemented for v0.3.64, browser verification required;
- local/detail terrain fidelity: unresolved;
- issue `#10`: remains open.

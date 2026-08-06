# Geographic drilldown scale-fidelity findings

Updated: 2026-08-06

Tracking: World Forge issue `#10`

Initial observed runtime: visible version `0.3.61`

Canonical-path correction observed: visible version `0.3.62`

Current corrective target: visible version `0.3.63`

## Accepted behavior from this pass

The main-workspace drilldown path remained usable from world through detail. Hierarchy navigation, Back behavior, parent/child boundaries, hex anchoring, and the contextual mini-map behaved well enough to continue the visual acceptance pass.

The v0.3.62 canonical-path correction materially reduced the original local/detail river spam. It did not complete scale-aware river refinement or terrain refinement.

This is not full issue `#10` acceptance.

## Selection-coordinate defect

In tile presentation, the visible map uses a centered pointy-top odd-row layout with margins and horizontal row offsets. Click selection still converted pointer positions through a rectangular latitude/longitude transform.

The two coordinate systems diverged increasingly toward the lower and side edges of the canvas. A click on the visible southeast portion of Region 15 could therefore resolve to a topology cell owned by Region 12. Left-click selection and right-click opening shared the same incorrect conversion.

The v0.3.63 correction makes the tile renderer return a tile-aware transform:

- pointer positions are hit-tested against the rendered hex polygons;
- the selected topology provenance is taken from the hit tile center;
- geographic labels and overlays resolve through the same world-relative odd-row layout;
- overlay/raster presentation retains its existing continuous geographic transform.

## Terrain fidelity ceiling

Around subregion scale and below, inherited terrain information is still enlarged beyond its useful source resolution. The tile presentation removes raster blur but can expose repeated coarse source facts as broad, blocky areas.

This is not primarily a shell, hierarchy, or CSS defect. Local/detail terrain acceptance requires deterministic scale-specific surface refinement, or a higher-resolution inherited-fact-constrained source, while preserving:

- coastline and water identity;
- broad relief and drainage constraints;
- climate and biome;
- major ridges and rivers;
- stable world anchoring and replay behavior.

Sharpening the inherited raster would make the artifact crisper, not add missing geographic information.

## River overgrowth diagnosis

The original local and detail tile windows rendered dense repeated comb, spoke, and chevron patterns.

The original tile classifier copied one coarse topology-cell `riverStrength` value into many finer geographic hexes. Every qualifying tile then independently chose one or two neighboring directions. Repeated source values and deterministic direction tie-breaking manufactured a regular network that did not represent the generated world's authoritative river paths.

v0.3.62 removed that scalar-only network invention and projected canonical generated river paths into the active world-relative tile grid. The remaining presentation still routed every connection through the hex center and retained fixed line weights, so it could look too mechanical and too heavy for the active scale.

## Scale-aware river conventions

The drilldown atlas now uses the following working convention. This is a presentation and refinement contract, not yet the final strategy-game export contract.

### Dominant channel

When the estimated physical river width is at least 72 percent of the active hex width, the channel dominates that tile at that scale.

The tile is represented as water-dominant river terrain and the channel may use the tile center. This should occur only at sufficiently fine scales or for exceptionally broad channels.

### Notable non-dominant channel

A river that is important at the active scale but does not dominate the hex is drawn through the tile between the crossed edge midpoints. It is not forced through the exact hex center.

Visual width is derived from estimated physical width divided by active hex width, with bounded minimum and maximum canvas widths.

### Refined tributary

When the active hex scale is finer than the source topology resolution, canonical river paths remain the anchors. A bounded deterministic refinement pass may add minor tributaries and meander between those anchors.

Refinement must:

- use inherited elevation, water, wetness, and river strength;
- add only small seeded micro-relief to break otherwise identical fine-tile choices;
- penalize uphill routing and excessive deviation from the inherited channel corridor;
- permit tributaries to merge early into an existing channel;
- vary branch count deterministically so some reaches remain coherent and others form modest feeder networks;
- remain window-bounded and cheap;
- require no persisted drilldown artifact or replay migration.

The same project, scale, and window must reproduce the same result during ordinary use. No stronger cross-version preservation guarantee is introduced by this increment.

## v0.3.63 implementation

The bounded implementation includes:

- actual rendered-hex hit testing for tile presentation;
- terrain-constrained routing inside a narrow corridor around each canonical river segment;
- deterministic micro-relief used only to resolve sub-source routing choices;
- bounded, lower-weight tributary generation below source resolution;
- early tributary convergence when an existing major channel is reached;
- edge-to-edge curved channel presentation for ordinary river tiles;
- scale-relative river line weight;
- water-dominant tile conversion only when estimated river width exceeds the active-scale threshold;
- canonical river paths remaining authoritative anchors;
- scalar river strength remaining unable to invent a network without canonical paths.

## Required follow-ups

A later full local-hydrology model should provide:

- explicit discharge and river order;
- drainage-basin-aware tributary budgets;
- physically grounded channel width rather than the current bounded estimate;
- deltas, distributaries, floodplains, wetlands, and intermittent streams;
- the final center-versus-edge strategy-map contract;
- exporter/game-pack mappings for dominant water tiles and edge rivers;
- overlap, seam, reopen, and performance evidence at the finest supported scales.

Terrain refinement remains a separate increment. The river refinement must not be represented as solving local/detail terrain resolution.

## Acceptance impact

- workspace and hierarchy behavior: provisionally passed for the tested path;
- v0.3.62 canonical-path density correction: visually improved;
- tile selection coordinates: correction implemented for v0.3.63, exact-head browser verification required;
- scale-aware river routing and presentation: implemented for v0.3.63, exact-head browser verification required;
- local/detail terrain fidelity: failed pending scale-specific refinement;
- issue `#10`: remains open.

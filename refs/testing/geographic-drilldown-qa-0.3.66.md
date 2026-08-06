# Geographic drilldown QA: 0.3.66

Date: 2026-08-06

Tracking: issue `#10`

Visible app version: `0.3.66`

Generator version: `0.1.2-mvp`

## Scope

This checkpoint responds to the v0.3.65 browser pass:

- pale cyan land remained in the normal world biome view;
- dominant mainland domains could still be labeled Archipelago;
- canonical river paths could appear to start or stop in the middle of a map;
- named river sets remained sparse on some fresh worlds;
- Auto could switch into a legacy raster/partition presentation at deep levels.

## Corrections

### World land presentation

The v0.3.65 fallback only governed Natural View. The normal data-style biome renderer still used the projected map ice array directly.

v0.3.66 applies authoritative surface permanent-ice classification to both biome presentation paths through a presentation-only project view:

- non-permanent land does not receive the ice color merely because the projected map ice bit is stale;
- stale non-permanent `ice_cap` land presents as tundra;
- ocean ice remains preserved;
- the source project and saved layer arrays are not mutated.

### Mainland versus archipelago

The old grouped-domain rule treated any domain containing more than one connected land component as an archipelago.

v0.3.66 classifies by connected-component land area:

- a domain with one component owning at least 72 percent of grouped land area is a landmass;
- Archipelago is reserved for distributed island groups without a dominant mainland;
- satellite islands no longer force a dominant continent into the Archipelago label.

### River continuity

Projected canonical routes are now densified into adjacent world-relative odd-row hexes. A non-adjacent projected pair can no longer be silently skipped by edge assignment.

This addresses apparent mid-map river starts and stops caused by display projection gaps. It does not use endpoint markers as a substitute for actual route continuity.

### River population

Fresh generation now supplements deficient named-river sets from the existing authoritative topology river signal.

A promoted route must:

- begin on signaled elevated land;
- follow adjacent topology cells;
- avoid loops;
- resolve into ocean, a topology lake, or an existing downstream named river;
- be rejected when it terminates as an unresolved inland dead end.

Metrics are recomputed after accepted routes are added. The topology scalar river field is not replaced or randomly decorated.

Because fresh generation semantics changed, the generator version advances from `0.1.1-mvp` to `0.1.2-mvp`. Existing saved worlds are not rewritten. Replay compatibility correctly distinguishes the two generator versions.

### Presentation controls

The visible Auto control is removed.

Drilldown now exposes only:

- Natural;
- Terrain.

Both presentations use canonical tile windows, identical membership, selection, boundaries, and hydrology. The legacy overlay path remains internal and explicit-only for diagnostics.

## Automated coverage

Added or extended tests cover:

- Auto resolving to canonical tiles at every hierarchy level;
- dominant-mainland and distributed-archipelago classification;
- presentation-only permanent-ice correction without source mutation;
- continuous adjacent fine-hex river projection, including seam-aware distance;
- resolved named-river promotion to actual water;
- named-river count bounds;
- generator replay version `0.1.2-mvp`.

## Required browser retest

1. Generate a fresh world under app `0.3.66` and confirm its generator version is `0.1.2-mvp`.
2. Confirm pale non-ice land no longer reads as coastal water in the normal world biome view.
3. Open Atlas and confirm the same land remains visually distinct from water.
4. Inspect the large mainland and secondary large continent from the v0.3.65 case; confirm they are labeled Continent/Landmass rather than Archipelago when a dominant connected component exists.
5. Confirm actual distributed island groups remain labeled Archipelago.
6. Confirm the presentation control offers Natural and Terrain only.
7. Follow several rivers from region through detail and check that no segment disappears solely because projected hexes were non-adjacent.
8. Confirm visible rivers resolve into ocean, lake, or an established downstream river rather than ending as unexplained inland stubs.
9. Compare fresh `0.3.65` and `0.3.66` worlds at similar river density; record named river count and visible tributary coverage.
10. Check one longitude-seam river for continuity.
11. Record generation time impact from named-river supplementation.

## Acceptance boundary

- Existing `.wforge` and saved-project schemas are unchanged.
- Existing saved projects are not migrated or rewritten.
- Fresh generation output is intentionally different and versioned accordingly.
- Full drainage-basin simulation, discharge, river order, deltas, and intermittent streams remain future hydrology work.
- Browser acceptance and exact-head hosted CI are still required before issue `#10` can close.

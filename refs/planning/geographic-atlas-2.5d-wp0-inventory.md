# Geographic Atlas 2.5D WP0 Inventory

Updated: 2026-08-06

Status: complete for the architecture spike baseline

This inventory freezes the reusable seams before the representative terrain patch is built. It classifies current code as Reuse, Extend, Replace, or Reference-only. The classifications are architectural, not a deletion order.

## Reuse

### Canonical geography and hierarchy

- `packages/shared/src/geographicHierarchy.ts`
  - Reuse stable hierarchy identities, levels, parent-child relationships, and semantic navigation.
  - Hierarchy continues to describe meaning. It does not choose renderer technology or camera limits.
- `packages/shared/src/geographicTileWindow.ts`
  - Reuse window identity, extent, projection metadata, antimeridian-safe helpers, request signatures, and provider cancellation.
- `packages/generator-core/src/geographicTileWindow.ts`
  - Reuse the current window extraction boundary and authoritative generated-world inputs.
- `packages/generator-core/src/geographicTopologyAdjacency.ts`
  - Reuse topology relationships when resolving neighboring patches and edge continuity.

### Existing generator interpretation seams

- `packages/generator-core/src/geographicAdaptiveScale.ts`
  - Reuse semantic detail and density guidance as scene-builder inputs, not renderer switches.
- `packages/generator-core/src/geographicSurfaceDomains.ts`
- `packages/generator-core/src/geographicSurfaceDomainsBase.ts`
  - Reuse canonical surface-domain interpretation for terrain, water, ice, and material weights.
- `packages/generator-core/src/geographicRiverTileProjection.ts`
- `packages/generator-core/src/geographicRiverTileProjectionBase.ts`
- `packages/generator-core/src/riverPathProjection.ts`
  - Reuse canonical river projection and continuity work as the source for terrain-following river paths.
- `packages/generator-core/src/geographicWidthScale.ts`
  - Reuse world-relative width scaling for river and boundary presentation hints.
- `packages/generator-core/src/worldHexOverlay.ts`
  - Reuse world-anchored hex identity and scale logic. Hexes remain an overlay, not terrain geometry.
- `packages/generator-core/src/geographicRegionLabels.ts`
  - Reuse label identity, source ownership, and semantic priority inputs.

### Interaction and workspace seams

- `apps/desktop/src/regions/useGeographicAtlasController.ts`
  - Reuse selection intent, hierarchy navigation, context synchronization, and cancellation ownership.
- `apps/desktop/src/regions/GeographicAtlasModal.tsx`
  - Reuse the workspace integration boundary while replacing its flat scene authority.
- Existing right-click location actions and canonical selection IDs
  - Reuse unchanged. Issue #126 remains a later consumer.
- Existing export and observability contracts
  - Reuse IDs, signatures, provenance, warnings, and timing boundaries without persisting spike-only scene artifacts.

## Extend

### Tile windows and neighboring context

Extend tile-window production with:

- stable neighboring patch identities;
- explicit edge sample identities;
- reciprocal seam orientation;
- bounded skirt fallback where shared samples are unavailable;
- scene-build progress and cancellation checkpoints;
- enough neighboring context to prevent edge discontinuities without building a full-world fine mesh.

### Generator outputs

Extend geographic interpretation to produce renderer-ready, deterministic inputs for:

- elevation-displaced terrain vertices and triangle indices;
- material weights from authoritative surface domains;
- separate water meshes and levels;
- canonical river paths with terrain-relative elevation and width hints;
- boundary paths and label anchors;
- progressive hex cells as batched overlay data;
- deterministic diagnostics, including unresolved drainage and seam warnings.

### Desktop rendering

Extend the desktop atlas with:

- a `GeographicScene` to Three.js adapter;
- an orthographic map camera with continuous zoom;
- shallow pitch and limited rotation;
- a single picking path for regions, hexes, rivers, and locations;
- screen-space labels;
- synchronized context-map framing;
- explicit unsupported, cancelled, and failed states rather than silent Auto fallback.

## Replace

Replace these responsibilities in the production path:

- flat Canvas or SVG terrain as the authoritative geographic view;
- screen-space polygons as the source of elevation, water, region membership, or rivers;
- zoom levels that swap renderer families or stop at hierarchy-defined ceilings;
- direct generator-to-view coupling;
- material colors used to infer geographic truth;
- raised hex columns or per-hex scene objects as production terrain;
- hidden Auto or legacy fallback behavior after the 2.5D path is accepted.

The existing flat atlas remains available during the spike as QA evidence and a temporary explicit fallback. It must not silently substitute itself for a failed 2.5D scene.

## Reference-only

- v0.3.61 through v0.3.66 geographic drilldown screenshots and QA notes.
- Current flat atlas rendering code.
- Any older globe presentation code found during implementation.

Reference-only code may supply interaction patterns, palette ideas, camera math, or diagnostics. It does not define the new scene contract.

## Three.js and globe utility finding

The repository already depends on Three.js (`three` 0.183.x), but the current tracked source contains no reusable `WebGLRenderer` or `OrbitControls` host found by the WP0 audit. The renderer adapter should therefore be introduced deliberately in WP2 instead of reviving an unverified legacy seam.

This is not a blocker. WP1 remains renderer-neutral by design.

## WP1 boundary

`packages/shared/src/geographicScene.ts` is the pure contract between geographic interpretation and rendering. It contains:

- deterministic scene identity and signatures;
- projection and visible extent;
- terrain patches and explicit reciprocal seams;
- water, rivers, boundaries, hexes, labels, selection, and context;
- deterministic diagnostics;
- structural cancellation and progress types with no DOM dependency.

It imports no React, Canvas, DOM, WebGL, or Three.js types.

## Next implementation slice

WP2 should build one fixed representative continental fixture through a pure scene builder, then adapt only terrain and water into a Three.js host. Natural and analytical materials must share the same geometry. Rivers, boundaries, labels, and hexes remain in the contract but should be added to the renderer one vertical slice at a time.

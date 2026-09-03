---
type: "Testing Reference"
title: "Geographic Drill-down QA Findings - 2026-07-28"
tags:
- world-forge
- testing
---
# Geographic Drill-down QA Findings - 2026-07-28

Tested build: `0.3.21`

## Confirmed strengths

- Drill-down scale progression is materially improved.
- Selected extents generally fill the workspace well.
- Region through local navigation is understandable once entered.

## Confirmed defects

1. Right-click immediately opens the selected child instead of presenting a drill-down action menu.
2. `Auto` switches to the terrain tile palette below macro level, flattening biome coloration.
3. Child boundaries are too faint in raster-backed intermediate views.
4. The legacy geographic-region preview can coexist with drill-down and draws hundreds of first-level regions over the world view. This is not the intended world or globe presentation.
5. The drill-down canvas intercepts point-inspector clicks, making it difficult to inspect suspected generation artifacts.
6. Macro areas currently mirror connected surface domains. Large land masses joined by narrow isthmuses therefore collapse into one continent even when each lobe is independently continent-sized.
7. Long, narrow land ribbons appear too frequently and should be evaluated as a generation-quality defect separately from macro-area classification.

## Accepted correction direction

- Right-click selects and opens a small context menu. Double-click and Enter may remain direct drill-down shortcuts.
- `Auto` uses the natural raster-backed map for macro area, region, and subregion. Local and detail use naturally colored canonical tiles. The flat terrain palette remains an explicit presentation choice only.
- Increase child-boundary contrast in raster-backed views.
- Remove the legacy all-region preview from the normal World panel. It remains diagnostic code until it is deliberately relocated to developer tooling.
- When point diagnostics are active, return drill-down to the world view and allow pointer events to reach the authoritative world canvas.
- Globe geography should ultimately show macro continent, archipelago, and ocean-basin boundaries only. Full region partitions are not a world/globe layer.

## Macro-area follow-up

Use morphology-aware landmass decomposition rather than raw connected components:

1. Compute geodesic distance from each land cell to the coast.
2. Erode each oversized landmass into broad interior cores.
3. Identify multiple large core components separated by narrow necks.
4. Require both sides of a proposed cut to exceed a minimum continent-area threshold.
5. Assign the removed neck and coastal fringe back to the nearest accepted core with deterministic multi-source graph growth.
6. Score candidate cuts using neck width, resulting area balance, and optional tectonic support.
7. Keep the physical land bridge intact. The cut changes macro membership, not terrain.

This handles North America versus South America and Eurasia versus Africa without treating every peninsula as a continent. A plain articulation-point test is not sufficient because realistic isthmuses are usually several cells wide and noisy at the coast.

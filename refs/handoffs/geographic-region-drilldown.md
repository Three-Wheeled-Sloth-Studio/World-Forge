# Geographic Region Drilldown Handoff

Updated: 2026-07-28

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Status: **paused**

Runtime version observed in browser QA: `0.3.32`

Source version currently declared in `apps/desktop/src/appVersion.ts`: `0.3.23`

Tracking issues:

- `#10` Canonical tile-window geographic drilldown
- `#12` Split oversized landmasses at narrow isthmuses

Detailed pinned status:

`refs/handoffs/archive/geographic-drilldown-v0.3.32-paused.md`

## Decision

The drilldown is usable enough to remain on `dev` for testing, but it is not an accepted or promoted milestone.

Work is paused because the production browser test still groups the large connected land bodies into one continent. The synthetic isthmus decomposition tests pass, but real-world behavior did not change. More threshold tuning is prohibited until runtime provenance and macro-decomposition diagnostics identify which production stage is failing.

The active product increment is now world-builder cleanup.

## What remains available

- Main-world-map drilldown toggle.
- World-level macro selection.
- Right-click action menu and direct double-click/Enter open paths.
- Breadcrumb, Back, and Escape navigation.
- Width-driven scale progression targeting approximately 50 hexes across.
- Generic hierarchy through region, subregion, local, and detail.
- Canonical world-anchored tile windows.
- Natural terrain overlays and clean detailed tile rendering.
- Immediate child boundaries and populated drilldown inspector.

## Known defects retained

- Real continent grouping remains unchanged.
- Browser/runtime version provenance is inconsistent.
- Raster-backed maps become fuzzy at deeper scales.
- Some drill paths appear to stop near 6-mile hexes.
- Suspicious ribbon land remains a terrain-generation concern.
- Runtime and exporter tile classifiers remain parallel.

## Required first step when work resumes

Add a macro-decomposition diagnostic report that exposes the exact runtime commit, selected continent target, land domains, requested pieces, erosion depths, accepted and rejected cores, final macro count, membership signature, cache use, and overlay membership source.

Do not resume by adjusting thresholds blindly.

## Promotion status

Do not promote this work as a completed geography milestone. Issues `#10` and `#12` remain open and paused.

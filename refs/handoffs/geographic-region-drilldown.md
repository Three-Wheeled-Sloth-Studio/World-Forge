---
type: "Handoff Record"
title: "Geographic Region Drilldown Handoff"
tags:
- world-forge
- handoffs
---
# Geographic Region Drilldown Handoff

Updated: 2026-08-05

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Status: **active next slice; implementation present but not accepted**

Tracking:

- World Forge issue `#10` — canonical tile-window geographic drilldown
- World Forge issue `#12` — narrow-isthmus macro decomposition, separate and paused

Authoritative resume handoff:

- `refs/handoffs/canonical-geographic-drilldown-next-slice.md`

Current repository handoff:

- `refs/handoffs/currentHandoff.md`

Browser QA:

- `refs/testing/geographic-region-drilldown-qa.md`

Rendering roadmap:

- `refs/handoffs/geographic-drilldown-rendering-roadmap.md`

Historical pause record:

- `refs/handoffs/archive/geographic-drilldown-v0.3.32-paused.md`

## Status reconciliation

The archived pause record remains useful historical evidence, but its statement that world-builder cleanup is the active increment is obsolete.

The current `dev` source contains:

- versioned canonical tile-window and classifier contracts;
- bounded seam-aware world-relative tile generation;
- exact parent and context roles;
- deterministic tile IDs and signatures;
- a clean 2D tile renderer;
- generic atlas orchestration;
- a current modal atlas shell.

The work is not accepted because the complete exact-head browser matrix, classifier convergence, and production UX have not been closed.

## Current product direction

Resume issue `#10` as a 2D geographic foundation:

```text
World
-> continent / archipelago / provisional ocean basin
-> region
-> subregion
-> local
-> detail
```

Region and deeper views must use canonical tile windows rather than enlarged world rasters.

New UX requirements added on 2026-08-05:

- persistent mini-map at every opened drilldown level;
- mini-map shows current window, parent context, and selected child without generating a duplicate fine window;
- prefer repurposing the main application workspace over a modal when the shell change is low effort;
- hide ordinary side panels during the atlas session;
- retain a compact drilldown inspector and a clear breadcrumb back to the normal world map;
- extract one shared `GeographicAtlasWorkspace` so modal and main-workspace modes cannot diverge.

## Immediate start

1. Record exact `dev` head and visible runtime version.
2. Run focused tests, `npm audit`, `npm run verify`, and `npm run evaluate:regions`.
3. Confirm which UI path is active in the browser.
4. Extract the neutral workspace component and prove the mini-map data path.
5. Converge exporter and runtime classifier ownership with parity fixtures.
6. Complete world-to-detail browser QA and screenshot evidence.

## Boundaries

- Issue `#12` macro decomposition is not solved by threshold tuning during this slice.
- Do not activate or persist `world-regions-v2`.
- Do not begin 3D, PBR materials, resources, settlements, roads, politics, or cultures.
- Do not create a second geography model for the mini-map.
- Preserve deterministic generation, `.wforge`, and Parchment embedding behavior.

## Promotion status

Do not promote this as a completed geography milestone until issue `#10` acceptance criteria, including mini-map and workspace-shell decisions, pass on the exact validated commit.
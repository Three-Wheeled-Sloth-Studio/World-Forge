# Current Handoff: Canonical Geographic Drilldown

Updated: 2026-08-05

Status: **active next slice on `dev`**

Primary tracking:

- World Forge issue `#10`, **[PI] Build canonical tile-window geographic drilldown**
- `refs/handoffs/canonical-geographic-drilldown-next-slice.md`
- `refs/testing/geographic-region-drilldown-qa.md`

Primary repository:

- `Three-Wheeled-Sloth-Studio/World-Forge`
- branch: `dev`

Integration/regression repository:

- `Three-Wheeled-Sloth-Studio/Parchment-Worlds`
- branch: `dev`
- preserve embedded World Forge launch, save-back, and the accepted Sol starter path

## Product objective

Deliver a deterministic 2D hierarchy:

```text
World
-> continent / archipelago / provisional ocean basin
-> region
-> subregion
-> local
-> detail
```

Region and deeper views must use canonical world-anchored tile windows rather than enlarged global raster crops. Stable IDs, inherited geography, exact parent membership, context-only terrain, seam behavior, and overlapping-window consistency are core contracts.

## Required UX additions

### Mini-map

Every opened drilldown level must include a compact mini-map that:

- shows whole-world or useful ancestor context;
- marks the current window;
- distinguishes exact parent and surrounding context;
- marks the selected immediate child when applicable;
- remains longitude-seam aware;
- updates with Back and breadcrumb navigation;
- does not generate a second fine-resolution tile window.

The first accepted mini-map may be read-only.

### Main-workspace presentation

The current atlas mounts as `GeographicAtlasModal` over the normal page. The preferred low-effort shape is:

- extract one neutral `GeographicAtlasWorkspace` from the modal;
- mount it in the primary content area while drilldown is active;
- suppress the ordinary application side panels;
- retain a compact drilldown-specific inspector;
- provide a clear breadcrumb back to the normal world map;
- restore the prior map context on exit.

Retain the modal temporarily only if the shell change requires new routing, durable state, Parchment integration, or duplicated controller behavior. Even then, use the shared workspace component and record the remaining shell migration.

## Read first

1. `refs/handoffs/canonical-geographic-drilldown-next-slice.md`
2. World Forge issue `#10`
3. `refs/handoffs/geographic-region-drilldown.md`
4. `refs/handoffs/geographic-drilldown-rendering-roadmap.md`
5. `refs/testing/geographic-region-drilldown-qa.md`
6. `refs/handoffs/archive/geographic-drilldown-v0.3.32-paused.md`
7. `packages/shared/src/geographicTileWindow.ts`
8. `packages/generator-core/src/geographicTileWindow.ts`
9. `apps/desktop/src/regions/geographicTileWindowMap.ts`
10. `apps/desktop/src/regions/GeographicAtlasModal.tsx`
11. `apps/desktop/src/regions/useGeographicAtlasController.ts`
12. `packages/exporters/src/index.ts`

The dedicated next-slice handoff is authoritative where older status descriptions conflict.

## Current verified source baseline

Present on `dev`:

- `geographic-tile-window-v1` and `geographic-tile-classifier-v1`;
- bounded seam-aware tile-window generation with a halo;
- world-relative `q/r` coordinates and stable tile IDs;
- exact parent and context roles;
- deterministic signatures;
- a dedicated 2D tile renderer;
- generic atlas controller and current modal presentation.

Not accepted yet:

- exact-head browser QA across the issue `#10` matrix;
- exporter/runtime classifier convergence;
- persistent mini-map;
- main-workspace presentation;
- full world-to-detail acceptance on a trustworthy runtime;
- macro-decomposition behavior tracked separately by issue `#12`.

## Recommended sequence

### WP0 — Trustworthy baseline

- record exact `dev` head and visible runtime version;
- run focused tests plus `npm audit`, `npm run verify`, and `npm run evaluate:regions`;
- identify the actual active browser path;
- capture defects before changing behavior.

### WP1 — Canonical ownership

- establish exporter/runtime parity fixtures;
- converge exporter generation onto the canonical classifier or shared pure classification seam;
- prove overlap, seam, river, and ridge consistency.

### WP2 — Workspace and mini-map

- extract `GeographicAtlasWorkspace`;
- implement main-content atlas-session mode when low effort;
- suppress normal side panels;
- add breadcrumb back to the world map;
- add persistent mini-map at every opened level;
- preserve one controller and renderer path.

### WP3 — Hierarchy hardening

- validate world through detail;
- fix scale progression, selection, labels, edge continuity, and context behavior;
- preserve inherited geography;
- keep region and deeper maps materially cleaner than raster enlargement.

### WP4 — QA and closeout

- complete fixed-seed, preset, seam, reopen, and maximum-footprint checks;
- validate `1920 x 1080` and `1440 x 900`;
- capture a full screenshot sequence including mini-map and workspace shell;
- update issue `#10` and repository handoffs.

## Guardrails

- Do not create a second geography model for the mini-map or workspace.
- Do not reset coordinates per parent.
- Do not keep two untracked long-lived classifiers.
- Do not generate a full-world fine tile grid.
- Do not activate or persist `world-regions-v2`.
- Do not begin regional 3D, PBR materials, politics, settlements, roads, or resources.
- Do not resume issue `#12` by blindly tuning thresholds.
- Do not reopen deferred Sol presentation work.
- Preserve ordinary deterministic generation and `.wforge` compatibility.

## Deferred Sol reference status

The Sol package pipeline remains operational. Earth, Jupiter, and Mars are user-accepted. Broader planet/moon Globe coverage remains deferred and unaccepted.

Latest recorded `.wforge` evidence:

```text
Bodies: 23
Package bytes: 2,763,277
SHA-256: 99852f4549b778d097f94511562381f572394803b297011ac9c183404b4defbd
```

Do not regress these paths or claim a full `.pworld` digest.
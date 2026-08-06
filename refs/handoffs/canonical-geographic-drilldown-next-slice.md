# Canonical Geographic Drilldown — Next-Slice Handoff

Updated: 2026-08-05

Status: **active next slice on `dev`**

Primary repository:

- `Three-Wheeled-Sloth-Studio/World-Forge`
- branch: `dev`
- tracking: World Forge issue `#10`, **[PI] Build canonical tile-window geographic drilldown**

Integration and regression repository:

- `Three-Wheeled-Sloth-Studio/Parchment-Worlds`
- branch: `dev`
- preserve the existing embedded World Forge project handoff and Sol starter behavior tracked by Parchment Worlds issue `#22`
- no Parchment implementation is expected unless the main-workspace presentation requires a host-shell or route contract change

## Product outcome

A user can move from the world map through:

```text
World
-> continent / archipelago / provisional ocean basin
-> region
-> subregion
-> local
-> detail
```

Each opened level uses a deterministic, world-anchored canonical tile window rather than enlarging the global raster. The user retains geographic context, can navigate back through breadcrumbs, and can understand where the current window sits inside its parent and the whole world.

This is a 2D geographic foundation. It is intended to support later Explorer functionality, editing, resources, settlements, and civilization simulation. It is not a 3D or PBR slice.

## Read first

Authoritative issue and current handoff:

1. World Forge issue `#10` — complete product outcome, guardrails, implementation packages, QA matrix, and definition of done.
2. `refs/handoffs/currentHandoff.md` — current repository work state.
3. This file — authoritative resume sequence and the 2026-08-05 UX additions.

Existing drilldown references:

4. `refs/handoffs/geographic-region-drilldown.md`
5. `refs/handoffs/geographic-drilldown-rendering-roadmap.md`
6. `refs/testing/geographic-region-drilldown-qa.md`
7. `refs/handoffs/archive/geographic-drilldown-v0.3.32-paused.md`

Relevant contracts and implementation seams:

8. `packages/shared/src/geographicTileWindow.ts`
9. `packages/generator-core/src/geographicTileWindow.ts`
10. `apps/desktop/src/regions/geographicTileWindowMap.ts`
11. `apps/desktop/src/regions/GeographicAtlasModal.tsx`
12. `apps/desktop/src/regions/useGeographicAtlasController.ts`
13. `packages/exporters/src/index.ts`

Related but separate work:

- World Forge issue `#12`, narrow-isthmus macro decomposition, remains a separate diagnostic and terrain-quality track.
- The deferred complete-Sol Globe work remains pinned in `refs/testing/sol-basic-globe-acceptance.md` and must not be pulled into this slice.

## Status reconciliation

The older drilldown documents describe different checkpoints and should not be read as one continuous accepted status.

Confirmed in the current `dev` source:

- `geographic-tile-window-v1` and `geographic-tile-classifier-v1` contracts exist;
- a runtime `generateGeographicTileWindow(...)` implementation exists;
- the generator creates bounded seam-aware windows with a one-tile halo;
- exact parent membership and contextual tiles are separate;
- world-relative `q/r` IDs and deterministic signatures exist;
- a dedicated 2D canonical tile-window renderer exists;
- a generic atlas controller and a current modal workspace exist.

Not yet accepted:

- the exact current browser path has not completed the issue `#10` QA matrix;
- the current user-facing atlas still opens as a modal over the main page;
- no persistent mini-map is present at each drilldown level;
- exporter and runtime classifier ownership must be reconfirmed and converged rather than assumed complete;
- the complete world-to-detail experience has not been accepted on a trustworthy exact-head runtime;
- historical macro-decomposition defects from issue `#12` remain unresolved but are not a blocker for canonical tile-window hardening.

Do not rebuild contracts that are already present. Audit, converge, harden, and prove the existing path.

## New UX requirements

### Persistent mini-map

Every opened drilldown level must include a compact mini-map.

Minimum behavior:

- show the whole world or the nearest useful ancestor context;
- outline the current opened window;
- distinguish the exact parent area from surrounding context;
- indicate the selected immediate child where one exists;
- remain seam-aware for longitude-wrapping windows;
- update as breadcrumbs or Back change the active level;
- remain visible without materially shrinking the primary map;
- use existing overview geography, memberships, and canonical extents rather than introducing a second geographic model;
- avoid generating a second fine-resolution tile window merely for the mini-map.

The first accepted mini-map may be read-only. Click-to-recenter, drag navigation, and alternate ancestor levels may be follow-ups.

Recommended implementation shape:

- derive a small cached overview from the existing world map or hierarchy preview;
- overlay the current extent, exact parent membership, and selected child;
- keep the mini-map presentation-specific and keep its coordinates out of the canonical tile-window contract.

### Main-workspace drilldown preference

The current implementation mounts `GeographicAtlasModal` over the normal page. The preferred experience is to repurpose the main World Forge screen while drilling down:

- hide the ordinary left and right application side panels;
- let the atlas occupy the main workspace;
- retain a compact drilldown-specific inspector where useful;
- show a clear breadcrumb back to the normal world map;
- preserve Back and Escape behavior through hierarchy levels;
- return to the exact prior world-map context when leaving drilldown.

Treat this as part of the slice when the extraction is low effort.

Recommended early spike:

1. Extract the content and controller wiring currently owned by `GeographicAtlasModal` into a neutral `GeographicAtlasWorkspace` component.
2. Mount that workspace in the primary application content area while an atlas session is active.
3. Suppress normal side panels and unrelated viewer chrome during the session.
4. Keep the existing modal wrapper only as a temporary fallback around the same workspace component.

This avoids maintaining separate modal and full-workspace atlas implementations.

Low-effort means the change can be made as presentation state and component composition without introducing new durable project state, a Parchment route migration, or duplicated controller logic. If that boundary is exceeded, keep the shared workspace extraction, retain the modal temporarily, and record the remaining shell change explicitly.

## Architecture rules

### Canonical tile identity

- Tile IDs remain world-relative and stable across parents, reopen, and overlapping windows.
- Coordinates never reset to a parent-local `0,0` grid.
- Exact parent membership remains separate from rectangular context.
- Child membership remains a relationship/overlay, not terrain identity.
- Mini-map and workspace changes must not alter canonical tile facts.

### One classifier

The runtime tile-window generator should be the canonical classifier.

Before changing exporter ownership:

- add or retain representative parity fixtures for biome, morphology, water, ice, rivers, ridges, features, and terrain names;
- verify full-world export can consume the same canonical result or the same extracted pure classification functions;
- preserve stable export behavior where it is already accepted.

Do not leave two long-lived classifiers with subtly different geography.

### Bounded generation

- Generate only the active contextual window plus the bounded halo needed for edge facts.
- Ordinary windows remain within the existing `10 x 10` to `50 x 50` contract.
- Do not build a fine-resolution full-world tile grid to support the atlas or mini-map.
- Cache only reusable diagnostic/session results with keys that include project, parent, level, scale, and algorithm versions.

### Inherited facts

Deeper windows must not contradict inherited:

- coastline and water identity;
- broad elevation and relief;
- major ridges and rivers;
- climate and biome;
- geology and volcanism;
- permanent ice and snow constraints.

Local and detail remain deterministic interpretations of inherited world facts in this PI. New authoritative high-resolution terrain simulation is out of scope.

## Recommended work sequence

### WP0 — Establish a trustworthy current baseline

- record the exact `dev` commit and visible runtime version;
- run the existing focused tile-window, hierarchy, and renderer tests;
- run `npm audit`, `npm run verify`, and `npm run evaluate:regions`;
- identify which historical drilldown UI path is actually active in the browser;
- confirm that the current modal uses the canonical tile-window renderer at region and deeper levels;
- capture defects before changing behavior.

Do not tune issue `#12` macro-decomposition thresholds during this work package.

### WP1 — Classifier ownership and canonical contract hardening

- compare exporter classification with `generateGeographicTileWindow(...)`;
- establish representative parity fixtures;
- move exporter generation onto the canonical classifier or shared pure classification seam;
- prove stable tile facts across overlapping and seam-crossing windows;
- preserve the versioned contract and deterministic signatures.

### WP2 — Atlas workspace shell and persistent mini-map

- extract `GeographicAtlasWorkspace` from the current modal;
- add a main-content atlas-session presentation;
- hide ordinary application side panels while the session is active;
- add the compact breadcrumb back to the world map;
- preserve hierarchy Back, breadcrumb, and Escape behavior;
- add the mini-map to every opened level;
- keep a single controller and rendering path.

### WP3 — Hierarchy and renderer hardening

- verify the complete world-to-detail path;
- confirm exact-parent versus context-only selection;
- confirm Natural and Terrain share identical hierarchy geometry;
- fix edge hit testing, labels, river/ridge continuity, and seam behavior;
- confirm local and detail do not stall at an unintended scale;
- keep the primary map materially cleaner than the former raster enlargement.

### WP4 — Widescreen and performance QA

Validate at minimum:

- `1920 x 1080`;
- `1440 x 900`;
- required fixed seeds and presets from the QA plan;
- one longitude-seam case;
- one near-maximum `50 x 50` window.

Record generation time at every level and any visible UI freeze. The mini-map must remain responsive and must not trigger duplicate window generation.

### WP5 — Closeout

- capture one complete world-to-detail screenshot sequence;
- include the full-workspace shell and mini-map at multiple levels;
- update issue `#10`, this handoff, and the QA record;
- record any intentionally deferred macro decomposition or terrain-quality defects;
- do not begin regional 3D or procedural materials until the 2D slice is accepted.

## Acceptance criteria

The slice is accepted when:

- the full world-to-detail path works on the exact validated `dev` head;
- region and deeper views use canonical tile windows, not enlarged raster crops;
- shared tiles preserve IDs and facts across reopen and overlapping windows;
- seam-crossing windows remain compact and continuous;
- exact parent and context-only behavior is visually and interactively correct;
- the exporter no longer owns an untracked parallel geography classifier;
- a persistent mini-map appears at every opened drilldown level and accurately locates the active window;
- mini-map rendering does not require duplicate fine-window generation;
- the atlas uses the main workspace with normal side panels suppressed when the early spike confirms the change is low effort;
- otherwise, one shared atlas workspace powers the retained modal and the remaining shell migration is explicitly tracked;
- breadcrumbs provide an obvious path back to the main world map;
- no normal page-level vertical scrolling is required at `1920 x 1080`;
- a `50 x 50` window remains interactive;
- `npm audit`, `npm run verify`, and `npm run evaluate:regions` pass or any unrelated failure is recorded precisely;
- required screenshots and QA findings are committed.

## Explicit non-goals

- regional 3D or 2.5D terrain;
- PBR materials or transition atlases;
- politics, cultures, settlements, roads, or resources;
- activating or persisting `world-regions-v2`;
- new saved-world or replay semantics without a separate approved contract change;
- solving issue `#12` through blind threshold adjustment;
- complete Sol Globe presentation work;
- mini-map direct navigation beyond a simple low-risk enhancement.

## Regression constraints

- ordinary world generation remains deterministic and bounded;
- existing Earth, Jupiter, and Mars reference presentations remain unchanged;
- `.wforge` export/import remains authoritative;
- Parchment Worlds embedded World Forge launch and save-back remain functional;
- opening or leaving drilldown must not alter the active body or durable primary body;
- the normal world map context must restore when the atlas session closes.

## First implementation checkpoint

The first checkpoint should end after WP0 and the smallest viable part of WP2:

1. exact-head baseline and tests recorded;
2. current atlas shell path identified;
3. neutral workspace extraction complete;
4. main-workspace effort decision recorded;
5. mini-map data contract and first static rendering proof implemented;
6. no classifier or hierarchy behavior changed without focused tests.

This produces visible UX progress while reducing risk before exporter convergence and full hierarchy QA.
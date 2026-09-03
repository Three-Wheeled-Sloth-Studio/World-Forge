---
type: "Testing Reference"
title: "Geographic Drilldown Workspace and Mini-map QA"
tags:
- world-forge
- testing
---
# Geographic Drilldown Workspace and Mini-map QA

Updated: 2026-08-05

Status: required addendum to `refs/testing/geographic-region-drilldown-qa.md`

Tracking: World Forge issue `#10`

Authoritative handoff: `refs/handoffs/canonical-geographic-drilldown-next-slice.md`

## Scope

This addendum covers two UX requirements added for the resumed canonical tile-window drilldown slice:

1. a persistent mini-map at every opened drilldown level;
2. a preference for using the main World Forge workspace rather than presenting the atlas as a modal, when the shell extraction remains low effort.

All existing deterministic, hierarchy, seam, overlap, rendering, and performance checks remain required.

## Workspace-shell acceptance

### Main-workspace path

When implemented, confirm:

- opening geographic drilldown replaces the ordinary central viewer rather than stacking a large dialog over it;
- ordinary application side panels and unrelated viewer controls are suppressed;
- a compact drilldown-specific inspector remains available without reducing the map to a small panel;
- the title, current level, breadcrumbs, presentation controls, and Back action fit in a compact header;
- a clear breadcrumb or equivalent action returns to the normal world map;
- leaving drilldown restores the prior map presentation, selection, camera/viewport context where currently supported, and active body;
- Escape moves up one hierarchy level before leaving the atlas, following the accepted navigation contract;
- focus moves into the workspace on entry and returns sensibly on exit;
- no duplicate atlas controller or renderer implementation exists solely for main-workspace mode.

### Conditional fallback

If the early spike determines that main-workspace mounting requires a new durable navigation contract, Parchment route migration, or significant duplicated shell logic:

- confirm `GeographicAtlasWorkspace` is still extracted from `GeographicAtlasModal`;
- confirm the retained modal and any future main-workspace mount use the same component and controller;
- record the exact blocker and estimated shell work in issue `#10`;
- do not describe the main-workspace requirement as complete.

## Mini-map acceptance

Check the mini-map at:

- macro area;
- region;
- subregion;
- local;
- detail.

At every level confirm:

- the mini-map is visible without obscuring the main map or primary controls;
- it shows the whole world or the nearest useful ancestor context;
- the active window is outlined accurately;
- exact parent membership is distinguishable from surrounding context;
- the selected immediate child is indicated when applicable;
- Back and breadcrumb navigation update the mini-map immediately;
- reopening the same hierarchy path reproduces the same active-window outline;
- Natural/Terrain presentation changes do not move the mini-map geometry;
- toggling main-map hexes does not change mini-map geographic identity;
- the mini-map does not expose selectable geography outside the current canonical parent as if it were a child;
- labels and outlines remain legible at `1920 x 1080` and `1440 x 900`.

The first accepted mini-map may be read-only. Record whether pointer interaction is present, but do not fail the slice solely because the mini-map cannot recenter the main map.

## Seam behavior

For one longitude-seam hierarchy path confirm:

- the active window outline remains compact rather than spanning almost the entire mini-map;
- wrapping across the left/right map edge is visually understandable;
- the mini-map and main map refer to the same world-relative extent;
- Back, reopen, and breadcrumb navigation preserve the same wrapped outline;
- no false split or duplicated selected child appears at the seam.

## Data and architecture checks

Confirm through code review, focused tests, or development diagnostics that:

- the mini-map consumes existing world overview, hierarchy membership, and canonical extent data;
- it does not create a second geography contract;
- it does not generate a duplicate fine-resolution tile window;
- mini-map screen coordinates do not enter `GeographicTileWindow` persistence or signatures;
- the main atlas and mini-map agree on parent identity, selected child, and active extent;
- cached mini-map results are keyed by project/world and relevant hierarchy identity rather than only display labels.

## Performance checks

At a near-maximum `50 x 50` main window:

- record time to open the level with and without an already cached mini-map overview;
- confirm mini-map updates do not trigger a visible second generation pass;
- confirm breadcrumb navigation remains responsive;
- confirm repeated open/close cycles do not show unbounded canvas, texture, or event-listener growth;
- confirm the primary map remains interactive while the mini-map is visible.

## Regression checks

Confirm:

- ordinary Map view remains unchanged when drilldown is closed;
- point inspection still works outside drilldown;
- active body and durable primary body do not change when entering or leaving drilldown;
- embedded Parchment Worlds launch and save-back still function;
- Earth, Jupiter, and Mars reference presentation paths remain unchanged;
- issue `#12` macro decomposition behavior is neither silently retuned nor represented as fixed.

## Evidence

Add to the existing required screenshot sequence:

- one full main-workspace drilldown screenshot at macro or region level;
- one deeper-level screenshot showing the mini-map and breadcrumbs;
- one seam-crossing mini-map screenshot;
- one `1440 x 900` screenshot proving the map, inspector, and mini-map remain usable;
- if the modal fallback remains, one screenshot and issue note showing the shared workspace inside the modal.

## Findings template

```text
Dev commit:
Visible version:
Browser and viewport:
Hierarchy path:

Workspace mode:
- Main workspace or modal fallback:
- Normal side panels suppressed:
- Drilldown inspector usable:
- Breadcrumb back to world map:
- Prior map context restored:
- Escape/focus behavior:

Mini-map:
- Visible at every level:
- Context source:
- Current window accurate:
- Parent/context distinction:
- Selected child accurate:
- Seam behavior:
- Stable after reopen:
- Duplicate generation observed:
- Interaction mode:

Performance:
- Main window dimensions:
- First mini-map render:
- Cached mini-map update:
- UI freeze or duplicate work:

Regressions:
- Normal map:
- Active body:
- Parchment embedding:
- Reference body displays:

Defects and screenshots:
```

## Acceptance

This addendum passes when:

- the mini-map passes every required hierarchy and seam check;
- it uses existing geographic identity and extent data without duplicate fine generation;
- the main-workspace presentation passes when the early spike confirms low implementation cost;
- otherwise the shared workspace extraction is complete and the exact remaining shell blocker is recorded;
- required screenshots and findings are committed alongside the main drilldown QA evidence.
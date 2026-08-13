# Current Handoff

Updated: 2026-08-13

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Tracking issue: `#10`

## Current checkpoint

World Forge has resumed the geographic atlas only for a narrow presentation pass. This is an explicit exception to the broader atlas pause recorded in `refs/handoffs/archive/geographic-atlas-v0.3.71-paused.md`; it is not a restart of open-ended 2.5D renderer experimentation.

The checkpoint starts from infrastructure baseline `4bfc5de454428ab25857b63082ed3a42ca341e4a` and contains two presentation changes over the existing canonical tile-window geography:

1. Natural/terrain land-water readability hardening.
2. A first 2D TTRPG/cartographic presentation.

## Land and water readability

Presentation palette ownership is now centralized in `apps/desktop/src/regions/geographicAtlasPalette.ts` for the shared Natural base colors used by both the 2D tile renderer and stepped 3D Natural presentation.

The presentation now:

- uses warmer, more clearly terrestrial lowland colors;
- keeps open water and coastal/lake water in clearly separate blue families;
- recognizes explicit canonical wetland facts (`wet`, bog, marsh, mangrove, or wetland river terminus) as a distinct land color when `tile.water` is false;
- adds an explicit coastline stroke derived only from canonical tile water identity and tile adjacency;
- slightly warms low terrain in the analytical Terrain presentation;
- does not add a second geography classifier or modify canonical tile facts.

## TTRPG presentation

The existing 2D canonical tile renderer now supports a `ttrpg` presentation. The atlas toolbar exposes it as **TTRPG** alongside Natural and Terrain.

The first product surface includes:

- parchment-like canvas and restrained warm land fills;
- muted water fills with dark inked coastlines;
- a secondary water-side coastline hachure for a hand-drawn/cartographic cue;
- subdued rivers, ridges, child boundaries, and hex lines;
- darker ink parent boundaries and selection treatment;
- presentation-aware serif labels with a paper-colored halo;
- the existing hex toggle, picking, hierarchy navigation, and canonical tile-window generation unchanged.

The TTRPG view is intentionally 2D only. The 3D path continues to expose Natural and Elevation, while Natural 3D now consumes the same base palette helper as Natural 2D.

## Architecture and contract status

Unchanged:

- `geographic-tile-window-v1` and classifier contracts;
- geographic hierarchy generation and partitioning;
- world-relative tile IDs and signatures;
- saved-world behavior;
- `.wforge` and `.pworld` contracts;
- exporter/runtime classification ownership;
- geographic scene generation and 3D geometry.

This checkpoint changes presentation only. `npm run evaluate:regions` is therefore not required unless a later repair changes generation behavior.

## Validation and QA

Read `refs/testing/geographic-atlas-presentation-qa.md` for the focused visual contract.

The relevant automated checkpoint commands are defined by `refs/testing/validationCommands.yaml`. Because this is a meaningful build-facing presentation milestone, exact-head acceptance requires at least the focused palette/presentation tests plus `npm run validate` and `npm run verify`, or authoritative CI evidence that exercises the same or stronger test, typecheck, and build surfaces.

Exact-head GitHub Actions evidence should be recorded on issue `#10`; do not infer a pass from this handoff alone.

## Deliberately deferred

Do not turn this narrow pass into another renderer spiral. Deferred items include:

- broad 2.5D redesign or terrain geometry changes;
- TTRPG-specific 3D rendering;
- generated place names and collision-aware label placement;
- settlement, road, political, forest, or illustrated mountain symbol libraries;
- bespoke paper textures or external art packs;
- print/export layout;
- saved presentation state unless product need justifies a contract change.

If visual QA finds shortcomings, prefer one or two targeted style corrections in the existing presentation seam. Follow the repair-loop breaker in `AGENTS.md` rather than restarting renderer experimentation.

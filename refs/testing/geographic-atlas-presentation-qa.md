# Geographic Atlas Presentation QA

Updated: 2026-08-15

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Tracking: World Forge issue `#10`

## Scope

This note covers the bounded 2D atlas presentation pass:

1. keep land, coast, wetland, lake, and open water immediately distinguishable;
2. provide a useful hand-drawn/TTRPG cartographic presentation over canonical geographic tile-window facts;
3. enrich TTRPG presentation with restrained terrain symbols without creating a parallel geography model.

It does not reopen broad 2.5D work, change geographic generation, change hierarchy partitioning, or alter saved-world, `.wforge`, or `.pworld` contracts.

## Accepted baseline

User screenshot review on 2026-08-15 accepted the TTRPG mode's subtle parchment/terrain colors and strong coastline treatment. The same review found that Hexes on/off was visually too similar, numeric hierarchy labels looked diagnostic, and the map needed hand-drawn terrain marks.

## Phase 1 symbol contract

The stippled symbol pack supplied by the project owner is stored as one optimized transparent sprite behind semantic icon IDs. Placement must remain deterministic and presentation-only.

Symbols may be shown only when supported by canonical tile facts:

- mountainous -> mountain-family artwork;
- rough -> hills;
- explicit forest/taiga -> pine forest;
- explicit rainforest -> rainforest;
- explicit wetland facts -> swamp;
- explicit volcano -> volcano.

Reef artwork is reserved but not placed in Phase 1 because `GeographicTileWindow` currently exposes no reef fact. Generic aquatic/coastal water must not be promoted into a fictional reef. Settlement and compass artwork is reserved for later map-dressing work.

## Automated coverage

Focused tests should cover:

- semantic sprite entries are stable;
- symbol selection is deterministic from canonical tile facts;
- ordinary flat land and generic water do not acquire unsupported symbols;
- generated numeric hierarchy labels are suppressed only in TTRPG mode;
- Natural/Terrain behavior and existing tile-window interaction remain green;
- existing palette, river, hierarchy, and selection tests remain green.

This is a build-facing presentation milestone, so run the repository validation contract. `npm run evaluate:regions` is not required unless generation or partitioning behavior changes.

## TTRPG visual checks

Use at least one coastal macro/region and one interior region/local view. Test Hexes both off and on.

Confirm:

- parchment and terrain colors remain restrained;
- open/coastal/lake water remains immediately distinguishable from land;
- the inked coastline remains the strongest natural edge;
- terrain symbols add a hand-drawn map language without becoming a dense sticker field;
- mountain symbols follow mountain/ridge structure rather than appearing on ordinary plains;
- forests, rainforest, wetlands, and volcanoes appear only where canonical facts support them;
- rivers and ridge accents remain visible over terrain symbols;
- parent and child boundaries remain legible above symbols;
- generated numeric child labels are gone in TTRPG mode;
- meaningful names, when available, retain the serif cartographic label treatment;
- Hexes-on is clearly visible and useful for tabletop play;
- Hexes-off reads as a cleaner player-facing map;
- switching Natural/Terrain/TTRPG does not change IDs, hierarchy membership, picking, or navigation.

## Deliberately deferred

- reef symbols until a canonical reef fact exists;
- castle, tower, village, and compass-rose placement;
- generated place names and collision-aware label solving;
- roads, politics, resources, and settlements as world facts;
- TTRPG-specific 3D presentation;
- broad 2.5D/PBR renderer iteration;
- print/export layout.

## Acceptance evidence

Record exact-head automated validation on issue `#10`. Manual visual QA should record the seed, hierarchy path, viewport, presentation, Hexes state, and screenshots. Do not convert missing browser evidence into a visual pass.

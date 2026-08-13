# Geographic Atlas Presentation QA

Updated: 2026-08-13

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Tracking: World Forge issue `#10`

## Scope

This note covers the narrow presentation pass that intentionally overrides the prior atlas pause for two concrete goals:

1. make land, coast, wetland, lake, and open water immediately distinguishable;
2. provide a first useful 2D TTRPG/cartographic presentation over canonical geographic tile-window facts.

It does not reopen the broad 2.5D spike, change geographic generation, change hierarchy partitioning, or alter saved-world, `.wforge`, or `.pworld` contracts.

## Automated coverage

Focused tests should cover:

- Natural palette separation between ordinary lowland land, coastal water, and open water;
- explicit wetland facts remaining land-colored when `tile.water` is false;
- TTRPG palette selection without changing canonical tile classification;
- TTRPG presentation resolution through the existing canonical tile renderer at every drilldown level;
- existing geographic tile-window, interaction, river, hierarchy, and 3D scene tests remaining green.

Before accepting the checkpoint, run the repository validation contract in `refs/testing/validationCommands.yaml`. This is a build-facing functional milestone, so `npm run validate` and `npm run verify` are relevant. `npm run evaluate:regions` is not required unless the implementation changes geographic generation or partitioning behavior.

## Natural presentation visual checks

At one coastal macro area and at least one region/local drilldown, confirm:

- open water reads unmistakably blue;
- coastal water and lakes remain visibly water but are distinguishable from deep/open water;
- grassland, plains, tundra, desert, tropical terrain, and fallback land tones read as land rather than muted water;
- wet or marshy land remains visibly land when the canonical tile says `water: false`;
- coastlines have an explicit readable edge rather than relying only on adjacent fill colors;
- rivers still read as water features without causing ordinary wetland tiles to look submerged;
- Natural 2D and Natural 3D use the same base land/water palette decision;
- hierarchy boundaries, selection, labels, and hex toggling do not move when the presentation changes.

## TTRPG presentation visual checks

Switch the 2D atlas to **TTRPG** and confirm:

- the map has a deliberate parchment/cartographic surface rather than the dark simulation/debug surface;
- land uses restrained warm fills;
- water uses muted cool fills with clear inked coastlines;
- a secondary water-side coast hachure is visible without becoming dense texture noise;
- ridges and rivers remain legible but visually subordinate to the coastline and parent boundary;
- child/internal boundaries are restrained and do not overwhelm terrain;
- labels use a dark serif cartographic treatment with a light paper-colored halo;
- selected children remain visible without neon/debug-like highlighting;
- hexes can still be toggled on for tabletop use and off for a cleaner player-facing map;
- switching among Natural, Terrain, and TTRPG does not change tile IDs, hierarchy membership, picking, or navigation.

## Deliberately deferred

This first TTRPG view does not attempt:

- generated place names or label collision solving;
- illustrated mountain, forest, settlement, road, or political symbol sets;
- bespoke paper textures or external art assets;
- print/export layout;
- a TTRPG-specific 3D mode;
- a new geography or terrain classifier.

Those should be added only when they can consume the same canonical geographic facts and remain presentation-only.

## Acceptance evidence

Record exact-head automated validation on issue `#10`. Manual visual QA should record the seed, hierarchy path, browser/window size, presentation, and any screenshot paths. Do not convert missing browser evidence into a visual pass.

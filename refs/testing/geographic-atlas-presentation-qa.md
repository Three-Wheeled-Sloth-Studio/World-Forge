# Geographic Atlas Presentation QA

Updated: 2026-08-15

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Tracking: World Forge issue `#10`

## Scope

This QA note covers the hand-drawn/TTRPG presentation at two scales:

1. bounded geographic drilldown using canonical `GeographicTileWindow` facts;
2. ordinary full-world Map -> Biomes presentation.

It does not authorize geography, hierarchy, saved-world, `.wforge`, or `.pworld` contract changes.

## Accepted visual direction

The user accepted the restrained TTRPG palette and coastline treatment on 2026-08-15.

The first token checkpoint failed visual acceptance because symbols were not visible and generated numeric labels remained. Later corrective work bundled the token sprite through Vite, broadened macro-scale relief selection using canonical elevation/slope/ridge facts, and moved TTRPG to the top-level Presentation selector.

## Current full-world regression

Visual QA on visible version `0.3.72` shows:

- Natural view renders generated land correctly;
- TTRPG view paints some of the same dry land with the muted water/teal color family;
- corresponding screenshot pixels confirm a real presentation mismatch rather than a subjective color preference.

### Acceptance rule

For full-world TTRPG rendering, canonical water state is authoritative at the last presentation seam:

- `water === true` may use ocean/shelf/deep-water colors;
- `water === false` must never use an ocean biome color;
- a stale `ocean` biome on dry land must fall back to a terrestrial presentation color without mutating source world data;
- point inspection must resolve through the same TTRPG presentation normalization as the canvas.

Focused automated coverage must explicitly verify:

- `ocean + dry land -> terrestrial presentation`;
- `land biome + water -> ocean presentation`;
- ordinary dry land remains its own biome;
- TTRPG land colors remain distinct from the water color family;
- Natural/Data renderer tests remain green.

Visible corrected build should report `v0.3.73` so browser QA can distinguish it from the rejected `v0.3.72` checkpoint.

## Bounded TTRPG symbol contract

Terrain-symbol selection remains presentation-only. It may use:

- canonical morphology;
- canonical ridge edges;
- canonical elevation;
- canonical slope;
- canonical forest/taiga/rainforest details;
- canonical wetland facts;
- canonical volcano detail.

At coarse macro scale, relative elevation/slope ranking within the visible canonical tile window may choose which already-real relief receives illustration symbols. Collision handling and a bounded per-window symbol cap control density.

Reef artwork remains reserved because the canonical tile contract does not expose a reef fact. Castle, tower, village, and compass artwork remain reserved for later world-fact/map-dressing work.

## Manual visual matrix

Full-world Map -> Biomes -> TTRPG:

- no dry land uses ocean/teal fill;
- muted parchment land palette remains readable;
- water remains clearly distinct;
- outlined coastline stays legible;
- canonical rivers remain visible;
- switching Natural -> TTRPG -> Natural does not alter world facts.

Bounded Atlas -> TTRPG, Hexes off:

- terrain illustrations appear where canonical relief/vegetation facts support them;
- symbols do not cover coastlines or major rivers;
- generated numeric hierarchy labels are absent;
- coastline remains dominant.

Bounded Atlas -> TTRPG, Hexes on:

- symbol placement remains stable;
- grid is clearly visible but subordinate to coast and illustrations.

## Validation

This is build-facing presentation work. Exact-head unit/integration tests, type-check/build, production harnesses, and production smokes are required.

`npm run evaluate:regions` is not required unless generation or geographic partitioning changes.

Manual visual acceptance remains mandatory.

## Deferred

- reef placement until a canonical reef fact exists;
- world-scale terrain-token density until bounded symbols are accepted;
- castle, tower, village, and compass placement;
- generated names and collision-aware label solving;
- politics, roads, resources, settlement simulation;
- TTRPG 3D;
- broad 2.5D/PBR work;
- print/export layout.

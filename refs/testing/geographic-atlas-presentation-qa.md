# Geographic Atlas Presentation QA

Updated: 2026-08-15

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Tracking: World Forge issue `#10`

## Scope

This QA note covers the hand-drawn/TTRPG presentation at two scales plus the shared full-world surface-presentation seam:

1. bounded geographic drilldown using canonical `GeographicTileWindow` facts;
2. ordinary full-world Map -> Biomes presentation;
3. ordinary full-world Globe -> Biomes presentation.

It does not authorize geography, hierarchy, saved-world, `.wforge`, or `.pworld` contract changes.

## Repair-loop reassessment

Repeated visual passes demonstrated that Data and TTRPG were not consuming one stable presentation snapshot. Natural remained readable while Data could show cyan land and TTRPG could collapse land and water into a similar slate family.

The presentation seam is now the acceptance target, not another palette-only patch.

## Surface-presentation isolation contract

For every biome render:

- canonical `water` is authoritative;
- the renderer receives presentation-owned `ice` and `biomes` arrays;
- presentation arrays must not alias mutable generated-world arrays;
- dry land must not inherit a stale `ocean` label;
- non-permanent land must not retain stale `ice_cap` display state;
- later source-project updates must not mutate an already-rendered presentation snapshot;
- a later render must recompute from current source facts rather than reuse a stale presentation object.

Focused automated coverage must verify the layer detachment and recomputation behavior.

## Full-world Data acceptance

Map -> Biomes -> Data:

- dry land is visually terrestrial, never broad cyan/ice-like fill caused by stale presentation state;
- actual permanent ice remains pale;
- canonical water remains blue;
- switching away and back after enrichment does not change land/water identity incorrectly.

## Full-world TTRPG acceptance

TTRPG should read as an old hand-drawn parchment map:

- warm parchment land family;
- cool, darker blue-gray water wash;
- dark ink coastline;
- muted river ink;
- subtle biome differences within land;
- land/water separation obvious at a glance before inspecting biome color.

Automated palette coverage should enforce a substantial color-distance floor between every TTRPG land color and every TTRPG water color after surface-theme protection.

Map -> Biomes -> TTRPG:

- no dry land uses water-family fill;
- water and land are immediately distinguishable;
- coastline remains dominant and legible;
- rivers remain restrained;
- switching Natural -> TTRPG -> Data does not mutate world facts.

Globe -> Biomes -> TTRPG:

- TTRPG is selectable in the same Presentation control;
- the globe uses the TTRPG surface texture rather than silently reverting to Natural;
- land/water distinction remains obvious on the sphere.

## Natural reference

Natural is currently the readability reference, not the final visual target. It may remain somewhat pixelated at preview scale, but this repair must not regress its existing land/water readability.

Pixel-smoothing or higher-quality resampling is a separate presentation increment after Data/TTRPG correctness is accepted.

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

Resume bounded symbol QA only after the full-world surface-presentation checkpoint is visually accepted.

## Validation

This is build-facing presentation work. Exact-head unit/integration tests, type-check/build, production harnesses, and production smokes are required.

`npm run evaluate:regions` is not required unless generation or geographic partitioning changes.

Manual visual acceptance remains mandatory.

## Version marker

Use `v0.3.75` for this architecture-reset QA pass. The repository prior checkpoint reports `0.3.73`, while owner browser QA reported `0.3.74`; skipping to `0.3.75` avoids an ambiguous visual checkpoint.

## Deferred

- Natural-view resampling/pixel-smoothing;
- reef placement until a canonical reef fact exists;
- world-scale terrain-token density until bounded symbols are accepted;
- castle, tower, village, and compass placement;
- generated names and collision-aware label solving;
- politics, roads, resources, settlement simulation;
- TTRPG-specific globe shell/atmosphere styling unless globe QA shows it is needed;
- broad 2.5D/PBR work;
- print/export layout.

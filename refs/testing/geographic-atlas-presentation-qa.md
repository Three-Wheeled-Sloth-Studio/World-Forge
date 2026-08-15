# Geographic Atlas Presentation QA

Updated: 2026-08-15

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Tracking: World Forge issue `#10`

## Scope

This QA note covers the hand-drawn/TTRPG presentation at two scales plus the shared full-world surface-resolution seam:

1. bounded geographic drilldown using canonical `GeographicTileWindow` facts;
2. ordinary full-world Map -> Biomes presentation;
3. ordinary full-world Globe -> Biomes presentation;
4. production body-aware resolution of the primary world surface.

It does not authorize geography, hierarchy, sea-level, saved-world schema, `.wforge`, or `.pworld` contract changes.

## Rejected checkpoint: v0.3.75

Owner visual QA rejected `v0.3.75` even though the exact-head automated gate was green.

Observed:

- Data still showed broad cyan/ice-like continent-shaped areas;
- TTRPG still showed broad continent-shaped areas in the water color family;
- the old-map reference made the intended invariant explicit: land is the parchment substrate, water is a separate field, coastline separates them, and terrain marks decorate land.

Do not treat the `v0.3.75` palette/isolation tests as visual acceptance.

## Production primary-surface contract

The production renderer is body-aware and resolves the active body before calling the renderer. A materialized body catalog may retain an older primary `surface` object after `project.primaryWorld` has been replaced by later project updates.

For an ordinary/root project:

- `project.primaryWorld` is authoritative for the primary body;
- a body-catalog read must expose the current primary surface rather than an older duplicate;
- Data, Natural, and TTRPG must therefore receive the same current primary world before presentation-specific styling;
- explicit primary writes through `withWorldBodySurface()` must keep the root project synchronized.

For an intentional secondary-body projection:

- `projectForWorldBody()` may temporarily expose the selected secondary surface through `primaryWorld`;
- the durable real primary must remain recoverable from the primary body record;
- switching back to the primary must not mistake the projected secondary for the real primary;
- secondary-body surface ownership and package roundtrips must remain unchanged.

Focused automated coverage must verify both root and projected cases.

## Full-world Data acceptance

Map -> Biomes -> Data:

- continent-shaped dry land is visually terrestrial, not broad cyan/ice-like fill;
- actual permanent ice remains pale;
- actual water remains blue;
- switching bodies or presentations does not replace the current primary with an older catalog snapshot.

## Full-world TTRPG acceptance

TTRPG should read as an old hand-drawn parchment map:

- land is visibly the warm parchment/paper substrate;
- water is a clearly separate cooler/darker wash;
- dark ink coastline remains legible at world scale;
- rivers are restrained;
- subtle biome variation stays inside the land family;
- terrain symbols decorate land rather than defining the only warm-colored areas.

Map -> Biomes -> TTRPG:

- no dry land uses water-family fill;
- water and land are immediately distinguishable at a glance;
- the broad landmasses read as land before individual terrain or biome patches;
- switching Natural -> TTRPG -> Data does not mutate world facts.

Globe -> Biomes -> TTRPG:

- TTRPG remains selectable in the shared Presentation control;
- the globe uses the TTRPG surface texture rather than silently reverting to Natural;
- land/water distinction remains obvious on the sphere.

## Natural reference

Natural remains the current readability reference, not the final visual target. Its shallow-water and sediment treatment can camouflage incorrect source-surface selection, so Natural alone is not evidence that Data/TTRPG are receiving the correct surface.

Pixel-smoothing or higher-quality resampling remains a separate increment after Data/TTRPG correctness is accepted.

## Bounded TTRPG symbol contract

Terrain-symbol QA remains paused until the full-world surface identity issue is accepted.

Existing symbol rules remain:

- canonical morphology;
- canonical ridge edges;
- canonical elevation;
- canonical slope;
- canonical forest/taiga/rainforest details;
- canonical wetland facts;
- canonical volcano detail;
- deterministic sparse placement with collision limiting.

Reef artwork remains reserved because the canonical tile contract does not expose a reef fact. Castle, tower, village, and compass artwork remain reserved for later world-fact/map-dressing work.

## Validation

This is build-facing shared surface-resolution work. Required:

- shared world-body source-of-truth regression tests;
- production body-aware renderer regression test;
- existing renderer/TTRPG tests;
- existing multi-body exporter/package tests;
- exact-head unit/integration suite;
- type-check and production build;
- production harnesses and smokes.

`npm run evaluate:regions` is not required because generation and geographic partitioning must remain unchanged.

Manual visual acceptance remains mandatory.

## Version marker

Use `v0.3.76` for the primary-surface source-of-truth repair. `v0.3.75` is explicitly rejected by owner screenshot QA.

## Deferred

- Natural-view resampling/pixel-smoothing;
- any sea-level/shelf-generation change without new evidence;
- reef placement until a canonical reef fact exists;
- world-scale terrain-token density until bounded symbols are accepted;
- castle, tower, village, and compass placement;
- generated names and collision-aware label solving;
- politics, roads, resources, settlement simulation;
- TTRPG-specific globe shell/atmosphere styling unless globe QA shows it is needed;
- broad 2.5D/PBR work;
- print/export layout.

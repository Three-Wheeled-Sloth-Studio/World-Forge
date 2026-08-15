# Geographic Atlas Presentation QA

Updated: 2026-08-15

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Tracking: World Forge issue `#10`

## Scope

This QA note covers full-world Data/TTRPG readability, authoritative river presentation, TTRPG inland-water/terminus readability, and deterministic world-scale TTRPG terrain symbols.

It does not authorize generation, geography, hierarchy, saved-world, `.wforge`, or `.pworld` contract changes.

## Accepted v0.3.77 baseline

Owner visual QA accepted the scalar-river repair:

- Data -> Biomes looks correct;
- TTRPG is materially improved;
- broad cyan/slate continent washes are gone;
- high runoff/river density remains in underlying hydrology data without becoming area paint.

The accepted contract remains:

- `primaryWorld.layers.river` is scalar hydrology support;
- only explicit `primaryWorld.rivers` paths create ordinary visible river geometry.

## v0.3.78 cartographic refinement

### World-scale terrain symbols

TTRPG full-world presentation must add bounded deterministic symbols derived from canonical surface facts.

Current allowed symbol families:

- mountains;
- hills;
- forest;
- rainforest;
- swamp/wetland;
- compass rose as non-semantic map furniture.

Acceptance:

- symbols are visible at normal fit-to-window scale;
- density is enough to communicate terrain without obscuring the substrate;
- mountain and vegetation symbols appear in corresponding terrain regions;
- no symbols are placed on canonical ocean, lake, or ice sample cells;
- major authoritative river paths remain readable through/around the symbol field;
- placement is deterministic for the same project and target resolution.

Do not infer reefs, castles, towers, villages, roads, politics, or settlements without canonical facts.

### Inland river destinations

The hydrology model already distinguishes `ocean`, `lake`, `wetland`, and `basin` termini and maintains `layers.lakes` separately from the marine `layers.water` mask.

TTRPG acceptance:

- explicit canonical lake cells read as cool water even when `layers.water === 0`;
- changing their presentation does not mutate the source project or marine water mask;
- a river with a lake terminus visually reaches a lake rather than apparently stopping in ordinary land;
- wetland termini receive a restrained wetland/reed endpoint cue;
- basin termini receive a restrained closed-basin cue;
- ordinary ocean termini need no extra marker;
- Data remains unchanged by TTRPG-specific lake/terminus styling.

If an inspected river's recorded terminus is itself inconsistent with its authoritative path, treat that as new hydrology evidence and investigate separately. Do not infer a generation defect from presentation alone.

## Focused automated regressions

Required renderer tests:

- scalar-only river fields cannot create visible Data geometry;
- scalar-only river fields cannot create extra TTRPG river geometry;
- explicit authoritative river paths remain visible;
- non-ocean terminus metadata remains available to presentation;
- world-scale symbol placement is deterministic and bounded;
- symbol sample cells exclude ocean, ice, and canonical lakes;
- TTRPG canonical-lake presentation survives the shared surface-repair pass;
- TTRPG lake presentation leaves the source biome and canonical marine water mask unchanged.

Existing geographic tile-window river/symbol tests must remain green.

## Data control view

Map -> Biomes -> Data, Rivers ON:

- terrestrial cells retain the accepted terrestrial biome colors;
- ocean and shelves remain blue;
- visible rivers are narrow authoritative paths;
- turning Rivers OFF removes paths without changing continent fill.

## TTRPG visual matrix

Check at fit-to-window and one zoomed view:

- warm parchment/tan land substrate;
- cooler/darker marine water;
- explicit inland lakes visibly water-like;
- dark legible coastlines;
- mountain/hill symbols;
- forest/rainforest symbols;
- wetland symbols;
- readable authoritative river paths;
- intentional-looking lake/wetland/basin destinations;
- compass furniture restrained enough not to compete with geography.

Use at least one continent with visible inland drainage and mixed relief/vegetation.

## Generation-quality follow-up QA

The requested default-quality recenter is separate from this renderer change.

When implemented:

- semantic Default should be 1024 x 512;
- 512 x 256 remains available as a lower/faster option;
- higher resolutions remain available;
- topology resolution continues to follow the normal quality-selection contract;
- changing the default must not change saved-world/replay semantics for an already generated project.

## Validation

This is build-facing presentation work. Exact-head unit/integration tests, type-check/build, production harnesses, and production smokes are required.

`npm run evaluate:regions` is not required because generation and geographic partitioning are unchanged.

Manual screenshot acceptance remains mandatory.

## Deferred

- reef placement until a canonical reef fact exists;
- settlement/castle/tower/village symbols until corresponding world facts exist;
- generated names and label collision solving;
- politics, roads, resources, and settlement simulation;
- broad 2.5D/PBR work;
- print/export layout beyond reuse of the ordinary TTRPG renderer.

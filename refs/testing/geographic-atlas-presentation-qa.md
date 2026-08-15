# Geographic Atlas Presentation QA

Updated: 2026-08-15

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Tracking: World Forge issue `#10`

## Scope

This QA note covers the full-world Data/TTRPG readability defect, the canonical river presentation seam, and the existing bounded geographic TTRPG view.

It does not authorize generation, geography, hierarchy, saved-world, `.wforge`, or `.pworld` contract changes.

## Owner rejection evidence

Visible builds `0.3.75` and `0.3.76` were rejected by owner screenshots:

- Data -> Biomes retained broad pale-cyan continent-shaped land;
- TTRPG -> Biomes retained broad blue-gray/slate continent-shaped land;
- TTRPG did not read as parchment despite the configured parchment palette;
- point inspection was not obvious while the right context panel remained collapsed.

The repeated palette/source-of-truth repairs did not materially change those pixels, so another color-only repair is prohibited without new evidence.

## Confirmed presentation defect

Full-world presentation previously rendered rivers twice:

1. a scalar river-field pass from `primaryWorld.layers.river` using a low signal threshold;
2. explicit authoritative paths from `primaryWorld.rivers`.

The scalar pass used high-opacity channel paint and could cover large fractions of terrestrial drainage basins. Screenshot color reconstruction showed that the Data and TTRPG paint stacks closely reproduce the observed cyan and slate land colors.

The authoritative river-path contract already exists elsewhere in the product: a sampled scalar river field must not be expanded into a tile-wide visible network.

## v0.3.77 river presentation contract

For ordinary world presentation:

- only explicit `primaryWorld.rivers` paths may create visible river strokes;
- `primaryWorld.layers.river` remains scalar hydrology data and must not create visible geometry by itself;
- Data, Natural, and TTRPG all use the same river geometry source;
- changing presentation changes styling only, not river ownership;
- turning visible rivers off removes explicit river strokes without changing biome/water/terrain fill;
- enabling visible rivers on a scalar-only fixture must not change the rendered pixels.

## Automated regression requirements

The focused renderer fixture must include an intentionally pathological scalar-only world:

- `world.rivers = []`;
- map scalar river field filled with `1`;
- topology scalar river field filled with `1`.

Required assertions:

- Data with Rivers ON produces zero river strokes and matches Data with Rivers OFF;
- TTRPG with Rivers ON produces zero river strokes and matches TTRPG with Rivers OFF;
- a deterministic generated world containing an explicit river path still emits visible river strokes.

Existing geographic river tests must remain green, especially the contract that scalar river support does not become a tile-wide network.

## Data visual acceptance

Map -> Biomes -> Data, with Rivers ON:

- terrestrial cells expose terrestrial biome colors rather than a pale-cyan wash;
- ocean, shelf, and lake water remain visibly water;
- permanent ice remains pale only where canonical/presentation ice is present;
- visible rivers are narrow path features rather than area fills;
- toggling Rivers OFF should remove river lines, not reveal an entirely different continent color underneath.

## TTRPG visual acceptance

Map -> Biomes -> TTRPG, with Rivers ON:

- warm parchment/tan land is the dominant terrestrial substrate;
- cooler, darker water remains a separate surrounding field;
- dark coastline is clearly legible;
- muted river ink is sparse and path-like;
- broad land areas never collapse into the river-ink blue-gray family;
- land/water separation is obvious before inspecting individual biome differences.

Globe -> Biomes -> TTRPG should inherit the same surface texture contract after Map acceptance.

## Point inspector acceptance

The point inspector is part of this QA loop because visual classification disputes need direct facts.

- activate the point-inspection/search control;
- click a map point without dragging;
- a marker must appear;
- a newly created inspection must auto-expand a collapsed right context panel;
- the inspector must show the existing biome, topology biome, water/lake/ice state, sea deltas, scalar river value, and rendered color fields;
- copyable JSON remains available for exact follow-up evidence.

## Natural reference

Natural remains a readability reference. This repair may remove diffuse scalar-river tint from Natural, but must not otherwise alter its geography, water mask, biome classification, or canonical river paths.

## Bounded TTRPG symbol contract

Terrain-symbol selection remains presentation-only. It may use canonical morphology, ridge edges, elevation, slope, forest/rainforest details, wetland facts, and volcano detail.

Reef artwork remains reserved until a canonical reef fact exists. Castle, tower, village, and compass artwork remain reserved for later map-dressing/world-fact work.

Resume bounded symbol QA only after the full-world Data/TTRPG substrate is visually accepted.

## Validation

This is build-facing presentation work. Exact-head unit/integration tests, type-check/build, production harnesses, and production smokes are required.

`npm run evaluate:regions` is not required because generation and geographic partitioning are unchanged.

Manual screenshot acceptance remains mandatory.

## Deferred

- Natural-view resampling/pixel-smoothing;
- reef placement until a canonical reef fact exists;
- world-scale terrain-token density until bounded symbols are accepted;
- castle, tower, village, compass, generated names, and label collision solving;
- politics, roads, resources, and settlement simulation;
- TTRPG-specific globe shell/atmosphere styling unless globe QA shows it is needed;
- broad 2.5D/PBR work;
- print/export layout.

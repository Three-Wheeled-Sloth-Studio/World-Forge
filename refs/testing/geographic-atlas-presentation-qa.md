# Geographic Atlas Presentation QA

Updated: 2026-08-15

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Tracking: World Forge issue `#10`

## Scope

This QA note covers the hand-drawn/TTRPG presentation at two scales:

1. bounded geographic drilldown using canonical `GeographicTileWindow` facts;
2. the ordinary full-world map using a presentation theme over canonical world layers.

It does not authorize geography, hierarchy, saved-world, `.wforge`, or `.pworld` contract changes.

## Accepted baseline and rejected checkpoints

The user accepted the restrained TTRPG palette and coastline treatment on 2026-08-15.

The first terrain-token checkpoint `c1dcccde5834e549a1166b6aeb4aab25f689425a` failed visual acceptance despite green CI:

- no illustration symbols appeared in the supplied coastal macro-area screenshots;
- generated numeric hierarchy labels remained visible.

A later full-world renderer checkpoint also failed UI acceptance because the ordinary Explore toolbar still exposed only `Data` and `Natural`; the hand-drawn renderer existed but was hidden behind a Layers display toggle and toolbar state was masking `ttrpg` back to `natural`. The screenshot also showed the visible badge still at `v0.3.71`.

## Full-world TTRPG selector contract

For visible build `0.3.72`, the normal Explore toolbar is the authoritative presentation control.

In Map + Biomes:

- the Presentation selector must visibly contain `Data`, `Natural`, and `TTRPG`;
- selecting `TTRPG` must immediately switch the full-world map to the parchment theme;
- `TTRPG` must not be hidden in Layers as a separate toggle;
- switching away from Map + Biomes must return unsupported TTRPG state to Natural;
- the header badge must read `v0.3.72`, making stale/local builds obvious.

Initial full-world visual acceptance requires:

- muted parchment land palette;
- muted water distinct from land;
- dark outlined coastline;
- canonical rivers retained;
- no world-scale illustration-token placement yet.

Natural/Data views must remain available and unchanged when TTRPG is off.

## Corrective symbol contract

The owner-supplied stippled sprite must be bundled by the frontend build rather than referenced only through a runtime public path.

Terrain-symbol selection remains presentation-only. It may use:

- canonical morphology;
- canonical ridge edges;
- canonical elevation;
- canonical slope;
- canonical forest/taiga/rainforest details;
- canonical wetland facts;
- canonical volcano detail.

At coarse macro scale, relative elevation/slope ranking within the visible canonical tile window may choose which already-real relief receives illustration symbols. This is presentation ranking, not terrain reclassification.

Collision handling and a bounded per-window symbol cap should control density. Do not randomly discard most valid relief candidates before collision handling.

Reef artwork remains reserved because the canonical tile contract does not expose a reef fact. Castle, tower, village, and compass artwork remain reserved for later world-fact/map-dressing work.

## Numeric labels

TTRPG should not display generated diagnostic-looking labels such as `Region 138`, `Local 4`, or their stripped numeric forms. The final TTRPG redraw must occur after the base controller's paint so those labels are actually removed.

Meaningful future names remain eligible for the serif cartographic treatment.

## Automated coverage

Focused tests should verify:

- the ordinary world presentation option list is exactly `Data`, `Natural`, `TTRPG`;
- TTRPG is restricted to Map + Biomes;
- the bundled sprite URL resolves through the module graph;
- semantic sprite coordinates remain stable;
- explicit mountainous facts still select mountain-family artwork deterministically;
- macro-scale high-relief canonical samples can select mountain/hill artwork even when center morphology is `flat`;
- genuinely flat low-relief windows do not invent relief symbols;
- explicit forest, rainforest, wetland, and volcano facts select their expected symbols;
- generic coastal/aquatic water does not invent reefs;
- generated numeric hierarchy labels are rejected;
- the full-world TTRPG theme keeps land/water distinct with dark coast and muted river colors;
- existing Natural/Terrain, tile-window, hierarchy, and interaction tests stay green.

This is build-facing. Exact-head type-check/build, production harnesses, and production smokes are required. `npm run evaluate:regions` is not required unless generation or partitioning changes.

## Manual visual matrix

Top-level world map:

- header shows `v0.3.72`;
- Explore -> Map -> Biomes -> Presentation visibly offers `TTRPG`;
- choosing TTRPG produces the parchment world map without opening Layers;
- switching back to Natural/Data restores the existing presentation.

Use the same coastal macro-area sample that exposed the failed symbol checkpoint.

Bounded TTRPG, Hexes off:

- at least some terrain illustrations are visible where relief/vegetation facts support them;
- symbols do not cover coastlines or major rivers;
- numeric child labels are gone;
- coastline remains dominant;
- map remains readable rather than becoming an icon field.

Bounded TTRPG, Hexes on:

- the same symbol placement remains stable;
- grid is clearly visible but subordinate to coast and illustrations.

## Deferred

- persistence of TTRPG as the default presentation across a full application reload if current workspace preference normalization still collapses unknown presentation tokens;
- reef placement until a canonical reef fact exists;
- world-scale terrain-token density and placement until bounded symbols are visually accepted;
- castle, tower, village, and compass placement;
- generated names and collision-aware label solving;
- politics, roads, resources, settlement simulation;
- TTRPG 3D;
- broad 2.5D/PBR work;
- print/export layout.

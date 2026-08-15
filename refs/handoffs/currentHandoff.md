# Current Handoff

Updated: 2026-08-15

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Tracking issue: `#10`

## Accepted v0.3.77 river-field repair

Owner QA accepted the root presentation repair:

- Data -> Biomes now reads correctly;
- TTRPG is materially improved and the parchment substrate is visible;
- the previous cyan/slate continent wash was caused by rendering the scalar `primaryWorld.layers.river` hydrology field as high-opacity visible geometry;
- ordinary full-world presentation now renders only explicit authoritative `primaryWorld.rivers` paths.

Keep high river density in the simulation. Do not re-enable the scalar runoff field as cartographic paint.

## Active checkpoint: v0.3.78 TTRPG cartographic refinement

Owner QA exposed two remaining TTRPG presentation gaps after the substrate became readable:

1. the full-world map had no terrain-symbol layer at all; the existing bundled TTRPG icon path only served geographic tile-window maps;
2. many valid inland river termini looked like unexplained dead ends because canonical `layers.lakes` cells were classified/presented as wetland-colored land rather than visible water on the full-world TTRPG map.

This increment is presentation-only:

- add deterministic world-scale vector symbols for mountains, hills, forests, rainforest, and wetlands;
- derive symbol placement only from canonical world biome/elevation/water/ice/lake facts and authoritative river paths;
- keep symbols bounded, non-overlapping, and away from explicit river paths;
- add a restrained compass rose as map furniture;
- present canonical lake-mask cells as cool cartographic water in TTRPG without changing the canonical marine `water` mask;
- preserve that lake presentation through the shared surface-repair seam;
- give true non-lake inland river termini a small TTRPG endpoint cue: wetland reeds/waves for wetland termini and a closed-basin mark for basin termini;
- leave Data and Natural lake/river semantics unchanged.

No geography, hydrology generation, water mask, sea-level, biome generation, partition, saved-world, `.wforge`, or `.pworld` contract changes are authorized by this increment.

## River semantics

The hydrology model already records explicit river termini (`ocean`, `lake`, `wetland`, `basin`) and maintains a separate canonical `layers.lakes` mask.

The apparent dead-end issue is primarily a presentation mismatch:

- ocean termini already enter visible marine water;
- lake termini may end on `layers.lakes === 1` while `layers.water === 0`, so the previous full-world renderer showed the destination as ordinary wetland/land;
- wetland and basin termini are valid inland outcomes and need a visible cartographic cue rather than pretending every river must reach the sea.

Do not rewrite river routing unless browser/inspection evidence shows an authoritative path whose recorded terminus is itself incorrect.

## TTRPG symbol guardrails

World-scale symbols are illustrative presentation, not new world facts.

Allowed inputs:

- canonical biome;
- projected elevation;
- water, ice, and lake masks;
- explicit authoritative river paths for avoidance.

Current symbols:

- mountain;
- hills;
- forest;
- rainforest;
- swamp/wetland;
- compass rose.

Do not infer settlements, castles, towers, villages, reefs, roads, political boundaries, or names without corresponding canonical facts.

## Focused regression contract

Automated coverage must prove:

- world-scale TTRPG symbol placement is deterministic and bounded;
- symbols never occupy canonical ocean, ice, or lake sample cells;
- TTRPG lake styling changes presentation only and does not mutate the canonical marine water mask or source project;
- a second shared surface-presentation pass does not silently convert the TTRPG lake back to land;
- scalar-only river fields still cannot create visible river geometry;
- explicit authoritative paths remain visible;
- non-ocean termini remain available to the cartographic endpoint layer.

## Manual visual acceptance

No regeneration is required for the presentation checks.

TTRPG -> Biomes:

- mountain/forest/wetland iconography should be immediately visible but not carpet the map;
- icons must follow plausible terrain regions and avoid covering major river lines;
- inland lake termini should visibly end in small cool-water lake areas where the canonical lake mask exists;
- true basin/wetland termini should have a subtle intentional endpoint mark;
- land must remain warm parchment/tan and water clearly cooler/darker.

Data -> Biomes remains the control and should retain the accepted v0.3.77 appearance.

## Generation-quality follow-up

Owner also requested moving the semantic default generation quality from the old blockier 512 x 256 setting to the current Large 1024 x 512 setting as the speed/quality balance point.

That is a separate UI/default-selection change and should not be mixed into hydrology or TTRPG world-fact logic. Preserve lower and higher quality options for explicit user choice.

## Validation contract

This is build-facing presentation work:

- focused TTRPG world-symbol/lake/terminus regression tests;
- full exact-head unit/integration gate;
- type-check and production build;
- production harness tests and smokes.

`npm run evaluate:regions` is not required because generation and geographic partitioning are unchanged.

Manual visual acceptance remains mandatory.

## Guardrails

- Do not create a second geography, hydrology, or terrain model.
- Canonical `primaryWorld.rivers` owns visible river path geometry.
- Scalar `layers.river` is supporting hydrology data, not visible cartographic geometry.
- `layers.lakes` remains the canonical inland-lake fact; TTRPG may style it as water without changing `layers.water`.
- Symbols must remain derived presentation over canonical facts.
- Preserve accepted Data behavior.
- Do not reopen broad 2.5D/PBR work.

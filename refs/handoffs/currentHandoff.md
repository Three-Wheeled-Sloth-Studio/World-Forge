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

## Active checkpoint: v0.3.79

This checkpoint contains two narrow follow-ups from the accepted v0.3.77 baseline.

### TTRPG cartographic refinement

Owner QA exposed two remaining presentation gaps after the substrate became readable:

1. the full-world map had no terrain-symbol layer; the existing bundled TTRPG icon path only served geographic tile-window maps;
2. many valid inland river termini looked like unexplained dead ends because canonical `layers.lakes` cells were presented as wetland-colored land rather than visible water on the full-world TTRPG map.

The implemented boundary is presentation-only:

- deterministic world-scale vector symbols for mountains, hills, forests, rainforest, and wetlands;
- symbol placement derives only from canonical biome/elevation/water/ice/lake facts and authoritative river paths;
- bounded per-family density prevents one high-priority terrain type from consuming the entire symbol budget;
- symbols avoid canonical water/ice/lake sample cells and keep away from explicit river paths;
- restrained compass rose as non-semantic map furniture;
- canonical lake-mask cells read as cool cartographic water in TTRPG without changing the canonical marine `water` mask;
- TTRPG lake styling survives the shared surface-repair seam rather than being converted back to terrestrial terrain;
- true non-lake inland river termini receive small endpoint cues: wetland reeds/waves for wetland termini and a closed-basin mark for basin termini;
- Data and Natural lake/river semantics remain unchanged.

### Generation-quality default recenter

Owner requested moving the semantic default generation quality from the old blockier 512 x 256 setting to the current Large 1024 x 512 setting as the speed/quality balance point.

Implemented behavior:

- 1024 x 512 is now displayed as `Default`;
- 512 x 256 remains available as `Standard`;
- Fast, High, and Ultra choices remain available;
- a brand-new workspace is recentered once from the legacy startup quality to 1024 x 512;
- a persisted workspace still using the old 512 x 256 semantic Default is migrated once to 1024 x 512;
- explicitly persisted higher-quality choices are preserved;
- after the one-time recenter, users remain free to choose 512 x 256 or any other available quality without being forced back to Default.

The recenter uses the existing workspace-storage presence plus a versioned local migration marker. It does not change generation algorithms, project schemas, saved-world/replay contracts, or the behavior of an already generated world.

## River semantics

The hydrology model already records explicit river termini (`ocean`, `lake`, `wetland`, `basin`) and maintains a separate canonical `layers.lakes` mask.

The apparent dead-end issue is primarily a presentation mismatch:

- ocean termini enter visible marine water;
- lake termini may end on `layers.lakes === 1` while `layers.water === 0`, so the earlier renderer could show the destination as ordinary wetland/land;
- wetland and basin termini are valid inland outcomes and now receive cartographic cues rather than pretending every river must reach the sea.

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
- symbol families remain balanced enough that high-priority mountains/wetlands cannot starve forest/rainforest vocabulary;
- symbols never occupy canonical ocean, ice, or lake sample cells;
- TTRPG lake styling changes presentation only and does not mutate the canonical marine water mask or source project;
- a second shared surface-presentation pass does not silently convert the TTRPG lake back to land;
- scalar-only river fields still cannot create visible river geometry;
- explicit authoritative paths remain visible;
- non-ocean termini remain available to the cartographic endpoint layer;
- 1024 x 512 is the semantic Default quality;
- fresh workspaces and persisted old-Default workspaces are recentered once;
- explicit saved High/Ultra choices are not downgraded by the migration.

## Manual visual acceptance

No regeneration is required for the TTRPG presentation checks.

TTRPG -> Biomes:

- mountain/forest/wetland iconography should be immediately visible but not carpet the map;
- symbols should show multiple terrain families where the world contains them;
- symbols must follow plausible terrain regions and avoid covering major river lines;
- inland lake termini should visibly end in small cool-water lake areas where the canonical lake mask exists;
- true basin/wetland termini should have a subtle intentional endpoint mark;
- land must remain warm parchment/tan and water clearly cooler/darker.

Data -> Biomes remains the control and should retain the accepted v0.3.77 appearance.

Generation quality:

- open Build and confirm the selector presents `Default 1024 x 512` and `Standard 512 x 256`;
- on an existing workspace that was still using the old 512 x 256 Default, first load after this checkpoint should recenter to 1024 x 512;
- selecting Standard or a higher quality afterward must stick rather than being automatically reverted.

## Validation contract

This is build-facing presentation/UI-default work:

- focused TTRPG world-symbol/lake/terminus regression tests;
- focused generation-quality default/migration tests;
- full exact-head unit/integration gate;
- type-check and production build;
- production harness tests and smokes.

`npm run evaluate:regions` is not required because generation algorithms and geographic partitioning are unchanged.

Manual visual acceptance remains mandatory.

## Guardrails

- Do not create a second geography, hydrology, or terrain model.
- Canonical `primaryWorld.rivers` owns visible river path geometry.
- Scalar `layers.river` is supporting hydrology data, not visible cartographic geometry.
- `layers.lakes` remains the canonical inland-lake fact; TTRPG may style it as water without changing `layers.water`.
- Symbols must remain derived presentation over canonical facts.
- Preserve accepted Data behavior.
- Quality recentering changes the default selection, not the generator algorithm or saved generated worlds.
- Do not reopen broad 2.5D/PBR work.

# Current Handoff

Updated: 2026-08-15

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Tracking issue: `#10`

## Accepted generated-surface repair

The broad pale `Ice Cap` regression on freshly generated Earthlike worlds is resolved and visually accepted.

Accepted implementation checkpoint:

- commit: `0c2af70265fd862d34bbc517c84e3b24a8657892`
- root defect: final permanent-ice reconciliation used the earlier sampled sea-level parameter instead of authoritative present-day `primaryWorld.seaLevel`
- exact-seed regression: Sol-like / Earthlike `sol-reference-v1`
- human visual acceptance: 2026-08-15

Do not reopen this repair without new evidence.

## Current active item: hand-drawn/TTRPG map presentation

The restrained TTRPG palette and coastline treatment remain directionally accepted, but the illustration-token layer and world-level presentation are still under visual QA.

Two screenshot-driven corrections have now been identified:

1. The first token checkpoint `c1dcccde5834e549a1166b6aeb4aab25f689425a` produced no visible symbols and left generated numeric hierarchy labels visible.
2. The later full-world renderer checkpoint existed in code, but the ordinary Explore toolbar still showed only `Data` and `Natural`, while the visible app badge remained `v0.3.71`. `WorldWorkspace.tsx` was explicitly masking runtime `ttrpg` back to `natural` before rendering the toolbar.

The current correction therefore treats TTRPG as a first-class top-level presentation choice rather than a hidden Layers toggle.

Expected visible behavior for the next build:

- visible version `0.3.72`;
- ordinary Explore -> Map -> Biomes Presentation selector contains `Data`, `Natural`, and `TTRPG`;
- `TTRPG` is available only for Map + Biomes and resets to Natural if the user changes to an unsupported view/subject;
- the old buried `Hand-drawn map` Layers toggle is removed;
- selecting TTRPG uses the already-added full-world parchment theme and outlined coastline renderer;
- bounded geographic Atlas TTRPG remains a separate presentation of the same canonical facts.

## Bounded TTRPG symbol correction

The symbol correction remains:

- bundle the supplied sprite through Vite so a successful production build proves the asset URL exists;
- use canonical morphology first, then canonical visible-window elevation, slope, and ridge facts to select macro-scale relief symbols;
- let collision handling and a window density cap do the sparsening instead of randomly rejecting most qualifying terrain;
- redraw the final TTRPG frame after the base controller effect so generated numeric labels are actually cleared;
- keep reefs reserved until a canonical reef fact exists;
- keep settlement/map-furniture symbols reserved for later.

## Supplied token pack

Normalized owner-supplied tokens include:

- mountain chain variants;
- hills;
- pine forest;
- rainforest;
- swamp;
- reefs / reef cluster;
- volcano;
- castle;
- tower;
- walled village;
- compass rose.

Phase 1 may place only symbols supported by canonical facts. Reefs, settlements, and map furniture remain reserved until their underlying facts or placement contract exist.

## Validation contract

This is a build-facing presentation milestone:

- run focused workspace presentation and TTRPG symbol/presentation tests;
- run the repository exact-head validation gate;
- type-check and production build must pass;
- production harness and smokes must stay green.

`npm run evaluate:regions` is not required because this work must not change geography generation or partitioning.

Manual visual acceptance is still mandatory. Verify both:

1. Explore -> Map -> Biomes visibly offers `TTRPG` and the badge reads `v0.3.72`;
2. the same coastal macro-area sample shows bounded TTRPG symbols with Hexes both off and on.

## Guardrails

- Do not create a second geography, terrain, or hierarchy model.
- Derive illustration placement only from canonical facts.
- Do not infer reefs from generic shallow/coastal water.
- Do not add politics, roads, resources, settlements, or generated names to solve a cartographic-style problem.
- Do not reopen broad 2.5D/PBR work.
- Preserve Natural and Data/Terrain behavior.
- Automated green does not supersede screenshot rejection.

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

The first TTRPG palette/coastline increment remains visually useful: the user accepted the restrained colors and coastline treatment.

Checkpoint `c1dcccde5834e549a1166b6aeb4aab25f689425a` added the initial illustration-token layer and passed automated validation, but user screenshots on 2026-08-15 rejected its visual result because no symbols were visible. The screenshots also showed generated numeric hierarchy labels still present.

That failed visual checkpoint exposed two implementation weaknesses:

1. Symbol selection discarded most qualifying tiles before collision handling and depended too heavily on coarse `mountainous` / `rough` center samples at a 250-mile macro scale.
2. Numeric-label filtering happened after the base controller had already painted generated labels, so it did not reliably remove them.

The corrective implementation should:

- bundle the supplied symbol sprite through Vite so a successful production build proves the asset URL exists;
- use canonical morphology first, then canonical visible-window elevation, slope, and ridge facts to select macro-scale relief symbols;
- let collision handling and a window density cap do the sparsening instead of randomly rejecting most qualifying terrain;
- redraw the final TTRPG frame after the base controller effect so generated numeric labels are actually cleared;
- keep reefs reserved until a canonical reef fact exists;
- keep settlement/map-furniture symbols reserved for later.

## Top-level hand-drawn map

The user explicitly requested the hand-drawn presentation as an option at the full-world level as well as bounded geographic drilldown.

The first full-world increment should remain presentation-only:

- a `Hand-drawn map` display toggle on the ordinary world map;
- muted parchment land colors;
- muted water;
- dark outlined coastline;
- existing canonical rivers;
- no new world facts and no world-scale illustration-token placement until bounded symbol density is visually accepted.

This top-level mode may reuse the existing renderer through a presentation theme rather than creating a parallel full-world renderer.

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

- run focused TTRPG symbol/presentation tests;
- run the repository exact-head validation gate;
- type-check and production build must prove the bundled PNG resolves;
- production harness and smokes must stay green.

`npm run evaluate:regions` is not required because this work must not change geography generation or partitioning.

Manual visual acceptance is still mandatory. Use the same coastal macro-area sample with Hexes both off and on, then check the full-world hand-drawn presentation.

## Guardrails

- Do not create a second geography, terrain, or hierarchy model.
- Derive illustration placement only from canonical tile facts.
- Do not infer reefs from generic shallow/coastal water.
- Do not add politics, roads, resources, settlements, or generated names to solve a cartographic-style problem.
- Do not reopen broad 2.5D/PBR work.
- Preserve Natural and Terrain behavior.
- Automated green does not supersede screenshot rejection.

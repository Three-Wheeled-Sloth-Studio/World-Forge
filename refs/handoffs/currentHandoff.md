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

## Current active item: hand-drawn/TTRPG presentation

The restrained TTRPG palette and coastline treatment are accepted as the visual direction. The owner-supplied stippled terrain-token pack is normalized and bundled for bounded geographic drilldown.

Recent checkpoints:

- `c1dcccde5834e549a1166b6aeb4aab25f689425a`: first token pass; rejected because no symbols appeared and numeric labels remained.
- `55b773968877632334a77b30291832468b5fa36f` / `9b6e10a6b8db5192e56d202581718e848aa4688e`: corrected token bundling/selection and added full-world TTRPG rendering path.
- `7ab3c04de4ec0906b42a8eb9fe8c471347b655b8`: exposed `TTRPG` directly in the top-level Presentation selector and bumped visible version to `0.3.72`.

User visual QA on `0.3.72` found a new top-level defect: Natural renders the same generated world correctly, but TTRPG paints some dry land with the muted ocean/teal color family. Pixel comparison confirms this is a real mode-path mismatch, not a subjective palette concern.

### Required correction

The TTRPG full-world renderer must enforce the canonical water mask at the final presentation seam:

- water cell -> ocean presentation;
- dry land cell -> never ocean presentation, even if a stale biome label survives an upstream cache or projection step;
- no source world facts are mutated;
- Natural/Data behavior outside TTRPG remains unchanged.

The corrective implementation should normalize the project through the existing surface-presentation path and add a TTRPG-specific last-mile safety guard before Data-style painting. Point inspection should use the same presentation project so diagnostics match pixels.

Visible version for the correction: `0.3.73`.

## Bounded TTRPG symbols

Phase 1 symbol rules remain:

- mountain family from canonical mountainous/rugged/ridge/high-relief facts;
- hills from canonical rough/relative relief facts;
- pine forest, rainforest, swamp, and volcano from canonical features/details;
- deterministic sparse placement with collision limiting;
- reefs reserved until a canonical reef fact exists;
- castle/tower/village/compass reserved for later map-dressing/world-fact work.

The next manual symbol check should use the same coastal macro-area sample with Hexes off and on after the top-level color regression is cleared.

## Validation contract

This is a build-facing presentation repair:

- focused TTRPG presentation tests;
- full exact-head unit/integration gate;
- type-check and production build;
- production harness tests and smokes.

`npm run evaluate:regions` is not required because this repair must not change generation or geographic partitioning.

Manual visual acceptance remains mandatory. Automated green does not supersede screenshot rejection.

## Guardrails

- Do not create a second geography, terrain, or hierarchy model.
- Canonical water facts remain authoritative.
- Do not mutate generated world facts to solve a presentation problem.
- Do not infer reefs from shallow water.
- Do not reopen broad 2.5D/PBR work.
- Preserve Natural and Terrain behavior.

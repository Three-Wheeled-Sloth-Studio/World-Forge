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

Do not reopen this generation repair without new evidence.

## Current active item: presentation architecture reset

Repeated visual QA showed that the full-world presentation problem is not a simple palette tweak:

- Natural is readable and preserves land/water identity;
- Data can still show broad cyan/ice-like land after later project updates;
- TTRPG can avoid literal blue land yet collapse warm land and cool water into a similar slate family;
- TTRPG is available on the flat world map but not the globe.

The repair loop has therefore crossed the threshold for architectural reassessment. Do not add another last-mile recolor filter on top of the existing wrappers.

### Root presentation defect

`projectForSurfacePresentation()` previously cached presentation projects in a `WeakMap`. When the source already appeared clean, it returned and cached the original `WorldProject` and original `ice` / `biomes` arrays. Later enrichment could update those mutable source arrays. Data and TTRPG could then consume changed source display layers while Natural continued to derive much of its surface state independently.

The next checkpoint removes that aliasing behavior:

- no surface-presentation project cache;
- every biome presentation receives independent `ice` and `biomes` arrays derived from current canonical facts;
- canonical `water` remains authoritative;
- stale dry-land `ocean` and stale non-permanent `ice_cap` labels are repaired only in the presentation copy;
- generated source facts are never mutated.

### TTRPG visual contract

TTRPG should emulate an old hand-drawn parchment map, not a desaturated satellite view:

- warm parchment land family;
- cooler and materially darker blue-gray water wash;
- dark ink coastline;
- muted rivers;
- subtle biome coloration within the land family;
- land/water distinction readable before individual biome differences.

The water and land palette families should remain separated by a substantial RGB distance after `surfacePresentationTheme()` protection.

### Globe availability

TTRPG is a world presentation, not an Atlas-only or flat-map-only mode. It should be selectable for both:

- Map -> Biomes;
- Globe -> Biomes.

System view remains outside this presentation contract.

## Bounded TTRPG symbols

Phase 1 symbol rules remain:

- mountain family from canonical mountainous/rugged/ridge/high-relief facts;
- hills from canonical rough/relative relief facts;
- pine forest, rainforest, swamp, and volcano from canonical features/details;
- deterministic sparse placement with collision limiting;
- reefs reserved until a canonical reef fact exists;
- castle/tower/village/compass reserved for later map-dressing/world-fact work.

The next manual symbol check should resume only after the full-world Data/TTRPG readability problem is visually accepted.

## Validation contract

This is a build-facing presentation repair:

- focused surface-presentation isolation tests;
- focused TTRPG palette and availability tests;
- full exact-head unit/integration gate;
- type-check and production build;
- production harness tests and smokes.

`npm run evaluate:regions` is not required because this repair must not change generation or geographic partitioning.

Manual visual acceptance remains mandatory. Automated green does not supersede screenshot rejection.

## Version marker

The repository checkpoint before this repair reports `0.3.73`, while owner browser QA reported `0.3.74`. Use visible version `0.3.75` for the architecture-reset checkpoint so browser QA is unambiguous.

## Guardrails

- Do not create a second geography, terrain, or hierarchy model.
- Canonical water facts remain authoritative.
- Do not mutate generated world facts to solve a presentation problem.
- Do not infer reefs from shallow water.
- Do not reopen broad 2.5D/PBR work.
- Preserve accepted Natural behavior while this repair is evaluated.
- Do not claim Data or TTRPG visually fixed until owner screenshot acceptance.

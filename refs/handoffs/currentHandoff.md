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

## Current active item: primary-surface source-of-truth repair

Owner visual QA rejected visible version `0.3.75` despite a fully green automated gate:

- Data still paints broad continent-shaped areas cyan/ice-like;
- TTRPG still paints broad continent-shaped areas with the water color family;
- Natural remains readable enough to conceal the mismatch because its shallow-water treatment blends marine and coastal sediment colors.

The reference target establishes the cartographic invariant clearly: parchment land is the base substrate, water is a separate surrounding field, and terrain marks decorate land rather than define the only terrestrial-colored cells.

### Root defect

The production renderer is body-aware. Before reaching the world renderer it resolves the active body through `projectForWorldBody()` / `worldSurfaceForBody()`.

A materialized `bodyCatalog` can carry its own `surface` for the primary body. That surface is initially the same primary world, but later project updates can replace `project.primaryWorld` while the catalog record retains the older surface object. The existing primary-body lookup preferred the catalog copy.

This creates a split-brain primary surface:

- renderer-level tests against `project.primaryWorld` can pass;
- production body-aware rendering can still receive the stale catalog surface;
- multi-body save paths that read the catalog can also observe the stale copy.

The primary record is useful for durable multi-body projection, because `projectForWorldBody()` temporarily reuses the `primaryWorld` field when projecting a secondary body. The repair must therefore distinguish a real secondary-body projection from an ordinary root project instead of simply deleting the catalog surface.

### Required contract

For a normal/root project:

- `project.primaryWorld` is authoritative for the primary body;
- reading a materialized body catalog normalizes its primary record to the current `project.primaryWorld`;
- explicitly writing the primary surface through `withWorldBodySurface()` also updates `project.primaryWorld`.

For a project object that is intentionally projecting a surfaced secondary body through `primaryWorld`:

- the durable primary surface remains the primary body catalog record;
- switching/projecting back to the primary must recover that durable surface;
- secondary-body surfaces remain catalog-owned and unchanged.

The projection check is based on an active non-primary body whose catalog surface has the same stable surface identity as the current `project.primaryWorld`.

## Current checkpoint target

Visible version: `0.3.76`.

Focused regression coverage must include:

- stale primary catalog snapshot + current root `primaryWorld` -> current root surface wins;
- production body-aware projection uses the current root primary surface;
- projected secondary body still preserves and can recover the durable primary;
- explicit primary-surface writes synchronize the root project and catalog view;
- existing secondary-body package roundtrip behavior remains green.

## TTRPG visual contract

Do not make another palette change until the source-of-truth repair is visually evaluated.

The accepted target remains:

- land reads first as warm parchment/paper;
- water reads as a clearly separate cooler/darker wash;
- coastline is a dark ink separator;
- rivers are restrained;
- biome coloration is subtle and stays within the land family;
- terrain symbols sit on top of land rather than creating the only warm patches.

## Bounded TTRPG symbols

Phase 1 symbol work remains paused until full-world Data/TTRPG land-water identity is visually accepted.

Existing rules remain:

- mountain family from canonical mountainous/rugged/ridge/high-relief facts;
- hills from canonical rough/relative relief facts;
- pine forest, rainforest, swamp, and volcano from canonical features/details;
- deterministic sparse placement with collision limiting;
- reefs reserved until a canonical reef fact exists;
- castle/tower/village/compass reserved for later map-dressing/world-fact work.

## Validation contract

This repair changes shared multi-body surface resolution but does not change generation or geographic partitioning:

- focused shared world-body tests;
- focused production body-aware presentation test;
- existing multi-body exporter/package tests;
- full exact-head unit/integration gate;
- type-check and production build;
- production harness tests and smokes.

`npm run evaluate:regions` is not required unless generation or geographic partitioning changes.

Manual visual acceptance remains mandatory. Automated green does not supersede screenshot rejection.

## Guardrails

- Do not change sea level, shelf shaping, or water generation without new evidence after this production-state repair.
- Do not create a second geography, terrain, or hierarchy model.
- Do not mutate generated surface facts to solve presentation.
- Preserve secondary-body projection and package roundtrip behavior.
- Do not reopen broad 2.5D/PBR work.
- Preserve Natural while Data/TTRPG correctness is evaluated.
- Do not claim `0.3.76` visually fixed until owner screenshot acceptance.

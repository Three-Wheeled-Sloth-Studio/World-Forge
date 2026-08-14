# Current Handoff

Updated: 2026-08-14

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Tracking issue: `#10`

## Current checkpoint

The narrow geographic presentation pass remains active, but the first checkpoint at `7bc6b0b8775bbb023e365cfd127439aeffbe3d2e` did not satisfy user acceptance for land/water readability.

That checkpoint correctly changed the bounded geographic-atlas renderers and added the first 2D TTRPG presentation, but the user reported that freshly generated worlds still showed cyan-looking land. Investigation confirmed that ordinary post-Generate Map and primary-world Globe presentation are owned by `@world-forge/renderer`, not the atlas palette helper.

The current repair therefore targets the generated-surface renderer seam only. It does not reopen broad 2.5D work or alter world generation.

## Generated-surface land/water correction

`packages/renderer/src/index.ts` already contained a presentation-only normalization layer used to prevent stale non-permanent `ice_cap` cells from painting land as ice. That seam is now generalized to surface presentation consistency.

The intended behavior is:

- canonical `world.layers.water` is authoritative for whether a rendered cell belongs to the water color family;
- a water cell with a stale non-ocean biome label presents as ocean;
- a land cell with a stale ocean biome label is reclassified for presentation with the project's existing shared biome rules;
- stale non-permanent `ice_cap` land keeps the previously accepted tundra fallback;
- authoritative source arrays are not rewritten;
- land colors that fall too close to the active ocean/shelf palette receive warmer terrestrial fallbacks, with the current default wetland family specifically separated from cyan shelf water;
- the same normalized project/theme feed ordinary Map rendering, primary-world Globe texture generation, point inspection, and simplified SVG presentation.

This is a presentation guard over canonical facts, not a second classifier. Reclassification uses `classifyBiomeFromRules` and the project's configured `biomeRules` when available.

## Atlas and TTRPG status

The earlier atlas work remains in place:

- centralized Natural atlas palette for 2D and stepped 3D Natural;
- warmer atlas lowlands and distinct coastal/lake/open-water fills;
- explicit wetland treatment based on canonical tile facts;
- coastline strokes derived from canonical water adjacency;
- 2D `TTRPG` mode with parchment-like fills, inked coasts, water-side hachures, restrained terrain overlays, and cartographic labels;
- legacy `tiles` token remains a Natural alias.

Those features were not the source of the post-Generate cyan-land defect.

## Architecture and contract status

Unchanged:

- world generation and deep-time algorithms;
- geographic tile-window and classifier contracts;
- hierarchy generation and partitioning;
- saved-world behavior;
- `.wforge` and `.pworld` contracts;
- exporter/runtime geography ownership;
- geographic scene geometry.

`npm run evaluate:regions` is therefore not required for this repair.

## Validation and QA

Read:

- `refs/testing/geographic-atlas-presentation-qa.md` for the bounded atlas/TTRPG pass;
- `refs/testing/generated-surface-land-water-qa.md` for the post-Generate color regression.

Focused automated coverage belongs in `packages/renderer/src/biomeRendering.test.ts` and must prove that presentation normalization does not mutate authoritative source facts.

Before accepting the checkpoint, run the exact-head authoritative validation path, including the complete unit/integration suite, typecheck/build, production harness tests, and production smokes. Record exact-head CI evidence on issue `#10`.

Final color acceptance still requires a human visual check of a freshly generated world. Green CI alone is not sufficient because the defect is perceptual.

## Repair-loop status

- Modification 1: atlas palette/TTRPG checkpoint, automated validation green, user visual acceptance failed because the wrong product surface was fixed.
- Modification 2: generated-surface renderer normalization and palette separation, currently under validation.

This is still improving the failure model: the second pass has identified and moved to the actual post-Generate rendering owner rather than tuning the atlas again. If this repair does not materially improve the generated surface, do not begin a third palette tweak blindly. Inspect the rendered pixel through point diagnostics and, if Globe-only, the ocean-shell/geometry relationship before modifying again.

## Deliberately deferred

Do not expand this repair into:

- broad 2.5D or globe geometry redesign;
- generation or biome-model changes without evidence of authoritative-data corruption;
- TTRPG-specific 3D work;
- place-name generation or label collision systems;
- settlements, roads, politics, forest or mountain symbol libraries;
- print/export layout;
- saved presentation-state contracts.

# Current Handoff

Updated: 2026-08-14

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Tracking issue: `#10`

## Current checkpoint

The generated-surface land/water readability repair has moved from presentation tuning to a bounded generation regression rollback.

Two earlier checkpoints passed automated validation but failed user visual acceptance:

1. `7bc6b0b8775bbb023e365cfd127439aeffbe3d2e` corrected the geographic-atlas palette and added the first 2D TTRPG presentation, but the ordinary post-Generate map uses a different renderer.
2. `97e1e7ef9229c3b15b802d91b9ec045decfdae10` hardened the ordinary renderer's land/water presentation invariants, but a user screenshot still showed broad pale cyan coverage across generated continental surfaces while the bundled/default Earth reference looked normal.

Per the repair-loop breaker in `AGENTS.md`, do not perform another blind palette adjustment. The screenshot and code-history review moved the investigation upstream into generated climate and permanent-ice facts.

## Regression boundary

The last stored polar-ice visual/diagnostic evidence in `refs/testing/map-lines-polar-ice/` was captured on 2026-07-29. Representative generated Earthlike cases showed bounded land ice, including approximately 0.35 percent for seed `1001001` and 7.6 percent for seed `5336649`, concentrated at high latitude.

On 2026-08-02, commit `9305862028fe83d380652f509185fbc06e57ca98` promoted `mean-centered-power-v1` with a 52 C equator-to-pole contrast from Experimental into `core.performance-foundation`, which is the workflow used by normal desktop generation. The permanent-ice classifier itself was not subsequently changed.

The promotion tests proved determinism and relative warm-versus-cold behavior, but did not impose a generated Earthlike land-ice ceiling or repeat the earlier generated-surface visual acceptance. That left a gap large enough for the current regression to pass CI.

## Current repair

Production `core.performance-foundation` is returned to `legacy-linear-v1`, the last latitude-temperature profile with accepted generated polar-ice evidence. `mean-centered-power-v1` remains available under `core.world-generation-experimental` for future calibration and comparison.

This is intentionally a rollback of one production promotion, not removal of the mean-centered model. Re-promoting it requires generated-world evidence showing that ordinary Earthlike surfaces do not become broadly permanent-ice colored.

New regression coverage must prove:

- production and Experimental select their intended distinct latitude profiles;
- ordinary 15 C Earthlike production worlds across representative seeds keep land ice below 20 percent;
- low-latitude land ice remains below 2 percent;
- warm worlds remain less icy than cold worlds;
- production remains deterministic.

The renderer-side semantic guard from `97e1e7ef...` remains in place as defense in depth, but is no longer considered the root repair.

## Atlas and TTRPG status

The earlier bounded atlas work remains accepted as implemented but still awaits broader visual refinement separately:

- centralized Natural atlas palette for 2D and stepped 3D Natural;
- warmer atlas lowlands and distinct coastal/lake/open-water fills;
- explicit wetland treatment from canonical tile facts;
- coastline strokes from canonical water adjacency;
- 2D `TTRPG` mode with parchment-like fills, inked coasts, water-side hachures, restrained terrain overlays, and cartographic labels;
- legacy `tiles` token remains a Natural alias.

Do not reopen broad 2.5D experimentation as part of this climate regression.

## Architecture and contract status

The current repair changes generation behavior only by workflow profile selection. It does not change:

- generation schemas or saved-world formats;
- geographic tile-window or classifier contracts;
- hierarchy generation or partitioning algorithms;
- `.wforge` or `.pworld` package contracts;
- exporter/runtime geography ownership;
- geographic scene geometry.

The generated values for production worlds may change because the production climate profile is deliberately being restored to the prior accepted behavior.

## Validation and QA

Read:

- `refs/testing/generated-surface-land-water-qa.md` for this regression and required visual acceptance;
- `refs/testing/map-lines-polar-ice/` for the pre-promotion baseline evidence;
- `refs/testing/geographic-atlas-presentation-qa.md` for the separate atlas/TTRPG presentation pass.

Focused tests:

- `packages/generator-core/src/latitudeTemperatureProfile.test.ts`
- `packages/generator-core/src/polarClimateIntegration.test.ts`
- existing renderer presentation tests remain relevant as defense in depth.

Because this repair changes production generation behavior, run the exact-head standard validation gate and `npm run evaluate:regions`. The repository's manual `Geographic Drilldown Diagnostic` workflow includes `npm run evaluate:regions`; use it when a workflow-dispatch path is available.

Final acceptance still requires a human visual check of a freshly generated Earthlike world. Green CI alone is not sufficient.

## Repair-loop status

- Modification 1: atlas palette/TTRPG checkpoint. Automated validation green; visual acceptance failed because the wrong surface was repaired.
- Modification 2: ordinary renderer normalization/palette separation. Automated validation green; user screenshot still showed broadly pale generated land.
- Architectural reassessment: completed. Default/reference Earth renders normally, dark ocean renders normally, old polar QA predates the Aug 2 production profile promotion, and the defect is now treated as a generated climate/ice regression rather than a color-choice problem.
- Modification 3: restore the last visually accepted production latitude profile and add generated Earthlike ice-coverage bounds.

If Modification 3 still fails visual acceptance, do not tune a fourth color or temperature constant. Use point inspection on a pale cell and compare `isWater`, `isIce`, latitude, elevation, temperature, source biome, and final albedo before changing another model.

# Current Handoff

Updated: 2026-08-14

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Tracking issue: `#10`

## Current checkpoint

Generated Earthlike surfaces are still under active visual acceptance. The user supplied a fresh `sol-reference-v1` screenshot after checkpoint `d59d568b17dc42661258c036725c189938df1c24`; broad pale continental coverage remained. The screenshot legend makes the failure class unambiguous: the dominant pale land is `Ice Cap`, not ocean or shelf water.

Four investigation stages matter:

1. `7bc6b0b8775bbb023e365cfd127439aeffbe3d2e` fixed the geographic-atlas palette and added the first 2D TTRPG presentation. It did not own the ordinary post-Generate surface.
2. `97e1e7ef9229c3b15b802d91b9ec045decfdae10` hardened ordinary renderer land/water semantics. Visual acceptance still failed because the source biome/ice facts themselves were wrong.
3. `d59d568b17dc42661258c036725c189938df1c24` rolled production back to the legacy latitude-temperature profile and added broad Earthlike ice ceilings. The user's exact `sol-reference-v1` screenshot still failed, so that rollback is rejected as the root repair and should not remain as collateral behavior change.
4. The current source-level diagnosis is a stale sea-level datum in the post-deep-time system/orbit reconciliation pass.

## Root defect

Deep-time finalization re-solves `primaryWorld.seaLevel` from the aged terrain and requested ocean coverage. That value is the authoritative present-day sea-level datum used by final climate and terrain interpretation.

Later, `reconcileSystemOrbitPresets()` applies stellar/orbital forcing and re-runs `classifyPermanentIce()`. Before the current fix, that call passed:

```ts
seaLevel: project.selectedValues.seaLevel ?? 0
```

instead of the authoritative:

```ts
seaLevel: world.seaLevel
```

`selectedValues.seaLevel` is an earlier sampled generation parameter. It can diverge materially from the final sea level after deep-time terrain aging and final ocean reconciliation. Permanent-ice classification uses sea level to compute altitude, so the stale datum can make ordinary continental cells appear artificially high and eligible for alpine permanent ice. The reconciliation pass then writes those `ice_cap` facts back into topology and raster biomes, which is exactly what the user's screenshot shows.

This is a generation-fact bug, not a palette problem.

## Current repair

The system/orbit permanent-ice pass must use `primaryWorld.seaLevel` as the altitude datum.

The rejected climate-profile rollback from `d59d568b...` is reverted in the same checkpoint. `core.performance-foundation` and Experimental therefore return to the promoted `mean-centered-power-v1` behavior that existed before the failed rollback. The current fix should remain narrowly attributable to the sea-level datum defect.

A dedicated regression test covers the reported seed `sol-reference-v1` through the production-style Sol-like/Earthlike reconciliation path. It must prove:

- the reconciled topology ice field equals a fresh permanent-ice classification performed with `world.seaLevel`;
- the sampled reported case is not a deliberately frozen world;
- total land permanent ice remains below the broad 20 percent visual-regression ceiling;
- low-latitude land permanent ice remains below 2 percent.

The existing renderer semantic guard remains defense in depth only.

## Atlas and TTRPG status

The bounded atlas work remains in place and is not part of this repair:

- centralized Natural atlas palette for 2D and stepped 3D Natural;
- warmer lowlands and distinct coastal/lake/open-water fills;
- explicit wetland treatment from canonical tile facts;
- coastline strokes from canonical water adjacency;
- 2D `TTRPG` mode with parchment-like fills, inked coasts, water-side hachures, restrained terrain overlays, and cartographic labels;
- legacy `tiles` token remains a Natural alias.

Do not reopen broad 2.5D work while this surface regression is being closed.

## Architecture and contract status

The current fix does not change schemas, saved-world formats, geographic hierarchy contracts, `.wforge`/`.pworld` contracts, exporter ownership, or scene geometry.

It changes only which already-existing sea-level fact is supplied to the final permanent-ice classification. The authoritative present-day world datum wins over a stale sampled input.

## Validation

Focused tests:

```bash
npx vitest run \
  packages/generator-core/src/systemOrbitSeaLevelRegression.test.ts \
  packages/generator-core/src/systemOrbitPreset.test.ts \
  packages/generator-core/src/permanentIce.test.ts \
  packages/generator-core/src/polarClimateIntegration.test.ts
```

Then run the standard exact-head validation gate. Because generated surface facts can change, `npm run evaluate:regions` is still required when an execution path is available.

Final acceptance still requires the user to regenerate `sol-reference-v1` and visually confirm that ordinary continental interiors are no longer painted as Ice Cap.

## Repair-loop status

- Modification 1: atlas palette/TTRPG. Wrong product surface for this defect.
- Modification 2: renderer semantic/palette guard. Correct defense in depth, not root cause.
- Modification 3: latitude-profile rollback. Rejected by exact user visual QA and reverted.
- Modification 4: authoritative final sea-level datum for post-deep-time permanent-ice reconciliation. Current candidate root repair.

If Modification 4 still fails the exact `sol-reference-v1` visual check, stop model tuning. Use point diagnostics on one pale cell and compare `isWater`, `isIce`, `permanentIce`, latitude, elevation relative to `world.seaLevel`, temperature, topology biome, raster biome, and final albedo before changing anything else.

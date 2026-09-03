---
type: "Testing Reference"
title: "Generated Surface Land/Water Readability QA"
tags:
- world-forge
- testing
---
# Generated Surface Land/Water Readability QA

Updated: 2026-08-14

Tracking: World Forge issue `#10`

## Current failure

Fresh generated Earthlike worlds have shown broad pale continental coverage while the bundled/reference Earth renders normally. The user's `sol-reference-v1` screenshot after checkpoint `d59d568b17dc42661258c036725c189938df1c24` confirms the pale class is `Ice Cap`, not ocean or shallow shelf.

The dark ocean palette is functioning. This is therefore an authoritative generated ice/biome regression, not a land/water color-selection problem.

## Root contract under test

Deep-time finalization computes an authoritative present-day `primaryWorld.seaLevel` after terrain aging and final ocean reconciliation.

The later system/orbit reconciliation pass also re-runs permanent-ice classification after stellar/orbital forcing. That pass must use the same authoritative sea-level datum:

```ts
seaLevel: world.seaLevel
```

It must not use the earlier sampled `project.selectedValues.seaLevel`. Permanent-ice classification derives altitude from elevation minus sea level; using the stale sampled value can falsely promote ordinary continental terrain into alpine permanent ice and then `ice_cap` biome presentation.

## Rejected repair

Checkpoint `d59d568b...` temporarily restored the old production latitude-temperature profile. Exact user visual QA still showed the failure. That rollback is therefore reverted rather than retained as an unrelated climate behavior change.

The promoted mean-centered production profile returns to its pre-rollback state. The current repair is isolated to the sea-level datum used by post-deep-time ice reconciliation.

## Focused automated regression

Run:

```bash
npx vitest run \
  packages/generator-core/src/systemOrbitSeaLevelRegression.test.ts \
  packages/generator-core/src/systemOrbitPreset.test.ts \
  packages/generator-core/src/permanentIce.test.ts \
  packages/generator-core/src/polarClimateIntegration.test.ts
```

The dedicated `sol-reference-v1` regression must prove:

- normal Sol-like/Earthlike production-style generation completes with a non-frozen sampled average temperature;
- final reconciled topology ice is exactly what `classifyPermanentIce()` produces when supplied `primaryWorld.seaLevel`;
- total permanent land-ice share stays below 20 percent;
- permanent land ice at absolute normalized latitude <= 0.45 stays below 2 percent.

The 20 percent ceiling is intentionally broad. It is a visual-regression barrier, not an Earth climatology target.

## Renderer defense in depth

The renderer safety layer remains required but is not the root repair:

- canonical water cells render through water families;
- canonical land cells do not remain ocean presentation biomes;
- stale non-permanent `ice_cap` presentation falls back to tundra;
- presentation normalization does not rewrite source world facts;
- land palette entries remain separated from ocean/shelf colors.

## Full validation

Run the standard validation gate after focused tests.

Because the authoritative generated ice field can change, also run:

```bash
npm run evaluate:regions
```

when an execution path is available. Geographic partitioning code is not being modified, but region outputs consume generated surface facts.

## Required visual acceptance

After pulling the exact checkpoint and restarting the app:

1. Select Earthlike, Sol-like, and world/star seed `sol-reference-v1`.
2. Generate using Default 512 x 256 / Detailed production generation.
3. Open Explore -> Map -> Data -> Biomes.
4. Confirm open ocean and shelf remain visually water.
5. Confirm the broad continental interiors that were previously pale Ice Cap now resolve to terrestrial biomes except where permanent ice is actually justified.
6. Confirm low- and mid-latitude land is not dominated by Ice Cap.
7. Check Natural presentation and Globe view for the same land/water/ice story.

If broad Ice Cap survives this checkpoint, use point diagnostics on one pale cell and record:

- `isWater`;
- `isIce` and `permanentIce`;
- latitude;
- elevation;
- `world.seaLevel`;
- elevation relative to sea level;
- temperature;
- topology biome;
- raster biome;
- base biome color;
- final albedo.

Do not make another climate, ice-threshold, or palette change without that cell-level evidence.

## Acceptance boundary

Automated validation can prove the authoritative sea-level datum and broad ice-coverage invariants. The issue remains open until the exact `sol-reference-v1` user-facing visual check passes.

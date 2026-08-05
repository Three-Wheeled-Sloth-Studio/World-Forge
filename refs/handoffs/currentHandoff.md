# Current Handoff: Sol Reference System

Updated: 2026-08-04

Status: The refreshed imported Earth reference passed user browser acceptance. Jupiter's smooth oblate geometry and banding remain accepted, the native body hierarchy is accepted, and the unified Sol reference pipeline now runs successfully on Windows. The Earth climate-calibration benchmark remains a separate, non-blocking enrichment track. Parchment embedding/import acceptance and package/runtime measurements remain.

## Read first

1. `refs/handoffs/reference-system-etl-and-multi-body-navigation.md`
2. `refs/handoffs/system-view-body-catalog-alignment.md`
3. `refs/testing/sol-reference-pipeline.md`
4. `refs/testing/sol-atmospheric-geometry-and-selector-qa.md`
5. `refs/testing/sol-earth-biome-and-selector-stability-qa.md`
6. `refs/research/reference-data/earth-reference-data.md`
7. `refs/planning/body-detail-tiers-and-payload-strategy.md`
8. `refs/handoffs/earth-climate-calibration-benchmark.md`
9. World Forge issue #124
10. Parchment Worlds issue #22

## Accepted visual baseline

User-confirmed:

- Jupiter's smooth oblate silhouette looks correct;
- imported Jupiter banding is visually successful;
- moons are clearly nested beneath parent worlds in the native selector;
- canonical body names remain intact;
- the refreshed Earth geography and imported climate/biome presentation look great;
- recognizable climate regions are now present rather than the earlier placeholder presentation.

The imported Earth climate direction is therefore accepted for continued Sol fixture development. Do not reopen it merely because the separate procedural-climate benchmark remains planned.

## Accepted pipeline artifact

The accepted local prepared-bundle rebuild produced:

```text
.local/reference-data/sol-earth-reference.wforge
```

Evidence from `sol-earth-reference.wforge.pipeline.json`:

```text
schema: world-forge-sol-reference-pipeline-report-v1
mode: prepared-bundles-to-package
Earth resolution: 512 x 256
topology resolution: 64
elapsed: 875 ms
package bytes: 2,428,738
package SHA-256: 286794b798d9ec6d80d65056319ca0664369292b8ced3f43c46e29fd47f016e6
Earth manifest SHA-256: 805881ef229dc9dce649a5c077bc2a82ba7515a733b026e32d35aaf1772261f6
Jupiter manifest SHA-256: a12bb1bfc8e2c066b6bf60526d557a24a27d2a604ebbf76ba547f574ad772ae1
```

The report did not record `sourceCommit`, so do not infer a source SHA from the package evidence alone.

## Current implementation checkpoint

```text
3b633554fa3c8730e7eb3a0a2b95ac96cba77a8b
```

This includes the Windows child-process correction. The pipeline invokes the repository-local `tsx` CLI through the current Node executable rather than attempting to spawn `npm.cmd` with `shell: false`.

Validation run `30967195833` passed:

- repository typecheck;
- unit and integration tests, including the portable child-process regression test;
- production page harness smoke;
- production attribution rerank smoke.

## Standard commands

Full source-to-package run:

```powershell
python -m pip install -r tools/reference-etl/requirements.txt
npm run reference:pipeline-sol
```

Prepared-bundle rebuild:

```powershell
npm run reference:pipeline-sol -- --prepared-only
```

Expected outputs:

```text
.local/reference-data/sol-earth-reference.wforge
.local/reference-data/sol-earth-reference.wforge.pipeline.json
```

## Earth climate-calibration boundary

`refs/handoffs/earth-climate-calibration-benchmark.md` is an independent side project for testing generic climate logic against known Earth topology and observations.

It:

- is not Definition-of-Ready yet;
- must not block Sol development;
- must not block acceptance or distribution of imported Earth data;
- must not mutate the accepted reference fixture during experiments;
- begins with readiness closure and baseline design, not algorithm changes.

## Intermittent selector flicker

Selecting a body previously produced intermittent flicker and degraded response until another body was selected. No stable body-specific pattern was identified.

Idempotent selector-hierarchy repair and diagnostics are implemented. Do not mark this closed until repeated pointer and keyboard selection remains stable in the deployed browser runtime. This acceptance check may proceed alongside the remaining package work and is not a Sol pipeline blocker.

## Active next slice: Parchment package acceptance

The World Forge producer side is accepted for the Earth-plus-Jupiter baseline. Carry the exact accepted `.wforge` through the normal Parchment path.

From the sibling Parchment checkout:

```powershell
npm run generate:sol-starter
```

Required outcomes:

1. Embed the accepted `.wforge` through the normal Parchment portable-package model.
2. Record the resulting `.pworld` byte length and SHA-256.
3. Import it through the normal product UI as a new editable project.
4. Confirm Earth and Jupiter remain in one system and open with the requested active body.
5. Confirm refreshed Earth climate layers and accepted Jupiter rendering survive the nested package round trip.
6. Confirm the starter does not adopt unrelated local World Forge inventory.
7. Measure Parchment packaging time, import time, first-open time, and browser memory.
8. Decide from evidence whether lazy per-body loading is required before adding Mars, Venus, and Luna.

## Next bodies after package acceptance

1. Mars and Venus near normal map resolution where source and performance permit.
2. Luna and the generic compact solid-body renderer.
3. Remaining giants, selected moons, irregular bodies, and belts.
4. Lazy per-body package loading only if measured evidence justifies it.

## Guardrails

- One system is one project.
- Parchment body assets are body nodes, not independent systems.
- Atmospheric bodies must not use terrain displacement.
- Imported facts and derived classifications must remain distinguishable.
- Unsupported views must never silently switch to Earth.
- Use the normal exporter and normal Parchment import path for release fixtures.
- Do not silently substitute a metadata-only starter for normal development or release packaging.
- Do not let climate-calibration experiments delay or destabilize the Sol fixture pipeline.
- Keep refs and issue threads current with every accepted increment.

# Current Handoff: Sol Reference System

Updated: 2026-08-04

Status: The refreshed imported Earth reference, Jupiter presentation, unified World Forge build pipeline, Parchment starter embedding, and normal Parchment import path have passed user acceptance. The resulting `.pworld` is 3.24 MiB and imports very quickly, so lazy per-body loading is not justified for the current baseline. The Earth climate-calibration benchmark remains a separate, non-blocking enrichment track.

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

The imported Earth climate direction is accepted for continued Sol fixture development. Do not reopen it merely because the separate procedural-climate benchmark remains planned.

## Accepted World Forge pipeline artifact

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

## Accepted Parchment package artifact

The generated starter package is:

```text
apps/web/public/starter-projects/sol-system.pworld
```

User-reported evidence:

```text
package bytes: 3,400,610
package size: 3.24 MiB
SHA-256 displayed prefix: e41ef0d15cd9d88362f66baa…
```

The full digest was truncated by PowerShell table display and is not recorded here. Do not fabricate the omitted suffix.

The package imported through the normal Parchment UI successfully. Earth and Jupiter survived the nested package round trip, and the import/open path was described as very snappy. Dedicated timing measurement is not warranted for this baseline.

### Loading decision

At 3.24 MiB with subjectively instant import/open behavior, lazy per-body package loading is deferred. Reconsider it only after meaningful package growth or observed latency, memory, or browser-stability evidence.

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

Expected World Forge outputs:

```text
.local/reference-data/sol-earth-reference.wforge
.local/reference-data/sol-earth-reference.wforge.pipeline.json
```

Parchment starter generation:

```powershell
npm run generate:sol-starter
```

Expected Parchment output:

```text
apps/web/public/starter-projects/sol-system.pworld
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

Idempotent selector-hierarchy repair and diagnostics are implemented. Do not mark this closed until repeated pointer and keyboard selection remains stable in the deployed browser runtime. This acceptance check may proceed alongside body ingestion and is not a Sol pipeline blocker.

## Active next slice: Mars and Venus ingestion readiness

The Earth-plus-Jupiter producer and consumer pipeline is accepted. The next body-expansion slice should prepare Mars and Venus for ingestion through the same source-project and package path.

Do not begin substantial ETL or renderer work until the slice meets Definition of Ready.

### Readiness questions

- accepted elevation/topography and visual-data sources for Mars and Venus;
- redistribution and attribution constraints;
- target source and prepared resolutions;
- which layers are imported, derived, approximated, or intentionally absent;
- treatment of Venus cloud-top presentation versus surface topology;
- whether both bodies can use existing renderer contracts without special-case architecture;
- expected package growth against the accepted 3.24 MiB `.pworld` baseline;
- browser acceptance checks for Map, Globe, selector behavior, and Parchment round trip.

### Expected implementation shape after readiness

1. Add deterministic normalized source bundles for Mars and Venus.
2. Extend the source-controlled Sol project definition with their stable body records and provenance.
3. Export through the existing normal `.wforge` path.
4. Regenerate the same Parchment starter `.pworld`.
5. Confirm package growth and user-perceived performance remain acceptable.
6. Revisit lazy loading only if actual evidence warrants it.

## Later bodies

1. Luna and the generic compact solid-body renderer.
2. Remaining giants and selected major moons.
3. Irregular bodies and belts.
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
- Do not implement Mars or Venus ingestion before its Definition of Ready is accepted.
- Keep refs and issue threads current with every accepted increment.

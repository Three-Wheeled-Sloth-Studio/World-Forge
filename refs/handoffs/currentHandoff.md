# Current Handoff: Sol Reference System

Updated: 2026-08-05

Status: The refreshed imported Earth reference, Jupiter presentation, unified World Forge build pipeline, Parchment starter embedding, and normal Parchment import path have passed user acceptance. The resulting `.pworld` is 3.24 MiB and imports very quickly, so lazy per-body loading is not justified for the current baseline. Mars and Venus source research and Definition-of-Ready drafting are complete; material implementation remains blocked pending acceptance of the recommended scope and contracts. The Earth climate-calibration benchmark remains a separate, non-blocking enrichment track. Product implementation is temporarily paused while a focused CI signal-discipline increment is reviewed; no Mars, Venus, climate, or renderer work is mixed into that change.

## Read first

1. `refs/handoffs/reference-system-etl-and-multi-body-navigation.md`
2. `refs/handoffs/system-view-body-catalog-alignment.md`
3. `refs/testing/sol-reference-pipeline.md`
4. `refs/testing/sol-atmospheric-geometry-and-selector-qa.md`
5. `refs/testing/sol-earth-biome-and-selector-stability-qa.md`
6. `refs/research/reference-data/earth-reference-data.md`
7. `refs/planning/body-detail-tiers-and-payload-strategy.md`
8. `refs/handoffs/mars-venus-reference-ingestion-readiness.md`
9. `refs/research/reference-data/mars-reference-data.md`
10. `refs/research/reference-data/venus-reference-data.md`
11. `refs/handoffs/earth-climate-calibration-benchmark.md`
12. `refs/engineering/ci-and-agent-workflow.md`
13. World Forge issue #124
14. Parchment Worlds issue #22

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

## CI signal-discipline increment

Canonical studio guidance:

```text
Three-Wheeled-Sloth-Studio/TWS-Design-Principles
engineering/CI-Signal-Discipline.md
```

World Forge's repository-specific implementation is documented at:

```text
refs/engineering/ci-and-agent-workflow.md
```

The focused workflow increment preserves automatic full CI on `main`, `dev`, `qa`, and `release/**`; skips full jobs for draft pull requests; runs authoritative PR validation when a draft becomes ready for review; supports deliberate `workflow_dispatch` validation; and cancels superseded runs by workflow plus PR number or branch ref.

Validation is ordered as:

1. `fast-checks`: dependency installation and the full Vitest suite.
2. `validate`: production TypeScript/frontend build.
3. Production harness self-tests.
4. Headless production browser smokes.

The existing authoritative workflow name `Validate World Forge` and terminal job/check name `validate` remain stable. GitHub currently reports no protected branches, so no branch-protection mutation is part of this increment.

There are no deployment, release-publication, signing, migration, or irreversible artifact workflows in the repository. Future irreversible workflows require an explicit concurrency exception rather than inheriting cancel-in-progress behavior blindly.

Coding agents must use draft PRs for substantial or diagnostic-heavy work, batch coherent checkpoints, read failures before pushing fixes, avoid push-triggered one-shot diagnostics, and remove temporary workflows or diagnostic debris before review.

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

## Active next slice: Mars and Venus readiness acceptance

The planning handoff is:

```text
refs/handoffs/mars-venus-reference-ingestion-readiness.md
```

Supporting source reviews:

```text
refs/research/reference-data/mars-reference-data.md
refs/research/reference-data/venus-reference-data.md
```

No material ETL or renderer work should begin until the recommended decisions are accepted.

### Recommended Mars scope

- Tier 2 compact raster surface;
- Globe and Map supported;
- Explorer and editors deferred;
- MOLA 463 m global DEM;
- Viking MDIM 2.1 artistically colorized global mosaic;
- 1024 x 512 prepared elevation and appearance;
- no fabricated Earth climate, biome, water, river, or plate layers.

### Recommended Venus scope

- default Globe presents the cloud deck;
- Map presents Magellan radar and topography;
- optional radar-surface Globe mode may be included;
- Explorer and editors deferred;
- Magellan C3-MIDR radar mosaic;
- Magellan global topography version 2;
- deterministic narrow-window Akatsuki UVI 365 nm cloud composite;
- 1024 x 512 prepared layers.

### Readiness architecture findings

1. `raster-surface` declares Map and Globe capability, but current render access still requires a full `PrimaryWorld` surface.
2. Numeric raster assets lack generic units, datum, scale, offset, no-data, and range metadata.
3. Venus needs a generic layered solid-body detail capable of carrying both a surface and an atmosphere/cloud presentation.
4. The Sol assembler should move toward a manifest or repeated body-bundle seam rather than one CLI flag per body.
5. Lazy loading remains deferred until package/runtime evidence changes.

### First implementation after acceptance

Begin with generic synthetic-fixture foundation work:

- numeric raster metadata;
- body-local raster hydration and access;
- raster-surface Globe and Map rendering;
- explicit unsupported Explorer handling;
- package round-trip coverage.

Do not begin by downloading Mars or Venus sources. Mars source ETL follows only after the reusable raster path is accepted and validated.

## Later sequence

1. Mars ETL, package integration, and Parchment QA.
2. Generic layered solid-body presentation contract.
3. Venus surface ETL and accepted Akatsuki cloud-composite recipe.
4. Venus package integration and Parchment QA.
5. Reassess lazy loading only from measured package/runtime evidence.
6. Luna, Phobos, and Deimos as separate increments.
7. Remaining giants, selected major moons, irregular bodies, and belts.

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
- Do not fabricate `PrimaryWorld` records to avoid body-local raster rendering work.
- Do not add a Venus-only durable schema.
- Keep refs and issue threads current with every accepted increment.
- Follow `refs/engineering/ci-and-agent-workflow.md` for CI, draft PRs, and diagnostics.

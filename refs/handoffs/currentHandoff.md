# Current Handoff

Updated: 2026-08-18

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

## Accepted runtime baseline before the Ultra Earth increment

The last fully accepted runtime/presentation checkpoint remains:

- commit: `b0197a4669d605ecd771810f589feae109bb94e3`
- visible version: `0.3.80`
- Validate World Forge run `#844` / run id `31980878852`
- 143 test files passed
- 517 tests passed
- typecheck/build, production harness tests, and both production smokes green

The TTRPG presentation debts from that checkpoint remain deferred:

1. ocean presentation is still too dark/heavy for the desired light watercolor direction;
2. some terrain icons still need better anchoring/alignment semantics.

Do not reopen those during the Earth reference increment unless the owner explicitly asks.

## Current Ultra Earth implementation checkpoint

Current implementation head for this increment:

- `f9e8f73afdf0a71003dbf80030dd4a7afcf581f0` - `chore: report Earth reference bundle size`

Preceded by:

- `5762eb03bf107c94284546bf64b19a01b2e67404` - `feat: establish Ultra Earth reference target`
- `d9201cea5bee0f925c81906823f771f69fc04277` - `fix: validate maintained Earth reference inputs`

### WP0 completed

The maintained Earth reference target is now explicit and consumed by the normal Sol source-to-package pipeline:

- raster: `4096 x 2048`;
- topology: `1024`;
- topology is derived through the existing shared `topologyResolutionForOutput(...)` policy, not a second Earth-only rule;
- explicit comparison raster sizes also use the shared topology policy unless `--topology-resolution` is intentionally supplied;
- ordinary generated-world defaults are unchanged.

The previous handoff's `512` topology value was only an expectation. The actual shared policy is:

```ts
Math.max(16, Math.round(Math.min(width, height) / 2))
```

For `4096 x 2048`, the canonical result is therefore `1024`.

### Stale prepared-data protection

Before package assembly, `scripts/build-sol-reference-pipeline.ts` now rejects a prepared Earth bundle unless it matches the requested target and contains the maintained minimum source-backed layer set:

- elevation;
- derived water mask;
- Koppen-backed biome codes;
- derived wetness;
- permanent ice.

This prevents `--prepared-only` workflows, including the Parchment publisher, from silently relabeling an older lower-resolution Earth cache as the Ultra reference.

### Cost evidence instrumentation

The Sol pipeline report now records:

- total elapsed time;
- elapsed time per pipeline stage;
- Earth bundle total byte size;
- per-file Earth bundle byte size and SHA-256;
- final `.wforge` byte size and SHA-256, as before.

The Earth bundle evidence is also printed before package assembly. If package creation becomes the failure point, the normalized source-bundle size remains visible in the build log.

## Source-resolution rationale

The current source stack remains sufficient for Ultra without inventing detail:

- NOAA ETOPO 2022 v1 60 arc-second global Ice Surface elevation/bathymetry, approximately `21600 x 10800` native angular sampling;
- Beck et al. Koppen-Geiger 1991-2020 climate classification at 1 km, materially finer than the `4096 x 2048` target.

The limiting question is now package/runtime cost, not source resolution.

## Important eager-memory signal

The existing import path eagerly materializes both projected map layers and cubed-sphere topology layers.

At the maintained target:

- map raster cells: `8,388,608`;
- topology cells at resolution 1024: `6,291,456`.

From the current typed-array contracts alone, before source arrays, JS object overhead, JSON conversion, ZIP buffers, renderer copies, or browser duplication:

- projected Map layers are approximately `400 MiB`;
- topology-layer arrays are approximately `228 MiB`;
- cubed-sphere geometry/neighbors are approximately `240 MiB` during import/build.

These are contract-derived preflight estimates, not measured peak-process memory. They are evidence that the Ultra run may expose the eager-loading/JSON-package boundary already anticipated by the reference-system roadmap.

Do not lower the target preemptively. Run the source build on a suitable machine and record the actual first failure or measured cost. If package assembly or browser loading is the blocker, treat payload/lazy-loading architecture as the follow-on problem.

## Next active work

Authoritative continuation prompt:

- `refs/handoffs/next-dev-prompt.md`

The next work starts at WP1, not WP0.

### WP1 - build the real normalized Earth bundle

Run the documented ETOPO/Koppen ETL at the maintained defaults. The default Sol source pipeline now supplies `4096 x 2048` and topology `1024` automatically.

### WP2 - assemble the complete Sol package

Mars is an explicit prepared body input. A complete source rebuild should use the existing normal commands in this order:

```bash
python -m pip install -r tools/reference-etl/requirements.txt
npm run reference:prepare-mars
npm run reference:pipeline-sol -- --body-input .local/reference-data/mars-mola-viking
```

The source pipeline prepares Earth and Jupiter and then assembles the multi-body package with the prepared Mars bundle. Do not omit the Mars `--body-input` when creating the maintained Sol package.

### WP3 - World Forge browser acceptance

Verify Earth Map, Globe, Explorer, save/reopen, active-body continuity, and at least Jupiter and Mars in the same project.

### WP4 - Parchment starter

After the complete `.wforge` is accepted, republish through:

```bash
npm run reference:publish-sol-starter
```

The publisher uses the prepared Mars bundle and now refuses a stale Earth bundle.

### WP5 - measure cost

Capture:

- Earth ETL elapsed time;
- prepared bundle dimensions and file sizes;
- package build elapsed time;
- final `.wforge` size and digest;
- `.pworld` size when rebuilt;
- browser import/open time;
- save/reopen time;
- approximate memory impact where practical;
- Map and Globe responsiveness.

## Validation boundary at this checkpoint

Do not claim this checkpoint is fully validated yet.

The current execution environment could write through the GitHub connector but could not obtain a normal local Git checkout or execute the source ETL/package build. Exact-head push CI was not available through the connector's commit-status surface at the time of handoff.

Required before accepting the milestone:

```bash
npm run verify
```

Also run focused tests for:

- `scripts/build-sol-reference-pipeline.test.ts`;
- package roundtrip/body-awareness tests touched by the rebuilt fixture;
- starter-publisher behavior.

Browser QA is mandatory before the Ultra Earth reference is accepted.

## Earth semantic boundary

Retain the existing reference semantics:

- elevation/bathymetry from ETOPO;
- water mask derived from elevation and sea level;
- broad biome identity derived from source-backed Koppen-Geiger classes;
- wetness derived from Koppen classes;
- permanent ice derived from EF;
- mountains driven by imported elevation.

Do not claim that hydrography, measured precipitation, detailed land cover, tectonics, real wind/current fields, or complete temperature climatology are solved by this increment.

## Guardrails

- One Sol system remains one World Forge project.
- Preserve deterministic body IDs and Parchment bindings.
- Do not create a second resolution policy.
- Do not change ordinary generated-world defaults.
- Do not drop Jupiter or Mars while rebuilding Earth.
- Do not create an Earth-only maintained `.wforge`.
- Do not replace imported Earth layers with procedural climate output.
- Do not silently lower the Ultra target to avoid observing package or memory cost.
- Do not broaden into climate calibration, hydrography ingestion, renderer rewrites, or TTRPG polish without concrete blocker evidence and owner approval.

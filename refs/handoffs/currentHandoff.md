# Current Handoff: Sol Reference System

Updated: 2026-08-04

Status: Jupiter smooth oblate Globe geometry and native System selector hierarchy passed user browser QA. The Earth ETL now supports imported source-backed climate classification and derived biome, wetness, and permanent-ice layers. That imported-data path is accepted for continued Sol reference development. A separate Earth climate-calibration benchmark has been defined as non-blocking enrichment work. The first unified source-to-`.wforge` pipeline increment is implemented and repository validation passed. Local source-data execution, refreshed Parchment embedding, browser acceptance, and performance measurements remain.

## Read first

1. `refs/handoffs/reference-system-etl-and-multi-body-navigation.md`
2. `refs/handoffs/system-view-body-catalog-alignment.md`
3. `refs/testing/sol-reference-pipeline.md`
4. `refs/testing/sol-atmospheric-geometry-and-selector-qa.md`
5. `refs/testing/sol-earth-biome-and-selector-stability-qa.md`
6. `refs/research/reference-data/earth-reference-data.md`
7. `refs/planning/body-detail-tiers-and-payload-strategy.md`
8. `refs/handoffs/earth-climate-calibration-benchmark.md` for the independent, non-blocking climate-logic enrichment track
9. World Forge issue #124
10. Parchment Worlds issue #22

## Accepted runtime QA checkpoint

```text
a40925d619c44ed236f6a545551531a6c6942679
```

User-confirmed at that checkpoint:

- Jupiter's smooth oblate silhouette looks correct;
- imported Jupiter banding remains visually successful;
- Earth geographic rendering looks unchanged from the earlier accepted view;
- moons are clearly nested beneath parent worlds in the native selector;
- canonical body names remain intact;
- Parchment Earth and Jupiter assets still enter one `.wforge` system.

## Current pipeline implementation checkpoint

```text
6130bfdd2575e375dd4d1610dd2450f9eec8a853
```

Validation run `30965582824` passed:

- repository typecheck;
- unit and integration tests, including the new Sol pipeline tests;
- production page harness smoke;
- production attribution rerank smoke.

The implementation adds:

- `npm run reference:build-sol`, the correctly named normal exporter entry point;
- `npm run reference:pipeline-sol`, the unified Earth ETL, Jupiter ETL, and normal `.wforge` export path;
- `--prepared-only` mode for rebuilding from staged normalized bundles;
- explicit local source-file overrides;
- a sidecar pipeline report containing source-manifest and package sizes, SHA-256 values, stage names, parameters, and elapsed time;
- `refs/testing/sol-reference-pipeline.md` as the command and acceptance contract.

The compatibility alias `reference:build-earth` remains temporarily, but new work should use the Sol-named commands.

## Accepted Earth data direction

The earlier Earth bundle imported ETOPO elevation and derived the water mask while using placeholder temperature, wetness, ice, and biome layers. This explained missing recognizable climate regions such as the Sahara.

The Earth ETL now supports the Beck et al. 1991-2020 Koppen-Geiger classification and derives World Forge biome, wetness, and permanent-ice layers from it.

This imported-data direction is accepted for the Sol reference fixture. Rebuilding and visually accepting the refreshed fixture may proceed without waiting for improvements to World Forge's procedural climate algorithms.

A separate handoff, `refs/handoffs/earth-climate-calibration-benchmark.md`, describes using Earth topology and observed climate as a benchmark for generic climate-logic enrichment. That work:

- is a side project;
- must meet its own Definition of Ready before material implementation;
- must not block Sol system development;
- must not block acceptance or distribution of imported Earth data;
- must not mutate the accepted reference fixture during experiments.

## Intermittent selector flicker

Selecting a body sometimes produces flicker and degraded response until a different body is selected. No stable body-specific pattern has been observed.

The selector hierarchy integration now uses idempotent repair that:

- re-applies hierarchy only when React or the browser rewrites an option;
- observes option-tree mutations without continuously changing an already-correct selector;
- records selection count, last selected body, hierarchy passes, and repair counts on the System viewer for browser diagnosis.

Do not mark the flicker closed until repeated keyboard and pointer selection passes remain stable in the deployed browser runtime. This QA can run alongside pipeline work and should not prevent source-project or package-pipeline implementation.

## Active pipeline slice

The durable path is now:

```text
approved source datasets and curated Sol facts
  -> reference ETL outputs
  -> deterministic one-system World Forge source project
  -> normal `.wforge` exporter
  -> Parchment starter `.pworld` embedding
  -> normal Parchment import
  -> permanent regression fixtures and evidence
```

The World Forge side of this path is implemented for the accepted Earth-plus-Jupiter baseline. The next acceptance work is to execute it with approved source access and carry the output through Parchment.

### Standard World Forge command

```powershell
python -m pip install -r tools/reference-etl/requirements.txt
npm run reference:pipeline-sol
```

Expected outputs:

```text
.local/reference-data/sol-earth-reference.wforge
.local/reference-data/sol-earth-reference.wforge.pipeline.json
```

### Required remaining outcomes

- run the unified command against approved Earth and Jupiter sources;
- confirm unchanged staged inputs produce the same `.wforge` digest in `--prepared-only` mode;
- verify the report records nonzero input and output sizes and SHA-256 values;
- generate the Parchment starter through `npm run generate:sol-starter` using the sibling package;
- record `.wforge` and `.pworld` size and digest;
- import through the normal Parchment UI path;
- confirm Earth, Jupiter, active-body behavior, and refreshed imported climate layers survive;
- record World Forge package build time, Parchment packaging/import time, and browser memory;
- decide from measured evidence whether lazy per-body loading is required before adding Mars, Venus, and Luna.

## CI boundary

World Forge CI validates the command parser, stage planning, exporter integration, and existing runtime behavior without downloading large upstream datasets.

Parchment's isolated CI runner does not contain the sibling generated `.wforge`. Its workflow therefore uses the explicit `verify:metadata-only` path. Normal development and release builds continue to require the enriched World Forge package and fail clearly when it is absent. Metadata-only CI is not a fallback used by the shipped starter pipeline.

## Immediate acceptance sequence

1. Run `npm run reference:pipeline-sol` in World Forge with approved source access.
2. Capture the generated pipeline report and repeat with `--prepared-only` to verify package digest stability.
3. Run repeated planet, moon, belt, and star selection with mouse and keyboard; capture `data-system-selector-*` diagnostics if flicker recurs.
4. Confirm major imported climate regions appear in Earth Map and Globe.
5. Run `npm run generate:sol-starter` in the sibling Parchment checkout.
6. Import the generated `.pworld` through the ordinary UI.
7. Confirm Earth and Jupiter open from the same nested `.wforge`, with the requested active body and refreshed Earth layers.
8. Record package size, load/import time, and browser memory.

## Next work after pipeline acceptance

1. Add lazy per-body package loading if the measured fixture justifies it.
2. Add Mars and Venus near normal map resolution where source and performance permit.
3. Add Luna and the generic compact solid-body renderer.
4. Continue through the remaining giants, moons, irregular bodies, and belts.
5. Run the separate Earth climate-calibration track when its Definition of Ready is accepted and capacity is available.

## Guardrails

- One system is one project.
- Parchment body assets are body nodes, not independent systems.
- Atmospheric bodies must not use terrain displacement.
- Imported facts and derived classifications must remain distinguishable.
- Unsupported views must never silently switch to Earth.
- Use the normal exporter and normal Parchment import path for release fixtures.
- Do not let climate-calibration experiments delay or destabilize the Sol fixture pipeline.
- Do not silently substitute a metadata-only starter for normal development or release packaging.
- Keep refs and issue threads current with every accepted increment.

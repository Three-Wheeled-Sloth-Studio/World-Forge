# Current Handoff: Sol Reference System

Updated: 2026-08-04

Status: Jupiter smooth oblate Globe geometry and native System selector hierarchy passed user browser QA. The Earth ETL now supports imported source-backed climate classification and derived biome, wetness, and permanent-ice layers. That imported-data path is accepted for continued Sol reference development. A separate Earth climate-calibration benchmark has been defined as non-blocking enrichment work. An intermittent selector flicker remains under browser acceptance with idempotent hierarchy repair and diagnostic counters.

## Read first

1. `refs/handoffs/reference-system-etl-and-multi-body-navigation.md`
2. `refs/handoffs/system-view-body-catalog-alignment.md`
3. `refs/testing/sol-atmospheric-geometry-and-selector-qa.md`
4. `refs/testing/sol-earth-biome-and-selector-stability-qa.md`
5. `refs/research/reference-data/earth-reference-data.md`
6. `refs/planning/body-detail-tiers-and-payload-strategy.md`
7. `refs/handoffs/earth-climate-calibration-benchmark.md` for the independent, non-blocking climate-logic enrichment track
8. World Forge issue #124
9. Parchment Worlds issue #22

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

Build a deterministic, documented, one-command path that takes approved source inputs through the normal product boundaries:

```text
approved source datasets and curated Sol facts
  -> reference ETL outputs
  -> deterministic one-system World Forge source project
  -> normal `.wforge` exporter
  -> Parchment starter `.pworld` embedding
  -> normal Parchment import
  -> permanent regression fixtures and evidence
```

The first pipeline target should preserve the already demonstrated Earth and Jupiter system while replacing ad hoc or partially manual fixture assembly with an explicit repeatable build.

### Required outcomes

- one source-controlled Sol project definition owns the star, bodies, stable IDs, parent relationships, primary-body role, provenance, and simplification notes;
- Earth ETL output is consumed without hand-copying generated arrays;
- Jupiter's accepted atmospheric presentation is consumed through the same body-import boundary;
- the source project exports through the normal World Forge `.wforge` exporter rather than a test-only ZIP writer;
- Parchment embeds the resulting `.wforge` through its normal package model;
- the starter package and regression fixture are derived from the same declared pipeline output;
- deterministic checksums or equivalent signatures make fixture drift explicit;
- build commands, staged inputs, generated outputs, and intentionally uncommitted large source assets are documented;
- package size, build duration, import duration, and browser memory are recorded before broad body expansion.

## Immediate acceptance sequence

1. Run repeated planet, moon, belt, and star selection with mouse and keyboard.
2. Confirm no selection leaves the canvas flickering or sluggish; capture `data-system-selector-*` diagnostics if it recurs.
3. Complete the deterministic shared Sol source-to-`.wforge` build path.
4. Rebuild Earth using the accepted source-backed climate-region ETL.
5. Confirm major imported climate regions appear in Map and Globe.
6. Embed the same `.wforge` in the Parchment starter `.pworld` through the normal package path.
7. Import through Parchment and confirm Earth, Jupiter, active-body behavior, and refreshed layers survive.
8. Record package size, load/import time, and browser memory.

## Next work after the pipeline slice

1. Add lazy per-body package loading before broad reference-body expansion if the measured fixture justifies it.
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
- Keep refs and issue threads current with every accepted increment.

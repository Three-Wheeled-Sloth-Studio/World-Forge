# Current Handoff: Sol Reference System

Updated: 2026-08-04

Status: Jupiter smooth oblate Globe geometry and native System selector hierarchy passed user browser QA. Earth geography remains recognizable, but the accepted fixture exposes placeholder climate data: Africa lacks the expected desert regions because the current package contains imported elevation plus derived placeholder wetness and biomes. An intermittent selector flicker is under stabilization with idempotent hierarchy repair and diagnostic counters.

## Read first

1. `refs/handoffs/reference-system-etl-and-multi-body-navigation.md`
2. `refs/handoffs/system-view-body-catalog-alignment.md`
3. `refs/testing/sol-atmospheric-geometry-and-selector-qa.md`
4. `refs/testing/sol-earth-biome-and-selector-stability-qa.md`
5. `refs/research/reference-data/earth-reference-data.md`
6. `refs/planning/body-detail-tiers-and-payload-strategy.md`
7. World Forge issue #124
8. Parchment Worlds issue #22

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

## Newly confirmed gaps

### Earth climate and biome fidelity

The current Earth bundle imports ETOPO elevation and derives the water mask. Its temperature, wetness, ice, and biome layers were placeholders. This explains missing recognizable climate regions such as the Sahara.

The Earth ETL now supports the Beck et al. 1991-2020 Koppen-Geiger classification and derives World Forge biome, wetness, and permanent-ice layers from it. The shared Sol fixture must be rebuilt and browser-tested before this gap is closed.

### Intermittent selector flicker

Selecting a body sometimes produces flicker and degraded response until a different body is selected. No stable body-specific pattern has been observed.

The selector hierarchy integration is being changed from a one-shot post-render mutation to idempotent repair that:

- re-applies hierarchy only when React or the browser rewrites an option;
- observes option-tree mutations without continuously changing an already-correct selector;
- records selection count, last selected body, hierarchy passes, and repair counts on the System viewer for browser diagnosis.

Do not mark the flicker closed until repeated keyboard and pointer selection passes remain stable in the deployed browser runtime.

## Immediate acceptance sequence

1. Repeatedly select planets, moons, belts, and the star with mouse and keyboard.
2. Confirm no selection leaves the canvas flickering or sluggish.
3. Capture `data-system-selector-*` diagnostics if the defect recurs.
4. Rebuild Earth with the source-backed climate-region ETL.
5. Confirm Sahara, Arabian, Australian, and other major arid regions appear in Map and Globe.
6. Save and reopen through Parchment and confirm active body plus refreshed Earth layers survive.

## Next work after acceptance

1. Measure enriched `.wforge` and `.pworld` size, load time, and browser memory.
2. Add lazy per-body package loading before broad reference-body expansion.
3. Add Mars and Venus near normal map resolution where source and performance permit.
4. Add Luna and the generic compact solid-body renderer.
5. Continue through the remaining giants, moons, irregular bodies, and belts.

## Guardrails

- One system is one project.
- Parchment body assets are body nodes, not independent systems.
- Atmospheric bodies must not use terrain displacement.
- Imported facts and derived classifications must remain distinguishable.
- Unsupported views must never silently switch to Earth.
- Keep refs and issue threads current with every accepted increment.

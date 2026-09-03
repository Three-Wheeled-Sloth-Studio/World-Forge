---
type: "Testing Reference"
title: "Sol Earth biome and selector stability QA"
tags:
- world-forge
- testing
---
# Sol Earth biome and selector stability QA

Updated: 2026-08-04
Status: Implementation validation pending browser acceptance

## Scope

This pass covers two findings from browser QA of the accepted Jupiter and hierarchy increment:

1. Earth lacks recognizable desert regions because its climate and biome layers are placeholders.
2. Body selection intermittently causes canvas flicker and degraded response until another body is selected.

Jupiter geometry and banding are already accepted and are regression-only in this pass.

## Automated checks

Run:

```bash
npm run validate
npm run build
python -m py_compile tools/reference-etl/prepare_etopo_earth.py
```

For ETL validation, run the Earth preparer against known local ETOPO and Koppen-Geiger inputs and inspect `manifest.json` for:

- `biomeCodes` with origin `derived`;
- `wetness` with origin `derived`;
- `iceMask` with origin `derived`;
- both ETOPO and Koppen-Geiger source records;
- non-zero desert land share;
- non-zero rainforest land share.

## Selector stability acceptance

Open the shared Sol system in the deployed browser runtime.

Test both pointer and keyboard selection across:

- Sol;
- Mercury, Earth, Jupiter, and Neptune;
- Luna and at least one moon of Jupiter or Saturn;
- the main asteroid belt or another belt entry.

Repeat the sequence at least five times without reloading.

Accept only when:

- the canvas remains stable after every selection;
- controls remain responsive;
- simulation motion remains continuous;
- selected-body details update once per selection;
- moon indentation remains visible;
- option values remain stable IDs;
- keyboard selection does not trigger additional visual churn.

If flicker recurs, capture these attributes from `.system-viewer` before selecting another body:

- `data-system-selected-body`;
- `data-system-focused-body`;
- `data-system-selector-change-count`;
- `data-system-selector-last-body`;
- `data-system-selector-hierarchy-passes`;
- `data-system-selector-last-repair-count`;
- `data-system-selected-body-material` from the render surface when available.

Also record whether simulation playback was active and whether the selected body had generated detail.

## Earth biome acceptance

Rebuild the Earth reference bundle without `--skip-koppen`, rebuild the Sol `.wforge`, and reopen it through Parchment Worlds.

Inspect Biome mode in Map and Globe.

Accept only when:

- the Sahara is a large contiguous desert region across northern Africa;
- the Arabian Peninsula is predominantly desert;
- interior Australia contains a substantial arid region;
- the Atacama and western North American arid belts are visible at the selected resolution;
- Amazon, Congo, and Southeast Asian humid tropical regions remain visibly wetter than adjacent savanna or grassland;
- Antarctica and Greenland retain permanent ice;
- high mountain systems retain mountain classification from elevation;
- coastlines and geographic relief remain unchanged from the accepted ETOPO fixture;
- save and reopen preserve Earth biome and wetness arrays.

## Jupiter regression

Confirm only that:

- Jupiter remains smooth and oblate;
- banding remains recognizable;
- no geographic terrain displacement returns;
- rings, where present on other giants, remain separate geometry.

## Not yet claimed

This increment does not claim:

- measured precipitation;
- measured soil moisture;
- ecological land-cover fidelity below the compact World Forge biome taxonomy;
- real rivers, lakes, winds, or currents;
- final resolution or package-size acceptance.

# Next Dev Prompt: Ultra Earth Reference Baseline

Continue implementation in:

`https://github.com/Three-Wheeled-Sloth-Studio/World-Forge`

Work directly on `dev`.

## Accepted starting point

Start from the accepted runtime/presentation checkpoint:

- commit: `b0197a4669d605ecd771810f589feae109bb94e3`
- visible version: `0.3.80`
- authoritative CI: Validate World Forge run `#844` / run id `31980878852`
- 143 test files passed
- 517 tests passed
- typecheck/build, production harness tests, and both production smokes green

If `dev` has moved, inspect the intervening commits before writing and preserve unrelated accepted work.

## Read first

1. `AGENTS.md`
2. `refs/README.md`
3. `refs/project.yaml`
4. `refs/handoffs/currentHandoff.md`
5. `refs/handoffs/reference-system-etl-and-multi-body-navigation.md`
6. `refs/research/reference-data/earth-reference-data.md`
7. `refs/planning/reference-system-etl-and-multi-body-navigation.md`
8. `refs/testing/validationCommands.yaml`
9. `scripts/build-sol-reference-pipeline.ts`
10. `scripts/build-earth-reference.ts`
11. `scripts/publish-sol-starter.ts`
12. `tools/reference-etl/prepare_etopo_earth.py`
13. World Forge issue #124
14. Parchment Worlds issue #22 if the sibling repository is available

## Primary goal

Redo the maintained Earth reference baseline at the **highest standard World Forge map resolution that is honestly supported by the current source data**.

The target is:

- **Earth raster: Ultra 4096 x 2048**
- **Earth cubed-sphere topology: expected 512**, but use the canonical `topologyResolutionForOutput(...)` policy/helper if it resolves differently. Do not create a second hardcoded resolution policy.

Do not exceed 4096 x 2048 in this increment. The purpose is to align the maintained Earth baseline with World Forge's highest existing standard resolution, not to add a new special-purpose GIS resolution tier.

## Why 4096 x 2048 is source-supported

The current Earth ETL uses:

- NOAA ETOPO 2022 v1, 60 arc-second global Ice Surface elevation/bathymetry;
- Beck et al. Koppen-Geiger 1991-2020 climate classification at 1 km.

A 60 arc-second global raster is approximately 21600 x 10800 at native angular sampling. The 1 km Koppen-Geiger source is also materially finer than a 4096 x 2048 global equirectangular target. Therefore the existing source stack supports the current World Forge Ultra tier without upsampling beyond the coarser source's useful information content.

The limiting questions for this increment are package/runtime cost and integration behavior, not source resolution.

## Current pipeline mismatch to resolve

There are inconsistent defaults today:

- `tools/reference-etl/prepare_etopo_earth.py` defaults to 2048 x 1024 and topology 256;
- `scripts/build-sol-reference-pipeline.ts` defaults to 512 x 256 and topology 64;
- the desktop's highest standard map option is Ultra 4096 x 2048.

Make the maintained Earth-reference build target explicit and testable. Prefer one canonical reference-resolution definition consumed by the source-to-package pipeline rather than silently changing multiple unrelated defaults.

The ordinary fictional-world generation default remains 1024 x 512. Do **not** change generated-world quality defaults as part of this work.

## Required implementation sequence

### WP0: Establish the exact reference-resolution contract

- locate and use the existing output-to-topology resolution policy;
- prove the canonical topology target for 4096 x 2048, expected to be 512;
- add focused tests for the maintained Earth reference target;
- keep ordinary generation-resolution behavior unchanged.

### WP1: Rebuild the normalized Earth source bundle

Run the normal ETL from the documented sources at 4096 x 2048.

The bundle must continue to contain, at minimum:

- ETOPO elevation/bathymetry;
- derived water mask;
- Koppen-Geiger-backed biome classification;
- derived wetness;
- permanent ice;
- imported/derived provenance in the manifest.

Do not substitute procedural climate output for the imported reference layers. The independent Earth climate-calibration benchmark remains a separate side project.

### WP2: Rebuild the complete Sol `.wforge`

Use the normal multi-body package pipeline.

Preserve all currently accepted non-Earth content, including the prepared Jupiter appearance and currently packaged Mars reference assets. Do not accidentally turn this into an Earth-only package.

Preferred path is the existing source-to-package/reference pipeline, with explicit Earth resolution parameters where needed.

Record:

- prepared Earth bundle dimensions;
- topology resolution;
- normalized bundle byte sizes;
- final `.wforge` byte size and digest;
- build/ETL elapsed time;
- any material compression behavior.

### WP3: Verify Map, Globe, Explorer, save/reopen, and body continuity

The higher-resolution Earth must work through the normal body-aware application path.

At minimum verify:

- Earth is recognizable in Data and Natural Map modes;
- Globe uses the same refreshed Earth surface;
- Explorer/geographic drilldown opens against Earth without silently falling back to another body or stale raster;
- active-body behavior remains correct across System, Globe, Map, and Explorer;
- `.wforge` save/reopen preserves Earth arrays and body identity;
- Jupiter and Mars remain available in the same Sol project.

Do not create Earth-specific renderer paths to make the higher resolution work.

### WP4: Republish and verify the Parchment Worlds Sol starter

Use `npm run reference:publish-sol-starter` or the current canonical equivalent.

The published Parchment starter must embed the rebuilt World Forge Sol package, not an older cached package.

Verify through the normal Parchment-to-World-Forge entry path when the sibling repository is available:

- Sol starter opens;
- Earth opens at the new baseline;
- another packaged body still opens correctly;
- the nested `.wforge` survives export/re-import.

### WP5: Measure the cost instead of guessing

4096 x 2048 is intentionally much larger than the old baseline. Capture evidence for:

- source ETL time;
- `.wforge` package size;
- Parchment `.pworld` size if rebuilt;
- browser import/open time;
- save/reopen time;
- approximate memory impact where practical;
- Map and Globe responsiveness;
- whether current eager package loading becomes a material problem.

Do not lower the reference resolution merely because the package is larger. If the higher-resolution baseline exposes a loading/memory problem, document the evidence and identify lazy loading or payload strategy as the follow-on architecture problem.

## Earth acceptance checks

The rebuilt reference should retain or improve the accepted recognizable-Earth checks:

- Africa, Eurasia, the Americas, Australia, Antarctica, and major islands are recognizable;
- Sahara and Arabian deserts remain broad contiguous arid regions;
- Amazon, Congo, and Southeast Asian humid tropical regions remain visible;
- permanent ice is concentrated appropriately in Antarctica/Greenland rather than flooding ordinary land;
- imported elevation drives major mountain regions;
- coastlines materially benefit from the higher raster resolution;
- Map and Globe agree on land/water and broad biome identity.

Do not claim that the current Earth reference has real hydrography, measured precipitation, real land-cover, or complete temperature climatology. Those source layers remain separate future work unless explicitly reopened.

## Validation

Run focused tests first, then follow `refs/testing/validationCommands.yaml`.

Before declaring the milestone complete, run at least:

```bash
npm run verify
```

Also run the focused reference pipeline, package roundtrip, body-awareness, and published-starter tests touched by the increment.

`npm run evaluate:regions` is required only if geographic partitioning/tile-window generation behavior is changed. A higher-resolution imported Earth fixture by itself is not permission to rewrite the geographic partitioner.

Browser QA is mandatory for the rebuilt Earth and the Parchment starter.

## Guardrails

- One Sol system remains one World Forge project.
- Do not split high-resolution Earth into a separate `.wforge` project.
- Do not drop Jupiter, Mars, or other accepted body records/assets from the package.
- Do not create a second resolution policy.
- Do not change ordinary generated-world defaults.
- Do not feed imported Koppen/biome/wetness/ice into the generic climate-calibration candidate path.
- Do not start new Earth data-source ingestion unless the current source stack cannot support the required baseline.
- Do not broaden this into climate-model calibration, hydrography import, lazy-loading implementation, or renderer rewrites unless concrete 4096 x 2048 evidence proves one is a blocker and the owner explicitly approves the scope change.
- Preserve deterministic IDs, body identity, package contracts, and Parchment bindings.

## Deferred presentation TODOs

Do not spend this increment on these unless the Earth rebuild is complete and the owner explicitly asks to return to them:

1. **TTRPG water wash**: v0.3.80 is still too dark/heavy. Desired direction is a very light, subtle watercolor wash while retaining clear coastline separation.
2. **TTRPG icon anchoring/alignment**: terrain symbols are visibly misaligned in places. Improve placement/anchor semantics later; do not change geography to make icons line up.

The overall TTRPG direction is good enough to park while the Earth baseline is rebuilt.

## Deliverables

1. source-backed Earth bundle at 4096 x 2048;
2. canonical topology pairing recorded and tested;
3. rebuilt complete Sol `.wforge` through the normal pipeline;
4. updated Parchment Sol starter through the normal publisher;
5. size/time/memory/load evidence;
6. automated regression coverage;
7. browser QA notes for Earth Map, Globe, Explorer, save/reopen, and Parchment entry;
8. updated `refs/research/reference-data/earth-reference-data.md` with the accepted baseline dimensions and measured package costs;
9. updated `refs/handoffs/currentHandoff.md` with exact commit, package digest, validation evidence, and remaining risks.

## Definition of done

This increment is done when the maintained Earth reference and published Sol starter use the accepted 4096 x 2048 Earth baseline, the full multi-body package remains intact, automated validation is green, and browser QA confirms the higher-resolution Earth works through the normal World Forge and Parchment flows without reverting to stale lower-resolution data.

# Next Dev Prompt: Ultra Earth Reference Baseline

Continue implementation in:

`https://github.com/Three-Wheeled-Sloth-Studio/World-Forge`

Work directly on `dev`.

## Current starting point

The last fully accepted runtime/presentation baseline before this increment is:

- commit: `b0197a4669d605ecd771810f589feae109bb94e3`
- visible version: `0.3.80`
- Validate World Forge run `#844` / run id `31980878852`
- 143 test files passed
- 517 tests passed
- typecheck/build, production harness tests, and both production smokes green

The current Ultra Earth implementation checkpoint is:

- `f9e8f73afdf0a71003dbf80030dd4a7afcf581f0`

Read intervening commits before writing if `dev` has moved.

## Read first

1. `AGENTS.md`
2. `refs/README.md`
3. `refs/project.yaml`
4. `refs/handoffs/currentHandoff.md`
5. `refs/handoffs/reference-system-etl-and-multi-body-navigation.md`
6. `refs/research/reference-data/earth-reference-data.md`
7. `refs/planning/reference-system-etl-and-multi-body-navigation.md`
8. `refs/testing/validationCommands.yaml`
9. `scripts/reference-resolution.ts`
10. `scripts/build-sol-reference-pipeline.ts`
11. `scripts/build-earth-reference.ts`
12. `scripts/publish-sol-starter.ts`
13. `tools/reference-etl/prepare_etopo_earth.py`
14. World Forge issue #124
15. Parchment Worlds issue #22 if the sibling repository is available

## Primary goal

Complete the maintained Earth reference baseline at the highest standard World Forge map resolution honestly supported by the current source data:

- Earth raster: **Ultra 4096 x 2048**
- Earth cubed-sphere topology: **1024**

The topology value is no longer an estimate. The existing canonical shared policy is:

```ts
Math.max(16, Math.round(Math.min(width, height) / 2))
```

Therefore `topologyResolutionForOutput({ width: 4096, height: 2048 })` resolves to `1024`.

Do not add another topology rule and do not reduce this value merely because the resulting package is expensive. If it exposes an architecture limit, measure and document that limit.

## Source-resolution rationale

The current Earth ETL uses:

- NOAA ETOPO 2022 v1 60 arc-second global Ice Surface elevation/bathymetry;
- Beck et al. Koppen-Geiger 1991-2020 climate classification at 1 km.

ETOPO 60 arc-second global sampling is approximately `21600 x 10800`, and the Koppen-Geiger source is also materially finer than `4096 x 2048`. Ultra therefore remains source-honest without adding a new GIS-only resolution tier.

The open questions are package size, memory, load/save behavior, and integration cost.

## WP0 is complete - do not redo it unless validation fails

Implemented on `dev`:

- `scripts/reference-resolution.ts` defines the maintained `4096 x 2048` Earth target;
- the Sol source pipeline derives topology through the existing shared policy;
- comparison raster overrides also derive topology canonically unless explicitly overridden;
- the maintained default resolves to topology `1024`;
- ordinary generated-world defaults are unchanged;
- the pipeline rejects stale Earth bundles with the wrong dimensions or topology;
- the pipeline rejects bundles missing elevation, water, biome, wetness, or permanent-ice layers;
- the pipeline records stage elapsed times;
- the pipeline records Earth bundle total/per-file size and digests before package assembly;
- the Parchment prepared-package path inherits the stale-Earth guard.

Relevant commits:

- `5762eb03bf107c94284546bf64b19a01b2e67404`
- `d9201cea5bee0f925c81906823f771f69fc04277`
- `f9e8f73afdf0a71003dbf80030dd4a7afcf581f0`

Do not claim these commits have completed the real source build or browser acceptance. They have not.

## Important cost signal before WP1

At the maintained target:

- map raster cells: `8,388,608`;
- cubed-sphere topology cells: `6,291,456`.

From current typed-array contracts alone, the eager import/build path allocates approximately:

- `400 MiB` for projected Map layers;
- `228 MiB` for topology-layer arrays;
- `240 MiB` for cubed-sphere positions/latitudes/longitudes/weights/neighbors while constructing/importing the reference.

This excludes source arrays, JS object overhead, JSON conversion, ZIP buffers, renderer copies, and browser duplication.

These are static contract-derived estimates, not measured peak-process memory. They are a reason to collect evidence, not permission to lower the target or start a lazy-loading rewrite before the first real run.

## Required continuation sequence

### WP1 - rebuild the normalized Earth source bundle

Run the normal source ETL at the maintained default target.

Install ETL dependencies if needed:

```bash
python -m pip install -r tools/reference-etl/requirements.txt
```

Then run either the Earth adapter directly or, preferably, the full Sol source pipeline described under WP2.

The prepared Earth bundle must contain at minimum:

- ETOPO elevation/bathymetry;
- derived water mask;
- Koppen-Geiger-backed biome classification;
- derived wetness;
- permanent ice;
- imported/derived provenance in the manifest.

Do not use `--skip-koppen` for the maintained fixture. The pipeline now rejects that incomplete result before packaging.

### WP2 - rebuild the complete Sol `.wforge`

Preserve the currently accepted non-Earth content. The maintained package must include Earth, Jupiter, Mars, and the existing system catalog/body records.

Prepare Mars if its local bundle is not already current:

```bash
npm run reference:prepare-mars
```

Then run the source-to-package pipeline with Mars explicitly attached:

```bash
npm run reference:pipeline-sol -- --body-input .local/reference-data/mars-mola-viking
```

The pipeline prepares Earth and Jupiter, validates the Earth bundle, and assembles the multi-body package with Mars.

Do not run the default source pipeline without the Mars `--body-input` and then treat that result as the maintained complete Sol package.

Capture from the generated pipeline report and logs:

- Earth dimensions;
- topology resolution;
- Earth bundle per-file and total byte size;
- Earth/Jupiter/Mars input evidence;
- per-stage elapsed time;
- total elapsed time;
- final `.wforge` byte size and SHA-256.

If package assembly fails due memory, JSON expansion, or process limits, preserve the successful WP1 evidence and record the exact failure. Do not silently rerun at a lower resolution.

### WP3 - World Forge browser acceptance

If package assembly succeeds, verify through the normal body-aware application path:

- Earth recognizable in Data and Natural Map modes;
- Globe uses the same refreshed Earth surface;
- Explorer/geographic drilldown opens against Earth without stale or wrong-body fallback;
- active-body behavior remains correct across System, Globe, Map, and Explorer;
- `.wforge` save/reopen preserves Earth arrays and body identity;
- Jupiter still works;
- Mars still works.

Do not create Earth-specific renderer paths merely to make Ultra load.

### WP4 - republish and verify the Parchment Worlds starter

After the World Forge package is accepted, run:

```bash
npm run reference:publish-sol-starter
```

The publisher reassembles from prepared bundles and now rejects a stale lower-resolution Earth bundle.

When the sibling Parchment repository is available, verify through the normal starter path:

- Sol starter opens;
- Earth opens at Ultra;
- at least one other packaged body opens;
- nested `.wforge` survives export/re-import;
- record `.pworld` byte size.

Do not claim the previously deferred all-body Globe visual baseline is fixed by this work. Issue #22 remains open for those presentation debts.

### WP5 - measure the cost instead of guessing

Record:

- source ETL time;
- package-build time;
- normalized Earth bundle size;
- `.wforge` size;
- `.pworld` size;
- browser import/open time;
- save/reopen time;
- approximate memory impact where practical;
- Map and Globe responsiveness;
- whether eager package loading becomes a material problem.

If the first failing boundary is eager in-memory materialization or JSON layer serialization, document that evidence as the next architecture problem. Do not implement lazy loading in this increment unless the owner explicitly approves that follow-on after seeing the evidence.

## Earth acceptance checks

Retain or improve the accepted recognizable-Earth checks:

- Africa, Eurasia, the Americas, Australia, Antarctica, and major islands recognizable;
- Sahara and Arabian deserts broad and contiguous;
- Amazon, Congo, and Southeast Asian humid tropical regions visible;
- permanent ice concentrated appropriately in Antarctica/Greenland;
- imported elevation drives major mountain regions;
- coastlines materially benefit from the higher raster resolution;
- Map and Globe agree on land/water and broad biome identity.

Do not claim the current reference includes real hydrography, measured precipitation, detailed land cover, tectonic plates, real winds/currents, or complete temperature climatology.

## Validation

Run focused tests first, then follow `refs/testing/validationCommands.yaml`.

At minimum before accepting the milestone:

```bash
npx vitest run scripts/build-sol-reference-pipeline.test.ts scripts/publish-sol-starter.test.ts
npm run verify
```

Run package/body-awareness tests relevant to any additional code touched.

`npm run evaluate:regions` is required only if geographic partitioning or tile-window generation changes.

Browser QA is mandatory before acceptance.

## Current validation boundary

The checkpoint that established WP0 was written through the GitHub connector in an environment where a normal local Git checkout and source ETL execution were unavailable. Do not infer local test, source-build, or browser success from the commits alone.

If repository push CI is green on the exact current head, record the run ID in `refs/handoffs/currentHandoff.md`. Otherwise run the required validation locally before continuing acceptance.

## Guardrails

- One Sol system remains one World Forge project.
- Do not split Ultra Earth into a separate `.wforge`.
- Do not drop Jupiter, Mars, or accepted body records/assets.
- Do not create a second resolution policy.
- Do not change ordinary generated-world defaults.
- Do not feed imported Koppen/biome/wetness/ice into the generic climate-calibration candidate path.
- Do not start new Earth source ingestion merely because Ultra is larger; current sources already support it.
- Do not lower Ultra to avoid package or memory evidence.
- Do not broaden into climate calibration, hydrography import, lazy-loading implementation, renderer rewrites, or TTRPG polish without concrete blocker evidence and owner approval.
- Preserve deterministic IDs, body identity, package contracts, and Parchment bindings.

## Deferred presentation TODOs

Keep parked unless explicitly reopened:

1. TTRPG water wash is still too dark/heavy.
2. TTRPG terrain-icon anchoring/alignment still needs improvement.

## Definition of done

This increment is done only when:

1. the real maintained Earth bundle is `4096 x 2048` with topology `1024`;
2. the complete Sol `.wforge` preserves Earth, Jupiter, Mars, and the body catalog;
3. measured size/time/memory/load evidence is recorded;
4. the Parchment starter embeds the rebuilt package;
5. automated validation is green;
6. browser QA passes Map, Globe, Explorer, save/reopen, active-body continuity, and Parchment entry;
7. `refs/research/reference-data/earth-reference-data.md` and `refs/handoffs/currentHandoff.md` contain the final measured evidence and exact accepted commit/run IDs.

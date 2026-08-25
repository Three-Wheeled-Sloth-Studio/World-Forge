# Current Handoff

Updated: 2026-08-25

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

## Current checkpoint

The Ultra Earth reference is source-built, package-built, presentation-repaired, and now has one canonical maintained Sol build entry point shared by local Parchment startup and hosted automation.

Current validated World Forge checkpoint before this documentation update:

- commit: `5ed9ec5c53d47aea3dbe4d81d9917dd42c4ae058`
- visible runtime: `0.3.81`
- Ultra Earth acceptance run: `32865033525`
- focused Globe/navigation/reference/canonical-Sol/bootstrap regressions passed
- full `npm run verify` passed

Previous v0.3.81 presentation checkpoint:

- commit: `400223bd70227459bff8fbf30c4a4202e0a38789`
- run: `32155132659`
- full `npm run verify`: green

## Maintained Earth contract

The maintained real-Earth reference remains:

- raster: `4096 x 2048`
- cubed-sphere topology: `1024`

Topology is produced by the existing shared `topologyResolutionForOutput(...)` policy. Do not add an Earth-specific topology rule and do not restore the old 512 topology estimate.

Ordinary fictional-world generation defaults are unchanged. The current ordinary default generation quality is `1024 x 512`; `512 x 256` is the lower `Standard` tier.

For an imported `.wforge`, the Generation Quality control loads that project's own config. Therefore an imported Ultra Earth should show `Ultra 4096 x 2048`; seeing `Standard 512 x 256` plus right-panel `Map scale 512 x 256` is evidence that an old 512 package was actually loaded, not merely a cosmetic dropdown default.

## Unified maintained Sol build

World Forge now owns one first-party command for rebuilding the maintained Sol reference:

```text
npm run reference:build-sol
```

The command is implemented by `scripts/build-maintained-sol-reference.ts` and owns the previously leaked multi-command recipe:

1. prepare a repo-local Python environment under `.local/reference-python` when needed;
2. install `tools/reference-etl/requirements.txt` into that local environment when its requirements digest changes;
3. prepare the accepted Mars Viking/MOLA bundle;
4. run the normal source-backed Sol pipeline;
5. prepare Earth at `4096 x 2048` / topology `1024` from the maintained Earth sources;
6. prepare Jupiter;
7. assemble the complete one-project Sol `.wforge` with Mars included;
8. write `.local/reference-data/sol-earth-reference.wforge` and its `.pipeline.json` evidence.

The local Python environment avoids requiring the owner to manually install raster ETL packages into global Python. A base Python 3 installation is still required; `WORLD_FORGE_BOOTSTRAP_PYTHON` can explicitly point at it if `python` is not on PATH.

The Earth/Jupiter source pipeline is retried up to three times after transient failures. Mars is prepared once and is not redundantly rebuilt for each retry. This was added after a hosted run reached the correct Ultra Earth stage but Stanford's Koppen source returned a transient HTTP 504.

The public command is cross-platform and uses `npm.cmd` for child npm invocations on Windows.

Focused coverage lives in:

- `scripts/build-maintained-sol-reference.ts`
- `scripts/maintained-sol-command.test.ts`
- `scripts/build-sol-reference-pipeline.ts`
- `scripts/build-sol-reference-pipeline.test.ts`

The heavy source rebuild is still not part of ordinary World Forge push CI. Exact-head repository validation tests the orchestration and environment-bootstrap contracts without downloading the scientific source bundle.

## Parchment local and hosted integration

Parchment Worlds now owns an `ensure:sol-reference` preflight before its normal Sol starter generation.

Normal local sibling-checkout behavior is:

1. validate any existing automatic `.wforge` as Earth `4096 x 2048`, topology `1024`, with matching pipeline evidence and package byte length;
2. reuse it immediately when valid;
3. if missing or stale, locate `WORLD_FORGE_LOCAL_PATH` or sibling `../World-Forge`;
4. invoke this repository's `npm run reference:build-sol` with the large-package Node heap allowance;
5. let the canonical World Forge command bootstrap its repo-local Python ETL environment if needed;
6. validate the resulting package again;
7. generate the normal enriched Parchment `.pworld`;
8. continue startup.

For the standard sibling layout, once both `World-Forge/dev` and `Parchment-Worlds/dev` are current, the reference build itself no longer requires a separate terminal ritual. Starting Parchment with `npm run dev` is enough to build or reuse the maintained reference automatically.

A first run with no valid local reference may take several minutes and download the maintained public source rasters. Subsequent runs reuse the validated `.wforge` instead of rebuilding it.

Parchment's focused preparation acceptance run `32863452205` passed resolver, valid-package reuse, missing-package build orchestration, stale-512 replacement, and project-model typecheck.

Hosted Parchment deployment clones the matching World Forge branch, exposes that checkout through `WORLD_FORGE_LOCAL_PATH`, and lets the same Parchment preflight invoke the same canonical World Forge command. Local and hosted no longer maintain separate Mars/Earth command recipes.

## Source-backed build evidence

The accepted measured Ultra source build remains World Forge Actions run `32136329836`:

- Earth bundle: `92,277,263` bytes
- Earth raster: `4096 x 2048`
- topology: `1024`
- complete Sol body count: `23`
- final `.wforge`: `193,507,559` bytes
- source-to-package wall time: `1:48.23`
- peak RSS: about `5.65 GiB`

Measured Earth summary from that run:

- minimum elevation: `-10250.2744 m`
- maximum elevation: `6320.3843 m`
- water share: `0.6590461`
- Koppen class count: `31`
- desert land share: `0.1178108`
- rainforest land share: `0.0427358`
- mountain land share: `0.0220696`
- mean land wetness: `0.3274100`

Source semantics remain:

- NOAA ETOPO 2022 elevation/bathymetry;
- water mask derived from elevation and sea level;
- Koppen-Geiger-backed broad biome identity;
- wetness derived from Koppen classes;
- EF-derived permanent ice;
- mountains driven by imported elevation.

Do not claim imported hydrography, measured precipitation, complete temperature climatology, tectonics, winds, currents, or ecological land cover.

## Complete Sol package

One project still contains the complete maintained Sol reference:

- body count: `23`
- Earth: Tier 3 geographic surface at `4096 x 2048`
- Jupiter: accepted `768 x 384` atmospheric appearance
- Mars: accepted `512 x 256` Viking/MOLA Tier 2 surface

Do not split Earth or other bodies into separate World Forge projects to address package size.

## Presentation QA repair in v0.3.81

Owner QA found that the first Ultra package could be loaded while presentation still hid some of its detail.

Fixed:

- primary Globe texture was hard-coded to `2048 x 1024`; it now follows source resolution up to the maintained 4096-pixel edge and browser/GPU texture limits;
- ordinary lower-resolution worlds are not upscaled;
- standalone local World Forge now returns to local Parchment instead of production;
- directly opened hosted World Forge remains on its own environment.

Map preview remains independently configurable. For source-resolution visual QA, use:

`Explore -> Layers -> Display -> Preview -> Source resolution`

That control changes rendering detail only. It cannot recover detail from an old 512 source package.

## Parchment/package measurements

The accepted Parchment diagnostic run `32137360931` measured:

- nested `.wforge`: `193,507,559` bytes
- `.pworld`: `258,172,374` bytes
- starter generation: `1:03.30`
- starter generation peak RSS: about `6.9 GiB`
- package-reader inspection: `14.66 s`
- package-reader peak RSS: about `2.0 GiB`

Browser run `32139014646` proved normal starter review, import, reload, nested `.wforge` transfer, and a loaded `4096 x 2048` Earth surface from topology `1024`. Its final red status was an obsolete diagnostic assertion after the package had already loaded, not a package-load failure.

The payload cost is measured architecture debt. Do not lower Earth resolution to hide it.

## Payload architecture follow-up

Payload optimization remains a separate owner-approved follow-up. Recommended order remains:

1. binary typed-layer entries inside `.wforge` instead of JSON numeric arrays;
2. backward-compatible reading of current packages;
3. remeasure package size, import/save time, and browser memory;
4. add staged/lazy hydration only if post-binary measurements still require it;
5. then reconsider Parchment's base64 attachment envelope.

Do not begin this rewrite as part of Ultra visual acceptance without explicit scope direction.

## Remaining owner acceptance

The next owner pass should start from a freshly generated local Parchment Sol starter, not an already-imported old 512 project.

Expected smoke checks on the fresh import:

- World Forge runtime `0.3.81`;
- Generation Quality `Ultra 4096 x 2048`;
- right-panel Map scale `4096 x 2048`;
- Natural Map at `Source resolution` visibly preserves the improved coastline/detail;
- Globe shows the same Earth surface through the source-aware texture path;
- geographic drill-down opens against Earth;
- at least one non-Earth body such as Mars or Jupiter still loads/displays.

Existing Parchment projects that already embedded the old 512 `.wforge` remain old data and should not be used for Ultra acceptance.

## Guardrails

- One Sol system remains one project.
- Preserve deterministic body IDs and Parchment bindings.
- Keep Earth at `4096 x 2048` and topology `1024` unless the product target is deliberately changed.
- Keep ordinary generated-world defaults independent of the maintained Earth fixture.
- Do not drop Jupiter or Mars.
- Do not create Earth-specific renderers or package formats.
- Do not broaden Ultra acceptance into new climate/source ingestion or deferred TTRPG polish.

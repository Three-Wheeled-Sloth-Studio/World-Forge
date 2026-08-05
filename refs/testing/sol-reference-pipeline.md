# Sol reference pipeline

Updated: 2026-08-05
Status: Earth/Jupiter baseline accepted; repeatable prepared-body inputs implemented; Mars real-source execution pending

## Purpose

Provide one explicit World Forge pipeline that takes approved source inputs through reusable preparation stages and the normal multi-body `.wforge` exporter.

The pipeline supports:

- the accepted Earth and Jupiter baseline;
- repeatable prepared-body bundles for Mars, Venus, moons, and later imported bodies;
- one final system package;
- evidence reporting for every attached prepared manifest.

It does not change runtime body identity or create per-body projects.

## Accepted Earth/Jupiter command

From the World Forge repository root:

```powershell
python -m pip install -r tools/reference-etl/requirements.txt
npm run reference:pipeline-sol
```

Defaults:

- Earth raster: `512 x 256`;
- Earth topology resolution: `64`;
- Jupiter appearance: `768 x 384` RGB565;
- Earth climate regions: source-backed Koppen-Geiger import;
- output: `.local/reference-data/sol-earth-reference.wforge`.

The package is produced by `exportMultiBodyWforge`, the normal multi-body exporter.

## Outputs

```text
.local/reference-data/sol-earth-reference.wforge
.local/reference-data/sol-earth-reference.wforge.pipeline.json
```

The report records:

- pipeline mode and stage names;
- start, completion, and elapsed time;
- requested Earth and topology resolution;
- Earth and Jupiter manifest paths, sizes, and SHA-256 values;
- every repeatable prepared-body manifest path, size, and SHA-256;
- output package path, size, and SHA-256;
- `WORLD_FORGE_SOURCE_COMMIT` when supplied.

The report is evidence rather than deterministic package input. The `.wforge` digest is the fixture-drift signal.

## Prepared-body inputs

Any reusable bundle conforming to:

```text
world-forge-reference-body-bundle-v1
```

may be attached with repeatable `--body-input` arguments.

Example with Mars:

```powershell
npm run reference:prepare-mars

npm run reference:pipeline-sol -- `
  --prepared-only `
  --body-input .local/reference-data/mars-mola-viking
```

Multiple bodies:

```powershell
npm run reference:pipeline-sol -- `
  --prepared-only `
  --body-input .local/reference-data/mars-mola-viking `
  --body-input .local/reference-data/venus-magellan-akatsuki `
  --body-input .local/reference-data/luna-reference
```

Body-input directories must be unique. Their manifests and assets are validated by the prepared-body loader and normal exporter.

`--prepared-only` skips Earth and Jupiter source ETL; it does not skip package validation or evidence generation.

## Custom baseline bundles

```powershell
npm run reference:pipeline-sol -- `
  --prepared-only `
  --earth-bundle .local/reference-data/earth-etopo `
  --jupiter-bundle .local/reference-data/jupiter-cassini `
  --body-input .local/reference-data/mars-mola-viking `
  --output .local/reference-data/sol-earth-reference.wforge
```

## Source overrides

The built-in Earth and Jupiter preparation stages may use staged source files:

```powershell
npm run reference:pipeline-sol -- `
  --earth-source C:\reference-data\etopo.tif `
  --koppen-source C:\reference-data\koppen-geiger.tif `
  --jupiter-source C:\reference-data\PIA07782.jpg
```

Body-specific ETL adapters expose their own local source overrides while emitting the same prepared-body schema. For Mars:

```powershell
npm run reference:prepare-mars -- `
  --mola-input C:\reference-data\megt90n000eb.img `
  --viking-input C:\reference-data\Mars_Viking_MDIM21_ClrMosaic_1km.jpg
```

This is the preferred reproducible release shape when upstream files are retained in an approved external cache.

## Resolution overrides

Earth remains independently configurable:

```powershell
npm run reference:pipeline-sol -- `
  --width 1024 `
  --height 512 `
  --topology-resolution 128
```

Mars and future body adapters own their prepared dimensions. Their tier does not prescribe resolution.

Example:

```powershell
npm run reference:prepare-mars -- --width 512 --height 256
```

All equirectangular raster inputs must remain 2:1.

## ETL product boundary

Prepared-body bundles are the durable handoff between source conversion and system assembly.

They are intended to support:

- trusted built-in source adapters;
- command-line conversions;
- future in-application imports;
- future PNG, JPG, WebP, and SVG map conversion workflows.

The application-facing importer will add interview, preview, correction, and ambiguity-resolution UI around the same core stages. It must not create a second package format or alternate exporter.

## Parchment consumption

With sibling checkouts, Parchment Worlds discovers:

```text
../World-Forge/.local/reference-data/sol-earth-reference.wforge
```

Then:

```powershell
npm run generate:sol-starter
```

This embeds the same `.wforge` through the normal `.pworld` path.

## Automated coverage

`scripts/build-sol-reference-pipeline.test.ts` verifies:

- accepted Earth/Jupiter defaults;
- stage ordering;
- prepared-bundle mode;
- portable Node/tsx invocation without Windows `.cmd` spawning;
- repeatable body-input forwarding;
- body-input ordering;
- duplicate body-directory rejection;
- Earth 2:1 validation;
- contradictory and unknown argument rejection.

`scripts/referenceBodyBundle.test.ts` separately verifies prepared-body schema, checksums, paths, numeric semantics, and payload shape.

Source downloads and full package generation remain explicit local or release operations rather than CI dependencies.

## Mars acceptance checklist

- `npm run reference:prepare-mars` completes against official sources;
- Mars manifest records nonzero source and output sizes plus SHA-256 values;
- prepared output contains `albedo.rgb565` and `elevation.i16` at 512 by 256;
- unified prepared-only pipeline accepts the Mars body input;
- report includes the Mars manifest evidence;
- output opens through normal World Forge import;
- Mars remains active through System, Globe, and Map;
- Explorer explicitly remains unsupported;
- package save/reopen and re-export preserve payload bytes and checksums;
- Parchment embeds and imports one coherent Sol system;
- `.wforge` and `.pworld` package deltas are recorded;
- unchanged prepared inputs reproduce the same `.wforge` digest.

## Guardrails

- Do not hand-author the `.wforge` ZIP.
- Do not create one project per body.
- Do not make source ETL a runtime dependency.
- Do not commit downloaded source rasters or generated `.local` output.
- Do not silently omit Jupiter from the standard baseline.
- Do not infer scientific semantics from filenames.
- Do not duplicate ETL transformations in future UI code.
- Do not use this pipeline to gate the separate Earth procedural-climate calibration project.
- Keep `reference:build-earth` as temporary compatibility only; use `reference:build-sol` and `reference:pipeline-sol` in new instructions.

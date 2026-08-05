# Sol reference pipeline

Updated: 2026-08-04
Status: Implementation awaiting repository validation and local source-data execution

## Purpose

Provide one explicit World Forge command that takes the accepted Earth and Jupiter source inputs through the existing reference ETL and the normal multi-body `.wforge` exporter.

This replaces the previously documented manual sequence of preparing Earth, preparing Jupiter, and invoking the Earth-named package builder separately.

The pipeline does not change runtime contracts, body identities, package structure, or Parchment bindings.

## Standard command

From the World Forge repository root:

```powershell
python -m pip install -r tools/reference-etl/requirements.txt
npm run reference:pipeline-sol
```

The command uses the currently accepted integration baseline:

- Earth raster: `512 x 256`;
- Earth topology resolution: `64`;
- Jupiter appearance: the ETL default `768 x 384` RGB565;
- Earth climate regions: source-backed Koppen-Geiger import unless the ETL contract is changed explicitly;
- output package: `.local/reference-data/sol-earth-reference.wforge`.

The package is produced by `exportMultiBodyWforge`, the normal multi-body exporter used by the current fixture path.

## Outputs

### Package

```text
.local/reference-data/sol-earth-reference.wforge
```

### Pipeline report

```text
.local/reference-data/sol-earth-reference.wforge.pipeline.json
```

The report records:

- pipeline mode;
- start, completion, and elapsed time;
- requested Earth and topology resolution;
- Earth prepared-manifest path, size, and SHA-256;
- Jupiter prepared-manifest path, size, and SHA-256;
- output package path, size, and SHA-256;
- executed stage names;
- `WORLD_FORGE_SOURCE_COMMIT` when supplied.

The report is build evidence, not a deterministic package input. Timestamps and elapsed time may vary. The `.wforge` package digest is the fixture-drift signal.

## Prepared-bundle mode

To rebuild the package without redownloading or reprocessing source datasets:

```powershell
npm run reference:pipeline-sol -- --prepared-only
```

Custom prepared bundle directories are supported:

```powershell
npm run reference:pipeline-sol -- `
  --prepared-only `
  --earth-bundle .local/reference-data/earth-etopo `
  --jupiter-bundle .local/reference-data/jupiter-cassini `
  --output .local/reference-data/sol-earth-reference.wforge
```

## Local source overrides

The full pipeline may use staged source files instead of network downloads:

```powershell
npm run reference:pipeline-sol -- `
  --earth-source C:\reference-data\etopo.tif `
  --koppen-source C:\reference-data\koppen-geiger.tif `
  --jupiter-source C:\reference-data\PIA07782.jpg
```

This is the preferred reproducible release-build shape when source files are retained in an approved external cache.

## Resolution override

```powershell
npm run reference:pipeline-sol -- `
  --width 1024 `
  --height 512 `
  --topology-resolution 128
```

The Earth raster must remain 2:1. Resolution studies remain lower priority than broader body coverage and must record package, import, and memory deltas.

## Parchment consumption

With sibling checkouts, Parchment Worlds automatically discovers:

```text
../World-Forge/.local/reference-data/sol-earth-reference.wforge
```

Then, from the Parchment Worlds root:

```powershell
npm run generate:sol-starter
```

That command embeds the same `.wforge` through the normal `.pworld` attachment path. No environment variable is required for standard sibling checkouts.

## Automated coverage

`scripts/build-sol-reference-pipeline.test.ts` verifies:

- accepted baseline defaults;
- Earth, Jupiter, and normal package-build stage ordering;
- prepared-bundle mode;
- Windows and non-Windows npm executable selection;
- argument forwarding to the existing normal package builder;
- 2:1 Earth validation;
- contradictory and unknown argument rejection.

Source downloads and full package generation are not CI requirements. They remain explicit local or release-pipeline operations because the upstream datasets are large.

## Acceptance checklist

- repository typecheck and tests pass;
- `npm run reference:pipeline-sol` completes with approved source access;
- output package opens through the normal World Forge import path;
- report contains nonzero input and output sizes plus SHA-256 values;
- repeated prepared-bundle runs with unchanged inputs produce the same `.wforge` digest;
- Parchment discovers and embeds the output without an override;
- Earth and Jupiter enter the same system package with the correct requested active body;
- refreshed Earth climate regions and accepted Jupiter presentation survive Parchment import;
- package size, Parchment package size, import duration, and browser memory are recorded before broad body expansion.

## Guardrails

- Do not hand-author the `.wforge` ZIP.
- Do not make the pipeline a runtime dependency.
- Do not commit downloaded source rasters or generated `.local` output.
- Do not use this pipeline to gate the separate Earth procedural-climate calibration project.
- Do not silently omit Jupiter from the standard Sol pipeline.
- Keep `reference:build-earth` temporarily as a compatibility command, but use `reference:build-sol` and `reference:pipeline-sol` in new instructions.

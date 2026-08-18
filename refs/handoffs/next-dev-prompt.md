# Next Dev Prompt: Ultra Earth Visual Acceptance and Payload Follow-up

Continue implementation in:

`https://github.com/Three-Wheeled-Sloth-Studio/World-Forge`

Work directly on `dev`.

## Starting point

The Ultra Earth source/package path is proven, and the first owner-QA presentation defects have been repaired.

Validated code checkpoint before the current documentation update:

- commit: `400223bd70227459bff8fbf30c4a4202e0a38789`
- visible runtime: `0.3.81`
- Ultra Earth acceptance run: `32155132659`
- focused Globe-resolution, Parchment-navigation, and reference-pipeline regressions passed
- full `npm run verify` passed

Read first:

1. `AGENTS.md`
2. `refs/README.md`
3. `refs/project.yaml`
4. `refs/handoffs/currentHandoff.md`
5. `refs/research/reference-data/earth-reference-data.md`
6. `refs/handoffs/reference-system-etl-and-multi-body-navigation.md`
7. `refs/planning/reference-system-etl-and-multi-body-navigation.md`
8. `refs/testing/validationCommands.yaml`
9. World Forge issue #124
10. Parchment Worlds issue #22 when sibling access is available

## Accepted Ultra contract

- Earth raster: `4096 x 2048`
- Earth cubed-sphere topology: `1024`

The topology value is derived by the existing shared `topologyResolutionForOutput(...)` helper. Do not restore the old 512 estimate and do not add an Earth-specific topology rule.

The ordinary fictional-world default remains unchanged.

## What is already proven

### Source ETL and full Sol package

World Forge run `32136329836` successfully built:

- source-backed Earth at `4096 x 2048`;
- topology `1024`;
- Jupiter's accepted atmospheric appearance;
- Mars's accepted Viking/MOLA prepared surface;
- one complete 23-body Sol `.wforge`.

Measured Earth normalized bundle:

- `92,277,263` bytes total.

Measured package:

- `.wforge`: `193,507,559` bytes;
- run-specific SHA-256: `ee6d98314fe7447c42ca8545abb7fa7e2acf8b95fddaba3be3683c80c6b16915`;
- source-to-package wall time: `1:48.23`;
- peak RSS: about `5.65 GiB`.

### Parchment package path

Parchment run `32137360931` successfully generated and inspected the enriched starter through the normal package code:

- `.pworld`: `258,172,374` bytes;
- SHA-256: `f4ce8d3b354bc47b976ebfccbe9f695619b10483738cafe31c86c1e44462b74e`;
- generation: `1:03.30` and about `6.9 GiB` peak RSS;
- normal package-reader inspection: `14.66 s` and about `2.0 GiB` peak RSS.

### Browser package path

Parchment browser run `32139014646` proved:

- starter review;
- normal import;
- IndexedDB/project reload;
- embedded `.wforge` transfer into World Forge;
- loaded Ultra surface at `4096 x 2048` from topology `1024`;
- one-project Sol context with Luna and Earth physical/geographic metrics intact.

The run's final red status was a diagnostic assertion bug: it looked for a standalone `Earth` label even though the Ultra surface was already loaded. Use the loaded-surface contract, not that obsolete assertion.

### Owner-QA presentation repair

The first local QA pass on v0.3.80 found two real presentation/navigation issues and one expected control behavior:

- Globe hard-coded the primary surface texture to `2048 x 1024`, hiding half the Ultra linear detail.
- standalone local World Forge navigation fell back to production Parchment Worlds when no handoff query parameter existed.
- Map preview still defaults to `1024 x 512`; that is an intentional preview setting, not the loaded Earth resolution.

v0.3.81 fixes the first two:

- primary Globe textures now derive from the source surface, capped at the maintained 4096-pixel product edge and the browser/GPU texture limit;
- ordinary lower-resolution worlds are not upscaled;
- local `localhost:5173` World Forge navigation resolves local Parchment Worlds on port `5273`;
- directly opened hosted World Forge stays on its current dev, QA, or production origin.

Run `32155132659` passed focused coverage and full repository verification on exact code head `400223bd70227459bff8fbf30c4a4202e0a38789`.

## Immediate priority

Finish owner visual acceptance on v0.3.81. Do not start payload optimization until the visual baseline is accepted or the owner explicitly redirects scope.

### A. Repull and verify the right build

- repull `World-Forge/dev` and `Parchment-Worlds/dev`;
- launch the full local Parchment Worlds stack for the integrated path;
- confirm World Forge reports `0.3.81`;
- import/use the maintained Sol starter;
- do not Regenerate Earth from the Quick Build panel during this acceptance pass.

The Quick Build `Standard 512 x 256` selector describes the next ordinary generation request. It does not describe the imported Ultra Earth.

### B. Natural Map at source resolution

In Explore:

- switch to Map view;
- select `Natural` presentation;
- set preview detail to `Source resolution` rather than the default 1024 x 512 preview;
- inspect recognizable continents, coastlines, major islands, deserts, humid tropical regions, ice, and mountain regions.

This is the correct flat-map comparison against the old 512 x 256 reference integration.

### C. Globe

Switch to Globe without changing the loaded project or active Earth body.

The source-aware path should use `4096 x 2048` for Ultra Earth on normal hardware. The helper intentionally falls back proportionally if the browser reports a lower maximum texture size.

Confirm:

- Map and Globe agree on land/water and broad biome identity;
- coastline and island detail is materially improved over the old integration;
- no new seam, texture, lighting, or interaction regression was introduced.

### D. Geographic drill-down and body continuity

- enable geographic drill-down against Earth and inspect representative regions;
- confirm at least one non-Earth accepted body, preferably Jupiter or Mars, remains available in the same Sol project;
- distinguish body-capability limitations from Earth-resolution defects.

## Measured payload architecture problem

Do not treat this as a reason to reduce Earth resolution.

The current package works, but the costs are concrete:

- `.wforge` is about 193.5 MB compressed;
- inspected ZIP content is about 1.325 GB because high-volume typed layers are serialized as JSON number arrays;
- World Forge source-to-package build peaks around 5.65 GiB RSS;
- Parchment base64-expands the nested package to about 258.2 MB;
- Parchment starter generation peaks around 6.9 GiB RSS;
- browser starter review is roughly 8 seconds with about 792 MB JS heap;
- import/reload are roughly 14 to 16 seconds in the measured Chromium runner.

This is enough evidence to justify a separate payload-strategy PI, but do not silently absorb that rewrite into Ultra acceptance.

## Recommended payload follow-up after explicit scope approval

Sequence the architecture work by largest structural waste first:

1. Add compact binary layer entries to `.wforge` for typed numeric arrays instead of JSON number arrays.
2. Keep the existing reader compatible with current packages while introducing a versioned binary reader/writer path.
3. Re-measure package size, import time, save/reopen time, and browser memory.
4. Only then add staged/lazy layer/body decode if measurements still require it.
5. Independently replace Parchment's base64 binary attachment envelope with a binary-capable container or side-entry representation if the remaining cost still justifies it.

The goal is one logical Parchment project and one logical World Forge system package. Do not solve payload scale by splitting Earth from Sol.

## Validation

For World Forge product changes:

```bash
npm run verify
```

Run focused tests first when changing reference-pipeline, presentation-resolution, package, body-awareness, or serialization code.

`npm run evaluate:regions` is required only if geographic partitioning or tile-window generation behavior changes.

Heavy scientific rebuild workflows should remain manual diagnostics unless there is a clear reason to put them back on ordinary push CI.

## Guardrails

- One Sol system remains one project.
- Keep Earth at Ultra `4096 x 2048` unless the owner explicitly changes the product target.
- Keep canonical topology at `1024` unless the shared global policy itself is intentionally revised.
- Do not change ordinary fictional-world generation defaults.
- Do not drop Jupiter or Mars.
- Do not create Earth-specific renderers or package formats.
- Do not broaden into climate calibration, new source ingestion, hydrography, renderer rewrites, or deferred TTRPG polish during acceptance.
- Preserve stable body IDs and Parchment bindings.

## Definition of done for the Ultra baseline

The Ultra baseline can be closed when:

- the source-backed `4096 x 2048` Earth fixture remains the maintained build target;
- the complete 23-body Sol package remains intact;
- exact-head automated validation is green;
- browser QA proves Parchment import/reload and World Forge package handoff;
- owner QA accepts Natural Map at Source resolution, source-aware Globe, and geographic drill-down against the Ultra Earth surface;
- another accepted Sol body remains available;
- measured payload costs and the follow-on architecture decision are recorded without lowering the baseline to hide the cost.

# Next Dev Prompt: Ultra Earth Acceptance and Payload Follow-up

Continue implementation in:

`https://github.com/Three-Wheeled-Sloth-Studio/World-Forge`

Work directly on `dev`.

## Starting point

The Ultra Earth reference is no longer a planning target. The source-backed fixture and complete Sol package have been built successfully at the maintained target.

Implementation checkpoint before the current documentation update:

- commit: `72bb0366e13fb01c0ddd26b881079c398e58eb1f`
- Ultra Earth acceptance run: `32138808622`
- focused reference regressions passed
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

### Browser path

Parchment browser run `32139014646` proved:

- starter review;
- normal import;
- IndexedDB/project reload;
- embedded `.wforge` transfer into World Forge;
- loaded Ultra surface at `4096 x 2048` from topology `1024`;
- one-project Sol context with Luna and Earth physical/geographic metrics intact.

The run's final red status was a diagnostic assertion bug: it looked for a standalone `Earth` label even though the Ultra surface was already loaded. Use the loaded-surface contract, not that obsolete assertion.

## Immediate priority

Finish presentation acceptance on the already-working Ultra package.

### A. Complete browser presentation evidence

Use the corrected Parchment browser diagnostic or an equivalent focused path to verify, on the same loaded Ultra Earth package:

- Natural Map activates and renders;
- Globe activates and renders the same Earth surface;
- geographic drill-down enables against the active Earth project rather than falling back to stale or another-body data;
- capture screenshots for Natural Map, Globe, and geographic drill-down;
- record package-handoff and presentation-switch timing.

Do not rebuild the scientific source bundle merely to rerun presentation QA unless the source package itself changes.

### B. Owner visual acceptance

Review the screenshots/browser output for the intended recognizable-Earth checks:

- Africa, Eurasia, the Americas, Australia, Antarctica, and major islands;
- Sahara and Arabian arid regions;
- Amazon, Congo, and Southeast Asian humid tropical regions;
- appropriate Antarctica/Greenland permanent ice;
- major mountain regions driven by imported elevation;
- visibly improved coastline detail over the old 512 x 256 integration baseline;
- agreement between Map and Globe on land/water and broad biome identity.

Do not overclaim real hydrography, measured precipitation, real ecological land cover, complete temperature climatology, tectonics, winds, or currents.

### C. Body continuity

If not already evident in the final browser pass, verify at least one non-Earth accepted body, preferably Jupiter or Mars, in the same Sol project after Earth has loaded.

## Measured payload architecture problem

Do not treat this as a reason to reduce Earth resolution.

The current package works, but the costs are now concrete:

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

Run focused tests first when changing reference-pipeline, package, body-awareness, or serialization code.

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
- Natural Map, Globe, and geographic drill-down are accepted against the Ultra Earth surface;
- another accepted Sol body remains available;
- measured payload costs and the follow-on architecture decision are recorded without lowering the baseline to hide the cost.

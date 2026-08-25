# Next Dev Prompt: Ultra Earth Owner Acceptance and Payload Follow-up

Continue implementation in:

`https://github.com/Three-Wheeled-Sloth-Studio/World-Forge`

Work directly on `dev`.

## Starting point

The maintained Ultra Earth source/package path, v0.3.81 presentation repair, and unified local/hosted Sol-reference build path are implemented.

Validated code checkpoint before the current documentation update:

- commit: `57f1442b120d71c2545ec4ac265023d08d50b0b8`
- visible runtime: `0.3.81`
- Ultra Earth acceptance run: `32864307205`
- focused canonical-Sol, Globe, navigation, and reference regressions passed
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

## Accepted contracts

Maintained Earth:

- raster: `4096 x 2048`
- canonical topology: `1024`

Ordinary fictional generation remains independent:

- ordinary current default quality: `1024 x 512`
- `512 x 256` is the lower `Standard` tier

For an imported package, World Forge loads the package's own generation config. A genuine Ultra Sol import should therefore show `Ultra 4096 x 2048` and right-panel `Map scale 4096 x 2048`. If both say 512 x 256, an old package was loaded.

## Unified Sol-reference build

Do not restore the old manual recipe of separate Mars preparation plus a hand-written Sol pipeline invocation.

The one first-party World Forge entry point is:

```text
npm run reference:build-sol
```

It owns:

- Mars preparation;
- maintained Earth/Jupiter source ETL;
- Earth `4096 x 2048` / topology `1024` validation;
- complete Sol package assembly;
- `.wforge` and `.pipeline.json` evidence;
- bounded retry of transient source-pipeline failures.

Parchment local startup now validates/reuses an existing maintained package or invokes this command automatically from a configured/sibling World Forge checkout before generating the starter.

The intended owner workflow for sibling checkouts is simply:

```text
cd Parchment-Worlds
git pull
npm run dev
```

The first startup with no valid reference may take several minutes; later startups reuse the validated local package.

Parchment focused preparation acceptance run `32863452205` passed valid reuse, missing-package build orchestration, stale-512 replacement, and project-model typecheck.

Hosted Parchment deployment uses the same canonical command from the matching World Forge branch. Do not create a second hosted-only reference recipe.

## Immediate priority

Finish owner visual acceptance before opening payload optimization unless the owner explicitly redirects scope.

### Fresh local integrated import

Use a fresh Parchment Sol starter after the automatic reference preparation completes. An already-imported project containing the old 512 `.wforge` is permanently old data and is not a valid Ultra acceptance fixture.

Expected first checks:

- World Forge runtime `0.3.81`;
- Generation Quality `Ultra 4096 x 2048`;
- Map scale `4096 x 2048`.

Do not click Regenerate during this acceptance pass.

### Natural Map

Use:

`Explore -> Layers -> Display -> Preview -> Source resolution`

Then select `Natural` presentation and inspect recognizable continents, major islands, deserts, humid tropical regions, ice, mountains, and coastline improvement.

The Preview control affects presentation resolution only. It cannot invent detail if the source package itself is 512 x 256.

### Globe

The v0.3.81 primary Globe texture now follows source resolution up to the maintained 4096-pixel edge and the browser/GPU texture limit. Ordinary lower-resolution worlds are not upscaled.

Confirm Map and Globe agree on land/water and broad biome identity and that no seam/interaction regression appeared.

### Geographic drill-down and body continuity

- enable geographic drill-down against Earth;
- inspect representative regions;
- confirm at least one non-Earth accepted body, preferably Mars or Jupiter, remains available and displays in the same Sol project.

## Proven source/package evidence

Accepted World Forge source build run `32136329836`:

- Earth `4096 x 2048`, topology `1024`;
- complete 23-body Sol project;
- `.wforge`: `193,507,559` bytes;
- source-to-package wall time: `1:48.23`;
- peak RSS: about `5.65 GiB`.

Accepted Parchment package run `32137360931`:

- `.pworld`: `258,172,374` bytes;
- generation peak RSS: about `6.9 GiB`;
- normal package-reader inspection: `14.66 s`, about `2.0 GiB` peak RSS.

Browser run `32139014646` proved starter review, import, reload, package handoff, and loaded Ultra Earth. Its final red result was an obsolete assertion after successful load.

## Payload architecture problem

Do not reduce Earth resolution to address payload cost.

The measured structural waste remains:

- `.wforge` high-volume typed layers are expanded into JSON numeric arrays before ZIP compression;
- Parchment base64-expands the compressed `.wforge` inside JSON `.pworld`;
- build/import memory and time are consequently high.

After explicit owner approval, recommended sequence is:

1. binary typed-layer entries in `.wforge`;
2. backward-compatible current-package reader;
3. remeasure package size, save/reopen, import time, and browser memory;
4. staged/lazy hydration only if still justified;
5. then reconsider Parchment's base64 attachment envelope.

Do not split Earth from Sol.

## Validation

For World Forge product changes:

```text
npm run verify
```

Run focused reference/build/presentation tests first when touching those seams.

Heavy scientific source rebuilds remain diagnostic/maintained-fixture work, not ordinary push CI.

## Guardrails

- One Sol system remains one project.
- Keep Earth at `4096 x 2048` / topology `1024` unless the owner deliberately changes the target.
- Keep ordinary generated-world defaults independent.
- Preserve stable body IDs and Parchment bindings.
- Do not drop Jupiter or Mars.
- Do not create Earth-specific renderer/package exceptions.
- Do not broaden visual acceptance into new climate/source ingestion or deferred TTRPG work.

## Definition of done for Ultra baseline

The baseline can close when:

- fresh local Parchment startup automatically prepares/reuses the maintained Sol package;
- fresh import reports `4096 x 2048` Earth and topology `1024`;
- owner accepts Natural Map at Source resolution;
- owner accepts source-aware Globe;
- geographic drill-down works against Earth;
- at least one accepted secondary Sol body remains available;
- payload costs remain recorded as separate follow-up architecture debt.

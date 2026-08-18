# Current Handoff

Updated: 2026-08-18

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

## Current checkpoint

The Ultra Earth reference implementation is source-built, package-built, repository-validated, and now includes the first owner-QA presentation repair.

Current validated code checkpoint before this documentation update:

- commit: `400223bd70227459bff8fbf30c4a4202e0a38789`
- visible runtime: `0.3.81`
- Ultra Earth acceptance run: `32155132659`
- focused Ultra presentation, navigation, and reference-pipeline regressions passed
- full `npm run verify` passed

The previous source/package acceptance checkpoint remains:

- commit: `72bb0366e13fb01c0ddd26b881079c398e58eb1f`
- visible runtime: `0.3.80`
- Ultra Earth acceptance run: `32138808622`
- focused reference-pipeline regressions passed
- full `npm run verify` passed

The original v0.3.80 runtime checkpoint remains:

- commit: `b0197a4669d605ecd771810f589feae109bb94e3`
- Validate World Forge run `#844` / run id `31980878852`
- 143 test files passed
- 517 tests passed
- typecheck/build, production harness tests, and both production smokes green

## Ultra Earth resolution contract

The maintained Earth reference target is explicit and tested:

- raster: `4096 x 2048`
- topology: `1024`

The topology value is not an Earth-specific constant. It is produced by the existing shared `topologyResolutionForOutput(...)` policy. The earlier handoff estimate of 512 was incorrect; the canonical helper resolves 4096 x 2048 to 1024.

Implemented seams:

- `scripts/reference-resolution.ts`
- `scripts/build-sol-reference-pipeline.ts`
- `scripts/build-sol-reference-pipeline.test.ts`

The source-to-package pipeline now:

- defaults the maintained Earth reference to Ultra;
- derives topology from the shared policy unless an explicit comparison override is supplied;
- rejects stale prepared Earth bundles with the wrong raster or topology dimensions;
- rejects prepared Earth bundles missing elevation, water, biome, wetness, or permanent-ice layers;
- records stage timings, bundle sizes, and digests.

Ordinary fictional-world generation defaults were not changed.

## Presentation QA repair in v0.3.81

Owner QA on the first v0.3.80 local Parchment import correctly exposed that the Ultra data contract and the visible presentation path were not the same thing.

Three distinct behaviors were identified:

1. The loaded Earth really is `4096 x 2048`, but the primary-world Globe texture was hard-coded to `2048 x 1024`.
2. Flat Explore Map intentionally defaults its preview to `1024 x 512`; `Source resolution` is available in the preview-detail control and must be selected when visually judging the Ultra raster.
3. Standalone local World Forge navigation fell back to the production Parchment Worlds origin when no `pwReturnUrl` handoff parameter was present.

The v0.3.81 repair now:

- derives primary-world Globe texture size from the loaded source surface rather than forcing 2048 x 1024;
- preserves up to the maintained 4096-pixel product edge while respecting the browser/GPU maximum texture size;
- does not upscale ordinary lower-resolution generated worlds;
- reports the actual primary Globe texture dimensions in the existing diagnostic dataset;
- keeps a standalone `localhost:5173` World Forge session pointed at local Parchment Worlds on port `5273`;
- keeps directly opened hosted `/apps/world-forge/` sessions on the same dev, QA, or production origin instead of falling back across environments.

The left-side Quick Build `Standard 512 x 256` selector remains the default for the next ordinary regeneration. It does not describe or downsample the already-loaded source-backed Earth. Do not click Regenerate while visually accepting the imported Sol reference unless intentionally replacing Earth with a generated world.

Focused coverage lives in:

- `apps/desktop/src/globe/globeTextureResolution.ts`
- `apps/desktop/src/globe/globeTextureResolution.test.ts`
- `apps/desktop/src/shell/parchmentNavigation.ts`
- `apps/desktop/src/shell/parchmentNavigation.test.ts`

Exact-head validation for the repair:

- commit: `400223bd70227459bff8fbf30c4a4202e0a38789`
- run: `32155132659`
- focused Ultra regressions: green
- full `npm run verify`: green

## Measured source-backed Earth build

Authoritative source-build evidence:

- World Forge Actions run: `32136329836`
- source commit: `b9977e298bb8bec2168d824c5b241517e5c2d50b`
- source ETL completed successfully
- complete Sol package assembly completed successfully

Earth bundle:

- raster: `4096 x 2048`
- topology: `1024`
- normalized bundle bytes: `92,277,263`
- elevation: `33,554,432` bytes
- water mask: `8,388,608` bytes
- biome codes: `8,388,608` bytes
- wetness: `33,554,432` bytes
- permanent ice: `8,388,608` bytes
- manifest: `2,575` bytes

Measured Earth summary:

- minimum elevation: `-10250.2744 m`
- maximum elevation: `6320.3843 m`
- water share: `0.6590461`
- Koppen class count: `31`
- desert land share: `0.1178108`
- rainforest land share: `0.0427358`
- mountain land share: `0.0220696`
- mean land wetness: `0.3274100`

Stage timings:

- Earth ETL: `56,884 ms`
- Jupiter preparation: `383 ms`
- Sol package assembly: `50,033 ms`
- total pipeline report: `107,494 ms`
- measured wall time: `1:48.23`
- measured peak RSS: `5,921,352 kB`, about 5.65 GiB

The build retained the accepted source semantics:

- NOAA ETOPO 2022 elevation and bathymetry;
- water mask derived from elevation and sea level;
- Koppen-Geiger-backed broad biome identity;
- wetness derived from Koppen classes;
- EF-derived permanent ice;
- mountains driven by imported elevation.

No new hydrography, measured precipitation, full temperature climatology, tectonic, wind, current, or land-cover source was added.

## Complete Sol package

The successful Ultra build remained one multi-body Sol project:

- body count: `23`
- Earth: geographic Tier 3 surface at `4096 x 2048`
- Jupiter: accepted `768 x 384` RGB565 atmospheric appearance
- Mars: accepted `512 x 256` prepared Viking/MOLA Tier 2 surface with 2 assets

Measured `.wforge` from run `32136329836`:

- bytes: `193,507,559`
- SHA-256: `ee6d98314fe7447c42ca8545abb7fa7e2acf8b95fddaba3be3683c80c6b16915`

The digest is evidence for that exact source commit, not a promise that future rebuilds have an identical digest. The package embeds source/build metadata.

Inspection of that package found approximately `1.325 GB` of uncompressed ZIP content. The largest entries are JSON numeric-array layer payloads. This confirms that current serialization, not source fidelity, is now the main scale concern.

## Parchment Worlds starter evidence

Because Parchment Worlds is private, starter generation is measured from that repository using its own repository-scoped Actions token.

Authoritative Parchment diagnostic:

- Parchment run: `32137360931`
- World Forge package bytes: `193,507,559`
- generated `.pworld` bytes: `258,172,374`
- `.pworld` SHA-256: `f4ce8d3b354bc47b976ebfccbe9f695619b10483738cafe31c86c1e44462b74e`
- starter generation wall time: `1:03.30`
- starter generation peak RSS: `7,233,688 kB`
- normal package-reader inspection: `14.66 s`
- package-reader peak RSS: `2,102,408 kB`

The size increase from the nested `.wforge` to `.pworld` is the current JSON/base64 attachment envelope. This is measured architecture debt, not a reason to lower Earth resolution.

## Browser evidence

Parchment browser run `32139014646` successfully performed the expensive parts of the real product path:

- review measured starter: `8.558 s`
- import into Parchment: `14.499 s`
- reload imported project: `16.460 s`
- JS heap after review: `791,584,316` bytes
- JS heap after import: `275,142,820` bytes
- JS heap after reload: `274,855,776` bytes

The same run successfully transferred the embedded Ultra `.wforge` into World Forge. The loaded iframe reported:

- `4096 x 2048 generated map from 1024 cubed-sphere source topology`
- project: `Sol System`
- map scale: `4096 x 2048`
- ocean share: `65.90460538864136%`
- planet size: `1 Earth radii`
- axial tilt: `23.439 deg`
- eccentricity: `0.0167`
- Luna present
- Earth biome counts populated

The workflow marked that run failed only because its probe expected a literal standalone `Earth` label after the package had already loaded. The diagnostic criterion has been corrected to use the loaded-surface contract and is being extended to Natural Map, Globe, and geographic drill-down screenshots.

Do not treat the run's final red status as package-load failure.

## Validation

Current World Forge exact-head acceptance:

- commit: `400223bd70227459bff8fbf30c4a4202e0a38789`
- run: `32155132659`
- focused Globe-resolution, navigation, and reference regressions: green
- `npm run verify`: green

Previous source/package exact-head acceptance:

- commit: `72bb0366e13fb01c0ddd26b881079c398e58eb1f`
- run: `32138808622`
- focused reference regressions: green
- `npm run verify`: green

Heavy source rebuilds are intentionally manual diagnostics now. They are not part of ordinary push CI.

Diagnostic workflows:

- `.github/workflows/ultra-earth-reference.yml`
- `.github/workflows/ultra-earth-acceptance.yml`

The Ultra acceptance workflow now also runs automatically when the Globe-resolution or Parchment-navigation acceptance seams change.

Parchment owns its private-repository starter and browser diagnostics.

## Architecture conclusion

Ultra 4096 x 2048 is source-supported and technically operational. The higher resolution exposed a real payload problem rather than a source problem, and owner QA additionally exposed a fixed-resolution presentation cap that is now repaired.

Current measured costs are high enough to justify a separate payload-strategy increment:

1. stop expanding high-volume typed numeric layers into JSON arrays inside `.wforge`;
2. preserve backward-compatible readers while adding compact binary layer entries;
3. then measure staged/lazy body and layer decode against the new package shape;
4. independently remove Parchment's base64 expansion for large binary attachments if the post-`.wforge` measurements still justify it.

Do not begin that rewrite silently. It is now evidence-backed follow-on architecture work and should be explicitly scoped.

## Remaining acceptance work

The Ultra baseline now needs a fresh owner visual pass on v0.3.81 rather than more source or package plumbing:

- repull World Forge and confirm the visible runtime is `0.3.81`;
- in Map view, select `Natural` presentation and `Source resolution` preview detail before judging coastline/raster fidelity;
- in Globe view, confirm the same Natural surface visibly benefits from the source-aware texture path;
- enable geographic drill-down and inspect representative regions;
- confirm another packaged body such as Jupiter or Mars in the same browser session;
- record any real visual defects separately from known package-size/load-time costs.

Save/reopen at the Parchment project level is proven by import plus reload. Exact World Forge edit/save-back of the Ultra package remains worth a focused check if package mutation is part of the acceptance pass.

## Guardrails

- One Sol system remains one World Forge project.
- Preserve deterministic body identity and Parchment bindings.
- Do not create a second resolution policy.
- Do not lower the Ultra reference merely to reduce payload cost.
- Do not change ordinary generated-world defaults.
- Do not drop Jupiter, Mars, or accepted body assets.
- Do not broaden into climate calibration, hydrography import, renderer rewrite, or TTRPG polish as part of this baseline.
- Keep the deferred v0.3.80 TTRPG water-wash and icon-alignment debts parked.

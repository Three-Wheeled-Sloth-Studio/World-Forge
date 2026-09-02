# Current Handoff

Updated: 2026-09-02

## Resumed downstream diagnostic checkpoint

The downstream Earth scientific-validation slice resumed for native biome-confusion localization. A generic validation core, production present-day adapter, fixed-grid Earth metrics, three resolution-tier baselines, native-first counterfactual screening, and measured generator corrections remain implemented on `dev`.

See `refs/testing/downstream-generator-earth-validation-2026-08-26.md` for architecture, evidence limits, metric values, timings, and next work. Fast, Standard, and Ultra diagnostics are intentional manual commands and must remain outside ordinary push CI.

Native confusion tables prove the remaining grassland/forest and desert errors are dominated by upstream wetness placement. A targeted seasonal forest signal, final-wind rain-shadow, and direct pressure-wind ordering correction all fail the cross-tier gate. A local-only GLWD v2 ingestion path and three observed wetland diagnostics are implemented. The accepted river-intensity scale correction cuts Fast GLWD prevalence error from `15.16` to `6.18` points without changing named rivers. The subsequent lowland-connectivity slice identifies GLWD misses as much lower and flatter than ordinary land, then adds a production-order floodplain branch with scale-aware sink-lake support. Final prevalence error is `6.13 / 0.15 / 1.62` points, high-coverage recall `37.72% / 24.34% / 19.85%`, and fraction separation `7.34 / 8.78 / 9.76` points Fast/Standard/Ultra. Köppen macro-F1 is `0.5557 / 0.5740 / 0.5955`; the modest derived-proxy tradeoff is recorded and remains inside maintained tolerances. The short preset matrix adds no finding, unsupported wetland remains zero, and named rivers are unchanged.

The manual evaluator now attributes generated wetlands to supported standing water, riverine floodplain, legacy strong-river, or cohesion/residual branches and reports six evaluator-only regional windows. Riverine floodplains carry the strongest mean GLWD coverage (`24.89% / 25.11% / 31.46%` Fast/Standard/Ultra). A flat saturated non-river screen identifies `16.67% / 19.40% / 28.35%` of remaining high-coverage misses, but only `4.98% / 5.06% / 5.79%` of all candidates are high-coverage reference wetlands. Do not promote that predicate directly: at Ultra it would add `472,197` candidates and destroy prevalence. Regional recall remains especially weak in West Siberia, Sudd, and Ganges-Brahmaputra. Next work should screen a generic persistent-drainage/water-table proxy and revisit the footprint implied by sink-lake support; keep it evaluator-first and linear-time.

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

## Accepted production baseline

The downstream Earth generator behavior includes the accepted river-intensity resolution correction described above. Expensive Earth and preset evidence remains manual and outside push CI.

Accepted production checkpoint:

- commit: `05cea6b2c17a4712d718c742550acace75d684ae`
- `npm run verify`: passed (149 test files, 553 tests, production harnesses, and bundle)
- Fast/Standard/Ultra Earth diagnostics: passed
- Köppen biome macro-F1: `0.5336 / 0.5846 / 0.5964`
- hydration/circulation metrics: unchanged by the final forest-threshold correction
- final climate-to-biome consistency: `1.0` at every tier
- expensive Earth/reference and performance diagnostics: remain outside routine push CI

The earlier maintained Ultra integration checkpoint remains relevant for source/package and owner-QA evidence:

- commit: `8a8b4d259e46945e768d9e4168ecc24bd48efef8`
- visible runtime: `0.3.81`
- ordinary validation run: `32894204075`
- canonical `npm run verify`: passed
- production page-harness smoke: passed
- production attribution-rerank smoke: passed

The ordinary CI workflow was consolidated at this checkpoint; see `refs/testing/ci-suite-audit-2026-08-25.md`.

The follow-up CI streamlining increment keeps full validation on `dev`, ready pull requests, release branches, and manual checkpoints while treating `qa` and `main` as exact-SHA promotion targets. Deployments now require a successful `Validate World Forge` run for the exact source commit and run build-only compilation/bundling instead of repeating the full suite. The ordinary seed matrix and repeated full-generation fixtures were reduced; the extended matrix remains available through the manual `full_test_matrix` workflow input.

The production-only AGPL license commit was merged back into `dev` on 2026-08-25. This preserves the repository license and restores the required fast-forward ancestry for the normal `dev -> qa -> main` promotion helpers; do not recreate a main-only documentation or licensing commit.

## Owner QA outcome

The integrated local Parchment -> World Forge path now demonstrates the correctness target that drove this slice:

- Parchment Google login works when the machine-local `.env.local` Firebase web configuration is present;
- an existing/local Parchment project loads successfully;
- the maintained Sol project reaches World Forge;
- Earth reports the expected `4096 x 2048` map scale;
- the 3D/globe presentation is noticeably slower to appear at this resolution, but it eventually loads;
- secondary Sol bodies were already confirmed to continue loading/displaying in the same project.

Treat the initial 3D-load delay as measured/observed performance debt, not evidence that the Earth package silently fell back to 512 resolution.

The owner chose to pause here. Do not reopen the Ultra resolution/source correctness work without new evidence.

## Maintained Earth and Sol contracts

These remain unchanged:

- Earth raster: `4096 x 2048`
- canonical cubed-sphere topology: `1024`
- complete maintained Sol project: `23` bodies
- Earth stays in the same project as Jupiter, Mars, and the rest of the maintained system

Ordinary fictional generation remains independent:

- current ordinary default: `1024 x 512`
- `512 x 256`: lower `Standard` tier

For imported projects, the Generation Quality control reflects the loaded project's config. A real Ultra import should therefore report `Ultra 4096 x 2048` and right-panel `Map scale 4096 x 2048`.

## Canonical maintained Sol build

The one first-party entry point remains:

```text
npm run reference:build-sol
```

It owns:

1. repo-local reference Python environment setup under `.local/reference-python`;
2. resilient installation of the reference ETL requirements;
3. accepted Mars preparation;
4. maintained Earth/Jupiter source ETL;
5. Earth `4096 x 2048` / topology `1024` validation;
6. complete Sol package assembly;
7. `.wforge` plus `.pipeline.json` evidence;
8. bounded retry of transient scientific-source failures.

Normal Parchment local startup validates/reuses a maintained package or invokes this command automatically. Do not restore the older owner-facing sequence of separate Mars and Sol terminal commands.

## Local identity configuration boundary

The temporary local sign-in failure during owner QA was not an authentication-code regression. Parchment's Firebase client remained intact; the current machine simply did not have its ignored `.env.local` file.

That file is deliberately machine-local and must not be committed. When absent, Parchment correctly reports that Google sign-in is not configured for that installation. Once the Firebase web configuration was restored, login worked again.

Do not commit Firebase/Admin/server credentials in either repository to make local QA easier.

## Source/package evidence

The accepted measured World Forge source build remains run `32136329836`:

- Earth bundle: `92,277,263` bytes
- Earth raster: `4096 x 2048`
- topology: `1024`
- Sol bodies: `23`
- final `.wforge`: `193,507,559` bytes
- source-to-package wall time: `1:48.23`
- peak RSS: about `5.65 GiB`

The accepted Parchment packaging measurement remains run `32137360931`:

- nested `.wforge`: `193,507,559` bytes
- `.pworld`: `258,172,374` bytes
- starter generation: `1:03.30`
- starter generation peak RSS: about `6.9 GiB`
- package-reader inspection: `14.66 s`
- package-reader peak RSS: about `2.0 GiB`

Those costs and the owner's slow initial 3D load are consistent with the known package/hydration architecture debt. Do not lower Earth resolution to hide the cost.

## Presentation state

v0.3.81 remains the accepted presentation repair:

- the primary Globe texture follows source resolution up to the maintained 4096-pixel product edge and browser/GPU limits;
- ordinary lower-resolution worlds are not upscaled;
- standalone local World Forge returns to local Parchment rather than production;
- hosted direct-open navigation remains environment-local.

Map presentation detail remains configurable under:

`Explore -> Layers -> Display -> Preview -> Source resolution`

This is a presentation control only; it does not change stored map scale.

## CI/test-suite audit

The 2026-08-25 audit intentionally reduced orchestration duplication without deleting useful regression tests:

- ordinary World Forge CI is now one authoritative job with one dependency install;
- it runs canonical `npm run verify` plus the two production-browser smokes;
- the dedicated path-triggered Ultra acceptance workflow was removed because its focused tests were already in the ordinary Vitest suite and it reran full verification;
- the manual Geographic Drilldown Diagnostic remains because `evaluate:regions` is not ordinary CI;
- the manual Ultra Earth Reference Diagnostic remains because it performs the expensive real scientific-source build and records resource/package evidence;
- a quick stale-assertion scan found no individual unit/integration test whose deletion would improve signal.

See `refs/testing/ci-suite-audit-2026-08-25.md`.

## Deferred payload/performance follow-up

Do not begin this work merely because the Ultra baseline is paused. Resume it when explicitly selected as the next product slice.

Recommended order remains:

1. replace high-volume `.wforge` JSON numeric arrays with binary typed-layer ZIP entries;
2. preserve backward-compatible reading of existing packages;
3. remeasure package size, save/reopen, import/handoff time, memory, and Globe/3D startup latency;
4. add staged/lazy hydration only if the binary results still justify it;
5. only then reconsider Parchment's base64-in-JSON attachment envelope.

Do not split Earth out of Sol and do not reduce the maintained resolution as an optimization.

## Guardrails

- One Sol system remains one project.
- Preserve deterministic body IDs and Parchment bindings.
- Keep Earth at `4096 x 2048` and topology `1024` unless the product target is deliberately changed.
- Keep ordinary generated-world defaults independent of the maintained reference fixture.
- Keep Jupiter and Mars.
- Do not create Earth-specific renderers or package formats.
- Do not mistake missing Parchment `.env.local` for a World Forge/auth code regression.
- Treat current 3D startup latency as performance evidence for a later optimization slice.

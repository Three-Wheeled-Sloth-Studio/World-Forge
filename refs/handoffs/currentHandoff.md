# Current Handoff

Updated: 2026-08-26

## Active downstream validation checkpoint

The downstream Earth scientific-validation slice is active and has completed its moisture-recycling increment. A generic validation core, production present-day adapter, fixed-grid Earth metrics, three resolution-tier baselines, and three measured generator corrections are implemented on `dev`.

See `refs/testing/downstream-generator-earth-validation-2026-08-26.md` for architecture, evidence limits, metric values, timings, and next work. Fast, Standard, and Ultra diagnostics are intentional manual commands and must remain outside ordinary push CI.

Land-moisture recycling is bounded, land-masked, subtropically suppressed, and solved at fixed reference scale. Explicit humid/dry region metrics protect against indiscriminate wetting. Ultra plausibility metrics improved while core time stayed inside the accepted envelope. The remaining measured defect is excessive absolute wetness in generic dry regions: Standard dry-region mean is about 0.37 versus about 0.086 in the Köppen proxy. Do not feed answer keys into production generation or retune latitude belts to hide this gap.

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

## Pause checkpoint

The maintained Ultra Earth path has reached an owner-accepted integration checkpoint and is intentionally paused before payload/performance optimization.

Current functional/CI checkpoint before this documentation-only update:

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

# Next Dev Prompt: Post-Plate-Diagnostic Roadmap Return

Updated: 2026-09-02

Continue implementation in:

`https://github.com/Three-Wheeled-Sloth-Studio/World-Forge`

Work from the latest `dev` after the plate diagnostic cleanup is accepted.

## Starting point

The plate diagnostic validation debt is now repaired in code without changing production generation behavior.

The cleanup establishes and implements these contracts:

- current production/shared deep-time diagnostics expose `fragmentPlacement` with model version `fragment-placement-v2`;
- the retired local `PlateAdvection` pseudo-schema and all `plateAdvection*` fingerprint fields have been removed;
- `scripts/run-preset-validation.ts` now validates and reports the active fragment-placement contract instead of requiring `plate-advection-v3`;
- the obsolete `plateAdvectionMarginContinuityScore` threshold is removed, not translated into a new scientific threshold;
- focused regression coverage verifies current diagnostic presence, schema consistency, preset-path compatibility, fingerprint agreement, fixed-seed determinism, and absence of the retired fingerprint key;
- no plate construction, fragment placement, terrain response, climate, hydrology, biome, or package behavior changed.

See `refs/testing/plate-diagnostic-contract-audit-2026-09-02.md`. The historical downstream report is preserved as measured evidence; its stale diagnostic classification is corrected by `refs/testing/downstream-generator-earth-validation-plate-diagnostic-correction-2026-09-02.md`.

## Completed manual checkpoint

The deliberate local `npm run validate:presets -- --mode full` checkpoint completed on current `dev` with 140 cases in 134.79 seconds. The result was 138 passes, two warnings, zero failures, zero errors, and no aggregate findings. `fragment-placement-v2` diagnostic coverage is complete globally and for every preset, so the stale `plate-advection-v3` coverage and margin-continuity findings are closed.

The ignored local evidence is `validation-reports/preset-validation-2026-09-03T02-03-38Z.md`. The two warnings are isolated Archipelago tiny-biome-patch findings for seed `1001006` under Sol-like and habitable-star preparation. Treat them independently; do not tune production behavior merely to remove warnings.

Keep the preset suite intentional and manual. Do not add it to ordinary push CI or create a dedicated workflow merely to run it.

## Known before-state for the manual matrix

The preserved historical run established:

- all 80 fictional worlds generated without runtime errors;
- the suite was globally red because every affected case expected the nonexistent `plate-advection-v3` diagnostic contract;
- four cases also retained pre-existing tiny-biome-patch findings;
- later wetland work reported no additional aggregate finding beyond the two stale plate-advection findings.

Do not rewrite those historical reports as though they had produced different output. The 140-case local checkpoint above is the measured after-state.

## Suggested roadmap return after the manual checkpoint

If no new plate-specific evidence appears, do not invent a new continuity metric as busywork. The accepted downstream Earth work remains the current scientific baseline:

- `catchment-budget-v1` is the production wetland default;
- GLWD high-coverage recall is `40.83% / 29.87% / 26.19%` Fast/Standard/Ultra;
- GLWD fraction separation is `7.50 / 10.66 / 14.14` points;
- Köppen macro-F1 remains within tolerance at `0.5468 / 0.5652 / 0.5909`;
- final biome consistency remains `1.0`.

If downstream Earth validation is explicitly selected next, the remaining warm-floodplain regional gap, especially Sudd, is a reasonable evidence target. Begin with diagnostics/counterfactuals; do not widen the global wetland budget or tune production without cross-tier evidence.

## CI posture

Ordinary World Forge CI remains intentionally simple:

- one GitHub-hosted validation job;
- one `npm ci`;
- `npm run verify`;
- production page-harness smoke;
- production attribution-rerank smoke for ready PR/manual checkpoints.

Keep these outside routine push CI:

- the fictional preset matrix;
- Fast/Standard/Ultra Earth diagnostics;
- Ultra real-source Earth/Sol rebuild;
- performance diagnostics.

## Deployment/provenance contracts

- QA and main remain exact-SHA promotion targets.
- Deployment requires a successful `Validate World Forge` run for the exact source SHA.
- QA/main deployment remains build-only compilation/bundling rather than duplicate full verification.
- Deployment secrets and workflows remain outside this public repository.

## Maintained Earth/Sol contracts

- Earth raster: `4096 x 2048`.
- canonical topology: `1024`.
- one maintained Sol project with 23 bodies, including Earth, Jupiter, and Mars.
- ordinary fictional generation defaults remain independent of the maintained reference fixture.

## Guardrails

- Do not recreate `plate-advection-v3`.
- Do not invent a replacement margin-continuity threshold without a current-model scientific question and measured evidence.
- Do not change production plate, climate, hydrology, or biome behavior just to clear a validation finding.
- Preserve deterministic IDs and package compatibility.
- Do not commit local Firebase/server credentials or local scientific answer-key assets.
- Keep expensive diagnostics deliberate and manual.

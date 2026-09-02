# Next Dev Prompt: Plate Diagnostic Harness Cleanup

Updated: 2026-09-02

Continue implementation in:

`https://github.com/Three-Wheeled-Sloth-Studio/World-Forge`

Work from the latest `dev` after the plate diagnostic audit is accepted.

## Starting point

The accepted production generator remains unchanged. Catchment-budget wetlands remain the production default, and the maintained Ultra Earth baseline remains paused and accepted. Do not reopen climate, hydrology, biome, plate-generation, source-resolution, or performance tuning without measured evidence.

The plate diagnostic audit in `refs/testing/plate-diagnostic-contract-audit-2026-09-02.md` establishes that the fictional preset harness contains stale validation plumbing:

- current production/shared deep-time diagnostics expose `fragmentPlacement` with model version `fragment-placement-v2`;
- current production/shared schema does not define `plateAdvection`;
- `plate-advection-v3`, `plateAdvectionMarginContinuityScore`, and the associated threshold survive only in the stale preset fingerprint/harness/reporting surface;
- therefore the missing-diagnostic failure is validation-contract debt, not evidence that native production skips a plate stage;
- the old margin-continuity warning is an obsolete-metric finding, not demonstrated evidence of a current scientific generator defect.

Focused regression coverage now verifies active diagnostic presence, schema consistency, preset-path compatibility, and determinism without changing generation behavior.

## Immediate next slice

Use a normal local checkout so the large preset validation files can be edited and exercised atomically.

1. Remove the retired local `PlateAdvection` pseudo-schema and `plateAdvection*` fingerprint fields from `apps/desktop/src/dev/deepTimeLedgerFingerprint.ts`.
2. Replace the stale `plate-advection-v3` case failure, aggregates, and markdown summary in `scripts/run-preset-validation.ts` with reporting based on the active `fragment-placement-v2` contract where useful.
3. Keep the change diagnostic-only. Do not change fragment placement, plate construction, deep-time motion, terrain response, climate, hydrology, or biome outputs.
4. Run the focused active-contract test and the repository's normal `npm run verify` gate.
5. Run the fictional preset matrix only as an intentional manual diagnostic if the environment can support it. It must remain outside ordinary push CI.
6. Update `refs/testing/downstream-generator-earth-validation-2026-08-26.md` so its historical globally-red preset note clearly records that the missing `plate-advection-v3` finding was retired as stale harness debt. Preserve the historical 80-world evidence rather than rewriting history.
7. Update `refs/handoffs/currentHandoff.md` with the final cleanup commit, test/run IDs, and before/after manual preset findings if a manual run was performed.

## Validation posture

Routine checkpoint:

```text
npx vitest run apps/desktop/src/dev/plateDiagnosticContract.test.ts
npm run verify
```

Intentional manual preset checkpoint only:

```text
npm run validate:presets -- --mode full
```

Do not wire the preset matrix, Fast/Standard/Ultra Earth diagnostics, real-source Earth/Sol build, or performance diagnostics into ordinary push CI.

## Accepted deployment/provenance contracts

- QA and main remain exact-SHA promotion targets.
- Deployment requires a successful `Validate World Forge` run for the exact source SHA.
- QA/main deployment remains build-only compilation/bundling rather than duplicate full verification.
- Do not move deployment secrets or deployment workflow ownership into this public repository.

## Maintained Earth/Sol contracts

- Earth raster: `4096 x 2048`.
- canonical topology: `1024`.
- one maintained Sol project with 23 bodies, including Earth, Jupiter, and Mars.
- ordinary fictional generation defaults remain independent of the maintained reference fixture.

## Guardrails

- Do not recreate `plate-advection-v3` merely to satisfy the stale harness.
- Do not invent a new margin-continuity threshold without a current-model scientific question and measured evidence.
- Preserve deterministic IDs and package compatibility.
- Do not commit local Firebase/server credentials or local scientific answer-key assets.
- Keep expensive diagnostics deliberate and manual.

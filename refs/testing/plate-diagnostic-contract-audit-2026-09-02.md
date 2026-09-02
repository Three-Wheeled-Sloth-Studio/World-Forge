# Plate Diagnostic Contract Audit

Updated: 2026-09-02

## Scope

This audit addresses the fictional preset validation findings that reported missing `plate-advection-v3` diagnostics and low Earthlike plate-margin continuity. It does not authorize or change production plate generation, climate, hydrology, or biome behavior.

## Root cause

The finding is validation-contract debt, not evidence that the current production generator skips plate evolution.

The preset harness executes the normal native production path:

1. `configForTestCase(...)` builds the preset configuration.
2. `prepareSystemOrbitConfig(...)` applies the same system/orbit preset preparation used by production-facing generation.
3. `generateProjectWithNativeStages(...)` runs the native generation pipeline, including deep-time aging and current fragment placement.
4. `reconcileSystemOrbitPresets(...)` performs the existing post-generation preset reconciliation.
5. the harness fingerprints the resulting project.

The current production/shared deep-time schema exposes `fragmentPlacement?: DeepTimeFragmentPlacementDiagnostics`, whose active model version is `fragment-placement-v2`. It does not define a `plateAdvection` diagnostic field.

The stale validation layer still contains a locally invented optional `PlateAdvection` shape in `apps/desktop/src/dev/deepTimeLedgerFingerprint.ts` and turns its absence into `plateAdvectionDiagnosticsVersion: missing`. `scripts/run-preset-validation.ts` then requires that nonexistent field to equal `plate-advection-v3` and fails every affected case.

Searches of the current repository found `plate-advection-v3`, `PlateAdvectionDiagnostics`, and `marginContinuityScore` only in the stale validation/fingerprint/report surface, not in the production generator or shared schema.

## Finding classification

### Missing `plate-advection-v3`

Reclassified as a stale harness contract.

There is no evidence in this audit that a current production stage is being skipped. Current production generation emits the active `fragment-placement-v2` diagnostics through the same native path used by the preset harness.

### Earthlike margin continuity

Reclassified as an obsolete-metric finding, not a demonstrated current scientific defect.

`plateAdvectionMarginContinuityScore` belongs to the same retired `plate-advection-v3` contract and is not produced by the current generator. A threshold against a metric the active model does not define cannot establish a present generator defect.

This audit does not claim that present-day plate margins are scientifically optimal. It establishes only that the old continuity warning is not valid current evidence. Any future continuity investigation should begin by defining a model-independent or current-model metric and collecting measured evidence before production tuning.

## Regression coverage

`apps/desktop/src/dev/plateDiagnosticContract.test.ts` covers the active diagnostic seam without changing generation behavior. It verifies:

- diagnostic presence on representative Earthlike and Waterworld preset paths;
- compatibility with both Sol-like and habitable-star preset preparation;
- exact `fragment-placement-v2` model identification;
- finite and bounded schema values for the current share metrics;
- deterministic diagnostics for a fixed prepared preset case.

The test intentionally does not recreate `plate-advection-v3` or encode its margin-continuity threshold.

## Remaining harness cleanup

The stale `plateAdvection*` fingerprint, aggregate, case-failure, and markdown-summary fields in the large preset validation files should be removed or replaced with current `fragmentPlacement*` reporting in a normal local checkout where those files can be edited and exercised atomically.

That cleanup is behavior-neutral validation plumbing. It must not alter production plate generation. The expensive preset suite must remain manual/workflow-dispatch only.

## Validation posture

Routine validation remains:

- focused Vitest coverage while editing;
- `npm run verify` at the repository checkpoint;
- ordinary CI as already defined by `validate.yml`.

The fictional preset matrix remains an intentional manual diagnostic and must not be added to ordinary push CI.

## Evidence boundary

This audit was performed against the public repository and current `dev` source. The chat execution environment does not have a network-capable local World Forge checkout, so it cannot safely run npm-based local validation or the expensive preset matrix. GitHub Actions should be used for branch/PR verification, while the full preset run remains a deliberate manual checkpoint.

No private Earth reference data, GLWD assets, workspace helper scripts, or Hostinger access are required to establish this root cause. Those assets are also not required for the focused active-contract tests.

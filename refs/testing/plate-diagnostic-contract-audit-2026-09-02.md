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

Before this cleanup, the validation layer still contained a locally invented optional `PlateAdvection` shape in `apps/desktop/src/dev/deepTimeLedgerFingerprint.ts`, turned its absence into `plateAdvectionDiagnosticsVersion: missing`, and required that nonexistent field to equal `plate-advection-v3` in `scripts/run-preset-validation.ts`.

Searches of the current production and shared schema found no active `plate-advection-v3` or `marginContinuityScore` contract.

## Finding classification

### Missing `plate-advection-v3`

Reclassified as a stale harness contract and fixed in validation plumbing.

There is no evidence in this audit that a current production stage is being skipped. Current production generation emits the active `fragment-placement-v2` diagnostics through the same native path used by the preset harness.

### Earthlike margin continuity

Reclassified as an obsolete-metric finding, not a demonstrated current scientific defect.

`plateAdvectionMarginContinuityScore` belonged to the retired validation contract and is not produced by the current generator. Its old threshold has been removed rather than recreated against a different model.

This audit does not claim that present-day plate margins are scientifically optimal. Any future continuity investigation should begin by defining a model-independent or current-model metric and collecting measured evidence before production tuning.

## Cleanup implemented

The diagnostic-only cleanup now:

- removes the local `PlateAdvection` pseudo-schema from `apps/desktop/src/dev/deepTimeLedgerFingerprint.ts`;
- removes all `plateAdvection*` fingerprint fields;
- fingerprints the active `fragmentPlacement` contract instead;
- replaces the manual preset harness's stale case failure and aggregate coverage checks with `fragment-placement-v2` presence and schema invariants;
- replaces the old plate-advection markdown table with current fragment-placement reporting;
- removes the obsolete margin-continuity, frontier-advance, and orphan-risk findings rather than inventing replacement thresholds.

No production generator, plate construction, fragment placement, terrain response, climate, hydrology, or biome logic changed.

## Regression coverage

`apps/desktop/src/dev/plateDiagnosticContract.test.ts` covers the active diagnostic seam without changing generation behavior. It verifies:

- diagnostic presence on representative Earthlike and Waterworld preset paths;
- compatibility with both Sol-like and habitable-star preset preparation;
- exact `fragment-placement-v2` model identification;
- finite and bounded schema values for the current share metrics;
- deterministic diagnostics for a fixed prepared preset case;
- fingerprint agreement with the emitted diagnostics;
- absence of the retired `plateAdvectionDiagnosticsVersion` fingerprint key.

The manual harness now checks only contract invariants such as bounded shares, nonnegative counts, moving-fragment count not exceeding total fragments, source/target consistency, and mean displacement not exceeding maximum displacement. These are schema-consistency checks, not scientific tuning thresholds.

## Validation posture

Routine validation remains:

- focused Vitest coverage while editing;
- `npm run verify` at the repository checkpoint;
- ordinary CI as already defined by `validate.yml`.

The fictional preset matrix remains an intentional manual diagnostic and must not be added to ordinary push CI.

A clean pre-cleanup branch checkpoint passed `Validate World Forge` run `33649692255`, including canonical repository verification and both production browser smokes. The final cleanup head must also pass the ordinary validation gate before merge.

## Manual preset evidence boundary

The chat execution environment cannot establish a network-capable local World Forge checkout, and the repository intentionally has no ordinary CI workflow that runs `npm run validate:presets -- --mode full`. Therefore the repeated 80-case suite was not run from this environment.

The before-state is preserved as historical evidence: all 80 worlds generated without runtime errors, the suite was globally red because of the stale `plate-advection-v3` contract, and four cases retained pre-existing tiny-biome-patch findings. After the cleanup, the stale plate diagnostic failures are expected to disappear; that expectation must be confirmed by the next deliberate local/manual preset run rather than asserted as measured evidence.

No private Earth reference data, GLWD assets, workspace helper scripts, or Hostinger access are required for that fictional preset run.

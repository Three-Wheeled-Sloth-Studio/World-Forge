# Downstream Earth Validation Plate-Diagnostic Correction

Updated: 2026-09-02

This addendum corrects the classification of the plate-diagnostic findings recorded in `refs/testing/downstream-generator-earth-validation-2026-08-26.md` while preserving that report's historical measured results.

## Historical evidence preserved

The earlier repeated fictional preset runs remain valid as generation evidence:

- all 80 fictional worlds completed generation without runtime errors;
- four cases retained pre-existing tiny-biome-patch findings;
- wetland promotion checkpoints reported no new aggregate finding beyond the then-existing plate diagnostic findings.

Those runs must not be rewritten as though they produced different output.

## Diagnostic classification corrected

The historical report described the suite as globally red because the native path did not emit `plate-advection-v3`, and later referred to plate-advection coverage/continuity findings as remaining issues.

The 2026-09-02 contract audit established that this was stale validation plumbing:

- current production/shared deep-time schema exposes `fragmentPlacement` diagnostics with model version `fragment-placement-v2`;
- current production/shared schema does not define `plateAdvection`;
- `plate-advection-v3` and `plateAdvectionMarginContinuityScore` survived only in the old validation fingerprint/harness/report surface;
- therefore missing `plate-advection-v3` was not evidence of a skipped production stage;
- the old Earthlike margin-continuity threshold was an obsolete-metric finding, not demonstrated evidence of a current generator defect.

The validation plumbing has now been repaired to fingerprint, validate, aggregate, and report `fragment-placement-v2`. The retired pseudo-schema, fingerprint keys, and continuity threshold were removed without changing production generation behavior.

See `refs/testing/plate-diagnostic-contract-audit-2026-09-02.md` for the root-cause audit and focused regression coverage.

## Evidence still required

This addendum does not invent an after-state for the expensive fictional suite. A deliberate local run of:

```text
npm run validate:presets -- --mode full
```

is still required to record the post-cleanup 80-world report. The expected removal of the stale plate-advection findings is a code-level expectation until that manual run is performed.

Any remaining tiny-biome-patch or other scientific findings must be evaluated independently and must not trigger production tuning without measured evidence.

# Intermittent Windows generation-determinism failure

Updated: 2026-08-04
Status: Not reproduced from a clean committed checkout; detailed regression guardrail added

## Reported failure

A local full-suite run on Windows reported one failure:

```text
packages/generator-core/src/generator.test.ts
world generation MVP invariants > is deterministic for the same seed and config

Expected: cbfc0bb6
Received: 450189e9
```

The test generates the same explicit seed and configuration twice in one process and hashes a semantic project signature. This is a genuine determinism invariant; it is not a fixed golden-hash assertion and must not be resolved by changing an expected value or weakening the test.

Reported suite result:

```text
Test Files  1 failed | 109 passed (110)
Tests       1 failed | 399 passed (400)
```

## Initial audit

The inspected path established that:

- the test supplies an explicit seed, so the `Date.now()` fallback is not involved;
- generator-core does not call `Math.random()` on this path;
- graph and phase timing diagnostics do not feed the semantic signature;
- each generation creates a fresh seeded PRNG and graph runner;
- projection lookup and cubed-sphere topology caches are the primary shared mutable-state boundaries;
- the generator still contains sine-hash noise functions that deserve long-term replay-portability scrutiny, but there was no evidence justifying an output-changing replacement as part of this incident.

## Added guardrail

`packages/generator-core/src/generatorDeterminismRegression.test.ts` now verifies, across repeated same-seed runs:

- selected-value stability;
- metric stability;
- climate-diagnostic stability;
- projected and topology-native elevation hashes;
- projected and topology-native biome hashes;
- river-summary stability;
- caller-owned configuration immutability;
- cached cubed-sphere topology immutability;
- cold-versus-warm equirectangular projection-cache equivalence.

Failures report the individual differing component rather than only one aggregate hash.

## Clean reproduction matrix

A temporary Windows GitHub Actions workflow ran both the isolated determinism probes and the entire repository test suite on clean `windows-latest` runners.

### Isolated probes

Run `30971666085`:

- Node 20: passed;
- Node 22: passed;
- Node 24: passed.

### Full suite

Run `30971768672`:

- Node 20: passed;
- Node 22: passed;
- Node 24: passed.

The ordinary Ubuntu validation path also passed with the detailed guardrail enabled.

The temporary diagnostic workflow was removed after the matrix completed. It is not part of the permanent CI footprint.

## Current conclusion

The reported failure is not reproducible from the committed tree under:

- Windows Node 20;
- Windows Node 22;
- Windows Node 24;
- isolated determinism execution;
- full-suite execution;
- cold and warm projection-cache states.

Do not change generator algorithms or replay signatures based only on the single unreproduced observation.

## Required local follow-up

From a clean updated `dev` checkout:

```powershell
git status --short
git pull
node --version
npm ci
npx vitest run packages/generator-core/src/generator.test.ts packages/generator-core/src/generatorDeterminismRegression.test.ts --reporter=verbose
npm test
```

If the detailed guardrail fails, preserve the complete component-level diff and the output of:

```powershell
git rev-parse HEAD
git status --short
node --version
npm --version
```

That evidence is sufficient to identify whether the owner is configuration mutation, topology mutation, projection-cache state, a specific semantic layer, or a local dependency/runtime mismatch.

## Guardrails

- Do not weaken or remove deterministic-generation assertions.
- Do not update an expected hash; this test compares two runs, not a stored baseline.
- Do not replace core noise functions or change generator versions without output-equivalence and replay-compatibility review.
- Do not proceed with unrelated extraction or body-ingestion implementation while the local full suite is red.

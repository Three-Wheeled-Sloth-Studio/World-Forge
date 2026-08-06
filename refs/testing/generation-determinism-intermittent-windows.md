# Intermittent Windows generation-determinism failure

Updated: 2026-08-05
Status: Reopened after an exact local Windows recurrence; root cause not yet isolated

## Reported determinism failure

A local full-suite run on Windows reported:

```text
packages/generator-core/src/generator.test.ts
world generation MVP invariants > is deterministic for the same seed and config

Expected: cbfc0bb6
Received: 450189e9
```

The test generates the same explicit seed and configuration twice in one process and hashes a semantic project signature. This is a genuine determinism invariant. It is not a fixed golden-hash assertion and must not be resolved by changing an expected value or weakening the test.

The first report occurred with:

```text
Test Files  1 failed | 109 passed (110)
Tests       1 failed | 399 passed (400)
```

## Exact recurrence on the geographic-atlas checkpoint

A later local Windows full-suite run at commit `81be5c06164917d7a0c1a1d47b092b2144fa1499` reproduced the exact same aggregate pair:

```text
Expected: cbfc0bb6
Received: 450189e9

Test Files  2 failed | 117 passed (119)
Tests       2 failed | 424 passed (426)
```

The second failure in that run was an unrelated platform-assumption bug in `scripts/publish-sol-starter.test.ts`. That test incorrectly required both `Parchment-Worlds` and `parchment-worlds` candidates to survive on Windows even though production code deliberately deduplicates paths case-insensitively there. The publisher test has been corrected separately.

A repository comparison from the last locally accepted checkpoint, `8456a91e05942fa26f98e833ad359f4cc3a4531e`, through the failing atlas head showed no changes to the ordinary `generateProject` algorithm path. Generator-core changes in that range were limited to Sol and reference-raster support. The recurrence therefore reopens the existing environment, cache-state, or runtime-sensitive defect rather than implicating the atlas implementation.

Do not mark this incident resolved again solely because clean Linux CI or a single Windows rerun passes. Resolution now requires either an identified cause or repeated local Windows acceptance with the strengthened cold and warm diagnostics.

## Initial audit

The inspected path established that:

- the test supplies an explicit seed, so the `Date.now()` fallback is not involved;
- generator-core does not call `Math.random()` on this path;
- graph and phase timing diagnostics do not feed the semantic signature;
- each generation creates a fresh seeded PRNG and graph runner;
- projection lookup and cubed-sphere topology caches are the primary shared mutable-state boundaries;
- the generator still contains sine-hash noise functions that deserve long-term replay-portability scrutiny, but there is no evidence justifying an output-changing replacement as part of this incident.

## Strengthened determinism diagnostics

`packages/generator-core/src/generatorDeterminismRegression.test.ts` verifies, across repeated same-seed runs:

- selected-value stability;
- metric stability;
- climate-diagnostic stability;
- projected and topology-native elevation hashes;
- projected and topology-native biome hashes;
- river-summary stability;
- caller-owned configuration immutability;
- cached cubed-sphere topology immutability;
- cold-versus-warm equirectangular projection-cache equivalence.

The regression previously called `buildCubedSphereTopology` before its first generation. That setup warmed the shared topology cache and could conceal a difference between a truly cold first run and later warm runs. It now performs the first generation before capturing the cached topology, then compares warm generation, cleared projection-cache generation, and topology immutability.

Failures from this detailed guardrail report the individual differing component rather than only the aggregate `450189e9` versus `cbfc0bb6` pair.

## Previous clean reproduction matrix

A temporary Windows GitHub Actions workflow previously ran both the isolated determinism probes and the entire repository test suite on clean `windows-latest` runners.

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

The ordinary Ubuntu validation path also passed with the detailed guardrail enabled. The temporary diagnostic workflow was removed after the matrix completed.

These clean results remain useful evidence that the failure is intermittent or environment-sensitive. They no longer justify calling the incident resolved after the exact local recurrence.

## Previous local timeout follow-up

A separate local Windows full-suite run reported:

```text
packages/generator-core/src/exporters.integration.test.ts
world export integrations > exports structured JSON and simplified SVG
Error: Test timed out in 5000ms.
```

That was a timeout, not an assertion or export-content failure. `vite.config.ts` now sets:

```ts
testTimeout: 15_000
```

This separates correctness from performance. Dedicated generation profiling, production-stage attribution, and performance plans remain responsible for identifying actual regressions. No generator output, export behavior, replay signature, or accepted algorithm changed for the timeout adjustment.

## Previous local acceptance

The product owner's Windows checkout previously passed the focused path and complete suite at:

```text
commit: 8456a91e05942fa26f98e833ad359f4cc3a4531e
Node: v24.14.0
npm: 11.9.0
```

Focused determinism run:

```text
Test Files  2 passed (2)
Tests       24 passed (24)
Duration    11.06s
```

The complete repository suite then passed twice:

```text
Test Files  111 passed (111)
Tests       401 passed (401)
Duration    21.33s
```

and:

```text
Test Files  111 passed (111)
Tests       401 passed (401)
Duration    21.12s
```

That acceptance remains historical evidence, but it is superseded as a resolution claim by the exact later recurrence.

## Current conclusion

The defect is not reproduced reliably from clean committed checkouts, but it has now occurred twice on the product owner's Windows environment with the exact same pair of aggregate signatures.

Current evidence supports these statements:

- deterministic generation remains a mandatory invariant;
- the geographic-atlas work did not alter the ordinary generation algorithm path;
- changing a stored expected hash would be incorrect because the assertion compares two runs in one process;
- a clean Linux CI result does not disprove the local Windows recurrence;
- the next recurrence must be captured through the strengthened component-level regression before changing generator algorithms.

The incident remains open until the differing component and owner are identified or a sufficiently repeated local Windows acceptance establishes that a concrete environment or cache correction removed it.

## Reproduction commands

From a clean updated `dev` checkout:

```powershell
git status --short
git pull
node --version
npm ci
npx vitest run packages/generator-core/src/generator.test.ts packages/generator-core/src/generatorDeterminismRegression.test.ts packages/generator-core/src/exporters.integration.test.ts --reporter=verbose
npm test
```

If the detailed guardrail fails, preserve its complete component-level diff and the output of:

```powershell
git rev-parse HEAD
git status --short
node --version
npm --version
```

That evidence is sufficient to identify whether the owner is configuration mutation, topology mutation, projection-cache state, a specific semantic layer, or a local dependency and runtime mismatch.

## Guardrails

- Do not weaken or remove deterministic-generation assertions.
- Do not update an expected hash; this test compares two runs, not a stored baseline.
- Do not replace core noise functions or change generator versions without output-equivalence and replay-compatibility review.
- Do not treat a correctness-test timeout as a performance acceptance result.
- Do not close this incident again solely from one clean CI or local rerun.

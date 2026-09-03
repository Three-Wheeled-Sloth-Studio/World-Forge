---
type: "Testing Reference"
title: "CI Suite Audit - 2026-08-25"
tags:
- world-forge
- testing
---
# CI Suite Audit - 2026-08-25

Status: accepted cleanup checkpoint.

## Follow-up streamlining

Measured promotion runs showed that the same accepted commit spent roughly one minute in canonical verification inside CI and then repeated that work inside every deployment. The follow-up increment therefore:

- requires successful `Validate World Forge` evidence for the exact source SHA in both the local promotion helper and deployment workflow;
- changes deployment from `npm run verify` to the production `npm run build` compile/bundle path;
- stops automatic duplicate validation on exact fast-forward `qa` and `main` promotions;
- keeps the production-page browser smoke in ordinary CI, while reserving attribution-rerank browser smoke for ready pull requests and manual checkpoints;
- avoids a second TypeScript invocation inside `npm run verify` by using the bundle-only command after validation;
- reduces the ordinary generator validation matrix from eight seeds to three representatives and the geographic harness from two seeds to one, with the full matrices retained through the manual `full_test_matrix` input;
- shares accepted generated fixtures across native diagnostics, exporter contracts, climatological-pressure assertions, and renderer presentation assertions instead of regenerating an equivalent world per assertion group.

Focused reduced and full-matrix runs both pass. Contract assertions remain; the optimization removes repeated setup rather than deleting exporter, determinism, native-stage, circulation, or geographic behavior coverage.

This audit follows owner acceptance of the maintained Ultra Earth local integration path.

## Findings

- `validate.yml` split repository validation into two serial jobs. Both jobs checked out the repository, installed Node, and ran `npm ci`, adding setup cost without parallel feedback.
- The second job manually repeated commands already represented by the canonical `npm run verify` script.
- `ultra-earth-acceptance.yml` reran focused Vitest files that already belong to the normal `npm test` suite and then reran full `npm run verify` on path-matched pushes already covered by `validate.yml`.
- The separate Ultra acceptance workflow also posted start/result comments to issue 124 on every matched push. That was useful during active repair but is now noise after owner acceptance.
- `geographic-drilldown-wp0.yml` remains manual-only and still adds value because it runs `evaluate:regions`, which ordinary repository CI intentionally does not run.
- `ultra-earth-reference.yml` remains manual-only and still adds value because it performs the expensive real scientific-source rebuild and records package/resource evidence that ordinary CI intentionally avoids.

## Cleanup decision

- Keep one authoritative ordinary validation workflow.
- Make that workflow run `npm run verify` plus the two production-browser smoke commands in one job and one dependency installation.
- Remove the dedicated Ultra Earth acceptance workflow. Its regression tests remain in the ordinary Vitest suite.
- Keep the two manual diagnostics described above.
- Do not delete individual unit/integration tests without evidence that they encode obsolete behavior. The quick stale-assertion scan found no clear candidate whose removal would improve signal.

## Expected result

Ordinary pushes retain the same effective correctness gates with less duplicated setup, fewer duplicate test executions, and less issue-comment noise. Expensive source and geographic diagnostics remain available when intentionally requested.

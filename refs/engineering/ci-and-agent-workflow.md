# World Forge CI and Coding-Agent Workflow

World Forge follows the studio-wide [CI Signal Discipline](https://github.com/Three-Wheeled-Sloth-Studio/TWS-Design-Principles/blob/main/engineering/CI-Signal-Discipline.md). That document is the shared principle source. This file records the repository-specific implementation and deliberate deviations.

## Project-specific branch model

World Forge is currently a single-developer repository. Routine implementation works directly on `dev`; `qa` and `main` are promotion targets. This is an explicit project-specific deviation from the shared recommendation to use draft pull requests for substantial work.

Do not create a PR merely to satisfy the generic studio pattern. Use branch isolation or a draft PR only when the user explicitly asks for it, when independent parallel work genuinely requires it, or when a risky experiment should not touch `dev`.

Because `dev` is both the active implementation branch and an automatically validated branch, remote commits must be coherent checkpoints. Connector-level file writes, speculative one-line fixes, and repeated guess-and-push debugging should be batched before updating `dev` whenever the available tooling allows it.

## Automatic CI branches

Full automatic validation runs on pushes to:

- `dev`
- `release/**`

`qa` and `main` are exact-SHA promotion targets. They do not rerun the identical authoritative suite; deployment requires successful `Validate World Forge` evidence for the exact promoted SHA before build or upload begins.

Ready-for-review pull requests also receive the authoritative suite when a PR-based workflow is deliberately used.

## Pull-request behavior

Draft pull requests are exceptional working space in this repository, not the default development path. When one is used, pull-request events still register, but `fast-checks` and `validate` skip while the PR is draft.

Marking the PR ready for review triggers authoritative CI. Converting it back to draft cancels obsolete in-progress work for that PR and skips the replacement jobs.

## Manual validation

Use **Actions -> Validate World Forge -> Run workflow** to run the authoritative suite at an intentional checkpoint without changing branch or PR state. Enable `full_test_matrix` when the extended generation and geographic seed matrices are required.

The geographic drilldown workflow is a manual diagnostic only. It must not run on every `dev` push and must not substitute for the authoritative `Validate World Forge` workflow.

## Concurrency

The authoritative workflow groups runs by workflow plus PR number or branch ref:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

A newer checkpoint cancels obsolete validation for the same PR or accepted branch.

## Validation order

The single authoritative job installs dependencies once, runs `npm run verify`, and then runs the headless production-page smoke. Ready pull requests and manual checkpoints additionally run the attribution-rerank smoke. `npm run verify` performs the case-collision guard and typecheck once, the complete ordinary Vitest/self-test lane, and a bundle-only production build.

## Stable check names

Keep these names stable:

- Workflow: `Validate World Forge`
- Authoritative terminal job: `validate`

GitHub currently reports no protected branches for this repository. If branch protection is added, require the existing `validate` check deliberately. Do not silently replace it with a renamed or draft-only check. `fast-checks` is a prerequisite signal and should become required only through an explicit branch-protection change.

## Exceptions

There are currently no deployment, publication, signing, migration, or irreversible release workflows in this repository.

`release/**` receives ordinary cancelable validation. Any future irreversible workflow must define its own concurrency and cancellation policy rather than inheriting this validation workflow blindly.

## Feedback-governed repair loop

`Three-Wheeled-Sloth-Studio/TWS-Agentic-Harness` is the reference implementation for these controls. World Forge does not vendor the Python harness or make it a runtime dependency; the repository currently needs the governance behavior, not another execution framework.

For validation-driven repair work:

1. Record or retain the meaningful current failure set after each test run.
2. Compare the next failure set to the previous one. A materially smaller set is progress and resets stalled-repair detection.
3. After three consecutive non-improving repairs, stop patching the same seam. Re-evaluate ownership, architecture, assumptions, or the validation strategy before another modification.
4. After five modification iterations without an acceptable checkpoint, require an explicit human decision, re-scope, or documented reason to continue.
5. If an adapter, runner, connector, or environment fails, report the execution fault. Do not translate missing evidence into a passing result.
6. Compress noisy context into the current diff, error trajectory, decisions, and handoff state. Do not preserve unlimited transcript history as working context.
7. Use a genuinely independent verifier for high-risk contract, security, migration, release, or architectural changes when available. Do not invoke a second model for routine changes solely for ceremony.

The thresholds are circuit breakers, not goals. A clear architectural diagnosis can justify changing direction before the third failed repair.

## Coding-agent and diagnostic rules

- Publish coherent checkpoints rather than one remote commit per speculative edit.
- Run the cheapest relevant local test first when local execution is available.
- Read the existing failure before publishing a repair.
- Do not create push-triggered one-shot diagnostic workflows.
- Temporary diagnostics must be manual-only, narrowly scoped, safe for this public repository, and removed when they stop providing durable value.
- Prefer existing logs, clean-checkout reproduction, focused reruns, and uploaded artifacts over committed logs or environment dumps.
- Treat manifests, icons, capabilities, schemas, generated context, lock files, and packaging configuration as part of the build contract.
- Do not commit `.local` output, transient performance logs, downloaded reference datasets, or diagnostic dumps.
- Remove repair scaffolding and superseded diagnostics before a milestone is considered complete.

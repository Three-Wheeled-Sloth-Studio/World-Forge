# World Forge CI and Coding-Agent Workflow

World Forge follows the studio-wide [CI Signal Discipline](https://github.com/Three-Wheeled-Sloth-Studio/TWS-Design-Principles/blob/main/engineering/CI-Signal-Discipline.md). That document is authoritative. This file records only the repository-specific implementation.

## Automatic CI branches

Full automatic validation runs on pushes to:

- `main`
- `dev`
- `qa`
- `release/**`

Ready-for-review pull requests also receive the authoritative suite.

## Draft pull requests

Draft pull requests are working space. Pull-request events still register, but `fast-checks` and `validate` skip while the PR is draft. Commits to a draft PR therefore do not launch the full validation suite.

Marking the PR ready for review triggers authoritative CI. Converting it back to draft cancels obsolete in-progress work for that PR and skips the replacement jobs.

## Manual draft validation

Use **Actions → Validate World Forge → Run workflow**, then select the draft branch. `workflow_dispatch` bypasses the draft guard and runs the full suite without changing the PR review state.

GitHub exposes manual dispatch from the default branch. During rollout, this control becomes available after the workflow revision reaches `main`.

## Concurrency

The workflow groups runs by workflow plus PR number or branch ref:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

A newer checkpoint cancels obsolete validation for the same PR or accepted branch.

## Validation order

The workflow runs in this order:

1. `fast-checks`: dependency installation and the complete Vitest suite.
2. `validate`: dependency installation, TypeScript compilation and production frontend build.
3. Production page and attribution harness self-tests.
4. Headless production page and attribution smoke runs.

`validate` depends on `fast-checks`, so the slower build and browser checks do not start when the test suite has already rejected the checkpoint.

## Stable check names

Keep these names stable:

- Workflow: `Validate World Forge`
- Authoritative terminal job: `validate`

GitHub currently reports no protected branches for this repository. If branch protection is added, require the existing `validate` check deliberately. Do not silently replace it with a renamed or draft-only check. `fast-checks` is a prerequisite signal and should become required only through an explicit branch-protection change.

## Exceptions

There are currently no deployment, publication, signing, migration, or irreversible release workflows in this repository.

`release/**` receives ordinary cancelable validation. Any future irreversible workflow must define its own concurrency and cancellation policy rather than inheriting this validation workflow blindly.

## Coding-agent and diagnostic rules

- Start substantial, cross-stack, or diagnostic-heavy work as a draft PR.
- Publish coherent checkpoints rather than one remote commit per speculative edit.
- Run the cheapest relevant local test first when local execution is available.
- Read the existing failure before publishing a repair.
- Do not create push-triggered one-shot diagnostic workflows.
- Temporary diagnostics must be manual-only, narrowly scoped, safe for this public repository, and removed before review.
- Prefer existing logs, clean-checkout reproduction, focused reruns, and uploaded artifacts over committed logs or environment dumps.
- Treat manifests, icons, capabilities, schemas, generated context, lock files, and packaging configuration as part of the build contract.
- Do not commit `.local` output, transient performance logs, downloaded reference datasets, or diagnostic dumps.
- Remove repair scaffolding and superseded diagnostics before marking a PR ready.

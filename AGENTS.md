# Agent Working Agreement

## Shared studio guidance

World Forge uses these shared studio sources as guidance, not as a compliance checklist:

- `Three-Wheeled-Sloth-Studio/TWS-Design-Principles` - durable cross-project product, application, engineering, UI, and release principles.
- `Three-Wheeled-Sloth-Studio/Agent-Academy` - project-memory and agent-orientation patterns.
- `Three-Wheeled-Sloth-Studio/TWS-Agentic-Harness` - reference implementation for feedback-governed coding-agent execution.

Apply the parts that solve an actual World Forge problem. Do not add files, dependencies, process, or ceremony solely to resemble a template. Project-specific instructions in this file and recorded project decisions take precedence when generic guidance conflicts. Record deliberate deviations instead of leaving contradictory instructions in place.

Start project-memory work at `refs/README.md`. See `refs/engineering/studio-principles-application.md` for the current application/deferment record.
Generic OKF-compatible discovery begins at `refs/index.md`; `refs/okfProfile.yaml` defines the interoperability boundary without replacing the project-specific reading order.

## Repository workflow

This repository is maintained by one active developer and is delivered in small, sequential increments.

Agents working in this repository must:

1. Work directly on `dev` unless the user explicitly directs otherwise.
2. Publish coherent, useful checkpoints to `dev`. Do not turn connector-level file writes or speculative one-line edits into separate remote commits.
3. Keep only one active implementation path in flight. Do not create feature branches, planning branches, or pull requests for routine increments.
4. Promote the exact accepted `dev` commit upward after each functional milestone using the repository's established `dev -> qa -> main` process.
5. Treat `qa` and `main` as promotion targets, not parallel development branches.
6. Keep `refs/handoffs/`, `refs/testing/`, and other relevant reference material current in the same increment as the behavior they describe.
7. Prefer small, reversible, coherent commits over speculative architecture batches.
8. Do not manufacture multi-developer ceremony. Branch isolation, stacked PRs, and parallel feature coordination are unnecessary unless the user explicitly changes the operating model.

The studio CI guidance discusses draft PRs because that is useful in multi-branch workflows. World Forge deliberately deviates: direct sequential `dev` work is the normal operating model. Draft PR behavior is relevant only when the user explicitly asks for branch isolation or a PR-based workflow.

## Feedback-governed repair loops

Use the control ideas in `TWS-Agentic-Harness` when an implementation becomes iterative:

- After each validation-driven repair, compare the current failure set with the prior one. Progress means the relevant error set or failing acceptance surface materially shrank, not merely that different errors appeared.
- Three consecutive materially non-improving repair attempts are a breaker. Stop local patching and inspect the architecture, ownership boundary, assumptions, or test strategy before another repair.
- A real reduction in the failure set resets the stalled-repair count.
- Five modification iterations without an acceptable checkpoint require an explicit human decision, re-scope, or documented reason to continue. Do not silently spin.
- When context becomes noisy, compress it into structural diffs, current failures, decisions, and `refs/handoffs/currentHandoff.md` instead of carrying a growing transcript forward.
- Tool, adapter, or environment failure is not evidence that implementation passed. Surface the blocker explicitly.
- Use independent verification for high-risk contract, security, migration, release, or architecture changes when a genuinely independent verifier is available. Routine low-risk changes do not require a second agent merely to check a box; deterministic tests and user acceptance may be the appropriate verifier.

See `refs/engineering/ci-and-agent-workflow.md` for the repository-specific CI and repair-loop implementation.

## Safety and validation

- Never commit secrets, credentials, private keys, or unrestricted service tokens.
- Run the narrowest relevant tests during implementation and the repository verification commands before declaring a milestone complete.
- Read `refs/testing/validationCommands.yaml` before finalizing a change; commands are scoped by change type rather than universally mandatory.
- Do not claim validation passed when it was not run or when GitHub reports no check result.
- Preserve deterministic generation, stable IDs, replay compatibility, and saved-world contracts unless a change is explicitly approved and documented.

### Cross-platform path casing

Case-only filename distinctions are forbidden. Windows commonly resolves paths case-insensitively while Git and Linux CI preserve case, so files such as `GeographicAtlasContextMap.tsx` and `geographicAtlasContextMap.ts` can coexist remotely but break a Windows checkout with `TS1149` or `TS1261`. This has been a recurring repository failure mode.

Agents must:

- ensure no two tracked paths differ only by capitalization;
- match import casing exactly to the tracked filename;
- use semantic helper suffixes such as `Geometry`, `Model`, `State`, or `Utils` instead of relying on initial-letter case to distinguish modules;
- use an intermediate `git mv` name for case-only renames;
- run `npm run check:case-collisions` before committing file additions or renames.

`npm run typecheck` and `npm run build` execute this guard automatically. A Windows-only casing error is a repository defect, not a local-environment exception. See `refs/engineering/cross-platform-path-casing.md` and `refs/testing/case-collision-regression.md`.

## Current product references

Before changing geographic drilldown behavior, read and update as appropriate:

- `refs/handoffs/geographic-region-drilldown.md`
- `refs/testing/geographic-region-drilldown-qa.md`
- `refs/handoffs/geographic-drilldown-rendering-roadmap.md`

Before changing system, globe, weather, seasonal, or secondary-body enrichment behavior, read and update as appropriate:

- `refs/planning/pi-system-visualization-and-progressive-body-enrichment.md`
- `refs/planning/background-secondary-body-generation-2026-09-02.md`
- `refs/testing/background-secondary-body-generation-qa-2026-09-02.md`
- `refs/handoffs/background-secondary-body-generation-checkpoint.md`

# Current Handoff: Infrastructure Baseline and Product Pivot

Updated: 2026-08-07

Status: **Shared studio guidance reviewed and selectively incorporated; geographic atlas visual iteration is paused at visible version `0.3.71`; no new product PI is selected in this handoff.**

## Current operating state

- repository: `Three-Wheeled-Sloth-Studio/World-Forge`
- branch: `dev`
- visible version: `0.3.71`
- geographic atlas issue `#10` remains open but is parked after repeated visual iteration produced diminishing returns;
- the complete prior geographic-atlas state is preserved at `refs/handoffs/archive/geographic-atlas-v0.3.71-paused.md`;
- do not resume atlas rendering work by default; wait for explicit user direction or a clearly related task.

No runtime behavior, saved-world contract, generator contract, or visible version changes are part of this housekeeping increment.

## Project-memory entry points

Start future implementation work with:

1. `AGENTS.md`
2. `refs/README.md`
3. `refs/project.yaml`
4. this handoff
5. the planning, engineering, decision, research, or testing references directly relevant to the requested change
6. `refs/testing/validationCommands.yaml` before finalizing the increment

Do not broadly import or recreate the blank Agent Academy template. World Forge already has a mature `refs/` taxonomy; add standardized metadata only where it solves a retrieval or automation need.

## Shared guidance baseline

Canonical shared sources:

- `Three-Wheeled-Sloth-Studio/TWS-Design-Principles`
- `Three-Wheeled-Sloth-Studio/Agent-Academy`
- `Three-Wheeled-Sloth-Studio/TWS-Agentic-Harness`

Detailed World Forge application and deliberate deferments are recorded in `refs/engineering/studio-principles-application.md`.

Key operating rules now captured locally:

- shared guidance is a decision aid, not a compliance checklist;
- World Forge keeps its single-developer direct-`dev` workflow instead of manufacturing routine draft-PR ceremony;
- publish coherent checkpoints rather than connector-level file-write commits;
- the Git-index case-collision guard remains mandatory and runs before build/typecheck, with an explicit early CI check;
- three consecutive materially non-improving repair attempts trigger architectural reassessment rather than another patch at the same seam;
- five unsuccessful modification iterations require an explicit human decision, re-scope, or documented reason to continue;
- tool or adapter failure is a blocker, not evidence of success;
- independent verification is used where risk justifies it, not as mandatory second-agent ceremony.

The Python `TWS-Agentic-Harness` is a reference implementation, not a World Forge dependency. World Forge currently needs its feedback-governance concepts, not another orchestration runtime.

## CI and diagnostics

Authoritative repository CI remains `.github/workflows/validate.yml` (`Validate World Forge`). It retains automatic validation on accepted branches, concurrency cancellation, and cheap-to-expensive ordering.

The former push-triggered geographic drilldown workflow is now `Geographic Drilldown Diagnostic` and is manual-only. Use it only when geographic work needs a clean remote focused checkpoint. It is not authoritative repository CI and should not run on ordinary `dev` pushes.

Project-specific CI and agent behavior is documented in `refs/engineering/ci-and-agent-workflow.md`.

## Validation expectations

Read `refs/testing/validationCommands.yaml` and run the narrowest useful checks for the change being made.

General expectations:

- use focused tests while iterating;
- use `npm run validate` for a coherent implementation checkpoint;
- use `npm run verify` before declaring a functional/build-facing milestone complete;
- use `npm audit` when dependencies or security-sensitive build inputs change, not as ritual for every documentation edit;
- use `npm run evaluate:regions` only when geographic generation behavior changes;
- never claim validation passed unless it actually ran and produced evidence.

## Parked geographic atlas work

Issue `#10` and the archived `0.3.71` handoff contain the full state of the current atlas implementation, tests, visual target, and remaining QA. Preserve that work as a recoverable branch of product development, but do not spend more effort tuning it until the user explicitly chooses to return.

If the atlas is resumed later, begin from the archived handoff and current issue state rather than reconstructing context from chat history.

## Next work

Await the user's next product or infrastructure priority. Keep the geographic work parked and preserve the new agent/CI/project-memory baseline unless a future task exposes a concrete reason to adjust it.

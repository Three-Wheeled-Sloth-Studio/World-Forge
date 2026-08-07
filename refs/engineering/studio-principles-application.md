# Shared Studio Guidance: World Forge Application Record

Updated: 2026-08-07

Canonical guidance lives outside this repository:

- `Three-Wheeled-Sloth-Studio/TWS-Design-Principles`
- `Three-Wheeled-Sloth-Studio/Agent-Academy`
- `Three-Wheeled-Sloth-Studio/TWS-Agentic-Harness`

World Forge references those sources rather than copying them. This file records only project-specific application, deferment, and deviation decisions.

## Principle

Shared guidance is a decision aid, not a compliance checklist. Adopt a pattern when it reduces ambiguity, rework, risk, or repeated friction. Do not add ceremony or infrastructure merely because another repository contains it.

When generic guidance conflicts with an explicit World Forge operating decision, preserve the project decision and record the deviation here or in the relevant engineering/decision file.

## Applied now

### CI signal discipline

World Forge already implements the durable parts of `engineering/CI-Signal-Discipline.md`:

- authoritative automatic validation on `dev`, `qa`, `main`, and `release/**`;
- draft-PR guards for the exceptional cases where PRs are used;
- workflow concurrency with obsolete-run cancellation;
- cheap tests before slower build/browser validation;
- manual authoritative workflow dispatch;
- project-specific coding-agent and diagnostic rules in `refs/engineering/ci-and-agent-workflow.md`.

The former push-triggered geographic drilldown workflow is now a manual diagnostic. It no longer duplicates expensive repository validation on ordinary `dev` pushes.

The Git-index case-collision guard now runs as the first explicit fast CI check before the test suite.

### Cross-platform path safety

The latest Agent Academy case-collision guidance was already substantially adopted before this pass:

- `npm run check:case-collisions` uses tracked paths as the primary authority;
- typecheck and build invoke the guard automatically;
- `AGENTS.md`, `refs/engineering/cross-platform-path-casing.md`, and `refs/testing/case-collision-regression.md` document the rule and regression pattern.

No duplicate guard was added.

### Project memory and orientation

World Forge already has a mature `refs/` tree, so the blank Agent Academy harness is not being copied wholesale.

This pass adds only the pieces that close real retrieval gaps:

- `refs/README.md` as a predictable entry point and reading order;
- `refs/project.yaml` as compact project identity and source-of-truth metadata;
- `refs/testing/validationCommands.yaml` as a machine-readable validation index.

`AGENTS.md` remains the authoritative agent working agreement. A second `refs/agents.yaml` is intentionally not maintained because it would duplicate live instructions and create drift without a current consumer.

### Feedback-governed agent repair

The control concepts from `TWS-Agentic-Harness` are adopted in `AGENTS.md` and `refs/engineering/ci-and-agent-workflow.md`:

- track meaningful error trajectory across repair attempts;
- treat three consecutive non-improving repairs as a breaker that forces architectural reassessment;
- reset stalled-repair detection when failures materially decrease;
- require a human decision or re-scope after five unsuccessful modification iterations;
- compress noisy context into diffs, failures, decisions, and handoffs;
- treat tool/adapter failure as an explicit execution failure rather than missing evidence of success;
- use independent verification where risk justifies it, not as mandatory ceremony for routine changes.

The Python harness itself is not vendored, submoduled, or added as a World Forge dependency. World Forge does not currently provide an autonomous coding-agent execution product surface, so embedding another orchestration runtime would add cost without solving a product problem.

### Application and UI guidance

`apps/App-Design-Principles.md` and `apps/Interaction-Behavior-Standards.md` remain active guidance for touched UI surfaces. Relevant existing World Forge directions already align with structured runtime state, progressive disclosure, compact action surfaces, easy-to-do/easy-to-undo editing, and predictable transient-control dismissal.

This housekeeping pass does not mass-refactor stable UI merely to restyle it against the shared guide.

## Deliberate deviations or deferred adoption

### Direct `dev` development instead of routine draft PRs

The shared CI guidance recommends draft PRs for substantial work. World Forge's current single-developer operating model explicitly works directly on `dev` and promotes accepted commits through `qa` and `main`.

That project-specific rule remains in force. The useful shared behavior is coherent checkpoint publishing and non-noisy CI, not PR ceremony.

### Full Agent Academy schema/template validation

Not adopted now. World Forge predates the template and has a large established `refs/` taxonomy. Importing `templatePolicy.yaml`, the full schema registry, blank integration files, and template validator would add maintenance surface without a current consumer.

Revisit if cross-project tooling begins reading standardized refs metadata programmatically.

### Externalized build metadata

`App-Design-Principles` recommends externalizing build metadata once channel-specific values begin to diverge. World Forge currently has simple build/version handling and no sufficiently complex release-channel matrix to justify restructuring it in this housekeeping pass.

Revisit when hosted, standalone desktop, Steam, updater, or tier-specific build configuration begins duplicating release values.

### Large-build storage topology

The shared principle to keep large generated build artifacts outside the repository is important for native packaging and multi-gigabyte outputs. The current Vite `dist/` is small, transient, and ignored; moving it solely for policy symmetry would create friction without meaningful storage benefit.

Large reference datasets already live under ignored local storage, and future Tauri/native packaging, installers, QA staging, or large compiler caches should adopt an external same-drive build root before they become expensive.

### Steam release operations

The shared Steam operations guide remains relevant to the planned Steam release path but is not active infrastructure until Steam packaging/distribution work begins.

## Review trigger

Update this file only when a shared principle materially changes World Forge behavior, when World Forge deliberately deviates from shared guidance, or when repeated project friction suggests a local lesson should be promoted back into a studio-wide principle.

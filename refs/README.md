---
type: "Project Memory Guide"
title: "World Forge Project Memory"
tags:
- world-forge
- project-memory
---
# World Forge Project Memory

`refs/` is the durable project-memory layer for World Forge. It contains planning, decisions, engineering notes, QA evidence, research, and handoffs that should survive beyond a chat or one implementation session.

World Forge predates the reusable `Agent-Academy` refs template and already has a mature project-specific layout. Do not reshape this directory merely to match the blank template. Adopt Academy conventions only when they improve retrieval, reduce ambiguity, or support useful automation.

## Start here

For implementation work, read in this order:

1. `AGENTS.md` - repository workflow, safety, validation, and agent repair-loop rules.
2. `refs/project.yaml` - compact project identity and source-of-truth pointers.
3. `refs/handoffs/currentHandoff.md` - current work state, pauses, and next-agent context.
4. The planning, decision, engineering, research, or testing files directly relevant to the requested change.
5. `refs/testing/validationCommands.yaml` before finalizing the increment.

Search narrowly from these pointers before scanning the repository broadly.

## Shared guidance

World Forge references rather than copies shared studio guidance:

- `Three-Wheeled-Sloth-Studio/TWS-Design-Principles`
- `Three-Wheeled-Sloth-Studio/Agent-Academy`
- `Three-Wheeled-Sloth-Studio/TWS-Agentic-Harness`

See `refs/engineering/studio-principles-application.md` for what is currently applied, deferred, or intentionally not adopted.

Shared guidance is not a checklist. Project-specific decisions and user direction win when a generic pattern is a poor fit, but deliberate deviations should be recorded so future agents do not have to rediscover the conflict.

## Durable knowledge rules

- Record decisions and rationale when they affect future implementation choices.
- Archive context-heavy paused work before replacing the current handoff.
- Keep QA evidence near the feature or system it validates.
- Prefer links to canonical shared guidance over copied prose that can drift.
- Do not store secrets, API keys, access tokens, passwords, private keys, personal credentials, or machine-only paths in `refs/`.
- Do not create new metadata files merely because the Academy template contains one; add them when a real consumer or retrieval need exists.

## OKF-compatible discovery

World Forge exposes this mature project-memory corpus through the Agent Academy OKF-compatible profile without replacing its established taxonomy or deterministic YAML state.

- Start generic OKF traversal at `refs/index.md`.
- Profile semantics and the pinned OKF baseline are in `refs/okfProfile.yaml`.
- Markdown knowledge files are OKF concepts; YAML files remain authoritative structured resources where exact state matters.
- Generated `index.md` files are committed for zero-setup discovery. Regenerate with `python refs/tools/generate_okf_indexes.py` and validate with `npm run validate:okf`.
- OKF `verified` is a factual trust claim. Passing repository tests or refs validation does not create that claim.

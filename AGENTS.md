# Agent Working Agreement

## Repository workflow

This repository is maintained by one active developer and is delivered in small, sequential increments.

Agents working in this repository must:

1. Work directly on `dev` unless the user explicitly directs otherwise.
2. Commit each coherent functional milestone to `dev` as soon as it is internally consistent.
3. Keep only one active implementation path in flight. Do not create feature branches, planning branches, or pull requests for routine increments.
4. Promote the exact accepted `dev` commit upward after each functional milestone using the repository's established `dev -> qa -> main` process.
5. Treat `qa` and `main` as promotion targets, not parallel development branches.
6. Keep `refs/handoffs/`, `refs/testing/`, and other relevant reference material current in the same increment as the behavior they describe.
7. Prefer small reversible commits over speculative architecture batches.
8. Do not manufacture multi-developer ceremony. Branch isolation, stacked PRs, and parallel feature coordination are unnecessary unless the user explicitly changes the operating model.

## Safety and validation

- Never commit secrets, credentials, private keys, or unrestricted service tokens.
- Run the narrowest relevant tests during implementation and the repository verification commands before declaring a milestone complete.
- Do not claim validation passed when it was not run or when GitHub reports no check result.
- Preserve deterministic generation, stable IDs, replay compatibility, and saved-world contracts unless a change is explicitly approved and documented.

## Current product references

Before changing geographic drilldown behavior, read and update as appropriate:

- `refs/handoffs/geographic-region-drilldown.md`
- `refs/testing/geographic-region-drilldown-qa.md`
- `refs/handoffs/geographic-drilldown-rendering-roadmap.md`

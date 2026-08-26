# Next Dev Prompt: Downstream Earth Validation

Updated: 2026-08-26

Continue from `refs/testing/downstream-generator-earth-validation-2026-08-26.md`.

The reusable framework, Earth production adapter, fixed 128 x 64 analysis grid, and Fast/Standard/Ultra baselines are established. Final biome ownership and final-wind orographic reconciliation have been corrected from measured evidence. Stored flow vectors remain geographic north-positive; presentation converts them to south-increasing raster rows.

The evaluator-only wet/dry regime diagnostic is complete. Observed-wet deep interiors are false dry at about 0.94-0.95 across temperature bands, while observed-dry coasts are false wet at about 0.88-0.91; relief is not the primary separator. Next, prototype bounded redistribution of coastal moisture farther inland, preferably wind-aligned at fixed reference scale and conserving or nearly conserving the affected contribution. Protect regime error rates, humid/dry region means, latitude-contrast error, orography, biome F1, and performance. Retain answer-key isolation and keep Earth/performance diagnostics manual outside push CI.

Continue implementation in:

`https://github.com/Three-Wheeled-Sloth-Studio/World-Forge`

Work directly on `dev`.

## Starting point

The maintained Ultra Earth integration is accepted far enough to pause. Do not restart the source-resolution investigation or rebuild the same acceptance machinery without new evidence.

Validated functional/CI checkpoint before the current documentation update:

- commit: `8a8b4d259e46945e768d9e4168ecc24bd48efef8`
- visible runtime: `0.3.81`
- validation run: `32894204075`
- `npm run verify`: green
- production page-harness smoke: green
- production attribution-rerank smoke: green

Read first:

1. `AGENTS.md`
2. `refs/README.md`
3. `refs/project.yaml`
4. `refs/handoffs/currentHandoff.md`
5. `refs/testing/ci-suite-audit-2026-08-25.md`
6. `refs/testing/validationCommands.yaml`
7. `refs/research/reference-data/earth-reference-data.md`
8. World Forge issue #124
9. Parchment Worlds issue #22 when sibling access is available

## Accepted contracts

Maintained Earth:

- raster: `4096 x 2048`
- canonical topology: `1024`

Ordinary fictional generation remains independent:

- default: `1024 x 512`
- lower Standard tier: `512 x 256`

One maintained Sol package remains one project with 23 bodies. Do not split Earth out of Sol or drop Jupiter/Mars.

## Owner QA already established

Do not ask the owner to repeat these checks without a concrete reason:

- Parchment login works when its machine-local `.env.local` is present;
- a Parchment project loads;
- the Sol handoff reaches World Forge;
- Earth reports `4096 x 2048` map scale;
- the high-resolution 3D/globe presentation is slow to appear but eventually loads;
- secondary planets continue to load/display.

The temporary local login failure was missing machine-local Firebase web configuration, not reverted auth code.

## Canonical local/source workflow

Normal local Parchment startup owns maintained-reference preparation. Do not restore manual owner instructions for separate Mars/Earth commands.

The canonical World Forge command remains:

```text
npm run reference:build-sol
```

Use it directly only for World Forge-maintained reference work or diagnostics. Parchment invokes/reuses it automatically during its normal starter preparation.

## CI posture

Ordinary World Forge CI is now intentionally simple:

- one GitHub-hosted validation job;
- one `npm ci`;
- `npm run verify`;
- production page-harness smoke;
- production attribution-rerank smoke.

The old dedicated Ultra acceptance workflow was deleted because it duplicated tests and full verification already present in ordinary CI.

Keep these intentional manual diagnostics:

- Geographic Drilldown Diagnostic, because it runs `evaluate:regions`;
- Ultra Earth Reference Diagnostic, because it performs the expensive real scientific-source build and records package/resource evidence.

Do not add a new path-specific workflow for tests already contained in the ordinary suite unless it provides genuinely different evidence.

## If payload/performance optimization is selected next

The observed slow 3D startup and measured package costs make this a legitimate next slice, but it is not automatically authorized merely because the Ultra baseline is accepted.

When selected, work in this order:

1. binary typed-layer entries inside `.wforge` instead of JSON numeric arrays;
2. backward-compatible current-package reader;
3. remeasure `.wforge` size, package save/reopen, Parchment handoff/import, memory, and Globe/3D startup latency;
4. staged/lazy hydration only if measurements still justify it;
5. then evaluate Parchment's base64 JSON attachment envelope.

Preserve Earth `4096 x 2048` / topology `1024` throughout. Do not optimize by reducing resolution.

## If another roadmap slice is selected instead

Treat the Ultra work as a stable dependency. Do not broaden unrelated work into new Earth climate/source ingestion, package rewrites, or presentation churn unless the selected slice requires it.

## Validation

During implementation, run focused tests for the touched seam. For a functional checkpoint:

```text
npm run verify
```

Ordinary CI also runs the two production browser smokes. Real scientific-source rebuilds remain intentional diagnostics, not push CI.

## Guardrails

- Work directly on `dev`.
- Keep the current handoff and next-dev prompt aligned with the selected next slice.
- Preserve deterministic IDs and package compatibility.
- Keep one Sol project with Earth, Jupiter, Mars, and the remaining catalog.
- Do not reintroduce duplicate CI just to get faster status comments.
- Do not commit local Firebase/server credentials.

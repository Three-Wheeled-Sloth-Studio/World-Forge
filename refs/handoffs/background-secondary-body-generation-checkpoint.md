---
type: "Handoff Record"
title: "Background Secondary-Body Generation Checkpoint"
tags:
- world-forge
- handoffs
---
# Background Secondary-Body Generation Checkpoint

Updated: 2026-09-02

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

## Product outcome

World Forge now treats compact secondary-body generation as silent post-primary enrichment rather than a manual batch operation.

After a primary world is available:

- missing/stale orbital context is prepared automatically outside the primary generation graph;
- pristine eligible non-primary bodies are automatically generated at Preview fidelity (`64 x 32`);
- body generation remains sequential on the existing enrichment worker;
- foreground generation/enrichment preempts background body work;
- user-requested Standard regeneration (`128 x 64`) is the primary manual quality action.

See `refs/planning/background-secondary-body-generation-2026-09-02.md` for the accepted behavior contract and `refs/testing/background-secondary-body-generation-qa-2026-09-02.md` for QA boundaries.

## Implementation shape

### Lifecycle/runtime

`packages/generation-runtime/src/enrichment/bodyGenerationLifecycle.ts`

- adds a conservative automatic Preview queue that claims only pristine ungenerated bodies;
- adds foreground preemption that requeues an interrupted body at the front without losing requested fidelity;
- allows an existing valid lower-fidelity artifact to remain usable while a higher-fidelity request is queued/running;
- preserves failed and stale states for explicit user handling.

`apps/desktop/src/enrichment/useBodyGenerationQueue.ts`

- enables automatic Preview generation by default once orbital context is available;
- runs one body at a time with a short inter-body delay;
- observes non-body generation telemetry as foreground priority;
- cooperatively cancels/requeues active background work when foreground work starts;
- resumes after foreground completion, failure, or cancellation;
- supports explicit Pause/Resume and Standard upgrades;
- prioritizes Standard requests ahead of remaining queued Preview work.

`apps/desktop/src/enrichment/useProjectEnrichment.ts`

- prepares missing/stale orbital context after the primary project is available, without adding it to primary generation.

Generation telemetry now includes an explicit `cancelled` terminal phase; orbital, weather, seasonal, and stellar enrichment use it so foreground priority cannot remain stuck after cancellation.

### UI

`apps/desktop/src/system/BodyGenerationPanel.tsx`

- replaces the old manual Queue bodies / Start queue framing with background status and Pause/Resume;
- reports actual generated quality;
- offers `Upgrade to Standard` for Preview bodies;
- offers Standard regeneration for already upgraded bodies;
- explains that Preview remains visible until a Standard replacement succeeds.

## Tests

`packages/generation-runtime/src/enrichment/bodyGenerationLifecycle.test.ts` adds focused coverage for:

- automatic Preview eligibility;
- no automatic retry of failed bodies;
- preemption/requeue fidelity preservation;
- Preview fallback while Standard is queued;
- existing deterministic persistence/reopen behavior across all supported body profiles.

## Guardrails

Do not turn automatic Preview into full secondary-world generation.

Do not add secondary work to the ordinary primary generation graph.

Do not parallelize body generation merely to finish faster; UI responsiveness has priority over background completion time.

Do not auto-retry failed or stale bodies without a separate product decision.

Do not discard a usable Preview before an explicit higher-fidelity replacement validates successfully.

## Remaining owner QA

After canonical CI is green on the final exact SHA, the useful manual check is perceptual:

1. generate a new primary;
2. interact with Map immediately while the background system fills in;
3. compare pan/zoom/layer/panel responsiveness with Pause background toggled;
4. open System and confirm bodies transition to Preview without manual queue operation;
5. select a Preview body and Upgrade to Standard;
6. confirm the Preview remains visible during the upgrade and Standard replaces it after success;
7. start/cancel optional foreground enrichment and confirm background work yields and resumes.

Do not claim measured frame-time parity unless an explicit performance capture is added later.

---
type: "Testing Reference"
title: "Background Secondary-Body Generation QA"
tags:
- world-forge
- testing
---
# Background Secondary-Body Generation QA

Updated: 2026-09-02

## Scope

This checkpoint covers orchestration and UI changes for automatic compact generation of non-primary system bodies after the primary world is available.

No primary-world scientific generator behavior changed.

## Automated contract coverage

`packages/generation-runtime/src/enrichment/bodyGenerationLifecycle.test.ts` now verifies:

- every supported non-primary body remains capability-resolved and eligible;
- automatic Preview policy queues only pristine ungenerated bodies;
- failed bodies are not silently reclaimed by background generation;
- foreground preemption returns an active body to the front of the queue without losing requested fidelity;
- a valid Preview artifact remains usable while a Standard upgrade is queued;
- deterministic identity, retry, stale-source detection, persistence, reopen, and all supported body profiles continue to work.

Repository checkpoint validation uses the normal UI/runtime gate from `refs/testing/validationCommands.yaml`:

```text
npm run verify
npm run smoke:production-page-harness
```

The fictional preset matrix and maintained Earth scientific diagnostics are not relevant to this orchestration-only change and remain manual-only.

## Runtime acceptance behavior

Expected automatic sequence:

1. Primary project becomes usable.
2. Missing/stale orbital context starts as separate post-primary enrichment.
3. Pristine eligible non-primary bodies queue automatically at Preview `64 x 32`.
4. Exactly one body worker runs at a time.
5. Body jobs have a short inter-job scheduling gap.
6. A non-body generation/enrichment task preempts active body work and pauses the queue.
7. Completion, failure, or cancellation of foreground work releases the priority hold and allows background work to resume.
8. Explicit user Pause stops automatic restarts until Resume or another explicit body-generation action.

Expected manual quality sequence:

1. Generated Preview body offers `Upgrade to Standard`.
2. Standard `128 x 64` request moves ahead of remaining queued Preview jobs.
3. Existing Preview remains renderable while Standard is queued or running.
4. Failed/cancelled Standard generation leaves Preview usable.
5. Successful Standard generation becomes the current generated artifact.

## Responsiveness acceptance criterion

Background generation must not produce a perceptible interaction penalty in the primary experience.

Owner/browser QA should compare background active versus paused while exercising:

- Map pan and zoom;
- layer/display changes;
- left/right panel interactions;
- Map/Globe/System navigation;
- System selection and camera manipulation;
- starting and cancelling optional foreground enrichment.

The expected result is perceptibly equivalent responsiveness. Web Worker isolation and passing CI establish architecture/build correctness but do not substitute for that perceptual observation.

## Evidence limits

Do not claim frame-time equivalence or a measured CPU ceiling from this checkpoint unless an explicit browser performance run is recorded. The implementation provides structural protections: one sequential worker, foreground preemption, cooperative cancellation, and a short inter-body delay.

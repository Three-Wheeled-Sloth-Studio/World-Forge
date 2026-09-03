---
type: "Planning Reference"
title: "Background Secondary-Body Generation Contract"
tags:
- world-forge
- planning
---
# Background Secondary-Body Generation Contract

Updated: 2026-09-02

Status: accepted and implemented on `dev`

## Product decision

After the user generates or opens a primary world, World Forge should quietly flesh out the remaining eligible system bodies at cheap Preview fidelity while the user continues working with the primary.

This is a deliberate exception to the earlier explicit-only enrichment language in `refs/planning/pi-system-visualization-and-progressive-body-enrichment.md`. The exception is narrow:

- ordinary primary-world generation remains bounded and unchanged;
- post-primary orbital-context preparation may begin automatically after the primary project is available;
- pristine non-primary bodies may then generate automatically at Preview fidelity;
- expensive or higher-fidelity regeneration remains an explicit user action.

The purpose is to make a generated system progressively become inspectable without making the user operate a batch queue or wait for secondary bodies before the primary becomes usable.

## Background Preview contract

Automatic background generation follows these rules:

1. Primary-world generation completes through the existing authoritative generation workflow and returns control to the UI first.
2. Missing or stale system orbital context is prepared as a separate enrichment workflow after the primary project is available.
3. Every pristine eligible non-primary body is queued at `preview` fidelity.
4. Preview generation remains the existing compact `64 x 32` persisted body field, not the primary-world generation graph.
5. The queue executes sequentially with one body worker active at a time.
6. A short inter-body delay leaves the UI an opportunity to process foreground work between body jobs.
7. Completed artifacts persist normally with body provenance, workflow identity, deterministic seed, validation, and source signatures.
8. Failed, stale, or previously generated bodies are not silently retried or downgraded by automatic Preview policy.
9. The user can pause and resume automatic background generation.

Automatic Preview work is enrichment. It does not become part of the ordinary primary-world generation graph and must not extend the user-visible primary generation gate.

## Foreground priority contract

Background means subordinate to interactive and explicitly requested work, not merely code running inside a Web Worker.

When another generation or enrichment task starts:

- the active secondary-body worker is cancelled cooperatively;
- the interrupted body is restored to the front of its queue with the same requested fidelity;
- the background queue pauses while foreground work is active;
- background work resumes automatically after the foreground task completes, fails, or is cancelled;
- completed body artifacts are never discarded because foreground work arrived.

The user-facing responsiveness acceptance criterion is:

> While automatic secondary-body generation is active, ordinary primary-world pan, zoom, layer changes, panel interactions, and view navigation should remain perceptibly equivalent to the same project with background generation paused.

Worker isolation is necessary but is not by itself evidence that this criterion is satisfied. Owner/browser QA remains the final perceptual check.

## Manual quality-upgrade contract

The manual secondary-body path is no longer primarily "generate this missing body." Automatic Preview handles discovery-scale generation.

For a body the user wants to develop further:

- a Preview body offers `Upgrade to Standard`;
- Standard uses the existing `128 x 64` persisted body field;
- an explicit Standard request is prioritized ahead of remaining queued Preview work;
- the currently active cheap body may finish rather than being churned solely to service the upgrade;
- the existing Preview artifact remains renderable while Standard is queued or running;
- Preview also remains usable if the Standard attempt fails or is cancelled;
- Standard replaces the active generated artifact only after successful validated completion;
- a Standard body may be explicitly regenerated at Standard fidelity.

This slice does not add a primary-class `Full World` workflow for secondary bodies. A future decision may promote a secondary planet or moon into a full worldbuilding target, but that is a distinct fidelity/capability transition rather than simply another resolution value.

## Queue ownership and failure behavior

Automatic background policy is intentionally conservative:

- only pristine `ready` or `placeholder` bodies with no prior generated artifact are claimed automatically;
- failed bodies stay failed until the user retries them;
- stale bodies stay stale until explicitly regenerated;
- explicit quality-upgrade requests retain their requested fidelity;
- cancellation caused by foreground preemption requeues the body instead of treating it as a user cancellation;
- explicit user cancellation pauses automatic background work rather than immediately restarting it.

## Compatibility boundaries

This increment does not change:

- primary-world scientific generation;
- primary-world replay identity or deterministic generation contract;
- body capability-resolution profiles;
- Preview or Standard numerical generation algorithms;
- save/export artifact provenance rules;
- scientific reference data or Earth validation behavior;
- deployment or packaging architecture.

The behavioral change is orchestration and presentation: when compact secondary-body enrichment starts, how it yields to foreground work, and how the UI presents Preview versus Standard fidelity.
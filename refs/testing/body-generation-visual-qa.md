---
type: "Testing Reference"
title: "Body Lifecycle and Airless-Moon Visual QA"
tags:
- world-forge
- testing
---
# Body Lifecycle and Airless-Moon Visual QA

Status: required acceptance path for the first secondary-body generation proof

## Boundary

This QA covers the saved body lifecycle, sequential queue, and `project.generate-airless-rocky-body@1.0.0` proof. It does not approve additional body profiles, System camera panning, or high-detail body rendering.

Ordinary primary-world generation must remain unchanged and must not run any body-generation workflow.

## Required generated-world path

1. Generate a fast ordinary world.
2. Enter System view and wait for the existing orbital enrichment artifact.
3. Select an eligible moon whose lifecycle state is `ready`.
4. Confirm the inspector exposes eligibility, profile, workflow version, fidelity, queue state, and stable lifecycle status.
5. Run Generate selected at preview fidelity.
6. Confirm the selected body reaches `generated` and the wireframe is replaced by the low-resolution `airless-rocky-v1` material.
7. Queue unresolved moons, when any remain, and start the queue.
8. Confirm execution remains sequential, the active body is singular, and the queue drains without hidden ordinary-generation work.
9. Save the world to My Worlds, reload it, return to System view, and confirm the generated moon artifact and lifecycle state remain available.
10. Open Dev and confirm the seven-node Generate Airless Rocky Body workflow is selected and all nodes retain measured completion evidence.

## Visual acceptance

- Generated airless moons read as cratered rocky bodies rather than smooth placeholder spheres.
- Relief is exaggerated only enough to read at System-view scale.
- Albedo remains muted and rocky, without atmospheric haze, oceans, vegetation, or painted climate bands.
- No visible longitude seam appears on the generated moon.
- Placeholder, ready, queued, generating, generated, stale, and failed states remain visually distinguishable.
- Existing System selection, focus, labels, orbit paths, shared clock, and 35% / 50% zoom behavior remain intact.
- No page-level overflow occurs at 1440 x 900 or 1920 x 1080.

## Technical acceptance

- The workflow is deterministic for identical source, body, seed, fidelity, and workflow version.
- Preview output is 64 x 32; standard output is 128 x 64.
- The resolved workflow graph contains no climate, hydrology, ecology, or civilization nodes.
- Cancellation leaves the source project intact and returns the body to a recoverable lifecycle state.
- Artifacts persist through normal project serialization and reopen.
- Source, orbital, workflow, graph, or fidelity changes mark prior output stale rather than silently reusing it.
- `npm run verify` passes.

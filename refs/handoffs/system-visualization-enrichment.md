# System Visualization and Enrichment Handoff

Updated: 2026-07-31

Status: Cycle 0 first vertical slice implemented for validation

Planning source: `refs/planning/pi-system-visualization-and-progressive-body-enrichment.md`

Tracking issue: #35

## Increment scope

- Versioned project-enrichment workflow contract.
- Inspectable `project.system-orbital-context@1.0.0` graph.
- Six instrumented nodes from system scaffold read through artifact packaging.
- Deterministic orbital presentation payload and artifact signature.
- Lazy first-Globe execution outside ordinary generation.
- Visible running, completed, stale, cancelled, and failed UI state.
- Optional artifact attached to `WorldProject.enrichmentArtifacts` and therefore carried by normal project save and export serialization.
- Graph-node editor selection and completed-node timing for the enrichment workflow.

## Explicit non-goals

- No starfield, moving star, moon rendering, system-body rendering, time controls, clouds, weather, or seasonal surface changes yet.
- No change to the primary generation graph or generated authoritative signature.
- No secondary-body generation.

## Next visual increment

Consume the saved orbital-context artifact in Globe view and add the shared simulation clock, star background, visible star/light coupling, axial tilt, moon motion, visible-body motion, placeholder presentation, and time controls.

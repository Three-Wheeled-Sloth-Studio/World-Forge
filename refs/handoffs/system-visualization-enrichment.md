# System Visualization and Enrichment Handoff

Updated: 2026-07-31

Status: Visualizer Cycle 1 living-globe slice implemented for validation

Planning source: `refs/planning/pi-system-visualization-and-progressive-body-enrichment.md`

Tracking issue: #35

## Delivered foundation

- Versioned project-enrichment workflow contract.
- Inspectable `project.system-orbital-context@1.0.0` graph.
- Six instrumented nodes from system scaffold read through artifact packaging.
- Deterministic orbital presentation payload and artifact signature.
- Lazy first-Globe execution outside ordinary generation.
- Visible running, completed, stale, cancelled, and failed UI state.
- Optional artifact attached to `WorldProject.enrichmentArtifacts` and carried by normal project save and export serialization.
- Graph-node editor selection and completed-node timing for the enrichment workflow.

## Visualizer Cycle 1 slice

Globe view now consumes the saved orbital-context artifact and adds:

- one reusable simulation clock owned above the renderer so later Globe and System surfaces can share it;
- play, pause, speed, reset, day-of-year, and time-of-day controls;
- deterministic procedural star background with no external texture asset;
- visible generated star whose position drives the directional light;
- physical axial-tilt grouping separate from manual camera inspection;
- deterministic moon traversal using the artifact's orbital elements;
- nearby visible system-body motion relative to the primary world;
- standard-material illumination phases;
- wireframe placeholder treatment for unresolved moons and system bodies;
- deliberately compressed display distances and sizes, labeled as illustrative rather than literal scale.

## Frame-of-reference correction

- Physical spin is an absolute function of shared simulation time only; inspection does not add a rotational offset.
- Horizontal and vertical drag orbit the observer camera around the fixed planet-and-light system.
- While the pointer is held, the shared clock pauses, keeping geography, axial tilt, moons, visible bodies, and the day line fixed relative to one another.
- Camera orbit exposes the full daylight side, nightside, poles, and terminator without changing local planetary time.
- Pointer release restores the clock's prior play state.
- The primary globe receives shadows and moon placeholders cast bounded PCF-soft shadows as a visual proof.
- Clock-panel mobility/collapse and wider local-system framing remain backlog items.

## Current boundaries

- No cloud or weather presentation yet.
- No seasonal surface response yet.
- No full `System` Explore mode yet.
- No secondary-body generation.
- No N-body simulation or authoritative ephemeris.
- The primary generation graph, deterministic world signature, and replay contract remain unchanged.

## Next increment

Add `atmospheric-weather-presentation` as a lazy, inspectable enrichment workflow and use it to drive optional procedural cloud and illustrative weather layers on the shared simulation clock.

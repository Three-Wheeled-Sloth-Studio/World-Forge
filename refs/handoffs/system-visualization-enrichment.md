# System Visualization and Enrichment Handoff

Updated: 2026-07-31

Status: Visualizer Cycle 2 atmospheric-weather slice implemented for validation

Planning source: `refs/planning/pi-system-visualization-and-progressive-body-enrichment.md`

Tracking issue: #35

## Delivered foundation

- Versioned project-enrichment workflow contract.
- Inspectable `project.system-orbital-context@1.0.0` graph.
- Deterministic orbital presentation payload and artifact signature.
- Lazy first-Globe execution outside ordinary generation.
- Visible running, completed, stale, cancelled, and failed UI state.
- Optional artifacts attached to `WorldProject.enrichmentArtifacts` and carried by normal project save and export serialization.
- Graph-node editor selection and completed-node timing for enrichment workflows.

## Visualizer Cycle 1 living globe

- Shared simulation clock with play, pause, speed, reset, day-of-year, and time-of-day controls.
- Deterministic procedural star background and generated star/light coupling.
- Clock-derived physical planetary spin and generated axial tilt.
- Deterministic moon traversal and nearby visible-body motion.
- Camera yaw and pitch orbit around the fixed physical system.
- Pointer hold pauses the shared clock; release restores the prior play state.
- Bounded soft-shadow proof for moons and the primary globe.
- Wireframe placeholder treatment and deliberately compressed illustrative local-system scale.

## Visualizer Cycle 2 clouds and weather

- Added inspectable `project.atmospheric-weather-presentation@1.0.0` with six instrumented nodes:
  - read generated climate fields;
  - resolve climatological cloud bands;
  - seed fronts, cyclones, and convective systems;
  - resolve bounded atmospheric advection;
  - validate the presentation model;
  - package and persist the artifact.
- The workflow runs only after Clouds or Weather systems is first enabled in Globe view and current orbital context exists.
- Existing moisture, precipitation, wind, water, temperature, elevation, and terrain data are consumed without rerunning climate generation.
- The compact artifact stores band/system parameters rather than full time-series raster frames.
- Globe view provides separate Clouds and Weather systems toggles.
- Cloud and system textures advance on the shared clock with independent system motion, proper stellar illumination, and shadow casting.
- The artifact declares `weatherAuthority: illustrative`; it is scientifically informed presentation, not authoritative meteorological history.

## Current boundaries

- No precipitation, lightning, or authoritative forecast/history simulation.
- No seasonal surface response yet.
- No full `System` Explore mode yet.
- No secondary-body generation.
- No N-body simulation or authoritative ephemeris.
- Clock-panel mobility/collapse and wider local-system framing remain backlog items.
- The primary generation graph, deterministic world signature, and replay contract remain unchanged.

## Next increment

Add the full `System` Explore mode with labels, body selection/focus, optional orbital paths, shared time controls, placeholder state, and compressed versus relative-distance presentation modes.

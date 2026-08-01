# System Visualization and Enrichment Handoff

Updated: 2026-07-31

Status: Visualizer Cycle 3 bounded System Explore viewer validated; body lifecycle and queue are next

Planning source: `refs/planning/pi-system-visualization-and-progressive-body-enrichment.md`

Tracking issue: #35

## Delivered foundation

- Versioned project-enrichment workflow contract.
- Inspectable `project.system-orbital-context@1.0.0` graph.
- Deterministic orbital presentation payload and artifact signature.
- Lazy first-Globe or first-System execution outside ordinary generation.
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

## Visualizer Cycle 2 and 2.2 clouds and weather

- Added inspectable `project.atmospheric-weather-presentation@1.1.0` with six instrumented nodes.
- Existing moisture, precipitation, wind, water, temperature, elevation, and terrain data are consumed without rerunning climate generation.
- The artifact remains deterministic and declares `weatherAuthority: illustrative`.
- Generated `windX` and `windY` are persisted as a compact deterministic local-flow field.
- Cloud structure uses globe-space tangent sampling, wind-oriented streamers, broken cells, soft edge breakup, dominant clear sky, intrinsic seam continuity, and shared-clock local-flow shader advection.
- Weather-system puffs remain close to the cloud deck and retain the accepted larger coherent presentation.
- Cloud and weather alpha shells remain outside the current shadow-caster path.
- Renderer diagnostics identify `wind-oriented-spherical-v4`, `thin-streamers-clear-sky`, `spherical-continuous`, and `local-flow-shader`.

## Visualizer Cycle 3 bounded System Explore

- Explore now provides `Map | Globe | System`.
- `SystemViewer` is a dedicated sibling of `GlobeViewer`; System responsibilities were not added to the globe component.
- The first System slice reuses the existing deterministic orbital-context artifact and shared simulation clock. It does not add ordinary-generation work.
- The viewer includes:
  - generated star;
  - generated primary world;
  - generated moon scaffolds;
  - planets, dwarfs, belts, and other existing system bodies;
  - body selection by pointer or selector;
  - focus selected body;
  - return to primary;
  - optional orbit paths;
  - optional labels;
  - compressed overview mode;
  - logarithmic relative-distance mode;
  - body inspector with scaffold values and generation status.
- Generated bodies use solid presentation styling. Placeholder bodies use explicit wireframe styling.
- Physical orbital values remain distinct from exaggerated presentation values. The inspector shows both physical orbit and display radius rather than presenting display scale as simulated truth.
- Moon positions and moon orbit paths remain parent-relative while the viewer can focus any catalog body, including the star.
- Camera drag pauses and resumes the shared clock using the same interaction boundary as Globe view.
- System zoom is independently persisted from Map and Globe zoom.
- Focused deterministic contracts cover catalog completeness, parent-relative moon placement, orbital ordering in both display modes, and physical-versus-display separation.

## Current boundaries

- No secondary-body terrain, climate, ecology, or civilization generation.
- No body lifecycle or generation queue yet.
- No airless-moon generation proof yet.
- No N-body simulation or authoritative ephemeris.
- No attempt to render physical body size and orbital distance at the same literal scale.
- No precipitation, lightning, or authoritative weather forecast/history simulation.
- No soft transmittance-based cloud shadows.
- No seasonal surface response yet.
- Clock-panel mobility/collapse remains a backlog item.
- The primary generation graph, deterministic world signature, and replay contract remain unchanged.
- Geographic drilldown issue #10 remains pinned and outside this PI slice.

## Next increment

Implement body lifecycle and queue management as an inspectable enrichment surface, then prove the first secondary-body workflow with an airless moon.

The next slice should establish:

- body generation status and eligibility;
- explicit queue, start, cancel, retry, stale, and completion behavior;
- versioned body-specific artifacts and provenance;
- bounded resource and telemetry reporting;
- a single airless-moon generation proof that plugs into System selection without expanding ordinary primary-world generation.

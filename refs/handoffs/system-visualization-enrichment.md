# System Visualization and Enrichment Handoff

Updated: 2026-07-31

Status: Visualizer Cycle 2.2 wind-oriented spherical clouds validated; System Explore is next

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

- Added inspectable `project.atmospheric-weather-presentation` with six instrumented nodes:
  - read generated climate fields;
  - resolve climatological cloud bands;
  - seed fronts, cyclones, and convective systems;
  - resolve bounded atmospheric advection;
  - validate the presentation model;
  - package and persist the artifact.
- The workflow runs only after Clouds or Weather systems is first enabled in Globe view and current orbital context exists.
- Existing moisture, precipitation, wind, water, temperature, elevation, and terrain data are consumed without rerunning climate generation.
- The artifact declares `weatherAuthority: illustrative`; it is scientifically informed presentation, not authoritative meteorological history.
- Globe view provides separate Clouds and Weather systems toggles.
- Weather-system puffs remain close to the cloud deck, advance on the shared clock, and preserve the accepted larger coherent forms.
- Cloud and weather alpha shells remain excluded from the current shadow-caster path. Moons remain the bounded local-system shadow proof.
- The 35% and 50% local-system zoom stops remain available.

## Visualizer Cycle 2.2 final cloud renderer boundary

- The weather workflow is versioned at `project.atmospheric-weather-presentation@1.1.0`.
- The artifact now persists a compact deterministic wind field downsampled from the generated `windX` and `windY` layers.
- Cloud sampling converts each texture sample to a globe-space surface direction and local east/north tangent basis.
- The local generated wind vector determines streamer orientation. A compact periodic wind texture drives shared-clock local-flow advection in the cloud material, so the CPU does not regenerate the spherical field on the animation hot path.
- Cloud structure combines:
  - a broad climatological moisture/source envelope;
  - a long wind-oriented streamer layer;
  - smaller broken cell structure;
  - high-frequency edge breakup for soft, irregular margins.
- Clear sky remains the dominant background. The renderer does not create a low-opacity planetary haze.
- The cloud field is intrinsically continuous in globe space. It is evaluated on a bounded procedural presentation raster, upscaled through the soft cloud material, and transported as an equirectangular Three.js texture. The cloud path does not average or blur the first and last texture columns.
- Existing projected surface/debug textures may still use their separate seam-normalization helper; that helper is not part of cloud generation.
- Renderer diagnostics identify `wind-oriented-spherical-v4`, `thin-streamers-clear-sky`, `spherical-continuous`, and `local-flow-shader`.
- Focused contracts cover deterministic sampling, directional anisotropy, clear-sky share, cross-seam continuity, and time evolution.

## Current boundaries

- No precipitation, lightning, or authoritative forecast/history simulation.
- No soft transmittance-based cloud shadows.
- No seasonal surface response yet.
- No full `System` Explore mode yet.
- No secondary-body generation.
- No N-body simulation or authoritative ephemeris.
- Clock-panel mobility/collapse remains a backlog item.
- The primary generation graph, deterministic world signature, and replay contract remain unchanged.
- Geographic drilldown issue #10 remains pinned and outside this PI slice.

## Next increment

Add the bounded full `System` Explore mode in a dedicated `SystemViewer`:

- add `Map | Globe | System`;
- show the generated star, primary world, moons, planets, and other scaffold bodies;
- share the existing simulation clock;
- support body selection, focus, return to primary, optional orbit paths, and optional labels;
- distinguish placeholder and generated styling;
- provide compressed overview and relative-distance modes where practical;
- provide a body inspector with basic scaffold values and generation status.

Do not begin secondary-body generation in the same slice. Body lifecycle/queue and the airless-moon proof follow after the viewer and selection surface are established.

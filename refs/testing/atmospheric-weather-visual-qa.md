---
type: "Testing Reference"
title: "Atmospheric Weather Visual QA"
tags:
- world-forge
- testing
---
# Atmospheric Weather Visual QA

Updated: 2026-07-31

## Cycle 2.2 acceptance path

1. Generate the fast 256 x 128 world.
2. Open Globe view and enable Clouds, then Weather systems.
3. Confirm the lazy atmospheric-weather workflow completes as `project.atmospheric-weather-presentation@1.1.0`.
4. Confirm clouds form thin, long, narrow, broken streamers aligned with changing prevailing wind directions rather than round isotropic blobs or broad painted latitude bands.
5. Confirm cloud edges are very soft and poorly defined, with smaller broken puffs and many genuinely clear-sky gaps.
6. Confirm there is no low-opacity planetary haze when looking across the full illuminated globe.
7. Advance the shared clock and confirm local cloud structures advect through the local-flow shader while the larger weather systems continue their accepted coherent motion. Confirm the UI remains responsive rather than rebuilding the cloud field every clock tick.
8. Orbit the camera through the former longitude wrap location and inspect both daylight and nightside views. Confirm no sharp vertical seam, repeated edge, or flat-map-wrap impression appears.
9. Confirm weather systems remain close to the cloud deck, read as larger embedded features, and retain their existing soft front/cyclone/convective presentation.
10. Set Globe zoom to 35% and 50% and confirm the accepted local-system framing and primary-moon visibility remain intact.
11. Confirm cloud and weather shells do not cast the rejected oversized hard alpha-map shadow bands.
12. Confirm moon positions and the directional stellar light vector still update under the shared clock.
13. Verify 1440 x 900 and 1920 x 1080 without page-level overflow or browser errors.

## Automated contracts

The focused cloud suite must verify:

- deterministic spherical and wind-oriented sampling;
- lower variation along the wind direction than across it;
- dominant clear-sky share with a nonzero dense-cloud share and low mean background coverage;
- intrinsic continuity across the former longitude seam;
- visible time evolution under local-flow advection.

The weather-enrichment suite must verify that the compact wind field is deterministic, finite, correctly sized, and derived into the persisted presentation artifact. Chromium QA must verify the `local-flow-shader` runtime boundary and bounded cloud-enable latency.

## Final renderer boundary

Clouds use globe-space procedural sampling. Each bounded presentation-raster pixel is converted to a unit surface direction and local tangent frame before the generated wind field, source envelope, streamer, cell, and edge layers are evaluated. The soft material upscales that field to the artifact texture size; the resulting canvas remains equirectangular only because Three.js consumes it as a texture.

The cloud path does not repair a discontinuous texture by averaging or blurring its first and last columns. Cross-seam continuity comes from sampling the same sphere direction and periodic wind field on both sides of the wrap.

Projected surface and debug textures retain their separate seam-normalization helper. That legacy helper is not used by the Cycle 2.2 cloud renderer.

Cloud shadows remain intentionally disabled until a soft transmittance-based implementation exists. The current proof isolates moon-shadow geometry instead of allowing an alpha-tested shell to impersonate a planetary-scale Venetian blind.

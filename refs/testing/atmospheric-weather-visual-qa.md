# Atmospheric Weather Visual QA

Updated: 2026-07-31

## Acceptance path

1. Generate the fast 256 x 128 world.
2. Open Globe view and enable Clouds, then Weather systems.
3. Confirm the lazy atmospheric-weather workflow completes.
4. Confirm clouds are locally broken and irregular rather than continuous latitude-width strokes.
5. Advance the shared clock and confirm cloud texture and systems move.
6. Set Globe zoom to 35% and confirm the primary moons remain visible.
7. Confirm cloud shells no longer cast the oversized hard shadow bands.
8. Confirm moon positions and the directional stellar light vector both update under the shared clock.
9. Verify 1440 x 900 and 1920 x 1080 without page-level overflow or browser errors.

## Boundary

Cloud shadows are intentionally disabled until a soft transmittance-based shadow implementation exists. The current proof isolates moon-shadow geometry instead of allowing an alpha-tested shell to impersonate a planetary-scale Venetian blind.

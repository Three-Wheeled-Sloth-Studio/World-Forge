# System Visualization and Enrichment QA

Updated: 2026-07-31

## Automated contract coverage

- Simulation clock advances deterministically from a fixed epoch.
- Pause preserves simulation time.
- Speed changes commit elapsed time before applying the new rate.
- Day-of-year and time-of-day can be changed independently.
- Reset returns to day 1 at 00:00.
- Orbital positions are deterministic for fixed elements and time.
- Relative visible-body vectors use the same shared simulation day.
- Procedural star directions are deterministic and normalized.
- Display compression remains within accepted moon and background-body bounds.

## Focused browser acceptance

1. Generate a Fast world.
2. Confirm no orbital enrichment exists before Globe entry.
3. Enter Globe and wait for the saved orbital artifact to complete.
4. Confirm the scene reports one coupled star light, the generated axial tilt, and artifact-derived moon/body counts.
5. Confirm play, pause, speed, reset, day-of-year, and time-of-day controls are visible.
6. Increase speed and confirm simulation day advances.
7. Pause and confirm the displayed day stops advancing.
8. Set day 120 and 06:00, then reset and confirm day 1 at 00:00.
9. Confirm no browser console errors or page-level overflow at 1440x900 and 1920x1080.

## Manual visual review

- Starfield is stable for the same artifact and does not shimmer between renders.
- Star location and terminator direction agree.
- Axial tilt is visible without corrupting manual globe inspection.
- Moons and nearby bodies move smoothly when time advances.
- Placeholder bodies are visually distinct from the primary generated globe.
- Display scale reads as an illustrative context view, not an astronomical-scale claim.

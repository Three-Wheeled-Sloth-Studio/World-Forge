# Stellar Surface Presentation QA

Date: 2026-08-01

## Boundary

- Only eligible placeholder moons can enter the existing body-generation queue.
- Star, planets, giants, dwarfs, and belts remain ineligible and are rejected by the lifecycle queue API.
- Ineligible System selections do not render the generic Generate selected action.
- Stellar detail uses a separate explicit Experimental enrichment workflow.

## Automated gates

- Focused stellar workflow, registry, and lifecycle contracts.
- Full `npm run verify` including TypeScript, all tests, and production build.
- Detailed versus Experimental signature comparison across three seeds and three scenarios.
- Chromium validation at 1440 x 900 and 1920 x 1080.

## Browser acceptance

- Generate a world with Experimental.
- Open System view and select the star.
- Confirm the secondary-body generation panel is absent for the star.
- Launch Generate star detail explicitly.
- Confirm the workflow completes, the artifact is persisted, and the selected star material reports `stellar-surface-v1`.
- Confirm activity, rotation, spot, facula, and streamer summaries are visible.
- Confirm no page overflow or console errors.

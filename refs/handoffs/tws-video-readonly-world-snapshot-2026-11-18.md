---
type: "Handoff Record"
title: "TWS-Video Read-only World Snapshot"
tags:
- world-forge
- tws-video
- integration
---
# Read-only World Snapshot for TWS-Video (2026-11-18)

World Forge `dev` now recognizes a one-time local browser URL containing `twsWorldPort`, `twsWorldToken`, and `twsWorldId` only on `localhost` / `127.0.0.1`.

- It reads the named WorldProject from World Forge's own origin-scoped IndexedDB via `IndexedDbWorldStorageProvider.loadWorld`, never from Parchment's project metadata and never from an assumed `.wforge` export.
- The user must confirm sending a temporary read-only snapshot to local TWS-Video.
- `exportWforge` creates the same versioned project archive used by ordinary exports, but it is POSTed as transient binary to TWS's token-authenticated loopback receiver instead of downloaded, saved in World Forge, or written back to a project.
- URL token parameters are removed from browser history immediately. Failure, cancellation, missing local world, and transfer rejection are visible alerts. No automatic Parchment or World Forge project mutations occur.
- TWS-Video stages the archive in a temporary directory, runs the existing managed headless atmosphere generator, verifies its output and offers preview/accept. The accepted layer and final video remain unchanged until explicit acceptance.

Validation: focused parser tests, TypeScript typecheck, OKF profile, and all 587 Vitest tests passed locally. `npm run verify` stopped at the production page harness because this execution environment denied `tsx`'s `/tmp` IPC socket (`listen EPERM`), so the full verification suite is **not** marked passed. Real Windows Chromium and local browser storage QA are still needed before promotion. The browser must have the selected world in the World Forge library on the `localhost:5173` origin; Parchment's linked identity alone is not sufficient.

Future: improve consent window styling, richer selected-world details and error reporting to TWS, and support cloud-only worlds only through an authorized World Forge source API. Do not scrape other browser origins or create a parallel project storage format.

---
type: "Handoff Record"
title: "TWS-Video Read-only World Snapshot"
tags:
- world-forge
- tws-video
- integration
---
# Read-only World Snapshot for TWS-Video (2026-11-18)

World Forge `dev` exposes a local-only, one-time request queue through its development server, consumed by the already-open World Forge browser app when its active project matches the requested world ID.

- It reads the active WorldProject from React application state, never from Parchment's project metadata, a separately opened blank tab, or an assumed `.wforge` export.
- Selecting Generate in TWS-Video is the explicit consent step. No browser confirmation dialog is required.
- `exportWforge` creates the same versioned project archive used by ordinary exports, but it is POSTed as transient binary to TWS's token-authenticated loopback receiver instead of downloaded, saved in World Forge, or written back to a project.
- The one-time callback token travels between local processes, not browser URLs. An authenticated `/status` callback reports connected/loading/packing/sending and error messages to TWS-Video's in-app status bar. No browser alert or confirmation popup is used. No automatic Parchment or World Forge project mutations occur.
- TWS-Video stages the archive in a temporary directory, runs the existing managed headless atmosphere generator, verifies its output and offers preview/accept. The accepted layer and final video remain unchanged until explicit acceptance.

Validation: the earlier focused parser tests, TypeScript typecheck, OKF profile, and all 587 Vitest tests passed locally. `npm run verify` stopped at the production page harness because this execution environment denied `tsx`'s `/tmp` IPC socket (`listen EPERM`), so the full verification suite is **not** marked passed. The newer active-project queue and browser request path need their own tests and real Windows QA before promotion. The running World Forge app must have the selected world open; a Parchment-linked identity by itself is insufficient.

Future: richer selected-world details and error reporting to TWS, and support cloud-only worlds only through an authorized World Forge source API. Do not scrape other browser origins or create a parallel project storage format.

## 2026-11-18 browser QA repair
- User reported World Forge opened but TWS timed out with no dialog. Root cause not yet independently proven: the prior implementation gave no receiver status before ZIP transfer; a missing browser-saved world, blocked browser alert, or stale World Forge local build appeared as the same timeout.
- New status handshake differentiates an old/unresponsive browser app from a recognized request that cannot load/package the selected world. Errors are sent to the TWS window with context. Real Windows end-to-end QA is still required.

## 2026-11-18 active-project repair
- User reported the request opened a *second* World Forge tab with no project while the already-open tab had the correct active world. The second tab could not find the project in its separate browser-saved library.
- World Forge's dev Vite service now has an in-memory, 120-second, one-time `/__tws/world-handoff` request rendezvous. It accepts only local, non-browser-origin POSTs; the active World Forge page polls for requests matching **its current project ID**.
- The active page sends `project` in memory to `exportWforge`, including changes that have not yet been saved. No navigation, browser popups, duplicate app instance, or project write is needed. Unrelated World Forge windows cannot consume the request.
- TWS-Video queues through the local World Forge service and waits for the in-app receiver. If World Forge is stopped, TWS launches it through Parchment's existing manager and opens it once so the user can select the target project.
- The older query-string handoff is retired for TWS-Video. Confirm in Windows with World Forge already running on the selected project; verify no new tab appears and that the generated atmosphere remains a preview until explicitly accepted.

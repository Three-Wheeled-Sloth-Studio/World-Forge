---
type: "Testing Reference"
title: "Seasonal surface and PI closeout QA"
tags:
- world-forge
- testing
---
# Seasonal surface and PI closeout QA

Validation target: World Forge 0.3.51.

Required gates:

- Ordinary primary-world generation creates no seasonal artifact and remains Detailed/Experimental signature-equivalent.
- Selecting Seasonal visibly launches `project.seasonal-surface-model@1.0.0` only after orbital context is available.
- The six graph nodes complete with timing, validation, source identity, and deterministic artifact provenance.
- Northern and southern temperature amplitudes oppose each other across the shared simulation year.
- Map annual mean remains unchanged when seasonal display is off.
- Seasonal Map and Globe presentation changes when day of year changes, with visible snow and sea-ice response where supported.
- Raw elevation and unrelated diagnostic map subjects are not seasonally tinted.
- Save/load and `.wforge` export/import preserve the completed artifact.
- Stale source or graph signatures invalidate the artifact.
- Chromium passes at 1440x900 and 1920x1080 with no browser errors or page-level overflow.

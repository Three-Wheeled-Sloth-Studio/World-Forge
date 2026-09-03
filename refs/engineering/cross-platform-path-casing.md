---
type: "Engineering Reference"
title: "Cross-platform path casing"
tags:
- world-forge
- engineering
---
# Cross-platform path casing

Case-only filename distinctions are forbidden in World Forge.

Windows commonly resolves paths case-insensitively, while Git and Linux CI preserve case-sensitive paths. A pair such as `GeographicAtlasContextMap.tsx` and `geographicAtlasContextMap.ts` can therefore coexist remotely but collapse into one ambiguous module on a Windows checkout, producing errors such as `TS1149` and `TS1261`.

This has been a recurring repository failure mode. Treat it as a design constraint, not an exotic local setup problem.

## Required rules

- No two tracked paths may differ only by capitalization anywhere in the full relative path.
- Import casing must exactly match the tracked filename.
- Do not distinguish a React component and helper module only through initial-letter case. Use semantic suffixes such as `Geometry`, `Model`, `State`, or `Utils`.
- Perform case-only renames through an intermediate name, for example `git mv Old.ts temp.ts` followed by `git mv temp.ts New.ts`.
- Run `npm run check:case-collisions` before committing file additions or renames.

`npm run typecheck` and `npm run build` execute the collision guard automatically. The guard reads the Git index when available because a Windows filesystem scan alone cannot reveal two tracked names that collapse to one physical path.

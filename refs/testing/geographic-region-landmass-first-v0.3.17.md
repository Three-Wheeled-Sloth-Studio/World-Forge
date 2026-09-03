---
type: "Testing Reference"
title: "Geographic Regions: Landmass-First Candidate"
tags:
- world-forge
- testing
---
# Geographic Regions: Landmass-First Candidate

Updated: 2026-07-27

Branch: `dev`

App version: `0.3.17`

Status: Diagnostic candidate. Not authoritative.

## QA observations addressed

For star seed `2850873` and world seed `1001001`, the previous global partition showed:

- one small isolated landmass split between regions 3 and 9;
- an almost-region-sized landmass 16 with a coastal strip owned externally; and
- one visually coherent island labeled as regions 23 and 24.

These were classified as seed-allocation and traversal-scope defects. Sliver repair could amplify them but was not their primary cause.

## Correction

The candidate now:

1. identifies landmass and archipelago parent domains;
2. assigns bounded territorial water before subdivision;
3. gives small parent domains one child region;
4. partitions larger parents independently;
5. partitions open ocean separately;
6. prohibits repair across parent boundaries; and
7. exposes Raw/Repaired views and parent provenance in the browser preview.

The reciprocal adjacency used by this candidate also removes cube-face directionality from region connectivity without changing authoritative generator topology.

## Automated evidence

- An isolated small landmass remains one parent region.
- Territorial water requests 12 nautical miles (13.81 statute miles), never exceeds the cap, and records the represented width.
- Sliver merges retain the same parent domain.
- Fixed generated worlds have complete membership.
- Archipelago parents explicitly permit separated island components; ordinary landmass and ocean regions remain connected.
- The region target remains stable by grouping nearby small islands into archipelago parents.

## Browser evidence

Headless Chromium rendered the repaired Terrain-only preview at 100% with no console errors:

| Case | Regions | Repairs | Geographic support vs grid | Axis concentration vs grid |
| --- | ---: | ---: | ---: | ---: |
| Star `2850873`, world `1001001` | 29 | 1 | 15% vs 11% | 11% vs 45% |
| Seed `9776542` | 26 | 2 | 19% vs 15% | 13% vs 45% |
| Archipelago `3141592` | 35 | 0 | 34% vs 14% | 12% vs 45% |
| Pangea `2718281` | 36 | 1 | 33% vs 15% | 10% vs 45% |

All four previews reported all ordinary regions connected. The fixed `2850873` / `1001001` pass retained both raw and repaired screenshots; the other three retained repaired screenshots.

The first high-resolution attempt exposed 103 micro-island regions. That failed visual QA and was not retained as the accepted result. Small islands now cluster within an overview-scale 500-mile neighborhood, while meaningful isolated landmasses remain independent. The repeated fixed-seed render returned to the 30-region budget before one same-parent repair.

## Remaining visual gate

Inspect the fixed seeds and fresh Archipelago and Pangea worlds using `refs/testing/geographic-region-visual-qa.md`. Compare Raw and Repaired at 100% and 225%, including the longitude seam. The candidate must remain inactive until that evidence is accepted.

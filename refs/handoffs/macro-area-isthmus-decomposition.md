---
type: "Handoff Record"
title: "Handoff: Morphology-aware Macro-area Decomposition"
tags:
- world-forge
- handoffs
---
# Handoff: Morphology-aware Macro-area Decomposition

Updated: 2026-07-28

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

## Problem

Current macro areas map one connected surface domain to one continent or archipelago. This treats any land connection as proof that two large masses are one continent, including narrow isthmuses and accidental generated land ribbons.

The detector should be able to distinguish two independently continent-sized bodies joined by a narrow bridge while preserving ordinary peninsulas and island chains.

## Recommended model

Use deterministic morphological core decomposition followed by graph watershed assignment.

### 1. Land thickness field

For every land cell in a connected landmass, compute geodesic graph distance to the nearest coast or water cell. This is a topology-aware approximation of local land half-width.

### 2. Interior cores

Erode the landmass by an adaptive number of coast-distance layers. The remaining cells form broad interior cores. The erosion depth should scale with topology resolution and landmass area rather than using one universal cell count.

### 3. Candidate continent cores

Find connected components in the eroded mask. Retain only components which exceed both:

- a minimum absolute topology-cell or weighted-area budget;
- a minimum share of the world's land area or the parent landmass.

Small cores remain peninsulas, islands, or regional lobes attached to a larger continent.

### 4. Split pressure

Split only when at least two accepted cores remain and either:

- the original landmass exceeds the preferred continent-size target; or
- both sides of the narrowest valid neck independently exceed the minimum continent target.

The target should be informed by the generated world's requested continent count, but should not force a count when geography does not support it.

### 5. Watershed reassignment

Run deterministic multi-source graph growth from accepted cores across the full original landmass. Edge cost should prefer:

- broad terrain over narrow necks;
- shorter geodesic distance;
- tectonically coherent continuation where available.

This assigns coastlines, peninsulas, and the isthmus itself to one side without changing physical terrain.

### 6. Cut scoring

Prefer candidate decompositions with:

- lower neck width;
- two or more substantial resulting areas;
- stable topology connectivity;
- tectonic or mountain-boundary support when present;
- minimal creation of tiny fragments.

### 7. Output contract

Macro-area membership may split one source surface domain into multiple macro areas. `sourceDomainIds` already supports provenance without requiring saved-world schema activation.

IDs and signatures must include the decomposition algorithm version and stable core seeds.

## Why not articulation points

A graph articulation point only catches a one-cell bridge. Realistic isthmuses are commonly several cells wide and coastlines are noisy. Morphological core decomposition detects narrow corridors of variable width and is substantially less brittle.

## Separate generation-quality check

Long ribbon-like land features should also be diagnosed in terrain generation. Use length-to-width ratio, weighted area, relief, and tectonic support to distinguish plausible peninsulas or island arcs from accidental low-relief land strips. Macro decomposition should tolerate these artifacts, but it should not be responsible for repairing terrain.

## Acceptance examples

- A North America and South America analogue connected by a narrow isthmus becomes two macro areas.
- A Eurasia and Africa analogue may split when both cores are independently large and the neck is narrow.
- Italy, Baja California, Florida, and ordinary peninsulas remain attached to their parent continent.
- A broad central land bridge does not split merely to hit a requested continent count.
- Results are deterministic across reopen and regeneration with unchanged authoritative world facts.

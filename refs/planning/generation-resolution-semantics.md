# Generation Resolution Semantics

Updated: 2026-08-02

Status: current generation contract and future architecture direction

Related:

- `apps/desktop/src/generator/generationParameterControls.ts`
- `packages/shared/src/index.ts`
- `packages/generator-core/src/graph/nodes/topology-construction-node.ts`
- `refs/testing/production-page-performance-harness.md`
- `refs/planning/production-performance-instrumentation-plan.md`

## Purpose

Define what the generation resolution control means, what deterministic behavior is expected, and how worlds generated from the same seed should relate across different resolution tiers.

This distinction is important because the current control is not merely an output-image size selector. It changes both the projected map dimensions and the resolution of the authoritative cubed-sphere simulation topology.

## Current resolution contract

The current generation quality selector offers:

| Tier | Output resolution | Topology resolution | Cubed-sphere cells |
|---|---:|---:|---:|
| Fast | 256 x 128 | 64 | 24,576 |
| Default | 512 x 256 | 128 | 98,304 |
| Large | 1024 x 512 | 256 | 393,216 |
| High | 2048 x 1024 | 512 | 1,572,864 |
| Ultra | 4096 x 2048 | 1024 | 6,291,456 |

The topology resolution is currently derived as:

```text
max(16, round(min(output width, output height) / 2))
```

A cubed-sphere topology contains:

```text
6 x topology resolution squared
```

Each step doubles linear resolution and therefore creates four times as many output pixels and four times as many authoritative topology cells. Runtime and memory should be expected to increase materially; algorithms with sorting, repeated traversal, candidate comparison, or path construction may scale worse than four times.

The current fresh-generation application configuration starts at High, 2048 x 1024. The `Default 512 x 256` selector label describes that option's tier name, not the current startup selection.

## Determinism within one resolution

For the same supported runtime contract, repeated generation must produce identical authoritative results when all of the following are unchanged:

- resolved settings and sampled parameter values;
- semantic seed streams;
- workflow and algorithm versions;
- output resolution;
- topology resolution;
- relevant fidelity settings.

Same-resolution fixed-seed runs are the basis for exact deterministic signatures and before/after optimization comparisons.

## Relationship across resolutions

The same seed at different resolutions is **not** an exact replay of one authoritative world at a sharper or blurrier map size.

Changing resolution changes the number and placement of simulation cells. That can legitimately alter discrete decisions in plate ownership, coast formation, drainage, basin membership, current placement, river tracing, biome classification, ice boundaries, and other local or threshold-sensitive processes.

The intended relationship is:

> Worlds generated from the same seed and resolved settings at different resolution tiers should be recognizably similar in broad character while differing legitimately in local detail.

Expected cross-resolution continuity includes:

- the same preset and resolved parameter intent;
- broadly similar ocean-versus-land character;
- comparable continent and archipelago character;
- comparable global climate and aridity character;
- recognizable large-scale tectonic and terrain tendencies;
- consistent system, world, workflow, seed, and provenance identity.

Expected and acceptable cross-resolution differences include:

- finer coastline shape;
- appearance, disappearance, splitting, or joining of small islands;
- local mountain ridges and relief transitions;
- drainage-basin boundaries;
- individual river paths and minor river counts;
- localized rainfall, temperature, biome, snow, and ice boundaries;
- local gyre, current, lake, wetland, and feature placement.

Cross-resolution results should therefore be evaluated for **family resemblance and parameter fidelity**, not exact cell, raster, feature, or signature equality.

## QA and benchmark rules

- Exact determinism tests must compare matched resolution and topology.
- Cross-resolution tests must not fail merely because authoritative signatures differ.
- Cross-resolution QA should compare broad metrics, causal character, and visual continuity.
- Performance reports must describe these options as combined generation-quality tiers, not merely image sizes.
- Before/after performance comparisons must use the same resolution unless the purpose is explicitly to measure scaling.
- A scaling matrix measures both increased simulation work and increased projection/render work under the current architecture.
- A world that changes beyond recognizable broad character across adjacent resolution tiers should be investigated as a stability or scale-normalization defect, even though exact equality is not expected.

## Product language

Internal and user-facing descriptions should avoid implying that higher resolution only produces a sharper bitmap.

Preferred framing:

- generation quality;
- world detail;
- simulation and map resolution;
- faster preview versus higher-detail generation.

Avoid framing the current selector as a simple export-size control.

## Future architecture direction

Simulation detail and output/export resolution should eventually become separate concepts:

1. **Simulation or world-detail resolution** controls the authoritative topology and therefore the geographic, geological, hydrological, and climate detail available to the generated world.
2. **Map, texture, or export resolution** controls how an already-generated authoritative world is projected and rendered for display or export.

That split should allow one authoritative world to be rendered or exported at multiple raster sizes without rerunning tectonics, climate, hydrology, or ecology and without changing the world's geography.

This is a future architecture direction, not the current behavior. Until that separation is implemented, changing the generation resolution means generating a related but distinct deterministic realization of the seed.
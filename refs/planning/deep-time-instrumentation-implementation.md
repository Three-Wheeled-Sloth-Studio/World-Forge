---
type: "Planning Reference"
title: "Deep-Time Instrumentation Implementation"
tags:
- world-forge
- planning
---
# Deep-Time Instrumentation Implementation

Updated: 2026-07-29

Status: Work Package 1 implementation slice for issue #14

## Purpose

Establish a trustworthy baseline before replacing deep-time algorithms. This slice adds sidecar-only timing and work-shape capture around the current production and experimental workflows. It does not change authoritative world data or the saved project schema.

## Instrumented substages

The current deep-time progress contract is translated into these measured boundaries:

1. model setup;
2. authoritative fragment placement;
3. surface-aging epochs;
4. fragment-history response;
5. water and sea-level reconciliation;
6. present-climate rebuild;
7. hydrology rebuild;
8. biome classification, projection, and validation;
9. mutation-ledger setup/finalization and unattributed overhead.

The final row is intentional. Work performed before the first progress event or after the completion event must remain visible rather than disappearing into a suspiciously tidy chart.

## Work-shape capture

The profile records available counters without persisting new fields into `WorldProject`:

- topology and projected cell counts;
- plate, craton, epoch, and forcing-sample counts;
- scheduled aging iterations;
- mutation operations and affected-cell process totals;
- fragment source, target, collision, and movement counts;
- fragment-history pair evaluations and keyframes;
- water-mask and marine-depth corrections;
- climate and hydrology rebuild cell counts;
- river source and acceptance counts;
- biome, projection, and validation corrections;
- sediment and unclassified mutation operations.

Some counters are operation totals rather than unique-cell counts. Their names state that distinction explicitly.

## Benchmark matrix

`npm run benchmark:workflows` now defaults to:

- seeds `1001001`, `3141592`, and `8675309`;
- Earthlike standard activity;
- Archipelago standard activity;
- high-age geological and glacial stress;
- production and experimental workflows;
- sequential execution at identical resolution and resolved scenario settings.

The JSON report contains complete substage records and work counters. The Markdown report contains total runtime, deep-time runtime, and per-substage workflow deltas.

## Current boundary

This instrumentation uses the existing progress transitions rather than modifying the large deep-time implementation directly. That keeps the change low-risk and schema-neutral. When individual deep-time operations are replaced, they should emit explicit substage events rather than relying indefinitely on progress thresholds.

## Next implementation step

Run the matrix on the accepted commit and use the resulting attribution to select the first experimental replacement. The expected first target is either surface aging or fragment placement, depending on measured cost and work shape. Changes remain confined to `core.performance-foundation` until comparison and quality gates support promotion.

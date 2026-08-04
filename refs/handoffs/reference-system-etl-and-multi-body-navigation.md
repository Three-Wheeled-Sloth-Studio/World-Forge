# Reference-system ETL and multi-body navigation handoff

Updated: 2026-08-03
Status: Planning baseline only; no reference-data ingestion implementation has started

Authoritative planning:

- `refs/planning/reference-system-etl-and-multi-body-navigation.md`

Tracking:

- Parchment Worlds #22, Sol System reference project
- World Forge #124, preserve active body across System, Globe, Explorer, and Map

## Resume point

The next reference-system increment is not additional procedural Sol-like generation and not a set of separate per-body projects.

The target is one World Forge project containing one coherent planetary system, with stable body identities and body-specific imported details. Earth is the first ETL fixture and the initial primary body. It is not the only body that Map or Explorer may address.

## Correct interpretation

`Do not fabricate replay data` means:

- do not invent Earth, Mars, Luna, or other real-body facts;
- do not substitute a procedural lookalike when recognizable source data exists;
- do not label generated filler as imported reference data.

It does not mean imported reference bodies should remain metadata-only or non-openable.

The intended Sol project must eventually show recognizable bodies in their applicable views:

- System view for the complete system;
- Globe or 3D view for the selected body;
- flat Map for bodies with supported projected layers;
- Explorer and geographic drilldown for bodies with compatible geographic data.

## Product provenance boundary

Full dataset provenance belongs in repository reference documents, not in cell-level runtime records.

The product needs only lightweight distinctions among imported, derived, procedurally filled, and user-edited data, plus capability information needed to select valid views.

## Current World Forge gap

World Forge can select secondary bodies in System and focus them in Globe, but Map still resolves to the primary world. This breaks one-project multi-body navigation and is tracked in #124.

The future contract must separate:

- durable `primaryBodyId`;
- current `activeBodyId`;
- per-body view and layer capabilities.

Unsupported views should report the capability gap rather than silently switching bodies.

## First implementation sequence

1. Audit every primary-world-only data access path in `WorldProject`, Map, Explorer, save/load, and `.wforge` serialization.
2. Select the normalized imported-system and imported-body contract boundary.
3. Document the initial Earth datasets, licenses, transformations, and target resolution under `refs/`.
4. Ingest recognizable Earth layers into canonical World Forge data inside one Sol system project.
5. Prove Map, Globe or 3D, Explorer, save/reopen, and `.wforge` round trip.
6. Prove Parchment `.pworld` import without relying on existing device-local World Forge storage.
7. Extend the same model to Luna, Mars, Phobos, and Deimos.
8. Walk through the remaining planets, moons, and belt structures using body-appropriate fidelity.

## Retained work

The existing generated-system and body-enrichment architecture remains useful:

- stable system and body scaffolds;
- System and Globe body selection;
- capability-resolved body workflows;
- optional artifacts;
- `.wforge` serialization of enrichment data;
- lazy materialization and bounded ordinary primary-world generation.

Reference ingestion must generalize these seams without destabilizing procedural generation.

## Guardrails

- One system is one project.
- Do not create Earth, Mars, and Luna as unrelated `.wforge` projects.
- Do not make Map or Explorer primary-world-only permanently.
- Do not force gas giants or irregular bodies into Earthlike surface assumptions.
- Do not require full scientific provenance inside the product.
- Do not leak source-specific file formats into durable contracts.
- Do not claim the Sol reference is complete while it contains only astronomy metadata.

## Verification state

No code or automated validation is claimed for this planning increment. The documents and #124 are the durable resume state.

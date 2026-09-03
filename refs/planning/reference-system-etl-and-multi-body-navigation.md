---
type: "Planning Reference"
title: "Reference-system ETL and multi-body navigation"
tags:
- world-forge
- planning
---
# Reference-system ETL and multi-body navigation

Updated: 2026-08-03
Status: Planning baseline for Parchment Worlds #22 and World Forge #124

## Product outcome

World Forge can ingest a real planetary system, preserve it as one coherent multi-body project, and present each supported body recognizably in System, Globe or 3D, Map, and Explorer views.

The first reference target is Sol, but the architecture must support other real, fictional, authored, or externally generated systems without Sol-specific loaders in the durable model.

## One project owns the system

A `WorldProject` must be able to represent one complete system rather than treating the primary world as the project and every other body as a decorative side artifact.

The target project contains:

- one star or stellar system context;
- stable identities for planets, moons, dwarf bodies, belts, and supported minor bodies;
- parent-child and orbital relationships;
- body-specific physical, atmosphere, shape, surface, and presentation data;
- one initial primary body used as the default entry point;
- one active body used by current view orchestration.

Earth, Mars, Luna, and other Sol bodies must not become unrelated `.wforge` projects merely because current Map and Explorer code reads `primaryWorld` directly.

## Active-body continuity

World Forge #124 tracks the generic navigation gap.

The selected body must remain active while the user moves between compatible views:

```text
System selection
  -> Globe or 3D focus
  -> full-body Map
  -> Explorer and geographic drilldown
```

The primary body remains:

- the initial default;
- an explicit `Return to primary` target;
- the ordinary generation focus for existing workflows.

It is not an implicit forced target every time Map or Explorer opens.

The orchestration contract must distinguish:

- `primaryBodyId`: durable project role;
- `activeBodyId`: current inspection target;
- body capability: which views and layers the body can support.

An unsupported view must explain the capability gap rather than silently switch bodies.

## Reference-data rule

Imported real bodies must be based on actual or best-available reference data. Procedural generation is allowed only as explicit gap filling.

The product must not present an Earthlike seed as Earth, a Mars-like seed as Mars, or a generic cratered sphere as Phobos when recognizable source data is available.

Imported and derived data remain authoritative for the reference project unless the user edits or explicitly replaces them. Procedural fills must not overwrite imported facts.

## Product provenance boundary

Full dataset provenance is not a runtime product requirement.

Repository reference documents should record:

- source dataset and publisher;
- license and redistribution constraints;
- source resolution and coordinate conventions;
- transformations, resampling, normalization, and missing-data treatment;
- procedural gap-filling method;
- known fidelity limits.

The `.wforge` model only needs lightweight data-origin and capability information sufficient to distinguish:

- imported;
- derived from imported data;
- procedurally generated fill;
- user edited or overridden.

Do not attach scientific citation chains to every cell, crater, or feature unless a later product requirement justifies it.

## ETL architecture

Reference ingestion should use an adapter boundary:

```text
External dataset or authored source
  -> source adapter
  -> normalized system/body import model
  -> canonical World Forge body layers and relationships
  -> one multi-body WorldProject
  -> .wforge serialization
```

Source-specific details must stop at the adapter or import-model boundary. Durable renderer, generator, and `.wforge` contracts must not depend on NASA-, USGS-, ESA-, JPL-, GIS-, TIFF-, NetCDF-, or mesh-specific schemas.

## Normalized import concepts

The import model should support these concepts where applicable:

### Identity and system structure

- stable system ID;
- stable body ID;
- body class and subtype;
- parent body;
- orbit and rotation facts;
- belt or population membership;
- primary and initial active body.

### Shape and coordinates

- sphere, oblate spheroid, triaxial ellipsoid, irregular mesh, or other supported shape model;
- coordinate reference and prime-meridian convention;
- longitude wrapping and latitude orientation;
- projected raster or surface-mesh coverage;
- radius-from-center or elevation datum.

### Surface and atmosphere

- elevation, topography, bathymetry, or radial displacement;
- water, ice, albedo, material, morphology, and surface classification;
- imagery or texture inputs;
- temperature, pressure, atmospheric composition, clouds, or climate fields where meaningful;
- feature geometry and labels where supported;
- missing-data masks and confidence or fidelity tier.

### Origin and edit state

- imported layer;
- derived layer;
- generated gap fill;
- user edit or override;
- source layer replacement and invalidation relationships.

## Body-specific presentation

Recognizability comes from different data for different body families.

### Earthlike and terrestrial bodies

Map and Globe may consume elevation, bathymetry, water, ice, climate, material, and biome or surface-classification layers.

### Airless spherical bodies

Map and Globe may consume topography, albedo, regolith or material classes, craters, and thermal presentation without Earth climate assumptions.

### Irregular small bodies

The canonical body may require an irregular shape mesh plus surface texture or radial data. A flat map may be partial, approximate, or unavailable depending on the accepted projection capability.

### Gas and ice giants

The visible body is atmospheric. Representation should use real banding, storms, atmospheric structure, rotation, rings, and relevant presentation data rather than fabricating a solid continental surface.

### Belts

Belts are system structures or populations. They may use procedural particle realization constrained by imported population facts while major individual bodies remain first-class body assets.

## First delivery sequence

### Slice 1: Earth

Prove the complete path with recognizable real Earth data:

- import adapters;
- normalized body model;
- canonical World Forge layers;
- Map;
- Globe or 3D;
- Explorer compatibility;
- system membership;
- `.wforge` save, reopen, export, and import;
- Parchment `.pworld` embedding without relying on device-local saved worlds.

Earth is the first fixture because it exercises the broadest layer set. It is not a hardcoded schema special case.

### Slice 2: Luna, Mars, Phobos, and Deimos

Use nearby contrasting bodies to prove:

- airless body support;
- non-Earthlike atmosphere and surface support;
- irregular shape support;
- body-specific capability handling;
- active-body continuity inside one system project.

### Slice 3: remaining planets and moons

Walk through the system with fidelity appropriate to available data and body type.

### Slice 4: belts and major minor bodies

Add asteroid-belt and other population structures, plus major individual bodies where useful.

## Current model gaps to audit

Before implementation, identify every place that assumes the primary world owns all canonical mappable layers. Likely seams include:

- `WorldProject.primaryWorld` as the only full-resolution surface holder;
- Map renderer inputs;
- Explorer and region-drilldown source identity;
- save and export serialization;
- replay and generation signatures;
- body-generation artifact storage;
- Globe target handling;
- System-to-Map view transitions;
- editor commands and invalidation;
- `.wforge` package size and optional-layer storage.

The audit should determine whether body data becomes a generalized canonical body record, a versioned body-detail artifact, or another contract that remains one-project and renderer-neutral.

## Compatibility constraints

- Existing generated projects must continue to load with their current primary-world behavior.
- Ordinary primary-world generation must not pay the cost of importing or materializing unused secondary bodies.
- Existing replay signatures must not change accidentally.
- Imported projects may carry richer body data without requiring all generated projects to do so.
- Renderer and Explorer code should use body-aware accessors rather than parallel Sol-only code paths.
- Optional high-volume layers may require package manifests or sidecar entries, but the user still experiences one project and one system.

## Validation direction

For each reference body added:

- compare Map and Globe against recognizable source landmarks or visual character;
- verify stable body identity across all views;
- switch views without reverting to the primary body;
- save and reopen the same active body;
- export and import `.wforge` without losing system or body data;
- import through Parchment without requiring pre-existing World Forge storage;
- edit the imported copy without modifying the distributed reference;
- distinguish imported, derived, filled, and edited layers;
- confirm unsupported views report capability honestly.

## Guardrails

- One system remains one project.
- Do not create separate per-body projects to avoid multi-body model work.
- Do not fabricate recognizable real-world geography when source data exists.
- Do not require full cell-level provenance in the product.
- Do not leak source-specific ETL formats into durable World Forge contracts.
- Do not silently reset active-body context.
- Do not force every body into an Earthlike flat-map model.
- Do not let reference-data work destabilize ordinary procedural generation.

## Definition of ready for Earth

- Accepted Earth source datasets and redistribution constraints are documented under `refs/`.
- Current `.wforge` and `WorldProject` primary-world assumptions are enumerated.
- A normalized imported-body contract location is selected.
- The minimum Earth layer set and target resolution are agreed.
- Package-size strategy is selected.
- World Forge #124 active-body behavior has an accepted contract, even if implementation is sequenced separately.

## Definition of done for the broader capability

- one `.wforge` project can carry one complete multi-body system;
- each supported body can own canonical imported or derived details;
- System, Globe or 3D, Map, and Explorer operate on the active body where supported;
- recognizable real-system fixtures round-trip deterministically;
- procedural gap fills remain bounded and distinguishable;
- Parchment can package and import the system as one editable project;
- the same ETL seam can support additional scientific, GIS, authored, and external-generator inputs.

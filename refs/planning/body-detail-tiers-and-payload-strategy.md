---
type: "Planning Reference"
title: "Body detail tiers and lightweight payload strategy"
tags:
- world-forge
- planning
---
# Body detail tiers and lightweight payload strategy

Updated: 2026-08-04
Status: Accepted architecture; detail/package foundation validated; first source-backed Tier 1 Jupiter implementation on `dev` awaiting exact-head validation and browser QA

Related work:

- `refs/planning/reference-system-etl-and-multi-body-navigation.md`
- `refs/handoffs/reference-system-etl-and-multi-body-navigation.md`
- `refs/research/reference-data/jupiter-reference-data.md`
- World Forge #124
- Parchment Worlds #22

## Decision

One World Forge project represents one coherent planetary system. Every body belongs to that project, but every body does not need or deserve the complete Earthlike `PrimaryWorld` layer set.

Body detail and view capability are body-specific. Runtime presentation may derive lighting, motion, haze, shading, and gap-filling detail from compact inputs. It must not replace recognizable imported facts with generic procedural lookalikes.

The durable body-detail contract is a versioned discriminated union. Large assets live as optional body-local `.wforge` entries referenced by compact catalog records.

## Detail tiers

### Tier 0: catalog

Stores the minimum authoritative system record:

- stable body identity and parent relationship;
- body family;
- physical and orbital facts;
- shape class;
- explicit view capabilities;
- optional small feature catalog.

Appropriate for low-priority bodies, bodies waiting for accepted source data, distant minor bodies, and objects that need system presence without close inspection.

Target payload is normally less than 10 KB per body before shared package overhead.

### Tier 1: presentation

Stores compact visual character rather than terrestrial geography.

Appropriate for:

- gas and ice giants;
- belts and populations;
- low-detail bodies that need recognizable System or Globe presentation;
- bodies whose visible character is atmospheric or population-based rather than a solid mappable surface.

Typical content:

- compact imported appearance rasters;
- palette and band profiles;
- haze and differential-rotation parameters;
- persistent major-feature descriptors;
- ring geometry and opacity;
- deterministic population distributions and realization seeds.

Provisional target payload is 50 KB to 750 KB per body when a compact visual raster is present. Inline profiles are normally much smaller.

The first implemented source-backed proof is Jupiter:

- source: Cassini cylindrical map `PIA07782`;
- prepared runtime form: 768 by 384 little-endian RGB565;
- uncompressed payload: 589,824 bytes;
- capability: Globe only;
- Map and Explorer remain unsupported.

### Tier 2: reference surface

Stores a compact solid-body surface without the full geographic simulation model.

Appropriate for:

- most solid moons;
- Mercury and Venus during initial reference coverage;
- dwarf planets;
- airless bodies with useful topography or albedo;
- irregular bodies with decimated meshes.

Supported forms:

- compact equirectangular albedo, elevation, radial displacement, normal, roughness, or material rasters;
- irregular shape mesh plus optional texture or vertex material;
- small named-feature catalog;
- missing-data mask where source coverage is incomplete.

Provisional target payload is 0.5 MB to 5 MB per body. Actual limits must be measured against accepted source assets and package behavior.

### Tier 3: geographic

Stores the canonical `PrimaryWorld`-compatible surface required for Map, Explorer, editors, and geographic drilldown.

Appropriate for Earth, Mars, Luna where justified, and selected high-value fictional or real worlds.

This tier may contain elevation, bathymetry, material, water, ice, climate, biome, hydrography, topology, regions, and other canonical layers. It is intentionally the exception rather than the default for every body in a system.

## Durable contracts

Implemented in:

- `packages/shared/src/worldBodyDetails.ts`;
- `packages/shared/src/worldBodies.ts`.

Schemas:

- `world-forge-body-detail-v1`;
- `world-forge-body-catalog-v1`.

Detail variants:

- `catalog`;
- `atmospheric-presentation`;
- `raster-surface`;
- `irregular-mesh`;
- `geographic-surface`;
- `population`.

Each detail record declares:

- detail tier;
- imported, derived, generated, authored, or edited origin;
- body-appropriate shape or distribution;
- supported compact parameters;
- optional package-entry asset references.

The body catalog retains explicit Globe, Map, Explorer, and irregular-shape capabilities. Detail-derived capabilities provide safe defaults, but a body may remain more restrictive when source coverage, product support, or accepted fidelity requires it.

## Asset references and package persistence

Large or binary assets do not belong inline in `system/body-catalog.json`.

A detail record may reference package entries by:

- stable asset ID;
- semantic role;
- safe body-local logical path;
- media type;
- optional encoding;
- optional resolution;
- optional byte length;
- optional `sha256:<hex>` checksum;
- optionality.

Initial roles include albedo, elevation, radial displacement, mesh, normal, roughness, clouds, rings, material map, and feature catalog.

Unsafe absolute paths, drive-qualified paths, upward traversal, duplicate IDs, duplicate logical paths, and collisions with reserved body surface entries are invalid.

Implemented in:

- `packages/exporters/src/bodyAssetPackage.ts`;
- `packages/exporters/src/multiBodyWforge.ts`;
- `packages/exporters/src/desktop.ts`;
- `apps/desktop/src/storage.ts`.

Current behavior:

- Export copies available referenced binaries into their body-local `.wforge` paths.
- Required assets fail export when no runtime payload or resolver result is available.
- Optional assets may be absent and are counted in package metadata.
- Export records actual byte length and SHA-256 digest.
- Import rejects missing required entries, byte-length mismatches, and checksum mismatches.
- Imported bytes are restored as typed runtime payloads keyed by stable asset ID.
- Local structured serialization preserves typed payloads without base64 expansion.
- Local storage accounting counts binary bytes once.
- Re-export after import preserves referenced bytes and checksums.
- Loading or saving while a secondary body is active retains the true durable primary surface.

The package boundary was validated at World Forge commit `8f06fa35e37a5d90aa5ee662cc1deb1ebecbd7f7` with 103 test files, 379 tests, the production harness self-tests, and the production build all passing.

Current `.wforge` import still eagerly hydrates every referenced body asset. Lazy package-entry loading remains required before large Tier 2 and Tier 3 inventories expand.

## Body-family rules

### Terrestrial and geographic worlds

Use Tier 3 only when Map, Explorer, editing, or geographic drilldown is required. Prefer a compact Tier 2 raster when recognizable Globe or simple surface presentation is sufficient.

### Airless spherical bodies

Prefer Tier 2 albedo plus optional topography or radial displacement. Derive shaded relief, bump presentation, normals, and display roughness at runtime where practical.

Do not add Earth climate, water, biome, plate, river, or region layers unless they are meaningful for the body.

### Irregular bodies

Use Tier 0 while only physical facts and irregular-shape intent are known. Upgrade to Tier 2 when an accepted decimated mesh exists.

A flat map may remain unsupported. Globe or 3D presentation should use the mesh directly. A future local-surface explorer may operate on mesh triangles or projected patches without requiring a global equirectangular map.

### Gas and ice giants

Use Tier 1 atmospheric presentation.

Store:

- oblate shape;
- compact imported appearance raster where redistributable;
- band and palette profile;
- haze;
- persistent major features where source stability supports them;
- rings;
- rotation facts.

Derive runtime cloud movement, band drift, turbulence, lighting, haze, and limb presentation. These effects are presentation, not observed historical simulation.

Do not create a solid continental `PrimaryWorld` for a gas giant.

### Belts and populations

Use Tier 1 population detail.

Store radial bounds, vertical spread, inclination and eccentricity summaries, relative density, deterministic realization seed, preview particle budget, and first-class references to major bodies.

Generate visible particles at runtime. Never serialize thousands of individual decorative particles.

## Sol reference assignment

Current scaffold:

- Earth: Tier 3 geographic;
- Mercury, Venus, Mars: Tier 0 until accepted surface packages are added;
- Jupiter: Tier 1 atmospheric profile, upgraded to source-backed Globe presentation when the prepared `PIA07782` raster is attached;
- Saturn, Uranus, Neptune: Tier 1 derived atmospheric profiles, still Globe-disabled until source-backed assets and accepted presentation are wired;
- ordinary selected moons: Tier 0 until compact reference surfaces are added;
- Phobos and Deimos: Tier 0 with irregular-shape intent until accepted meshes are added;
- Main Asteroid Belt and Kuiper Belt: Tier 1 deterministic population detail.

Derived palettes, ring profiles, and population distributions are scaffolds. They are not substitutes for later accepted imported appearance or shape data.

## Jupiter Tier 1 proof

Implemented in:

- `tools/reference-etl/prepare_jupiter_reference.py`;
- `scripts/referenceImageBundle.ts`;
- `packages/generator-core/src/referenceAtmosphericPresentation.ts`;
- `scripts/build-earth-reference.ts`;
- `packages/renderer/src/bodyAwarePresentation.ts`;
- `apps/desktop/src/globe/globeBodyTarget.ts`.

The local ETL:

1. downloads or accepts the official Cassini JPEG;
2. validates an approximately 2:1 cylindrical source;
3. retains the original locally for review;
4. resamples to 768 by 384;
5. quantizes to little-endian RGB565;
6. records source and prepared dimensions, byte lengths, checksums, credit, and transform metadata.

The Sol builder attaches the prepared raster to Jupiter in the same Earth-backed `.wforge`. Jupiter becomes Globe-capable only when both the asset reference and hydrated payload exist.

Map continues to render an explicit unsupported state. Globe's existing texture seam pass synchronously expands the staged RGB565 raster, avoiding asynchronous browser image decoding.

Current limitation: the legacy Globe geometry builder still uses its near-spherical geographic mesh. Jupiter's oblate-spheroid shape contract is not yet consumed by that geometry path, and Globe status instrumentation still requires an atmospheric-specific pass. Do not call the Jupiter visual implementation finished until those are addressed and browser QA passes.

## Package layout

```text
manifest.json
project.json
system/body-catalog.json
bodies/<body-id>/world.json
bodies/<body-id>/layers/*.json
bodies/<body-id>/topology-layers/*.json
bodies/<body-id>/<referenced assets>
```

Examples:

```text
bodies/jupiter/albedo.rgb565
bodies/luna/albedo.webp
bodies/luna/elevation.u16
bodies/phobos/shape.glb
```

The user still experiences one `.wforge` project and one planetary system.

## Loading policy

Load in stages:

1. system catalog and compact inline detail immediately;
2. small System-view previews when needed;
3. selected body's presentation assets when System or Globe focuses it;
4. compact surface assets when Map opens;
5. full geographic layers only when Map, Explorer, editors, or drilldown require them;
6. optional enhancement assets only on explicit demand.

Viewing Jupiter or Saturn must not materialize Earth's geographic arrays. Opening Earth must not eagerly decode every moon mesh and giant appearance raster.

## Compatibility

- Existing single-world projects remain geographic through the compatibility catalog.
- Existing multi-body packages without detail records remain valid.
- Adding a canonical `PrimaryWorld` surface supplies a default geographic detail record when none is provided.
- Existing local records without body payloads remain valid.
- Imported package payloads survive local save/reopen and package re-export.
- Ordinary generated projects do not pay the cost of unused secondary-body assets.
- Superseded local Jupiter JPEG bundles are rejected rather than mislabeled as RGB565.

## Validation requirements

For each new detail variant or body:

- validate the detail schema and safe package paths;
- verify declared capabilities match actual view behavior;
- verify package export and import preserve the detail record and referenced assets;
- confirm unsupported views explain the limitation rather than switching bodies;
- measure compressed package size and peak load memory;
- compare recognizability against accepted source material;
- distinguish imported source assets from derived runtime presentation;
- preserve deterministic population realization from the stored seed.

## Next increments

1. Run exact-head `npm run verify` for the Jupiter adapter, RGB565 renderer, target contract, and script tests.
2. Prepare the real Jupiter bundle and record source/prepared dimensions and digests.
3. Build the Earth-plus-Jupiter Sol `.wforge` and measure compressed package delta and browser memory.
4. Perform Jupiter System/Globe recognition and seam QA while confirming Map remains unsupported.
5. Make Globe geometry consume atmospheric oblate-spheroid shape and expose atmospheric-specific status instrumentation.
6. Generate the enriched Parchment Sol starter and complete import/re-import QA.
7. Add a compact Luna or Mars Tier 2 surface and measure package behavior.
8. Add a decimated Phobos or Deimos mesh and prove irregular-body Globe support.
9. Add lazy package-entry loading.
10. Replace provisional payload targets with measured budgets.

## Guardrails

- Do not force every body into `PrimaryWorld`.
- Do not call a derived palette, drift field, or procedural storm observed data.
- Do not make a generic generated giant the final representation of a known real giant when accepted source imagery exists.
- Do not serialize decorative belt particles.
- Do not require Map or Explorer for bodies where those views are not meaningful.
- Do not let lightweight tiers become excuses for replacing available recognizable data with generic approximations.
- Do not call the Jupiter proof finished before exact-head validation, package measurement, source recognition QA, and oblate geometry support.

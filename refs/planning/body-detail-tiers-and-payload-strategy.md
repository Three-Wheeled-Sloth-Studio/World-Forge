# Body detail tiers and lightweight payload strategy

Updated: 2026-08-04
Status: Accepted architecture; detail contract and package asset persistence implemented on `dev`; exact-head validation pending
Related work:

- `refs/planning/reference-system-etl-and-multi-body-navigation.md`
- `refs/handoffs/reference-system-etl-and-multi-body-navigation.md`
- World Forge #124
- Parchment Worlds #22

## Decision

A planetary system project must store the minimum authoritative information required to make each body recognizable and useful. It must not force every body into the full Earthlike `PrimaryWorld` layer set.

Body detail and view capability are body-specific. Runtime presentation may derive visual detail from compact imported or authored inputs, but it must not replace recognizable imported facts with generic procedural lookalikes.

The durable body-detail contract is a versioned discriminated union. Heavy assets remain optional `.wforge` package entries referenced by compact body records.

## Detail tiers

### Tier 0: catalog

Stores:

- stable body identity and parent relationship;
- body family;
- physical and orbital facts;
- shape class;
- capability declaration;
- optional small feature catalog.

Appropriate for:

- minor or low-priority moons;
- distant dwarf and minor bodies;
- objects awaiting accepted source data;
- bodies that need system presence but no close inspection yet.

Target payload is normally less than 10 KB per body before shared package overhead.

### Tier 1: presentation

Stores compact visual character rather than terrestrial geography.

Appropriate for:

- gas giants and ice giants;
- belts and other populations;
- low-detail bodies that need recognizable System or Globe presentation;
- bodies whose visible character is atmospheric or population-based rather than a solid mappable surface.

Typical content:

- low-resolution imported texture references;
- palette and band profiles;
- haze and differential-rotation parameters;
- persistent major-feature descriptors;
- ring geometry and opacity;
- deterministic population distributions and realization seeds.

Provisional target payload is 50 KB to 750 KB per body when a compact visual texture is present. Inline profiles are normally much smaller.

### Tier 2: reference surface

Stores a compact solid-body surface without the complete geographic simulation model.

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

Appropriate for:

- Earth;
- Mars;
- Luna where accepted use cases justify geographic depth;
- selected high-value fictional or real worlds.

This tier may contain elevation, bathymetry, material, water, ice, climate, biome, hydrography, topology, regions, and other canonical layers. It is intentionally the exception rather than the default for every body in a system.

## Durable contract

The initial contract is implemented in:

- `packages/shared/src/worldBodyDetails.ts`
- `packages/shared/src/worldBodies.ts`

Schema:

- `world-forge-body-detail-v1`

Variants:

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

The body catalog retains explicit view capabilities. Detail-derived capabilities provide safe defaults, but a body may remain more restrictive when source coverage, product support, or accepted fidelity requires it.

## Asset references

Large or binary assets do not belong inline in `system/body-catalog.json`.

A detail record may reference package entries by:

- stable asset ID;
- semantic role;
- safe relative logical path;
- media type;
- optional encoding;
- optional resolution;
- optional byte length;
- optional `sha256:<hex>` checksum;
- optionality.

Initial roles include:

- albedo;
- elevation;
- radial displacement;
- mesh;
- normal;
- roughness;
- clouds;
- rings;
- material map;
- feature catalog.

Unsafe absolute paths, drive-qualified paths, upward traversal, duplicate IDs, duplicate logical paths, and collisions with reserved body surface entries are invalid.

## Implemented package persistence

Implemented in:

- `packages/exporters/src/bodyAssetPackage.ts`;
- `packages/exporters/src/multiBodyWforge.ts`;
- `packages/exporters/src/desktop.ts`;
- `apps/desktop/src/storage.ts`.

Current behavior:

- Export copies every available referenced binary into its body-local `.wforge` path.
- Required assets fail export when no runtime payload or resolver result is available.
- Optional assets may be absent and are counted in package metadata.
- Export records the actual byte length and SHA-256 digest in the packaged body catalog.
- Import rejects missing required entries, byte-length mismatches, and checksum mismatches.
- Imported bytes are restored as typed runtime payloads keyed by stable asset ID.
- Local structured serialization preserves typed payloads without base64 expansion and storage accounting counts the binary bytes once.
- Re-export after import preserves referenced bytes and checksums.
- Loading or saving while a secondary body is active retains the true durable primary surface.

This is the first correct package boundary, not the final loading strategy. Current `.wforge` import eagerly reads all referenced body assets. The staged loading policy below still requires a package-entry abstraction that can defer decoding until a view requests a body.

## Body-family rules

### Terrestrial and geographic worlds

Use Tier 3 only when Map, Explorer, editing, or geographic drilldown is required. A compact Tier 2 raster is preferred when recognizable Globe or simple Map presentation is sufficient.

### Airless spherical bodies

Prefer Tier 2 raster surfaces containing albedo and optional topography or radial displacement. Derive shaded relief, bump presentation, normals, and display roughness at runtime where practical.

Do not add Earth climate, water, biome, plate, river, or region layers unless they are meaningful for the body.

### Irregular bodies

Use Tier 0 while only physical facts and irregular-shape intent are known. Upgrade to Tier 2 when a decimated mesh is accepted.

A flat map may remain unsupported. Globe or 3D presentation should use the mesh directly. A future local-surface explorer may operate on mesh triangles or projected patches without requiring a global equirectangular map.

### Gas and ice giants

Use Tier 1 atmospheric presentation.

Store:

- oblate shape;
- compact imported appearance texture where redistributable;
- band and palette profile;
- haze;
- persistent major features where source stability supports them;
- rings;
- rotation facts.

Derive runtime cloud movement, band drift, turbulence, lighting, haze, and limb presentation. These effects are presentation, not observed historical simulation.

Do not create a solid continental `PrimaryWorld` for a gas giant.

### Belts and populations

Use Tier 1 population detail.

Store:

- radial bounds;
- vertical spread;
- inclination and eccentricity summaries;
- relative density;
- deterministic realization seed;
- preview particle budget;
- first-class references to major bodies.

Generate visible particles at runtime. Never serialize thousands of individual decorative particles.

## Sol reference assignment

The initial Sol scaffold now uses:

- Earth: Tier 3 geographic;
- Mercury, Venus, Mars: Tier 0 until accepted surface packages are added;
- Jupiter, Saturn, Uranus, Neptune: Tier 1 atmospheric presentation;
- ordinary selected moons: Tier 0 until compact reference surfaces are added;
- Phobos and Deimos: Tier 0 with irregular-shape intent until accepted meshes are added;
- Main Asteroid Belt and Kuiper Belt: Tier 1 deterministic population detail.

Atmospheric palettes and population distributions in the initial scaffold are derived presentation profiles. They are not substitutes for the later accepted imported appearance assets.

## Package layout

The body catalog remains immediately available:

```text
system/body-catalog.json
```

Optional body assets use body-local package entries:

```text
bodies/jupiter/albedo.webp
bodies/jupiter/clouds.webp
bodies/luna/albedo.webp
bodies/luna/elevation.u16
bodies/phobos/shape.glb
bodies/phobos/albedo.webp
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

Viewing Saturn must not materialize Earth's geographic arrays. Opening Earth must not eagerly load every moon mesh and atmospheric texture.

## Compatibility

- Existing single-world projects remain geographic through the compatibility catalog.
- Existing multi-body packages without detail records remain valid.
- Adding a canonical `PrimaryWorld` surface supplies a default geographic detail record when none is provided.
- Detail records remain lightweight metadata unless they explicitly reference package assets.
- Existing local records without body payloads remain valid.
- Imported package payloads survive local save/reopen and package re-export.
- Ordinary generated projects do not pay the cost of unused secondary-body assets.

## Validation

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

1. Run the exact-head typecheck and focused tests for the detail and asset-package contracts.
2. Add an imported atmospheric texture adapter and prove Jupiter or Saturn end to end.
3. Add a compact Luna or Mars raster surface and measure Tier 2 package behavior.
4. Add a decimated Phobos or Deimos mesh and prove irregular-body Globe support.
5. Add lazy package-entry loading so large geographic and mesh assets are not decoded during ordinary System browsing.
6. Record measured payload budgets and replace the provisional targets.

## Guardrails

- Do not force every body into `PrimaryWorld`.
- Do not call a derived palette or procedural storm field observed data.
- Do not make a generic generated giant the final representation of a known real giant when accepted source imagery exists.
- Do not serialize decorative belt particles.
- Do not require Map or Explorer for bodies where those views are not meaningful.
- Do not let lightweight tiers become excuses for replacing available recognizable data with generic approximations.

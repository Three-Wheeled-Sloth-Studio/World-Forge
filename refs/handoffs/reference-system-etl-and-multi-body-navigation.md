# Reference-system ETL and multi-body navigation handoff

Updated: 2026-08-04
Status: One-system package path, Earth Tier 3, Jupiter Tier 1, authoritative System naming, and Parchment body-entry selection passed user browser QA on `dev`; remaining work is body-family coverage, atmospheric geometry correction, hierarchical selection UI, lazy loading, and measured resolution tiers

Authoritative planning:

- `refs/planning/reference-system-etl-and-multi-body-navigation.md`
- `refs/planning/body-detail-tiers-and-payload-strategy.md`

Related handoffs:

- `refs/handoffs/system-view-body-catalog-alignment.md`

Reference-data notes:

- `refs/research/reference-data/earth-reference-data.md`
- `refs/research/reference-data/jupiter-reference-data.md`

Tracking:

- Parchment Worlds #22, Sol System reference project
- World Forge #124, preserve active body across System, Globe, Explorer, and Map

## Product contract

One World Forge project owns one coherent planetary system.

Earth, Jupiter, Mars, Luna, moons, belts, and minor bodies are records inside that project. Parchment may expose each body as its own world asset for navigation, relationships, and content authoring, but those assets map into one nested `.wforge` package and do not create separate systems.

Real bodies use actual or best-available source data. Derived or procedural presentation may fill real gaps, but must remain distinguishable and must not overwrite recognizable imported facts.

Full scientific provenance stays in repository references. Runtime records carry only the compact origin, capability, shape, encoding, and asset information needed to behave correctly.

## Current accepted heads

World Forge implementation and browser-QA checkpoint:

```text
5cdce0dd1efb68c18f286b2165482d849971d64d
```

Parchment Worlds package/discovery checkpoint:

```text
2a3d6ea643e437ada9dd3abf24db51ed428a7d2b
```

Documentation commits after these heads do not change runtime behavior.

## User-confirmed QA

The following behavior has been observed locally through the normal Parchment embed flow:

- the enriched Sol starter builds with the nested World Forge package;
- Parchment discovers the sibling World Forge reference package automatically;
- no environment variable is required for normal development;
- Earth opens in World Forge and is recognizable;
- Jupiter opens in World Forge through the same system package;
- Earth and Jupiter select their own active body rather than opening separate systems;
- System view uses canonical names rather than `Rocky 1`, `Gas Giant 6`, or `Sol System` for Earth;
- Jupiter's imported atmospheric banding looks good and is recognizable.

Outstanding visual QA from the same pass:

- Jupiter is lumpy and must become smooth;
- the System body selector must indent moons under their parent bodies;
- Earth looks good at 512 by 256, but a higher-resolution option should be revisited after broader system coverage.

## Implemented foundation

### Body catalog and active body

Implemented in:

- `packages/shared/src/worldBodies.ts`
- `packages/shared/src/worldBodySession.ts`

`world-forge-body-catalog-v1` carries:

- stable body identity;
- parent relationships;
- durable primary body;
- active body session;
- body family;
- view capabilities;
- physical and orbital facts;
- imported, derived, generated, authored, or edited origin;
- optional compact detail;
- optional canonical `PrimaryWorld` surface;
- typed runtime asset payloads.

### Detail tiers

Implemented in:

- `packages/shared/src/worldBodyDetails.ts`

Supported variants:

- catalog;
- atmospheric presentation;
- raster surface;
- irregular mesh;
- geographic surface;
- population.

Supported tiers:

- Tier 0 catalog;
- Tier 1 presentation;
- Tier 2 reference surface;
- Tier 3 geographic.

The system no longer forces every body into a full Earthlike layer set.

### One-project `.wforge`

Implemented in:

- `packages/exporters/src/multiBodyWforge.ts`
- `packages/exporters/src/bodyAssetPackage.ts`
- `packages/exporters/src/desktop.ts`
- `apps/desktop/src/storage.ts`

The package preserves:

- one system catalog;
- multiple canonical surfaces;
- compact body-local textures and meshes;
- byte lengths and SHA-256 checksums;
- required and optional entries;
- local typed payload persistence;
- imported payload re-export;
- durable primary preservation while a secondary body is active.

Current import remains eager. Lazy body-asset loading is still required before the package is filled with many high-resolution rasters and meshes.

### Parchment bridge

Parchment stores one nested `.wforge` attachment and a body-binding array.

Each binding maps a Parchment body asset ID to one stable World Forge body ID. Opening a body sends the same package with a different requested active body.

The bridge now uses an explicit ready handshake, preventing package transfer before World Forge installs its receiver.

## Earth Tier 3

Current local build path:

```powershell
python -m pip install -r tools/reference-etl/requirements.txt
npm run reference:prepare-earth -- `
  --width 512 `
  --height 256 `
  --topology-resolution 64
npm run reference:build-earth
```

Current known output:

```text
.local/reference-data/sol-earth-reference.wforge
```

Recorded Earth-only baseline:

- 22 body records;
- 512 by 256 Earth map;
- approximately 3.54 MB package before Jupiter was added;
- source-backed ETOPO elevation, bathymetry, and coastline geometry;
- derived placeholder climate and biome fields;
- no complete real albedo, hydrography, climate, land-cover, or ice stack yet.

User QA assessment:

- current Earth presentation looks great;
- 512 by 256 is accepted as the current integration baseline;
- a higher-resolution Earth option is desirable later;
- other body coverage is a higher priority first.

### Earth resolution follow-up

The ETL already accepts explicit output width, height, and topology resolution. The next resolution study should compare at least:

- 512 by 256, current integration baseline;
- 1024 by 512, likely high-resolution user option;
- 2048 by 1024 only if package size, load time, browser memory, and visual improvement justify it.

Measure:

- source processing time;
- `.wforge` and enriched `.pworld` size;
- import time;
- local save/reopen time;
- browser memory;
- Globe and Map visual improvement;
- whether topology resolution must rise with raster resolution.

Do not prioritize this study ahead of initial Mars, Venus, Luna, and remaining family coverage.

## Jupiter Tier 1

Selected source:

- NASA/JPL Cassini cylindrical map `PIA07782`;
- credit: NASA/JPL/Space Science Institute.

Prepared representation:

- 768 by 384;
- little-endian RGB565;
- 589,824 bytes before package compression;
- logical path `bodies/jupiter/albedo.rgb565`;
- Tier 1 atmospheric presentation;
- Globe capability only.

User QA assessment:

- banding looks great;
- Jupiter is recognizable;
- current geometry is incorrectly lumpy.

### Required Jupiter correction

Gas giants must use dedicated smooth atmospheric geometry:

- smooth sphere or oblate spheroid;
- no geographic elevation displacement;
- no terrain bumps;
- retain source banding;
- preserve equatorial/polar radius ratio;
- preserve separate ring geometry for ringed giants.

The likely defect is reuse of the legacy geographic Globe mesh or displacement path. Fix the body-family geometry route, not the texture.

## System view state

Passed QA:

- canonical names;
- Earth correctly labeled;
- Parchment-requested body selected and focused;
- giant presentation visible in System;
- one package shared by Earth and Jupiter entry assets.

Open UI requirement:

- moons must appear immediately below and visually indented under their parent planet in the body selector;
- ordering and indentation must derive from catalog parent relationships;
- stable flat body IDs remain the option values;
- belts remain peer system entries.

Detailed acceptance is in `refs/handoffs/system-view-body-catalog-alignment.md`.

## Resolution policy for remaining bodies

Initial coverage should favor recognizability and system completeness over Earth-level simulation depth.

Recommended first-pass targets:

- Mars: near the normal 1024 by 512 map default when source and performance permit;
- Venus: near the normal 1024 by 512 default when source and performance permit, with cloud appearance and radar surface treated as distinct layers or modes;
- Luna: 512 by 256 or 1024 by 512 based on measured value and payload;
- major moons: generally 512 by 256 or lower unless a specific body justifies more;
- gas and ice giants: compact presentation rasters around the Jupiter scale;
- irregular bodies: decimated meshes rather than forced global rasters;
- belts: deterministic distributions, never serialized decorative particle inventories.

These are target bands, not promises. Source quality, licensing, recognizability, package size, and browser behavior decide the accepted level.

## Remaining body-family work

### Terrestrial and solid spherical bodies

Build a reusable Tier 2 surface adapter and renderer for:

- Mars;
- Venus solid surface;
- Luna;
- Mercury;
- Io;
- Europa;
- Ganymede;
- Callisto;
- Enceladus;
- Titan;
- Titania;
- Oberon;
- Triton.

The generic path should consume compact albedo, elevation or radial displacement, normal, roughness, material, and feature-catalog assets without constructing a full `PrimaryWorld` unless Map, Explorer, editing, or simulation requires it.

### Venus presentation

Venus needs two honest representations:

- visible cloud-deck appearance for System and Globe;
- radar-derived surface for solid-surface inspection.

Do not present the cloud image as terrain or the radar surface as the ordinary visible appearance.

### Gas and ice giants

Generalize Jupiter's Tier 1 path to:

- Saturn;
- Uranus;
- Neptune.

Add:

- accepted source rasters;
- shared smooth oblate geometry;
- Saturn ring texture and geometry;
- body-family inspector labels;
- optional derived band motion and haze clearly marked as presentation.

### Irregular bodies

Add accepted decimated meshes for:

- Phobos;
- Deimos.

These should support direct 3D inspection without requiring a misleading equirectangular Map.

### Belts and populations

Render the Main Asteroid Belt and Kuiper Belt from deterministic compact population records. Do not serialize thousands of individual decorative bodies.

## Required infrastructure before full inventory

### Lazy package loading

Current package import hydrates every referenced body asset.

Before adding all major moons and multiple high-resolution worlds, introduce staged loading:

1. load system catalog and compact inline detail;
2. load System previews when visible;
3. load selected body's Globe assets on focus;
4. load Map layers only when Map opens;
5. load geographic arrays and editor data only when required;
6. unload or cache bounded assets according to measured memory policy.

### Capability-complete navigation

Complete #124 across:

- System selection;
- Globe;
- Map;
- Explorer;
- save/reopen;
- Parchment export/re-import.

Unsupported views must explain the limitation and never silently switch to Earth.

## Prioritized next increments

1. Fix smooth atmospheric Globe geometry for Jupiter and protect Earth geographic relief.
2. Indent moons under parent bodies in the System selector.
3. Measure the current Earth-plus-Jupiter package and browser memory.
4. Add lazy package-entry loading before broad asset expansion.
5. Add Mars at near-default reference resolution.
6. Add Venus cloud appearance plus radar-surface contract at near-default resolution.
7. Add Luna and the generic Tier 2 solid-body renderer.
8. Generalize atmospheric presentation to Saturn, Uranus, and Neptune.
9. Add Phobos/Deimos mesh support.
10. Populate remaining major moons by source quality and product value.
11. Add deterministic belt rendering.
12. Return to optional high-resolution Earth after broader system coverage is stable.

## Validation checklist for each added body

- accepted source and licensing recorded;
- source/prepared dimensions and hashes recorded;
- origin and capability flags accurate;
- recognizable System presentation;
- correct Globe geometry for body family;
- Map and Explorer only enabled when meaningful;
- active body preserved across supported views;
- package save/reopen and Parchment re-import preserve the body;
- package-size and memory delta measured;
- unsupported paths remain explicit;
- no silent fallback to Earth.

## Guardrails

- One system remains one project.
- Parchment body assets are entry nodes, not separate `.wforge` systems.
- Do not force every body into `PrimaryWorld`.
- Do not apply geographic displacement to atmospheric giants.
- Do not label derived motion, haze, storms, or palettes as observed data.
- Do not expose Map or Explorer solely because a cylindrical appearance raster exists.
- Do not serialize decorative belt particles.
- Do not let Earth resolution work displace initial coverage of higher-priority bodies.
- Do not claim a body complete without package, navigation, save/reopen, and browser QA.

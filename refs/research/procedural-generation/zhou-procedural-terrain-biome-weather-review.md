# Procedural Generation Review: Procedural Terrain Generation with Biome Ecosystem and Dynamic Weather

Updated: 2026-07-29

Source examined:

Yanyan Zhou, *Procedural Terrain Generation with Biome Ecosystem and Dynamic Weather*, Southern Methodist University, Master's Thesis Technical Design Document, Version 3.2, 2025.

Source format: 34-page PDF including cover and repository front matter.

## Review goal

Mine techniques that may improve World Forge performance, quality, authoring, rendering, drilldown, ecology presentation, and later simulation, while preserving the distinction between:

- authoritative world facts;
- derived render fields;
- local/detail terrain presentation;
- dynamic visual weather;
- actual planetary climate and ecosystem simulation.

This source is evaluated against the full research catalog, not only the current deep-time optimization shortlist.

## 1. Initial verdict

This thesis is not a planetary world-generation system. It is a finite, designed-size terrain editor and DirectX 11 rendering project built around heightmaps, procedural noise, biome-material blending, water presentation, vegetation placement, and dynamic weather visuals.

It contributes little to:

- tectonic simulation;
- deep-time aging;
- hydrology;
- glaciation;
- planetary climate;
- long-ribbon terrain prevention.

It contributes several useful techniques to the broader World Forge catalog:

1. GPU-consumable biome/material weight maps;
2. height- and slope-aware material blending;
3. selective triplanar mapping only on steep terrain;
4. central-difference terrain normals as derived presentation data;
5. mipmapping and anisotropic filtering for distant and oblique terrain views;
6. large-wave geometry plus fine-wave normal detail for water;
7. GPU-looped rain particles without CPU respawn;
8. smooth skybox transitions for time and weather presentation;
9. jittered-grid vegetation placement filtered by environmental fields;
10. user-editable response curves for procedural noise outputs;
11. pluggable imported or generated heightmaps and biome maps;
12. a useful negative lesson: do not implement a fashionable optimization, such as a quadtree, when the product's finite-terrain constraints do not need it.

The immediate slow-phase shortlist does not change because of this source. The rendering and authoring catalogs do.

## 2. Source lineage and independence

The thesis references:

- Sebastian Lague's procedural landmass tutorials;
- Red Blob Games terrain-from-noise material;
- standard Perlin and fractal noise methods;
- texture splatting and height/slope terrain rendering sources;
- GPU Gems water simulation;
- common mipmapping, anisotropic filtering, and DirectX terrain tutorials.

Most individual algorithms are established rendering techniques rather than new procedural-generation research.

The source is still useful because it integrates them into an interactive terrain editor and records practical implementation choices, failures, and scope decisions.

## 3. Product constraints

The product targets a finite, designer-sized terrain rather than an infinite world.

Key constraints and assumptions:

- regular 2D heightmap grid;
- imported or generated heightmaps;
- imported or generated biome maps;
- DirectX 11 rendering;
- interactive ImGui editing;
- user-controlled terrain dimensions and elevation range;
- example terrain resolution of 512 by 512, or 262,144 vertices;
- local first-person and free-camera inspection;
- visual weather and time-of-day effects;
- artist-facing customization prioritized over geological simulation.

The thesis explicitly notes that substantial effort was spent on a quadtree before concluding that it was suited to infinite terrain and not needed for this finite terrain.

World Forge lesson:

- optimization should follow the actual product workload;
- planetary overview, local drilldown, export, and hosted generation may need different acceleration strategies;
- do not add a spatial hierarchy merely because terrain engines commonly use one;
- use measured view, edit, export, and simulation workloads to justify LOD structures.

## 4. Pipeline summary

The practical terrain pipeline is:

1. Import or generate a scalar heightmap.
2. Optionally shape the heightmap through layered noise, smoothing, and user-defined curves.
3. Construct a regular terrain mesh.
4. Compute terrain normals through central differences.
5. Generate or import biome/material weights.
6. Blend terrain materials using either:
   - a biome map texture; or
   - runtime height- and slope-based rules.
7. Apply selective triplanar mapping to steep surfaces.
8. Add water with animated geometric waves and normal detail.
9. Add vegetation through jittered placement filtered by biome conditions.
10. Add visual rain through a GPU particle loop.
11. Blend day, night, and rain skyboxes.
12. Render with mipmaps, anisotropic filtering, lighting, and user controls.

This is primarily a rendering and authoring pipeline. It does not calculate a causally complete world ecology.

## 5. Structural topology

The terrain uses a regular heightmap grid converted to quads.

Useful properties:

- direct correspondence between scalar textures and terrain samples;
- predictable memory layout;
- cheap neighborhood stencils;
- straightforward GPU upload;
- natural mipmap generation;
- simple terrain editing and map import/export.

Limitations for World Forge:

- it is planar and finite;
- it does not address spherical topology, poles, seams, or global graph neighborhoods;
- it has no separate structural topology and detail topology;
- it is inappropriate as the authoritative planetary representation.

World Forge opportunity:

- use regular local rasters or patch grids as derived drilldown and editing surfaces;
- project authoritative spherical fields into local raster patches;
- apply grid-friendly rendering and editing operations there;
- map accepted edits back to authoritative world-relative fields through explicit conversion.

This supports a dual representation:

- global graph or spherical topology for world facts;
- local grid patches for detail rendering and authoring.

## 6. Tectonics and terrain causes

There is no tectonic model.

Base terrain is produced from:

- imported heightmaps;
- Perlin noise;
- fractal noise;
- layered procedural controls such as hilliness and oceanness;
- smoothing curves;
- simple height transformations.

The interesting authoring idea is not the noise itself. It is the use of separate procedural control fields and editable curves.

### Factorized control fields

The source describes a prior terrain method that uses several noise passes for concepts such as:

- hilliness;
- oceanness;
- riverbed or base height;
- final elevation response.

World Forge opportunity:

- expose author-friendly control fields derived from causal simulation;
- allow curves to remap cause fields into visible response;
- preserve physical inputs while giving users controlled stylistic latitude;
- keep controls deterministic and versioned.

Potential control fields include:

- uplift response;
- ridge sharpness;
- erosion exposure;
- basin depth response;
- shelf profile;
- coastal roughness;
- volcanic prominence;
- biome material exposure.

The curve editor is a useful UI pattern for these controls.

## 7. Deep time and erosion

There is no deep-time simulation or process-based erosion.

The source uses a 3 by 3 neighborhood average blended with the original height through a user-controlled smoothing factor.

Useful role:

- local edit cleanup;
- noise reduction;
- optional presentation smoothing;
- bounded repair after user sculpting.

Poor role:

- geological aging;
- river erosion;
- glacial erosion;
- large-scale terrain plausibility.

World Forge should not treat box smoothing as aging. It erases ridges, channels, fault expressions, and narrow supported features indiscriminately.

A better World Forge editing tool would offer process-aware alternatives:

- thermal relaxation;
- fluvial response;
- coastal weathering;
- glacial smoothing;
- user-selected generic blur only as an explicit cosmetic operation.

The source does not affect the current deep-time performance shortlist.

## 8. Hydrology

The source renders water but does not solve planetary hydrology.

Water is a user-positioned surface with animated waves. There is no:

- basin identification;
- drainage routing;
- river accumulation;
- lake filling;
- groundwater balance;
- sediment transport;
- coastline evolution.

The water techniques belong in rendering, not hydrology.

## 9. Glaciation

No glaciation system is present.

Snow-like or cold visual materials may be selected through height and slope rules, but there is no ice accumulation, flow, erosion, deposition, advance, retreat, or persistent-ice state.

The glaciation shortlist remains unchanged.

## 10. Climate and ocean circulation

The title uses "dynamic weather," but the weather system is visual:

- rain particles;
- day/night lighting;
- skybox transitions;
- user-triggered rain state.

Procedural biome values use noise and simple relationships among:

- temperature;
- wetness;
- elevation;
- exposure.

These are useful art-direction inputs but are not a climate solver.

World Forge should preserve the distinction:

- climate facts come from planetary energy, transport, terrain, ocean, and water systems;
- render weather may visualize those facts through rain, clouds, sky, lighting, and water effects;
- user-authored visual weather must not silently rewrite climate normals.

### Dynamic environment transitions

The source smoothly blends day, night, and rain skyboxes.

World Forge opportunity:

- use generated climate, season, latitude, and local weather state to drive environment presets in globe or local views;
- interpolate visual state instead of replacing it abruptly;
- keep presentation transitions outside world-generation invalidation.

This is useful for future local exploration and Steam feature videos, not for reducing the 15-second climate node.

## 11. Ecology, resources, and civilization

### GPU biome/material weight map

The thesis stores biome blend intensities in an RGBA texture:

- red: desert;
- green: grass;
- blue: wetland;
- alpha: base terrain or exposure.

The shader samples the map and blends terrain textures.

World Forge opportunity:

- generate compact material-weight textures from authoritative biome and surface facts;
- upload them as derived render assets;
- allow local edits to modify derived material masks without changing the global biome classification unless explicitly committed;
- use texture arrays or multiple packed textures when more than four channels are needed.

Important distinction:

- an RGBA splatmap is a render cache, not a sufficient authoritative biome schema;
- a cell may have climate, ecology, soil, land cover, and material facts beyond four visual weights;
- packing must remain replaceable and must not dictate saved world formats.

### Procedural biome map

The source derives visual biome weights from temperature, wetness, elevation, exposure, and noise.

World Forge opportunity:

- derive render materials from actual climate and ecology fields;
- optionally add low-amplitude noise for local variation;
- preserve the causal biome facts beneath the visual blend.

### Jittered-grid vegetation placement

Vegetation candidates are placed on a regular grid, offset randomly, and rejected when:

- outside the terrain;
- below water;
- below wetness or grassiness thresholds;
- otherwise unsuitable.

This is a cheap, predictable alternative to unconstrained random placement.

World Forge opportunity:

- use blue-noise, jittered-grid, or Poisson-like sampling for local/detail vegetation instances;
- drive density and type from authoritative ecology fields;
- generate instances only for visible or exported patches;
- use stable world-space hashing so placement remains deterministic without storing every plant.

This belongs in local presentation and asset export, not global ecological population simulation.

## 12. Rendering and drilldown

This is the source's strongest area.

### Height- and slope-based material blending

The shader chooses and blends materials using:

- normalized world height;
- elevation bands;
- surface slope;
- user-selected material assignments;
- blend thresholds.

Gentle slopes retain terrain-specific material. Steep slopes blend toward rock.

World Forge opportunity:

- derive local terrain material from elevation, slope, biome, substrate, moisture, snow, ash, sediment, and exposure;
- use soft blend bands to avoid hard material borders;
- allow presets to define material response curves;
- keep visual material assignment separate from biome identity.

### Selective triplanar mapping

Triplanar mapping is enabled only above a steepness threshold because it requires additional texture samples.

This is an excellent general optimization principle:

- use the expensive rendering path only where it solves a visible artifact;
- classify pixels or patches cheaply first;
- maintain a simpler fast path for the majority of terrain.

World Forge opportunity:

- apply triplanar mapping only to steep cliffs and overhang-like local geometry;
- use ordinary projected or atlas mapping elsewhere;
- instrument pixel coverage and sample cost before setting thresholds.

### Central-difference terrain normals

Normals are derived from symmetric height samples on both sides of the current texel.

Benefits:

- unbiased local gradient estimate;
- better ridge and undulation lighting than one-sided differences;
- no need to store authoritative normals;
- normals can be regenerated from height at the needed resolution.

World Forge opportunity:

- derive local normal maps from projected height patches;
- calculate at export or render resolution;
- cache by terrain-patch identity and height version;
- use lower-frequency normals for broad lighting and higher-frequency detail normals for close views.

### Mipmapping and anisotropic filtering

The thesis demonstrates that terrain viewed at distance or oblique angles benefits from:

- mipmap pyramids;
- automatic screen-space LOD selection;
- anisotropic texture sampling.

This is directly relevant to the reported fuzzy drilldown raster.

Potential World Forge action:

- build proper mip pyramids for terrain, biome, and material textures;
- select source resolution based on screen-space footprint;
- use anisotropic filtering for shallow-angle globe and terrain views;
- avoid repeatedly scaling one low-resolution raster deeper into drilldown;
- preserve detail through multiresolution source fields rather than post-upscaling.

This does not fix missing simulation detail, but it can prevent avoidable blur, shimmer, and oblique-angle degradation.

### Multiscale water presentation

The source combines:

- geometric sine or Gerstner-like waves for broad surface displacement;
- noise-perturbed wave directions;
- analytical surface gradients;
- central-difference sampled normals;
- a weighted blend of analytical and sampled normals.

World Forge opportunity:

- separate large-scale water shape from fine normal detail;
- let wind, fetch, basin type, coast proximity, and storm state select wave parameters;
- use shader-only detail where no authoritative water-surface change is needed;
- reserve hydrodynamic simulation for product cases that require it.

### GPU rain particles with wraparound

Rain positions are updated in the vertex shader. A modulo-like wrap returns particles to the top after they fall below the configured range.

Benefits:

- no CPU respawn loop;
- stable particle count;
- one reusable particle buffer;
- wind-driven lateral motion;
- cheap continuous animation.

World Forge opportunity:

- use for future local weather visualization;
- seed particle offsets deterministically per view or patch;
- cull or reduce density outside the visible weather volume;
- keep visual rain independent from rainfall accumulation facts.

### Skybox blending

Day, night, and rain cube maps are blended using smooth transition factors.

World Forge opportunity:

- map local environment state into visual atmosphere profiles;
- interpolate across time, season, weather, and biome;
- support authored visual themes without altering simulation outputs.

### Visual observations

The results pages show that the system can produce readable local terrain, blended ground cover, water, vegetation, and dramatic environmental variants. The strongest output is local presentation rather than large-scale landform plausibility.

The world-scale screenshot also shows why the technique should not be mistaken for a planetary generator: the landform structure remains heightmap/noise driven, while the visual system supplies much of the apparent richness.

## 13. Performance and memory

### Useful performance patterns

- Move per-pixel material blending to the GPU.
- Pack several visual weights into one sampled texture.
- Enable expensive triplanar sampling only on steep terrain.
- Use mipmaps to avoid oversampling distant detail.
- Use anisotropic filtering only where oblique footprints need it.
- Animate rain procedurally in the shader rather than respawning particles on the CPU.
- Keep broad water displacement and fine normal detail at different scales.
- Derive normals from height rather than persisting redundant authoritative data.

### Important cautions

- A 512 by 512 grid is only one local patch, not a planet-scale benchmark.
- GPU rendering improvements do not reduce server-side generation time unless the hosted runtime uses a GPU.
- Biome texture generation and upload should be incremental after edits.
- Multiple high-resolution material layers can become bandwidth-bound.
- Triplanar mapping multiplies texture samples and should remain conditional.
- Dynamic weather rendering should not run in headless VPS generation jobs.
- The source says indexing is nearly impossible because vertices have different UVs. That is an implementation choice, not a general constraint. Indexed grids, shared UVs, duplicated seam vertices, vertex-generated coordinates, or texture-space lookup are all possible.

### Scope-matched optimization

The thesis's quadtree experience is worth preserving as a quality gate for architecture proposals:

Before adopting an optimization, document:

- the measured bottleneck;
- the workload it accelerates;
- the target platform;
- the expected asymptotic and practical gain;
- memory cost;
- implementation complexity;
- what product scenario actually requires it.

## 14. Determinism

The editor exposes a seed that affects generated heightmaps and biome maps, but the thesis does not establish a durable deterministic algorithm contract.

World Forge should continue requiring:

- versioned algorithm identities;
- stable world-space sampling;
- subsystem RNG streams;
- deterministic local vegetation placement through hashing;
- no dependence on GPU-specific floating-point behavior for authoritative world facts.

Shader rendering may vary slightly across hardware, but simulation outputs must not.

## 15. Land-ribbon and morphology behavior

This source offers no direct ribbon-land detector or structural prevention method.

Its heightmap and noise generation could create narrow landforms, but the project does not analyze physical length, local width, geological support, or global circumference.

Potential indirect relevance:

- local material and vegetation systems should render retained narrow features attractively;
- mipmapping and anisotropic filtering can keep legitimate small archipelagos readable;
- visual quality should not pressure the simulation into deleting all narrow land.

The existing refined ribbon definition remains unchanged.

## 16. Quality metrics and tuning

The source relies mainly on visual inspection and interactive parameter adjustment.

Useful World Forge additions inspired by the editor:

- preview response curves before generation;
- show height and slope blend thresholds graphically;
- debug individual material weights;
- display generated biome/material maps;
- compare imported and generated fields;
- expose render-cost indicators for expensive modes such as triplanar mapping;
- capture screenshots across representative camera heights and angles.

Needed quantitative gates:

- mip transition stability;
- texture shimmer and aliasing;
- material-blend continuity;
- triplanar coverage and sample cost;
- normal-map consistency across patch boundaries;
- vegetation density and clustering statistics;
- deterministic placement signatures.

## 17. File-format implications

The recommended techniques do not require changing World Forge's saved world format.

Derived assets can remain rebuildable caches:

- biome/material splatmaps;
- normal maps;
- mip pyramids;
- vegetation instance buffers;
- water and rain render parameters;
- skybox transition state.

Imported heightmaps or biome maps may require explicit asset references or embedded user assets in a future editing workflow, but that is a product requirement rather than an algorithm requirement.

Strong bias:

- keep authoritative climate, biome, elevation, and ecology fields independent of GPU packing;
- version derived-cache formats separately;
- rebuild caches when renderer versions change;
- do not let an RGBA texture limit the domain model to four biome types.

## 18. License boundary

The PDF is a university thesis and cites numerous external sources. No project-code license was established from the PDF alone.

Use the document as a technique and design reference. Direct code adoption would require locating the source repository and checking its license and the licenses of bundled textures, shaders, and third-party components.

## 19. Immediate prototype candidates

This source does not change the current generation-performance shortlist.

It does suggest a separate rendering and drilldown experiment:

### Render prototype R1: multiresolution terrain presentation

Test on the existing world and drilldown renderer:

- proper terrain and material mip pyramids;
- anisotropic filtering for oblique views;
- central-difference derived normals;
- height/slope material blending;
- selective triplanar mapping on steep pixels or patches.

Measure:

- visual sharpness at each drilldown level;
- raster blur and shimmer;
- GPU frame time;
- texture memory;
- triplanar pixel coverage;
- patch seam visibility;
- deterministic screenshot comparisons where practical.

This is a presentation prototype, not a replacement for missing deep-resolution world data.

## 20. Broader technique-catalog additions

Add the following techniques to the broader catalog.

### Authoring and control

- imported and generated heightmaps behind one interface;
- imported and generated biome/material maps behind one interface;
- editable response curves for procedural scalar fields;
- separate hilliness, oceanness, exposure, and other author-control fields;
- live debug visualization of blend weights;
- scope-matched optimization review before adopting spatial hierarchies.

### Biome and ecology presentation

- GPU splatmaps or packed material-weight textures;
- authoritative biome facts converted into replaceable render weights;
- height- and slope-aware material blending;
- stable jittered-grid or blue-noise vegetation placement;
- environment-threshold filtering for local vegetation instances.

### Rendering and drilldown

- central-difference normal generation from height;
- mipmapped terrain, biome, and material fields;
- anisotropic filtering for oblique terrain views;
- selective triplanar mapping;
- separate broad water displacement and fine normal detail;
- blended analytical and sampled water normals;
- GPU-looped rain particles;
- smoothly blended environment cube maps.

### Runtime separation

- visual weather distinct from climate simulation;
- derived render caches distinct from world facts;
- local grid patches derived from global topology;
- headless generation excludes visual weather and GPU-only effects.

## 21. Approaches to avoid

- Treating noise-derived wetness and temperature as a sufficient climate model.
- Treating an RGBA splatmap as the authoritative biome schema.
- Applying 3 by 3 smoothing as geological aging.
- Running triplanar mapping everywhere.
- Persisting normals that can be derived from height unless a measured cache need exists.
- Adding a quadtree without a workload that benefits from one.
- Using unindexed terrain because one UV approach made indexing inconvenient.
- Running dynamic rain, skybox, or water animation in headless generation.
- Confusing local rendering quality with global terrain plausibility.

## 22. Instrumentation hypotheses

For future rendering and world-builder work, measure:

- terrain texture bytes by mip level;
- material and biome texture upload time;
- texture cache invalidation after edits;
- GPU frame time by render mode;
- percentage of pixels or patches using triplanar mapping;
- texture sample count by terrain class;
- normal derivation or normal-map generation time;
- seam error between neighboring local patches;
- blur and aliasing metrics across drilldown scales;
- vegetation candidates, accepted instances, and draw cost;
- rain particle count and GPU cost;
- water vertex and pixel cost;
- display-only actions that accidentally invalidate generation.

## Bottom line

This thesis does not offer a faster tectonic or glacial model. Its value is elsewhere.

It provides a compact catalog of techniques for turning authoritative terrain and biome fields into a readable, editable, and visually rich local environment without forcing those visual decisions into the world simulation.

The strongest World Forge takeaways are:

1. use GPU material-weight maps as derived caches, not world truth;
2. blend materials from height, slope, and authoritative environment fields;
3. reserve triplanar mapping for steep terrain;
4. build proper mip and anisotropic presentation before blaming all drilldown fuzziness on generation resolution;
5. derive normals from height at the required scale;
6. use stable filtered sampling for local vegetation;
7. separate visual weather from climate;
8. require optimizations to justify themselves against actual product scope.
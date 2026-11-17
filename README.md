# World Forge

World Forge is an open procedural world-generation project for tabletop RPG settings, fiction, and simulation. It generates science-informed star systems and planets, then turns the primary world into an explorable globe with terrain, climate, biomes, rivers, and exportable world data.

## Recent development

- Expanded procedural solar-system and primary-world generation.
- Added interactive 3D globe rendering and surface inspection tools.
- Added saved-world workflows and PNG, JSON, binary, and `.wforge` exports.
- Added generation diagnostics and performance benchmarking.
- Continued work on graph-based terrain, hydrology, biome, and surface-classification systems.
- Proved canonical world-relative geographic hierarchy and tile-window contracts through browser QA.

## Geographic atlas direction

The current flat geographic atlas is now a hierarchy and contract proof rather than the production rendering destination. The accepted next step is a constrained 2.5D atlas architecture with:

- elevation-displaced continuous terrain;
- orthographic map interaction with optional shallow pitch;
- Natural and analytical materials over the same geometry;
- explicit water and terrain-following river layers;
- region boundaries, selection, labels, and progressive hexes as overlays;
- continuous zoom instead of hierarchy-triggered renderer switches;
- a renderer-independent `GeographicScene` contract.

The spike preserves authoritative geography, deterministic generation, `.wforge`, and Parchment integration contracts. It does not turn renderer output into saved-world truth.

See:

- [2.5D atlas architecture decision](refs/decisions/geographic-atlas-2.5d-architecture-pivot-2026-08-06.md)
- [2.5D atlas architecture spike](refs/planning/geographic-atlas-2.5d-architecture-spike.md)
- [Current implementation handoff](refs/handoffs/currentHandoff.md)

World Forge is under active development. Generated results, file formats, and controls may change between preview builds.

## Install and run

### Manual start

```powershell
npm install
npm run dev
```

The development server opens on `http://localhost:5173/`. The private Parchment Worlds shell can also launch and embed this sibling checkout.

### Validate and build

```powershell
npm run validate
npm run build
```

## Engineering references

- [World Forge CI and coding-agent workflow](refs/engineering/ci-and-agent-workflow.md)
- [Integrating World Forge with External Games](refs/reference/external-game-integration.md)

The CI document records this repository's implementation of the studio-wide signal-discipline principle, including draft-PR behavior, manual validation, concurrency, stable check names, and diagnostic rules.

## Agentic project memory

World Forge uses [Agent Academy](https://github.com/Three-Wheeled-Sloth-Studio/Agent-Academy) as its project-memory pattern and exposes its mature `refs/` corpus through an [Open Knowledge Format](https://github.com/GoogleCloudPlatform/open-knowledge-format) v0.2-compatible profile.

- [Browse the OKF knowledge bundle](refs/index.md).
- [Inspect the World Forge OKF profile](refs/okfProfile.yaml).
- Markdown knowledge is exposed as OKF concepts with deterministic committed discovery indexes.
- Structured YAML remains authoritative where exact project state, validation contracts, or other deterministic data matter.
- The profile adds interoperability and provenance semantics without replacing World Forge's established project-specific taxonomy.

OKF compatibility is part of the repository's ordinary validation path. Structural validation does not imply that a knowledge claim is factually `verified`; trust metadata is only added when its OKF meaning is actually satisfied.

## External game integration

See [Integrating World Forge with External Games](refs/reference/external-game-integration.md) for the recommended architecture for full-surface 4X maps, orbital fleet-combat scenarios, local headless generation, Godot and Unity consumers, versioned game packs, and an optional hosted generation service.

## Roadmap

Near-term work focuses on the 2.5D geographic-scene spike, physical plausibility, graph-based generation, editing foundations, diagnostics, and export reliability. The reusable generation engine and browser tool remain public; private product shell, account, roadmap, and deployment material stay in Parchment Worlds and Portfolio.


## Optional Earth night lights and weather snapshots

World Forge owns reusable Earth surface/weather presentation assets consumed by related studio tools. **No reference downloads or weather snapshots are generated during ordinary world generation.**

### Nighttime illumination (observed NASA reference)

`tools/reference-etl/prepare_earth_night_lights.py` processes NASA Earth Observatory's global **2016 Black Marble grayscale** image (3600x1800, equirectangular) into a checksum-recorded 4096x2048 grayscale presentation map. It does not infer population or invent city positions.

The exporter accepts an existing source image (`--source <path>`) or an explicit opt-in `--download`, with `--output` defaulting to ignored `.local/reference-data/earth-night-lights`. The reference Python environment needs Pillow (listed in `tools/reference-etl/requirements.txt`). Output contains `earth-night-lights-4096.png` and a manifest with source URL, attribution, SHA256 hashes, projection and transform. The emitting video shader controls the day/night mask separately.

The Windows TWS-Video consumer provides `scripts\\prepare-earth-night-lights.bat fetch` for first-time preparation (uses the World Forge exporter and then verifies/stages its output locally). `scripts\\prepare-earth-night-lights.bat` thereafter stages without downloading.

### Cloud and weather presentation (illustrative)

In World Forge's Globe/Explore view, run the existing **Clouds and weather** enrichment. Once completed and validated, click **Export Clouds** in the weather status to download a `world-forge-<project>-clouds.zip` file with `clouds.png` and `manifest.json`. The image is created from `createWeatherPresentationTexture`, the same source and seed as World Forge's own viewer, using simulation time 0 days. Its ZIP records artifact signature, weather workflow version, source world, seed, authority=`illustrative`, map dimensions and SHA256.

The snapshot is intentionally static; it is not a live atmospheric forecast or time series. TWS-Video can verify/import this ZIP through `scripts\\import-world-forge-clouds.bat "<zip path>"`. Subsequent video work can add time-indexed snapshots based on the same source contract rather than regenerating weather independently.

Both exports are **opt-in presentation/derived artifacts** and do not change authoritative World Forge climate, geography, or generated-world save formats. For implementation and provenance see `refs/handoffs/currentHandoff.md`.

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

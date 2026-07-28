# World Builder Control Inventory

Updated: 2026-07-28

Status: initial implementation input for issue `#13`

Source components reviewed:

- `apps/desktop/src/generator/GeneratorPanel.tsx`
- `apps/desktop/src/workspace/WorldWorkspace.tsx`
- `apps/desktop/src/panels/RightPanel.tsx`
- `apps/desktop/src/main.tsx`

Disposition vocabulary:

- **Keep**: retain substantially as-is.
- **Change**: retain capability but change wording, hierarchy, or interaction.
- **Move**: retain capability in a different task area.
- **Developer**: remove from normal UI and expose only in developer mode.
- **Remove duplicate**: remove one UI path while preserving the capability elsewhere.

| Current control or area | User job | Destination | Disposition | Notes |
|---|---|---|---|---|
| Left panel Generator tab | Create or regenerate a world | Build | Change | Becomes Build mode rather than a component-owned tab. |
| Left panel My Worlds tab | Open or manage saved worlds | Project/world library | Keep, separate | This is library navigation, not generation configuration. It may remain a compact panel or shell action outside Build/Explore/Export. |
| Left panel Dev tab | Internal diagnostics and generation graph | Developer | Developer | Never show as an ordinary user mode. |
| Randomize All | Quickly create a new starting point | Build quick controls | Keep | Clarify that it changes both star and world seeds. |
| Generate | Produce a world | Build primary action | Change | Label Generate when no current world exists and Regenerate when replacing the active world. Preserve current world until replacement succeeds. |
| Star Type | Choose stellar context | Build quick controls | Keep | Keep concise description. |
| Star Seed | Reproduce or vary star generation | Build quick controls | Keep | Pair randomize icon consistently with World Seed. |
| World Type | Choose a preset | Build quick controls | Keep | Consider showing the preset's most material implications without dumping every range into the quick panel. |
| World Seed | Reproduce or vary world generation | Build quick controls | Keep | Preserve exact seed input and easy randomization. |
| Map Size | Choose generation/source quality | Build quick controls | Change | Current label risks conflating topology/source generation with preview and export size. Rename based on actual effect. |
| Profile/account pill inside Advanced Settings | Open sync/profile settings | Shell/account | Move | Account state does not belong inside generator advanced settings. |
| Source topology readout | Understand generation fidelity | Build advanced or Developer | Change | User-facing only when tied to a quality choice; raw topology language can remain in diagnostics. |
| Preview resolution | Control screen preview quality | Explore/display preferences or Build advanced | Move/change | Confirm whether this changes generated data or only rendering. Place according to actual effect. |
| PNG export resolution | Choose output size | Export | Move | Export-specific settings do not belong in Build. |
| Ocean tolerance | Control accepted output deviation | Build advanced: World shape | Keep/change | Label in plain language and show relationship to ocean target. |
| `continentCount` labeled `Regions` | Request number of continents | Build advanced: World shape | Change | Incorrect label. Must say Continent count or equivalent. |
| `continentScale` labeled `Continents` | Control continent size/cohesion | Build advanced: World shape | Change | Label must describe actual generator effect. Do not use a plural noun that implies count. |
| Ocean percentage | Shape water/land balance | Build advanced: World shape | Keep | Pair target and tolerance. |
| Island density | Shape islands and archipelagos | Build advanced: World shape | Keep | Add concise explanation of density versus continent scale. |
| Temperature | Control climate baseline | Build advanced: Climate | Keep | Use user-facing units. |
| Aridity | Control dry/wet tendency | Build advanced: Climate | Keep/change | Add plain-language endpoints or help text. |
| Axial tilt | Control seasonality | Build advanced: Climate/System | Keep | Place with orbital climate inputs. |
| Orbital eccentricity | Control orbital seasonality | Build advanced: Climate/System | Keep | Avoid exposing unnecessary precision by default. |
| Plate count | Control tectonic granularity | Build advanced: Geology | Keep | Make relationship to continent shape clear only if supported. |
| Impact frequency | Control geological history | Build advanced: Geology/history | Keep | Advanced disclosure. |
| System age | Control stellar/world history | Build advanced: System/history | Keep | Could be inherited from star preset unless overridden. |
| River density | Control hydrology abundance | Build advanced: Hydrology | Keep | Avoid mixing with display-only river toggle. |
| Size class | Control planet size | Build advanced: System | Keep | Show practical implications where available. |
| Moon count | Control major moons | Build advanced: System | Keep | Keep separate from generated moon details in Explore summary. |
| Map/globe toggle | Change world presentation | Explore primary toolbar | Keep | Primary, immediately visible. |
| Rivers toggle | Show or hide river overlay | Explore Layers menu | Move | Display-only; distinguish from river-density generation control. |
| Plate boundaries toggle | Show or hide tectonic overlay | Explore Layers menu | Move | Specialist overlay, not a primary toolbar action. |
| Hex overlay toggle | Show or hide world hexes | Explore Layers menu or primary when drilldown active | Change | Promote contextually during drilldown; otherwise keep under Layers. |
| Point diagnostics toggle | Inspect generated data | Explore inspector | Change | User-facing inspector should have a clear name; raw diagnostic fields can remain developer-only. |
| Globe shells toggle | Show atmosphere/ocean shells | Explore Layers menu | Move | Only relevant in globe view. |
| Data View / Natural View | Choose visual style | Explore primary toolbar | Keep/change | Use Presentation label; disable rules should remain understandable. |
| Map filter: Biomes, Elevation, Heightmap, Temperature, Rainfall, Wind, Current, Terrain only | Inspect world layers | Explore subject selector | Keep/change | Separate ordinary subjects from diagnostic subjects. Group related climate options if the menu remains long. |
| Map filter options prefixed `Debug:` | Internal layer debugging | Developer | Developer | Remove from ordinary Explore selector. |
| Coastline treatment | Style the normal map | Explore Layers or Presentation menu | Move | Secondary visual option. |
| Globe debug mode selector | Diagnose globe rendering | Developer | Developer | Final composite remains a normal presentation; all debug composites move to developer mode. |
| Zoom percentage pill and context menu | Zoom or fit the world | Explore primary toolbar | Keep/change | Add explicit Fit action and retain direct zoom choices. Avoid right-click-only discoverability. |
| Hex scale readout | Understand current overlay scale | Explore contextual status | Keep | Show only when relevant. |
| Geographic drilldown toggle and controls | Navigate hierarchy | Explore primary/contextual toolbar | Keep | Contextual to map mode; should not create a second toolbar stack. |
| Export icons in map toolbar | Save or export output | Export | Move | Remove from Explore toolbar. |
| Right panel World tab | Understand current world | Explore default context | Change | Becomes default when nothing more specific is selected. |
| Right panel Hex tab | Configure tile/VTT output | Export | Move | Export configuration belongs in Export mode. Hex inspection belongs in Explore and must remain distinct. |
| Right panel Diagnostics tab | Inspect internal metrics | Developer | Developer | User-relevant validation can surface contextually without exposing the full diagnostics report. |
| World name editor | Rename current world | Project/world context | Keep | Remain accessible without requiring Build mode. |
| World summary metrics | Understand generated result | Explore default context | Keep/change | Prioritize meaningful summary, collapse technical details. |
| Point inspector | Inspect selected location | Explore contextual panel | Keep | Replaces world summary while an active selection exists, with an obvious clear-selection path. |
| Drilldown inspector | Inspect selected hierarchy area | Explore contextual panel | Keep/change | Must share the same contextual inspector slot rather than stack above world summary. |
| Hex tile and VTT export options | Produce game-ready outputs | Export | Move | Keep formats and progress, reorganize by output job. |
| Save/open package actions | Persist or load World Forge data | Project/file actions | Keep/change | Keep accessible globally; do not bury opening a world in Export. |
| Feedback, support, identity, host project | Use application shell | Host shell | Keep | Do not duplicate inside World Forge modes. |
| Visible version pill | Identify running build | Shell/provenance | Change | Must distinguish host version from embedded World Forge version and expose exact commit in diagnostics. |

## Immediate design decisions supported by the inventory

1. Build, Explore, and Export are real modes with existing functionality.
2. My Worlds and file-open behavior are global project/library actions, not a fourth workspace mode.
3. Developer remains a gated workspace.
4. The map remains mounted across all modes.
5. The right panel provides one contextual surface rather than stacking drilldown, point inspection, world summary, export, and diagnostics.
6. Ordinary users should never need to parse a menu containing `Debug: Water mask`, `Debug: Sea level delta`, or topology-face rendering to change the map they are looking at.

## Open questions to settle during WP1 implementation

- Does generation `Map Size` change authoritative output resolution, topology fidelity, or both?
- Does Preview resolution affect only the rendered canvas, and can it move entirely into Explore preferences?
- Which map subjects are genuinely user-facing worldbuilding layers versus diagnostics that happen to look interesting?
- Should Save package remain a global header action while format exports move to Export mode?
- What subset of world summary metrics deserves immediate visibility versus a Details disclosure?

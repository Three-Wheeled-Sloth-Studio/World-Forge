# Geographic context menu and centered-map interaction

Status: follow-up planning note

Tracking: World Forge issue `#126`

Source: v0.3.63 geographic drilldown browser QA

## Product direction

The drilldown right-click menu is accepted as the preferred entry point for location-specific actions. It should grow into a stable, context-aware action surface rather than being replaced by scattered toolbar controls.

## Candidate actions

### Open geographic child

Retain the current hierarchy action when the clicked tile belongs to an available child region.

### Hex details

Open the authoritative tile/location inspector for the clicked world-relative hex.

The inspector should expose inherited and refined facts separately where relevant, including:

- world-relative tile ID and coordinates;
- topology-cell provenance;
- parent and child memberships;
- biome, terrain, elevation, slope, water, ice, and climate facts;
- major and minor river presentation facts;
- features and later resources, settlements, routes, and ownership;
- whether a value is authoritative, inherited, or drilldown-refined.

### Center map here

Leave hierarchy-focused framing and open a screen-sized geographic window centered on the clicked hex.

Requirements:

- preserve world-relative coordinates and seam behavior;
- choose the current scale by default, with normal zoom/scale changes afterward;
- do not fabricate a new geographic parent or change hierarchy membership;
- make the centered window suitable for inspection across adjacent region boundaries;
- allow a clear return to the previous hierarchy-framed map.

### Editing actions

When editing/versioning work is available, expose context-appropriate actions here, including terrain, biome, coastline, river, feature, resource, and later settlement/route edits.

Editing actions must follow the established pattern:

- easy to do;
- easy to undo;
- avoid blocking confirmation dialogs when rollback is cheap;
- preserve provenance and version history;
- offer local blend/reconciliation operations where an edit affects surrounding generated terrain.

## Interaction rules

- Right-click first selects the actual rendered tile, then opens actions for that exact tile.
- Menu content depends on hierarchy level, tile facts, selection state, user tier, and available editors.
- Disabled or unavailable actions should be omitted unless their absence would be confusing.
- Keyboard access must provide an equivalent menu path.
- The menu must remain bounded inside the map viewport.
- Opening the menu must not implicitly drill down or alter the map center.

## Architectural boundary

The menu consumes canonical tile and hierarchy facts. It must not become a second geography model or own generation logic.

Centered-map state is viewport state, not a new saved geographic entity. Persist it only as ordinary user workspace state if that becomes useful later.

## Suggested increments

1. Hex details using the current canonical tile-window facts.
2. Center map here with return-to-hierarchy behavior.
3. General context-action registry so game packs and editors can contribute actions without hardcoding every future item into the atlas component.
4. Editing actions after the editing/versioning prerequisites are accepted.

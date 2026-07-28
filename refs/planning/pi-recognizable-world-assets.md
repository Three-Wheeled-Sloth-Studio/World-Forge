# PI: Recognizable World Assets Producer

Updated: 2026-07-28

Status: Prepared for implementation

Lead producer issue: `World-Forge#8`

Paired consumer issue: `Parchment-Worlds#18`

## Outcome

World Forge emits a compact structured summary and lightweight thumbnail for each saved world. Parchment Worlds can then persist and synchronize enough information to recognize the world on another machine without copying the full `.wforge` project.

This PI must preserve same-version exact replay and the compact IndexedDB metadata path.

## Current baseline

World Forge already:

- stores full worlds in the `worlds` IndexedDB store;
- stores compact replay-ready inventory records in `world-metadata`;
- lists saved worlds from compact metadata only;
- emits saved-world identity and full inventory messages to the owning Parchment project;
- creates and verifies exact replay manifests;
- avoids eager full-world reads for legacy records during startup.

The current `ReplayReadySavedMapRecord` contains identity, seed, update time, and an optional replay manifest. This PI extends that compact record. It must not move presentation generation into routine inventory listing.

## Paired responsibility split

### World Forge owns

- summary derivation from authoritative generated output;
- thumbnail or preview-grid generation;
- compact metadata persistence;
- bridge message publication;
- preview generation diagnostics;
- performance protection around saved-world inventory startup.

### Parchment Worlds owns

- canonical project asset representation;
- validation and payload budgets;
- hosted continuity;
- Project Overview rendering and fallback behavior.

## Initial decision spike

Before broad implementation, generate previews for at least three representative worlds and compare two transport shapes.

### Inline WebP

Validate:

- encoded size at 320 x 160 and at one smaller fallback size;
- browser generation support;
- decode and display behavior;
- save-time cost;
- base64 overhead inside the bridge and project JSON;
- behavior when WebP encoding is unavailable.

### Indexed preview grid

Validate:

- compact indexed color or biome representation;
- deterministic serialized size;
- Parchment rendering complexity;
- accessibility and fallback behavior;
- future compatibility with changed visual palettes.

### Required decision evidence

Record:

- output dimensions;
- encoded byte count for each sample;
- save-time generation cost;
- decode or render cost;
- visual recognition result;
- browser compatibility;
- chosen renderer and transport version.

The selected representation must remain under 40 KB encoded per world and must not affect replay signatures.

## Contract direction

Use the paired Parchment planning brief as the consumer authority. World Forge should produce a versioned structured shape equivalent to:

```ts
export interface WorldAssetSummaryV1 {
  schema: 'wforge.world-summary.v1';
  sourceWorldRevision: number;
  generatorVersion: string;
  generatedAt: string;
  oceanShare: number | null;
  temperatureBand: 'frozen' | 'cold' | 'temperate' | 'warm' | 'hot' | 'unknown';
  aridityBand: 'humid' | 'balanced' | 'dry' | 'arid' | 'unknown';
  continentCount: number | null;
  dominantBiomes: Array<{
    biome: string;
    share: number;
  }>;
  moonCount: number | null;
  systemLabel: string | null;
}
```

The thumbnail transport must include:

- role;
- media type;
- width and height;
- renderer version;
- content hash;
- accessible alt text;
- encoded byte length;
- inline content or a versioned preview-grid payload.

Do not include preview content in `WorldReplayManifestV1` or the authoritative output signature.

## Summary derivation rules

### Source values

Prefer resolved or measured generated output:

- actual ocean share rather than requested ocean range;
- actual mean temperature or validated selected value;
- actual aridity or moisture summary when available;
- actual continent diagnostics where available;
- actual biome cell or area-weighted shares;
- actual moon count from the generated system.

When an older project lacks one source value, emit `null` or `unknown`. Do not reconstruct a confident fact from a merely adjacent setting.

### Banding

- implement thresholds in one pure versioned module;
- add boundary tests around every threshold;
- avoid user-facing decimal noise;
- keep raw compact values where they improve future display without adding meaningful payload weight;
- document that changing thresholds requires a summary schema or banding version change.

### Dominant biomes

- report a small fixed maximum, recommended three;
- exclude negligible shares;
- use canonical biome identifiers;
- sort by share descending with a deterministic tie-breaker;
- prefer area weighting where the world topology provides it.

### Alt text

Generate concise alt text from the same structured summary. Example:

```text
World preview with broad oceans, temperate climate, five continents, and two moons.
```

Keep it factual. Do not generate decorative prose.

## Thumbnail generation direction

### Source layers

Use the minimum authoritative layers needed for recognition:

- ocean and land distinction;
- dominant biome color or compact category;
- optional subdued elevation shading only if it remains cheap and stable.

Do not include labels, political regions, routes, or editor overlays.

### Rendering behavior

- fixed 2:1 aspect ratio;
- bounded dimensions;
- no animation;
- no dependency on the visible map viewport;
- no dependence on user zoom or selected layer;
- no mutation of world state;
- failure returns a diagnostic and no preview rather than failing save.

### Replay behavior

A replayed world may regenerate the same preview or preserve an existing preview if the authoritative signature is unchanged. Preview bytes are not evidence of replay correctness.

## World Forge implementation work packages

### 1. Pure summary module

Recommended new file:

- `apps/desktop/src/worlds/worldAssetSummary.ts`

Work:

- derive `WorldAssetSummaryV1` from `WorldProject`;
- centralize threshold and biome-share logic;
- support missing legacy fields;
- generate alt text;
- add pure fixtures and boundary tests.

### 2. Preview renderer

Recommended new file:

- `apps/desktop/src/worlds/worldThumbnail.ts`

Work:

- implement the selected transport;
- enforce dimensions and encoded size;
- produce content hash and renderer version;
- expose a failure result rather than throwing through save;
- add visual fixtures or deterministic structural tests as appropriate.

### 3. Compact storage metadata

Likely files:

- `apps/desktop/src/storage.ts`
- `apps/desktop/src/storage.test.ts`

Work:

- extend `ReplayReadySavedMapRecord` with optional summary and preview;
- write the compact metadata in the same transaction as the full record;
- bump the IndexedDB version only if required by a store or index change;
- do not rewrite legacy full-world records during upgrade;
- preserve no-preview records;
- ensure pruning removes matching full and compact records as it does today;
- add size and failure fixtures.

The existing `world-metadata` store can hold optional fields without a schema migration if no index or key change is required. Avoid a database version bump merely to annotate TypeScript.

### 4. Save workflow integration

Likely files:

- `apps/desktop/src/worlds/useWorldLibraryCommands.ts`
- `apps/desktop/src/generation/useGenerationWorkflow.ts`
- related tests

Work:

- derive summary and preview during deliberate save;
- ensure save succeeds if preview generation fails;
- publish preview-ready identity after the compact record commits;
- decide whether verified replay updates compact metadata immediately or waits for explicit save;
- keep user-visible progress honest if preview generation adds noticeable work.

Recommended first-slice behavior:

- ordinary save writes summary and preview;
- verified replay publishes a regenerated preview when it already has the full world in memory;
- rename preserves existing summary and preview without rerendering;
- load alone does not rewrite metadata until the user saves or replay completes.

### 5. Embedded bridge

Likely files:

- `apps/desktop/src/worlds/worldIdentityBridge.ts`
- `apps/desktop/src/worlds/worldIdentityBridge.test.ts`

Work:

- add optional summary and preview to identity and inventory payloads;
- use the compact record directly for inventory messages;
- keep request validation tied to the owning Parchment project;
- do not regenerate previews when answering inventory requests;
- preserve current request and response lifecycle;
- add no-preview, malformed internal record, and repeated-request tests.

### 6. Optional standalone reuse

Likely files:

- My Worlds list components and CSS

Only include this when the paired bridge and Parchment slice are already stable. Reusing the preview in My Worlds is useful, but it is not allowed to widen the PI or delay second-machine recognition.

The existing pencil alignment todo may be completed if the same rows are already being edited.

## Performance protection

Add or preserve a stress fixture with large legacy terrain payloads present.

Required assertions:

- `listWorlds()` reads `world-metadata` only;
- an inventory request does not call `loadWorld()`;
- an inventory request does not deserialize full project data;
- an inventory request does not compute replay signatures;
- an inventory request does not generate summaries or thumbnails;
- startup remains within the existing compact-metadata performance envelope.

## Failure behavior

### Preview encoder unavailable

- save the world and replay manifest;
- store the structured summary when available;
- omit the thumbnail;
- record a bounded diagnostic;
- allow a later deliberate save to retry.

### Preview exceeds size limit

- attempt the documented lower-resolution or lower-detail fallback once;
- omit the preview if still oversized;
- never silently exceed the Parchment contract limit.

### Summary derivation lacks a field

- emit `null` or `unknown`;
- continue with remaining valid fields;
- do not fail the save.

### Compact metadata write fails

- preserve current save transaction semantics;
- do not report the save complete until the required full world and identity metadata state is consistent;
- preview itself remains optional, but the compact record must not lie about what was stored.

## Automated validation matrix

| Area | Required coverage |
| --- | --- |
| Summary | representative worlds, threshold boundaries, missing legacy values, deterministic sort |
| Preview | dimensions, encoded bytes, content hash, fallback path, encoder failure |
| Storage | preview-ready record, no-preview record, upgrade compatibility, pruning, failed write |
| Bridge | identity payload, inventory payload, no-preview omission, repeated request, wrong project |
| Rename | summary and preview preserved, no rerender |
| Replay | signature unchanged, compatibility unchanged, optional preview refresh |
| Performance | no full record read, no signature hash, no renderer call during inventory startup |

## Paired browser QA

Use the same four-world fixture set as Parchment Worlds:

1. high-ocean;
2. dry continental;
3. island-heavy;
4. legacy no-preview.

Validate:

1. Save the first three and inspect encoded sizes.
2. Confirm World Forge My Worlds still loads promptly.
3. Embed World Forge and request inventory repeatedly.
4. Confirm no preview regeneration or message loop.
5. Return to Parchment Project Overview and confirm distinct cards.
6. Rename a world in either application and confirm its preview is preserved.
7. Replay a world and confirm signature verification remains authoritative.
8. Sync through Parchment and verify in a clean profile.
9. Confirm the legacy world remains visible with no preview.

## Recommended implementation order

1. Paired schema and preview transport spike.
2. Pure summary module and fixtures.
3. Pure preview renderer and size measurements.
4. Compact metadata extension.
5. Save and replay integration.
6. Bridge extension.
7. Parchment consumer integration.
8. Paired performance and browser QA.
9. Handoff closeout and exact-SHA promotion.

## Explicit exclusions

- full-resolution export;
- full-world cloud synchronization;
- object storage;
- bulk legacy migration;
- user-authored summaries;
- map labels or overlays;
- historical renderer retention;
- changes to exact replay compatibility;
- selected-node replay or graph caching.

## Agent handoff

Start from `World-Forge#8` and `Parchment-Worlds#18`.

Do not attach preview generation to `listWorlds()` or inventory request handling. Generate once during a deliberate full-world operation, persist compact output, and publish that stored output afterward.
---
type: "Research Reference"
title: "Jupiter reference appearance data"
tags:
- world-forge
- research
---
# Jupiter reference appearance data

Updated: 2026-08-04
Status: First source-backed Tier 1 atmospheric presentation path implemented on `dev`; local source preparation, exact-head validation, package-size measurement, and browser recognition QA remain pending

Related work:

- `refs/planning/body-detail-tiers-and-payload-strategy.md`
- `refs/handoffs/reference-system-etl-and-multi-body-navigation.md`
- World Forge #124
- Parchment Worlds #22

## Selected source

World Forge uses the Cassini cylindrical Jupiter map published as NASA/JPL Photojournal asset `PIA07782` for the first source-backed Tier 1 atmospheric body proof.

Source page:

- `https://science.nasa.gov/photojournal/cassinis-best-maps-of-jupiter-cylindrical-map/`

Source JPEG:

- `https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia07/pia07782/PIA07782.jpg`

Required credit:

- NASA/JPL/Space Science Institute

The source page describes a complete 360-degree by 180-degree planetocentric cylindrical map assembled from 36 Cassini images acquired on December 11 and 12, 2000. Two spectral bands were mapped to colors close to the human-eye appearance. The published map resolves features down to roughly 120 kilometers.

This is a recognizable reference appearance for Jupiter. It is not a live atmosphere, a generalized timeless climatology, or a reconstruction of every date. Major and minor cloud features are time-dependent.

## Usage boundary

NASA and JPL media guidance generally permits factual educational, scientific, and simulation use unless a specific asset says otherwise. World Forge must:

- preserve the source credit;
- avoid implying NASA, JPL, or the Space Science Institute endorses World Forge or Parchment Worlds;
- avoid using agency identifiers as product branding;
- review the source page and applicable media guidance again before release packaging.

Repository documentation carries the full source and credit record. Runtime data carries the compact imported origin and stable source-oriented asset ID required for correct behavior.

## Local preparation

The original JPEG is not committed to Git.

Preparation command:

```powershell
python -m pip install -r tools/reference-etl/requirements.txt
npm run reference:prepare-jupiter
```

Optional local source file:

```powershell
npm run reference:prepare-jupiter -- `
  --input C:\path\to\PIA07782.jpg
```

Default output:

```text
.local/reference-data/jupiter-cassini/
  PIA07782.jpg
  PIA07782-768x384.rgb565
  manifest.json
```

The preparation script:

1. downloads the official JPEG or reads the explicit local input;
2. validates an approximately 2:1 cylindrical source;
3. preserves the original JPEG locally for review;
4. resamples to 768 by 384 pixels using Lanczos filtering;
5. quantizes the prepared raster to little-endian RGB565;
6. writes source and prepared dimensions, byte lengths, SHA-256 digests, source URLs, credit, and transform metadata.

The prepared runtime raster is exactly 589,824 bytes before `.wforge` compression. This keeps the first Jupiter appearance inside the provisional Tier 1 payload budget while retaining more useful color precision than an 8-bit indexed image.

## Sol package integration

Build command:

```powershell
npm run reference:build-earth
```

When the default Jupiter bundle exists, the Earth-backed Sol builder adds:

```text
bodies/jupiter/albedo.rgb565
```

The same `.wforge` still contains one coherent Sol project. Jupiter is not emitted as a separate project.

Runtime asset contract:

- asset ID: `jupiter-cassini-pia07782-albedo`;
- role: `albedo`;
- media type: `application/vnd.world-forge.rgb565`;
- encoding: `rgb565-le`;
- prepared resolution: 768 by 384;
- detail kind: `atmospheric-presentation`;
- detail tier: `presentation`;
- origin: `imported`;
- capabilities: Globe only.

The `.wforge` exporter records the actual byte length and SHA-256 digest. Import rejects missing, truncated, or modified payloads.

## Presentation behavior

The body-aware renderer keeps Map unsupported for Jupiter. Map continues to show an explicit capability message rather than treating a cylindrical appearance image as geographic terrain.

Globe uses the existing texture-seam pass to synchronously expand the prepared RGB565 raster into the surface canvas. This avoids asynchronous browser image decoding and keeps the package asset renderer-ready.

The current first proof does not yet consume Jupiter's oblate-spheroid shape in the legacy Globe geometry builder. The imported appearance is therefore expected to render on the existing near-spherical mesh until the dedicated body-shape geometry pass is completed.

Derived presentation remains allowed for:

- lighting;
- limb haze;
- subtle cloud drift;
- differential rotation;
- camera and inspection presentation.

Those effects must remain labeled as derived presentation. They are not observations from the Cassini acquisition window.

## Acceptance checks

Before this source becomes accepted release content:

- run `npm run verify` on the exact final implementation head;
- prepare the real local bundle and record original and prepared dimensions and digests;
- build the Earth-plus-Jupiter Sol `.wforge`;
- record package-size delta and browser memory behavior;
- inspect Jupiter in System and Globe;
- verify the Great Red Spot and broad band structure remain recognizable;
- verify the longitude seam is not conspicuous;
- verify Map remains explicitly unsupported;
- export, import, locally save, reopen, and re-export the package;
- generate and import the enriched Parchment Sol starter;
- verify the source credit remains present in durable repository/release documentation;
- complete oblate geometry before calling the Jupiter presentation visually finished.

## Guardrails

- Do not describe PIA07782 as current Jupiter weather.
- Do not procedurally replace recognizable source features.
- Do not expose Map or Explorer solely because a cylindrical appearance texture exists.
- Do not commit the source or prepared binary until redistribution, release packaging, and payload measurements are explicitly accepted.
- Do not imply NASA/JPL endorsement.

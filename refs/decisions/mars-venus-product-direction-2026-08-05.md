# Mars and Venus product direction

Updated: 2026-08-05
Status: Partial product decisions accepted; Venus presentation and Mars tier remain open pending review

## Accepted clarifications

### Tier and prepared resolution are independent

A body-detail tier describes the durable data model and supported product behavior. It does not prescribe source resolution.

Mars may use the normal/default coarse prepared resolution. High-resolution Mars or Venus assets are not required for the initial Sol reference package.

The exact prepared dimensions should be selected by the ETL from the established default/coarse pipeline target, recorded in the prepared manifest, and validated for recognizability and package behavior. Do not preserve the earlier `1024 x 512` recommendation as a product requirement.

### Explorer and editors follow the complete Sol system

Explorer and editors are the next major World Forge product work after the complete Sol system is assembled and accepted.

For the current Sol increment:

- unsupported Explorer/editor states must remain honest;
- body identity and source packages must be designed so bodies can be enriched later without replacement;
- current compact tiers are not a statement that Mars, Luna, or other high-value bodies will never receive geographic/editor support.

### Real ETL is the implementation path

The first implementation must be a real source-backed ETL vertical slice that emits a durable, reusable prepared package.

The prepared package must include:

- stable body and asset identifiers;
- source attribution and redistribution metadata;
- source and prepared checksums;
- coordinate and seam conventions;
- numeric raster units, datum, type, byte order, scale, offset, ranges, and no-data behavior;
- image/numeric transforms and resampling metadata;
- a manifest consumable by the normal Sol assembler;
- assets that can be attached through the normal `.wforge` exporter and later embedded through the normal `.pworld` path.

Synthetic fixtures remain appropriate for narrow automated tests such as schema validation, checksum failure, missing assets, and package round trips. They are not a separate product milestone and must not replace the real ETL proof.

## Venus presentation explanation

The earlier recommendation that Venus use a “cloud Globe and radar/topography Map” means:

- **Default Globe:** show Venus as it appears from space in visible light—an opaque cloud-covered world. The solid surface is not visibly exposed through the cloud deck.
- **Map:** show the surface using Magellan radar imagery and topography, clearly labeled as radar-derived rather than visible-light photography.
- **Optional surface Globe mode:** a possible inspection toggle that hides the cloud presentation and wraps the radar surface around the 3D globe. This is useful, but it is not required for the scientifically honest default appearance.

This remains one Venus body with one stable identity and layered source-backed presentations. It is not two projects or two separate body records.

## Still open

1. After reviewing the tier guide, confirm whether initial Mars should be Tier 2 reference surface or Tier 3 geographic.
2. Confirm whether Venus should use the cloud-covered default Globe plus radar/topography Map behavior described above.
3. Confirm whether the optional radar-surface Globe toggle belongs in the first Venus increment or later.
4. Select the deterministic Venus cloud-composite approach after the available Akatsuki source coverage and ETL complexity are reviewed.
5. Record the actual coarse/default prepared dimensions from the first real ETL output rather than fixing them in advance.

## Implementation consequence

Replace the earlier sequence of “generic synthetic-fixture foundation, then Mars ETL” with one real Mars vertical slice:

1. Add only the generic numeric-raster and body-local surface contracts required by the real Mars sources.
2. Build the MOLA and Viking ETL into a reusable prepared Mars package.
3. Drive the generic renderer/accessor and package contracts with that real package.
4. Use small synthetic payloads only for focused negative and round-trip tests.
5. Attach Mars through the normal Sol assembly and exporter path.
6. Validate Globe, Map, active-body continuity, package round trip, Parchment import, recognizability, and package delta.

Do not create Mars-specific durable schema fields where a generic numeric-raster or body-surface contract is sufficient.

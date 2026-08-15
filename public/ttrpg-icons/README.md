# TTRPG Map Icon Sprite

Source artwork was supplied by the project owner on 2026-08-15 as the initial stippled map-overlay token set.

The normalized source tokens were combined into `ttrpg-map-icons.png`, an optimized transparent sprite used by the World Forge 2D TTRPG presentation. Runtime code addresses the artwork through semantic icon IDs rather than source filenames.

Phase 1 places only symbols supported by existing canonical `GeographicTileWindow` facts: mountains, hills, forest/taiga, rainforest, wetlands, and volcanoes. Reef artwork is reserved in the manifest but is not placed until the canonical geography contract exposes reef facts; generic coastal or aquatic water is not specific enough to assert a reef. Settlement/map-furniture artwork (castle, tower, walled village, compass rose) is also reserved for a later product increment.

The artwork is presentation-only. Symbol placement does not create, persist, or modify geography facts, hierarchy membership, tile IDs, exports, or saved-world contracts.

Do not treat these assets as separately licensed for reuse outside this project without project-owner approval.

# Current Handoff: Complete Sol Basic Globe QA

Updated: 2026-08-05

Status: Earth, Jupiter, and Mars are user-accepted. The remaining canonical Sol bodies now have a validated package-driven basic Globe path. Main Asteroid Belt and Kuiper Belt remain intentional System placeholders. The only remaining closeout gate is a quick browser pass through the regenerated **Use Sol starter** package. Explorer and editor work follows complete-Sol acceptance.

## Read first

1. `refs/testing/sol-basic-globe-acceptance.md`
2. `refs/testing/sol-reference-pipeline.md`
3. `refs/decisions/mars-venus-product-direction-2026-08-05.md`
4. `refs/planning/body-detail-tiers-and-payload-strategy.md`
5. World Forge issue #124
6. Parchment Worlds issue #22

## Accepted baseline

User-confirmed:

- Earth looks great.
- Jupiter's imported atmospheric presentation and selector hierarchy look correct.
- Mars' real Viking/MOLA Tier 2 Globe and Map look good.
- Normal Parchment starter import is responsive.

Previously accepted World Forge package:

```text
path: .local/reference-data/sol-earth-reference.wforge
package bytes: 2,428,738
SHA-256: 286794b798d9ec6d80d65056319ca0664369292b8ced3f43c46e29fd47f016e6
```

That digest predates Mars and the final basic-Globe fixture. Record a new size and digest after the accepted closeout refresh; do not reuse the earlier value.

Previously accepted Parchment package:

```text
path: apps/web/public/starter-projects/sol-system.pworld
package bytes: 3,400,610
SHA-256 displayed prefix: e41ef0d15cd9d88362f66baa…
```

The full `.pworld` digest was never captured. Do not fabricate it.

## Mars evidence

Prepared real-source assets:

```text
Albedo SHA-256: fcaed3404a0f93553c3931163c5d2c52644bdcf9b70c7276fb5af491a39c3a0b
Elevation SHA-256: f523a5504b2d1e9788530df0191f466c48db25bb5fa0b15013097c483e38b5ba
Resolution: 512 x 256
Elevation range: -7514 to 20531 m relative to the MOLA areoid
```

Mars is one canonical body in the existing Sol project. It remains Globe- and Map-capable, with Explorer/editor support deferred.

## Complete Sol basic Globe increment

Validated code head:

```text
b9997fdd7a124f16d44b10e4b6bcac5ca5a4fa94
```

Authoritative workflow:

```text
Validate World Forge
run 31035846677
```

Passed:

- complete unit and integration suite;
- production TypeScript build;
- production page-harness self-test;
- production attribution-rerank self-test;
- both browser smokes.

### Presentation paths

Richer accepted paths remain intact:

- Earth: geographic.
- Jupiter: imported atmospheric texture.
- Mars: imported raster surface.

New or newly enabled bounded Globe paths:

- Sol: emissive basic stellar presentation.
- Mercury and Venus: basic presentations.
- Saturn, Uranus, and Neptune: derived atmospheric profiles with rings.
- Luna, Phobos, Deimos.
- Io, Europa, Ganymede, Callisto.
- Enceladus, Titan.
- Titania, Oberon.
- Triton.

Belts remain population placeholders and do not expose Globe.

### Durable contract

`basic-presentation` carries generic package data for:

- sphere, oblate, or triaxial shape;
- palette;
- roughness and metalness;
- optional emissive treatment;
- optional halo;
- optional ring plane;
- approximation/source note.

The viewer does not contain body-name-specific visual rules. Future source-backed assets may replace a basic profile without changing canonical body identity.

## One-click local refresh

The repository root now includes:

```text
refresh_sol_starter.bat
```

It runs the normal enriched Sol exporter and regenerates Parchment Worlds' bundled `sol-system.pworld`. The publisher isolates World Forge's tsx environment before launching Parchment, and the Parchment **Use Sol starter** fetch bypasses browser cache.

## Remaining browser acceptance

1. Pull World Forge `dev`.
2. Run `refresh_sol_starter.bat`.
3. Refresh Parchment Worlds.
4. Delete or archive any earlier Sol test copy.
5. Import a new copy through **Use Sol starter**.
6. In System, select Sol, each remaining planet, and the selected moons.
7. Use **Zoom to globe** and confirm the selected body remains active.
8. Confirm drag, zoom, rotation, and Return to primary.
9. Confirm asteroid/Kuiper belts remain placeholders without Globe.

Specific visual checks are in `refs/testing/sol-basic-globe-acceptance.md`.

## Closeout decision

Once the browser pass is accepted:

- record the new `.wforge` byte size and SHA-256;
- record the new `.pworld` byte size and responsiveness;
- do not claim a full `.pworld` digest unless actually captured;
- close the complete-Sol basic presentation increment;
- move World Forge focus to Explorer/editors;
- keep richer source-backed Venus, Luna, Mercury, and moon upgrades as independent future enrichments rather than blockers.

## Guardrails

- One stellar system remains one project.
- Unsupported views must not silently switch to Earth.
- Basic presentation does not imply source-backed surface accuracy.
- Venus basic Globe is cloud-top presentation, not Magellan radar.
- Belts remain population records, not fake spherical worlds.
- Do not fabricate `PrimaryWorld` for non-geographic bodies.
- Keep normal `.wforge` and `.pworld` package paths authoritative.
- Do not reopen lazy loading without measured evidence.
- Earth climate calibration and selector flicker remain separate, non-blocking tracks.

# Vertical Striping Runtime Provenance and Layer Isolation

Status: in progress

## Context

The v0.3.9 visual QA result showed that the Parchment Worlds header version updated, but the embedded World Forge plate behavior and long north-south striping did not visibly change. The next investigation pass therefore starts with runtime provenance before making more generation changes.

## Provenance checkpoint added in v0.3.10

World Forge now exposes a runtime-owned source identifier separate from the Parchment Worlds shell version.

- `APP_VERSION` is `0.3.10`.
- `APP_SOURCE_COMMIT` is read from `VITE_WORLD_FORGE_COMMIT_SHA`.
- Generated projects store `sourceCommit` alongside `appVersion`.
- Diagnostics show both `Generated commit` and `Runtime commit`.
- Diagnostics warn when a loaded project's stored generation commit differs from the active runtime commit.

For local dev runs started by `Parchment-Worlds/start_pw_dev_suite.bat`, the launcher stamps the current `World-Forge` checkout commit into `VITE_WORLD_FORGE_COMMIT_SHA` for both build and dev-server startup.

For deployed tool runs, `Parchment-Worlds/.github/workflows/deploy-world-forge-tool.yml` stamps the checked-out `World-Forge` commit using `git rev-parse HEAD` after the external repository checkout. This avoids accidentally using the Parchment Worlds workflow commit as World Forge provenance.

## Next evidence required

After the next Dev deploy and fresh generation, record:

- Deployed World Forge source commit from the workflow log.
- Runtime commit shown in World Forge diagnostics.
- Generated commit shown in World Forge diagnostics after a new world is generated.
- Whether the generated and runtime commits match.
- Whether the fixed seed still reproduces long north-south striping.

Only after this checkpoint passes should the investigation move to earliest-layer isolation.

## Fixed baseline

- Star seed: `2850873`
- World seed: `1001001`
- Topology resolution: `512`
- Output: `2048 x 1024`

Also test topology resolutions `128` and `256` once provenance is confirmed.

## Layer isolation queue

Capture topology-native fields before comparing rendered output:

1. Plate ownership immediately after `plates.construct`.
2. Initial elevation before plate-boundary terrain response.
3. Boundary interaction classification and boundary normals.
4. Elevation immediately after initial tectonic uplift/subsidence.
5. Fragment IDs and ownership before authoritative transform.
6. Plate ownership immediately after authoritative fragment transform.
7. Collision spill targets and merged collision targets.
8. Fragment-history terrain response masks.
9. Elevation immediately after fragment-history terrain response.
10. Final topology elevation before equirectangular projection.


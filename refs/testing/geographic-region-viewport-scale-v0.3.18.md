---
type: "Testing Reference"
title: "Geographic Region Viewport Scale Evidence"
tags:
- world-forge
- testing
---
# Geographic Region Viewport Scale Evidence

Updated: 2026-07-27

Branch: `dev`

Version: `0.3.18`

Status: Automated candidate validation passed; browser visual QA remains required before activation.

## Scale contract

- `world-500mi`: four stable overview navigation sectors.
- `world-60mi`: first geographic region level.
- hard minimum footprint: `10 x 10` display hexes.
- preferred footprint: `20 x 20` display hexes.
- hard maximum footprint: `50 x 50` display hexes.

For the Earth-sized fixed-world overlay:

- overview cells: 1,450,
- 60-mile display cells: 101,398,
- preferred cells per region: 400,
- target first-level regions: 253.

## Behavioral corrections

- Small islands retain their landmass or archipelago surface-domain identity.
- A surface domain below the minimum display footprint receives no forced child region.
- Its cells participate in the surrounding open-ocean display partition until lower-scale decomposition.
- Region growth and sliver repair remain constrained by eligible display parents.
- Labels use a topology cell selected from the interior of the rendered region.

## Automated results

`npm run evaluate:regions` passed for all fixed worlds.

For seed `1001001`:

- raw regions: 253,
- repaired regions: 248,
- assigned cells: all,
- ordinary disconnected regions after repair: 0,
- geography-supported boundaries: 57%,
- axis concentration: 11% versus 40% for the legacy grid.

The remaining unresolved sliver diagnostics are retained as activation-gate evidence. They occur at geographic constraints that cannot be corrected by crossing eligible display-parent boundaries and require visual classification before any broader repair policy.

## Activation boundary

This evidence does not activate `world-regions-v2`. The generated project still uses the legacy grid until browser inspection confirms that the denser first-level partition reads correctly at appropriate map zoom and that remaining constrained slivers are acceptable or have targeted regressions.

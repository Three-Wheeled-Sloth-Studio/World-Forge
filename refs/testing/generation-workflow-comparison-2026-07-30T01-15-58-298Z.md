# Generation Workflow Comparison

Generated: 2026-07-30T01:15:58.298Z
Source commit: investigation-v0.3.25-followup
Workflows: core.live-world versus core.performance-foundation
Seed strategies: core.live-world=legacy-shared, core.performance-foundation=semantic-node
Seeds: 1001001, 5336649
Scenarios: earthlike-standard, archipelago-standard
Resolution: 512x256

## Runtime comparison

| Pair | Baseline total ms | Candidate total ms | Total delta | Baseline deep-time ms | Candidate deep-time ms | Deep-time delta | Same coarse signature | Same authoritative signature |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| earthlike-standard-1001001-512x256-run1 | 9166.1 | 6805.0 | -25.76% | 7287.1 | 4373.4 | -39.98% | no | no |
| earthlike-standard-5336649-512x256-run1 | 9486.1 | 5896.4 | -37.84% | 7474.0 | 4103.7 | -45.09% | no | no |
| archipelago-standard-1001001-512x256-run1 | 8594.3 | 5794.8 | -32.58% | 6823.5 | 3914.0 | -42.64% | no | no |
| archipelago-standard-5336649-512x256-run1 | 9028.4 | 5884.1 | -34.83% | 7225.3 | 3984.8 | -44.85% | no | no |

## Deep-time substage comparison

| Pair | Substage | Baseline ms | Candidate ms | Delta |
| --- | --- | ---: | ---: | ---: |
| earthlike-standard-1001001-512x256-run1 | setup-models | 33.3 | 30.2 | -9.35% |
| earthlike-standard-1001001-512x256-run1 | fragment-placement | 175.7 | 176.8 | 0.62% |
| earthlike-standard-1001001-512x256-run1 | surface-aging | 2611.5 | 667.9 | -74.42% |
| earthlike-standard-1001001-512x256-run1 | fragment-history | 113.0 | 83.7 | -25.96% |
| earthlike-standard-1001001-512x256-run1 | water-reconciliation | 135.6 | 137.7 | 1.53% |
| earthlike-standard-1001001-512x256-run1 | climate-rebuild | 2071.7 | 2164.3 | 4.47% |
| earthlike-standard-1001001-512x256-run1 | hydrology-rebuild | 1253.3 | 320.9 | -74.39% |
| earthlike-standard-1001001-512x256-run1 | biome-projection-validation | 713.0 | 633.7 | -11.12% |
| earthlike-standard-1001001-512x256-run1 | ledger-and-unattributed | 179.9 | 158.1 | -12.11% |
| earthlike-standard-5336649-512x256-run1 | setup-models | 21.2 | 28.8 | 35.86% |
| earthlike-standard-5336649-512x256-run1 | fragment-placement | 157.5 | 175.1 | 11.15% |
| earthlike-standard-5336649-512x256-run1 | surface-aging | 2513.0 | 672.1 | -73.26% |
| earthlike-standard-5336649-512x256-run1 | fragment-history | 90.7 | 59.8 | -34.07% |
| earthlike-standard-5336649-512x256-run1 | water-reconciliation | 143.7 | 114.1 | -20.59% |
| earthlike-standard-5336649-512x256-run1 | climate-rebuild | 1993.4 | 1999.7 | 0.32% |
| earthlike-standard-5336649-512x256-run1 | hydrology-rebuild | 1622.3 | 313.7 | -80.67% |
| earthlike-standard-5336649-512x256-run1 | biome-projection-validation | 765.3 | 617.3 | -19.34% |
| earthlike-standard-5336649-512x256-run1 | ledger-and-unattributed | 166.8 | 123.3 | -26.12% |
| archipelago-standard-1001001-512x256-run1 | setup-models | 20.9 | 27.2 | 29.98% |
| archipelago-standard-1001001-512x256-run1 | fragment-placement | 173.4 | 179.7 | 3.65% |
| archipelago-standard-1001001-512x256-run1 | surface-aging | 2216.7 | 594.1 | -73.20% |
| archipelago-standard-1001001-512x256-run1 | fragment-history | 70.7 | 87.4 | 23.75% |
| archipelago-standard-1001001-512x256-run1 | water-reconciliation | 118.7 | 122.1 | 2.88% |
| archipelago-standard-1001001-512x256-run1 | climate-rebuild | 1975.9 | 1929.5 | -2.35% |
| archipelago-standard-1001001-512x256-run1 | hydrology-rebuild | 1428.6 | 282.6 | -80.22% |
| archipelago-standard-1001001-512x256-run1 | biome-projection-validation | 668.8 | 553.7 | -17.21% |
| archipelago-standard-1001001-512x256-run1 | ledger-and-unattributed | 149.9 | 137.7 | -8.10% |
| archipelago-standard-5336649-512x256-run1 | setup-models | 13.9 | 27.2 | 94.90% |
| archipelago-standard-5336649-512x256-run1 | fragment-placement | 145.2 | 178.8 | 23.19% |
| archipelago-standard-5336649-512x256-run1 | surface-aging | 2438.8 | 576.6 | -76.36% |
| archipelago-standard-5336649-512x256-run1 | fragment-history | 73.5 | 68.8 | -6.38% |
| archipelago-standard-5336649-512x256-run1 | water-reconciliation | 148.8 | 114.3 | -23.21% |
| archipelago-standard-5336649-512x256-run1 | climate-rebuild | 2107.4 | 1961.7 | -6.92% |
| archipelago-standard-5336649-512x256-run1 | hydrology-rebuild | 1465.0 | 283.2 | -80.67% |
| archipelago-standard-5336649-512x256-run1 | biome-projection-validation | 698.4 | 633.2 | -9.34% |
| archipelago-standard-5336649-512x256-run1 | ledger-and-unattributed | 134.2 | 141.0 | 5.05% |

The workflows run sequentially with the same seed, scenario, and resolved configuration. Production preserves its legacy shared-stream contract; the experimental workflow uses semantic node streams, so signature differences are expected and must be evaluated through the quality scorecard.

Substage timing is captured from the existing deep-time progress contract. The ledger-and-unattributed row exposes mutation-ledger setup/finalization and any work not yet bounded by an explicit progress transition.

# Generation Workflow Comparison

Generated: 2026-07-30T00:06:48.420Z
Source commit: investigation-v0.3.24-final
Workflows: core.live-world versus core.performance-foundation
Seed strategies: core.live-world=legacy-shared, core.performance-foundation=semantic-node
Seeds: 1001001, 5336649
Scenarios: earthlike-standard, archipelago-standard
Resolution: 512x256

## Runtime comparison

| Pair | Baseline total ms | Candidate total ms | Total delta | Baseline deep-time ms | Candidate deep-time ms | Deep-time delta | Same coarse signature | Same authoritative signature |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| earthlike-standard-1001001-512x256-run1 | 9553.4 | 6821.8 | -28.59% | 7705.8 | 4457.6 | -42.15% | no | no |
| earthlike-standard-5336649-512x256-run1 | 10193.6 | 6428.5 | -36.94% | 7975.6 | 4435.8 | -44.38% | no | no |
| archipelago-standard-1001001-512x256-run1 | 9183.9 | 5451.8 | -40.64% | 7199.9 | 3890.1 | -45.97% | no | no |
| archipelago-standard-5336649-512x256-run1 | 8389.0 | 5491.6 | -34.54% | 6545.0 | 3786.2 | -42.15% | no | no |

## Deep-time substage comparison

| Pair | Substage | Baseline ms | Candidate ms | Delta |
| --- | --- | ---: | ---: | ---: |
| earthlike-standard-1001001-512x256-run1 | setup-models | 28.5 | 34.9 | 22.44% |
| earthlike-standard-1001001-512x256-run1 | fragment-placement | 101.8 | 103.3 | 1.42% |
| earthlike-standard-1001001-512x256-run1 | surface-aging | 2394.8 | 665.5 | -72.21% |
| earthlike-standard-1001001-512x256-run1 | fragment-history | 98.8 | 64.6 | -34.64% |
| earthlike-standard-1001001-512x256-run1 | water-reconciliation | 140.8 | 125.7 | -10.72% |
| earthlike-standard-1001001-512x256-run1 | climate-rebuild | 2294.8 | 2227.5 | -2.93% |
| earthlike-standard-1001001-512x256-run1 | hydrology-rebuild | 1742.5 | 357.1 | -79.51% |
| earthlike-standard-1001001-512x256-run1 | biome-projection-validation | 716.9 | 708.1 | -1.22% |
| earthlike-standard-1001001-512x256-run1 | ledger-and-unattributed | 186.8 | 171.0 | -8.46% |
| earthlike-standard-5336649-512x256-run1 | setup-models | 17.2 | 30.3 | 76.39% |
| earthlike-standard-5336649-512x256-run1 | fragment-placement | 64.7 | 104.5 | 61.53% |
| earthlike-standard-5336649-512x256-run1 | surface-aging | 2573.1 | 696.4 | -72.94% |
| earthlike-standard-5336649-512x256-run1 | fragment-history | 69.3 | 55.3 | -20.20% |
| earthlike-standard-5336649-512x256-run1 | water-reconciliation | 136.3 | 137.3 | 0.76% |
| earthlike-standard-5336649-512x256-run1 | climate-rebuild | 2472.9 | 2260.5 | -8.59% |
| earthlike-standard-5336649-512x256-run1 | hydrology-rebuild | 1737.8 | 352.3 | -79.73% |
| earthlike-standard-5336649-512x256-run1 | biome-projection-validation | 737.7 | 669.2 | -9.29% |
| earthlike-standard-5336649-512x256-run1 | ledger-and-unattributed | 166.6 | 130.0 | -22.01% |
| archipelago-standard-1001001-512x256-run1 | setup-models | 30.0 | 28.0 | -6.48% |
| archipelago-standard-1001001-512x256-run1 | fragment-placement | 94.3 | 146.6 | 55.53% |
| archipelago-standard-1001001-512x256-run1 | surface-aging | 2263.2 | 539.1 | -76.18% |
| archipelago-standard-1001001-512x256-run1 | fragment-history | 47.3 | 62.0 | 31.13% |
| archipelago-standard-1001001-512x256-run1 | water-reconciliation | 124.7 | 113.1 | -9.24% |
| archipelago-standard-1001001-512x256-run1 | climate-rebuild | 2157.6 | 2012.9 | -6.71% |
| archipelago-standard-1001001-512x256-run1 | hydrology-rebuild | 1566.9 | 295.6 | -81.14% |
| archipelago-standard-1001001-512x256-run1 | biome-projection-validation | 753.7 | 537.0 | -28.75% |
| archipelago-standard-1001001-512x256-run1 | ledger-and-unattributed | 162.3 | 155.7 | -4.08% |
| archipelago-standard-5336649-512x256-run1 | setup-models | 14.2 | 23.1 | 62.08% |
| archipelago-standard-5336649-512x256-run1 | fragment-placement | 56.8 | 102.9 | 81.08% |
| archipelago-standard-5336649-512x256-run1 | surface-aging | 2059.5 | 536.4 | -73.95% |
| archipelago-standard-5336649-512x256-run1 | fragment-history | 54.2 | 56.6 | 4.38% |
| archipelago-standard-5336649-512x256-run1 | water-reconciliation | 133.3 | 110.1 | -17.43% |
| archipelago-standard-5336649-512x256-run1 | climate-rebuild | 1960.8 | 1947.4 | -0.68% |
| archipelago-standard-5336649-512x256-run1 | hydrology-rebuild | 1471.6 | 267.6 | -81.81% |
| archipelago-standard-5336649-512x256-run1 | biome-projection-validation | 653.8 | 606.7 | -7.20% |
| archipelago-standard-5336649-512x256-run1 | ledger-and-unattributed | 140.6 | 135.3 | -3.74% |

The workflows run sequentially with the same seed, scenario, and resolved configuration. Production preserves its legacy shared-stream contract; the experimental workflow uses semantic node streams, so signature differences are expected and must be evaluated through the quality scorecard.

Substage timing is captured from the existing deep-time progress contract. The ledger-and-unattributed row exposes mutation-ledger setup/finalization and any work not yet bounded by an explicit progress transition.

---
type: "Testing Reference"
title: "Generation Workflow Comparison"
tags:
- world-forge
- testing
---
# Generation Workflow Comparison

Generated: 2026-07-29T15:35:27.153Z
Source commit: 13feff7d60f1ebcebb2a45aa763e4cefea9adaa4
Workflows: core.live-world versus core.performance-foundation
Seed strategies: core.live-world=legacy-shared, core.performance-foundation=semantic-node
Seeds: 1001001, 3141592, 8675309
Scenarios: earthlike-standard, archipelago-standard, geology-glacial-stress
Resolution: 512x256

## Runtime comparison

| Pair | Baseline total ms | Candidate total ms | Total delta | Baseline deep-time ms | Candidate deep-time ms | Deep-time delta | Same signature |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| earthlike-standard-1001001-512x256-run1 | 6148.3 | 4840.3 | -21.27% | 4550.6 | 3493.4 | -23.23% | no |
| earthlike-standard-3141592-512x256-run1 | 5720.2 | 4384.0 | -23.36% | 4301.8 | 3192.2 | -25.80% | no |
| earthlike-standard-8675309-512x256-run1 | 5973.5 | 4431.9 | -25.81% | 4729.5 | 3260.7 | -31.06% | no |
| archipelago-standard-1001001-512x256-run1 | 5363.2 | 4343.7 | -19.01% | 4162.8 | 3137.8 | -24.62% | no |
| archipelago-standard-3141592-512x256-run1 | 5273.3 | 4281.5 | -18.81% | 4084.3 | 3094.8 | -24.23% | no |
| archipelago-standard-8675309-512x256-run1 | 5274.3 | 4365.6 | -17.23% | 4097.9 | 3167.7 | -22.70% | no |
| geology-glacial-stress-1001001-512x256-run1 | 5585.6 | 4552.8 | -18.49% | 4238.6 | 3289.2 | -22.40% | no |
| geology-glacial-stress-3141592-512x256-run1 | 5619.0 | 4506.7 | -19.80% | 4317.6 | 3222.3 | -25.37% | no |
| geology-glacial-stress-8675309-512x256-run1 | 5608.0 | 4619.7 | -17.62% | 4306.1 | 3322.6 | -22.84% | no |

## Deep-time substage comparison

| Pair | Substage | Baseline ms | Candidate ms | Delta |
| --- | --- | ---: | ---: | ---: |
| earthlike-standard-1001001-512x256-run1 | setup-models | 26.7 | 20.5 | -23.24% |
| earthlike-standard-1001001-512x256-run1 | fragment-placement | 85.1 | 75.1 | -11.80% |
| earthlike-standard-1001001-512x256-run1 | surface-aging | 1433.2 | 381.8 | -73.36% |
| earthlike-standard-1001001-512x256-run1 | fragment-history | 56.9 | 54.7 | -3.83% |
| earthlike-standard-1001001-512x256-run1 | water-reconciliation | 78.3 | 85.8 | 9.61% |
| earthlike-standard-1001001-512x256-run1 | climate-rebuild | 1282.3 | 1283.3 | 0.08% |
| earthlike-standard-1001001-512x256-run1 | hydrology-rebuild | 962.6 | 946.9 | -1.63% |
| earthlike-standard-1001001-512x256-run1 | biome-projection-validation | 462.7 | 492.0 | 6.32% |
| earthlike-standard-1001001-512x256-run1 | ledger-and-unattributed | 162.8 | 153.2 | -5.91% |
| earthlike-standard-3141592-512x256-run1 | setup-models | 20.8 | 9.8 | -52.71% |
| earthlike-standard-3141592-512x256-run1 | fragment-placement | 47.4 | 39.8 | -16.09% |
| earthlike-standard-3141592-512x256-run1 | surface-aging | 1346.7 | 371.9 | -72.39% |
| earthlike-standard-3141592-512x256-run1 | fragment-history | 53.7 | 19.0 | -64.57% |
| earthlike-standard-3141592-512x256-run1 | water-reconciliation | 79.4 | 74.7 | -5.93% |
| earthlike-standard-3141592-512x256-run1 | climate-rebuild | 1256.2 | 1248.1 | -0.65% |
| earthlike-standard-3141592-512x256-run1 | hydrology-rebuild | 949.9 | 945.2 | -0.50% |
| earthlike-standard-3141592-512x256-run1 | biome-projection-validation | 411.1 | 373.1 | -9.24% |
| earthlike-standard-3141592-512x256-run1 | ledger-and-unattributed | 136.5 | 110.5 | -19.00% |
| earthlike-standard-8675309-512x256-run1 | setup-models | 14.9 | 23.3 | 56.84% |
| earthlike-standard-8675309-512x256-run1 | fragment-placement | 82.3 | 83.9 | 1.92% |
| earthlike-standard-8675309-512x256-run1 | surface-aging | 1605.6 | 354.0 | -77.95% |
| earthlike-standard-8675309-512x256-run1 | fragment-history | 57.8 | 74.6 | 29.05% |
| earthlike-standard-8675309-512x256-run1 | water-reconciliation | 84.2 | 74.5 | -11.57% |
| earthlike-standard-8675309-512x256-run1 | climate-rebuild | 1384.7 | 1261.0 | -8.93% |
| earthlike-standard-8675309-512x256-run1 | hydrology-rebuild | 942.9 | 946.0 | 0.33% |
| earthlike-standard-8675309-512x256-run1 | biome-projection-validation | 429.3 | 329.4 | -23.28% |
| earthlike-standard-8675309-512x256-run1 | ledger-and-unattributed | 127.9 | 114.0 | -10.86% |
| archipelago-standard-1001001-512x256-run1 | setup-models | 11.6 | 14.5 | 24.64% |
| archipelago-standard-1001001-512x256-run1 | fragment-placement | 46.0 | 60.0 | 30.48% |
| archipelago-standard-1001001-512x256-run1 | surface-aging | 1271.1 | 340.0 | -73.25% |
| archipelago-standard-1001001-512x256-run1 | fragment-history | 25.5 | 59.1 | 132.19% |
| archipelago-standard-1001001-512x256-run1 | water-reconciliation | 87.2 | 77.5 | -11.08% |
| archipelago-standard-1001001-512x256-run1 | climate-rebuild | 1283.4 | 1245.6 | -2.94% |
| archipelago-standard-1001001-512x256-run1 | hydrology-rebuild | 877.5 | 877.8 | 0.04% |
| archipelago-standard-1001001-512x256-run1 | biome-projection-validation | 444.9 | 338.2 | -23.98% |
| archipelago-standard-1001001-512x256-run1 | ledger-and-unattributed | 115.6 | 125.1 | 8.18% |
| archipelago-standard-3141592-512x256-run1 | setup-models | 9.3 | 9.5 | 1.79% |
| archipelago-standard-3141592-512x256-run1 | fragment-placement | 36.2 | 47.9 | 32.22% |
| archipelago-standard-3141592-512x256-run1 | surface-aging | 1219.1 | 359.7 | -70.50% |
| archipelago-standard-3141592-512x256-run1 | fragment-history | 50.7 | 33.6 | -33.83% |
| archipelago-standard-3141592-512x256-run1 | water-reconciliation | 77.4 | 78.2 | 1.08% |
| archipelago-standard-3141592-512x256-run1 | climate-rebuild | 1228.6 | 1234.8 | 0.51% |
| archipelago-standard-3141592-512x256-run1 | hydrology-rebuild | 863.2 | 872.2 | 1.05% |
| archipelago-standard-3141592-512x256-run1 | biome-projection-validation | 481.1 | 350.3 | -27.18% |
| archipelago-standard-3141592-512x256-run1 | ledger-and-unattributed | 118.7 | 108.6 | -8.54% |
| archipelago-standard-8675309-512x256-run1 | setup-models | 17.3 | 14.9 | -14.28% |
| archipelago-standard-8675309-512x256-run1 | fragment-placement | 57.2 | 61.8 | 8.02% |
| archipelago-standard-8675309-512x256-run1 | surface-aging | 1200.5 | 336.4 | -71.98% |
| archipelago-standard-8675309-512x256-run1 | fragment-history | 64.9 | 59.0 | -9.19% |
| archipelago-standard-8675309-512x256-run1 | water-reconciliation | 78.9 | 77.9 | -1.33% |
| archipelago-standard-8675309-512x256-run1 | climate-rebuild | 1225.7 | 1226.3 | 0.06% |
| archipelago-standard-8675309-512x256-run1 | hydrology-rebuild | 866.8 | 856.7 | -1.17% |
| archipelago-standard-8675309-512x256-run1 | biome-projection-validation | 464.8 | 419.6 | -9.72% |
| archipelago-standard-8675309-512x256-run1 | ledger-and-unattributed | 121.7 | 115.2 | -5.33% |
| geology-glacial-stress-1001001-512x256-run1 | setup-models | 11.6 | 17.1 | 48.09% |
| geology-glacial-stress-1001001-512x256-run1 | fragment-placement | 52.9 | 56.6 | 6.88% |
| geology-glacial-stress-1001001-512x256-run1 | surface-aging | 1432.6 | 365.5 | -74.49% |
| geology-glacial-stress-1001001-512x256-run1 | fragment-history | 34.4 | 62.1 | 80.46% |
| geology-glacial-stress-1001001-512x256-run1 | water-reconciliation | 73.4 | 72.4 | -1.34% |
| geology-glacial-stress-1001001-512x256-run1 | climate-rebuild | 1290.4 | 1293.4 | 0.24% |
| geology-glacial-stress-1001001-512x256-run1 | hydrology-rebuild | 1026.2 | 1024.4 | -0.17% |
| geology-glacial-stress-1001001-512x256-run1 | biome-projection-validation | 203.0 | 270.6 | 33.30% |
| geology-glacial-stress-1001001-512x256-run1 | ledger-and-unattributed | 114.1 | 126.9 | 11.21% |
| geology-glacial-stress-3141592-512x256-run1 | setup-models | 18.7 | 8.6 | -53.95% |
| geology-glacial-stress-3141592-512x256-run1 | fragment-placement | 59.3 | 36.5 | -38.42% |
| geology-glacial-stress-3141592-512x256-run1 | surface-aging | 1433.2 | 410.1 | -71.39% |
| geology-glacial-stress-3141592-512x256-run1 | fragment-history | 67.1 | 35.5 | -47.03% |
| geology-glacial-stress-3141592-512x256-run1 | water-reconciliation | 72.7 | 71.6 | -1.49% |
| geology-glacial-stress-3141592-512x256-run1 | climate-rebuild | 1294.0 | 1277.4 | -1.28% |
| geology-glacial-stress-3141592-512x256-run1 | hydrology-rebuild | 1004.5 | 1010.8 | 0.62% |
| geology-glacial-stress-3141592-512x256-run1 | biome-projection-validation | 249.7 | 260.5 | 4.35% |
| geology-glacial-stress-3141592-512x256-run1 | ledger-and-unattributed | 118.5 | 111.2 | -6.10% |
| geology-glacial-stress-8675309-512x256-run1 | setup-models | 17.6 | 18.3 | 4.34% |
| geology-glacial-stress-8675309-512x256-run1 | fragment-placement | 56.0 | 56.8 | 1.44% |
| geology-glacial-stress-8675309-512x256-run1 | surface-aging | 1402.1 | 367.8 | -73.76% |
| geology-glacial-stress-8675309-512x256-run1 | fragment-history | 57.7 | 62.6 | 8.46% |
| geology-glacial-stress-8675309-512x256-run1 | water-reconciliation | 77.5 | 71.7 | -7.48% |
| geology-glacial-stress-8675309-512x256-run1 | climate-rebuild | 1286.8 | 1288.2 | 0.10% |
| geology-glacial-stress-8675309-512x256-run1 | hydrology-rebuild | 1010.6 | 1019.6 | 0.90% |
| geology-glacial-stress-8675309-512x256-run1 | biome-projection-validation | 273.7 | 324.6 | 18.63% |
| geology-glacial-stress-8675309-512x256-run1 | ledger-and-unattributed | 124.2 | 112.9 | -9.10% |

The workflows run sequentially with the same seed, scenario, and resolved configuration. Production preserves its legacy shared-stream contract; the experimental workflow uses semantic node streams, so signature differences are expected and must be evaluated through the quality scorecard.

Substage timing is captured from the existing deep-time progress contract. The ledger-and-unattributed row exposes mutation-ledger setup/finalization and any work not yet bounded by an explicit progress transition.

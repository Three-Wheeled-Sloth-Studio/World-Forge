# Generation Workflow Comparison

Generated: 2026-07-29T15:49:18.534Z
Source commit: bc085dd6f118c10863694f1526c8d9a9cc9b992e
Workflows: core.performance-foundation-control versus core.performance-foundation
Seed strategies: core.performance-foundation-control=semantic-node, core.performance-foundation=semantic-node
Seeds: 1001001, 3141592, 8675309
Scenarios: earthlike-standard, archipelago-standard, geology-glacial-stress
Resolution: 512x256

## Runtime comparison

| Pair | Baseline total ms | Candidate total ms | Total delta | Baseline deep-time ms | Candidate deep-time ms | Deep-time delta | Same signature |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| earthlike-standard-1001001-512x256-run1 | 9955.6 | 7628.5 | -23.37% | 7349.9 | 5425.1 | -26.19% | no |
| earthlike-standard-3141592-512x256-run1 | 9388.5 | 7170.9 | -23.62% | 7082.2 | 5122.2 | -27.68% | no |
| earthlike-standard-8675309-512x256-run1 | 8841.0 | 7179.4 | -18.79% | 6759.5 | 5201.7 | -23.05% | no |
| archipelago-standard-1001001-512x256-run1 | 8217.3 | 6967.2 | -15.21% | 6222.0 | 4957.0 | -20.33% | no |
| archipelago-standard-3141592-512x256-run1 | 8438.3 | 6850.3 | -18.82% | 6458.1 | 4859.2 | -24.76% | no |
| archipelago-standard-8675309-512x256-run1 | 8611.9 | 7040.9 | -18.24% | 6584.3 | 5035.5 | -23.52% | no |
| geology-glacial-stress-1001001-512x256-run1 | 8783.6 | 7379.2 | -15.99% | 6644.1 | 5227.9 | -21.32% | no |
| geology-glacial-stress-3141592-512x256-run1 | 9151.5 | 7288.2 | -20.36% | 6992.5 | 5111.7 | -26.90% | no |
| geology-glacial-stress-8675309-512x256-run1 | 9139.8 | 7420.3 | -18.81% | 6934.1 | 5250.1 | -24.29% | no |

## Deep-time substage comparison

| Pair | Substage | Baseline ms | Candidate ms | Delta |
| --- | --- | ---: | ---: | ---: |
| earthlike-standard-1001001-512x256-run1 | setup-models | 36.0 | 34.5 | -4.38% |
| earthlike-standard-1001001-512x256-run1 | fragment-placement | 136.5 | 112.6 | -17.48% |
| earthlike-standard-1001001-512x256-run1 | surface-aging | 2388.1 | 608.3 | -74.53% |
| earthlike-standard-1001001-512x256-run1 | fragment-history | 77.4 | 74.5 | -3.75% |
| earthlike-standard-1001001-512x256-run1 | water-reconciliation | 137.1 | 132.6 | -3.25% |
| earthlike-standard-1001001-512x256-run1 | climate-rebuild | 1996.8 | 1962.2 | -1.73% |
| earthlike-standard-1001001-512x256-run1 | hydrology-rebuild | 1527.3 | 1514.5 | -0.84% |
| earthlike-standard-1001001-512x256-run1 | biome-projection-validation | 825.5 | 768.2 | -6.94% |
| earthlike-standard-1001001-512x256-run1 | ledger-and-unattributed | 225.2 | 217.7 | -3.35% |
| earthlike-standard-3141592-512x256-run1 | setup-models | 34.2 | 21.5 | -37.23% |
| earthlike-standard-3141592-512x256-run1 | fragment-placement | 103.7 | 94.7 | -8.74% |
| earthlike-standard-3141592-512x256-run1 | surface-aging | 2333.2 | 632.8 | -72.88% |
| earthlike-standard-3141592-512x256-run1 | fragment-history | 77.4 | 29.7 | -61.59% |
| earthlike-standard-3141592-512x256-run1 | water-reconciliation | 134.8 | 125.3 | -7.03% |
| earthlike-standard-3141592-512x256-run1 | climate-rebuild | 1959.3 | 1978.1 | 0.96% |
| earthlike-standard-3141592-512x256-run1 | hydrology-rebuild | 1520.5 | 1536.8 | 1.07% |
| earthlike-standard-3141592-512x256-run1 | biome-projection-validation | 719.6 | 537.7 | -25.28% |
| earthlike-standard-3141592-512x256-run1 | ledger-and-unattributed | 199.7 | 165.5 | -17.09% |
| earthlike-standard-8675309-512x256-run1 | setup-models | 25.7 | 32.6 | 26.67% |
| earthlike-standard-8675309-512x256-run1 | fragment-placement | 159.4 | 105.1 | -34.07% |
| earthlike-standard-8675309-512x256-run1 | surface-aging | 2171.7 | 583.1 | -73.15% |
| earthlike-standard-8675309-512x256-run1 | fragment-history | 72.4 | 106.3 | 46.75% |
| earthlike-standard-8675309-512x256-run1 | water-reconciliation | 125.2 | 123.9 | -1.05% |
| earthlike-standard-8675309-512x256-run1 | climate-rebuild | 1963.7 | 1976.9 | 0.67% |
| earthlike-standard-8675309-512x256-run1 | hydrology-rebuild | 1506.4 | 1527.2 | 1.38% |
| earthlike-standard-8675309-512x256-run1 | biome-projection-validation | 548.9 | 573.7 | 4.52% |
| earthlike-standard-8675309-512x256-run1 | ledger-and-unattributed | 186.0 | 172.9 | -7.07% |
| archipelago-standard-1001001-512x256-run1 | setup-models | 31.4 | 26.5 | -15.72% |
| archipelago-standard-1001001-512x256-run1 | fragment-placement | 143.1 | 149.1 | 4.19% |
| archipelago-standard-1001001-512x256-run1 | surface-aging | 1985.5 | 542.5 | -72.68% |
| archipelago-standard-1001001-512x256-run1 | fragment-history | 36.4 | 98.3 | 170.18% |
| archipelago-standard-1001001-512x256-run1 | water-reconciliation | 127.3 | 129.0 | 1.32% |
| archipelago-standard-1001001-512x256-run1 | climate-rebuild | 1910.7 | 1932.2 | 1.12% |
| archipelago-standard-1001001-512x256-run1 | hydrology-rebuild | 1387.7 | 1391.8 | 0.29% |
| archipelago-standard-1001001-512x256-run1 | biome-projection-validation | 435.2 | 503.5 | 15.70% |
| archipelago-standard-1001001-512x256-run1 | ledger-and-unattributed | 164.6 | 184.1 | 11.86% |
| archipelago-standard-3141592-512x256-run1 | setup-models | 17.4 | 22.3 | 27.62% |
| archipelago-standard-3141592-512x256-run1 | fragment-placement | 79.1 | 99.3 | 25.46% |
| archipelago-standard-3141592-512x256-run1 | surface-aging | 2123.6 | 575.1 | -72.92% |
| archipelago-standard-3141592-512x256-run1 | fragment-history | 77.9 | 32.8 | -57.93% |
| archipelago-standard-3141592-512x256-run1 | water-reconciliation | 132.2 | 129.9 | -1.69% |
| archipelago-standard-3141592-512x256-run1 | climate-rebuild | 1906.2 | 1898.6 | -0.40% |
| archipelago-standard-3141592-512x256-run1 | hydrology-rebuild | 1351.4 | 1384.8 | 2.48% |
| archipelago-standard-3141592-512x256-run1 | biome-projection-validation | 602.4 | 555.2 | -7.83% |
| archipelago-standard-3141592-512x256-run1 | ledger-and-unattributed | 168.0 | 161.2 | -4.07% |
| archipelago-standard-8675309-512x256-run1 | setup-models | 31.2 | 26.5 | -14.82% |
| archipelago-standard-8675309-512x256-run1 | fragment-placement | 152.0 | 109.0 | -28.28% |
| archipelago-standard-8675309-512x256-run1 | surface-aging | 2023.4 | 551.2 | -72.76% |
| archipelago-standard-8675309-512x256-run1 | fragment-history | 92.3 | 112.2 | 21.59% |
| archipelago-standard-8675309-512x256-run1 | water-reconciliation | 138.3 | 127.1 | -8.06% |
| archipelago-standard-8675309-512x256-run1 | climate-rebuild | 1929.8 | 1908.6 | -1.10% |
| archipelago-standard-8675309-512x256-run1 | hydrology-rebuild | 1368.0 | 1375.0 | 0.51% |
| archipelago-standard-8675309-512x256-run1 | biome-projection-validation | 651.7 | 650.3 | -0.22% |
| archipelago-standard-8675309-512x256-run1 | ledger-and-unattributed | 197.6 | 175.5 | -11.21% |
| geology-glacial-stress-1001001-512x256-run1 | setup-models | 23.9 | 29.6 | 23.85% |
| geology-glacial-stress-1001001-512x256-run1 | fragment-placement | 138.0 | 136.6 | -1.02% |
| geology-glacial-stress-1001001-512x256-run1 | surface-aging | 2228.6 | 617.7 | -72.28% |
| geology-glacial-stress-1001001-512x256-run1 | fragment-history | 48.1 | 88.5 | 83.98% |
| geology-glacial-stress-1001001-512x256-run1 | water-reconciliation | 120.9 | 120.7 | -0.11% |
| geology-glacial-stress-1001001-512x256-run1 | climate-rebuild | 1979.3 | 2009.6 | 1.53% |
| geology-glacial-stress-1001001-512x256-run1 | hydrology-rebuild | 1584.4 | 1617.1 | 2.06% |
| geology-glacial-stress-1001001-512x256-run1 | biome-projection-validation | 350.8 | 419.1 | 19.46% |
| geology-glacial-stress-1001001-512x256-run1 | ledger-and-unattributed | 170.1 | 189.0 | 11.09% |
| geology-glacial-stress-3141592-512x256-run1 | setup-models | 16.0 | 20.2 | 26.22% |
| geology-glacial-stress-3141592-512x256-run1 | fragment-placement | 63.9 | 92.2 | 44.39% |
| geology-glacial-stress-3141592-512x256-run1 | surface-aging | 2474.8 | 660.1 | -73.33% |
| geology-glacial-stress-3141592-512x256-run1 | fragment-history | 84.1 | 44.4 | -47.20% |
| geology-glacial-stress-3141592-512x256-run1 | water-reconciliation | 119.9 | 126.6 | 5.58% |
| geology-glacial-stress-3141592-512x256-run1 | climate-rebuild | 1974.1 | 1968.7 | -0.27% |
| geology-glacial-stress-3141592-512x256-run1 | hydrology-rebuild | 1606.5 | 1615.4 | 0.55% |
| geology-glacial-stress-3141592-512x256-run1 | biome-projection-validation | 481.5 | 412.6 | -14.31% |
| geology-glacial-stress-3141592-512x256-run1 | ledger-and-unattributed | 171.8 | 171.6 | -0.09% |
| geology-glacial-stress-8675309-512x256-run1 | setup-models | 29.3 | 28.7 | -1.81% |
| geology-glacial-stress-8675309-512x256-run1 | fragment-placement | 144.5 | 103.1 | -28.67% |
| geology-glacial-stress-8675309-512x256-run1 | surface-aging | 2255.1 | 634.9 | -71.85% |
| geology-glacial-stress-8675309-512x256-run1 | fragment-history | 98.8 | 84.9 | -14.06% |
| geology-glacial-stress-8675309-512x256-run1 | water-reconciliation | 124.7 | 120.3 | -3.51% |
| geology-glacial-stress-8675309-512x256-run1 | climate-rebuild | 1978.4 | 1984.2 | 0.29% |
| geology-glacial-stress-8675309-512x256-run1 | hydrology-rebuild | 1613.2 | 1632.7 | 1.21% |
| geology-glacial-stress-8675309-512x256-run1 | biome-projection-validation | 495.9 | 493.2 | -0.54% |
| geology-glacial-stress-8675309-512x256-run1 | ledger-and-unattributed | 194.4 | 168.1 | -13.49% |

The workflows run sequentially with the same seed, scenario, and resolved configuration. Production preserves its legacy shared-stream contract; the experimental workflow uses semantic node streams, so signature differences are expected and must be evaluated through the quality scorecard.

Substage timing is captured from the existing deep-time progress contract. The ledger-and-unattributed row exposes mutation-ledger setup/finalization and any work not yet bounded by an explicit progress transition.

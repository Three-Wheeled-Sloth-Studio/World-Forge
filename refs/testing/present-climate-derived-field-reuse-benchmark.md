---
type: "Testing Reference"
title: "Generation Workflow Comparison"
tags:
- world-forge
- testing
---
# Generation Workflow Comparison

Generated: 2026-07-29T16:16:13.128Z
Source commit: 49734abb7351c61171da9f6cca54c39afe59011a
Workflows: core.performance-foundation-aging-control versus core.performance-foundation
Seed strategies: core.performance-foundation-aging-control=semantic-node, core.performance-foundation=semantic-node
Seeds: 1001001, 3141592, 8675309
Scenarios: earthlike-standard, archipelago-standard, geology-glacial-stress
Resolution: 512x256

## Runtime comparison

| Pair | Baseline total ms | Candidate total ms | Total delta | Baseline deep-time ms | Candidate deep-time ms | Deep-time delta | Same coarse signature | Same authoritative signature |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| earthlike-standard-1001001-512x256-run1 | 8058.8 | 7014.4 | -12.96% | 5497.1 | 4852.8 | -11.72% | yes | yes |
| earthlike-standard-3141592-512x256-run1 | 7506.3 | 6340.4 | -15.53% | 5291.0 | 4379.3 | -17.23% | yes | yes |
| earthlike-standard-8675309-512x256-run1 | 7133.0 | 6368.1 | -10.72% | 5123.2 | 4442.2 | -13.29% | yes | yes |
| archipelago-standard-1001001-512x256-run1 | 6635.9 | 6277.1 | -5.41% | 4698.6 | 4337.9 | -7.68% | yes | yes |
| archipelago-standard-3141592-512x256-run1 | 6759.4 | 6130.5 | -9.30% | 4839.8 | 4218.1 | -12.85% | yes | yes |
| archipelago-standard-8675309-512x256-run1 | 6870.5 | 6395.8 | -6.91% | 4915.9 | 4462.3 | -9.23% | yes | yes |
| geology-glacial-stress-1001001-512x256-run1 | 6966.3 | 6598.4 | -5.28% | 4907.9 | 4484.9 | -8.62% | yes | yes |
| geology-glacial-stress-3141592-512x256-run1 | 7165.3 | 6493.7 | -9.37% | 5083.3 | 4392.5 | -13.59% | yes | yes |
| geology-glacial-stress-8675309-512x256-run1 | 7249.9 | 6671.6 | -7.98% | 5121.0 | 4569.2 | -10.78% | yes | yes |

## Deep-time substage comparison

| Pair | Substage | Baseline ms | Candidate ms | Delta |
| --- | --- | ---: | ---: | ---: |
| earthlike-standard-1001001-512x256-run1 | setup-models | 35.1 | 30.1 | -14.34% |
| earthlike-standard-1001001-512x256-run1 | fragment-placement | 140.5 | 125.4 | -10.74% |
| earthlike-standard-1001001-512x256-run1 | surface-aging | 610.9 | 581.5 | -4.80% |
| earthlike-standard-1001001-512x256-run1 | fragment-history | 74.0 | 83.5 | 12.75% |
| earthlike-standard-1001001-512x256-run1 | water-reconciliation | 129.5 | 127.8 | -1.27% |
| earthlike-standard-1001001-512x256-run1 | climate-rebuild | 1962.6 | 1927.9 | -1.77% |
| earthlike-standard-1001001-512x256-run1 | hydrology-rebuild | 1480.4 | 943.4 | -36.27% |
| earthlike-standard-1001001-512x256-run1 | biome-projection-validation | 824.0 | 814.5 | -1.15% |
| earthlike-standard-1001001-512x256-run1 | ledger-and-unattributed | 240.1 | 218.7 | -8.92% |
| earthlike-standard-3141592-512x256-run1 | setup-models | 35.1 | 16.1 | -54.10% |
| earthlike-standard-3141592-512x256-run1 | fragment-placement | 89.1 | 69.6 | -21.86% |
| earthlike-standard-3141592-512x256-run1 | surface-aging | 598.9 | 593.0 | -0.99% |
| earthlike-standard-3141592-512x256-run1 | fragment-history | 90.1 | 28.4 | -68.49% |
| earthlike-standard-3141592-512x256-run1 | water-reconciliation | 130.8 | 127.2 | -2.71% |
| earthlike-standard-3141592-512x256-run1 | climate-rebuild | 1912.6 | 1889.6 | -1.20% |
| earthlike-standard-3141592-512x256-run1 | hydrology-rebuild | 1483.7 | 913.9 | -38.40% |
| earthlike-standard-3141592-512x256-run1 | biome-projection-validation | 747.2 | 583.9 | -21.86% |
| earthlike-standard-3141592-512x256-run1 | ledger-and-unattributed | 203.5 | 157.5 | -22.59% |
| earthlike-standard-8675309-512x256-run1 | setup-models | 24.2 | 29.1 | 20.31% |
| earthlike-standard-8675309-512x256-run1 | fragment-placement | 145.6 | 144.0 | -1.16% |
| earthlike-standard-8675309-512x256-run1 | surface-aging | 569.9 | 552.4 | -3.07% |
| earthlike-standard-8675309-512x256-run1 | fragment-history | 74.4 | 100.3 | 34.91% |
| earthlike-standard-8675309-512x256-run1 | water-reconciliation | 119.8 | 119.5 | -0.27% |
| earthlike-standard-8675309-512x256-run1 | climate-rebuild | 1904.3 | 1892.5 | -0.62% |
| earthlike-standard-8675309-512x256-run1 | hydrology-rebuild | 1512.7 | 902.0 | -40.37% |
| earthlike-standard-8675309-512x256-run1 | biome-projection-validation | 592.2 | 511.7 | -13.60% |
| earthlike-standard-8675309-512x256-run1 | ledger-and-unattributed | 180.1 | 190.8 | 5.90% |
| archipelago-standard-1001001-512x256-run1 | setup-models | 29.7 | 24.6 | -17.11% |
| archipelago-standard-1001001-512x256-run1 | fragment-placement | 104.8 | 145.4 | 38.81% |
| archipelago-standard-1001001-512x256-run1 | surface-aging | 530.1 | 517.6 | -2.35% |
| archipelago-standard-1001001-512x256-run1 | fragment-history | 32.8 | 90.2 | 174.90% |
| archipelago-standard-1001001-512x256-run1 | water-reconciliation | 122.3 | 129.4 | 5.81% |
| archipelago-standard-1001001-512x256-run1 | climate-rebuild | 1898.1 | 1847.0 | -2.69% |
| archipelago-standard-1001001-512x256-run1 | hydrology-rebuild | 1342.5 | 899.4 | -33.00% |
| archipelago-standard-1001001-512x256-run1 | biome-projection-validation | 482.7 | 501.9 | 3.99% |
| archipelago-standard-1001001-512x256-run1 | ledger-and-unattributed | 155.7 | 182.4 | 17.14% |
| archipelago-standard-3141592-512x256-run1 | setup-models | 16.6 | 21.4 | 29.03% |
| archipelago-standard-3141592-512x256-run1 | fragment-placement | 94.2 | 72.9 | -22.58% |
| archipelago-standard-3141592-512x256-run1 | surface-aging | 561.6 | 547.0 | -2.60% |
| archipelago-standard-3141592-512x256-run1 | fragment-history | 97.0 | 30.0 | -69.09% |
| archipelago-standard-3141592-512x256-run1 | water-reconciliation | 122.3 | 124.2 | 1.56% |
| archipelago-standard-3141592-512x256-run1 | climate-rebuild | 1838.7 | 1833.6 | -0.28% |
| archipelago-standard-3141592-512x256-run1 | hydrology-rebuild | 1299.6 | 875.5 | -32.64% |
| archipelago-standard-3141592-512x256-run1 | biome-projection-validation | 620.5 | 553.1 | -10.87% |
| archipelago-standard-3141592-512x256-run1 | ledger-and-unattributed | 189.3 | 160.5 | -15.21% |
| archipelago-standard-8675309-512x256-run1 | setup-models | 30.4 | 30.3 | -0.26% |
| archipelago-standard-8675309-512x256-run1 | fragment-placement | 108.0 | 108.2 | 0.11% |
| archipelago-standard-8675309-512x256-run1 | surface-aging | 548.6 | 531.2 | -3.18% |
| archipelago-standard-8675309-512x256-run1 | fragment-history | 86.5 | 109.8 | 26.98% |
| archipelago-standard-8675309-512x256-run1 | water-reconciliation | 124.7 | 122.8 | -1.50% |
| archipelago-standard-8675309-512x256-run1 | climate-rebuild | 1835.2 | 1838.6 | 0.18% |
| archipelago-standard-8675309-512x256-run1 | hydrology-rebuild | 1349.9 | 881.8 | -34.68% |
| archipelago-standard-8675309-512x256-run1 | biome-projection-validation | 651.3 | 649.6 | -0.27% |
| archipelago-standard-8675309-512x256-run1 | ledger-and-unattributed | 181.3 | 190.1 | 4.83% |
| geology-glacial-stress-1001001-512x256-run1 | setup-models | 29.1 | 29.7 | 2.23% |
| geology-glacial-stress-1001001-512x256-run1 | fragment-placement | 99.5 | 99.4 | -0.20% |
| geology-glacial-stress-1001001-512x256-run1 | surface-aging | 590.8 | 587.1 | -0.64% |
| geology-glacial-stress-1001001-512x256-run1 | fragment-history | 38.0 | 88.8 | 133.88% |
| geology-glacial-stress-1001001-512x256-run1 | water-reconciliation | 116.5 | 119.5 | 2.64% |
| geology-glacial-stress-1001001-512x256-run1 | climate-rebuild | 1933.5 | 1959.1 | 1.32% |
| geology-glacial-stress-1001001-512x256-run1 | hydrology-rebuild | 1587.1 | 994.5 | -37.34% |
| geology-glacial-stress-1001001-512x256-run1 | biome-projection-validation | 349.6 | 414.6 | 18.59% |
| geology-glacial-stress-1001001-512x256-run1 | ledger-and-unattributed | 163.8 | 192.2 | 17.32% |
| geology-glacial-stress-3141592-512x256-run1 | setup-models | 20.8 | 14.0 | -32.47% |
| geology-glacial-stress-3141592-512x256-run1 | fragment-placement | 63.3 | 65.7 | 3.80% |
| geology-glacial-stress-3141592-512x256-run1 | surface-aging | 629.6 | 641.5 | 1.89% |
| geology-glacial-stress-3141592-512x256-run1 | fragment-history | 92.8 | 30.9 | -66.72% |
| geology-glacial-stress-3141592-512x256-run1 | water-reconciliation | 117.9 | 120.1 | 1.83% |
| geology-glacial-stress-3141592-512x256-run1 | climate-rebuild | 1924.2 | 1985.6 | 3.19% |
| geology-glacial-stress-3141592-512x256-run1 | hydrology-rebuild | 1565.1 | 963.8 | -38.42% |
| geology-glacial-stress-3141592-512x256-run1 | biome-projection-validation | 476.0 | 411.5 | -13.55% |
| geology-glacial-stress-3141592-512x256-run1 | ledger-and-unattributed | 193.6 | 159.3 | -17.70% |
| geology-glacial-stress-8675309-512x256-run1 | setup-models | 23.7 | 28.4 | 19.83% |
| geology-glacial-stress-8675309-512x256-run1 | fragment-placement | 100.1 | 103.5 | 3.44% |
| geology-glacial-stress-8675309-512x256-run1 | surface-aging | 597.7 | 627.7 | 5.02% |
| geology-glacial-stress-8675309-512x256-run1 | fragment-history | 96.2 | 116.2 | 20.74% |
| geology-glacial-stress-8675309-512x256-run1 | water-reconciliation | 116.3 | 117.7 | 1.19% |
| geology-glacial-stress-8675309-512x256-run1 | climate-rebuild | 1929.2 | 1934.0 | 0.25% |
| geology-glacial-stress-8675309-512x256-run1 | hydrology-rebuild | 1560.1 | 961.1 | -38.40% |
| geology-glacial-stress-8675309-512x256-run1 | biome-projection-validation | 506.1 | 492.7 | -2.64% |
| geology-glacial-stress-8675309-512x256-run1 | ledger-and-unattributed | 191.7 | 188.0 | -1.94% |

The workflows run sequentially with the same seed, scenario, and resolved configuration. Production preserves its legacy shared-stream contract; the experimental workflow uses semantic node streams, so signature differences are expected and must be evaluated through the quality scorecard.

Substage timing is captured from the existing deep-time progress contract. The ledger-and-unattributed row exposes mutation-ledger setup/finalization and any work not yet bounded by an explicit progress transition.

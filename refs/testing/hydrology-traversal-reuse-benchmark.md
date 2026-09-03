---
type: "Testing Reference"
title: "Exact Hydrology Traversal Optimization Benchmark"
tags:
- world-forge
- testing
---
# Exact Hydrology Traversal Optimization Benchmark

Generated: 2026-07-29T18:47:42.547Z
Source commit: 0703e596ea16fbe20efdce1eb5babf4ea3fa9298
Workflows: core.performance-foundation-derived-control versus core.performance-foundation
Seed strategies: core.performance-foundation-derived-control=semantic-node, core.performance-foundation=semantic-node
Seeds: 1001001, 3141592, 8675309
Scenarios: earthlike-standard, archipelago-standard, geology-glacial-stress
Resolution: 512x256

## Gate summary

- PASS: all 9 coarse output signatures are identical.
- PASS: all 9 normalized authoritative signatures are identical. This signature includes the complete primary world, including river topology paths, source and mouth indices, and termini.
- PASS: all 9 metric objects are identical, including ocean percentage, ice percentage, river count, ocean tolerance, and river-path validation.
- PASS: hydrology rebuild improved in all 9 pairs by 62.68% to 73.07%, with a 68.50% mean and 68.09% median reduction.
- PASS: deep-time runtime improved by 15.57% mean and 15.08% median.
- PASS: total generation runtime improved in all 9 pairs by 0.65% to 19.30%, with a 10.28% mean and 10.36% median reduction.

The baseline is `core.performance-foundation-derived-control`: bounded aging and present-climate derived-field reuse with legacy hydrology ordering and route tracing. The candidate is `core.performance-foundation@0.4.0`: the same workflow with stable radix ordering and cached downstream suffix reuse.

## Runtime comparison

| Pair | Baseline total ms | Candidate total ms | Total delta | Baseline deep-time ms | Candidate deep-time ms | Deep-time delta | Same coarse signature | Same authoritative signature |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| earthlike-standard-1001001-512x256-run1 | 7142.4 | 7095.9 | -0.65% | 5310.8 | 4710.3 | -11.31% | yes | yes |
| earthlike-standard-3141592-512x256-run1 | 7787.2 | 6284.3 | -19.30% | 5510.1 | 4228.1 | -23.27% | yes | yes |
| earthlike-standard-8675309-512x256-run1 | 7205.4 | 6458.7 | -10.36% | 5135.3 | 4373.3 | -14.84% | yes | yes |
| archipelago-standard-1001001-512x256-run1 | 7028.9 | 6351.5 | -9.64% | 4942.7 | 4281.7 | -13.37% | yes | yes |
| archipelago-standard-3141592-512x256-run1 | 7157.5 | 6350.8 | -11.27% | 5119.4 | 4266.3 | -16.66% | yes | yes |
| archipelago-standard-8675309-512x256-run1 | 7261.2 | 6404.6 | -11.80% | 5160.8 | 4326.7 | -16.16% | yes | yes |
| geology-glacial-stress-1001001-512x256-run1 | 7311.3 | 6640.8 | -9.17% | 5160.2 | 4382.1 | -15.08% | yes | yes |
| geology-glacial-stress-3141592-512x256-run1 | 7407.4 | 6610.3 | -10.76% | 5253.3 | 4385.6 | -16.52% | yes | yes |
| geology-glacial-stress-8675309-512x256-run1 | 7369.1 | 6663.5 | -9.57% | 5115.4 | 4455.6 | -12.90% | yes | yes |

## Deep-time substage comparison

| Pair | Substage | Baseline ms | Candidate ms | Delta |
| --- | --- | ---: | ---: | ---: |
| earthlike-standard-1001001-512x256-run1 | setup-models | 30.6 | 34.5 | 13.01% |
| earthlike-standard-1001001-512x256-run1 | fragment-placement | 96.8 | 105.1 | 8.66% |
| earthlike-standard-1001001-512x256-run1 | surface-aging | 523.2 | 704.6 | 34.67% |
| earthlike-standard-1001001-512x256-run1 | fragment-history | 53.8 | 82.0 | 52.40% |
| earthlike-standard-1001001-512x256-run1 | water-reconciliation | 119.6 | 147.5 | 23.37% |
| earthlike-standard-1001001-512x256-run1 | climate-rebuild | 2350.0 | 2289.4 | -2.58% |
| earthlike-standard-1001001-512x256-run1 | hydrology-rebuild | 1181.3 | 378.4 | -67.97% |
| earthlike-standard-1001001-512x256-run1 | biome-projection-validation | 760.2 | 790.6 | 3.99% |
| earthlike-standard-1001001-512x256-run1 | ledger-and-unattributed | 195.3 | 178.2 | -8.76% |
| earthlike-standard-3141592-512x256-run1 | setup-models | 21.3 | 25.1 | 18.09% |
| earthlike-standard-3141592-512x256-run1 | fragment-placement | 95.3 | 78.0 | -18.14% |
| earthlike-standard-3141592-512x256-run1 | surface-aging | 715.5 | 696.4 | -2.67% |
| earthlike-standard-3141592-512x256-run1 | fragment-history | 54.0 | 36.3 | -32.86% |
| earthlike-standard-3141592-512x256-run1 | water-reconciliation | 137.8 | 130.6 | -5.24% |
| earthlike-standard-3141592-512x256-run1 | climate-rebuild | 2482.3 | 2130.6 | -14.17% |
| earthlike-standard-3141592-512x256-run1 | hydrology-rebuild | 1201.9 | 359.2 | -70.11% |
| earthlike-standard-3141592-512x256-run1 | biome-projection-validation | 626.8 | 628.3 | 0.23% |
| earthlike-standard-3141592-512x256-run1 | ledger-and-unattributed | 175.1 | 143.6 | -18.00% |
| earthlike-standard-8675309-512x256-run1 | setup-models | 32.8 | 28.7 | -12.37% |
| earthlike-standard-8675309-512x256-run1 | fragment-placement | 115.0 | 122.2 | 6.29% |
| earthlike-standard-8675309-512x256-run1 | surface-aging | 683.5 | 676.7 | -1.00% |
| earthlike-standard-8675309-512x256-run1 | fragment-history | 33.7 | 64.2 | 90.37% |
| earthlike-standard-8675309-512x256-run1 | water-reconciliation | 133.0 | 139.0 | 4.51% |
| earthlike-standard-8675309-512x256-run1 | climate-rebuild | 2282.5 | 2306.4 | 1.05% |
| earthlike-standard-8675309-512x256-run1 | hydrology-rebuild | 1150.9 | 367.3 | -68.08% |
| earthlike-standard-8675309-512x256-run1 | biome-projection-validation | 548.4 | 508.4 | -7.30% |
| earthlike-standard-8675309-512x256-run1 | ledger-and-unattributed | 155.4 | 160.4 | 3.17% |
| archipelago-standard-1001001-512x256-run1 | setup-models | 27.7 | 31.6 | 13.86% |
| archipelago-standard-1001001-512x256-run1 | fragment-placement | 131.7 | 139.8 | 6.12% |
| archipelago-standard-1001001-512x256-run1 | surface-aging | 607.3 | 651.7 | 7.32% |
| archipelago-standard-1001001-512x256-run1 | fragment-history | 63.6 | 38.2 | -39.82% |
| archipelago-standard-1001001-512x256-run1 | water-reconciliation | 125.4 | 143.7 | 14.63% |
| archipelago-standard-1001001-512x256-run1 | climate-rebuild | 2233.6 | 2255.0 | 0.96% |
| archipelago-standard-1001001-512x256-run1 | hydrology-rebuild | 1131.6 | 307.0 | -72.87% |
| archipelago-standard-1001001-512x256-run1 | biome-projection-validation | 483.3 | 525.9 | 8.83% |
| archipelago-standard-1001001-512x256-run1 | ledger-and-unattributed | 138.6 | 188.7 | 36.19% |
| archipelago-standard-3141592-512x256-run1 | setup-models | 20.8 | 22.5 | 7.82% |
| archipelago-standard-3141592-512x256-run1 | fragment-placement | 88.2 | 99.6 | 12.84% |
| archipelago-standard-3141592-512x256-run1 | surface-aging | 659.2 | 652.3 | -1.05% |
| archipelago-standard-3141592-512x256-run1 | fragment-history | 37.0 | 54.7 | 47.82% |
| archipelago-standard-3141592-512x256-run1 | water-reconciliation | 139.4 | 141.7 | 1.66% |
| archipelago-standard-3141592-512x256-run1 | climate-rebuild | 2203.0 | 2205.0 | 0.09% |
| archipelago-standard-3141592-512x256-run1 | hydrology-rebuild | 1114.7 | 314.5 | -71.78% |
| archipelago-standard-3141592-512x256-run1 | biome-projection-validation | 699.5 | 630.7 | -9.84% |
| archipelago-standard-3141592-512x256-run1 | ledger-and-unattributed | 157.6 | 145.4 | -7.72% |
| archipelago-standard-8675309-512x256-run1 | setup-models | 33.7 | 26.1 | -22.54% |
| archipelago-standard-8675309-512x256-run1 | fragment-placement | 128.4 | 135.3 | 5.41% |
| archipelago-standard-8675309-512x256-run1 | surface-aging | 641.8 | 630.8 | -1.71% |
| archipelago-standard-8675309-512x256-run1 | fragment-history | 58.9 | 38.9 | -34.00% |
| archipelago-standard-8675309-512x256-run1 | water-reconciliation | 149.0 | 128.3 | -13.89% |
| archipelago-standard-8675309-512x256-run1 | climate-rebuild | 2201.9 | 2246.1 | 2.00% |
| archipelago-standard-8675309-512x256-run1 | hydrology-rebuild | 1112.4 | 299.5 | -73.07% |
| archipelago-standard-8675309-512x256-run1 | biome-projection-validation | 665.7 | 687.7 | 3.29% |
| archipelago-standard-8675309-512x256-run1 | ledger-and-unattributed | 169.0 | 134.0 | -20.69% |
| geology-glacial-stress-1001001-512x256-run1 | setup-models | 29.4 | 27.5 | -6.38% |
| geology-glacial-stress-1001001-512x256-run1 | fragment-placement | 138.3 | 118.9 | -14.07% |
| geology-glacial-stress-1001001-512x256-run1 | surface-aging | 711.1 | 728.1 | 2.39% |
| geology-glacial-stress-1001001-512x256-run1 | fragment-history | 47.8 | 50.7 | 6.07% |
| geology-glacial-stress-1001001-512x256-run1 | water-reconciliation | 131.4 | 142.3 | 8.27% |
| geology-glacial-stress-1001001-512x256-run1 | climate-rebuild | 2319.6 | 2350.6 | 1.34% |
| geology-glacial-stress-1001001-512x256-run1 | hydrology-rebuild | 1228.9 | 433.4 | -64.73% |
| geology-glacial-stress-1001001-512x256-run1 | biome-projection-validation | 408.9 | 396.4 | -3.05% |
| geology-glacial-stress-1001001-512x256-run1 | ledger-and-unattributed | 144.8 | 134.3 | -7.27% |
| geology-glacial-stress-3141592-512x256-run1 | setup-models | 20.0 | 17.6 | -12.01% |
| geology-glacial-stress-3141592-512x256-run1 | fragment-placement | 72.0 | 70.8 | -1.68% |
| geology-glacial-stress-3141592-512x256-run1 | surface-aging | 781.2 | 758.5 | -2.90% |
| geology-glacial-stress-3141592-512x256-run1 | fragment-history | 53.5 | 45.9 | -14.29% |
| geology-glacial-stress-3141592-512x256-run1 | water-reconciliation | 129.9 | 133.2 | 2.58% |
| geology-glacial-stress-3141592-512x256-run1 | climate-rebuild | 2356.5 | 2332.2 | -1.03% |
| geology-glacial-stress-3141592-512x256-run1 | hydrology-rebuild | 1231.2 | 428.3 | -65.21% |
| geology-glacial-stress-3141592-512x256-run1 | biome-projection-validation | 471.1 | 457.9 | -2.79% |
| geology-glacial-stress-3141592-512x256-run1 | ledger-and-unattributed | 138.0 | 141.1 | 2.25% |
| geology-glacial-stress-8675309-512x256-run1 | setup-models | 32.4 | 27.8 | -14.39% |
| geology-glacial-stress-8675309-512x256-run1 | fragment-placement | 109.6 | 115.1 | 4.96% |
| geology-glacial-stress-8675309-512x256-run1 | surface-aging | 712.3 | 731.6 | 2.71% |
| geology-glacial-stress-8675309-512x256-run1 | fragment-history | 41.5 | 50.9 | 22.59% |
| geology-glacial-stress-8675309-512x256-run1 | water-reconciliation | 119.8 | 132.5 | 10.54% |
| geology-glacial-stress-8675309-512x256-run1 | climate-rebuild | 2223.2 | 2316.7 | 4.21% |
| geology-glacial-stress-8675309-512x256-run1 | hydrology-rebuild | 1226.5 | 457.7 | -62.68% |
| geology-glacial-stress-8675309-512x256-run1 | biome-projection-validation | 501.7 | 482.3 | -3.87% |
| geology-glacial-stress-8675309-512x256-run1 | ledger-and-unattributed | 148.2 | 141.1 | -4.83% |

The workflows run sequentially with the same seed, scenario, resolved configuration, bounded aging schedule, derived-climate reuse, and semantic node streams. Exact output equality is required because hydrology traversal is the only intended behavioral difference.

Substage timing is captured from the existing deep-time progress contract. The ledger-and-unattributed row exposes mutation-ledger setup/finalization and any work not yet bounded by an explicit progress transition.

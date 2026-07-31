import { beforeEach, describe, expect, it } from 'vitest';
import { buildCubedSphereTopology, cubedSphereCellForLonLat } from '@world-forge/shared';
import {
  clearEquirectangularTopologyLookupCache,
  equirectangularTopologyLookup
} from './equirectangularTopologyLookup';

describe('equirectangular topology lookup', () => {
  beforeEach(() => clearEquirectangularTopologyLookupCache());

  it('matches the prior per-pixel spherical lookup exactly', () => {
    const topology = buildCubedSphereTopology(16);
    const width = 96;
    const height = 48;
    const lookup = equirectangularTopologyLookup(topology, width, height);
    const expected = new Uint32Array(width * height);
    for (let y = 0; y < height; y += 1) {
      const latitude = Math.PI / 2 - ((y + 0.5) / height) * Math.PI;
      for (let x = 0; x < width; x += 1) {
        const longitude = ((x + 0.5) / width) * Math.PI * 2 - Math.PI;
        expected[y * width + x] = cubedSphereCellForLonLat(topology, longitude, latitude);
      }
    }
    expect(Array.from(lookup)).toEqual(Array.from(expected));
  });

  it('reuses matching lookups while retaining the main and preview sizes', () => {
    const topology = buildCubedSphereTopology(16);
    const main = equirectangularTopologyLookup(topology, 128, 64);
    const preview = equirectangularTopologyLookup(topology, 64, 32);
    expect(equirectangularTopologyLookup(topology, 128, 64)).toBe(main);
    expect(equirectangularTopologyLookup(topology, 64, 32)).toBe(preview);
  });
});

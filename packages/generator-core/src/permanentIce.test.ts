import { describe, expect, it } from 'vitest';
import { buildCubedSphereTopology } from '@world-forge/shared';
import { classifyPermanentIce } from './permanentIce';

function classify(options: {
  temperatureAtLatitude: (polarLatitude: number) => number;
  water?: boolean;
  axialTiltDeg?: number;
  elevation?: (polarLatitude: number) => number;
}) {
  const topology = buildCubedSphereTopology(12);
  const ice = new Uint8Array(topology.cellCount);
  const elevation = new Float32Array(topology.cellCount);
  const water = new Uint8Array(topology.cellCount);
  const temperature = new Float32Array(topology.cellCount);
  const wetness = new Float32Array(topology.cellCount);
  wetness.fill(0.6);
  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    const polarLatitude = Math.abs(topology.latitudes[cell]) / (Math.PI / 2);
    elevation[cell] = options.elevation?.(polarLatitude) ?? 0.2;
    temperature[cell] = options.temperatureAtLatitude(polarLatitude);
    water[cell] = options.water ? 1 : 0;
  }
  const result = classifyPermanentIce({
    ice,
    elevation,
    water,
    temperature,
    wetness,
    topology,
    seaLevel: 0,
    axialTiltDeg: options.axialTiltDeg ?? 23.4,
    orbitalEccentricity: 0.017
  });
  return { topology, ice, result };
}

function polarShare(topology: ReturnType<typeof buildCubedSphereTopology>, ice: Uint8Array, minimum = 0.78) {
  let cells = 0;
  let frozen = 0;
  for (let cell = 0; cell < ice.length; cell += 1) {
    const latitude = Math.abs(topology.latitudes[cell]) / (Math.PI / 2);
    if (latitude < minimum) continue;
    cells += 1;
    frozen += ice[cell];
  }
  return frozen / Math.max(1, cells);
}

describe('classifyPermanentIce', () => {
  it('forms coherent high-latitude land ice from a broad Earthlike temperature gradient', () => {
    const { topology, ice } = classify({
      temperatureAtLatitude: (latitude) => 22 - latitude * 42
    });
    expect(polarShare(topology, ice)).toBeGreaterThan(0.7);
  });

  it('allows warm climates to suppress permanent polar ice', () => {
    const { result } = classify({
      temperatureAtLatitude: (latitude) => 34 - latitude * 28
    });
    expect(result.iceCells).toBe(0);
  });

  it('expands permanent ice in cold climates and includes sea ice', () => {
    const temperate = classify({
      water: true,
      temperatureAtLatitude: (latitude) => 20 - latitude * 38
    });
    const cold = classify({
      water: true,
      temperatureAtLatitude: (latitude) => 5 - latitude * 38
    });
    expect(cold.result.waterIceCells).toBeGreaterThan(temperate.result.waterIceCells);
    expect(polarShare(cold.topology, cold.ice, 0.65)).toBeGreaterThan(0.75);
  });

  it('permits cold high-elevation glaciers outside the polar zone', () => {
    const { topology, ice } = classify({
      temperatureAtLatitude: (latitude) => latitude < 0.3 ? -3 : 28 - latitude * 20,
      elevation: (latitude) => latitude < 0.3 ? 0.6 : 0.15
    });
    let equatorialIce = 0;
    for (let cell = 0; cell < ice.length; cell += 1) {
      if (Math.abs(topology.latitudes[cell]) / (Math.PI / 2) < 0.3) equatorialIce += ice[cell];
    }
    expect(equatorialIce).toBeGreaterThan(0);
  });
});

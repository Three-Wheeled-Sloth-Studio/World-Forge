import { clamp, type CubedSphereTopology } from '@world-forge/shared';

export type PermanentIceClassificationInput = {
  ice: Uint8Array;
  elevation: Float32Array;
  water: Uint8Array;
  temperature: Float32Array;
  wetness: Float32Array;
  topology: CubedSphereTopology;
  seaLevel: number;
  axialTiltDeg: number;
  orbitalEccentricity: number;
};

export type PermanentIceClassification = {
  iceCells: number;
  landIceCells: number;
  waterIceCells: number;
};

export function classifyPermanentIce(input: PermanentIceClassificationInput): PermanentIceClassification {
  const {
    ice,
    elevation,
    water,
    temperature,
    wetness,
    topology,
    seaLevel,
    axialTiltDeg,
    orbitalEccentricity
  } = input;
  const warmSeasonTemperature = new Float32Array(ice.length);
  const tiltFactor = clamp(axialTiltDeg / 23.4, 0.12, 2.8);
  ice.fill(0);

  for (let cell = 0; cell < ice.length; cell += 1) {
    const polarLatitude = Math.abs(topology.latitudes[cell]) / (Math.PI / 2);
    const altitude = Math.max(0, elevation[cell] - seaLevel);
    const seasonalAmplitude = polarLatitude * (3.2 + tiltFactor * 3.8)
      + orbitalEccentricity * 4;
    const edgeVariation = sphericalEdgeVariation(topology, cell) * 1.35;
    const warmSeason = temperature[cell] + seasonalAmplitude + edgeVariation;
    warmSeasonTemperature[cell] = warmSeason;

    const polarIce = polarLatitude >= 0.62
      && warmSeason < (water[cell] ? -0.8 : 0.45);
    const alpineIce = !water[cell]
      && altitude >= 0.34
      && warmSeason < 0.8
      && wetness[cell] >= 0.1;
    if (polarIce || alpineIce) ice[cell] = 1;
  }

  smoothPermanentIce(ice, warmSeasonTemperature, water, topology);
  let iceCells = 0;
  let landIceCells = 0;
  let waterIceCells = 0;
  for (let cell = 0; cell < ice.length; cell += 1) {
    if (!ice[cell]) continue;
    iceCells += 1;
    if (water[cell]) waterIceCells += 1;
    else landIceCells += 1;
  }
  return { iceCells, landIceCells, waterIceCells };
}

function sphericalEdgeVariation(topology: CubedSphereTopology, cell: number): number {
  const x = topology.positions[cell * 3];
  const y = topology.positions[cell * 3 + 1];
  const z = topology.positions[cell * 3 + 2];
  const broad = Math.sin(x * 4.3 + y * 2.7 - z * 3.1)
    * Math.cos(x * 1.9 - y * 3.7 + z * 2.3);
  const detail = Math.sin(x * 9.1 - y * 7.3 + z * 8.7) * 0.35;
  return clamp(broad * 0.72 + detail, -1, 1);
}

function smoothPermanentIce(
  ice: Uint8Array,
  warmSeasonTemperature: Float32Array,
  water: Uint8Array,
  topology: CubedSphereTopology
): void {
  for (let pass = 0; pass < 2; pass += 1) {
    const source = new Uint8Array(ice);
    for (let cell = 0; cell < ice.length; cell += 1) {
      let frozenNeighbors = 0;
      let sameSurfaceNeighbors = 0;
      for (let direction = 0; direction < 4; direction += 1) {
        const neighbor = topology.neighbors[cell * 4 + direction];
        if (neighbor < 0 || water[neighbor] !== water[cell]) continue;
        sameSurfaceNeighbors += 1;
        frozenNeighbors += source[neighbor];
      }
      if (source[cell] && frozenNeighbors === 0 && warmSeasonTemperature[cell] > -2.5) {
        ice[cell] = 0;
      } else if (
        !source[cell]
        && sameSurfaceNeighbors >= 2
        && frozenNeighbors >= 2
        && warmSeasonTemperature[cell] < (water[cell] ? -0.25 : 1)
      ) {
        ice[cell] = 1;
      }
    }
  }
}

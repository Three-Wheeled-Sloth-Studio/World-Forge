import { topologyResolutionForOutput, type Resolution } from '@world-forge/shared';

export const MAINTAINED_EARTH_REFERENCE_RESOLUTION: Readonly<Resolution> = Object.freeze({
  width: 4096,
  height: 2048,
});

export const MAINTAINED_EARTH_REFERENCE_TOPOLOGY_RESOLUTION = topologyResolutionForOutput(
  MAINTAINED_EARTH_REFERENCE_RESOLUTION,
);

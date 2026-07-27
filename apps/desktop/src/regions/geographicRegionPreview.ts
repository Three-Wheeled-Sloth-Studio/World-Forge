import {
  buildCubedSphereTopology,
  cubedSphereCellForLonLat,
  type CubedSphereTopology,
  type WorldProject,
} from '@world-forge/shared';
import type {
  GeographicRegionEvaluation,
  GeographicWorldRegionSetV2,
  GeographicWorldRegionV2,
} from '@world-forge/shared/geographicRegions';
import { buildGeographicMacroRegions } from '@world-forge/generator-core/geographicRegionPartition';
import { repairGeographicRegionSlivers } from '@world-forge/generator-core/geographicRegionRepair';
import {
  evaluateGeographicRegionSet,
  evaluateLegacyLatLonGridBaseline,
} from '@world-forge/generator-core/geographicRegionEvaluation';

const UNASSIGNED_REGION = 0xffff;

export type GeographicRegionPreview = {
  projectKey: string;
  topology: CubedSphereTopology;
  rawCandidate: GeographicWorldRegionSetV2;
  regionSet: GeographicWorldRegionSetV2;
  evaluation: GeographicRegionEvaluation;
  baseline: GeographicRegionEvaluation;
};

export function geographicRegionPreviewProjectKey(project: WorldProject): string {
  return [
    project.projectId,
    project.generatorVersion,
    project.seed,
    project.primaryWorld.topology.resolution,
    project.updatedAt,
  ].join(':');
}

export function buildGeographicRegionPreview(project: WorldProject): GeographicRegionPreview {
  const overlay = project.primaryWorld.hexOverlay;
  if (!overlay) throw new Error('This world does not include the required world hex overlay.');
  const topology = buildCubedSphereTopology(project.primaryWorld.topology.resolution);
  const rawCandidate = buildGeographicMacroRegions(
    topology,
    project.primaryWorld.topologyLayers,
    overlay,
    { seed: project.seed },
  );
  const regionSet = repairGeographicRegionSlivers(
    topology,
    project.primaryWorld.topologyLayers,
    overlay,
    rawCandidate,
  );
  return {
    projectKey: geographicRegionPreviewProjectKey(project),
    topology,
    rawCandidate,
    regionSet,
    evaluation: evaluateGeographicRegionSet(
      topology,
      project.primaryWorld.topologyLayers,
      regionSet,
    ),
    baseline: evaluateLegacyLatLonGridBaseline(
      topology,
      project.primaryWorld.topologyLayers,
    ),
  };
}

export function geographicRegionAtMapPoint(
  project: WorldProject,
  preview: GeographicRegionPreview,
  mapX: number,
  mapY: number,
): GeographicWorldRegionV2 | null {
  const width = Math.max(1, project.primaryWorld.mapModel.resolution.width);
  const height = Math.max(1, project.primaryWorld.mapModel.resolution.height);
  const longitude = ((mapX + 0.5) / width) * Math.PI * 2 - Math.PI;
  const latitude = Math.PI / 2 - ((mapY + 0.5) / height) * Math.PI;
  const topologyCell = cubedSphereCellForLonLat(preview.topology, longitude, latitude);
  const regionIndex = preview.regionSet.membership.regionIndexByTopologyCell[topologyCell];
  if (regionIndex === UNASSIGNED_REGION) return null;
  return preview.regionSet.regions[regionIndex] ?? null;
}

export function buildGeographicRegionRaster(
  preview: GeographicRegionPreview,
  width: number,
  height: number,
): Uint16Array {
  const cleanWidth = Math.max(1, Math.round(width));
  const cleanHeight = Math.max(1, Math.round(height));
  const raster = new Uint16Array(cleanWidth * cleanHeight);
  raster.fill(UNASSIGNED_REGION);
  const membership = preview.regionSet.membership.regionIndexByTopologyCell;

  for (let y = 0; y < cleanHeight; y += 1) {
    const latitude = Math.PI / 2 - ((y + 0.5) / cleanHeight) * Math.PI;
    for (let x = 0; x < cleanWidth; x += 1) {
      const longitude = ((x + 0.5) / cleanWidth) * Math.PI * 2 - Math.PI;
      const topologyCell = cubedSphereCellForLonLat(preview.topology, longitude, latitude);
      raster[y * cleanWidth + x] = membership[topologyCell] ?? UNASSIGNED_REGION;
    }
  }

  return raster;
}

export function geographicRegionPreviewSummary(preview: GeographicRegionPreview) {
  const repaired = preview.evaluation;
  const baseline = preview.baseline;
  return {
    regionCount: repaired.regionCount,
    mergeCount: preview.regionSet.repair?.mergeCount ?? 0,
    sliverRegionCount: repaired.sliverRegionCount,
    disconnectedRegionCount: repaired.disconnectedRegionCount,
    geographyBoundaryShare: repaired.geographicBoundaryShare,
    baselineGeographyBoundaryShare: baseline.geographicBoundaryShare,
    axisBoundaryConcentration: repaired.axisBoundaryConcentration,
    baselineAxisBoundaryConcentration: baseline.axisBoundaryConcentration,
    geographyBoundaryShareDelta: repaired.geographicBoundaryShare - baseline.geographicBoundaryShare,
    axisBoundaryConcentrationDelta: repaired.axisBoundaryConcentration - baseline.axisBoundaryConcentration,
  };
}

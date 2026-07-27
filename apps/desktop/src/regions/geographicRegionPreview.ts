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
  rawEvaluation: GeographicRegionEvaluation;
  evaluation: GeographicRegionEvaluation;
  baseline: GeographicRegionEvaluation;
};

export type GeographicRegionPreviewMode = 'raw' | 'repaired';

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
    rawEvaluation: evaluateGeographicRegionSet(
      topology,
      project.primaryWorld.topologyLayers,
      rawCandidate,
    ),
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
  mode: GeographicRegionPreviewMode = 'repaired',
): GeographicWorldRegionV2 | null {
  const width = Math.max(1, project.primaryWorld.mapModel.resolution.width);
  const height = Math.max(1, project.primaryWorld.mapModel.resolution.height);
  const longitude = ((mapX + 0.5) / width) * Math.PI * 2 - Math.PI;
  const latitude = Math.PI / 2 - ((mapY + 0.5) / height) * Math.PI;
  const topologyCell = cubedSphereCellForLonLat(preview.topology, longitude, latitude);
  const regionSet = geographicRegionSetForMode(preview, mode);
  const regionIndex = regionSet.membership.regionIndexByTopologyCell[topologyCell];
  if (regionIndex === UNASSIGNED_REGION) return null;
  return regionSet.regions[regionIndex] ?? null;
}

export function buildGeographicRegionRaster(
  preview: GeographicRegionPreview,
  width: number,
  height: number,
  mode: GeographicRegionPreviewMode = 'repaired',
): Uint16Array {
  const cleanWidth = Math.max(1, Math.round(width));
  const cleanHeight = Math.max(1, Math.round(height));
  const raster = new Uint16Array(cleanWidth * cleanHeight);
  raster.fill(UNASSIGNED_REGION);
  const membership = geographicRegionSetForMode(preview, mode).membership.regionIndexByTopologyCell;

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

export function geographicRegionPreviewSummary(
  preview: GeographicRegionPreview,
  mode: GeographicRegionPreviewMode = 'repaired',
) {
  const candidate = mode === 'raw' ? preview.rawEvaluation : preview.evaluation;
  const baseline = preview.baseline;
  return {
    mode,
    regionCount: candidate.regionCount,
    targetRegionCount: preview.rawCandidate.scaleBudget.targetRegionCount,
    preferredViewportHexColumns: preview.rawCandidate.scaleBudget.preferredViewportHexColumns,
    preferredViewportHexRows: preview.rawCandidate.scaleBudget.preferredViewportHexRows,
    mergeCount: mode === 'repaired' ? preview.regionSet.repair?.mergeCount ?? 0 : 0,
    sliverRegionCount: candidate.sliverRegionCount,
    disconnectedRegionCount: candidate.disconnectedRegionCount,
    geographyBoundaryShare: candidate.geographicBoundaryShare,
    baselineGeographyBoundaryShare: baseline.geographicBoundaryShare,
    axisBoundaryConcentration: candidate.axisBoundaryConcentration,
    baselineAxisBoundaryConcentration: baseline.axisBoundaryConcentration,
    geographyBoundaryShareDelta: candidate.geographicBoundaryShare - baseline.geographicBoundaryShare,
    axisBoundaryConcentrationDelta: candidate.axisBoundaryConcentration - baseline.axisBoundaryConcentration,
  };
}

export function geographicRegionSetForMode(
  preview: GeographicRegionPreview,
  mode: GeographicRegionPreviewMode,
): GeographicWorldRegionSetV2 {
  return mode === 'raw' ? preview.rawCandidate : preview.regionSet;
}

import {
  buildCubedSphereTopology,
  type WorldProject,
} from '@world-forge/shared';
import type {
  GeographicAdaptiveHexScale,
  GeographicHierarchyLevel,
  GeographicHierarchyPartition,
  GeographicMacroArea,
  GeographicMacroAreaSet,
} from '@world-forge/shared/geographicHierarchy';
import type { GeographicWorldRegionV2 } from '@world-forge/shared/geographicRegions';
import {
  deriveAdaptiveGeographicScale,
  membershipMaskFromRegionIndex,
} from '@world-forge/generator-core/geographicAdaptiveScale';
import {
  buildGeographicChildPartition,
  childMembershipMask,
} from '@world-forge/generator-core/geographicChildPartition';
import {
  buildGeographicMacroAreas,
  macroAreaMembershipMask,
} from '@world-forge/generator-core/geographicMacroAreas';
import {
  buildGeographicRegionPreview,
  geographicRegionPreviewProjectKey,
  type GeographicRegionPreview,
} from './geographicRegionPreview';

export type GeographicHierarchyPreview = {
  projectKey: string;
  regionPreview: GeographicRegionPreview;
  macroAreaSet: GeographicMacroAreaSet;
};

export type GeographicHierarchyOpenMap = {
  id: string;
  label: string;
  level: GeographicHierarchyLevel;
  parentId: string | null;
  membership: Uint8Array;
  scale: GeographicAdaptiveHexScale;
  extent: ReturnType<typeof deriveAdaptiveGeographicScale>['extent'];
  macroArea?: GeographicMacroArea;
  region?: GeographicWorldRegionV2;
  partition?: GeographicHierarchyPartition;
};

export function buildGeographicHierarchyPreview(project: WorldProject): GeographicHierarchyPreview {
  const regionPreview = buildGeographicRegionPreview(project);
  const macroAreaSet = buildGeographicMacroAreas(regionPreview.topology, regionPreview.regionSet);
  return {
    projectKey: `${geographicRegionPreviewProjectKey(project)}:${macroAreaSet.signature}`,
    regionPreview,
    macroAreaSet,
  };
}

export function openMacroAreaMap(
  project: WorldProject,
  preview: GeographicHierarchyPreview,
  macroAreaId: string,
): GeographicHierarchyOpenMap {
  const macroArea = preview.macroAreaSet.macroAreas.find((entry) => entry.id === macroAreaId);
  if (!macroArea) throw new Error(`Unknown macro area ${macroAreaId}.`);
  const membership = macroAreaMembershipMask(preview.macroAreaSet, macroAreaId);
  const scaleResult = deriveAdaptiveGeographicScale(
    preview.regionPreview.topology,
    planetCircumferenceMiles(project),
    membership,
  );
  return {
    id: macroArea.id,
    label: macroArea.label,
    level: 'macro-area',
    parentId: null,
    membership,
    scale: scaleResult.scale,
    extent: scaleResult.extent,
    macroArea,
  };
}

export function openRegionMap(
  project: WorldProject,
  preview: GeographicHierarchyPreview,
  regionId: string,
): GeographicHierarchyOpenMap {
  const regionIndex = preview.regionPreview.regionSet.regions.findIndex((entry) => entry.id === regionId);
  if (regionIndex < 0) throw new Error(`Unknown region ${regionId}.`);
  const region = preview.regionPreview.regionSet.regions[regionIndex];
  const membership = membershipMaskFromRegionIndex(
    preview.regionPreview.regionSet.membership.regionIndexByTopologyCell,
    regionIndex,
  );
  const scaleResult = deriveAdaptiveGeographicScale(
    preview.regionPreview.topology,
    planetCircumferenceMiles(project),
    membership,
  );
  return {
    id: region.id,
    label: region.label,
    level: 'region',
    parentId: macroAreaForRegion(preview, region)?.id ?? null,
    membership,
    scale: scaleResult.scale,
    extent: scaleResult.extent,
    region,
  };
}

export function buildHierarchyChildren(
  project: WorldProject,
  preview: GeographicHierarchyPreview,
  parentMap: GeographicHierarchyOpenMap,
): GeographicHierarchyPartition {
  const parentLevel = parentMap.level;
  if (parentLevel !== 'region' && parentLevel !== 'subregion' && parentLevel !== 'local') {
    throw new Error(`${parentMap.label} cannot generate hierarchy children.`);
  }
  const childLevel = nextHierarchyLevel(parentLevel);
  if (!childLevel) throw new Error(`${parentMap.label} has no deeper geographic level.`);
  return buildGeographicChildPartition(
    preview.regionPreview.topology,
    project.primaryWorld.topologyLayers,
    {
      projectId: project.projectId,
      worldSeed: project.seed,
      parentId: parentMap.id,
      parentLevel,
      childLevel,
      parentMembership: parentMap.membership,
      parentScale: parentMap.scale,
      planetCircumferenceMiles: planetCircumferenceMiles(project),
    },
  );
}

export function openHierarchyChildMap(
  project: WorldProject,
  preview: GeographicHierarchyPreview,
  partition: GeographicHierarchyPartition,
  childId: string,
): GeographicHierarchyOpenMap {
  const child = partition.children.find((entry) => entry.id === childId);
  if (!child) throw new Error(`Unknown ${partition.hierarchyLevel} ${childId}.`);
  const membership = childMembershipMask(partition, childId);
  const scaleResult = deriveAdaptiveGeographicScale(
    preview.regionPreview.topology,
    planetCircumferenceMiles(project),
    membership,
    { maximumScaleMiles: partition.scale.nominalHexWidthMiles },
  );
  return {
    id: child.id,
    label: child.label,
    level: child.level,
    parentId: partition.parentId,
    membership,
    scale: scaleResult.scale,
    extent: scaleResult.extent,
    partition,
  };
}

export function buildSubregions(
  project: WorldProject,
  preview: GeographicHierarchyPreview,
  regionMap: GeographicHierarchyOpenMap,
): GeographicHierarchyPartition {
  if (regionMap.level !== 'region') throw new Error('Subregions can only be generated for an open region.');
  return buildHierarchyChildren(project, preview, regionMap);
}

export function openSubregionMap(
  project: WorldProject,
  preview: GeographicHierarchyPreview,
  partition: GeographicHierarchyPartition,
  childId: string,
): GeographicHierarchyOpenMap {
  return openHierarchyChildMap(project, preview, partition, childId);
}

export function nextHierarchyLevel(level: GeographicHierarchyLevel): GeographicHierarchyPartition['hierarchyLevel'] | null {
  if (level === 'region') return 'subregion';
  if (level === 'subregion') return 'local';
  if (level === 'local') return 'detail';
  return null;
}

export function regionsForMacroArea(
  preview: GeographicHierarchyPreview,
  macroAreaId: string,
): GeographicWorldRegionV2[] {
  const macroArea = preview.macroAreaSet.macroAreas.find((entry) => entry.id === macroAreaId);
  if (!macroArea) return [];
  const byId = new Map(preview.regionPreview.regionSet.regions.map((region) => [region.id, region]));
  return macroArea.childRegionIds.map((id) => byId.get(id)).filter((region): region is GeographicWorldRegionV2 => Boolean(region));
}

export function macroAreaForRegion(
  preview: GeographicHierarchyPreview,
  region: GeographicWorldRegionV2,
): GeographicMacroArea | null {
  return preview.macroAreaSet.macroAreas.find((macroArea) => macroArea.childRegionIds.includes(region.id)) ?? null;
}

export function hierarchyCacheKey(
  project: WorldProject,
  parentId: string,
  level: string,
  scaleId: string,
): string {
  return [
    geographicRegionPreviewProjectKey(project),
    previewAlgorithmKey(),
    parentId,
    level,
    scaleId,
  ].join(':');
}

export function hierarchyLevelLabel(level: GeographicHierarchyLevel): string {
  if (level === 'macro-area') return 'macro area';
  return level;
}

function planetCircumferenceMiles(project: WorldProject): number {
  return project.primaryWorld.hexOverlay?.planetCircumferenceMiles ?? 24881;
}

function previewAlgorithmKey(): string {
  return 'geographic-hierarchy-v1:adaptive-world-hex-scale-v1:geographic-child-partition-v1:geographic-tile-window-v1';
}

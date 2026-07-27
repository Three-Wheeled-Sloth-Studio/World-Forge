import { describe, expect, it } from 'vitest';
import { createDefaultConfig, generateProject } from '@world-forge/generator-core';
import {
  buildGeographicRegionPreview,
  buildGeographicRegionRaster,
  geographicRegionAtMapPoint,
  geographicRegionPreviewProjectKey,
  geographicRegionPreviewSummary,
  geographicRegionSetForMode,
} from './geographicRegionPreview';

describe('browser geographic region preview', () => {
  it('builds selectable repaired regions and comparison evidence from a generated project', () => {
    const config = createDefaultConfig('browser-region-preview', { width: 48, height: 24 });
    config.topologyResolution = 8;
    config.outputResolution = { width: 48, height: 24 };
    const project = generateProject(config);
    const preview = buildGeographicRegionPreview(project);
    const raster = buildGeographicRegionRaster(preview, 48, 24);
    const selected = geographicRegionAtMapPoint(project, preview, 24, 12);
    const summary = geographicRegionPreviewSummary(preview);

    expect(preview.projectKey).toBe(geographicRegionPreviewProjectKey(project));
    expect(preview.evaluation.validMembership).toBe(true);
    expect(preview.evaluation.disconnectedRegionCount).toBe(0);
    expect(preview.baseline.source).toBe('lat-lon-grid');
    expect(preview.regionSet.repair?.modelVersion).toBe('geographic-parent-sliver-merge-v2');
    expect(preview.rawEvaluation.regionCount).toBe(preview.rawCandidate.regions.length);
    expect(geographicRegionSetForMode(preview, 'raw')).toBe(preview.rawCandidate);
    expect(geographicRegionSetForMode(preview, 'repaired')).toBe(preview.regionSet);
    expect(geographicRegionPreviewSummary(preview, 'raw').mode).toBe('raw');
    expect(raster).toHaveLength(48 * 24);
    expect(selected).not.toBeNull();
    expect(summary.regionCount).toBe(preview.regionSet.regions.length);
    expect(summary.targetRegionCount).toBe(preview.rawCandidate.scaleBudget.targetRegionCount);
    expect(summary.preferredViewportHexColumns).toBe(20);
    expect(summary.preferredViewportHexRows).toBe(20);
    expect(summary.axisBoundaryConcentration).toBeGreaterThanOrEqual(0);
    expect(summary.axisBoundaryConcentration).toBeLessThanOrEqual(1);
  });
});

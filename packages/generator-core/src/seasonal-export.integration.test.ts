import { describe, expect, test } from 'vitest';
import { exportWforge, importWforge } from '@world-forge/exporters';
import { createDefaultConfig, generateProject } from './index';
import {
  runSystemOrbitalContextWorkflow,
  systemOrbitalContextSourceFromProject
} from '../../generation-runtime/src/enrichment/systemOrbitalContext';
import {
  runSeasonalSurfaceModelWorkflow,
  seasonalSurfaceSourceFromProject
} from '../../generation-runtime/src/enrichment/seasonalSurfaceModel';

describe('seasonal artifact persistence', () => {
  test('roundtrips through a .wforge package', async () => {
    let project = generateProject(createDefaultConfig('seasonal-package-001', { width: 128, height: 64 }));
    const orbital = await runSystemOrbitalContextWorkflow(systemOrbitalContextSourceFromProject(project));
    project = {
      ...project,
      enrichmentArtifacts: { 'project.system-orbital-context': orbital }
    };
    const seasonal = await runSeasonalSurfaceModelWorkflow(seasonalSurfaceSourceFromProject(project));
    project = {
      ...project,
      enrichmentArtifacts: {
        ...project.enrichmentArtifacts,
        'project.seasonal-surface-model': seasonal
      }
    };
    const blob = await exportWforge(project);
    const loaded = await importWforge(new File([blob], 'seasonal-package-001.wforge'));
    const restored = loaded.enrichmentArtifacts?.['project.seasonal-surface-model'];
    expect(restored?.artifactKey).toBe('project.seasonal-surface-model');
    expect(restored?.artifactSignature).toBe(seasonal.artifactSignature);
    expect(restored?.payload.modelVersion).toBe('seasonal-surface-model-v1');
    expect(restored?.payload.temperatureAmplitudeC).toHaveLength(128 * 64);
  });
});

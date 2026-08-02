import { afterEach, describe, expect, it } from 'vitest';
import type { GenerationConfig } from '@world-forge/shared';
import { createDefaultConfig, generateProject } from './index';
import { setGenerationPerformanceTraceSink } from './generationPerformanceTrace';
import { prepareSystemOrbitConfig } from './systemOrbitPreset';
import type { GenerationWorkflowId } from './workflows';

type ExtendedGenerationConfig = GenerationConfig & {
  workflowId?: GenerationWorkflowId;
  worldPresetId?: string;
  starPresetId?: 'sol-like';
  seeds?: { star?: string; world?: string };
};

afterEach(() => setGenerationPerformanceTraceSink(undefined));

describe('initial world foundation profiling', () => {
  it('emits stable climate, hydrology, and projection subphase records without changing stage aggregation', () => {
    const records: string[] = [];
    setGenerationPerformanceTraceSink((record) => records.push(record.name));
    const config = createDefaultConfig('foundation-profile', { width: 64, height: 32 }) as ExtendedGenerationConfig;
    config.topologyResolution = 16;
    config.workflowId = 'core.performance-foundation';
    config.worldPresetId = 'Earthlike';
    config.starPresetId = 'sol-like';
    config.seeds = { star: 'foundation-profile', world: 'foundation-profile' };
    const project = generateProject(prepareSystemOrbitConfig(config));

    expect(records).toEqual(expect.arrayContaining([
      'foundation.climate.water-distance',
      'foundation.climate.temperature-field',
      'foundation.climate.atmospheric-flow',
      'foundation.climate.ocean-currents',
      'foundation.climate.wetness-traversal',
      'foundation.climate.moisture-candidate-water-distance',
      'foundation.climate.moisture-candidate-traversal',
      'foundation.hydrology.water-distance',
      'foundation.hydrology.drainage-surface',
      'foundation.hydrology.elevation-ordering',
      'foundation.hydrology.receiver-flow-initialization',
      'foundation.hydrology.flow-accumulation',
      'foundation.hydrology.source-ordering',
      'foundation.hydrology.river-path-tracing',
      'foundation.projection.scalar-lookup',
      'foundation.projection.scalar-copy',
      'foundation.projection.vector-lookup',
      'foundation.projection.vector-copy'
    ]));

    const diagnosticNames = project.diagnostics.phases.map((phase) => phase.name);
    expect(diagnosticNames).toEqual(expect.arrayContaining([
      'topology.water.sea-level.pre-aging',
      'topology.terrain.aging.impacts',
      'topology.terrain.aging.weathering',
      'topology.terrain.aging.hydraulic',
      'topology.terrain.aging.coasts',
      'topology.terrain.enrichment',
      'topology.water.sea-level.final',
      'topology.water.mask',
      'topology.volcanism',
      'topology.climate',
      'topology.climate.moisture-candidate',
      'topology.glaciation',
      'topology.biomes',
      'projection.equirectangular',
      'projection.flow',
      'projection.rivers'
    ]));
  });
});

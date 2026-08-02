import { describe, expect, it } from 'vitest';
import type { GenerationConfig } from '@world-forge/shared';
import { createDefaultConfig, generateProject } from './index';
import { applyDeepTimeFoundation } from './deepTimePipeline';
import {
  setGenerationPerformanceTraceSink,
  type GenerationPerformanceTraceRecord
} from './generationPerformanceTrace';

type ExtendedConfig = GenerationConfig & { workflowId?: string };

describe('deep-time finalization profiling', () => {
  it('separates biome, circulation, river projection, and validation work', () => {
    const config = createDefaultConfig('deep-time-final-profile', { width: 64, height: 32 }) as ExtendedConfig;
    config.topologyResolution = 16;
    config.workflowId = 'core.performance-foundation';
    const records: GenerationPerformanceTraceRecord[] = [];
    setGenerationPerformanceTraceSink((record) => records.push(record));
    try {
      applyDeepTimeFoundation(generateProject(config));
    } finally {
      setGenerationPerformanceTraceSink(undefined);
    }

    const phases = records.filter((record) => !record.parent).map((record) => record.name);
    expect(phases).toEqual(expect.arrayContaining([
      'deep-time.final.biome-classification',
      'topology-to-raster-final-projection',
      'deep-time.final.basin-circulation',
      'deep-time.final.river-path-projection',
      'deep-time.final.metrics-validation'
    ]));
  });
});

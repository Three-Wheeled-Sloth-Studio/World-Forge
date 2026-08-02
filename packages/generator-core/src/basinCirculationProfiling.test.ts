import { describe, expect, it } from 'vitest';
import type { GenerationConfig } from '@world-forge/shared';
import { createDefaultConfig, generateProject } from './index';
import { applyDeepTimeFoundation } from './deepTimePipeline';
import {
  setGenerationPerformanceTraceSink,
  type GenerationPerformanceTraceRecord
} from './generationPerformanceTrace';

type ExtendedConfig = GenerationConfig & { workflowId?: string };

describe('basin circulation profiling', () => {
  it('separates basin labeling, coast distance, and gyre packing', () => {
    const config = createDefaultConfig('basin-circulation-profile', { width: 64, height: 32 }) as ExtendedConfig;
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
      'basin-circulation.label-basins',
      'basin-circulation.coast-distance',
      'basin-circulation.pack-gyres'
    ]));
  });
});

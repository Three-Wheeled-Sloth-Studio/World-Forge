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
  it('separates pressure construction, projected forcing, gyre construction, and field evaluation', () => {
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
      'climatological-pressure.build-reference-model',
      'climatological-pressure.apply-fields',
      'basin-circulation.build-large-scale-gyres',
      'basin-circulation.evaluate-large-scale-field'
    ]));
    expect(phases).not.toContain('basin-circulation.pack-gyres');
  });
});

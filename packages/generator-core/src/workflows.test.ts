
import { describe, expect, it } from 'vitest';
import {
  defaultGenerationWorkflowId,
  generationWorkflowDeepTimeFeatures,
  generationWorkflowDescriptor
} from './workflows';

describe('generation workflow contracts', () => {
  it('keeps legacy and attribution controls off optimized traversal paths', () => {
    expect(generationWorkflowDeepTimeFeatures('core.live-world')).toEqual({
      reusePresentClimateDerivedFields: false,
      optimizeHydrologyTraversal: false,
      optimizePresentClimateTraversal: false
    });
    expect(generationWorkflowDeepTimeFeatures('core.performance-foundation-aging-control')).toEqual({
      reusePresentClimateDerivedFields: false,
      optimizeHydrologyTraversal: false,
      optimizePresentClimateTraversal: false
    });
    expect(generationWorkflowDeepTimeFeatures('core.performance-foundation-derived-control')).toEqual({
      reusePresentClimateDerivedFields: true,
      optimizeHydrologyTraversal: false,
      optimizePresentClimateTraversal: false
    });
  });

  it('keeps Detailed as the production comparison baseline', () => {
    expect(defaultGenerationWorkflowId).toBe('core.performance-foundation');
    expect(generationWorkflowDeepTimeFeatures('core.performance-foundation')).toEqual({
      reusePresentClimateDerivedFields: true,
      optimizeHydrologyTraversal: true,
      optimizePresentClimateTraversal: false
    });
    expect(generationWorkflowDescriptor('core.performance-foundation')).toMatchObject({
      version: '1.0.0',
      label: 'World Generation (Detailed)',
      status: 'production',
      seedStrategy: 'semantic-node',
      selectableInGenerator: true
    });
  });

  it('retains Legacy as an explicit selectable rollback path', () => {
    expect(generationWorkflowDescriptor('core.live-world')).toMatchObject({
      label: 'World Generation (Legacy)',
      status: 'experimental',
      seedStrategy: 'legacy-shared',
      selectableInGenerator: true
    });
  });

  it('isolates present-climate traversal optimization to Experimental', () => {
    expect(generationWorkflowDeepTimeFeatures('core.world-generation-experimental')).toEqual({
      reusePresentClimateDerivedFields: true,
      optimizeHydrologyTraversal: true,
      optimizePresentClimateTraversal: true
    });
    expect(generationWorkflowDescriptor('core.world-generation-experimental')).toMatchObject({
      version: '0.3.0',
      label: 'World Generation (Experimental)',
      status: 'experimental',
      seedStrategy: 'semantic-node',
      selectableInGenerator: true
    });
  });

  it('defaults missing and unknown workflow ids to Detailed', () => {
    expect(generationWorkflowDescriptor(undefined).id).toBe('core.performance-foundation');
    expect(generationWorkflowDescriptor('unknown').id).toBe('core.performance-foundation');
    expect(generationWorkflowDeepTimeFeatures('unknown')).toEqual({
      reusePresentClimateDerivedFields: true,
      optimizeHydrologyTraversal: true,
      optimizePresentClimateTraversal: false
    });
  });
});

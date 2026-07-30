import { describe, expect, it } from 'vitest';
import {
  defaultGenerationWorkflowId,
  generationWorkflowDeepTimeFeatures,
  generationWorkflowDescriptor
} from './workflows';

describe('generation workflow contracts', () => {
  it('keeps the legacy and attribution control workflows on legacy hydrology traversal', () => {
    expect(generationWorkflowDeepTimeFeatures('core.live-world')).toEqual({
      reusePresentClimateDerivedFields: false,
      optimizeHydrologyTraversal: false
    });
    expect(generationWorkflowDeepTimeFeatures('core.performance-foundation-aging-control')).toEqual({
      reusePresentClimateDerivedFields: false,
      optimizeHydrologyTraversal: false
    });
    expect(generationWorkflowDeepTimeFeatures('core.performance-foundation-derived-control')).toEqual({
      reusePresentClimateDerivedFields: true,
      optimizeHydrologyTraversal: false
    });
  });

  it('promotes Detailed as the primary production workflow', () => {
    expect(defaultGenerationWorkflowId).toBe('core.performance-foundation');
    expect(generationWorkflowDeepTimeFeatures('core.performance-foundation')).toEqual({
      reusePresentClimateDerivedFields: true,
      optimizeHydrologyTraversal: true
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

  it('creates an Experimental copy with the Detailed feature set', () => {
    expect(generationWorkflowDeepTimeFeatures('core.world-generation-experimental')).toEqual({
      reusePresentClimateDerivedFields: true,
      optimizeHydrologyTraversal: true
    });
    expect(generationWorkflowDescriptor('core.world-generation-experimental')).toMatchObject({
      version: '0.1.0',
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
      optimizeHydrologyTraversal: true
    });
  });
});

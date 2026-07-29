import { describe, expect, it } from 'vitest';
import {
  generationWorkflowDeepTimeFeatures,
  generationWorkflowDescriptor
} from './workflows';

describe('generation workflow contracts', () => {
  it('keeps production and attribution controls on legacy hydrology traversal', () => {
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

  it('enables exact hydrology traversal optimization only for the candidate', () => {
    expect(generationWorkflowDeepTimeFeatures('core.performance-foundation')).toEqual({
      reusePresentClimateDerivedFields: true,
      optimizeHydrologyTraversal: true
    });
    expect(generationWorkflowDescriptor('core.performance-foundation')).toMatchObject({
      version: '0.4.0',
      seedStrategy: 'semantic-node',
      selectableInGenerator: true
    });
    expect(generationWorkflowDescriptor('core.performance-foundation-derived-control')).toMatchObject({
      seedStrategy: 'semantic-node',
      selectableInGenerator: false
    });
  });

  it('defaults unknown workflow ids to the unchanged production behavior', () => {
    expect(generationWorkflowDeepTimeFeatures('unknown')).toEqual({
      reusePresentClimateDerivedFields: false,
      optimizeHydrologyTraversal: false
    });
  });
});

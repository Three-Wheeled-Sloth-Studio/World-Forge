import type { GenerationConfig } from '@world-forge/shared';
import type { GenerateProjectOptions } from './index';
import {
  generateProjectWithMotionAwareDeepTime as generateBaseProjectWithMotionAwareDeepTime,
  type DeepTimeProgress,
  type DeepTimeProject,
} from './plateMotionPipelineBase';
import {
  CURRENT_GENERATOR_VERSION,
  supplementNamedTopologyRivers,
} from './index';

export * from './plateMotionPipelineBase';

export function generateProjectWithMotionAwareDeepTime(
  input: Partial<GenerationConfig> = {},
  options: GenerateProjectOptions = {},
  onDeepTimeProgress?: (progress: DeepTimeProgress) => void,
): DeepTimeProject {
  const result = generateBaseProjectWithMotionAwareDeepTime(input, options, onDeepTimeProgress);
  const supplemented = supplementNamedTopologyRivers(result) as DeepTimeProject;
  return supplemented.generatorVersion === CURRENT_GENERATOR_VERSION
    ? supplemented
    : { ...supplemented, generatorVersion: CURRENT_GENERATOR_VERSION };
}

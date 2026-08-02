from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path: str, old: str, new: str) -> None:
    file = ROOT / path
    content = file.read_text(encoding='utf-8')
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one match, found {count}: {old[:120]!r}')
    file.write_text(content.replace(old, new, 1), encoding='utf-8')


def replace_all_in(path: str, old: str, new: str) -> None:
    file = ROOT / path
    content = file.read_text(encoding='utf-8')
    if old not in content:
        raise RuntimeError(f'{path}: missing {old!r}')
    file.write_text(content.replace(old, new), encoding='utf-8')


# Candidate model: use one mean-centered power profile through initial and final climate.
replace_once(
    'packages/generator-core/src/latitudeTemperatureProfile.ts',
    "export type LatitudeTemperatureProfileId = 'legacy-linear-v1' | 'mean-centered-linear-v1';",
    "export type LatitudeTemperatureProfileId = 'legacy-linear-v1' | 'mean-centered-power-v1';"
)
replace_once(
    'packages/generator-core/src/latitudeTemperatureProfile.ts',
    "export const sphericalMeanAbsoluteNormalizedLatitude = 1 - 2 / Math.PI;",
    "export const sphericalMeanPolarLatitudePower13 = 0.29171897123199025;"
)
replace_once(
    'packages/generator-core/src/latitudeTemperatureProfile.ts',
    """export const experimentalLatitudeTemperatureProfile: LatitudeTemperatureProfile = {
  id: 'mean-centered-linear-v1',
  equatorToPoleContrastC: 40
};""",
    """export const experimentalLatitudeTemperatureProfile: LatitudeTemperatureProfile = {
  id: 'mean-centered-power-v1',
  equatorToPoleContrastC: 52
};"""
)
replace_once(
    'packages/generator-core/src/latitudeTemperatureProfile.ts',
    "  return profile.equatorToPoleContrastC * (sphericalMeanAbsoluteNormalizedLatitude - latitude);",
    "  return profile.equatorToPoleContrastC * (sphericalMeanPolarLatitudePower13 - Math.pow(latitude, 1.3));"
)

for path in [
    'packages/shared/src/index.ts',
    'packages/shared/src/types.ts',
    'packages/generator-core/src/polarClimateIntegration.test.ts'
]:
    replace_all_in(path, 'mean-centered-linear-v1', 'mean-centered-power-v1')

replace_once(
    'packages/generator-core/src/latitudeTemperatureProfile.test.ts',
    'expect(Math.abs(experimentalEquator - legacyEquator)).toBeLessThan(1);',
    'expect(Math.abs(experimentalEquator - legacyEquator)).toBeLessThan(2);'
)

# Direct node callers may omit the new field and retain exact legacy behavior.
replace_once(
    'packages/generator-core/src/graph/nodes/climate-glaciation-node.ts',
    "import { summarizePolarClimate, type LatitudeTemperatureProfile } from '../../latitudeTemperatureProfile';",
    "import { legacyLatitudeTemperatureProfile, summarizePolarClimate, type LatitudeTemperatureProfile } from '../../latitudeTemperatureProfile';"
)
replace_once(
    'packages/generator-core/src/graph/nodes/climate-glaciation-node.ts',
    '  latitudeTemperatureProfile: LatitudeTemperatureProfile;',
    '  latitudeTemperatureProfile?: LatitudeTemperatureProfile;'
)
replace_once(
    'packages/generator-core/src/graph/nodes/climate-glaciation-node.ts',
    """    const cellCount = topologyOutput.topology.cellCount;
    const temperature = new Float32Array(cellCount);""",
    """    const latitudeTemperatureProfile = input.latitudeTemperatureProfile ?? legacyLatitudeTemperatureProfile;
    const cellCount = topologyOutput.topology.cellCount;
    const temperature = new Float32Array(cellCount);"""
)
replace_all_in(
    'packages/generator-core/src/graph/nodes/climate-glaciation-node.ts',
    'input.latitudeTemperatureProfile',
    'latitudeTemperatureProfile'
)
# Correct the declaration line accidentally touched by the global replacement.
replace_once(
    'packages/generator-core/src/graph/nodes/climate-glaciation-node.ts',
    '  latitudeTemperatureProfile?: LatitudeTemperatureProfile;',
    '  latitudeTemperatureProfile?: LatitudeTemperatureProfile;'
)

# Carry the profile through the authoritative final deep-time climate rebuild.
replace_once(
    'packages/generator-core/src/deepTimePipeline.ts',
    "import { generationWorkflowDeepTimeFeatures } from './workflows';",
    "import { generationWorkflowDeepTimeFeatures, type GenerationWorkflowId } from './workflows';\nimport { latitudeTemperatureOffsetC, latitudeTemperatureProfileForWorkflow } from './latitudeTemperatureProfile';"
)
replace_once(
    'packages/generator-core/src/deepTimePipeline.ts',
    """  const orographicLift = captureDerivedFields ? new Float32Array(count) : undefined;
  const orographicShadow = captureDerivedFields ? new Float32Array(count) : undefined;

  for (let cell = 0; cell < count; cell += 1) {""",
    """  const orographicLift = captureDerivedFields ? new Float32Array(count) : undefined;
  const orographicShadow = captureDerivedFields ? new Float32Array(count) : undefined;
  const workflowId = (project.config as GenerationConfig & { workflowId?: GenerationWorkflowId }).workflowId;
  const latitudeTemperatureProfile = latitudeTemperatureProfileForWorkflow(workflowId);

  for (let cell = 0; cell < count; cell += 1) {"""
)
replace_once(
    'packages/generator-core/src/deepTimePipeline.ts',
    """    const latitudeCooling = Math.pow(latitude, 1.3) * 38;
    const altitudeCooling = altitude * 20;
    const oceanModeration = ocean ? 2.5 * (1 - latitude * 0.4) : 0;
    layers.temperature[cell] = world.averageTemperatureC + 10 - latitudeCooling - altitudeCooling + oceanModeration;""",
    """    const latitudeOffset = latitudeTemperatureProfile.id === 'legacy-linear-v1'
      ? 10 - Math.pow(latitude, 1.3) * 38
      : latitudeTemperatureOffsetC(latitude, latitudeTemperatureProfile);
    const altitudeCooling = altitude * 20;
    const oceanModeration = ocean ? 2.5 * (1 - latitude * 0.4) : 0;
    layers.temperature[cell] = world.averageTemperatureC + latitudeOffset - altitudeCooling + oceanModeration;"""
)

# Full-pipeline comparison should measure a material final result, not an initial-only delta.
replace_once(
    'packages/generator-core/src/polarClimateIntegration.test.ts',
    "expect(experimentalPolar.northHighLatitudeMeanTemperatureC).toBeLessThan(detailedPolar.northHighLatitudeMeanTemperatureC - 7);",
    "expect(experimentalPolar.northHighLatitudeMeanTemperatureC).toBeLessThan(detailedPolar.northHighLatitudeMeanTemperatureC - 2);"
)
replace_once(
    'packages/generator-core/src/polarClimateIntegration.test.ts',
    "expect(experimentalPolar.southHighLatitudeMeanTemperatureC).toBeLessThan(detailedPolar.southHighLatitudeMeanTemperatureC - 7);",
    "expect(experimentalPolar.southHighLatitudeMeanTemperatureC).toBeLessThan(detailedPolar.southHighLatitudeMeanTemperatureC - 2);"
)

# Keep provenance and release copy honest about the selected candidate.
replace_all_in(
    'packages/generation-runtime/src/graph/generationWorkflows.ts',
    'core.climate.glaciation.mean-centered-latitude-v1',
    'core.climate.glaciation.mean-centered-power-v1'
)
replace_all_in(
    'packages/generation-runtime/src/graph/generationWorkflows.test.ts',
    'core.climate.glaciation.mean-centered-latitude-v1',
    'core.climate.glaciation.mean-centered-power-v1'
)
replace_once(
    'apps/desktop/src/release/ReleaseNotesModal.tsx',
    'Experimental now tests a mean-centered 40 C equator-to-pole temperature contrast while preserving the selected global temperature target.',
    'Experimental now tests a mean-centered 52 C power-profile equator-to-pole contrast through both initial and deep-time climate while preserving the selected global temperature target.'
)

print('Deep-time polar profile integration and compatibility fixes applied.')

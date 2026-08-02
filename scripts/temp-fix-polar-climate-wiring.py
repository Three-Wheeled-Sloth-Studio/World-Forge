from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path: str, old: str, new: str) -> None:
    file = ROOT / path
    content = file.read_text(encoding='utf-8')
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one match, found {count}')
    file.write_text(content.replace(old, new, 1), encoding='utf-8')


polar_block = """    meanIceAlbedoCoolingC: number;
    polarClimate?: {
      latitudeProfileId: 'legacy-linear-v1' | 'mean-centered-linear-v1';
      equatorToPoleContrastC: number;
      meanTemperatureC: number;
      equatorialMeanTemperatureC: number;
      northHighLatitudeMeanTemperatureC: number;
      southHighLatitudeMeanTemperatureC: number;
      northPermanentIceShare: number;
      southPermanentIceShare: number;
      landIceCells: number;
      waterIceCells: number;
    };
"""

replace_once(
    'packages/shared/src/index.ts',
    '    meanIceAlbedoCoolingC: number;\n',
    polar_block
)
replace_once(
    'packages/generator-core/src/index.ts',
    "import { latitudeTemperatureOffsetC, type LatitudeTemperatureProfile } from './latitudeTemperatureProfile';",
    "import { latitudeTemperatureOffsetC, legacyLatitudeTemperatureProfile, type LatitudeTemperatureProfile } from './latitudeTemperatureProfile';"
)
replace_once(
    'packages/generator-core/src/index.ts',
    '    generateTopologyClimate(topologyTemperature, topologyWetness, topologyWindX, topologyWindY, topologyCurrentX, topologyCurrentY, topologyElevation, topologyWater, topology, values, tideInfluence)\n',
    '    generateTopologyClimate(topologyTemperature, topologyWetness, topologyWindX, topologyWindY, topologyCurrentX, topologyCurrentY, topologyElevation, topologyWater, topology, values, tideInfluence, legacyLatitudeTemperatureProfile)\n'
)
replace_once(
    'packages/generator-core/src/systemOrbitPreset.ts',
    'const latitudeProfile = latitudeTemperatureProfileForWorkflow(config.workflowId);',
    'const latitudeProfile = latitudeTemperatureProfileForWorkflow((project.config as ExtendedGenerationConfig).workflowId);'
)

print('Polar climate wiring fixes applied.')

from pathlib import Path

path = Path('apps/desktop/src/globe/GlobeViewer.tsx')
text = path.read_text(encoding='utf-8')
old = """  const data = new Uint8Array(width * height * 4);

  for (let index = 0; index < width * height; index += 1) {
    const zonal = clampSigned((field?.zonal[index] ?? artifact?.payload.advection.zonalMeanDegPerDay && artifact.payload.advection.zonalMeanDegPerDay / 18) || 0, 2);
    const meridional = clampSigned((field?.meridional[index] ?? artifact?.payload.advection.meridionalMeanDegPerDay && artifact.payload.advection.meridionalMeanDegPerDay / 5) || 0, 2);
"""
new = """  const data = new Uint8Array(width * height * 4);
  const fallbackZonal = artifact ? artifact.payload.advection.zonalMeanDegPerDay / 18 : 0;
  const fallbackMeridional = artifact ? artifact.payload.advection.meridionalMeanDegPerDay / 5 : 0;

  for (let index = 0; index < width * height; index += 1) {
    const zonal = clampSigned(field?.zonal[index] ?? fallbackZonal, 2);
    const meridional = clampSigned(field?.meridional[index] ?? fallbackMeridional, 2);
"""
count = text.count(old)
if count != 1:
    raise RuntimeError(f'Expected one wind fallback block, found {count}')
text = text.replace(old, new)
cast_old = "material.userData.weatherShader = shader as WindCloudShaderState;"
cast_new = "material.userData.weatherShader = shader as unknown as WindCloudShaderState;"
cast_count = text.count(cast_old)
if cast_count != 1:
    raise RuntimeError(f'Expected one shader state cast, found {cast_count}')
path.write_text(text.replace(cast_old, cast_new), encoding='utf-8')
print('Corrected local-flow shader TypeScript boundaries.')

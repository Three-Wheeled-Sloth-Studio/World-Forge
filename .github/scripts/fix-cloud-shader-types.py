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
path.write_text(text.replace(old, new), encoding='utf-8')
print('Corrected local-flow shader wind fallback types.')

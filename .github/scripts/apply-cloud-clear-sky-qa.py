from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    text = file_path.read_text(encoding='utf-8')
    if old not in text:
        raise RuntimeError(f'Expected text not found in {path}: {old[:120]!r}')
    file_path.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once(
    'apps/desktop/src/appVersion.ts',
    "export const APP_VERSION = '0.3.41';",
    "export const APP_VERSION = '0.3.42';"
)

replace_once(
    'apps/desktop/src/globe/weatherPresentationTexture.ts',
    "  field.width = Math.max(128, Math.floor(canvas.width / 2));\n  field.height = Math.max(64, Math.floor(canvas.height / 2));",
    "  field.width = canvas.width;\n  field.height = canvas.height;"
)
replace_once(
    'apps/desktop/src/globe/weatherPresentationTexture.ts',
    "      const value = Math.round(Math.pow(coverage, 0.88) * 255);",
    "      const value = Math.round(Math.pow(coverage, 1.12) * 255);"
)
replace_once(
    'apps/desktop/src/globe/weatherPresentationTexture.ts',
    "  context.filter = 'blur(1.15px)';\n  context.globalAlpha = 0.92;",
    "  context.filter = 'blur(0.55px)';\n  context.globalAlpha = 1;"
)
replace_once(
    'apps/desktop/src/globe/weatherPresentationTexture.ts',
    "    const halfWidth = Math.max(2, band.widthDeg * 0.72);",
    "    const halfWidth = Math.max(2, band.widthDeg * 0.60);"
)
replace_once(
    'apps/desktop/src/globe/weatherPresentationTexture.ts',
    "  const texture = macro * 0.48 + filament * 0.34 + cells * 0.18;\n  const threshold = 0.59 - bandEnvelope * 0.29;\n  const formed = smoothStep(threshold, 0.87, texture + bandEnvelope * 0.31);\n  const breakup = smoothStep(0.34, 0.73, filament * 0.66 + cells * 0.34);\n  return clamp01(formed * (0.48 + breakup * 0.72) * (0.52 + bandEnvelope * 0.88));",
    "  const texture = macro * 0.36 + filament * 0.40 + cells * 0.24;\n  const threshold = 0.60 - bandEnvelope * 0.17;\n  const formed = smoothStep(threshold, 0.83, texture + bandEnvelope * 0.14);\n  const breakup = smoothStep(0.40, 0.72, filament * 0.56 + cells * 0.44);\n  const rawCoverage = clamp01(formed * (0.20 + breakup * 0.98) * (0.36 + bandEnvelope * 0.90));\n  return smoothStep(0.08, 0.70, rawCoverage);"
)

replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "        color: 0xf6f3e8,\n        alphaMap: cloudAlpha,\n        transparent: true,\n        opacity: 0.62,\n        alphaTest: 0.012,",
    "        color: 0xffffff,\n        alphaMap: cloudAlpha,\n        transparent: true,\n        opacity: 0.82,\n        alphaTest: 0.045,"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "      new THREE.SphereGeometry(scale.cloudShellRadius + 0.008, 128, 64),",
    "      new THREE.SphereGeometry(scale.cloudShellRadius + 0.002, 128, 64),"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "      data-cloud-renderer=\"layered-noise-v2\"\n      data-minimum-globe-zoom=\"35\"",
    "      data-cloud-renderer=\"sparse-layered-noise-v3\"\n      data-cloud-coverage-profile=\"clear-sky-gaps\"\n      data-weather-shell-offset=\"0.002\"\n      data-minimum-globe-zoom=\"35\""
)

replace_once(
    'apps/desktop/src/globe/weatherPresentationTexture.test.ts',
    "  it('advects rather than remaining fixed over simulation time', () => {",
    "  it('preserves clear-sky gaps instead of producing a continuous haze', () => {\n    const samples = Array.from({ length: 512 }, (_, index) => {\n      const x = index % 32;\n      const y = Math.floor(index / 32);\n      return cloudCoverageSample(artifact, (x + 0.5) / 32, (y + 0.5) / 16, 4);\n    });\n    const clearSkyShare = samples.filter((value) => value < 0.02).length / samples.length;\n    const denseCloudShare = samples.filter((value) => value > 0.35).length / samples.length;\n    const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;\n    expect(clearSkyShare).toBeGreaterThan(0.55);\n    expect(denseCloudShare).toBeGreaterThan(0.03);\n    expect(mean).toBeLessThan(0.18);\n  });\n\n  it('advects rather than remaining fixed over simulation time', () => {"
)

qa_path = Path('refs/testing/atmospheric-weather-visual-qa.md')
qa_text = qa_path.read_text(encoding='utf-8')
qa_text = qa_text.replace(
    '4. Confirm clouds are locally broken and irregular rather than continuous latitude-width strokes.',
    '4. Confirm clouds form discrete bright fields with substantial clear-sky gaps, rather than continuous latitude strokes or a low-opacity planetary haze.'
)
qa_text = qa_text.replace(
    '5. Advance the shared clock and confirm cloud texture and systems move.',
    '5. Confirm thin cloud edges remain visible without turning the whole cloud deck translucent, then advance the shared clock and confirm cloud texture and systems move.'
)
qa_text = qa_text.replace(
    '6. Set Globe zoom to 35% and confirm the primary moons remain visible.',
    '6. Confirm weather systems sit close to the cloud deck without obvious shell separation, then set Globe zoom to 35% and confirm the primary moons remain visible.'
)
qa_path.write_text(qa_text, encoding='utf-8')

print('Applied sparse cloud coverage and lower weather-shell corrections.')

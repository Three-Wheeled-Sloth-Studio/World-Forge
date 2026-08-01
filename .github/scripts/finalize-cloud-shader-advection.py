from pathlib import Path


def replace_exact(path: str, old: str, new: str, expected: int = 1) -> None:
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != expected:
        raise RuntimeError(f'{path}: expected {expected} matches, found {count}: {old[:180]!r}')
    target.write_text(text.replace(old, new), encoding='utf-8')


path = 'apps/desktop/src/globe/GlobeViewer.tsx'

replace_exact(
    path,
    "    const initialWeatherDay = simulationClock.currentDays(performance.now());\n    const cloudCanvas = createWeatherPresentationTexture(weatherPresentation, 'clouds', initialWeatherDay);\n    const cloudAlpha = new THREE.CanvasTexture(cloudCanvas);",
    "    const initialWeatherDay = simulationClock.currentDays(performance.now());\n    // The deterministic globe-space field is generated once. Shared-clock\n    // advection is handled by the local-flow shader below, not by rebuilding\n    // the CPU canvas every animation tick.\n    const cloudCanvas = createWeatherPresentationTexture(weatherPresentation, 'clouds', 0);\n    const cloudAlpha = new THREE.CanvasTexture(cloudCanvas);"
)

replace_exact(
    path,
    "    const clouds = new THREE.Mesh(\n      new THREE.SphereGeometry(scale.cloudShellRadius, 128, 64),\n      new THREE.MeshLambertMaterial({\n        color: 0xffffff,\n        alphaMap: cloudAlpha,\n        transparent: true,\n        opacity: 0.78,\n        alphaTest: 0.012,\n        depthWrite: false,\n        depthTest: true\n      })\n    );",
    "    const cloudWindTexture = createWeatherWindTexture(weatherPresentation);\n    const cloudMaterial = createWindAdvectedCloudMaterial(cloudAlpha, cloudWindTexture, initialWeatherDay);\n    const clouds = new THREE.Mesh(\n      new THREE.SphereGeometry(scale.cloudShellRadius, 128, 64),\n      cloudMaterial\n    );"
)

replace_exact(
    path,
    "      if (weatherPresentation && (!Number.isFinite(lastWeatherTextureDay) || Math.abs(simulationDays - lastWeatherTextureDay) >= 0.04)) {\n        renderWeatherPresentationTexture(cloudCanvas, weatherPresentation, 'clouds', simulationDays);\n        renderWeatherPresentationTexture(weatherCanvas, weatherPresentation, 'weather', simulationDays);\n        cloudAlpha.needsUpdate = true;\n        weatherAlpha.needsUpdate = true;\n        lastWeatherTextureDay = simulationDays;\n        host.dataset.weatherTextureDay = simulationDays.toFixed(6);\n      }",
    "      if (weatherPresentation) {\n        updateWindAdvectedCloudMaterial(cloudMaterial, simulationDays);\n        host.dataset.weatherTextureDay = simulationDays.toFixed(6);\n        if (!Number.isFinite(lastWeatherTextureDay) || Math.abs(simulationDays - lastWeatherTextureDay) >= 0.08) {\n          renderWeatherPresentationTexture(weatherCanvas, weatherPresentation, 'weather', simulationDays);\n          weatherAlpha.needsUpdate = true;\n          lastWeatherTextureDay = simulationDays;\n        }\n      }"
)

replace_exact(
    path,
    "      cloudAlpha.dispose();\n      weatherAlpha.dispose();",
    "      cloudAlpha.dispose();\n      cloudWindTexture.dispose();\n      weatherAlpha.dispose();"
)

replace_exact(
    path,
    "      data-cloud-seam-mode=\"spherical-continuous\"\n      data-weather-shell-offset=\"0.002\"",
    "      data-cloud-seam-mode=\"spherical-continuous\"\n      data-cloud-advection-mode=\"local-flow-shader\"\n      data-weather-shell-offset=\"0.002\""
)

append_marker = "\nfunction createGlobeTargetMarker(direction: THREE.Vector3): THREE.Group {"
append_content = r'''

type WindCloudShaderState = {
  uniforms: {
    weatherSimulationDays: { value: number };
  };
};

function createWeatherWindTexture(
  artifact: AtmosphericWeatherPresentationArtifact | null
): THREE.DataTexture {
  const field = artifact?.payload.windField;
  const width = Math.max(1, field?.resolution.width ?? 1);
  const height = Math.max(1, field?.resolution.height ?? 1);
  const data = new Uint8Array(width * height * 4);

  for (let index = 0; index < width * height; index += 1) {
    const zonal = clampSigned((field?.zonal[index] ?? artifact?.payload.advection.zonalMeanDegPerDay && artifact.payload.advection.zonalMeanDegPerDay / 18) || 0, 2);
    const meridional = clampSigned((field?.meridional[index] ?? artifact?.payload.advection.meridionalMeanDegPerDay && artifact.payload.advection.meridionalMeanDegPerDay / 5) || 0, 2);
    const offset = index * 4;
    data[offset] = encodeSignedWind(zonal);
    data[offset + 1] = encodeSignedWind(meridional);
    data[offset + 2] = 128;
    data[offset + 3] = 255;
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function createWindAdvectedCloudMaterial(
  alphaMap: THREE.Texture,
  windMap: THREE.Texture,
  initialSimulationDays: number
): THREE.MeshLambertMaterial {
  const material = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    alphaMap,
    transparent: true,
    opacity: 0.78,
    alphaTest: 0.012,
    depthWrite: false,
    depthTest: true
  });
  material.userData.weatherSimulationDays = initialSimulationDays;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.weatherWindMap = { value: windMap };
    shader.uniforms.weatherSimulationDays = { value: material.userData.weatherSimulationDays as number };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform sampler2D weatherWindMap;
uniform float weatherSimulationDays;
vec2 wrapWeatherUv(vec2 uv) {
  float wrappedY = mod(uv.y, 2.0);
  if (wrappedY < 0.0) wrappedY += 2.0;
  float wrappedX = uv.x;
  if (wrappedY > 1.0) {
    wrappedY = 2.0 - wrappedY;
    wrappedX += 0.5;
  }
  return vec2(fract(wrappedX), wrappedY);
}`
      )
      .replace(
        '#include <alphamap_fragment>',
        `#ifdef USE_ALPHAMAP
  vec2 weatherFlow = texture2D(weatherWindMap, vAlphaMapUv).rg * 2.0 - 1.0;
  float latitudeScale = max(0.24, sin(PI * clamp(vAlphaMapUv.y, 0.0, 1.0)));
  vec2 weatherOffset = vec2(weatherFlow.x / latitudeScale, -weatherFlow.y)
    * weatherSimulationDays * 0.0035;
  vec2 weatherUv = wrapWeatherUv(vAlphaMapUv - weatherOffset);
  diffuseColor.a *= texture2D(alphaMap, weatherUv).g;
#endif`
      );
    material.userData.weatherShader = shader as WindCloudShaderState;
  };
  material.customProgramCacheKey = () => 'world-forge-wind-cloud-advection-v1';
  return material;
}

function updateWindAdvectedCloudMaterial(
  material: THREE.MeshLambertMaterial,
  simulationDays: number
): void {
  material.userData.weatherSimulationDays = simulationDays;
  const shader = material.userData.weatherShader as WindCloudShaderState | undefined;
  if (shader) shader.uniforms.weatherSimulationDays.value = simulationDays;
}

function encodeSignedWind(value: number): number {
  return Math.round((clampSigned(value, 2) / 2 * 0.5 + 0.5) * 255);
}

function clampSigned(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, Number.isFinite(value) ? value : 0));
}
'''
replace_exact(path, append_marker, append_content + append_marker)

replace_exact(
    'refs/handoffs/system-visualization-enrichment.md',
    "- The local generated wind vector determines streamer orientation and shared-clock backtraced advection.",
    "- The local generated wind vector determines streamer orientation. A compact periodic wind texture drives shared-clock local-flow advection in the cloud material, so the CPU does not regenerate the spherical field on the animation hot path."
)

replace_exact(
    'refs/handoffs/system-visualization-enrichment.md',
    "- Renderer diagnostics identify `wind-oriented-spherical-v4`, `thin-streamers-clear-sky`, and `spherical-continuous`.",
    "- Renderer diagnostics identify `wind-oriented-spherical-v4`, `thin-streamers-clear-sky`, `spherical-continuous`, and `local-flow-shader`."
)

replace_exact(
    'refs/testing/atmospheric-weather-visual-qa.md',
    "7. Advance the shared clock and confirm local cloud structures advect with the flow field while the larger weather systems continue their accepted coherent motion.",
    "7. Advance the shared clock and confirm local cloud structures advect through the local-flow shader while the larger weather systems continue their accepted coherent motion. Confirm the UI remains responsive rather than rebuilding the cloud field every clock tick."
)

replace_exact(
    'refs/testing/atmospheric-weather-visual-qa.md',
    "The weather-enrichment suite must verify that the compact wind field is deterministic, finite, correctly sized, and derived into the persisted presentation artifact.",
    "The weather-enrichment suite must verify that the compact wind field is deterministic, finite, correctly sized, and derived into the persisted presentation artifact. Chromium QA must verify the `local-flow-shader` runtime boundary and bounded cloud-enable latency."
)

print('Moved shared-clock cloud advection to the local-flow shader.')

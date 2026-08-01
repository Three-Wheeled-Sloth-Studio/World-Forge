from pathlib import Path


def replace_exact(path: str, old: str, new: str, expected: int = 1) -> None:
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != expected:
        raise RuntimeError(f'{path}: expected {expected} matches, found {count}: {old[:160]!r}')
    target.write_text(text.replace(old, new), encoding='utf-8')


path = 'apps/desktop/src/globe/weatherPresentationTexture.ts'

replace_exact(
    path,
    "type WindSample = {\n  tangent: SphericalVector;\n  zonal: number;\n  meridional: number;\n  speed: number;\n};\n\nconst STREAMER_OFFSETS = [-0.55, -0.3666667, -0.1833333, 0, 0.1833333, 0.3666667, 0.55] as const;\nconst STREAMER_WEIGHTS = [0.031, 0.11, 0.22, 0.278, 0.22, 0.11, 0.031] as const;\nconst seedHashCache = new Map<string, number>();",
    "type WindSample = {\n  tangent: SphericalVector;\n  zonal: number;\n  meridional: number;\n  speed: number;\n};\ntype NoiseSeedConfig = {\n  hash: number;\n  offsetX: number;\n  offsetY: number;\n  offsetZ: number;\n};\n\nconst STREAMER_OFFSETS = [-0.55, -0.3666667, -0.1833333, 0, 0.1833333, 0.3666667, 0.55] as const;\nconst STREAMER_WEIGHTS = [0.031, 0.11, 0.22, 0.278, 0.22, 0.11, 0.031] as const;\nconst STREAMER_ROTATIONS = STREAMER_OFFSETS.map((radians) => ({ cos: Math.cos(radians), sin: Math.sin(radians) }));\nconst seedHashCache = new Map<string, number>();\nconst noiseSeedCache = new Map<string, NoiseSeedConfig>();"
)

replace_exact(
    path,
    "  const field = document.createElement('canvas');\n  field.width = canvas.width;\n  field.height = canvas.height;",
    "  const field = document.createElement('canvas');\n  // Evaluate a bounded presentation raster, then let the soft cloud material\n  // upscale it. The artifact texture size and save/export contract remain unchanged.\n  field.width = Math.min(canvas.width, 256);\n  field.height = Math.min(canvas.height, 128);"
)

replace_exact(
    path,
    "  for (let index = 0; index < STREAMER_OFFSETS.length; index += 1) {\n    const sampleDirection = rotateDirectionAlongTangent(direction, tangent, STREAMER_OFFSETS[index]);\n    const sampleWeight = STREAMER_WEIGHTS[index];\n    total += sphericalValueNoise(sampleDirection, 4.4, seed) * sampleWeight;\n    weight += sampleWeight;\n  }",
    "  for (let index = 0; index < STREAMER_ROTATIONS.length; index += 1) {\n    const rotation = STREAMER_ROTATIONS[index];\n    const sampleDirection = normalizeVector(addVectors(\n      scaleVector(direction, rotation.cos),\n      scaleVector(tangent, rotation.sin)\n    ));\n    const sampleWeight = STREAMER_WEIGHTS[index];\n    total += sphericalValueNoise(sampleDirection, 4.4, seed) * sampleWeight;\n    weight += sampleWeight;\n  }"
)

replace_exact(
    path,
    "function sphericalValueNoise(direction: SphericalVector, frequency: number, seed: string): number {\n  const seedHash = hashSeed(seed);\n  const offsetX = seededUnit3(seedHash, 17, 31, 47) * 19.3;\n  const offsetY = seededUnit3(seedHash, 59, 71, 89) * 23.7;\n  const offsetZ = seededUnit3(seedHash, 101, 127, 149) * 17.9;\n  return smoothValueNoise3(\n    direction.x * frequency + offsetX,\n    direction.y * frequency + offsetY,\n    direction.z * frequency + offsetZ,\n    seedHash\n  );\n}",
    "function sphericalValueNoise(direction: SphericalVector, frequency: number, seed: string): number {\n  const config = noiseSeedConfig(seed);\n  return smoothValueNoise3(\n    direction.x * frequency + config.offsetX,\n    direction.y * frequency + config.offsetY,\n    direction.z * frequency + config.offsetZ,\n    config.hash\n  );\n}\n\nfunction noiseSeedConfig(seed: string): NoiseSeedConfig {\n  const cached = noiseSeedCache.get(seed);\n  if (cached) return cached;\n  const hash = hashSeed(seed);\n  const config = {\n    hash,\n    offsetX: seededUnit3(hash, 17, 31, 47) * 19.3,\n    offsetY: seededUnit3(hash, 59, 71, 89) * 23.7,\n    offsetZ: seededUnit3(hash, 101, 127, 149) * 17.9\n  };\n  noiseSeedCache.set(seed, config);\n  return config;\n}"
)

replace_exact(
    path,
    "function rotateDirectionAlongTangent(\n  direction: SphericalVector,\n  tangent: SphericalVector,\n  radians: number\n): SphericalVector {\n  if (Math.abs(radians) < 0.00000001) return direction;\n  const normalizedDirection = normalizeVector(direction);\n  const normalizedTangent = projectOntoTangent(tangent, normalizedDirection, sphericalFrameFromDirection(normalizedDirection).east);\n  const axis = normalizeVector(crossVectors(normalizedDirection, normalizedTangent));\n  const cosAngle = Math.cos(radians);\n  const sinAngle = Math.sin(radians);\n  const axisCrossDirection = crossVectors(axis, normalizedDirection);\n  const axisDotDirection = dotVectors(axis, normalizedDirection);\n  return normalizeVector(addVectors(\n    addVectors(scaleVector(normalizedDirection, cosAngle), scaleVector(axisCrossDirection, sinAngle)),\n    scaleVector(axis, axisDotDirection * (1 - cosAngle))\n  ));\n}",
    "function rotateDirectionAlongTangent(\n  direction: SphericalVector,\n  tangent: SphericalVector,\n  radians: number\n): SphericalVector {\n  if (Math.abs(radians) < 0.00000001) return direction;\n  const normalizedDirection = normalizeVector(direction);\n  const normalizedTangent = projectOntoTangent(tangent, normalizedDirection, orthogonalTangent(normalizedDirection));\n  return normalizeVector(addVectors(\n    scaleVector(normalizedDirection, Math.cos(radians)),\n    scaleVector(normalizedTangent, Math.sin(radians))\n  ));\n}\n\nfunction orthogonalTangent(direction: SphericalVector): SphericalVector {\n  const reference = Math.abs(direction.y) < 0.92\n    ? { x: 0, y: 1, z: 0 }\n    : { x: 1, y: 0, z: 0 };\n  return normalizeVector(crossVectors(reference, direction));\n}"
)

replace_exact(
    'refs/handoffs/system-visualization-enrichment.md',
    "- The cloud field is intrinsically continuous in globe space. It is rasterized to an equirectangular canvas only as a Three.js texture transport, and the cloud path does not average or blur the first and last texture columns.",
    "- The cloud field is intrinsically continuous in globe space. It is evaluated on a bounded procedural presentation raster, upscaled through the soft cloud material, and transported as an equirectangular Three.js texture. The cloud path does not average or blur the first and last texture columns."
)

replace_exact(
    'refs/testing/atmospheric-weather-visual-qa.md',
    "Clouds use globe-space procedural sampling. Each raster pixel is converted to a unit surface direction and local tangent frame before the generated wind field, source envelope, streamer, cell, and edge layers are evaluated. The resulting canvas remains equirectangular only because Three.js consumes it as a texture.",
    "Clouds use globe-space procedural sampling. Each bounded presentation-raster pixel is converted to a unit surface direction and local tangent frame before the generated wind field, source envelope, streamer, cell, and edge layers are evaluated. The soft material upscales that field to the artifact texture size; the resulting canvas remains equirectangular only because Three.js consumes it as a texture."
)

print('Optimized bounded Cycle 2.2 spherical cloud sampling.')

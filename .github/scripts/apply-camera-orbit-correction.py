from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one match, found {count}: {old[:100]!r}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once(
    'apps/desktop/src/appVersion.ts',
    "export const APP_VERSION = '0.3.38';",
    "export const APP_VERSION = '0.3.39';"
)

replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "  const interactionGroupRef = useRef<THREE.Group | null>(null);\n  const globeMeshRef = useRef<THREE.Mesh | null>(null);",
    "  const cameraOrbitRef = useRef<CameraOrbit>({ yaw: 0.55, pitch: 0 });\n  const globeMeshRef = useRef<THREE.Mesh | null>(null);"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "    camera.position.set(0, 0, globeCameraDistance(zoom));\n    camera.lookAt(0, 0, 0);\n    camera.updateProjectionMatrix();",
    "    applyCameraOrbit(camera, globeCameraDistance(zoom), cameraOrbitRef.current);\n    camera.updateProjectionMatrix();"
)

replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "    const globe = globeMeshRef.current;\n    const interactionGroup = interactionGroupRef.current;\n    if (!globe || !interactionGroup) return;",
    "    const globe = globeMeshRef.current;\n    const camera = cameraRef.current;\n    if (!globe || !camera) return;"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "      orientGlobeToDirection(interactionGroup, directionFromInspection(inspectionRecord));",
    "      orientCameraToGlobeDirection(camera, globe, directionFromInspection(inspectionRecord), globeCameraDistance(zoom), cameraOrbitRef.current);"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "  }, [diagnosticMode, focusTarget, inspectionRecord]);",
    "  }, [diagnosticMode, focusTarget, inspectionRecord, zoom]);"
)

replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "    const globe = globeMeshRef.current;\n    const interactionGroup = interactionGroupRef.current;\n    if (!globe || !interactionGroup) return;",
    "    const globe = globeMeshRef.current;\n    const camera = cameraRef.current;\n    if (!globe || !camera) return;"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "    orientGlobeToDirection(interactionGroup, direction);",
    "    orientCameraToGlobeDirection(camera, globe, direction, globeCameraDistance(zoom), cameraOrbitRef.current);"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "  }, [focusTarget]);",
    "  }, [focusTarget, zoom]);"
)

replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "    camera.position.set(0, 0, globeCameraDistance(zoom));\n    camera.lookAt(0, 0, 0);\n    cameraRef.current = camera;\n\n    const interactionGroup = new THREE.Group();\n    const axialTiltGroup = new THREE.Group();\n    const planetSpinGroup = new THREE.Group();\n    scene.add(interactionGroup);\n    interactionGroup.add(axialTiltGroup);\n    axialTiltGroup.add(planetSpinGroup);\n    interactionGroupRef.current = interactionGroup;",
    "    applyCameraOrbit(camera, globeCameraDistance(zoom), cameraOrbitRef.current);\n    cameraRef.current = camera;\n\n    const axialTiltGroup = new THREE.Group();\n    const planetSpinGroup = new THREE.Group();\n    scene.add(axialTiltGroup);\n    axialTiltGroup.add(planetSpinGroup);"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "    globe.castShadow = true;\n    globe.receiveShadow = true;\n    interactionGroup.rotation.y = -0.55;\n    planetSpinGroup.add(globe);",
    "    globe.castShadow = true;\n    globe.receiveShadow = true;\n    planetSpinGroup.add(globe);"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "      orientGlobeToDirection(interactionGroup, directionFromInspection(inspectionRecord));",
    "      orientCameraToGlobeDirection(camera, globe, directionFromInspection(inspectionRecord), globeCameraDistance(zoom), cameraOrbitRef.current);"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "      orientGlobeToDirection(interactionGroup, direction);",
    "      orientCameraToGlobeDirection(camera, globe, direction, globeCameraDistance(zoom), cameraOrbitRef.current);"
)

replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "    const drag = { active: false, x: 0, y: 0, startX: 0, startY: 0, vx: 0, vy: 0, resumePlaying: false };\n    let manualSpinOffset = 0;",
    "    const drag = { active: false, x: 0, y: 0, startX: 0, startY: 0, resumePlaying: false };\n    let fallbackSpin = 0;"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "      drag.vx = dx * 0.006;\n      drag.vy = dy * 0.004;\n      manualSpinOffset += drag.vx;\n      interactionGroup.rotation.x = clampGlobeTilt(interactionGroup.rotation.x + drag.vy);",
    "      updateCameraOrbitFromDrag(cameraOrbitRef.current, dx, dy);\n      applyCameraOrbit(camera, globeCameraDistance(zoom), cameraOrbitRef.current);"
)

replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "      if (primaryPresentation) {\n        const rotationPeriodDays = Math.max(0.08, Math.abs(primaryPresentation.rotationPeriodHours) / 24);\n        planetSpinGroup.rotation.y = simulationDays * Math.PI * 2 / rotationPeriodDays + manualSpinOffset;\n      } else if (!drag.active && !freezeSpinRef.current) {\n        manualSpinOffset += 0.0017;\n        planetSpinGroup.rotation.y = manualSpinOffset;\n      } else {\n        planetSpinGroup.rotation.y = manualSpinOffset;\n      }\n      host.dataset.simulationDays = simulationDays.toFixed(6);\n      host.dataset.planetSpinRadians = planetSpinGroup.rotation.y.toFixed(6);\n      if (!drag.active && !freezeSpinRef.current) {\n        interactionGroup.rotation.x = clampGlobeTilt(interactionGroup.rotation.x + drag.vy * 0.018);\n        drag.vx *= 0.94;\n        drag.vy *= 0.9;\n      }",
    "      if (primaryPresentation) {\n        const rotationPeriodDays = Math.max(0.08, Math.abs(primaryPresentation.rotationPeriodHours) / 24);\n        planetSpinGroup.rotation.y = simulationDays * Math.PI * 2 / rotationPeriodDays;\n      } else if (!drag.active && !freezeSpinRef.current) {\n        fallbackSpin += 0.0017;\n        planetSpinGroup.rotation.y = fallbackSpin;\n      } else {\n        planetSpinGroup.rotation.y = fallbackSpin;\n      }\n      host.dataset.simulationDays = simulationDays.toFixed(6);\n      host.dataset.planetSpinRadians = planetSpinGroup.rotation.y.toFixed(6);\n      host.dataset.cameraOrbitYaw = cameraOrbitRef.current.yaw.toFixed(6);\n      host.dataset.cameraOrbitPitch = cameraOrbitRef.current.pitch.toFixed(6);\n      host.dataset.observerControl = 'camera-orbit';"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "      interactionGroupRef.current = null;\n      cameraRef.current = null;",
    "      cameraRef.current = null;"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "      data-frame-reference={orbitalContext ? 'clock-spin-observer-separated' : 'legacy'}",
    "      data-frame-reference={orbitalContext ? 'fixed-world-camera-orbit' : 'camera-orbit'}"
)

replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "function orientGlobeToDirection(globe: THREE.Object3D, direction: THREE.Vector3) {\n  globe.quaternion.setFromUnitVectors(direction.clone().normalize(), new THREE.Vector3(0, 0, 1));\n}\n\nfunction globeCameraDistance(zoom: number): number {",
    "type CameraOrbit = { yaw: number; pitch: number };\n\nfunction applyCameraOrbit(camera: THREE.PerspectiveCamera, distance: number, orbit: CameraOrbit): void {\n  const cosPitch = Math.cos(orbit.pitch);\n  camera.position.set(\n    Math.sin(orbit.yaw) * cosPitch * distance,\n    Math.sin(orbit.pitch) * distance,\n    Math.cos(orbit.yaw) * cosPitch * distance\n  );\n  camera.up.set(0, 1, 0);\n  camera.lookAt(0, 0, 0);\n  camera.updateMatrixWorld();\n}\n\nfunction updateCameraOrbitFromDrag(orbit: CameraOrbit, deltaX: number, deltaY: number): void {\n  orbit.yaw -= deltaX * 0.006;\n  orbit.pitch = clampCameraOrbitPitch(orbit.pitch + deltaY * 0.004);\n}\n\nfunction orientCameraToGlobeDirection(\n  camera: THREE.PerspectiveCamera,\n  globe: THREE.Object3D,\n  localDirection: THREE.Vector3,\n  distance: number,\n  orbit: CameraOrbit\n): void {\n  globe.updateWorldMatrix(true, false);\n  const worldDirection = localDirection.clone().transformDirection(globe.matrixWorld).normalize();\n  orbit.yaw = Math.atan2(worldDirection.x, worldDirection.z);\n  orbit.pitch = clampCameraOrbitPitch(Math.asin(Math.max(-1, Math.min(1, worldDirection.y))));\n  applyCameraOrbit(camera, distance, orbit);\n}\n\nfunction globeCameraDistance(zoom: number): number {"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "function clampGlobeTilt(value: number): number {\n  return Math.max(-1.1, Math.min(1.1, value));\n}",
    "function clampCameraOrbitPitch(value: number): number {\n  const limit = Math.PI / 2 - 0.06;\n  return Math.max(-limit, Math.min(limit, value));\n}"
)

replace_once(
    'apps/desktop/src/release/ReleaseNotesModal.tsx',
    "          <section>\n            <p className=\"release-kicker\">Release 0.3.36</p>",
    "          <section>\n            <p className=\"release-kicker\">Release 0.3.39</p>\n            <h3>The camera moves. The planet keeps its job.</h3>\n            <ul>\n              <li>Horizontal and vertical globe drag now orbit the observer camera around the fixed physical system.</li>\n              <li>Generated axial tilt, clock-derived planetary spin, and stellar light remain authoritative during inspection.</li>\n              <li>Holding the globe pauses the shared clock, keeping geography and the day line locked while the camera inspects daylight, night, poles, and terminator.</li>\n            </ul>\n          </section>\n\n          <section>\n            <p className=\"release-kicker\">Release 0.3.36</p>"
)

replace_once(
    'refs/handoffs/system-visualization-enrichment.md',
    "- Physical spin is now an absolute function of shared simulation time plus a user scrub offset.\n- Horizontal globe drag scrubs the physical rotational phase through the fixed stellar light direction.\n- Vertical drag remains observer inspection tilt and does not rewrite generated axial tilt.\n- Pointer hold temporarily pauses the shared simulation clock and therefore pauses the planet, star/orbit phase, moons, and visible bodies together.\n- Pointer release restores the clock's prior play state.\n- The primary globe receives shadows and moon placeholders cast bounded PCF-soft shadows as a visual proof.\n- Clock-panel mobility/collapse and wider local-system framing remain backlog items.",
    "- Physical spin is an absolute function of shared simulation time only; inspection does not add a rotational offset.\n- Horizontal and vertical drag orbit the observer camera around the fixed planet-and-light system.\n- While the pointer is held, the shared clock pauses, keeping geography, axial tilt, moons, visible bodies, and the day line fixed relative to one another.\n- Camera orbit exposes the full daylight side, nightside, poles, and terminator without changing local planetary time.\n- Pointer release restores the clock's prior play state.\n- The primary globe receives shadows and moon placeholders cast bounded PCF-soft shadows as a visual proof.\n- Clock-panel mobility/collapse and wider local-system framing remain backlog items."
)
replace_once(
    'refs/testing/system-visualization-enrichment-qa.md',
    "- Horizontal drag changes physical spin while the stellar light direction remains external, visibly moving geography through the terminator.\n- Releasing restores the previous play/pause state.\n- Generated axial tilt remains unchanged by manual inspection.",
    "- Horizontal drag changes camera yaw while physical spin and stellar light remain fixed.\n- Vertical drag changes camera pitch while generated axial tilt remains fixed.\n- The rendered view changes during drag even though the planet's physical rotation value does not.\n- Camera orbit can inspect the full daylight side, nightside, poles, and terminator.\n- Releasing restores the previous play/pause state."
)

print('Applied camera-orbit frame correction.')

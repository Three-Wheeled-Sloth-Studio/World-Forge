from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one match, found {count}: {old[:80]!r}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once(
    'apps/desktop/src/simulation/systemSimulationClock.ts',
    "  setSpeedDaysPerSecond: (speed: number) => void;\n  setDayOfYear: (day: number) => void;",
    "  setSpeedDaysPerSecond: (speed: number) => void;\n  setSimulationDays: (days: number) => void;\n  setDayOfYear: (day: number) => void;"
)
replace_once(
    'apps/desktop/src/simulation/systemSimulationClock.ts',
    "    setDayOfYear: (day) => {\n      commit();",
    "    setSimulationDays: (days) => {\n      baseDays = Number.isFinite(days) ? days : baseDays;\n      baseRealMs = now();\n      publish();\n    },\n    setDayOfYear: (day) => {\n      commit();"
)
replace_once('apps/desktop/src/appVersion.ts', "export const APP_VERSION = '0.3.37';", "export const APP_VERSION = '0.3.38';")
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));\n    renderer.setClearColor(orbitalContext ? 0x02050a : 0x000000, orbitalContext ? 1 : 0);",
    "    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));\n    renderer.shadowMap.enabled = Boolean(orbitalContext);\n    renderer.shadowMap.type = THREE.PCFSoftShadowMap;\n    renderer.setClearColor(orbitalContext ? 0x02050a : 0x000000, orbitalContext ? 1 : 0);"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "    const globe = new THREE.Mesh(geometry, material);\n    interactionGroup.rotation.y = -0.55;",
    "    const globe = new THREE.Mesh(geometry, material);\n    globe.castShadow = true;\n    globe.receiveShadow = true;\n    interactionGroup.rotation.y = -0.55;"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "    const drag = { active: false, x: 0, y: 0, startX: 0, startY: 0, vx: 0, vy: 0 };",
    "    const drag = { active: false, x: 0, y: 0, startX: 0, startY: 0, vx: 0, vy: 0, resumePlaying: false };\n    let manualSpinOffset = 0;"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "    const onPointerDown = (event: PointerEvent) => {\n      drag.active = true;",
    "    const onPointerDown = (event: PointerEvent) => {\n      drag.resumePlaying = simulationClock.getSnapshot().playing;\n      simulationClock.setPlaying(false);\n      host.dataset.clockGrabState = 'held';\n      drag.active = true;"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "      drag.vx = dx * 0.006;\n      drag.vy = dy * 0.004;\n      interactionGroup.rotation.y += drag.vx;\n      interactionGroup.rotation.x = clampGlobeTilt(interactionGroup.rotation.x + drag.vy);",
    "      drag.vx = dx * 0.006;\n      drag.vy = dy * 0.004;\n      manualSpinOffset += drag.vx;\n      interactionGroup.rotation.x = clampGlobeTilt(interactionGroup.rotation.x + drag.vy);"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "      drag.active = false;\n      renderer.domElement.releasePointerCapture(event.pointerId);",
    "      drag.active = false;\n      renderer.domElement.releasePointerCapture(event.pointerId);\n      host.dataset.clockGrabState = 'released';\n      if (drag.resumePlaying) simulationClock.setPlaying(true);"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "        interactionGroup.rotation.y += drag.vx * 0.02;\n        interactionGroup.rotation.x = clampGlobeTilt(interactionGroup.rotation.x + drag.vy * 0.018);\n        if (primaryPresentation) {\n          const rotationPeriodDays = Math.max(0.08, Math.abs(primaryPresentation.rotationPeriodHours) / 24);\n          planetSpinGroup.rotation.y += simulationDeltaDays * Math.PI * 2 / rotationPeriodDays;\n        } else {\n          planetSpinGroup.rotation.y += 0.0017;\n        }",
    "        interactionGroup.rotation.x = clampGlobeTilt(interactionGroup.rotation.x + drag.vy * 0.018);\n        if (primaryPresentation) {\n          const rotationPeriodDays = Math.max(0.08, Math.abs(primaryPresentation.rotationPeriodHours) / 24);\n          planetSpinGroup.rotation.y = simulationDays * Math.PI * 2 / rotationPeriodDays + manualSpinOffset;\n        } else {\n          manualSpinOffset += 0.0017;\n          planetSpinGroup.rotation.y = manualSpinOffset;\n        }"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "      const simulationDeltaDays = simulationDays - previousSimulationDays;\n      previousSimulationDays = simulationDays;",
    "      const simulationDeltaDays = simulationDays - previousSimulationDays;\n      previousSimulationDays = simulationDays;\n      host.dataset.simulationDays = simulationDays.toFixed(6);\n      host.dataset.planetSpinRadians = planetSpinGroup.rotation.y.toFixed(6);"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 30, 16), material);\n  group.add(mesh);",
    "  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 30, 16), material);\n  mesh.castShadow = true;\n  mesh.receiveShadow = true;\n  group.add(mesh);"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "  const sun = new THREE.DirectionalLight(starColor, 3.25);\n  scene.add(sun);",
    "  const sun = new THREE.DirectionalLight(starColor, 3.25);\n  sun.castShadow = true;\n  sun.shadow.mapSize.set(2048, 2048);\n  sun.shadow.camera.near = 0.1;\n  sun.shadow.camera.far = 16;\n  sun.shadow.camera.left = -4;\n  sun.shadow.camera.right = 4;\n  sun.shadow.camera.top = 4;\n  sun.shadow.camera.bottom = -4;\n  sun.shadow.bias = -0.00015;\n  sun.shadow.normalBias = 0.015;\n  scene.add(sun);"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "      data-system-star-light={orbitalContext ? 'coupled' : 'fallback'}",
    "      data-system-star-light={orbitalContext ? 'coupled' : 'fallback'}\n      data-frame-reference={orbitalContext ? 'clock-spin-observer-separated' : 'legacy'}\n      data-moon-shadow-mode={orbitalContext ? 'pcf-soft-proof' : 'disabled'}"
)
replace_once(
    'refs/handoffs/system-visualization-enrichment.md',
    "## Current boundaries\n",
    "## Frame-of-reference correction\n\n- Physical spin is now an absolute function of shared simulation time plus a user scrub offset.\n- Horizontal globe drag scrubs the physical rotational phase through the fixed stellar light direction.\n- Vertical drag remains observer inspection tilt and does not rewrite generated axial tilt.\n- Pointer hold temporarily pauses the shared simulation clock and therefore pauses the planet, star/orbit phase, moons, and visible bodies together.\n- Pointer release restores the clock's prior play state.\n- The primary globe receives shadows and moon placeholders cast bounded PCF-soft shadows as a visual proof.\n- Clock-panel mobility/collapse and wider local-system framing remain backlog items.\n\n## Current boundaries\n"
)
replace_once(
    'refs/testing/system-visualization-enrichment-qa.md',
    "## Manual visual review\n",
    "## Frame-of-reference acceptance\n\n- Grabbing the globe pauses the shared clock and all orbital motion.\n- Holding the pointer keeps simulation time stable.\n- Horizontal drag changes physical spin while the stellar light direction remains external, visibly moving geography through the terminator.\n- Releasing restores the previous play/pause state.\n- Generated axial tilt remains unchanged by manual inspection.\n- Moon meshes cast and the primary globe receives bounded soft shadows when alignment permits.\n\n## Manual visual review\n"
)
print('Applied globe frame-reference correction slice.')

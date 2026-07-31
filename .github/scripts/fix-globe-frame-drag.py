from pathlib import Path

path = Path('apps/desktop/src/globe/GlobeViewer.tsx')
text = path.read_text(encoding='utf-8')
old = """      const simulationDays = simulationClock.currentDays(performance.now());
      const simulationDeltaDays = simulationDays - previousSimulationDays;
      previousSimulationDays = simulationDays;
      host.dataset.simulationDays = simulationDays.toFixed(6);
      host.dataset.planetSpinRadians = planetSpinGroup.rotation.y.toFixed(6);
      if (!drag.active && !freezeSpinRef.current) {
        interactionGroup.rotation.x = clampGlobeTilt(interactionGroup.rotation.x + drag.vy * 0.018);
        if (primaryPresentation) {
          const rotationPeriodDays = Math.max(0.08, Math.abs(primaryPresentation.rotationPeriodHours) / 24);
          planetSpinGroup.rotation.y = simulationDays * Math.PI * 2 / rotationPeriodDays + manualSpinOffset;
        } else {
          manualSpinOffset += 0.0017;
          planetSpinGroup.rotation.y = manualSpinOffset;
        }
        drag.vx *= 0.94;
        drag.vy *= 0.9;
      }
"""
new = """      const simulationDays = simulationClock.currentDays(performance.now());
      const simulationDeltaDays = simulationDays - previousSimulationDays;
      previousSimulationDays = simulationDays;
      if (primaryPresentation) {
        const rotationPeriodDays = Math.max(0.08, Math.abs(primaryPresentation.rotationPeriodHours) / 24);
        planetSpinGroup.rotation.y = simulationDays * Math.PI * 2 / rotationPeriodDays + manualSpinOffset;
      } else if (!drag.active && !freezeSpinRef.current) {
        manualSpinOffset += 0.0017;
        planetSpinGroup.rotation.y = manualSpinOffset;
      } else {
        planetSpinGroup.rotation.y = manualSpinOffset;
      }
      host.dataset.simulationDays = simulationDays.toFixed(6);
      host.dataset.planetSpinRadians = planetSpinGroup.rotation.y.toFixed(6);
      if (!drag.active && !freezeSpinRef.current) {
        interactionGroup.rotation.x = clampGlobeTilt(interactionGroup.rotation.x + drag.vy * 0.018);
        drag.vx *= 0.94;
        drag.vy *= 0.9;
      }
"""
if text.count(old) != 1:
    raise RuntimeError(f'Expected one patched animation block, found {text.count(old)}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('Moved physical spin calculation outside pointer guard.')

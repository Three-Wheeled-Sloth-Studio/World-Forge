import React, { useLayoutEffect, useMemo } from 'react';
import type { SystemOrbitalContextArtifact, WorldProject } from '@world-forge/shared';
import type { StellarSurfaceEnrichmentController } from '../enrichment/useStellarSurfaceEnrichment';
import type { SystemSimulationClock } from '../simulation/systemSimulationClock';
import type { BodyGenerationQueueController } from '../enrichment/useBodyGenerationQueue';
import { SystemViewer as SystemViewerBase } from './SystemViewerBase';
import { buildSystemCatalog } from './systemPresentation';
import {
  applySystemSelectorHierarchy,
  buildSystemSelectorOptions,
} from './systemSelectorHierarchy';

export function SystemViewer({
  project,
  orbitalContext,
  simulationClock,
  bodyGeneration,
  stellarSurface,
  zoom,
  onZoom,
  onOpenGlobe,
}: {
  project: WorldProject;
  orbitalContext: SystemOrbitalContextArtifact | null;
  simulationClock: SystemSimulationClock;
  bodyGeneration: BodyGenerationQueueController;
  stellarSurface: StellarSurfaceEnrichmentController;
  zoom: number;
  onZoom: (event: WheelEvent) => void;
  onOpenGlobe: (bodyId: string) => void;
}) {
  const selectorOptions = useMemo(
    () => orbitalContext
      ? buildSystemSelectorOptions(buildSystemCatalog(project, orbitalContext))
      : [],
    [
      orbitalContext?.artifactSignature,
      project.bodyGeneration?.updatedAt,
      project.primaryWorld.name,
      project.projectId,
      project.projectName,
    ],
  );

  useLayoutEffect(() => {
    const selector = document.getElementById('selected-system-body') as HTMLSelectElement | null;
    if (!selector) return undefined;
    const viewer = selector.closest('.system-viewer') as HTMLElement | null;
    let frame = 0;
    let repairPasses = 0;

    const applyHierarchy = () => {
      const repairs = applySystemSelectorHierarchy(selector, selectorOptions);
      if (!viewer) return;
      repairPasses += 1;
      viewer.dataset.systemSelectorHierarchy = 'catalog-parent-v1';
      viewer.dataset.systemSelectorHierarchyPasses = String(repairPasses);
      viewer.dataset.systemSelectorLastRepairCount = String(repairs);
    };

    const scheduleRepair = () => {
      window.cancelAnimationFrame(frame);
      queueMicrotask(applyHierarchy);
      frame = window.requestAnimationFrame(applyHierarchy);
    };

    const onChange = () => {
      if (viewer) {
        const changes = Number(viewer.dataset.systemSelectorChangeCount ?? 0) + 1;
        viewer.dataset.systemSelectorChangeCount = String(changes);
        viewer.dataset.systemSelectorLastBody = selector.value;
      }
      scheduleRepair();
    };

    applyHierarchy();
    selector.addEventListener('change', onChange);
    const observer = new MutationObserver(scheduleRepair);
    observer.observe(selector, { childList: true, subtree: true, characterData: true });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      selector.removeEventListener('change', onChange);
    };
  }, [selectorOptions]);

  return (
    <SystemViewerBase
      project={project}
      orbitalContext={orbitalContext}
      simulationClock={simulationClock}
      bodyGeneration={bodyGeneration}
      stellarSurface={stellarSurface}
      zoom={zoom}
      onZoom={onZoom}
      onOpenGlobe={onOpenGlobe}
    />
  );
}

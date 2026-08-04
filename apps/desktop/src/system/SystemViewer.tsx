import React, { useEffect, useMemo } from 'react';
import type { SystemOrbitalContextArtifact, WorldProject } from '@world-forge/shared';
import type { StellarSurfaceEnrichmentController } from '../enrichment/useStellarSurfaceEnrichment';
import type { SystemSimulationClock } from '../simulation/systemSimulationClock';
import type { BodyGenerationQueueController } from '../enrichment/useBodyGenerationQueue';
import { SystemViewer as SystemViewerBase } from './SystemViewerBase';
import { buildSystemCatalog } from './systemPresentation';
import { buildSystemSelectorOptions } from './systemSelectorHierarchy';

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

  useEffect(() => {
    const applyHierarchy = () => {
      const selector = document.getElementById('selected-system-body') as HTMLSelectElement | null;
      if (!selector) return;
      const byId = new Map(selectorOptions.map((option) => [option.id, option]));
      for (const htmlOption of Array.from(selector.options)) {
        const option = byId.get(htmlOption.value);
        if (!option) continue;
        htmlOption.textContent = option.label;
        htmlOption.label = option.label;
        htmlOption.dataset.bodyDepth = String(option.depth);
        if (option.parentBodyId) htmlOption.dataset.parentBodyId = option.parentBodyId;
        else delete htmlOption.dataset.parentBodyId;
      }
      selector.dataset.hierarchy = 'catalog-parent-v1';
    };
    applyHierarchy();
    const frame = window.requestAnimationFrame(applyHierarchy);
    return () => window.cancelAnimationFrame(frame);
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

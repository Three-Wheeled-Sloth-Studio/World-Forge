import React, { useMemo } from 'react';
import type {
  AtmosphericWeatherPresentationArtifact,
  SeasonalSurfaceModelArtifact,
  SystemOrbitalContextArtifact,
  WorldProject,
} from '@world-forge/shared';
import type { MapMode, MapTheme, PointInspectionRecord, RenderMode } from '@world-forge/renderer';
import type { SystemSimulationClock } from '../simulation/systemSimulationClock';
import { GlobeViewer as GeographicGlobeViewer } from './GeographicGlobeViewer';
import type { GlobeDebugMode, GlobeFocusTarget } from './GeographicGlobeViewer';
import { resolveGlobeBodyTarget } from './globeBodyTarget';
import { AtmosphericGlobeViewer } from './AtmosphericGlobeViewer';

export type { GlobeDebugMode, GlobeFocusTarget } from './GeographicGlobeViewer';

export type GlobeViewerProps = {
  project: WorldProject;
  orbitalContext: SystemOrbitalContextArtifact | null;
  weatherPresentation: AtmosphericWeatherPresentationArtifact | null;
  seasonalSurface: SeasonalSurfaceModelArtifact | null;
  simulationClock: SystemSimulationClock;
  mapMode: MapMode;
  renderMode: RenderMode;
  mapTheme: MapTheme;
  showRivers: boolean;
  showPlates: boolean;
  showGlobeShells: boolean;
  showClouds: boolean;
  showWeather: boolean;
  showSeasonalSurface: boolean;
  globeDebugMode: GlobeDebugMode;
  diagnosticMode: boolean;
  inspectionRecord: PointInspectionRecord | null;
  focusTarget: GlobeFocusTarget | null;
  zoom: number;
  onZoom: (event: WheelEvent) => void;
  onInspect: (x: number, y: number, screen: { x: number; y: number }) => void;
  targetBodyId: string;
  onTargetBodyChange: (bodyId: string) => void;
};

export function GlobeViewer(props: GlobeViewerProps) {
  const target = useMemo(
    () => props.orbitalContext
      ? resolveGlobeBodyTarget(props.project, props.orbitalContext, props.targetBodyId)
      : null,
    [
      props.orbitalContext?.artifactSignature,
      props.project.bodyGeneration?.updatedAt,
      props.project.enrichmentArtifacts,
      props.project.projectId,
      props.targetBodyId,
    ],
  );

  if (
    props.orbitalContext
    && target?.mode === 'atmospheric-presentation-body'
    && target.atmosphericDetail
  ) {
    return (
      <AtmosphericGlobeViewer
        project={props.project}
        orbitalContext={props.orbitalContext}
        target={target}
        simulationClock={props.simulationClock}
        zoom={props.zoom}
        onZoom={props.onZoom}
        onTargetBodyChange={props.onTargetBodyChange}
      />
    );
  }

  return <GeographicGlobeViewer {...props} />;
}

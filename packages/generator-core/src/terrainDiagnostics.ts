export type TerrainDiagnosticStage =
  | 'primordial'
  | 'initial-tectonic'
  | 'pre-deep-time'
  | 'post-fragment-placement'
  | 'post-surface-aging'
  | 'post-fragment-history';

export type TerrainDiagnosticSnapshot = {
  stage: TerrainDiagnosticStage;
  elevation: Float32Array;
  plates?: Uint16Array;
};

export type TerrainDiagnosticSnapshotCallback = (snapshot: TerrainDiagnosticSnapshot) => void;

export type TerrainDiagnosticBypasses = {
  fragmentPlacement?: boolean;
  fragmentHistoryTerrainResponse?: boolean;
};

export function emitTerrainDiagnosticSnapshot(
  callback: TerrainDiagnosticSnapshotCallback | undefined,
  stage: TerrainDiagnosticStage,
  elevation: Float32Array,
  plates?: Uint16Array
): void {
  if (!callback) return;
  callback({
    stage,
    elevation: new Float32Array(elevation),
    plates: plates ? new Uint16Array(plates) : undefined
  });
}

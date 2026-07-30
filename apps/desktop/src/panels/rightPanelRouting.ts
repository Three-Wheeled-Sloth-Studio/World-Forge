import type { WorkspaceMode } from '../workspace/workspaceModes';

export type RightPanelContext = 'build' | 'world' | 'point' | 'drilldown' | 'hex' | 'export' | 'diagnostics';

export type RightPanelContextInput = {
  workspaceMode: WorkspaceMode;
  developerMode: boolean;
  hasPointInspection: boolean;
  drilldownActive: boolean;
  hasHexInspection: boolean;
};

export function resolveRightPanelContext(input: RightPanelContextInput): RightPanelContext {
  if (input.developerMode) return 'diagnostics';
  if (input.workspaceMode === 'build') return 'build';
  if (input.workspaceMode === 'export') return 'export';
  if (input.hasPointInspection) return 'point';
  if (input.drilldownActive) return 'drilldown';
  if (input.hasHexInspection) return 'hex';
  return 'world';
}

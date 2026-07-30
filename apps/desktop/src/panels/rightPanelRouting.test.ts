import { describe, expect, it } from 'vitest';
import { resolveRightPanelContext } from './rightPanelRouting';

describe('resolveRightPanelContext', () => {
  const explore = {
    workspaceMode: 'explore' as const,
    developerMode: false,
    hasPointInspection: false,
    drilldownActive: false,
    hasHexInspection: false,
  };

  it('routes Build and Export directly from workspace mode', () => {
    expect(resolveRightPanelContext({ ...explore, workspaceMode: 'build' })).toBe('build');
    expect(resolveRightPanelContext({ ...explore, workspaceMode: 'export' })).toBe('export');
  });

  it('keeps diagnostics developer-only', () => {
    expect(resolveRightPanelContext({ ...explore, developerMode: true })).toBe('diagnostics');
    expect(resolveRightPanelContext({ ...explore, workspaceMode: 'build', developerMode: true })).toBe('diagnostics');
  });

  it('shows the world summary when Explore has no selection', () => {
    expect(resolveRightPanelContext(explore)).toBe('world');
  });

  it('prioritizes point inspection over other Explore contexts', () => {
    expect(resolveRightPanelContext({
      ...explore,
      hasPointInspection: true,
      drilldownActive: true,
      hasHexInspection: true,
    })).toBe('point');
  });

  it('prioritizes active geographic drilldown over a stale hex selection', () => {
    expect(resolveRightPanelContext({ ...explore, drilldownActive: true, hasHexInspection: true })).toBe('drilldown');
  });

  it('shows the hex inspector when it is the only Explore selection', () => {
    expect(resolveRightPanelContext({ ...explore, hasHexInspection: true })).toBe('hex');
  });
});

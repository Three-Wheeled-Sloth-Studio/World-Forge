import React, { useEffect } from 'react';
import {
  WorldWorkspace as BaseWorldWorkspace,
  type WorldWorkspaceProps,
} from './WorldWorkspaceBase';

export type {
  WorkspaceGlobeDebugMode,
  WorkspaceViewMode,
  WorldWorkspaceProps,
} from './WorldWorkspaceBase';

export function WorldWorkspace(props: WorldWorkspaceProps) {
  const ttrpgActive = (props.renderMode as string) === 'ttrpg';
  const supportsTtrpg = props.viewMode === 'map' && props.mapMode === 'biomes';

  useEffect(() => {
    if (ttrpgActive && !supportsTtrpg) props.onRenderModeChange('natural');
  }, [props.onRenderModeChange, supportsTtrpg, ttrpgActive]);

  const displayActions = (
    <>
      {supportsTtrpg && (
        <button
          type="button"
          className={`explore-layer-toggle ttrpg-world-map-toggle ${ttrpgActive ? 'active' : ''}`}
          aria-pressed={ttrpgActive}
          onClick={() => props.onRenderModeChange((ttrpgActive ? 'natural' : 'ttrpg') as typeof props.renderMode)}
        >
          <span>Hand-drawn map</span>
          <small>{ttrpgActive ? 'On' : 'Off'}</small>
        </button>
      )}
      {props.displayActions}
    </>
  );

  return (
    <BaseWorldWorkspace
      {...props}
      renderMode={ttrpgActive ? 'natural' : props.renderMode}
      displayActions={displayActions}
    />
  );
}

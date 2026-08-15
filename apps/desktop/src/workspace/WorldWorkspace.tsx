import React, { useEffect } from 'react';
import {
  WorldWorkspace as BaseWorldWorkspace,
  type WorldWorkspaceProps,
} from './WorldWorkspaceBase';
import {
  isTtrpgWorldPresentation,
  supportsTtrpgWorldPresentation,
} from './workspacePresentations';

export type {
  WorkspaceGlobeDebugMode,
  WorkspaceViewMode,
  WorldWorkspaceProps,
} from './WorldWorkspaceBase';

export function WorldWorkspace(props: WorldWorkspaceProps) {
  const ttrpgActive = isTtrpgWorldPresentation(props.renderMode as string);
  const supportsTtrpg = supportsTtrpgWorldPresentation(props.viewMode, props.mapMode);

  useEffect(() => {
    if (ttrpgActive && !supportsTtrpg) props.onRenderModeChange('natural');
  }, [props.onRenderModeChange, supportsTtrpg, ttrpgActive]);

  return <BaseWorldWorkspace {...props} />;
}

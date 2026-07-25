import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { WorldProject } from '@world-forge/shared';
import { SavedMapRecord } from '../sync';
import { defaultWorldStorageProvider, localWorldStorageLimits, mergeSavedMapRecords } from '../storage';
import {
  WORLD_FORGE_RENAME_REQUEST_EVENT,
  expectedParentOrigin,
  isParchmentWorldInventoryRequest,
  notifyParchmentWorldIdentity,
  notifyParchmentWorldInventory,
  parseParchmentSetWorldNameMessage,
  prepareWorldProjectForSave,
  readEmbeddedWorldContext,
  rememberWorldName,
  renameWorldProject,
  type WorldRenameRequestDetail,
} from './worldIdentityBridge';

type UseWorldLibraryCommandsOptions = {
  project: WorldProject | null;
  setProject: Dispatch<SetStateAction<WorldProject | null>>;
  setSavedMaps: Dispatch<SetStateAction<SavedMapRecord[]>>;
  onWorldLoaded: (project: WorldProject) => void;
};

export function useWorldLibraryCommands({
  project,
  setProject,
  setSavedMaps,
  onWorldLoaded
}: UseWorldLibraryCommandsOptions) {
  const [worldLibraryStatus, setWorldLibraryStatus] = useState('');

  const publishInventory = async () => {
    notifyParchmentWorldInventory(await defaultWorldStorageProvider.listWorlds());
  };

  useEffect(() => {
    void publishInventory().catch(() => undefined);
  }, []);

  useEffect(() => {
    const renameProject = async (projectId: string, requestedName: string, notifyParent: boolean) => {
      const stored = await defaultWorldStorageProvider.loadWorld(projectId);
      const source = project?.projectId === projectId ? project : stored;
      if (!source) throw new Error('The world is no longer available.');

      const renamed = {
        ...renameWorldProject(source, requestedName),
        updatedAt: new Date().toISOString(),
      };

      if (stored) {
        const record = await defaultWorldStorageProvider.saveWorld(renamed);
        setSavedMaps((current) => mergeSavedMapRecords([record], current));
        await publishInventory();
      }
      rememberWorldName(renamed.projectId, renamed.projectName);
      if (project?.projectId === projectId) setProject(renamed);
      if (notifyParent && project?.projectId === projectId) {
        notifyParchmentWorldIdentity(renamed, 'renamed');
      }
      setWorldLibraryStatus(`Renamed world to ${renamed.projectName}`);
    };

    const onRenameRequest = (event: Event) => {
      const detail = (event as CustomEvent<WorldRenameRequestDetail>).detail;
      if (!detail?.projectId || !detail.worldName) return;
      void renameProject(detail.projectId, detail.worldName, true).then(detail.resolve, detail.reject);
    };

    const embeddedContext = readEmbeddedWorldContext();
    const onParentMessage = (event: MessageEvent<unknown>) => {
      if (!embeddedContext.embedded || event.source !== globalThis.parent) return;
      const parentOrigin = expectedParentOrigin();
      if (parentOrigin !== '*' && event.origin !== parentOrigin) return;

      if (isParchmentWorldInventoryRequest(event.data, embeddedContext.projectId)) {
        void publishInventory().catch((error: unknown) => {
          setWorldLibraryStatus(error instanceof Error ? error.message : 'World inventory could not be published.');
        });
        return;
      }

      const worldName = parseParchmentSetWorldNameMessage(event.data, embeddedContext.projectId);
      if (!worldName || !project) return;
      void renameProject(project.projectId, worldName, false).catch((error: unknown) => {
        setWorldLibraryStatus(error instanceof Error ? error.message : 'World name could not be updated.');
      });
    };

    globalThis.addEventListener(WORLD_FORGE_RENAME_REQUEST_EVENT, onRenameRequest as EventListener);
    globalThis.addEventListener('message', onParentMessage);
    return () => {
      globalThis.removeEventListener(WORLD_FORGE_RENAME_REQUEST_EVENT, onRenameRequest as EventListener);
      globalThis.removeEventListener('message', onParentMessage);
    };
  }, [project, setProject, setSavedMaps]);

  const saveCurrentWorldInApp = async () => {
    if (!project) return;
    setWorldLibraryStatus('Saving world...');
    try {
      const preparedProject = prepareWorldProjectForSave(project);
      const projectToSave = { ...preparedProject, updatedAt: new Date().toISOString() };
      const record = await defaultWorldStorageProvider.saveWorld(projectToSave);
      rememberWorldName(projectToSave.projectId, projectToSave.projectName);
      setProject(projectToSave);
      setSavedMaps((current) => mergeSavedMapRecords([record], current).slice(0, localWorldStorageLimits.maxSavedWorlds));
      notifyParchmentWorldIdentity(projectToSave, 'saved');
      await publishInventory();
      setWorldLibraryStatus(`Saved ${projectToSave.projectName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save world';
      setWorldLibraryStatus(message);
      throw error;
    }
  };

  const loadStoredWorld = async (record: SavedMapRecord) => {
    setWorldLibraryStatus(`Loading ${record.projectName}...`);
    try {
      const loaded = await defaultWorldStorageProvider.loadWorld(record.projectId);
      if (!loaded) {
        setWorldLibraryStatus('Saved world data is not available on this machine.');
        return;
      }
      rememberWorldName(loaded.projectId, loaded.projectName);
      onWorldLoaded(loaded);
      notifyParchmentWorldIdentity(loaded, 'saved');
      setWorldLibraryStatus(`Loaded ${loaded.projectName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load world';
      setWorldLibraryStatus(message);
      throw error;
    }
  };

  const deleteStoredWorld = async (record: SavedMapRecord) => {
    setWorldLibraryStatus(`Removing ${record.projectName}...`);
    try {
      await defaultWorldStorageProvider.deleteWorld(record.projectId);
      setSavedMaps((current) => current.filter((entry) => entry.projectId !== record.projectId));
      await publishInventory();
      setWorldLibraryStatus(`Removed ${record.projectName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to remove world';
      setWorldLibraryStatus(message);
    }
  };

  return {
    worldLibraryStatus,
    saveCurrentWorldInApp,
    loadStoredWorld,
    deleteStoredWorld
  };
}

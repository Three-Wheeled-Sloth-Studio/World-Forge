import { Dispatch, SetStateAction, useState } from 'react';
import { WorldProject } from '@world-forge/shared';
import { SavedMapRecord } from '../sync';
import { defaultWorldStorageProvider, localWorldStorageLimits, mergeSavedMapRecords } from '../storage';
import type { WorldLibraryOperation } from './WorldLibraryOperationOverlay';
import {
  notifyParchmentWorldIdentity,
  prepareWorldProjectForSave,
  renameWorldProject,
} from './worldIdentityBridge';

type UseWorldLibraryCommandsOptions = {
  project: WorldProject | null;
  savedMaps: SavedMapRecord[];
  setProject: Dispatch<SetStateAction<WorldProject | null>>;
  setSavedMaps: Dispatch<SetStateAction<SavedMapRecord[]>>;
  onWorldLoaded: (project: WorldProject) => void;
};

export function useWorldLibraryCommands({
  project,
  savedMaps,
  setProject,
  setSavedMaps,
  onWorldLoaded
}: UseWorldLibraryCommandsOptions) {
  const [worldLibraryStatus, setWorldLibraryStatus] = useState('');
  const [worldLibraryOperation, setWorldLibraryOperation] = useState<WorldLibraryOperation | null>(null);

  const saveCurrentWorldInApp = async () => {
    if (!project || worldLibraryOperation) return;
    const preparedProject = prepareWorldProjectForSave(project);
    const projectToSave = { ...preparedProject, updatedAt: new Date().toISOString() };
    setWorldLibraryStatus('Saving world...');
    setWorldLibraryOperation({
      kind: 'saving',
      title: `Saving ${projectToSave.projectName}`,
      detail: 'Writing the generated world and its current settings to the local world library.',
    });
    try {
      const record = await defaultWorldStorageProvider.saveWorld(projectToSave);
      setProject(projectToSave);
      setSavedMaps((current) => mergeSavedMapRecords([record], current).slice(0, localWorldStorageLimits.maxSavedWorlds));
      notifyParchmentWorldIdentity(projectToSave, 'saved');
      setWorldLibraryStatus(`Saved ${projectToSave.projectName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save world';
      setWorldLibraryStatus(message);
      throw error;
    } finally {
      setWorldLibraryOperation(null);
    }
  };

  const loadStoredWorld = async (record: SavedMapRecord) => {
    if (worldLibraryOperation) return;
    setWorldLibraryStatus(`Loading ${record.projectName}...`);
    setWorldLibraryOperation({
      kind: 'loading',
      title: `Loading ${record.projectName}`,
      detail: 'Reading saved world data and replacing the active World Forge workspace.',
    });
    try {
      const loaded = await defaultWorldStorageProvider.loadWorld(record.projectId);
      if (!loaded) {
        setWorldLibraryStatus('Saved world data is not available on this machine.');
        return;
      }
      onWorldLoaded(loaded);
      setWorldLibraryStatus(`Loaded ${loaded.projectName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load world';
      setWorldLibraryStatus(message);
      throw error;
    } finally {
      setWorldLibraryOperation(null);
    }
  };

  const renameCurrentWorld = async (requestedName: string) => {
    if (!project || worldLibraryOperation) return;
    const renamed = {
      ...renameWorldProject(project, requestedName),
      updatedAt: new Date().toISOString(),
    };
    const alreadySaved = savedMaps.some((record) => record.projectId === project.projectId);

    if (alreadySaved) {
      setWorldLibraryOperation({
        kind: 'saving',
        title: `Renaming ${project.projectName}`,
        detail: 'Updating the saved world identity in the local library.',
      });
    }

    try {
      if (alreadySaved) {
        const record = await defaultWorldStorageProvider.saveWorld(renamed);
        setSavedMaps((current) => mergeSavedMapRecords([record], current));
      }
      setProject(renamed);
      notifyParchmentWorldIdentity(renamed, 'renamed');
      setWorldLibraryStatus(`Renamed world to ${renamed.projectName}`);
    } finally {
      setWorldLibraryOperation(null);
    }
  };

  const renameStoredWorld = async (record: SavedMapRecord, requestedName: string) => {
    if (worldLibraryOperation) return;
    setWorldLibraryOperation({
      kind: 'saving',
      title: `Renaming ${record.projectName}`,
      detail: 'Updating the saved world identity in the local library.',
    });
    try {
      const loaded = await defaultWorldStorageProvider.loadWorld(record.projectId);
      if (!loaded) throw new Error('Saved world data is not available on this machine.');
      const renamed = {
        ...renameWorldProject(loaded, requestedName),
        updatedAt: new Date().toISOString(),
      };
      const nextRecord = await defaultWorldStorageProvider.saveWorld(renamed);
      setSavedMaps((current) => mergeSavedMapRecords([nextRecord], current));
      if (project?.projectId === record.projectId) {
        setProject(renamed);
        notifyParchmentWorldIdentity(renamed, 'renamed');
      }
      setWorldLibraryStatus(`Renamed world to ${renamed.projectName}`);
    } finally {
      setWorldLibraryOperation(null);
    }
  };

  const deleteStoredWorld = async (record: SavedMapRecord) => {
    setWorldLibraryStatus(`Removing ${record.projectName}...`);
    try {
      await defaultWorldStorageProvider.deleteWorld(record.projectId);
      setSavedMaps((current) => current.filter((entry) => entry.projectId !== record.projectId));
      setWorldLibraryStatus(`Removed ${record.projectName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to remove world';
      setWorldLibraryStatus(message);
    }
  };

  return {
    worldLibraryStatus,
    worldLibraryOperation,
    saveCurrentWorldInApp,
    loadStoredWorld,
    renameCurrentWorld,
    renameStoredWorld,
    deleteStoredWorld
  };
}

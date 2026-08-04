import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { exportWforge, importWforge } from '@world-forge/exporters';
import { WorldProject } from '@world-forge/shared';
import { readWorldBodyCatalog, withActiveWorldBody } from '@world-forge/shared/worldBodies';
import { rememberSessionActiveWorldBody, sessionActiveWorldBodyId } from '@world-forge/shared/worldBodySession';
import { SavedMapRecord } from '../sync';
import {
  defaultWorldStorageProvider,
  localWorldStorageLimits,
  mergeSavedMapRecords,
  type ReplayReadySavedMapRecord,
} from '../storage';
import {
  WORLD_FORGE_RENAME_REQUEST_EVENT,
  WORLD_FORGE_REPLAY_REQUEST_EVENT,
  expectedParentOrigin,
  isParchmentWorldInventoryRequest,
  notifyParchmentReplayResult,
  notifyParchmentWorldIdentity,
  notifyParchmentWorldInventory,
  parseParchmentReplayWorldMessage,
  parseParchmentSetWorldNameMessage,
  prepareWorldProjectForSave,
  readEmbeddedWorldContext,
  rememberWorldName,
  renameWorldProject,
  type WorldRenameRequestDetail,
} from './worldIdentityBridge';
import {
  notifyParchmentSystemPackageResult,
  notifyParchmentSystemPackageSaved,
  parseParchmentSystemPackageMessage,
  type WorldForgeSystemPackageRequest,
} from './systemPackageBridge';
import { assessWorldReplayCompatibility } from './worldReplayManifest';

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
  const onWorldLoadedRef = useRef(onWorldLoaded);
  const embeddedSystemPackageRef = useRef<WorldForgeSystemPackageRequest | null>(null);
  onWorldLoadedRef.current = onWorldLoaded;

  const publishInventory = async () => {
    const stored = await defaultWorldStorageProvider.listWorlds();
    const byId = new Map<string, ReplayReadySavedMapRecord>();
    for (const record of savedMaps) byId.set(record.projectId, record);
    for (const record of stored) byId.set(record.projectId, record);
    notifyParchmentWorldInventory([...byId.values()]);
  };

  useEffect(() => {
    const context = readEmbeddedWorldContext();
    if (!context.embedded || !context.worldProjectId) return undefined;
    let active = true;
    setWorldLibraryStatus(`Loading ${context.worldName ?? 'linked world'}...`);
    void defaultWorldStorageProvider.loadWorld(context.worldProjectId)
      .then((loaded) => {
        if (!active) return;
        if (!loaded) {
          setWorldLibraryStatus('The linked World Forge map is not available on this device.');
          return;
        }
        rememberWorldName(loaded.projectId, loaded.projectName);
        onWorldLoadedRef.current(loaded);
        setWorldLibraryStatus(`Loaded ${loaded.projectName}`);
      })
      .catch((error: unknown) => {
        if (active) {
          setWorldLibraryStatus(error instanceof Error ? error.message : 'The linked world could not be loaded.');
        }
      });
    return () => { active = false; };
  }, []);

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
      if (notifyParent && project?.projectId === projectId && !embeddedSystemPackageRef.current) {
        notifyParchmentWorldIdentity(renamed, 'renamed');
      }
      setWorldLibraryStatus(`Renamed world to ${renamed.projectName}`);
    };

    const loadSystemPackage = async (request: WorldForgeSystemPackageRequest) => {
      setWorldLibraryStatus(`Loading ${request.projectName}...`);
      try {
        const loaded = await importWforge(new File(
          [request.bytes],
          request.fileName,
          { type: 'application/vnd.world-forge.package+zip' },
        ));
        const remapped = {
          ...loaded,
          projectId: request.targetWorldForgeProjectId,
          projectName: request.projectName,
          updatedAt: new Date().toISOString(),
        };
        const catalog = readWorldBodyCatalog(remapped);
        if (!catalog.bodies.some((body) => body.bodyId === request.activeBodyId)) {
          throw new Error(`The embedded system does not contain body ${request.activeBodyId}.`);
        }
        const selected = withActiveWorldBody(remapped, request.activeBodyId);
        embeddedSystemPackageRef.current = request;
        rememberSessionActiveWorldBody(selected, request.activeBodyId);
        rememberWorldName(selected.projectId, selected.projectName);
        onWorldLoadedRef.current(selected);
        setWorldLibraryStatus(`Loaded ${selected.projectName}`);
        notifyParchmentSystemPackageResult({
          requestId: request.requestId,
          status: 'loaded',
          worldForgeProjectId: selected.projectId,
          activeBodyId: request.activeBodyId,
        });
      } catch (error) {
        embeddedSystemPackageRef.current = null;
        const message = error instanceof Error ? error.message : 'The embedded World Forge system could not be loaded.';
        setWorldLibraryStatus(message);
        notifyParchmentSystemPackageResult({
          requestId: request.requestId,
          status: 'failed',
          message,
        });
      }
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

      const systemPackage = parseParchmentSystemPackageMessage(event.data, embeddedContext.projectId);
      if (systemPackage) {
        void loadSystemPackage(systemPackage);
        return;
      }

      if (isParchmentWorldInventoryRequest(event.data, embeddedContext.projectId)) {
        void publishInventory().catch((error: unknown) => {
          setWorldLibraryStatus(error instanceof Error ? error.message : 'World inventory could not be published.');
        });
        return;
      }

      const replay = parseParchmentReplayWorldMessage(event.data, embeddedContext.projectId);
      if (replay) {
        if (assessWorldReplayCompatibility(replay.manifest) !== 'ready') {
          notifyParchmentReplayResult({
            worldProjectId: replay.manifest.worldProjectId,
            requestId: replay.requestId,
            status: 'incompatible',
            expectedSignature: replay.manifest.outputSignature,
            message: 'This world was recorded with an incompatible generator or graph contract.',
          });
          return;
        }
        setWorldLibraryStatus(`Regenerating ${replay.manifest.worldName}...`);
        globalThis.dispatchEvent(new CustomEvent(WORLD_FORGE_REPLAY_REQUEST_EVENT, { detail: replay }));
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
  }, [project, savedMaps, setProject, setSavedMaps]);

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

      const embeddedPackage = embeddedSystemPackageRef.current;
      if (embeddedPackage) {
        const blob = await exportWforge(projectToSave, { compressionLevel: 1 });
        notifyParchmentSystemPackageSaved({
          worldForgeProjectId: projectToSave.projectId,
          activeBodyId: sessionActiveWorldBodyId(projectToSave),
          fileName: embeddedPackage.fileName,
          updatedAt: projectToSave.updatedAt,
          bytes: await blob.arrayBuffer(),
        });
        setWorldLibraryStatus(`Saved ${projectToSave.projectName} to Parchment Worlds`);
        return;
      }

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
      embeddedSystemPackageRef.current = null;
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

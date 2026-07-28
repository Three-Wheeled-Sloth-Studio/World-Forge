import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Compass, LoaderCircle, Map as MapIcon } from 'lucide-react';
import type { WorldProject } from '@world-forge/shared';
import type { GeographicHierarchyPartition } from '@world-forge/shared/geographicHierarchy';
import {
  buildGeographicHierarchyPreview,
  type GeographicHierarchyPreview,
} from './geographicHierarchyPreview';
import { geographicRegionPreviewProjectKey } from './geographicRegionPreview';
import { GeographicAtlasModal } from './GeographicAtlasModal';
import './geographicHierarchy.css';

export type GeographicHierarchyBuildStatus = 'idle' | 'building' | 'ready' | 'error';

export function GeographicHierarchyPanel({ project }: { project: WorldProject }) {
  const projectKey = geographicRegionPreviewProjectKey(project);
  const cacheRef = useRef(new Map<string, GeographicHierarchyPreview>());
  const partitionCacheRef = useRef(new Map<string, GeographicHierarchyPartition>());
  const [status, setStatus] = useState<GeographicHierarchyBuildStatus>('idle');
  const [preview, setPreview] = useState<GeographicHierarchyPreview | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const cached = cacheRef.current.get(projectKey) ?? null;
    setPreview(cached);
    setStatus(cached ? 'ready' : 'idle');
    setError('');
    setOpen(false);
  }, [projectKey]);

  const start = () => {
    setOpen(true);
    if (preview || status === 'building') return;
    const cached = cacheRef.current.get(projectKey);
    if (cached) {
      setPreview(cached);
      setStatus('ready');
      return;
    }
    setStatus('building');
    setError('');
    window.setTimeout(() => {
      try {
        const next = buildGeographicHierarchyPreview(project);
        cacheRef.current.set(projectKey, next);
        setPreview(next);
        setStatus('ready');
      } catch (reason) {
        setStatus('error');
        setError(reason instanceof Error ? reason.message : 'Geographic atlas failed to build.');
      }
    }, 40);
  };

  return (
    <section className="geographic-atlas-launcher" aria-label="Geographic atlas">
      <div className="geographic-atlas-launcher-heading">
        <span><Compass size={16} /><strong>Geographic atlas</strong></span>
        <small>Drilldown</small>
      </div>
      <button type="button" className="secondary-button" onClick={start}>
        {status === 'building' ? <LoaderCircle className="geographic-atlas-spinner" size={16} /> : <MapIcon size={16} />}
        {status === 'building' ? 'Building hierarchy' : 'Open geographic atlas'}
      </button>
      <p>World to continent or ocean basin to region to subregion. Map scales adapt to the selected geography.</p>
      {status === 'error' && <p className="geographic-atlas-error" role="alert">{error}</p>}
      {open && createPortal(
        <GeographicAtlasModal
          project={project}
          preview={preview}
          status={status}
          error={error}
          partitionCache={partitionCacheRef.current}
          onClose={() => setOpen(false)}
        />,
        document.body,
      )}
    </section>
  );
}

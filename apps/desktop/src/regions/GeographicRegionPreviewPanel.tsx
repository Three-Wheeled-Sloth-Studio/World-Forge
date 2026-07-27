import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LoaderCircle, MapPinned, MousePointer2, Shapes, X } from 'lucide-react';
import type { WorldProject } from '@world-forge/shared';
import type { GeographicWorldRegionV2 } from '@world-forge/shared/geographicRegions';
import {
  buildGeographicRegionPreview,
  buildGeographicRegionRaster,
  geographicRegionAtMapPoint,
  geographicRegionPreviewProjectKey,
  geographicRegionPreviewSummary,
  geographicRegionSetForMode,
  type GeographicRegionPreview,
  type GeographicRegionPreviewMode,
} from './geographicRegionPreview';
import './geographicRegionPreview.css';

type PreviewStatus = 'idle' | 'building' | 'ready' | 'error';

type MapSurface = {
  host: HTMLDivElement;
  canvas: HTMLCanvasElement;
};

export function GeographicRegionPreviewPanel({ project }: { project: WorldProject }) {
  const projectKey = geographicRegionPreviewProjectKey(project);
  const cacheRef = useRef(new Map<string, GeographicRegionPreview>());
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<PreviewStatus>('idle');
  const [preview, setPreview] = useState<GeographicRegionPreview | null>(null);
  const [error, setError] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<GeographicRegionPreviewMode>('repaired');
  const [surface, setSurface] = useState<MapSurface | null>(null);

  useEffect(() => {
    setSelectedRegionId(null);
    const cached = cacheRef.current.get(projectKey) ?? null;
    setPreview(cached);
    setStatus(cached ? 'ready' : 'idle');
    setError('');
  }, [projectKey]);

  useEffect(() => {
    const locateSurface = () => {
      const host = document.querySelector<HTMLDivElement>('.map-canvas-frame');
      const canvas = host?.querySelector<HTMLCanvasElement>('canvas:not(.hex-overlay-canvas):not(.region-preview-overlay-canvas)') ?? null;
      setSurface((current) => {
        if (!host || !canvas) return current === null ? current : null;
        if (current?.host === host && current.canvas === canvas) return current;
        return { host, canvas };
      });
    };
    locateSurface();
    const observer = new MutationObserver(locateSurface);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', locateSurface);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', locateSurface);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const cached = cacheRef.current.get(projectKey);
    if (cached) {
      setPreview(cached);
      setStatus('ready');
      return;
    }

    let cancelled = false;
    setStatus('building');
    setError('');
    const timer = window.setTimeout(() => {
      try {
        const next = buildGeographicRegionPreview(project);
        if (cancelled) return;
        cacheRef.current.set(projectKey, next);
        setPreview(next);
        setStatus('ready');
      } catch (reason) {
        if (cancelled) return;
        setStatus('error');
        setError(reason instanceof Error ? reason.message : 'Region preview failed.');
      }
    }, 60);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled, project, projectKey]);

  useEffect(() => {
    if (!enabled || status !== 'ready' || !preview || !surface) return;
    let start: { pointerId: number; x: number; y: number; moved: boolean } | null = null;
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      start = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!start || start.pointerId !== event.pointerId) return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) start.moved = true;
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!start || start.pointerId !== event.pointerId) return;
      const moved = start.moved;
      start = null;
      if (moved) return;
      const rect = surface.canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const mapWidth = project.primaryWorld.mapModel.resolution.width;
      const mapHeight = project.primaryWorld.mapModel.resolution.height;
      const mapX = ((event.clientX - rect.left) / rect.width) * mapWidth;
      const mapY = ((event.clientY - rect.top) / rect.height) * mapHeight;
      const region = geographicRegionAtMapPoint(project, preview, mapX, mapY, previewMode);
      setSelectedRegionId(region?.id ?? null);
    };

    surface.host.addEventListener('pointerdown', onPointerDown, true);
    surface.host.addEventListener('pointermove', onPointerMove, true);
    surface.host.addEventListener('pointerup', onPointerUp, true);
    surface.host.addEventListener('pointercancel', onPointerUp, true);
    return () => {
      surface.host.removeEventListener('pointerdown', onPointerDown, true);
      surface.host.removeEventListener('pointermove', onPointerMove, true);
      surface.host.removeEventListener('pointerup', onPointerUp, true);
      surface.host.removeEventListener('pointercancel', onPointerUp, true);
    };
  }, [enabled, preview, previewMode, project, status, surface]);

  const summary = useMemo(
    () => preview ? geographicRegionPreviewSummary(preview, previewMode) : null,
    [preview, previewMode],
  );
  const activeRegionSet = preview ? geographicRegionSetForMode(preview, previewMode) : null;
  const selectedRegion = activeRegionSet?.regions.find((region) => region.id === selectedRegionId) ?? null;
  const selectedDomain = selectedRegion
    ? activeRegionSet?.surfaceDomains.find((domain) => domain.id === selectedRegion.parentDomainId) ?? null
    : null;

  return (
    <section className={`region-preview-panel ${enabled ? 'active' : ''}`} aria-label="Geographic region preview">
      <div className="region-preview-heading">
        <span><Shapes size={16} /><strong>Geographic regions</strong></span>
        <small>Preview</small>
      </div>
      <button
        type="button"
        className={enabled ? 'secondary-button' : 'primary-button'}
        disabled={status === 'building'}
        onClick={() => {
          setEnabled((current) => !current);
          if (enabled) setSelectedRegionId(null);
        }}
      >
        {status === 'building' ? <LoaderCircle className="region-preview-spinner" size={16} /> : enabled ? <X size={16} /> : <MapPinned size={16} />}
        {status === 'building' ? 'Building preview' : enabled ? 'Hide region preview' : 'Show region preview'}
      </button>

      {enabled && status === 'building' && (
        <p className="region-preview-status" role="status">Partitioning the authoritative topology and repairing undersized regions.</p>
      )}
      {enabled && status === 'error' && <p className="region-preview-error" role="alert">{error}</p>}
      {enabled && status === 'ready' && preview && summary && (
        <>
          {!surface && <p className="region-preview-status"><MapPinned size={14} /> Switch to Map view to inspect the boundaries.</p>}
          <div className="region-preview-mode" role="group" aria-label="Region preview stage">
            <button
              type="button"
              className={previewMode === 'raw' ? 'active' : ''}
              aria-pressed={previewMode === 'raw'}
              onClick={() => {
                setPreviewMode('raw');
                setSelectedRegionId(null);
              }}
            >
              Raw
            </button>
            <button
              type="button"
              className={previewMode === 'repaired' ? 'active' : ''}
              aria-pressed={previewMode === 'repaired'}
              onClick={() => {
                setPreviewMode('repaired');
                setSelectedRegionId(null);
              }}
            >
              Repaired
            </button>
          </div>
          <div className="region-preview-metrics">
            <PreviewMetric label="Regions" value={`${summary.regionCount} / target ${summary.targetRegionCount}`} />
            <PreviewMetric label="Preferred map" value={`${summary.preferredViewportHexColumns} x ${summary.preferredViewportHexRows} @ 60 mi`} />
            <PreviewMetric label="Sliver merges" value={String(summary.mergeCount)} status={summary.sliverRegionCount === 0 ? 'ok' : 'warn'} />
            <PreviewMetric label="Connected" value={summary.disconnectedRegionCount === 0 ? 'All' : `${summary.disconnectedRegionCount} split`} status={summary.disconnectedRegionCount === 0 ? 'ok' : 'warn'} />
            <PreviewMetric
              label="Geographic boundaries"
              value={`${percent(summary.geographyBoundaryShare)} vs grid ${percent(summary.baselineGeographyBoundaryShare)}`}
              status={summary.geographyBoundaryShareDelta >= 0 ? 'ok' : 'warn'}
            />
            <PreviewMetric
              label="Axis concentration"
              value={`${percent(summary.axisBoundaryConcentration)} vs grid ${percent(summary.baselineAxisBoundaryConcentration)}`}
              status={summary.axisBoundaryConcentrationDelta <= 0 ? 'ok' : 'warn'}
            />
          </div>
          <div className="region-preview-selection">
            <div className="region-preview-selection-title">
              <span><MousePointer2 size={14} /><strong>{selectedRegion ? selectedRegion.label : 'Select a region'}</strong></span>
              {selectedRegion && <button type="button" className="icon-button compact-action-button" title="Clear selected region" aria-label="Clear selected region" onClick={() => setSelectedRegionId(null)}><X size={13} /></button>}
            </div>
            {selectedRegion
              ? <SelectedRegionDetails
                  region={selectedRegion}
                  domainKind={selectedDomain?.kind ?? 'unknown'}
                  componentCount={selectedDomain?.componentCount ?? 0}
                  mode={previewMode}
                />
              : <p>Click the map to highlight a region and inspect why its boundaries exist.</p>}
          </div>
          <p className="region-preview-candidate-note">Candidate only. The saved world still uses the legacy region grid.</p>
          {surface && createPortal(
            <GeographicRegionOverlayCanvas
              preview={preview}
              sourceCanvas={surface.canvas}
              selectedRegionId={selectedRegionId}
              mode={previewMode}
            />,
            surface.host,
          )}
        </>
      )}
    </section>
  );
}

function PreviewMetric({ label, value, status }: { label: string; value: string; status?: 'ok' | 'warn' }) {
  return <div className={`region-preview-metric ${status ?? ''}`}><span>{label}</span><strong>{value}</strong></div>;
}

function SelectedRegionDetails({
  region,
  domainKind,
  componentCount,
  mode,
}: {
  region: GeographicWorldRegionV2;
  domainKind: string;
  componentCount: number;
  mode: GeographicRegionPreviewMode;
}) {
  const strongestBoundary = region.boundaryRationale[0];
  return (
    <dl className="region-preview-details">
      <div><dt>Type</dt><dd>{region.classification}</dd></div>
      <div><dt>Stage</dt><dd>{mode}</dd></div>
      <div><dt>Parent</dt><dd>{domainKind}{componentCount > 1 ? ` (${componentCount} islands)` : ''}</dd></div>
      <div><dt>World area</dt><dd>{percent(region.diagnostics.areaShare)}</dd></div>
      <div><dt>Land / water</dt><dd>{percent(region.landAreaShare)} / {percent(region.waterAreaShare)}</dd></div>
      <div><dt>Neighbors</dt><dd>{region.neighborRegionIds.length}</dd></div>
      <div><dt>Boundary support</dt><dd>{percent(region.diagnostics.geographicBoundaryShare)}</dd></div>
      <div><dt>Strongest reason</dt><dd>{strongestBoundary ? strongestBoundary.kind.replaceAll('-', ' ') : 'distance balance'}</dd></div>
    </dl>
  );
}

function GeographicRegionOverlayCanvas({
  preview,
  sourceCanvas,
  selectedRegionId,
  mode,
}: {
  preview: GeographicRegionPreview;
  sourceCanvas: HTMLCanvasElement;
  selectedRegionId: string | null;
  mode: GeographicRegionPreviewMode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rasterCacheRef = useRef<{ key: string; raster: Uint16Array } | null>(null);

  useEffect(() => {
    const overlay = canvasRef.current;
    if (!overlay) return;
    let frameHandle = 0;
    const draw = () => {
      frameHandle = 0;
      const width = sourceCanvas.width;
      const height = sourceCanvas.height;
      if (width <= 0 || height <= 0) return;
      if (overlay.width !== width) overlay.width = width;
      if (overlay.height !== height) overlay.height = height;
      const context = overlay.getContext('2d');
      if (!context) return;

      const regionSet = geographicRegionSetForMode(preview, mode);
      const cacheKey = `${regionSet.signature}:${width}:${height}`;
      let raster = rasterCacheRef.current?.key === cacheKey ? rasterCacheRef.current.raster : null;
      if (!raster) {
        raster = buildGeographicRegionRaster(preview, width, height, mode);
        rasterCacheRef.current = { key: cacheKey, raster };
      }
      drawRegionRaster(context, raster, width, height, preview, selectedRegionId, mode);
    };
    const schedule = () => {
      if (frameHandle) window.cancelAnimationFrame(frameHandle);
      frameHandle = window.requestAnimationFrame(draw);
    };

    schedule();
    const observer = new ResizeObserver(schedule);
    observer.observe(sourceCanvas);
    window.addEventListener('resize', schedule);
    return () => {
      if (frameHandle) window.cancelAnimationFrame(frameHandle);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, [mode, preview, selectedRegionId, sourceCanvas]);

  return <canvas ref={canvasRef} className="region-preview-overlay-canvas" aria-hidden="true" />;
}

function drawRegionRaster(
  context: CanvasRenderingContext2D,
  raster: Uint16Array,
  width: number,
  height: number,
  preview: GeographicRegionPreview,
  selectedRegionId: string | null,
  mode: GeographicRegionPreviewMode,
): void {
  const image = context.createImageData(width, height);
  const pixels = image.data;
  const regionSet = geographicRegionSetForMode(preview, mode);
  const selectedIndex = selectedRegionId
    ? regionSet.regions.findIndex((region) => region.id === selectedRegionId)
    : -1;

  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      const index = row + x;
      const regionIndex = raster[index];
      const pixel = index * 4;
      const tint = regionTint(regionIndex);
      pixels[pixel] = tint[0];
      pixels[pixel + 1] = tint[1];
      pixels[pixel + 2] = tint[2];
      pixels[pixel + 3] = regionIndex === selectedIndex ? 72 : 18;

      const left = raster[row + (x === 0 ? width - 1 : x - 1)];
      const right = raster[row + (x === width - 1 ? 0 : x + 1)];
      const above = y > 0 ? raster[index - width] : regionIndex;
      const below = y < height - 1 ? raster[index + width] : regionIndex;
      if (regionIndex !== left || regionIndex !== right || regionIndex !== above || regionIndex !== below) {
        pixels[pixel] = regionIndex === selectedIndex ? 255 : 255;
        pixels[pixel + 1] = regionIndex === selectedIndex ? 251 : 236;
        pixels[pixel + 2] = regionIndex === selectedIndex ? 225 : 168;
        pixels[pixel + 3] = 238;
      }
    }
  }

  context.clearRect(0, 0, width, height);
  context.putImageData(image, 0, 0);
  drawRegionLabels(context, regionSet.regions, width, height, selectedIndex);
}

function drawRegionLabels(
  context: CanvasRenderingContext2D,
  regions: GeographicWorldRegionV2[],
  width: number,
  height: number,
  selectedIndex: number,
): void {
  const fontSize = Math.max(10, Math.min(18, width / 90));
  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `800 ${fontSize}px Aptos, Segoe UI, sans-serif`;
  context.lineJoin = 'round';
  context.lineWidth = Math.max(2, fontSize * 0.28);

  for (const region of regions) {
    const x = ((region.labelPoint.longitude + 180) / 360) * width;
    const y = ((90 - region.labelPoint.latitude) / 180) * height;
    const label = String(region.index + 1);
    context.strokeStyle = region.index === selectedIndex ? 'rgba(13, 31, 29, 0.96)' : 'rgba(28, 25, 20, 0.82)';
    context.fillStyle = region.index === selectedIndex ? '#fff7d4' : '#fff4c4';
    context.strokeText(label, x, y);
    context.fillText(label, x, y);
  }
  context.restore();
}

function regionTint(regionIndex: number): readonly [number, number, number] {
  const palette = [
    [43, 115, 119],
    [155, 102, 55],
    [87, 126, 78],
    [115, 92, 145],
    [174, 133, 55],
    [63, 112, 153],
  ] as const;
  return palette[Math.max(0, regionIndex) % palette.length];
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

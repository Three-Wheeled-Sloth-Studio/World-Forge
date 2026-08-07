const LEGACY_GEOGRAPHIC_MAP_LAYER_CLASSES = [
  'hex-overlay-canvas',
  'inspection-map-marker',
  'hex-inspection-marker',
  'highest-point-map-marker',
] as const;

export function isLegacyGeographicMapLayer(
  tagName: string,
  classNames: Iterable<string>,
): boolean {
  if (tagName.toLowerCase() === 'canvas') return true;
  const classes = new Set(classNames);
  return LEGACY_GEOGRAPHIC_MAP_LAYER_CLASSES.some((className) => classes.has(className));
}

type LegacyLayerState = {
  element: HTMLElement;
  hidden: boolean;
  inert: boolean;
  ariaHidden: string | null;
  suppressionMarker: string | null;
};

export function suppressLegacyGeographicMapLayers(mapTarget: HTMLElement): () => void {
  const layers = Array.from(mapTarget.children).filter(
    (element): element is HTMLElement =>
      element instanceof HTMLElement
      && isLegacyGeographicMapLayer(element.tagName, element.classList),
  );
  const states: LegacyLayerState[] = layers.map((element) => ({
    element,
    hidden: element.hidden,
    inert: element.inert,
    ariaHidden: element.getAttribute('aria-hidden'),
    suppressionMarker: element.getAttribute('data-geographic-atlas-suppressed'),
  }));

  for (const { element } of states) {
    element.hidden = true;
    element.inert = true;
    element.setAttribute('aria-hidden', 'true');
    element.setAttribute('data-geographic-atlas-suppressed', 'true');
  }

  return () => {
    for (const state of states) {
      state.element.hidden = state.hidden;
      state.element.inert = state.inert;
      if (state.ariaHidden === null) state.element.removeAttribute('aria-hidden');
      else state.element.setAttribute('aria-hidden', state.ariaHidden);
      if (state.suppressionMarker === null) {
        state.element.removeAttribute('data-geographic-atlas-suppressed');
      } else {
        state.element.setAttribute('data-geographic-atlas-suppressed', state.suppressionMarker);
      }
    }
  };
}

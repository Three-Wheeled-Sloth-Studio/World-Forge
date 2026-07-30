import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

const POPOVER_OPEN_EVENT = 'world-forge:popover-open';

type UseDismissiblePopoverOptions = {
  focusFirstOnOpen?: boolean;
};

export function useDismissiblePopover({ focusFirstOnOpen = false }: UseDismissiblePopoverOptions = {}) {
  const popoverId = useId();
  const triggerId = `${popoverId}-trigger`;
  const panelId = `${popoverId}-panel`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const focusPanelAfterOpen = useRef(false);
  const [open, setOpen] = useState(false);

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  const openPopover = useCallback((focusPanel = false) => {
    focusPanelAfterOpen.current = focusPanel;
    setOpen(true);
    document.dispatchEvent(new CustomEvent(POPOVER_OPEN_EVENT, { detail: { id: popoverId } }));
  }, [popoverId]);

  const togglePopover = useCallback((focusPanel = false) => {
    if (open) close();
    else openPopover(focusPanel);
  }, [close, open, openPopover]);

  useEffect(() => {
    if (!open) return;

    const handleOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || rootRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      close(true);
    };
    const handlePeerOpen = (event: Event) => {
      const peerId = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (peerId && peerId !== popoverId) setOpen(false);
    };

    document.addEventListener('pointerdown', handleOutsidePointer);
    document.addEventListener('keydown', handleEscape);
    document.addEventListener(POPOVER_OPEN_EVENT, handlePeerOpen);

    const frame = window.requestAnimationFrame(() => {
      if (focusFirstOnOpen || focusPanelAfterOpen.current) firstFocusable(panelRef.current)?.focus();
      focusPanelAfterOpen.current = false;
    });

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', handleOutsidePointer);
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener(POPOVER_OPEN_EVENT, handlePeerOpen);
    };
  }, [close, focusFirstOnOpen, open, popoverId]);

  const onTriggerKeyDown = useCallback((event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown') return;
    event.preventDefault();
    if (open) firstFocusable(panelRef.current)?.focus();
    else openPopover(true);
  }, [open, openPopover]);

  const onPanelKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const focusable = focusableElements(panelRef.current);
    if (!focusable.length) return;
    event.preventDefault();
    const current = focusable.indexOf(document.activeElement as HTMLElement);
    const next = current < 0
      ? (event.key === 'ArrowUp' || event.key === 'End' ? focusable.length - 1 : 0)
      : event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? focusable.length - 1
          : event.key === 'ArrowDown'
            ? (current + 1) % focusable.length
            : (current - 1 + focusable.length) % focusable.length;
    focusable[next]?.focus();
  }, []);

  return {
    open,
    triggerId,
    panelId,
    rootRef,
    triggerRef,
    panelRef,
    openPopover,
    close,
    togglePopover,
    onTriggerKeyDown,
    onPanelKeyDown,
  };
}

function firstFocusable(root: HTMLElement | null) {
  return focusableElements(root)[0];
}

function focusableElements(root: HTMLElement | null) {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(
    '[role="menuitem"], input:not([disabled]), select:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
  )).filter((element) => element.offsetParent !== null && element.getAttribute('aria-hidden') !== 'true');
}

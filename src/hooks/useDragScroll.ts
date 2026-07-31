import { useEffect, useRef, RefObject } from 'react';

/**
 * Enables click/touch drag-to-scroll on a horizontally scrollable container.
 * Pass an existing ref to attach behavior to it; otherwise a new ref is created.
 */
export function useDragScroll<T extends HTMLElement = HTMLDivElement>(
  externalRef?: RefObject<T>,
) {
  const internalRef = useRef<T | null>(null);
  const ref = (externalRef ?? internalRef) as RefObject<T>;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let startScroll = 0;
    let moved = false;

    const DRAG_THRESHOLD = 6;

    const onPointerDown = (e: PointerEvent) => {
      // Only left mouse or pen; touch is handled natively for smoother scroll
      // and to preserve native tap-to-click on child buttons.
      if (e.pointerType === 'touch') return;
      if (e.button !== 0) return;
      isDown = true;
      moved = false;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      // Do NOT setPointerCapture here — capturing on the container prevents
      // click events from firing on child buttons (tabs). We only need to
      // track movement; capture kicks in only once a real drag starts.
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > DRAG_THRESHOLD) {
        moved = true;
        el.style.cursor = 'grabbing';
        // Now that we're actually dragging, capture the pointer so we keep
        // receiving move events even if the cursor leaves the element.
        try { el.setPointerCapture?.(e.pointerId); } catch { /**/ }
      }
      if (moved) {
        el.scrollLeft = startScroll - dx;
        e.preventDefault();
      }
    };

    const endDrag = (e: PointerEvent) => {
      if (!isDown) return;
      isDown = false;
      el.style.cursor = '';
      try { el.releasePointerCapture?.(e.pointerId); } catch { /**/ }
    };

    // Only suppress the click when the user actually dragged past the
    // threshold — a plain click/tap must select the tab normally.
    const onClickCapture = (e: MouseEvent) => {
      if (moved) {
        e.stopPropagation();
        e.preventDefault();
        moved = false;
      }
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
    el.addEventListener('pointerleave', endDrag);
    el.addEventListener('click', onClickCapture, true);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', endDrag);
      el.removeEventListener('pointercancel', endDrag);
      el.removeEventListener('pointerleave', endDrag);
      el.removeEventListener('click', onClickCapture, true);
    };
  }, []);

  return ref;
}

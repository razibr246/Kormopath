// Reusable pointer-based drag-and-drop hook for tour and guide dialogs.
// Allows users to effortlessly grab with cursor or touch and reposition dialogs
// anywhere across the viewport without obscuring underlying tables, maps, or charts.
import { useState, useRef, useEffect, useCallback } from 'react';

export function useDraggable({ nodeRef = null, initialPos = { x: 0, y: 0 } } = {}) {
  const [pos, setPos] = useState(initialPos);
  const [isDragging, setIsDragging] = useState(false);

  const internalRef = useRef(null);
  const ref = nodeRef ?? internalRef;

  const dragMeta = useRef({
    isDown: false,
    hasMoved: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    pointerId: null,
  });

  const resetPos = useCallback(() => {
    setPos({ x: 0, y: 0 });
  }, []);

  const onPointerDown = useCallback((e) => {
    // Only primary button (left mouse click or touch)
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    // Do not initiate drag if clicking buttons, links, inputs, selects, or interactive elements
    if (e.target.closest('button, a, input, textarea, select, [role="button"], [role="menuitem"], [data-no-drag]')) {
      return;
    }

    dragMeta.current = {
      isDown: true,
      hasMoved: false,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
      pointerId: e.pointerId,
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture fails
    }
  }, [pos]);

  const onPointerMove = useCallback((e) => {
    if (!dragMeta.current.isDown) return;

    const dx = e.clientX - dragMeta.current.startX;
    const dy = e.clientY - dragMeta.current.startY;

    // Require small 3px movement threshold before considering it an active drag
    if (!dragMeta.current.hasMoved && Math.hypot(dx, dy) > 3) {
      dragMeta.current.hasMoved = true;
      setIsDragging(true);
    }

    if (!dragMeta.current.hasMoved) return;

    let nextX = dragMeta.current.origX + dx;
    let nextY = dragMeta.current.origY + dy;

    // Boundary Clamping: prevent dialog from moving off-screen
    const el = ref.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const naturalLeft = rect.left - pos.x;
      const naturalTop = rect.top - pos.y;

      // Keep at least 12px margin from viewport edges
      const minX = 12 - naturalLeft;
      const maxX = window.innerWidth - naturalLeft - rect.width - 12;
      const minY = 12 - naturalTop;
      const maxY = window.innerHeight - naturalTop - rect.height - 12;

      nextX = Math.max(minX, Math.min(maxX, nextX));
      nextY = Math.max(minY, Math.min(maxY, nextY));
    }

    setPos({ x: nextX, y: nextY });
  }, [pos, ref]);

  const onPointerUp = useCallback((e) => {
    if (dragMeta.current.isDown) {
      dragMeta.current.isDown = false;
      dragMeta.current.hasMoved = false;
      setIsDragging(false);

      if (dragMeta.current.pointerId != null) {
        try {
          e.currentTarget.releasePointerCapture(dragMeta.current.pointerId);
        } catch {
          // Ignore
        }
      }
    }
  }, []);

  // Window resize handler: clamp position so it stays in viewport
  useEffect(() => {
    const handleResize = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.right > window.innerWidth - 12 || rect.bottom > window.innerHeight - 12) {
        setPos((prev) => {
          const naturalLeft = rect.left - prev.x;
          const naturalTop = rect.top - prev.y;
          const maxX = window.innerWidth - naturalLeft - rect.width - 12;
          const maxY = window.innerHeight - naturalTop - rect.height - 12;
          return {
            x: Math.max(12 - naturalLeft, Math.min(maxX, prev.x)),
            y: Math.max(12 - naturalTop, Math.min(maxY, prev.y)),
          };
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [ref]);

  const hasMoved = Math.abs(pos.x) > 2 || Math.abs(pos.y) > 2;

  return {
    ref,
    pos,
    hasMoved,
    isDragging,
    resetPos,
    dragProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
    style: {
      transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
      transition: isDragging ? 'none' : 'box-shadow 0.2s ease, transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
      touchAction: 'none',
      userSelect: isDragging ? 'none' : 'auto',
    },
  };
}

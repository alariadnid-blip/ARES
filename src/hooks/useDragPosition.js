import { useCallback, useRef, useState } from 'react';

export default function useDragPosition() {
  const elementRef = useRef(null);
  const dragRef = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const setElementRef = useCallback((element) => {
    elementRef.current = element;
  }, []);

  const onPointerDown = useCallback((event) => {
    if (event.button !== 0) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('button, a, input, select, textarea, [data-no-drag]')
      && !target.closest('[data-drag-handle]')) return;
    const rect = elementRef.current?.getBoundingClientRect();
    if (!rect) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffset: offset,
      startRect: rect,
    };
    setDragging(true);
  }, [offset]);

  const onPointerMove = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();

    const margin = 8;
    const { startOffset, startRect } = drag;
    const minX = margin - startRect.left + startOffset.x;
    const maxX = window.innerWidth - margin - startRect.right + startOffset.x;
    const minY = margin - startRect.top + startOffset.y;
    const maxY = window.innerHeight - margin - startRect.bottom + startOffset.y;
    const nextX = startOffset.x + event.clientX - drag.startX;
    const nextY = startOffset.y + event.clientY - drag.startY;
    setOffset({
      x: Math.min(Math.max(nextX, minX), Math.max(minX, maxX)),
      y: Math.min(Math.max(nextY, minY), Math.max(minY, maxY)),
    });
  }, []);

  const stopDragging = useCallback((event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  }, []);

  return {
    ref: setElementRef,
    dragging,
    style: { '--drag-x': `${offset.x}px`, '--drag-y': `${offset.y}px` },
    dragHandleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: stopDragging,
      onPointerCancel: stopDragging,
    },
  };
}

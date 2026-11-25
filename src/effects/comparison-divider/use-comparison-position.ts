import { useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';

const coastDuration = 390;

type Drag = { pointerId: number; x: number; time: number; speed: number };

export function comparisonCoastTarget(position: number, speed: number, width: number) {
  if (width <= 0 || Math.abs(speed) < .12) return position;
  const distance = Math.round(Math.min(14, Math.abs(speed) * (coastDuration / 3) * 100 / width));
  return Math.max(0, Math.min(100, Math.round(position) + Math.sign(speed) * distance));
}

export function useComparisonPosition(tile: RefObject<HTMLDivElement | null>) {
  const [position, setPosition] = useState(50);
  const current = useRef(position);
  const drag = useRef<Drag | undefined>(undefined);
  const coast = useRef<number | undefined>(undefined);

  function moveTo(next: number) {
    current.current = next;
    setPosition(next);
  }

  function stopCoast() {
    if (coast.current !== undefined) cancelAnimationFrame(coast.current);
    coast.current = undefined;
  }

  function startDrag(event: PointerEvent<HTMLInputElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    stopCoast();
    drag.current = { pointerId: event.pointerId, x: event.clientX, time: event.timeStamp, speed: 0 };
  }

  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');

    function record(event: globalThis.PointerEvent) {
      const sample = drag.current;
      if (!sample || sample.pointerId !== event.pointerId || sample.x === event.clientX) return;
      sample.speed = (event.clientX - sample.x) / Math.max(12, event.timeStamp - sample.time);
      sample.x = event.clientX;
      sample.time = event.timeStamp;
    }

    function release(event: globalThis.PointerEvent) {
      const sample = drag.current;
      if (!sample || sample.pointerId !== event.pointerId) return;
      drag.current = undefined;
      if (motion.matches || document.hidden || event.timeStamp - sample.time > 90) return;
      const from = current.current;
      const to = comparisonCoastTarget(from, sample.speed, tile.current?.clientWidth ?? 0);
      if (to === from) return;
      const start = performance.now();

      function tick(now: number) {
        const progress = Math.min(1, (now - start) / coastDuration);
        moveTo(from + (to - from) * (1 - (1 - progress) ** 3));
        coast.current = progress < 1 ? requestAnimationFrame(tick) : undefined;
      }

      coast.current = requestAnimationFrame(tick);
    }

    function cancel(event: globalThis.PointerEvent) {
      if (drag.current?.pointerId === event.pointerId) drag.current = undefined;
    }

    function reset() {
      drag.current = undefined;
      stopCoast();
    }

    window.addEventListener('pointermove', record, { passive: true, capture: true });
    window.addEventListener('pointerup', release, true);
    window.addEventListener('pointercancel', cancel, true);
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', reset);
    motion.addEventListener('change', reset);
    return () => {
      window.removeEventListener('pointermove', record, true);
      window.removeEventListener('pointerup', release, true);
      window.removeEventListener('pointercancel', cancel, true);
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', reset);
      motion.removeEventListener('change', reset);
      reset();
    };
  }, [tile]);

  return { position, moveTo, startDrag, stopCoast };
}

import { useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { clampGalleryScroll, galleryScrollFrame } from './gallery-scroll';

type Drag = { pointer: number; startX: number; lastX: number; lastTime: number };

export function InterviewGallery({ label, children }: { label: string; children: ReactNode }) {
  const strip = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const motion = useRef({ target: 0, velocity: 0 });
  const frame = useRef<number | null>(null);
  const lastFrame = useRef(0);
  const suppressClick = useRef(false);
  const [progress, setProgress] = useState<number | null>(null);

  function measure(element: HTMLDivElement) {
    const limit = element.scrollWidth - element.clientWidth;
    setProgress(limit > 1 ? clampGalleryScroll(element.scrollLeft, limit) / limit : null);
  }

  function cancelAnimation() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }

  useLayoutEffect(() => {
    const element = strip.current;
    if (!element) return;
    const observer = new ResizeObserver(() => measure(element));
    observer.observe(element);
    measure(element);
    return () => {
      observer.disconnect();
      cancelAnimation();
    };
  }, []);

  function animate(now: number) {
    frame.current = null;
    const element = strip.current;
    if (!element) return;
    const { target, velocity } = motion.current;
    const limit = element.scrollWidth - element.clientWidth;
    const next = galleryScrollFrame(element.scrollLeft, target, velocity, limit, now - lastFrame.current, !!drag.current);
    motion.current = next;
    element.scrollLeft = next.scrollLeft;
    lastFrame.current = now;
    if (!next.settled) frame.current = requestAnimationFrame(animate);
  }

  function continueAnimation() {
    if (frame.current !== null) return;
    lastFrame.current = performance.now();
    frame.current = requestAnimationFrame(animate);
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    const element = event.currentTarget;
    cancelAnimation();
    suppressClick.current = false;
    if (event.pointerType !== 'mouse' || element.scrollWidth <= element.clientWidth) return;
    drag.current = { pointer: event.pointerId, startX: event.clientX, lastX: event.clientX, lastTime: event.timeStamp };
    motion.current = { target: element.scrollLeft, velocity: 0 };
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const gesture = drag.current;
    const element = event.currentTarget;
    if (gesture?.pointer !== event.pointerId || !(event.buttons & 1)) return;
    if (!suppressClick.current) {
      if (Math.abs(event.clientX - gesture.startX) < 5) return;
      element.setPointerCapture(event.pointerId);
      element.dataset.dragging = '';
      suppressClick.current = true;
    }

    const distance = gesture.lastX - event.clientX;
    const elapsed = Math.max(8, event.timeStamp - gesture.lastTime);
    const limit = element.scrollWidth - element.clientWidth;
    const { target, velocity } = motion.current;
    motion.current = {
      target: clampGalleryScroll(target + distance, limit),
      velocity: velocity * 0.58 + (distance / elapsed) * 7,
    };
    gesture.lastX = event.clientX;
    gesture.lastTime = event.timeStamp;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.scrollLeft = motion.current.target;
    } else {
      continueAnimation();
    }
  }

  function stopDrag(event: PointerEvent<HTMLDivElement>) {
    const gesture = drag.current;
    if (gesture?.pointer !== event.pointerId) return;
    const element = event.currentTarget;
    drag.current = null;
    delete element.dataset.dragging;
    if (event.type !== 'pointerup') {
      cancelAnimation();
    } else if (suppressClick.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (event.timeStamp - gesture.lastTime > 80) motion.current.velocity = 0;
      continueAnimation();
    }
  }

  return (
    <div className="interview-gallery" data-overflow={progress !== null ? '' : undefined}
      data-at-start={progress === 0 ? '' : undefined} data-at-end={progress === 1 ? '' : undefined}>
      <div ref={strip} className="interview-gallery-scroll" data-media-gallery role="region" aria-label={label} tabIndex={0}
        onScroll={(event) => measure(event.currentTarget)} onWheel={cancelAnimation} onKeyDown={cancelAnimation}
        onFocusCapture={cancelAnimation} onPointerDown={startDrag} onPointerMove={moveDrag}
        onPointerUp={stopDrag} onPointerCancel={stopDrag} onLostPointerCapture={stopDrag}
        onPointerLeave={(event) => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) stopDrag(event); }}
        onClickCapture={(event) => {
          if (event.detail === 0 || !suppressClick.current) return;
          suppressClick.current = false;
          event.stopPropagation();
        }}>
        {children}
      </div>
      {progress !== null && (
        <span className="interview-gallery-progress" aria-hidden="true">
          <span style={{ transform: `translateX(${40 * progress}px)` }} />
        </span>
      )}
    </div>
  );
}

import { useEffect, useRef, type ComponentPropsWithRef, type PointerEvent } from 'react';
import { clampGalleryScroll, galleryScrollFrame } from './gallery-scroll';

type Drag = { pointer: number; startX: number; lastX: number; lastTime: number };

export function GalleryStrip(props: ComponentPropsWithRef<'div'>) {
  const drag = useRef<Drag | null>(null);
  const motion = useRef({ target: 0, velocity: 0 });
  const frame = useRef<number | null>(null);
  const lastFrame = useRef(0);
  const suppressClick = useRef(false);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  function cancelAnimation(element: HTMLDivElement) {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    delete element.dataset.coasting;
  }

  function reducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function animate(element: HTMLDivElement, now: number) {
    frame.current = null;
    if (reducedMotion()) {
      cancelAnimation(element);
      return;
    }
    const { target, velocity } = motion.current;
    const limit = element.scrollWidth - element.clientWidth;
    const next = galleryScrollFrame(element.scrollLeft, target, velocity, limit, now - lastFrame.current, !!drag.current);
    motion.current = next;
    element.scrollLeft = next.scrollLeft;
    lastFrame.current = now;
    if (next.settled) delete element.dataset.coasting;
    else frame.current = requestAnimationFrame((time) => animate(element, time));
  }

  function continueAnimation(element: HTMLDivElement) {
    if (frame.current !== null) return;
    lastFrame.current = performance.now();
    frame.current = requestAnimationFrame((time) => animate(element, time));
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    const element = event.currentTarget;
    cancelAnimation(element);
    suppressClick.current = false;
    if (event.pointerType !== 'mouse' || element.scrollWidth <= element.clientWidth) return;
    drag.current = { pointer: event.pointerId, startX: event.clientX, lastX: event.clientX, lastTime: event.timeStamp };
    motion.current = { target: element.scrollLeft, velocity: 0 };
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const gesture = drag.current;
    const element = event.currentTarget;
    if (gesture?.pointer !== event.pointerId) return;
    if (!(event.buttons & 1)) {
      stopDrag(event);
      return;
    }
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
    if (reducedMotion()) element.scrollLeft = motion.current.target;
    else continueAnimation(element);
  }

  function stopDrag(event: PointerEvent<HTMLDivElement>) {
    const gesture = drag.current;
    if (gesture?.pointer !== event.pointerId) return;
    const element = event.currentTarget;
    drag.current = null;
    if (event.type === 'pointerup' && suppressClick.current && !reducedMotion()) {
      if (event.timeStamp - gesture.lastTime > 80) motion.current.velocity = 0;
      element.dataset.coasting = '';
      continueAnimation(element);
    } else cancelAnimation(element);
    delete element.dataset.dragging;
  }

  return (
    <div {...props} data-media-gallery data-mascot-clip=""
      onWheel={(event) => cancelAnimation(event.currentTarget)} onKeyDown={(event) => cancelAnimation(event.currentTarget)}
      onFocusCapture={(event) => cancelAnimation(event.currentTarget)}
      onPointerDown={startDrag} onPointerMove={moveDrag}
      onPointerUp={stopDrag} onPointerCancel={stopDrag} onLostPointerCapture={stopDrag}
      onPointerLeave={(event) => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) stopDrag(event); }}
      onClickCapture={(event) => {
        if (event.detail === 0 || !suppressClick.current) return;
        suppressClick.current = false;
        event.preventDefault();
        event.stopPropagation();
      }} />
  );
}

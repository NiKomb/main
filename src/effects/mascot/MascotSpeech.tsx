import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { speechAvoidanceOffset, speechPlacement, speechSides, type SpeechPosition } from './speech-position';

const interactiveControl = 'a[href], button, input, select, textarea, summary, [role="button"], [role="link"]';
const readableContent = 'h1, h2, h3, h4, h5, h6, p, dt, dd, li, blockquote, figcaption, img, video, pre, td, th';

function speechTarget(target: EventTarget | null) {
  return target instanceof Element
    ? target.closest(interactiveControl) ?? target.closest(readableContent)
    : null;
}

export function MascotSpeech({ message, position, duration, bubbleRef, mascotRef, onClose }: {
  message: string; position: SpeechPosition; duration?: number | 'persistent';
  bubbleRef: RefObject<HTMLSpanElement | null>;
  mascotRef: RefObject<HTMLElement | null>;
  onClose?: () => void;
}) {
  const [printed, setPrinted] = useState(0);
  const [visible, setVisible] = useState(true);
  const [replay, setReplay] = useState(0);
  const measureRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let progress = 0;
    let typingTimer = 0;
    let closeTimer = 0;

    const hide = () => {
      window.clearInterval(typingTimer);
      setVisible(false);
      onClose?.();
    };
    const finish = () => {
      window.clearInterval(typingTimer);
      if (duration === undefined) closeTimer = window.setTimeout(hide, 5000);
    };
    if (typeof duration === 'number') closeTimer = window.setTimeout(hide, duration);
    if (reducedMotion.matches) {
      setPrinted(message.length);
      finish();
    } else {
      typingTimer = window.setInterval(() => {
        if (document.hidden) return;
        progress = reducedMotion.matches ? message.length : progress + 1;
        setPrinted(progress);
        if (progress === message.length) finish();
      }, message === '...' ? 350 : 18);
    }

    return () => {
      window.clearInterval(typingTimer);
      window.clearTimeout(closeTimer);
    };
  }, [message, duration, replay, onClose]);

  useLayoutEffect(() => {
    const bubble = bubbleRef.current;
    const measure = measureRef.current;
    if (!visible || !bubble || !measure) return;

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let hovered = matchMedia('(any-hover: hover)').matches
      ? speechTarget(Array.from(document.querySelectorAll(':hover')).at(-1) ?? null) : null;
    let pointer: { x: number; y: number } | undefined;
    let frame = 0;
    let offset = 0;
    let shiftedByHover = false;
    let placement: { key: string; top: number; height: number } | undefined;
    const update = () => {
      frame = 0;
      const active = document.activeElement;
      const focused = active?.matches(':focus-visible') ? active.closest(interactiveControl) : null;
      const mascot = mascotRef.current;
      const mascotBounds = mascot && !mascot.hidden ? mascot.getBoundingClientRect() : null;
      const parent = bubble.offsetParent;
      let originTop: number | undefined;
      if (mascotBounds && parent) {
        const frame = parent.getBoundingClientRect();
        const size = measure.getBoundingClientRect();
        const key = [mascotBounds.left - frame.left, mascotBounds.top - frame.top, size.width, size.height,
          frame.width, frame.height, innerWidth, innerHeight].join(':');
        if (!placement || placement.key !== key || frame.top + placement.top < 0 ||
          frame.top + placement.top + placement.height > innerHeight) {
          const columns = speechSides(mascotBounds, size.width, innerWidth).map((column) => {
            const width = Math.min(size.width, column.maxWidth);
            if (width === size.width) return { ...column, width, height: size.height };
            measure.style.maxInlineSize = `${width}px`;
            const height = measure.getBoundingClientRect().height;
            measure.style.removeProperty('max-inline-size');
            return { ...column, width, height };
          });
          const targets = position.avoidContent ?? position.avoidTiles?.children ?? [];
          const obstacles = Array.from(targets, (element) => ({ element, bounds: element.getBoundingClientRect() }))
            .filter(({ bounds }) => bounds.width > 0 && bounds.height > 0);
          const next = speechPlacement(columns, mascotBounds, innerHeight, obstacles.map(({ bounds }) => bounds),
            !position.avoidContent) ?? (position.avoidContent && speechPlacement(columns, mascotBounds, innerHeight,
            obstacles.filter(({ element }) => !element.matches('.case-cover')).map(({ bounds }) => bounds)));
          if (next) {
            placement = { key, top: next.top - frame.top, height: next.height };
            bubble.style.setProperty('--speech-left', `${next.anchor - frame.left}px`);
            bubble.style.setProperty('--speech-alignment', `${next.alignment}%`);
            bubble.style.setProperty('--speech-available-width', `${next.maxWidth}px`);
            bubble.style.setProperty('--speech-top', `${placement.top}px`);
            bubble.setAttribute('data-sideways', '');
          }
        }
        if (placement) originTop = frame.top + placement.top;
      }
      let next = 0;
      let hoverOffset = 0;
      if ((hovered?.isConnected || focused) && mascotBounds && bubble.getClientRects().length) {
        const { left, right, top, height } = bubble.getBoundingClientRect();
        const baseTop = originTop ?? top - offset;
        const origin = { left, right, top: baseTop, bottom: baseTop + height };
        if (hovered?.isConnected) {
          const isControl = hovered.matches(interactiveControl);
          if (isControl || pointer) {
            hoverOffset = speechAvoidanceOffset(origin, hovered.getBoundingClientRect(), mascotBounds,
              position.above, innerHeight, isControl ? undefined : pointer);
          }
        }
        next = hoverOffset || (focused ? speechAvoidanceOffset(origin, focused.getBoundingClientRect(),
          mascotBounds, position.above, innerHeight) : 0);
      }
      const movedOnHover = (offset === 0 || next === 0) && (shiftedByHover || hoverOffset !== 0);
      shiftedByHover = hoverOffset !== 0;
      if (next === offset) return;
      offset = next;
      bubble.style.setProperty('--speech-avoid-y', `${offset}px`);
      bubble.toggleAttribute('data-shifted', offset !== 0);
      if (movedOnHover && !reducedMotion.matches) {
        setPrinted(0);
        setReplay((previous) => previous + 1);
      }
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const trackPointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      hovered = speechTarget(event.type === 'pointerout' ? event.relatedTarget : event.target);
      pointer = { x: event.clientX, y: event.clientY };
      queue();
    };

    const resize = new ResizeObserver(queue);
    resize.observe(bubble);
    resize.observe(measure);
    document.addEventListener('pointerover', trackPointer, true);
    document.addEventListener('pointermove', trackPointer, true);
    document.addEventListener('pointerout', trackPointer, true);
    document.addEventListener('focusin', queue);
    document.addEventListener('focusout', queue);
    window.addEventListener('scroll', queue, { passive: true, capture: true });
    window.addEventListener('resize', queue);
    update();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      document.removeEventListener('pointerover', trackPointer, true);
      document.removeEventListener('pointermove', trackPointer, true);
      document.removeEventListener('pointerout', trackPointer, true);
      document.removeEventListener('focusin', queue);
      document.removeEventListener('focusout', queue);
      window.removeEventListener('scroll', queue, true);
      window.removeEventListener('resize', queue);
      bubble.style.removeProperty('--speech-top');
      bubble.style.removeProperty('--speech-left');
      bubble.style.removeProperty('--speech-alignment');
      bubble.style.removeProperty('--speech-available-width');
      bubble.style.removeProperty('--speech-avoid-y');
      bubble.removeAttribute('data-sideways');
      bubble.removeAttribute('data-shifted');
    };
  }, [bubbleRef, mascotRef, position, visible]);

  const typing = printed < message.length;
  const replaying = replay > 0 && typing;
  const text = <>{message.slice(0, printed)}{typing && <span className="mascot-speech__caret" />}</>;

  return visible && (
    <span ref={bubbleRef} className="mascot-speech" data-above={position.above}
      data-typing={typing ? message : undefined} data-replaying={replaying ? '' : undefined} aria-hidden="true" style={{
      '--speech-anchor-top': `${position.y}px`,
      '--speech-anchor-alignment': `${position.alignment}%`,
    } as CSSProperties}>
      <span ref={measureRef} className="mascot-speech__measure" data-message={message} />
      {replaying ? (
        <span className="mascot-speech__replay" data-message={message}><span>{text}</span></span>
      ) : text}
    </span>
  );
}

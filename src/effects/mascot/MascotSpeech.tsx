import { useEffect, useState, type CSSProperties, type RefObject } from 'react';
import { speechAvoidanceOffset, type SpeechPosition } from './speech-position';

const interactiveControl = 'a[href], button, input, select, textarea, summary, [role="button"], [role="link"]';

function speechControl(target: EventTarget | null) {
  return target instanceof Element ? target.closest(interactiveControl) : null;
}

export function MascotSpeech({ message, position, duration, bubbleRef, mascotRef }: {
  message: string; position: SpeechPosition; duration?: number | 'persistent';
  bubbleRef: RefObject<HTMLSpanElement | null>;
  mascotRef: RefObject<HTMLElement | null>;
}) {
  const [printed, setPrinted] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let progress = 0;
    let typingTimer = 0;
    let closeTimer = 0;

    const hide = () => {
      window.clearInterval(typingTimer);
      setVisible(false);
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
  }, [message, duration]);

  useEffect(() => {
    const bubble = bubbleRef.current;
    if (!visible || !bubble) return;

    let hovered = matchMedia('(any-hover: hover)').matches
      ? speechControl(Array.from(document.querySelectorAll(':hover')).at(-1) ?? null) : null;
    let frame = 0;
    let offset = 0;
    const update = () => {
      frame = 0;
      const active = document.activeElement;
      const focused = active?.matches(':focus-visible') ? speechControl(active) : null;
      const control = hovered?.isConnected ? hovered : focused;
      const mascot = mascotRef.current;
      let next = 0;
      if (control && mascot && !mascot.hidden && bubble.getClientRects().length) {
        const { left, right, top, bottom } = bubble.getBoundingClientRect();
        next = speechAvoidanceOffset({ left, right, top: top - offset, bottom: bottom - offset },
          control.getBoundingClientRect(), mascot.getBoundingClientRect(), position.above, innerHeight);
      }
      if (next === offset) return;
      offset = next;
      bubble.style.setProperty('--speech-avoid-y', `${offset}px`);
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const trackPointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      hovered = speechControl(event.type === 'pointerout' ? event.relatedTarget : event.target);
      queue();
    };

    const resize = new ResizeObserver(queue);
    resize.observe(bubble);
    document.addEventListener('pointerover', trackPointer, true);
    document.addEventListener('pointerout', trackPointer, true);
    document.addEventListener('focusin', queue);
    document.addEventListener('focusout', queue);
    window.addEventListener('scroll', queue, { passive: true, capture: true });
    window.addEventListener('resize', queue);
    queue();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      document.removeEventListener('pointerover', trackPointer, true);
      document.removeEventListener('pointerout', trackPointer, true);
      document.removeEventListener('focusin', queue);
      document.removeEventListener('focusout', queue);
      window.removeEventListener('scroll', queue, true);
      window.removeEventListener('resize', queue);
      bubble.style.removeProperty('--speech-avoid-y');
    };
  }, [bubbleRef, mascotRef, position, visible]);

  return visible && (
    <span ref={bubbleRef} className="mascot-speech" data-above={position.above}
      data-typing={printed < message.length ? message : undefined} aria-hidden="true" style={{
      top: position.y,
      left: position.left,
      maxInlineSize: position.maxWidth,
      '--speech-alignment': `${position.alignment}%`,
    } as CSSProperties}>
      {message.slice(0, printed)}
      {printed < message.length && <span className="mascot-speech__caret" />}
    </span>
  );
}

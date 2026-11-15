import { useEffect, useState, type CSSProperties } from 'react';
import type { SpeechPosition } from './speech-position';

export function MascotSpeech({ message, position }: { message: string; position: SpeechPosition }) {
  const [printed, setPrinted] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let progress = 0;
    let typingTimer = 0;
    let closeTimer = 0;

    const finish = () => {
      window.clearInterval(typingTimer);
      closeTimer = window.setTimeout(() => setVisible(false), 5000);
    };
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
  }, [message]);

  return visible && (
    <div className="mascot-speech" data-above={position.above} aria-hidden="true" style={{
      top: position.y,
      '--speech-alignment': `${position.alignment}%`,
    } as CSSProperties}>
      {message.slice(0, printed)}
      {printed < message.length && <span className="mascot-speech__caret" />}
    </div>
  );
}

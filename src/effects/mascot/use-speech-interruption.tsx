import { useCallback, useEffect, useRef, useState } from 'react';
import { mascotAttackMessage } from './mascot-movement';
import { speechWasInterrupted } from './speech-position';

export function useSpeechInterruption() {
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const [interrupted, setInterrupted] = useState(false);

  useEffect(() => {
    if (!interrupted) return;
    const timer = window.setTimeout(() => setInterrupted(false), 900);
    return () => window.clearTimeout(timer);
  }, [interrupted]);

  const interrupt = useCallback((nextMessage?: string) => {
    const bubble = bubbleRef.current;
    const typing = bubble?.dataset.typing;
    if (!bubble || typing === mascotAttackMessage || !speechWasInterrupted(typing, nextMessage) || !bubble.getClientRects().length) return;
    setInterrupted(true);
  }, []);

  const interruption = interrupted && (
    <span className="mascot-speech mascot-speech--interrupted" aria-hidden="true">{mascotAttackMessage}</span>
  );

  return { bubbleRef, interrupt, interruption };
}

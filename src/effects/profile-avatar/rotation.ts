const interval = 30_000;
export const mascotAppearanceEvent = 'mascot-appearance';
export const mascotTakeoffEvent = 'mascot-takeoff';

export function connectAvatarRotation(document: Document, onRotate: (target?: number) => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  function resetTimer() {
    clearTimeout(timer);
    if (!document.hidden) {
      timer = setTimeout(() => {
        if (!document.hidden) rotate();
      }, interval);
    }
  }

  function rotate(target?: number) {
    onRotate(target);
    resetTimer();
  }

  document.addEventListener('visibilitychange', resetTimer);
  resetTimer();

  return {
    rotate,
    disconnect() {
      document.removeEventListener('visibilitychange', resetTimer);
      clearTimeout(timer);
    },
  };
}

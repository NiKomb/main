export type SpeechPosition = { y: number; alignment: number; above: boolean; left?: number; maxWidth?: number };

const speechGap = 8;
type SpeechBounds = Pick<DOMRectReadOnly, 'left' | 'right' | 'top' | 'bottom'>;

export function speechAvoidanceOffset(bubble: SpeechBounds, control: SpeechBounds,
  mascot: Pick<DOMRectReadOnly, 'top' | 'bottom'>, above: boolean, viewportHeight: number) {
  if (bubble.left >= control.right || bubble.right <= control.left ||
    bubble.top >= control.bottom || bubble.bottom <= control.top) return 0;

  const height = bubble.bottom - bubble.top;
  const top = above ? mascot.bottom + speechGap : mascot.top - speechGap - height;
  const bottom = top + height;
  if (top < 0 || bottom > viewportHeight || (top < control.bottom && bottom > control.top)) return 0;
  return top - bubble.top;
}

export function speechWasInterrupted(typing: string | undefined, nextMessage: string | undefined) {
  return Boolean(typing) && typing !== nextMessage;
}

export function speechPosition(
  anchor: { x: number; top: number; bottom: number },
  grid: { top: number; width: number },
  viewportHeight: number,
  preferBelow = false,
): SpeechPosition | null {
  const top = grid.top + anchor.top;
  const bottom = grid.top + anchor.bottom;
  if (!grid.width || bottom <= 0 || top >= viewportHeight) return null;

  const gap = speechGap;
  const spaceAbove = top - gap;
  const spaceBelow = viewportHeight - bottom - gap;
  const above = preferBelow
    ? spaceBelow < 120 && spaceAbove > spaceBelow
    : spaceAbove >= 120 || spaceAbove >= spaceBelow;
  const x = Math.max(0, Math.min(anchor.x, grid.width));
  return { y: above ? anchor.top - gap : anchor.bottom + gap, alignment: x / grid.width * 100, above };
}

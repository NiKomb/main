export type SpeechPosition = { y: number; alignment: number; above: boolean; avoidTiles?: Element };

const speechGap = 8;
const speechSideGap = 4;
const viewportInset = 12;
type SpeechBounds = Pick<DOMRectReadOnly, 'left' | 'right' | 'top' | 'bottom'>;
type SpeechColumn = { anchor: number; alignment: number; maxWidth: number };

export function speechSides(mascot: Pick<SpeechBounds, 'left' | 'right'>, width: number, viewportWidth: number): SpeechColumn[] {
  const leftEdge = Math.min(viewportInset, viewportWidth / 2);
  const rightEdge = viewportWidth - leftEdge;
  const leftAnchor = Math.min(rightEdge, mascot.left - speechSideGap);
  const rightAnchor = Math.max(leftEdge, mascot.right + speechSideGap);
  const left = { anchor: leftAnchor, alignment: 100, maxWidth: Math.max(0, leftAnchor - leftEdge) };
  const right = { anchor: rightAnchor, alignment: 0, maxWidth: Math.max(0, rightEdge - rightAnchor) };

  const order = right.maxWidth >= width || right.maxWidth >= left.maxWidth ? [right, left] : [left, right];
  const readable = order.filter((column) => column.maxWidth >= Math.min(width, 96));
  return readable.length ? readable : order.filter((column) => column.maxWidth > 0).slice(0, 1);
}

type MeasuredSpeech = SpeechColumn & { width: number; height: number };
type PlacedSpeech = MeasuredSpeech & { top: number };

export function speechPlacement(columns: readonly MeasuredSpeech[], mascot: Pick<SpeechBounds, 'top' | 'bottom'>,
  viewportHeight: number, obstacles: readonly SpeechBounds[]) {
  let fallback: PlacedSpeech | undefined;
  let nearest: PlacedSpeech | undefined;
  let closestDistance = Infinity;
  for (const column of columns) {
    if (nearest && column.width < nearest.width) return nearest;
    const left = column.alignment === 0 ? column.anchor : column.anchor - column.width;
    const right = left + column.width;
    const height = column.height;
    const limit = Math.max(0, viewportHeight - height);
    const center = Math.max(0, Math.min(limit, (mascot.top + mascot.bottom - height) / 2));
    const blocking = obstacles.filter((bounds) => bounds.left < right && bounds.right > left);
    const isClear = (top: number) => blocking.every((bounds) =>
      top >= bounds.bottom + speechSideGap || top + height <= bounds.top - speechSideGap);
    fallback ??= { ...column, top: center };
    if (isClear(center)) return { ...column, top: center };

    const min = Math.max(0, mascot.top - height - speechGap);
    const max = Math.min(limit, mascot.bottom + speechGap);
    for (const bounds of blocking) {
      for (const top of [bounds.top - speechSideGap - height, bounds.bottom + speechSideGap]) {
        const distance = Math.abs(top - center);
        if (top >= min && top <= max && distance < closestDistance && isClear(top)) {
          nearest = { ...column, top };
          closestDistance = distance;
        }
      }
    }
  }
  return nearest ?? fallback;
}

export function speechAvoidanceOffset(bubble: SpeechBounds, control: SpeechBounds,
  mascot: Pick<DOMRectReadOnly, 'top' | 'bottom'>, above: boolean, viewportHeight: number,
  pointer?: { x: number; y: number }) {
  if (pointer && (pointer.x < bubble.left || pointer.x >= bubble.right ||
    pointer.y < bubble.top || pointer.y >= bubble.bottom)) return 0;
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

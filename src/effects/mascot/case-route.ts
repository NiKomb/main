export type CaseSurface = {
  tile: Element;
  group: Element;
  kind: 'screen' | 'card';
  top: number;
  left: number;
  right: number;
  hasOwnComment?: boolean;
};

export function selectCaseSurface<T extends CaseSurface>(surfaces: readonly T[], current: T | undefined,
  viewportHeight: number, movingUp = false): T | undefined {
  const middle = viewportHeight / 2;
  let best: T | undefined;
  for (const surface of surfaces) {
    if (surface.top > middle) continue;
    if (!best || (sameCaseRow(surface, best)
      ? surface.hasOwnComment && !best.hasOwnComment
      : movingUp ? surface.top > best.top : surface.top < best.top)) best = surface;
  }
  return current && current.top <= middle && best && sameCaseRow(current, best) &&
    (!best.hasOwnComment || current.hasOwnComment) ? current : best;
}

export function sameCaseRow(first: CaseSurface, second: CaseSurface) {
  return first.group === second.group && Math.abs(first.top - second.top) < 1;
}

export function rightmostCaseSurface<T extends CaseSurface>(surface: T, surfaces: readonly T[]): T {
  return surfaces.reduce((rightmost, candidate) => (
    sameCaseRow(surface, candidate) && candidate.right > rightmost.right ? candidate : rightmost
  ), surface);
}

export function nextCaseSurfaceToRight<T extends CaseSurface>(surface: T, surfaces: readonly T[]): T | undefined {
  let next: T | undefined;
  for (const candidate of surfaces) {
    const gap = candidate.left - surface.right;
    if (gap < 0 || gap > 72 || !sameCaseRow(candidate, surface)) continue;
    if (!next || candidate.left < next.left) next = candidate;
  }
  return next;
}

export function caseFooterRoute<T extends Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>>(buttons: readonly T[],
  width: number, height: number, textRight: number, spriteSize: number) {
  if (width <= spriteSize) return;

  const rightEdge = width - spriteSize;
  const visible = buttons.filter(({ left, right, top, bottom }) => (
    left >= 0 && right <= width && top >= spriteSize && bottom <= height && right > left && bottom > top
  )).map((button) => ({ button, center: (button.left + button.right) / 2 }));
  if (!visible.length) return;

  const { button, center } = visible.reduce((best, next) => next.center > best.center ? next : best);
  return {
    button,
    buttonX: Math.max(0, Math.min(rightEdge, center - spriteSize / 2)),
    rightFinish: { x: Math.max(0, Math.min(width, textRight) - spriteSize), y: height - spriteSize },
  };
}

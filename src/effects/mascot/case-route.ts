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

export function adjacentCaseSurface<T extends CaseSurface>(surface: T, surfaces: readonly T[]): T | undefined {
  return surfaces.find((candidate) => {
    if (candidate.tile === surface.tile || !sameCaseRow(candidate, surface)) return false;
    const gap = candidate.left >= surface.right ? candidate.left - surface.right : surface.left - candidate.right;
    return gap >= 0 && gap <= 72;
  });
}

export type CaseSurface = {
  tile: Element;
  group: Element;
  kind: 'screen' | 'card';
  top: number;
  left: number;
  right: number;
  hasOwnComment?: boolean;
};

export type ParkingSide = 'left' | 'right';
export type CaseScrollStep = { time: number; delta: number };

const scrollSpeedWindow = 100;
const galleryBlinkDelay = 100;
const sameLevelGap = 72;
const diagonalGap = 160;

export function recordCaseScrollStep(steps: CaseScrollStep[], delta: number, time: number, viewportSize: number) {
  if (!delta) return false;
  const previous = steps.at(-1);
  if (previous && Math.sign(previous.delta) !== Math.sign(delta)) steps.length = 0;
  while (steps[0] && time - steps[0].time > scrollSpeedWindow) steps.shift();
  steps.push({ time, delta });
  return Math.abs(steps.reduce((distance, step) => distance + step.delta, 0)) > viewportSize / 2;
}

export function trackCaseGalleryScroll(gallery: Pick<Element, 'scrollLeft' | 'clientWidth' | 'hasAttribute'>) {
  const steps: CaseScrollStep[] = [];
  let offset = gallery.scrollLeft;
  let lastScroll = -Infinity;

  return {
    reset() {
      offset = gallery.scrollLeft;
      lastScroll = -Infinity;
      steps.length = 0;
    },
    read(now: number) {
      const delta = gallery.scrollLeft - offset;
      offset = gallery.scrollLeft;
      if (delta) lastScroll = now;
      const fast = recordCaseScrollStep(steps, delta, now, gallery.clientWidth);
      const dragging = gallery.hasAttribute('data-dragging');
      return { changed: delta !== 0, fast, dragging, settled: !dragging && now - lastScroll >= galleryBlinkDelay };
    },
  };
}

type JumpSurface = { left: number; right: number; y: number };

export function caseSurfacesInJumpRange(from: JumpSurface, into: JumpSurface, viewportHeight: number) {
  const rise = Math.abs(from.y - into.y);
  const gap = Math.max(0, from.left - into.right, into.left - from.right);
  return rise <= Math.min(400, viewportHeight / 2) && gap <= (rise > 0 ? diagonalGap : sameLevelGap);
}

export function caseMascotDropZone(x: number, y: number, column: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>) {
  if (x < column.left) return 'left';
  if (x > column.right) return 'right';
  if (y >= column.top && y <= column.bottom) return 'route';
}

export function caseMascotParking(side: ParkingSide, column: Pick<DOMRect, 'left' | 'right'>, width: number, height: number,
  size: number, hitInset: number, contacts?: Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'>) {
  const left = side === 'left' ? 0 : Math.min(width, Math.max(0, column.right));
  const right = side === 'right' ? width : Math.min(width, Math.max(0, column.left));
  const fits = right - left >= size;
  let x = fits ? Math.round((left + right - size) / 2) : side === 'left' ? 0 : Math.max(0, width - size);
  let y = Math.max(0, height - size);
  let contactClearance = Infinity;
  if (contacts && contacts.bottom > contacts.top && y + size + hitInset > contacts.top && y - hitInset < contacts.bottom) {
    const before = Math.floor(contacts.left - size - hitInset);
    const after = Math.ceil(contacts.right + hitInset);
    if (x > before && x < after) {
      const canFitBefore = fits && before >= left;
      const canFitAfter = fits && after <= right - size;
      if (canFitBefore && (!canFitAfter || x - before <= after - x)) x = before;
      else if (canFitAfter) x = after;
      else y = Math.max(0, Math.floor(contacts.top - size - hitInset));
    }
    if (y + size + hitInset > contacts.top) contactClearance = x <= before ? before - x : x - after;
  }
  const room = fits ? Math.min(x - left, right - x - size, contactClearance) : 0;
  return { point: { x, y }, step: room >= 4 ? Math.min(8, Math.floor(room)) : 0 };
}

export function caseRouteViewportLimits(viewportHeight: number, contentsBottom = 0) {
  const edgeInset = viewportHeight * .15;
  return {
    top: Math.max(edgeInset, contentsBottom),
    bottom: viewportHeight - edgeInset,
  };
}

export function selectCaseSurface<T extends CaseSurface>(surfaces: readonly T[], limits: { top: number; bottom: number }, current?: T): T | undefined {
  let best: T | undefined;
  for (const surface of surfaces) {
    if (surface.top < limits.top || surface.top > limits.bottom) continue;
    if (!best || (sameCaseRow(surface, best)
      ? surface.hasOwnComment && !best.hasOwnComment
      : surface.top < best.top)) best = surface;
  }
  if (!best) return current;
  return current && current.top >= limits.top && current.top <= limits.bottom && sameCaseRow(current, best) &&
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

export function caseRowRoute<T extends CaseSurface>(selected: T, surfaces: readonly T[], current: T | undefined) {
  const wholeRow = selected.group.hasAttribute('data-mascot-row');
  const stopAtComment = !wholeRow && !!selected.hasOwnComment;
  return {
    current: wholeRow && current && sameCaseRow(current, selected) ? current : undefined,
    finish: stopAtComment ? selected : rightmostCaseSurface(selected, surfaces),
    comment: wholeRow && selected.hasOwnComment ? selected.tile : undefined,
    stopAtComment,
  };
}

export function nextCaseSurfaceToRight<T extends CaseSurface>(surface: T, surfaces: readonly T[]): T | undefined {
  let next: T | undefined;
  for (const candidate of surfaces) {
    const gap = candidate.left - surface.right;
    if (gap < 0 || gap > sameLevelGap || !sameCaseRow(candidate, surface)) continue;
    if (!next || candidate.left < next.left) next = candidate;
  }
  return next;
}

export function caseButtonX({ left, right }: Pick<DOMRect, 'left' | 'right'>, viewportWidth: number, spriteSize: number) {
  return Math.max(0, Math.min(viewportWidth - spriteSize, (left + right - spriteSize) / 2));
}

type ButtonBounds = Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>;

function visibleCaseButton({ left, right, top, bottom }: ButtonBounds, width: number, height: number, minTop: number) {
  return left >= 0 && right <= width && top >= minTop && bottom <= height && right > left && bottom > top;
}

export function caseRowFinishButton<T extends ButtonBounds>(buttons: readonly T[], edge: { x: number; y: number },
  viewport: { width: number; height: number; top: number }, spriteSize: number, maxGap: number) {
  if (viewport.width <= spriteSize) return;

  let closest: { button: T; buttonX: number } | undefined;
  let distance = Infinity;
  for (const button of buttons) {
    if (!visibleCaseButton(button, viewport.width, viewport.height, Math.max(viewport.top, spriteSize))) continue;
    const gapAbove = edge.y - button.bottom;
    const buttonX = caseButtonX(button, viewport.width, spriteSize);
    const gapAcross = Math.abs(edge.x - buttonX);
    if (gapAbove < 0 || gapAbove > maxGap || gapAcross > maxGap) continue;
    const jump = Math.hypot(gapAcross, edge.y - button.top);
    if (jump >= distance) continue;
    closest = { button, buttonX };
    distance = jump;
  }
  return closest;
}

export function caseFooterRoute<T extends ButtonBounds>(buttons: readonly T[],
  width: number, height: number, signatureRight: number, spriteSize: number) {
  if (width <= spriteSize) return;

  const visible = buttons.filter((button) => visibleCaseButton(button, width, height, spriteSize));
  if (!visible.length) return;

  const button = visible.reduce((best, next) => next.left + next.right > best.left + best.right ? next : best);
  return {
    button,
    buttonX: caseButtonX(button, width, spriteSize),
    rightFinish: { x: Math.max(0, Math.min(width - spriteSize, signatureRight + 12)), y: height - spriteSize },
  };
}

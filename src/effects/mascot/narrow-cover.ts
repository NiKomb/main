const homeScrollResponse = 1 / 3;
const homeScrollCatchUp = 70;

export function reactToHomeScroll(position: number, previous: number, reacted: number, elapsed: number) {
  const remaining = (previous - reacted) * Math.exp(-elapsed / homeScrollCatchUp) +
    (position - previous) * (1 - homeScrollResponse);
  return Math.abs(remaining) < 1 ? position : position - remaining;
}

export function selectHomeRoute<T extends { top: number; bottom: number }>(
  covers: readonly T[], viewportHeight: number, scrollY: number, scrollLimit: number, reactedScroll = scrollY,
) {
  const atBottom = scrollLimit > 0 && scrollY > 0 && scrollY >= scrollLimit - 1;
  const progress = atBottom ? 1 : scrollLimit > 0 ? reactedScroll / scrollLimit : 0;
  const index = Math.min(progress >= .75 ? 2 : progress >= .4 ? 1 : 0, covers.length - 1);
  const preferred = covers[index];

  const hasVisibleTop = ({ top }: T) => top >= 0 && top < viewportHeight;
  const cover = scrollY <= 0 || (preferred && hasVisibleTop(preferred)) ? preferred
    : covers.slice(0, index).filter(hasVisibleTop).at(-1) ?? covers.slice(index + 1).find(hasVisibleTop) ??
      covers.find(({ top, bottom }) => top < viewportHeight && bottom > 0) ?? (atBottom ? covers.at(-1) : undefined);
  return { cover, atBottom };
}

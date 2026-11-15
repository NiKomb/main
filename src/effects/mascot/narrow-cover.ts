export function selectNarrowCover<T extends { top: number; bottom: number }>(
  covers: readonly T[], viewportHeight: number, atBottom: boolean,
): T | undefined {
  const visible = covers.filter(({ top, bottom }) => top < viewportHeight && bottom > 0);
  if (atBottom) return visible.at(-1);
  return visible.find(({ top }) => top >= Math.min(96, viewportHeight / 3)) ?? visible[0];
}

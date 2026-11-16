export type SpeechPosition = { y: number; alignment: number; above: boolean; left?: number; maxWidth?: number };

export function speechPosition(
  anchor: { x: number; top: number; bottom: number },
  grid: { top: number; width: number },
  viewportHeight: number,
  preferBelow = false,
): SpeechPosition | null {
  const top = grid.top + anchor.top;
  const bottom = grid.top + anchor.bottom;
  if (!grid.width || bottom <= 0 || top >= viewportHeight) return null;

  const gap = 8;
  const spaceAbove = top - gap;
  const spaceBelow = viewportHeight - bottom - gap;
  const above = preferBelow
    ? spaceBelow < 120 && spaceAbove > spaceBelow
    : spaceAbove >= 120 || spaceAbove >= spaceBelow;
  const x = Math.max(0, Math.min(anchor.x, grid.width));
  return { y: above ? anchor.top - gap : anchor.bottom + gap, alignment: x / grid.width * 100, above };
}

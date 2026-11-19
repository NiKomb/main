export const fragmentDuration = 1000;
const fullOpacityDuration = 150;

export type Fragment = {
  x: number;
  y: number;
  color: string;
  size: number;
  lifetime: number;
  travelX: number;
  travelY: number;
};

export function drawFragments(context: CanvasRenderingContext2D, fragments: readonly Fragment[],
  center: { x: number; y: number }, elapsed: number, scale: number) {
  const progress = elapsed / fragmentDuration;
  const spread = 1 - (1 - progress) ** 3;
  const fall = 120 * progress ** 2 / scale;
  for (const { x, y, color, size, lifetime, travelX, travelY } of fragments) {
    if (elapsed >= lifetime) continue;
    context.fillStyle = color;
    context.globalAlpha = Math.min(1, (lifetime - elapsed) / (lifetime - fullOpacityDuration));
    const left = center.x + x + travelX * spread - (size - 1) / 2;
    const top = center.y + y + travelY * spread + fall - (size - 1) / 2;
    context.fillRect(Math.round(left), Math.round(top), size, size);
  }
  context.globalAlpha = 1;
}

export const mascotPaintEvent = 'mascot-paint';
export const paintDropDuration = 560;
export type PaintPoint = { x: number; y: number };

export function animatePaintDrop(drop: SVGCircleElement, from: PaintPoint, to: PaintPoint) {
  const start = `translate(${from.x}px, ${from.y}px)`;
  const end = `translate(${to.x}px, ${to.y}px)`;
  return drop.animate([
    { offset: 0, transform: `${start} scale(.25)`, opacity: 0 },
    { offset: .45, transform: `${start} scale(1)`, opacity: 1, easing: 'ease-in' },
    { offset: .96, transform: `${end} scale(.8, 1.15)`, opacity: 1 },
    { offset: 1, transform: `${end} scale(1.4, .35)`, opacity: 0 },
  ], { duration: paintDropDuration });
}

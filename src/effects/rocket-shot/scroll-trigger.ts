const readingTime = 3000;
export const rocketCaptionHitEvent = 'rocket-caption-hit';

export function shotCaptionVisible(bounds: { top: number; bottom: number; height: number }, viewportHeight: number, topEdge = 0) {
  return bounds.height > 0 && bounds.top < viewportHeight && bounds.bottom > topEdge;
}

export function shotCaptionCentered(bounds: { top: number; height: number }, viewportHeight: number, topEdge = 0) {
  const center = bounds.top + bounds.height / 2;
  return bounds.height > 0 && center >= Math.max(topEdge, viewportHeight * 0.25) && center <= viewportHeight * 0.75;
}

export function shotDeadline(previous: number | undefined, time: number, visible: boolean) {
  return visible ? previous ?? time + readingTime : undefined;
}

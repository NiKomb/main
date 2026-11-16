const readingTime = 5000;
export const rocketCaptionHitEvent = 'rocket-caption-hit';

export function shotCaptionVisible(bounds: { top: number; bottom: number; height: number }, viewportHeight: number, topEdge = 0) {
  return bounds.height > 0 && bounds.top < viewportHeight && bounds.bottom > topEdge;
}

export function shotDeadline(previous: number | undefined, time: number, visible: boolean) {
  return visible ? previous ?? time + readingTime : undefined;
}

const frameDuration = 1000 / 60;
const friction = 0.92;

export function clampGalleryScroll(value: number, limit: number) {
  return Math.max(0, Math.min(value, limit));
}

export function galleryScrollFrame(
  position: number, target: number, velocity: number, limit: number, elapsed: number, dragging: boolean,
) {
  const frames = Math.min(3, Math.max(0, elapsed / frameDuration));
  const decay = friction ** frames;
  const travel = dragging ? 0 : velocity * (1 - decay) / (1 - friction);
  target = clampGalleryScroll(target + travel, limit);
  if (!dragging) velocity = target === 0 || target === limit ? 0 : velocity * decay;

  const distance = target - position;
  const step = Math.max(1, Math.abs(distance) * (1 - 0.68 ** frames));
  const scrollLeft = step >= Math.abs(distance) ? target : position + Math.sign(distance) * step;
  const settled = scrollLeft === target && (dragging || Math.abs(velocity) < 0.15);
  return { scrollLeft, target, velocity, settled };
}

type Spring = { offset: number; velocity: number };

const maxStretch = 36;
export const maxVisibleStretch = 18;
const dividerPixelStep = 2;
export const dividerHalfWidth = maxVisibleStretch + 2;
const stiffness = 180;
const damping = 16;

function limitStretch(offset: number) {
  return Math.max(-maxStretch, Math.min(maxStretch, offset));
}

export function pullDivider(spring: Spring, distance: number): Spring {
  return { offset: limitStretch(spring.offset + distance), velocity: spring.velocity };
}

export function stepDivider(spring: Spring, seconds: number): Spring {
  const dt = Math.max(0, Math.min(seconds, 1 / 30));
  const acceleration = -stiffness * spring.offset - damping * spring.velocity;
  const velocity = spring.velocity + acceleration * dt;
  return { offset: spring.offset + velocity * dt, velocity };
}

export function visibleDividerStretch(offset: number) {
  return Math.round(limitStretch(offset) * maxVisibleStretch / maxStretch);
}

export function dividerOffsetAt(stretch: number, height: number, y: number) {
  // Sample the same pixel row for the stroke, masks and particle origins.
  const row = Math.floor(y / dividerPixelStep) * dividerPixelStep;
  const distance = Math.abs(row * 2 / height - 1);
  return Math.round(stretch * distance ** 2 * (3 - 2 * distance)) || 0;
}

export function dividerPath(stretch: number, height: number) {
  if (height <= 0) return '';
  let x = stretch;
  let path = `M${x} 0`;
  for (let y = dividerPixelStep; y < height; y += dividerPixelStep) {
    const nextX = dividerOffsetAt(stretch, height, y);
    if (nextX === x) continue;
    path += `V${y}H${nextX}`;
    x = nextX;
  }
  return `${path}V${height}`;
}

type Spring = { offset: number; velocity: number };

const maxStretch = 28;
const maxVisibleStretch = 10;
const pixelStep = 2;
export const dividerHalfWidth = maxVisibleStretch + 2;
const stiffness = 240;
const damping = 22;

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

export function dividerPath(offset: number, height: number) {
  if (height <= 0) return '';
  const stretch = limitStretch(offset) * maxVisibleStretch / maxStretch;
  let x = Math.round(stretch);
  let path = `M${x} 0`;
  for (let y = pixelStep; y < height; y += pixelStep) {
    // Keep the line near the handle and let the ends trail behind it.
    const distance = Math.abs(y * 2 / height - 1);
    const weight = distance ** 2 * (3 - 2 * distance);
    const nextX = Math.round(stretch * weight);
    if (nextX === x) continue;
    path += `V${y}H${nextX}`;
    x = nextX;
  }
  return `${path}V${height}`;
}

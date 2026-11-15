type Spring = { offset: number; velocity: number };

export const dividerHalfWidth = 32;
const pixelSize = 3;
const pixelStep = pixelSize * 2;
const maxStretch = 28;
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

export function dividerPixels(offset: number, height: number) {
  const stretch = limitStretch(offset);
  let path = '';
  for (let top = 0; top < height; top += pixelStep) {
    // Cells near the handle follow it, while the ends take time to catch up.
    const distance = Math.min(1, Math.abs((top + pixelSize / 2) * 2 / height - 1));
    const weight = distance ** 2 * (3 - 2 * distance);
    const left = Math.round(stretch * weight) - pixelSize / 2;
    path += `M${left} ${top}h${pixelSize}v${pixelSize}h-${pixelSize}Z`;
  }
  return path;
}

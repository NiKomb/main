export function frameContact(width: number, height: number, radius: number, perimeter: number, x: number, y: number) {
  const topLength = width - 2 - 2 * radius;
  const sideLength = height - 2 - 2 * radius;
  if (y < 1) {
    const landingX = Math.max(1 + radius, Math.min(width - 1 - radius, x));
    return { x: landingX, y: 1, origin: landingX - 1 - radius };
  }

  const cornerLength = (perimeter - 2 * (topLength + sideLength)) / 4;
  const landingY = Math.max(1 + radius, Math.min(height - 1 - radius, y + 30));
  const sideOffset = landingY - 1 - radius;
  return x >= width / 2
    ? { x: width - 1, y: landingY, origin: topLength + cornerLength + sideOffset }
    : { x: 1, y: landingY, origin: perimeter - cornerLength - sideOffset };
}

export function frameDash(perimeter: number, origin: number, reach: number, tail?: {
  length: number;
  direction: 'clockwise' | 'counterclockwise';
}) {
  const length = tail ? Math.min(tail.length, reach) : 2 * reach;
  const start = tail?.direction === 'clockwise' ? origin + reach - length : origin - reach;
  return { strokeDasharray: `${length}px ${perimeter - length}px`, strokeDashoffset: `${-start}px` };
}

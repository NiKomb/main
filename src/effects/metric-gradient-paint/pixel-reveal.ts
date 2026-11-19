export const pixelRevealStepCount = 35;

export function pixelRevealSteps(width: number, height: number, origin: number) {
  const steps = Array.from({ length: pixelRevealStepCount }, (): number[] => []);
  const furthest = Math.hypot(Math.max(origin, width - 1 - origin), height - 1) || 1;
  let seed = 42;

  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 0x100000000;
      const distance = Math.hypot(column - origin, row) / furthest;
      const progress = distance * .65 + noise * .35;
      const step = Math.min(pixelRevealStepCount - 1, Math.floor(progress * pixelRevealStepCount));
      steps[step].push(row * width + column);
    }
  }

  return steps;
}

export function releasedScrollCell(previous: number, current: number, column: number, size: number) {
  if (previous === current) return;
  const offset = column % size;
  const index = current > previous ? Math.floor : Math.ceil;
  const currentCell = index((current + offset) / size);
  if (currentCell !== index((previous + offset) / size)) {
    return { index: currentCell, distance: Math.abs(current - (currentCell * size - offset)) };
  }
}

export function particleFrame(time: number, start: number, lifetime: number, size: number, travel: number) {
  const progress = Math.min(1, Math.max(0, (time - start) / lifetime));
  return { size: size * (1 - progress), opacity: 1 - progress, offset: travel * progress };
}

export type Particle = { x: number; y: number; color: string; start: number; lifetime: number; travel: number };

export function createParticle(x: number, y: number, color: string, start: number, direction: -1 | 1, seed: number): Particle {
  return { x, y, color, start, travel: direction * (23 + seed % 9), lifetime: 260 + seed % 251 };
}

export function particleSeed(column: number, row: number) {
  const hash = Math.imul(column + 1, 0x45d9f3b) ^ Math.imul(row, 0x119de1f3);
  return (hash ^ (hash >>> 11)) >>> 0;
}

export function clearParticles(context: CanvasRenderingContext2D) {
  context.save();
  context.resetTransform();
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.restore();
}

export function drawParticles(context: CanvasRenderingContext2D, particles: Particle[], time: number,
  cellSize: number, axis: 'x' | 'y') {
  if (!particles.length) return;
  clearParticles(context);
  let alive = 0;
  for (const particle of particles) {
    const { size, opacity, offset } = particleFrame(time, particle.start, particle.lifetime, cellSize, particle.travel);
    if (!size) continue;
    particles[alive++] = particle;
    context.globalAlpha = opacity;
    context.fillStyle = particle.color;
    const x = particle.x + (axis === 'x' ? offset : 0) - size / 2;
    const y = particle.y + (axis === 'y' ? offset : 0) - size / 2;
    context.fillRect(x, y, size, size);
  }
  particles.length = alive;
  context.globalAlpha = 1;
}

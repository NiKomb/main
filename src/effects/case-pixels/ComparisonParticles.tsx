import { useLayoutEffect, useRef } from 'react';
import { comparisonExitCells, pixelSize } from './pixel-swap';
import { clearParticles, createParticle, drawParticles, particleSeed, type Particle } from './particles';

type Props = { position: number; width: number; height: number };

export function ComparisonParticles({ position, width, height }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const release = useRef<((previous: number, current: number) => void) | null>(null);
  const previous = useRef(position);

  useLayoutEffect(() => {
    const element = canvas.current;
    const drawingContext = element?.getContext('2d');
    if (!element || !drawingContext || !width || !height) return;

    const context = drawingContext;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const particles: Particle[] = [];
    let frame: number | undefined;
    let ratio = 0;

    function stop() {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined;
      particles.length = 0;
      clearParticles(context);
    }

    function draw(time: number) {
      frame = undefined;
      drawParticles(context, particles, time, pixelSize, 'x');
      if (particles.length) frame = requestAnimationFrame(draw);
    }

    release.current = (from, to) => {
      if (document.hidden || motion.matches) return;
      const bounds = element.getBoundingClientRect();
      if (bounds.bottom <= 0 || bounds.top >= innerHeight) return;

      const nextRatio = Math.min(devicePixelRatio || 1, 2);
      if (nextRatio !== ratio) {
        ratio = nextRatio;
        element.width = Math.ceil(width * ratio);
        element.height = Math.ceil(height * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
      }

      const color = getComputedStyle(element).color;
      const time = performance.now();
      const direction = to > from ? 1 : -1;
      for (const { column, row } of comparisonExitCells(width, height, from, to)) {
        const seed = particleSeed(column, row);
        if (seed % 7 > 1) continue;
        particles.push(createParticle((column + .5) * pixelSize, (row + .5) * pixelSize, color, time, direction, seed));
      }
      const limit = Math.ceil(height / pixelSize) * 5;
      if (particles.length > limit) particles.splice(0, particles.length - limit);
      if (frame !== undefined) cancelAnimationFrame(frame);
      draw(time);
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) stop();
    });
    observer.observe(element);
    motion.addEventListener('change', stop);
    document.addEventListener('visibilitychange', stop);
    return () => {
      release.current = null;
      stop();
      observer.disconnect();
      motion.removeEventListener('change', stop);
      document.removeEventListener('visibilitychange', stop);
    };
  }, [width, height]);

  useLayoutEffect(() => {
    if (previous.current !== position) release.current?.(previous.current, position);
    previous.current = position;
  }, [position]);

  return <canvas ref={canvas} className="comparison-particles" aria-hidden="true" />;
}

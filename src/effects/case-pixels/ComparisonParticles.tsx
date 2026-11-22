import { useLayoutEffect, useRef, type RefObject } from 'react';
import { comparisonExitCells, pixelSize, type ComparisonOffset } from './pixel-swap';
import { clearParticles, createParticle, drawParticles, particleSeed, type Particle } from './particles';

export type DrawComparisonParticles = (position: number, offsetAt?: ComparisonOffset) => void;
type Props = { drawEdge: RefObject<DrawComparisonParticles | null>; width: number; height: number };

export function ComparisonParticles({ drawEdge, width, height }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const element = canvas.current;
    const drawingContext = element?.getContext('2d');
    if (!element || !drawingContext || !width || !height) return;

    const context = drawingContext;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const particles: Particle[] = [];
    let frame: number | undefined;
    let ratio = 0;
    let previous: { position: number; offsetAt?: ComparisonOffset } | undefined;

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

    drawEdge.current = (position, offsetAt) => {
      const from = previous;
      previous = { position, offsetAt };
      if (!from || document.hidden || motion.matches || (from.position === position && from.offsetAt === offsetAt)) return;
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
      const direction = (position - from.position || (offsetAt?.(0) ?? 0) - (from.offsetAt?.(0) ?? 0)) > 0 ? 1 : -1;
      for (const { column, row } of comparisonExitCells(width, height, from.position, position, from.offsetAt, offsetAt)) {
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
      drawEdge.current = null;
      stop();
      observer.disconnect();
      motion.removeEventListener('change', stop);
      document.removeEventListener('visibilitychange', stop);
    };
  }, [drawEdge, width, height]);

  return <canvas ref={canvas} className="comparison-particles" aria-hidden="true" />;
}

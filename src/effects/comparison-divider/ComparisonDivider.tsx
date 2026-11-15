import { useLayoutEffect, useMemo, useRef } from 'react';
import { dividerHalfWidth, dividerPixels, pullDivider, stepDivider } from './spring';
import './comparison-divider.css';

export function ComparisonDivider({ position, width, height }: { position: number; width: number; height: number }) {
  const svg = useRef<SVGSVGElement>(null);
  const path = useRef<SVGPathElement>(null);
  const pull = useRef<((from: number, to: number) => void) | null>(null);
  const previous = useRef(position);
  const straight = useMemo(() => dividerPixels(0, height), [height]);

  useLayoutEffect(() => {
    const element = svg.current;
    const shape = path.current;
    if (!element || !shape || !width || !height) return;
    const stroke = shape;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let spring = { offset: 0, velocity: 0 };
    let frame: number | undefined;
    let previousTime = 0;
    let visible = true;

    function stop() {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined;
      spring = { offset: 0, velocity: 0 };
      stroke.setAttribute('d', straight);
    }

    function tick(time: number) {
      spring = stepDivider(spring, (time - previousTime) / 1000);
      if (Math.abs(spring.offset) < .1 && Math.abs(spring.velocity) < 2) {
        stop();
        return;
      }
      previousTime = time;
      stroke.setAttribute('d', dividerPixels(spring.offset, height));
      frame = requestAnimationFrame(tick);
    }

    pull.current = (from, to) => {
      if (motion.matches || document.hidden || !visible) return;
      spring = pullDivider(spring, width * (from - to) / 100);
      stroke.setAttribute('d', dividerPixels(spring.offset, height));
      if (frame !== undefined) return;
      previousTime = performance.now();
      frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) stop();
    });
    observer.observe(element);
    motion.addEventListener('change', stop);
    document.addEventListener('visibilitychange', stop);
    return () => {
      pull.current = null;
      stop();
      observer.disconnect();
      motion.removeEventListener('change', stop);
      document.removeEventListener('visibilitychange', stop);
    };
  }, [height, straight, width]);

  useLayoutEffect(() => {
    if (previous.current !== position) pull.current?.(previous.current, position);
    previous.current = position;
  }, [position]);

  return (
    <svg ref={svg} className="dns-comparison-divider" aria-hidden="true" width={dividerHalfWidth * 2}
      viewBox={`-${dividerHalfWidth} 0 ${dividerHalfWidth * 2} ${height || 1}`} preserveAspectRatio="none" shapeRendering="crispEdges">
      <path ref={path} d={straight} fill="var(--color-surface)" />
    </svg>
  );
}

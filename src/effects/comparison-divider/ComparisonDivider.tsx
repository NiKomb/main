import { useLayoutEffect, useRef, type RefObject } from 'react';
import { ComparisonParticles, type DrawComparisonParticles } from '../case-pixels/ComparisonParticles';
import { comparisonSwapClips } from '../case-pixels/pixel-swap';
import { dividerHalfWidth, dividerOffsetAt, dividerPath, pullDivider, stepDivider, visibleDividerStretch } from './spring';
import './comparison-divider.css';

type Props = { tile: RefObject<HTMLDivElement | null>; position: number; width: number; height: number };

export function ComparisonDivider({ tile, position, width, height }: Props) {
  const path = useRef<SVGPathElement>(null);
  const pull = useRef<((to: number) => void) | null>(null);
  const previous = useRef(position);
  const particles = useRef<DrawComparisonParticles>(null);
  const supported = CSS.supports('clip-path', 'path(evenodd, "M0 0H1V1Z")');

  useLayoutEffect(() => {
    const element = tile.current;
    const shape = path.current;
    if (!element || !shape || !width || !height || !supported) return;
    const surface = element;
    const stroke = shape;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let spring = { offset: 0, velocity: 0 };
    let frame: number | undefined;
    let previousTime = 0;
    let visible = true;
    let percent = previous.current;
    let paintedStretch = 0;

    function clearMasks() {
      surface.removeAttribute('data-pixel-swap');
      surface.style.removeProperty('--comparison-clip-before');
      surface.style.removeProperty('--comparison-clip-after');
    }

    function paint(stretch: number) {
      paintedStretch = stretch;
      stroke.setAttribute('d', dividerPath(stretch, height));
      const offsetAt = stretch ? (y: number) => dividerOffsetAt(stretch, height, y) : undefined;
      const clips = !motion.matches && comparisonSwapClips(width, height, percent, offsetAt);
      if (clips) {
        surface.style.setProperty('--comparison-clip-before', clips.near);
        surface.style.setProperty('--comparison-clip-after', clips.far);
        surface.setAttribute('data-pixel-swap', '');
      } else {
        clearMasks();
      }
      particles.current?.(percent, offsetAt);
    }

    function stop() {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined;
      spring = { offset: 0, velocity: 0 };
      paint(0);
    }

    function tick(time: number) {
      spring = stepDivider(spring, (time - previousTime) / 1000);
      if (Math.abs(spring.offset) < .1 && Math.abs(spring.velocity) < 2) {
        stop();
        return;
      }
      previousTime = time;
      const stretch = visibleDividerStretch(spring.offset);
      if (stretch !== paintedStretch) paint(stretch);
      frame = requestAnimationFrame(tick);
    }

    pull.current = (to) => {
      const from = percent;
      percent = to;
      if (motion.matches || document.hidden || !visible || to <= 0 || to >= 100) {
        stop();
        return;
      }
      spring = pullDivider(spring, width * (from - to) / 100);
      paint(visibleDividerStretch(spring.offset));
      if (frame !== undefined) return;
      previousTime = performance.now();
      frame = requestAnimationFrame(tick);
    };

    paint(0);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) stop();
    });
    observer.observe(surface);
    motion.addEventListener('change', stop);
    document.addEventListener('visibilitychange', stop);
    return () => {
      pull.current = null;
      if (frame !== undefined) cancelAnimationFrame(frame);
      clearMasks();
      observer.disconnect();
      motion.removeEventListener('change', stop);
      document.removeEventListener('visibilitychange', stop);
    };
  }, [height, supported, tile, width]);

  useLayoutEffect(() => {
    if (previous.current !== position) pull.current?.(position);
    previous.current = position;
  }, [position]);

  return (
    <>
      {supported && <ComparisonParticles drawEdge={particles} width={width} height={height} />}
      <svg className="dns-comparison-divider" aria-hidden="true" width={dividerHalfWidth * 2}
        viewBox={`-${dividerHalfWidth} 0 ${dividerHalfWidth * 2} ${height || 1}`} preserveAspectRatio="none" shapeRendering="crispEdges">
        <path ref={path} d={dividerPath(0, height)} />
      </svg>
    </>
  );
}

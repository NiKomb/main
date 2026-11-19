import { useEffect, useRef, type RefObject } from 'react';
import { animatePaintDrop, mascotPaintEvent, paintDropDuration, type PaintPoint } from '../mascot/paint-drop';
import { frameContact, frameDash } from './stroke';
import './comparison-frame-paint.css';

const spread = 1400;
const tailLengths = [30, 22, 14, 6];
const directions = ['clockwise', 'counterclockwise'] as const;

export function ComparisonFramePaint({ tile, width, height }: {
  tile: RefObject<HTMLDivElement | null>;
  width: number;
  height: number;
}) {
  const overlay = useRef<SVGSVGElement>(null);
  const border = useRef<SVGRectElement>(null);
  const drop = useRef<SVGCircleElement>(null);
  const rect = { x: 1, y: 1, width: Math.max(0, width - 2), height: Math.max(0, height - 2) };

  useEffect(() => {
    const target = tile.current;
    const svg = overlay.current;
    const stroke = border.current;
    const droplet = drop.current;
    if (!target || !svg || !stroke || !droplet || width <= 2 || height <= 2 || svg.hasAttribute('data-painted')) return;

    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const animations: Animation[] = [];
    const stop = () => animations.forEach((animation) => animation.cancel());
    const onVisibilityChange = () => { if (document.hidden) stop(); };
    const onMotionChange = () => { if (motion.matches) stop(); };

    const paint = (event: Event) => {
      const { x, y } = (event as CustomEvent<PaintPoint>).detail;
      svg.setAttribute('data-painted', '');
      if (motion.matches || document.hidden || typeof svg.animate !== 'function') return;

      const bounds = target.getBoundingClientRect();
      const radius = Math.min(parseFloat(getComputedStyle(stroke).rx), (width - 2) / 2, (height - 2) / 2);
      const perimeter = stroke.getTotalLength();
      const half = perimeter / 2;
      if (half <= 0) return;

      const dropX = x - bounds.left;
      const dropY = y - bounds.top;
      const { x: landingX, y: landingY, origin } = frameContact(width, height, radius, perimeter, dropX, dropY);
      animations.push(animatePaintDrop(droplet, { x: dropX, y: dropY }, { x: landingX, y: landingY }));

      const delay = paintDropDuration;
      animations.push(stroke.animate([
        frameDash(perimeter, origin, 0),
        frameDash(perimeter, origin, half),
      ], { delay, duration: spread, fill: 'backwards' }));

      svg.querySelectorAll<SVGRectElement>('[data-paint-tail]').forEach((head, index) => {
        const length = Math.min(tailLengths[Math.floor(index / directions.length)], half * .9);
        const direction = directions[index % directions.length];
        const dash = (reach: number) => frameDash(perimeter, origin, reach, { length, direction });
        animations.push(head.animate([
          { ...dash(0), offset: 0, opacity: 0 },
          { ...dash(length), offset: length / half, opacity: .25 },
          { ...dash(half * .94), offset: .94, opacity: .25 },
          { ...dash(half), offset: 1, opacity: 0 },
        ], { delay, duration: spread }));
      });
    };

    target.addEventListener(mascotPaintEvent, paint, { once: true });
    motion.addEventListener('change', onMotionChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      stop();
      target.removeEventListener(mascotPaintEvent, paint);
      motion.removeEventListener('change', onMotionChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [tile, width, height]);

  return (
    <svg className="comparison-frame-paint" ref={overlay} width={width} height={height} aria-hidden="true">
      <rect className="comparison-frame-paint__base" {...rect} />
      <rect className="comparison-frame-paint__stroke" ref={border} {...rect} />
      {tailLengths.map((length) => directions.map((direction) => (
        <rect key={`${length}-${direction}`} data-paint-tail="" strokeWidth={2 - (length - 6) / 30} {...rect} />
      )))}
      <circle ref={drop} r="3" />
    </svg>
  );
}

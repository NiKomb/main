import { useEffect, useRef } from 'react';
import { paintDnsButtonGradient } from '../../sections/dns-button-gradient';
import { animatePaintDrop, mascotPaintEvent, type PaintPoint } from '../mascot/paint-drop';
import { pixelRevealStepCount, pixelRevealSteps } from './pixel-reveal';
import './metric-gradient-paint.css';

const revealDuration = 1400;

export function MetricGradientPaint() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const drop = dropRef.current;
    const tile = canvas?.parentElement;
    if (!canvas || !drop || !tile) return;

    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const context = canvas.getContext('2d');
    let fall: Animation | undefined;
    let frame = 0;
    let progress = 0;
    let origin = 0;
    let reveal: { colors: ImageData; visible: ImageData; steps: number[][]; next: number } | undefined;

    const drawGradient = () => {
      const styles = getComputedStyle(tile);
      const pixelSize = parseFloat(styles.getPropertyValue('--pixel-step'));
      if (!context || !(pixelSize > 0)) return;
      const width = Math.ceil(tile.clientWidth / pixelSize);
      const height = Math.ceil(tile.clientHeight / pixelSize);
      if (!width || !height || (width === canvas.width && height === canvas.height)) return;
      canvas.width = width;
      canvas.height = height;
      paintDnsButtonGradient(context, styles.getPropertyValue('--color-dns-button-shadow').trim(),
        styles.getPropertyValue('--color-dns-button-face').trim());
      return true;
    };

    const prepareReveal = () => {
      if (!context) return;
      const { width, height } = canvas;
      reveal = {
        colors: context.getImageData(0, 0, width, height),
        visible: context.createImageData(width, height),
        steps: pixelRevealSteps(width, height, origin * (width - 1)),
        next: 0,
      };
      context.clearRect(0, 0, width, height);
    };
    const drawRevealedPixels = () => {
      if (!context || !reveal || reveal.next >= progress) return;
      const { colors, visible, steps } = reveal;
      while (reveal.next < progress) {
        for (const pixel of steps[reveal.next++]) {
          const offset = pixel * 4;
          visible.data[offset] = colors.data[offset];
          visible.data[offset + 1] = colors.data[offset + 1];
          visible.data[offset + 2] = colors.data[offset + 2];
          visible.data[offset + 3] = colors.data[offset + 3];
        }
      }
      context.putImageData(visible, 0, 0);
    };
    const resize = new ResizeObserver(() => {
      if (drawGradient() && reveal) {
        prepareReveal();
        drawRevealedPixels();
      }
    });
    const visibility = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) stopMotion();
    });
    const complete = () => {
      if (tile.hasAttribute('data-gradient-painted')) return;
      if (!drawGradient() && reveal) context?.putImageData(reveal.colors, 0, 0);
      reveal = undefined;
      tile.removeAttribute('data-gradient-revealing');
      tile.setAttribute('data-gradient-painted', '');
      visibility.disconnect();
      resize.observe(tile);
    };
    const stopMotion = () => {
      if (!tile.hasAttribute('data-paint-started')) return;
      fall?.cancel();
      cancelAnimationFrame(frame);
      complete();
    };
    const onMotionChange = () => { if (motion.matches) stopMotion(); };
    const onVisibilityChange = () => { if (document.hidden) stopMotion(); };

    const paint = (event: Event) => {
      tile.setAttribute('data-paint-started', '');
      if (motion.matches || document.hidden || typeof drop.animate !== 'function') {
        complete();
        return;
      }
      const point = (event as CustomEvent<PaintPoint>).detail;
      const bounds = tile.getBoundingClientRect();
      const x = Math.min(bounds.width - 4, Math.max(4, point.x - bounds.left));
      origin = x / bounds.width;
      visibility.observe(tile);
      fall = animatePaintDrop(drop, { x: point.x - bounds.left, y: point.y - bounds.top }, { x, y: 1 });
      fall.onfinish = () => {
        if (!drawGradient()) {
          complete();
          return;
        }
        prepareReveal();
        tile.setAttribute('data-gradient-revealing', '');
        resize.observe(tile);
        const start = performance.now();
        const tick = (now: number) => {
          progress = Math.max(0, Math.floor((now - start) / revealDuration * pixelRevealStepCount));
          if (progress >= pixelRevealStepCount) {
            complete();
            return;
          }
          drawRevealedPixels();
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      };
    };
    tile.addEventListener(mascotPaintEvent, paint, { once: true });
    motion.addEventListener('change', onMotionChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      fall?.cancel();
      cancelAnimationFrame(frame);
      resize.disconnect();
      visibility.disconnect();
      tile.removeEventListener(mascotPaintEvent, paint);
      motion.removeEventListener('change', onMotionChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return <>
    <canvas className="metric-gradient-paint__canvas" ref={canvasRef} width="0" height="0" aria-hidden="true" />
    <svg className="metric-gradient-paint__drop" width="1" height="1" aria-hidden="true">
      <circle ref={dropRef} r="3" />
    </svg>
  </>;
}

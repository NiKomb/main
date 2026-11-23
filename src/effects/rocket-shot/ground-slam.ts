import { clearFrame, composite, createFrame, createFx } from 'pixelfx';
import * as groundSlam from './ground-slam-effect.js';
import { createMeteorFire } from './meteor-fire.js';

const fireFps = 15;

export function createGroundSlam(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d');
  if (!context) return;

  const { size: [width, height], origin: [x, y], fps, duration } = groundSlam.meta;
  const durationMs = duration * 1000;
  canvas.width = width;
  canvas.height = height;
  const frame = createFrame(width, height);
  const pixels = context.createImageData(width, height);
  let fire: ReturnType<typeof createMeteorFire>;
  const effect = createFx(groundSlam, {
    x, y, stone: '#444444',
    onRocksSettled: (rocks) => { fire = createMeteorFire(rocks, x, y); },
  });
  let currentFrame = 0;
  let stopFire: (() => void) | undefined;

  const paint = (elapsed: number) => {
    const nextFrame = Math.floor(Math.min(elapsed, durationMs) * fps / 1000);
    if (nextFrame === currentFrame && !canvas.hidden) return;
    while (currentFrame < nextFrame) {
      effect.update(1 / fps);
      currentFrame++;
    }
    effect.draw(clearFrame(frame));
    composite(frame, pixels.data);
    context.putImageData(pixels, 0, 0);
    canvas.hidden = false;
  };

  const settle = () => {
    paint(durationMs);
    if (!fire || stopFire) return;
    const { effect: flames } = fire;
    const left = Math.max(0, fire.left);
    const top = Math.max(0, fire.top);
    const layer = document.createElement('canvas');
    layer.width = Math.min(width, fire.right) - left;
    layer.height = Math.min(height, fire.bottom) - top;
    const flameContext = layer.getContext('2d');
    if (!flameContext || !layer.width || !layer.height) return;
    const flameFrame = createFrame(layer.width, layer.height, left, top);
    const flamePixels = flameContext.createImageData(layer.width, layer.height);
    const restingRocks = context.getImageData(left, top, layer.width, layer.height);
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const interval = 1000 / fireFps;
    let animation = 0;
    let visible = false;
    let last = 0;

    const tick = (time: number) => {
      const elapsed = time - last;
      const steps = Math.floor(elapsed / interval);
      if (steps > 0) {
        last = time - elapsed % interval;
        flames.update(Math.min(steps, 2) / fireFps);
        flames.draw(clearFrame(flameFrame));
        composite(flameFrame, flamePixels.data);
        flameContext.putImageData(flamePixels, 0, 0);
        context.putImageData(restingRocks, left, top);
        context.drawImage(layer, left, top);
      }
      animation = requestAnimationFrame(tick);
    };

    const sync = () => {
      if (!visible || document.hidden || motion.matches) {
        cancelAnimationFrame(animation);
        animation = 0;
      } else if (!animation) {
        last = performance.now();
        animation = requestAnimationFrame(tick);
      }
    };
    const motionChanged = () => {
      sync();
      if (motion.matches) context.putImageData(restingRocks, left, top);
    };
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    intersection.observe(canvas);
    document.addEventListener('visibilitychange', sync);
    motion.addEventListener('change', motionChanged);

    stopFire = () => {
      intersection.disconnect();
      intersection.takeRecords();
      cancelAnimationFrame(animation);
      document.removeEventListener('visibilitychange', sync);
      motion.removeEventListener('change', motionChanged);
    };
  };

  return { paint, settle, dispose: () => stopFire?.() };
}

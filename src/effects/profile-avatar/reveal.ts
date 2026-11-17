import { particleSeed } from '../case-pixels/particles';
import { pixelSize } from '../case-pixels/pixel-swap';

const duration = 750;

function easeOpacity(progress: number) {
  const fraction = Math.max(0, Math.min(progress, 1));
  return fraction * fraction * (3 - 2 * fraction);
}

export function revealAvatar(
  canvas: HTMLCanvasElement,
  previous: HTMLImageElement,
  active: HTMLImageElement,
  size: number,
) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const button = canvas.parentElement;
  const bounds = button?.getBoundingClientRect();
  if (motion.matches || document.hidden || !button || !bounds?.width
    || bounds.bottom <= 0 || bounds.top >= innerHeight) return;

  const context = canvas.getContext('2d');
  const mosaic = document.createElement('canvas');
  const sample = mosaic.getContext('2d');
  if (!context || !sample) return;

  const cellSize = pixelSize * (devicePixelRatio > 1 ? 2 : 1);
  const cellsAcross = size / pixelSize;
  const renderSize = cellSize * cellsAcross;
  canvas.width = canvas.height = renderSize;
  mosaic.width = mosaic.height = cellsAcross;

  const phase = Math.random() * 2 * Math.PI;
  const tiles = Array.from({ length: cellsAcross ** 2 }, (_, index) => {
    const column = index % cellsAcross;
    const row = Math.floor(index / cellsAcross);
    const seed = particleSeed(column, row);
    const wave = (Math.sin(column * .65 + phase) + Math.cos(row * .55 - phase) + 2) / 4;
    const appearAt = .42 * wave + (seed % 100) / 650;
    return { column, row, appearAt, sharpenAt: appearAt + .13 + (seed % 83) / 530 };
  });

  let frame: number | undefined;
  let stopped = false;
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) stop();
  });

  function stop() {
    if (stopped) return;
    stopped = true;
    if (frame !== undefined) cancelAnimationFrame(frame);
    canvas.hidden = true;
    observer.disconnect();
    motion.removeEventListener('change', stop);
    document.removeEventListener('visibilitychange', stop);
  }

  observer.observe(button);
  motion.addEventListener('change', stop);
  document.addEventListener('visibilitychange', stop);

  if (previous.complete && previous.naturalWidth) {
    context.drawImage(previous, 0, 0, renderSize, renderSize);
    canvas.hidden = false;
  }

  Promise.all([previous.decode(), active.decode()]).then(() => {
    if (stopped) return;
    sample.drawImage(active, 0, 0, cellsAcross, cellsAcross);
    const sourceSize = active.naturalWidth / cellsAcross;
    const start = performance.now();

    const draw = (progress: number) => {
      context.globalAlpha = 1;
      context.imageSmoothingEnabled = true;
      context.drawImage(previous, 0, 0, renderSize, renderSize);

      for (const { column, row, appearAt, sharpenAt } of tiles) {
        const opacity = easeOpacity((progress - appearAt) / .11);
        if (!opacity) continue;

        const detail = easeOpacity((progress - sharpenAt) / .12);
        const x = column * cellSize;
        const y = row * cellSize;

        if (detail > 0) {
          context.globalAlpha = opacity;
          context.imageSmoothingEnabled = true;
          context.drawImage(active, column * sourceSize, row * sourceSize, sourceSize, sourceSize,
            x, y, cellSize, cellSize);
        }
        if (detail < 1) {
          context.globalAlpha = opacity * (1 - detail);
          context.imageSmoothingEnabled = false;
          context.drawImage(mosaic, column, row, 1, 1, x, y, cellSize, cellSize);
        }
      }
    };

    function animate(time: number) {
      const elapsed = Math.max(0, (time - start) / duration);
      if (elapsed >= 1) {
        stop();
        return;
      }
      draw(1 - (1 - elapsed) ** 3);
      frame = requestAnimationFrame(animate);
    }

    draw(0);
    canvas.hidden = false;
    frame = requestAnimationFrame(animate);
  }).catch(stop);

  return stop;
}

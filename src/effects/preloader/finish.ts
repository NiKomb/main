import { playGroundMovement } from '../mascot/ground-movement';
import rider from '../mascot/rider.png';

export function finishPreloader(onReveal: () => void, page = document) {
  const preloader = page.getElementById('site-preloader');
  const root = page.getElementById('root');
  const view = page.defaultView;
  if (!preloader || !root || !view) {
    onReveal();
    return;
  }

  const motion = view.matchMedia('(prefers-reduced-motion: reduce)');
  const style = view.getComputedStyle(preloader);
  let animation: Animation | undefined;
  let blink: ReturnType<typeof playGroundMovement>;
  let stopped = false;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    page.removeEventListener('visibilitychange', skipIfNeeded);
    motion.removeEventListener('change', skipIfNeeded);
    view.removeEventListener('resize', reveal);
    animation?.cancel();
    blink?.cancel();
    preloader.remove();
    root.removeAttribute('inert');
  };

  function reveal() {
    if (stopped) return;
    stop();
    onReveal();
  }

  function skipIfNeeded() {
    if (page.hidden || motion.matches) reveal();
  }

  if (page.hidden || motion.matches || style.visibility === 'hidden') {
    reveal();
    return;
  }

  const image = page.createElement('img');
  image.src = rider;
  const sprite = preloader.querySelector<HTMLElement>('.site-preloader__mascot');
  const canvas = preloader.querySelector<HTMLCanvasElement>('.site-preloader__blink');
  const property = '--site-preloader-progress';
  const depart = () => {
    if (stopped) return;
    if (!sprite || !canvas || !image.naturalWidth) {
      reveal();
      return;
    }

    const viewport = preloader.getBoundingClientRect();
    const bounds = sprite.getBoundingClientRect();
    const point = { x: bounds.left - viewport.left, y: bounds.top - viewport.top };
    preloader.style.setProperty(property, '100');
    animation?.cancel();
    preloader.dataset.phase = 'blink';
    blink = playGroundMovement(canvas, image, point, point.x, () => {
      animation = preloader.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' });
      void animation.finished.then(reveal, reveal);
    }, reveal, { kind: 'blink-departure', facing: 'right' });
    if (blink) {
      sprite.style.visibility = 'hidden';
      view.addEventListener('resize', reveal);
    } else reveal();
  };

  const progress = Number(style.getPropertyValue(property));
  const travelTime = Math.max(160, (100 - progress) * 4);
  const duration = travelTime + 80;
  preloader.dataset.phase = 'finish';
  animation = preloader.animate([
    { [property]: progress },
    { [property]: 100, offset: travelTime / duration },
    { [property]: 100 },
  ], { duration, fill: 'forwards' });

  page.addEventListener('visibilitychange', skipIfNeeded);
  motion.addEventListener('change', skipIfNeeded);
  void animation.finished.then(depart, reveal);
  return stop;
}

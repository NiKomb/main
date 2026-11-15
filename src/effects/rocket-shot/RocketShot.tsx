import { useEffect, useRef, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { aimLauncher, gripPoint } from './launcher-geometry';
import { readScroll, type ReadingScroll } from './reading-scroll';
import launcher from './launcher.png';
import flight from './flight.png';
import blast from './blast.png';
import './rocket-shot.css';

type Props = {
  target: RefObject<HTMLLIElement | null>;
  actor: RefObject<HTMLSpanElement | null>;
  onImpact: (broken: boolean) => void;
};

const flightDistance = [0, 8, 17, 27, 37, 50, 63, 77, 92, 108, 125, 144, 163, 184, 204, 225, 246];
const fps = 30;
const blastFrames = 96;

type Point = ReturnType<typeof gripPoint>;

function loadImage(src: string) {
  const image = new Image();
  image.src = src;
  return image.decode().then(() => image);
}

function drawFrame(context: CanvasRenderingContext2D, image: HTMLImageElement, index: number,
  width: number, height: number, x: number, y: number) {
  context.drawImage(image, index % 8 * width, Math.floor(index / 8) * height, width, height, x, y, width, height);
}

export function RocketShot({ target, actor, onImpact }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const block = target.current;
    const mascot = actor.current;
    const sprite = mascot?.querySelector<HTMLElement>('.mascot__sprite');
    const stage = canvas.current;
    const context = stage?.getContext('2d');
    const layout = block?.closest<HTMLElement>('.dns-case-layout');
    const heading = layout?.querySelector<HTMLElement>('#projects-heading');
    if (!block || !mascot || !sprite || !stage || !context || !layout || !heading || block.hasAttribute('data-rocket-broken')) return;

    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let images: [HTMLImageElement, HTMLImageElement, HTMLImageElement] | undefined;
    let loadStarted = false;
    let active = true;
    let frame = 0;
    let sample: ReadingScroll | undefined;
    let shot: { time: number; origin: Point } | undefined;
    let hit = false;
    let scale = 2;
    let edge = 0;

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      sample = undefined;
      shot = undefined;
      if (hit) images = undefined;
      stage.hidden = true;
    };

    const measure = () => {
      stop();
      const style = getComputedStyle(heading);
      edge = parseFloat(style.getPropertyValue('--dns-case-heading-anchor')) === 0
        ? parseFloat(style.scrollMarginTop)
        : parseFloat(getComputedStyle(layout).getPropertyValue('--dns-case-edge-inset'));
      scale = window.innerWidth < 560 ? 2 : 3;
    };

    const readGrip = (): Point => {
      const style = getComputedStyle(sprite);
      // rider.png frames are displayed at twice their native size.
      const column = Math.round(-parseFloat(style.backgroundPositionX) / 72);
      const row = Math.round(-parseFloat(style.backgroundPositionY) / 72);
      const { x, y } = gripPoint(sprite.getBoundingClientRect(), column, row, mascot.dataset.direction === 'left');
      return { x: x / scale, y: y / scale };
    };

    const blockCenter = (bounds: DOMRect): Point => ({
      x: (bounds.left + bounds.width / 2) / scale,
      y: (bounds.top + bounds.height / 2) / scale,
    });

    const paint = (time: number) => {
      if (!images || !shot) return;
      const [gun, trail, explosion] = images;
      const bounds = block.getBoundingClientRect();
      const aim = blockCenter(bounds);
      const elapsed = Math.floor((time - shot.time) * fps / 1000);
      context.clearRect(0, 0, stage.width, stage.height);
      if (elapsed < flightDistance.length) {
        const grip = readGrip();
        const gunScale = 2 / scale;
        const { angle, flip } = aimLauncher(grip, aim, gunScale);
        context.save();
        context.translate(grip.x, grip.y);
        context.rotate(angle);
        context.scale(gunScale, gunScale * flip);
        context.drawImage(gun, -13, -23);
        context.restore();

        const dx = aim.x - shot.origin.x;
        const dy = aim.y - shot.origin.y;
        const travel = flightDistance[elapsed] / flightDistance[flightDistance.length - 1];
        context.save();
        context.translate(shot.origin.x, shot.origin.y);
        context.rotate(Math.atan2(dy, dx));
        drawFrame(context, trail, elapsed, 152, 72, Math.hypot(dx, dy) * travel - 125, -36);
        context.restore();
      } else {
        if (!hit) {
          hit = true;
          onImpact(true);
          window.removeEventListener('scroll', queue);
        }
        const blastFrame = elapsed - flightDistance.length;
        if (blastFrame >= blastFrames || bounds.bottom <= 0 || bounds.top >= innerHeight) return stop();
        drawFrame(context, explosion, blastFrame, 184, 184, Math.round(aim.x) - 92, Math.round(aim.y) - 96);
      }
      frame = requestAnimationFrame(paint);
    };

    const check = (time: number) => {
      frame = 0;
      const bounds = block.getBoundingClientRect();
      if (!loadStarted && bounds.top < 2 * innerHeight && bounds.bottom > 0) {
        loadStarted = true;
        void Promise.all([loadImage(launcher), loadImage(flight), loadImage(blast)]).then((loaded) => {
          if (!active) return;
          images = loaded;
          queue();
        }, () => {});
      }
      const top = bounds.top - edge;
      const visible = Math.min(bounds.bottom, innerHeight) - Math.max(bounds.top, edge);
      sample = readScroll(sample, { time, scroll: window.scrollY, top }, visible / bounds.height, innerHeight - edge);
      if (!sample.fire || !images) {
        if (sample.atEdgeSince !== undefined && !sample.fire) queue();
        return;
      }

      stage.width = Math.ceil(innerWidth / scale);
      stage.height = Math.ceil(innerHeight / scale);
      stage.hidden = false;
      context.imageSmoothingEnabled = false;
      shot = { time, origin: aimLauncher(readGrip(), blockCenter(bounds), 2 / scale).muzzle };
      paint(time);
    };

    const queue = () => {
      if (!frame && !hit && !document.hidden && !motion.matches) frame = requestAnimationFrame(check);
    };

    const reset = () => {
      measure();
      queue();
    };

    measure();
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', reset);
    document.addEventListener('visibilitychange', reset);
    motion.addEventListener('change', reset);
    queue();

    return () => {
      active = false;
      stop();
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', reset);
      document.removeEventListener('visibilitychange', reset);
      motion.removeEventListener('change', reset);
    };
  }, [target, actor, onImpact]);

  return createPortal(<canvas ref={canvas} className="rocket-shot" aria-hidden="true" hidden />, document.body);
}

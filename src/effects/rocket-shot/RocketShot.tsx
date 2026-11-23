import { useEffect, useRef, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { aimLauncher, flightFrame, gripPoint } from './launcher-geometry';
import { rocketCaptionHitEvent, shotCaptionCentered, shotDeadline } from './scroll-trigger';
import type { createGroundSlam } from './ground-slam';
import launcher from './launcher.png';
import flight from './flight.png';
import blast from './blast.png';
import './rocket-shot.css';

type Props = {
  target: RefObject<HTMLElement | null>;
  actor: RefObject<HTMLSpanElement | null>;
  ground: RefObject<HTMLCanvasElement | null>;
};

const fps = 30;
const blastFrames = 96;
const rocketNose = 134;

type Point = ReturnType<typeof gripPoint>;

function loadImage(src: string) {
  const image = new Image();
  image.src = src;
  return image.decode().then(() => image);
}

function drawFrame(context: CanvasRenderingContext2D, image: HTMLImageElement, index: number,
  width: number, height: number, x: number, y: number, factor = 1) {
  context.drawImage(image, index % 8 * width, Math.floor(index / 8) * height, width, height, x, y, width * factor, height * factor);
}

export function RocketShot({ target, actor, ground }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const page = document.body;
    const groundCanvas = ground.current;
    if (!groundCanvas) return;
    let groundSlam: ReturnType<typeof createGroundSlam>;
    if (page.hasAttribute('data-rocket-caption-hit')) {
      let active = true;
      void import('./ground-slam').then(({ createGroundSlam }) => {
        if (!active) return;
        groundSlam = createGroundSlam(groundCanvas);
        groundSlam?.settle();
      }, () => {});
      return () => {
        active = false;
        groundSlam?.dispose();
      };
    }

    const block = target.current;
    const mascot = actor.current;
    const sprite = mascot?.querySelector<HTMLElement>('.mascot__sprite');
    const stage = canvas.current;
    const context = stage?.getContext('2d');
    const layout = block?.closest<HTMLElement>('.dns-case-layout');
    const heading = layout?.querySelector<HTMLElement>('#projects-heading');
    if (!block || !mascot || !sprite || !stage || !context || !layout || !heading) return;

    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let images: [HTMLImageElement, HTMLImageElement, HTMLImageElement] | undefined;
    let loadStarted = false;
    let active = true;
    let frame = 0;
    let shotTimer = 0;
    let fireAt: number | undefined;
    let shot: { time: number; origin: Point; arrived: boolean } | undefined;
    let impactTime: number | undefined;
    let scale = 2;
    let edge = 0;

    const stop = () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(shotTimer);
      frame = 0;
      fireAt = undefined;
      shot = undefined;
      if (impactTime !== undefined) {
        if (active) groundSlam?.settle();
        images = undefined;
      }
      stage.hidden = true;
    };

    const measure = () => {
      const style = getComputedStyle(heading);
      edge = parseFloat(style.getPropertyValue('--dns-case-heading-anchor')) === 0
        ? parseFloat(style.scrollMarginTop)
        : parseFloat(getComputedStyle(layout).getPropertyValue('--dns-case-edge-inset'));
      scale = window.innerWidth < 560 ? 2 : 3;
    };

    const sizeStage = () => {
      stage.width = Math.ceil(innerWidth / scale);
      stage.height = Math.ceil(innerHeight / scale);
      context.imageSmoothingEnabled = false;
    };

    const readGrip = (): Point => {
      const style = getComputedStyle(sprite);
      // rider.png frames are displayed at twice their native size.
      const column = Math.round(-parseFloat(style.backgroundPositionX) / 72);
      const row = Math.round(-parseFloat(style.backgroundPositionY) / 72);
      const { x, y } = gripPoint(sprite.getBoundingClientRect(), column, row, mascot.dataset.direction === 'left');
      return { x: x / scale, y: y / scale };
    };

    const targetCenter = (bounds: Pick<DOMRectReadOnly, 'left' | 'top' | 'width' | 'height'>): Point => ({
      x: (bounds.left + bounds.width / 2) / scale,
      y: (bounds.top + bounds.height / 2) / scale,
    });

    const paint = (time: number) => {
      if (!images || !shot) return;
      const [gun, trail, explosion] = images;
      const bounds = block.getBoundingClientRect();
      const captionInView = bounds.bottom > edge && bounds.top < innerHeight;
      if (!captionInView && impactTime === undefined) return stop();
      const aim = targetCenter(bounds);
      context.clearRect(0, 0, stage.width, stage.height);
      if (!shot.arrived) {
        const flight = flightFrame((time - shot.time) * fps / 1000);
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
        context.save();
        context.translate(shot.origin.x, shot.origin.y);
        context.rotate(Math.atan2(dy, dx));
        drawFrame(context, trail, flight.index, 152, 72, Math.hypot(dx, dy) * flight.progress - rocketNose, -36);
        context.restore();
        // Draw the rocket at its destination before replacing it with the explosion.
        shot.arrived = flight.arrived;
      } else {
        if (impactTime === undefined) {
          impactTime = time;
          page.setAttribute('data-rocket-caption-hit', '');
          mascot.dispatchEvent(new CustomEvent(rocketCaptionHitEvent, { detail: block }));
          window.removeEventListener('scroll', queue);
        }
        const impactElapsed = time - impactTime;
        const blastFrame = Math.floor(impactElapsed * fps / 1000);
        if (blastFrame >= blastFrames) return stop();
        if (captionInView) {
          const maxBlastSize = scale === 2 ? 160 : 216;
          const blastSize = Math.max(64, Math.min(maxBlastSize, bounds.width)) / scale;
          drawFrame(context, explosion, blastFrame, 184, 184,
            Math.round(aim.x - blastSize / 2), Math.round(aim.y - blastSize / 2), blastSize / 184);
        }
        const groundBounds = groundCanvas.parentElement?.getBoundingClientRect();
        if (groundBounds && groundBounds.bottom > 0 && groundBounds.top < innerHeight) {
          groundSlam?.paint(impactElapsed);
        }
      }
      frame = requestAnimationFrame(paint);
    };

    const check = (time: number) => {
      frame = 0;
      window.clearTimeout(shotTimer);
      const bounds = block.getBoundingClientRect();
      if (!loadStarted && bounds.top < 2 * innerHeight && bounds.bottom > 0) {
        loadStarted = true;
        void Promise.all([loadImage(launcher), loadImage(flight), loadImage(blast), import('./ground-slam')])
          .then(([gun, trail, explosion, { createGroundSlam }]) => {
            if (!active) return;
            images = [gun, trail, explosion];
            groundSlam = createGroundSlam(groundCanvas);
            queue();
          }, () => {});
      }
      fireAt = shotDeadline(fireAt, time, shotCaptionCentered(bounds, innerHeight, edge));
      if (fireAt === undefined) return;
      if (time < fireAt) {
        shotTimer = window.setTimeout(queue, fireAt - time);
        return;
      }
      if (!images || mascot.hidden) return;
      if (mascot.style.opacity === '0') {
        shotTimer = window.setTimeout(queue, 100);
        return;
      }
      const gripBounds = sprite.getBoundingClientRect();
      if (!gripBounds.width || gripBounds.bottom <= 0 || gripBounds.top >= innerHeight) return;
      const aim = targetCenter(bounds);
      sizeStage();
      stage.hidden = false;
      shot = {
        time,
        origin: aimLauncher(readGrip(), aim, 2 / scale).muzzle,
        arrived: false,
      };
      paint(time);
    };

    const queue = () => {
      if (!frame && impactTime === undefined && !document.hidden && !motion.matches) frame = requestAnimationFrame(check);
    };

    const reset = () => {
      measure();
      if (shot && impactTime !== undefined && !document.hidden && !motion.matches) {
        sizeStage();
        return;
      }
      stop();
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
      groundSlam?.dispose();
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', reset);
      document.removeEventListener('visibilitychange', reset);
      motion.removeEventListener('change', reset);
    };
  }, [target, actor, ground]);

  return createPortal(<canvas ref={canvas} className="rocket-shot" aria-hidden="true" hidden />, document.body);
}

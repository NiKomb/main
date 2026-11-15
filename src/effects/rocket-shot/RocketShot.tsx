import { useEffect, useRef, type RefObject } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { aimLauncher, flightFrame, gripPoint } from './launcher-geometry';
import { shotDeadline } from './scroll-trigger';
import { drawFragments, fragmentDuration, sampleSwitch, sampleText } from './fragments';
import { projectSwitch, switchCrop } from './switch-crop';
import launcher from './launcher.png';
import flight from './flight.png';
import blast from './blast.png';
import './rocket-shot.css';

type Props = {
  target: RefObject<HTMLElement | null>;
  comparison: RefObject<HTMLDivElement | null>;
  actor: RefObject<HTMLSpanElement | null>;
  onImpact: (hit: boolean) => void;
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

export function RocketShot({ target, comparison, actor, onImpact }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const block = target.current;
    const tile = comparison.current;
    const slider = tile?.querySelector('input');
    const before = tile?.querySelector<HTMLImageElement>('[data-side="before"] img');
    const after = tile?.querySelector<HTMLImageElement>('[data-side="after"] img');
    const mascot = actor.current;
    const sprite = mascot?.querySelector<HTMLElement>('.mascot__sprite');
    const stage = canvas.current;
    const context = stage?.getContext('2d');
    const layout = block?.closest<HTMLElement>('.dns-case-layout');
    const heading = layout?.querySelector<HTMLElement>('#projects-heading');
    if (!block || !tile || !slider || !before || !after || !mascot || !sprite || !stage || !context || !layout || !heading) return;

    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let images: [HTMLImageElement, HTMLImageElement, HTMLImageElement, HTMLImageElement, HTMLImageElement] | undefined;
    let loadStarted = false;
    let active = true;
    let frame = 0;
    let shotTimer = 0;
    let fireAt: number | undefined;
    let shot: {
      time: number; origin: Point; targetOffset: Point; arrived: boolean;
      switchOffset: Point; switchWidth: number;
      caption: ReturnType<typeof sampleText>; switchPixels: ReturnType<typeof sampleSwitch>;
    } | undefined;
    let impactTime: number | undefined;
    let scale = 2;
    let edge = 0;

    const stop = () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(shotTimer);
      frame = 0;
      fireAt = undefined;
      shot = undefined;
      if (impactTime !== undefined) images = undefined;
      block.removeAttribute('data-rocket-breaking');
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

    const targetCenter = (bounds: Pick<DOMRectReadOnly, 'left' | 'top' | 'width' | 'height'>): Point => ({
      x: (bounds.left + bounds.width / 2) / scale,
      y: (bounds.top + bounds.height / 2) / scale,
    });

    const switchBounds = (bounds: DOMRectReadOnly, position = slider.valueAsNumber) => {
      const divider = bounds.left + bounds.width * position / 100;
      const box = projectSwitch(before.getBoundingClientRect(), divider);
      if (box && box.top < innerHeight && box.top + box.height > edge) return box;
    };

    const paint = (time: number) => {
      if (!images || !shot) return;
      const [gun, trail, explosion, , replacement] = images;
      const bounds = block.getBoundingClientRect();
      const tileBounds = tile.getBoundingClientRect();
      if (tileBounds.bottom <= edge || tileBounds.top >= innerHeight) return stop();
      const aim = { x: tileBounds.left / scale + shot.targetOffset.x, y: tileBounds.top / scale + shot.targetOffset.y };
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
          block.setAttribute('data-rocket-breaking', '');
          flushSync(() => onImpact(true));
          window.removeEventListener('scroll', queue);
        }
        const impactElapsed = time - impactTime;
        const blastFrame = Math.floor(impactElapsed * fps / 1000);
        if (blastFrame >= blastFrames) return stop();
        const blastSize = Math.max(64, Math.min(128, shot.switchWidth)) / scale;
        drawFrame(context, explosion, blastFrame, 184, 184,
          Math.round(aim.x - blastSize / 2), Math.round(aim.y - blastSize / 2), blastSize / 184);
        if (impactElapsed < fragmentDuration) {
          drawFragments(context, shot.caption, targetCenter(bounds), impactElapsed);
          const box = switchBounds(tileBounds);
          const center = {
            x: tileBounds.left / scale + shot.switchOffset.x,
            y: tileBounds.top / scale + shot.switchOffset.y,
          };
          context.save();
          context.beginPath();
          context.rect(0, edge / scale, stage.width, (innerHeight - edge) / scale);
          context.clip();
          if (box) {
            context.drawImage(replacement, switchCrop.x, switchCrop.y, box.sourceWidth, switchCrop.height,
              box.left / scale, box.top / scale, box.width / scale, box.height / scale);
          }
          drawFragments(context, shot.switchPixels, center, impactElapsed);
          context.restore();
        } else if (block.hasAttribute('data-rocket-breaking')) {
          block.removeAttribute('data-rocket-breaking');
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
        void Promise.all([loadImage(launcher), loadImage(flight), loadImage(blast), loadImage(before.src), loadImage(after.src)]).then((loaded) => {
          if (!active) return;
          images = loaded;
          queue();
        }, () => {});
      }
      const visible = bounds.height > 0 && bounds.top < innerHeight && bounds.bottom > edge;
      fireAt = shotDeadline(fireAt, time, visible);
      if (fireAt === undefined) return;
      if (time < fireAt) {
        shotTimer = window.setTimeout(queue, fireAt - time);
        return;
      }
      if (!images) return;
      const tileBounds = tile.getBoundingClientRect();
      const box = switchBounds(tileBounds);
      const fullSwitch = switchBounds(tileBounds, 100);
      if (!box || !fullSwitch) return;

      const aim = targetCenter(box);
      const center = targetCenter(fullSwitch);
      stage.width = Math.ceil(innerWidth / scale);
      stage.height = Math.ceil(innerHeight / scale);
      stage.hidden = false;
      context.imageSmoothingEnabled = false;
      shot = {
        time,
        origin: aimLauncher(readGrip(), aim, 2 / scale).muzzle,
        targetOffset: { x: aim.x - tileBounds.left / scale, y: aim.y - tileBounds.top / scale },
        switchOffset: { x: center.x - tileBounds.left / scale, y: center.y - tileBounds.top / scale },
        switchWidth: fullSwitch.width,
        arrived: false,
        caption: sampleText(block, bounds, scale),
        switchPixels: sampleSwitch(images[3], fullSwitch, scale),
      };
      paint(time);
    };

    const queue = () => {
      if (!frame && impactTime === undefined && !document.hidden && !motion.matches) frame = requestAnimationFrame(check);
    };

    const reset = () => {
      measure();
      queue();
    };

    measure();
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', reset);
    slider.addEventListener('input', queue);
    document.addEventListener('visibilitychange', reset);
    motion.addEventListener('change', reset);
    queue();

    return () => {
      active = false;
      stop();
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', reset);
      slider.removeEventListener('input', queue);
      document.removeEventListener('visibilitychange', reset);
      motion.removeEventListener('change', reset);
    };
  }, [target, comparison, actor, onImpact]);

  return createPortal(<canvas ref={canvas} className="rocket-shot" aria-hidden="true" hidden />, document.body);
}

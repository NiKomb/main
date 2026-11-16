import movement, { type Frame } from './sprite-fusion-movement';

type Point = { x: number; y: number };
const spriteSize = 36;
const scale = 2;
const foot = 68;
type GroundMovementOptions = {
  kind: 'dash' | 'blink' | 'blink-arrival' | 'blink-departure';
  facing?: 'left' | 'right';
  endY?: number;
};

export function playGroundMovement(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  start: Point,
  endX: number,
  move: (x: number, opacity: number) => void,
  finish: () => void,
  { kind, facing: direction, endY = start.y }: GroundMovementOptions,
) {
  const context = canvas.getContext('2d');
  if (!context || !image.naturalWidth) return;

  const sheet = document.createElement('canvas');
  sheet.width = sheet.height = spriteSize;
  const source = sheet.getContext('2d');
  if (!source) return;

  const facing = direction === 'left' || (direction === undefined && endX < start.x) ? -1 : 1;
  if (facing < 0) {
    source.translate(spriteSize, 0);
    source.scale(-1, 1);
  }
  source.drawImage(image, 0, 0, spriteSize, spriteSize, 0, 0, spriteSize, spriteSize);
  const silhouette = new Uint32Array(source.getImageData(0, 0, spriteSize, spriteSize).data.buffer);
  const bounds = canvas.parentElement?.getBoundingClientRect();
  if (!bounds) return;
  const w = Math.ceil(bounds.width / scale);
  const ox = Math.max(0, Math.floor((Math.min(start.x, endX) - 160) / scale));
  const oy = Math.max(0, Math.floor((Math.min(start.y, endY) - 120) / scale));
  const width = Math.min(w, Math.ceil((Math.max(start.x, endX) + 220) / scale)) - ox;
  const height = Math.min(Math.ceil(bounds.height / scale), Math.ceil((Math.max(start.y, endY) + 170) / scale)) - oy;
  if (width <= 0 || height <= 0) return;

  canvas.width = width;
  canvas.height = height;
  Object.assign(canvas.style, { left: `${ox * scale}px`, top: `${oy * scale}px`, width: `${width * scale}px`, height: `${height * scale}px` });

  const pixels = context.createImageData(width, height);
  const frame: Frame = {
    w: width, h: height, ox, oy,
    color: new Uint32Array(pixels.data.buffer),
    light: new Uint32Array(width * height),
  };
  const arrivalOnly = kind === 'blink-arrival';
  const departureOnly = kind === 'blink-departure';
  const blink = kind !== 'dash';
  const centerX = start.x + spriteSize;
  const feetY = start.y + foot;
  const dashTime = .27;
  const moveEnd = arrivalOnly ? .47 : blink ? .9 : .12 + dashTime;
  let x = start.x;
  let elapsed = 0;
  let last = performance.now();
  let raf = 0;
  let finished = false;
  let cancelled = false;
  let vanished = false;
  const fx = movement({
    kind: blink ? 'blink' : 'dash',
    arrivalOnly,
    departureOnly,
    x: centerX, y: feetY, facing, distance: Math.abs(endX - start.x),
    to: endX + spriteSize, toY: endY + foot, time: dashTime, ground: feetY,
    actor: {
      feet: () => [x + spriteSize, feetY],
      silhouette: () => ({
        x: Math.round(x / scale), y: Math.round(start.y / scale),
        w: spriteSize, h: spriteSize, data: silhouette,
      }),
    },
    cue(name, data) {
      if (name === 'move' && data?.x !== undefined) x = data.x - spriteSize;
      if (name === 'vanish') {
        vanished = true;
        move(x, 0);
      }
      if (name === 'appear') x = endX;
    },
  });

  function cancel() {
    cancelled = true;
    cancelAnimationFrame(raf);
    canvas.hidden = true;
  }

  function draw(now: number) {
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;
    elapsed += dt;
    fx.update(dt);
    if (!blink && !finished) move(x, 1);
    frame.color.fill(0);
    frame.light.fill(0);
    fx.draw(frame);
    canvasContext.putImageData(pixels, 0, 0);
    if (departureOnly && !vanished) {
      canvasContext.globalCompositeOperation = 'destination-over';
      canvasContext.drawImage(sheet, Math.round(start.x / scale) - ox, Math.round(start.y / scale) - oy);
      canvasContext.globalCompositeOperation = 'source-over';
    }
    if (!departureOnly && elapsed >= moveEnd && !finished) {
      finished = true;
      move(endX, 1);
      finish();
    }
    if (cancelled) return;
    if (fx.done()) cancel();
    else raf = requestAnimationFrame(draw);
  }

  const canvasContext = context;
  canvas.hidden = false;
  raf = requestAnimationFrame(draw);
  return { cancel, kind: blink ? 'blink' : 'dash' };
}

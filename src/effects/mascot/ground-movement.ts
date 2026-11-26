import movement, { type Frame } from './sprite-fusion-movement';

type Point = { x: number; y: number };
const spriteSize = 36;
const scale = 2;
const foot = 68;
export type BlinkDeparture = { sprite: HTMLCanvasElement; inset: number; pixels: Uint32Array };
type GroundMovementOptions = {
  kind: 'dash' | 'blink' | 'blink-arrival' | 'blink-departure';
  facing?: 'left' | 'right';
  endY?: number;
  dashExitSpeed?: number;
  departureFrame?: BlinkDeparture;
};

export function playGroundMovement(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  start: Point,
  endX: number,
  move: (x: number, opacity: number) => void,
  finish: () => void,
  { kind, facing: direction, endY = start.y, dashExitSpeed, departureFrame }: GroundMovementOptions,
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
  const viewport = canvas.ownerDocument?.documentElement;
  const farX = Math.max(start.x, endX);
  const farY = Math.max(start.y, endY);
  let right = Math.ceil(bounds.width / scale);
  let bottom = Math.ceil(bounds.height / scale);
  if (viewport && farX + spriteSize * scale > bounds.width) {
    right = Math.max(right, Math.floor((viewport.clientWidth - bounds.left) / scale));
  }
  if (viewport && farY + spriteSize * scale > bounds.height) {
    bottom = Math.max(bottom, Math.floor((viewport.clientHeight - bounds.top) / scale));
  }
  const ox = Math.max(Math.floor(Math.min(0, -bounds.left) / scale), Math.floor((Math.min(start.x, endX) - 160) / scale));
  const oy = Math.max(Math.floor(Math.min(0, -bounds.top) / scale), Math.floor((Math.min(start.y, endY) - 120) / scale));
  const width = Math.min(right, Math.ceil((farX + 220) / scale)) - ox;
  const height = Math.min(bottom, Math.ceil((farY + 170) / scale)) - oy;
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
  const departureSprite = departureFrame?.sprite ?? (departureOnly ? sheet : undefined);
  const inset = departureFrame?.inset ?? 0;
  const departureX = Math.round(start.x / scale) - inset;
  const departureY = Math.round(start.y / scale) - inset;
  const departureSilhouette = departureFrame && {
    x: departureX, y: departureY, w: departureFrame.sprite.width, h: departureFrame.sprite.height, data: departureFrame.pixels,
  };
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
    to: endX + spriteSize, toY: endY + foot, time: dashTime, ground: feetY, dashExitSpeed,
    actor: {
      feet: () => [x + spriteSize, feetY],
      silhouette: () => departureSilhouette ?? ({
        x: Math.round(x / scale), y: Math.round(start.y / scale),
        w: spriteSize, h: spriteSize, data: silhouette,
      }),
    },
    arrivalSilhouette: departureFrame && (() => ({
      x: departureX + inset, y: departureY + inset, w: spriteSize, h: spriteSize, data: silhouette,
    })),
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

  function drawDeparture() {
    if (!departureSprite || vanished) return;
    canvasContext.globalCompositeOperation = 'destination-over';
    canvasContext.drawImage(departureSprite, departureX - ox, departureY - oy);
    canvasContext.globalCompositeOperation = 'source-over';
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
    drawDeparture();
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
  if (departureFrame) drawDeparture();
  raf = requestAnimationFrame(draw);
  return { cancel, kind: blink ? 'blink' : 'dash' };
}

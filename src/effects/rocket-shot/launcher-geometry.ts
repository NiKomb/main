type Point = { x: number; y: number };

const cellSize = 36;
const idleHands = [[29, 20], [29, 21], [29, 21], [29, 20], [29, 20], [29, 20]];
const runningHands = [[29, 19], [26, 19], [23, 22], [21, 21], [26, 17], [24, 18], [23, 22], [27, 19]];
const flightDistance = [0, 8, 17, 27, 37, 50, 63, 77, 92, 108, 125, 144, 163, 184, 204, 225, 246];

export function flightFrame(elapsedFrames: number) {
  const last = flightDistance.length - 1;
  const step = Math.min(elapsedFrames, last);
  const index = Math.floor(step);
  const next = Math.min(index + 1, last);
  const distance = flightDistance[index] + (flightDistance[next] - flightDistance[index]) * (step - index);
  return { index, progress: distance / flightDistance[last], arrived: step === last };
}

export function gripPoint(bounds: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  column: number, row: number, facingLeft: boolean): Point {
  // Hand positions are measured in the unflipped 36px cells of rider.png.
  const [x, y] = row === 2 ? [32, 17]
    : (row === 1 ? runningHands[column] : idleHands[column]) ?? idleHands[0];
  return {
    x: bounds.left + bounds.width * (facingLeft ? cellSize - x : x) / cellSize,
    y: bounds.top + bounds.height * y / cellSize,
  };
}

export function aimLauncher(grip: Point, target: Point, scale: number) {
  const dx = target.x - grip.x;
  const dy = target.y - grip.y;
  const flip = dx < 0 ? -1 : 1;
  // The launcher sprite has its grip at (13, 23) and muzzle at (36, 16).
  const barrelX = 23 * scale;
  const barrelY = -7 * scale * flip;
  const angle = Math.atan2(dy, dx) - Math.asin(Math.max(-1, Math.min(1, barrelY / Math.hypot(dx, dy))));
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    angle,
    flip,
    muzzle: {
      x: grip.x + barrelX * cos - barrelY * sin,
      y: grip.y + barrelX * sin + barrelY * cos,
    },
  };
}

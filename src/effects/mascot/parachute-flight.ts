import type { Point } from './mascot-movement';

export const parachuteCelSize = 144;
export const parachuteSpriteOffset = { x: -36, y: -64 };

export function createParachuteTrigger() {
  let remainingClicks = 3;
  let launched = false;

  return (readTrack: () => ReturnType<typeof createParachuteTrack> | undefined) => {
    if (launched) return;
    if (remainingClicks > 0) remainingClicks -= 1;
    if (remainingClicks > 0) return;
    const track = readTrack();
    if (track) launched = true;
    return track;
  };
}

type Cel = { hold: number; column: number; row: number };
type GlideOffset = Point & { tilt: number };
type Direction = -1 | 1;
type ScrollInput = 'touch' | 'pixel-wheel' | 'wheel-step';
type ScrollBurst = { direction: Direction; distance: number; samples: number; start: number; last: number; drifted: boolean; widened: boolean };
export type ParachuteGlide = {
  elapsed: number;
  offset: Point;
  velocity: Point;
  target: Point;
  tilt: number;
  burst?: ScrollBurst;
  input?: { kind: ScrollInput; last: number; samples: number };
};

const flipHolds = [74, 68, 65, 65, 68, 75, 68];
const openingHolds = [58, 65, 72, 80, 88, 96, 102];
const settlingHolds = [56, 58, 62, 65, 68, 72];
const glideResponse = { x: .012, y: .008 };

export function visibleParachuteEdge(
  tile: Pick<DOMRect, 'top' | 'right'>,
  clip: Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'> | undefined,
  width: number,
  height: number,
) {
  if (tile.top < Math.max(0, clip?.top ?? 0) || tile.top >= Math.min(height, clip?.bottom ?? height) ||
    tile.right <= Math.max(0, clip?.left ?? 0) || tile.right > Math.min(width, clip?.right ?? width) + 1) return;
  return Math.min(tile.right, width);
}

export function clampParachute(point: Point, width: number, height: number): Point {
  const left = Math.min(-parachuteSpriteOffset.x, (width - 72) / 2);
  const top = Math.min(-parachuteSpriteOffset.y, (height - 72) / 2);
  return {
    x: Math.max(left, Math.min(width - 108, point.x)),
    y: Math.max(top, Math.min(height - 80, point.y)),
  };
}

export function parachuteGlideArea(y: number, contentRight: number, width: number, height: number) {
  const gutter = width - Math.max(0, Math.min(width, contentRight));
  const canopyFits = gutter >= parachuteCelSize;
  const room = canopyFits ? (gutter - parachuteCelSize) / 2 : Math.min(24, Math.max(0, (width - parachuteCelSize) / 2));
  const x = canopyFits ? width - gutter / 2 - 36 : width - 108 - room;
  const lift = width < 600 ? 48 : 70;
  const reserve = Math.max(0, Math.min(lift, (height - parachuteCelSize) / 2));
  const center = clampParachute({ x, y: Math.max(64 + reserve, Math.min(height - 80 - reserve, y)) }, width, height);
  return { center, room, lift: reserve, width, height };
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

function glideSegment(start: number, end: number, startSpeed: number, endSpeed: number, duration: number, time: number) {
  const t = time / duration;
  return start + (end - start) * smoothstep(t) +
    duration * (startSpeed * t * (1 - t) ** 2 - endSpeed * t ** 2 * (1 - t));
}

export function createParachuteTrack(start: Point, edge: number, width: number, height: number, contentRight: number) {
  const takeoff = Math.max(start.x, Math.min(edge - 36, width - 48));
  const hover = parachuteGlideArea(start.y + 126, contentRight, width, height).center;
  const distance = hover.x - takeoff;
  const stretch = Math.max(1, Math.abs(distance) / 345);
  const flipTime = flipHolds.reduce((sum, hold) => sum + hold, 0) * stretch;
  const openingTime = openingHolds.reduce((sum, hold) => sum + hold, 0);
  const settlingTime = settlingHolds.reduce((sum, hold) => sum + hold, 0);
  const horizontalBrake = 270;
  const travelTime = flipTime + horizontalBrake / 2;
  const launchVx = distance >= 0 ? distance / travelTime
    : Math.min(.09, 2 * Math.max(0, width - 48 - takeoff) / flipTime);
  // In a narrow gutter the rider still pushes right, then steers in before the canopy fills.
  const ax = (distance - launchVx * travelTime) / (flipTime * (flipTime + horizontalBrake) / 2);
  const openVx = launchVx + ax * flipTime;
  const openX = takeoff + flipTime * (launchVx + openVx) / 2;

  // Gravity acts through the flip. Deployment starts with the same falling velocity.
  const drop = hover.y - start.y;
  const gravity = .00124 / stretch ** 2;
  const fallAtOpen = Math.max(-56, Math.min(52, drop * .41));
  const launchVy = fallAtOpen / flipTime - gravity * flipTime / 2;
  const openVy = launchVy + gravity * flipTime;
  const openY = start.y + fallAtOpen;

  const runway = takeoff - start.x;
  const runTime = runway === 0 ? 56 : Math.min(360, Math.max(72, runway * 2), 2.8 * runway / Math.max(.01, launchVx));
  const pushTime = Math.min(72, runTime);
  const dashTime = runTime - pushTime;
  const frames: Cel[] = dashTime > 0 ? Array.from({ length: 8 }, (_, column) => ({ hold: dashTime / 8, column, row: 4 })) : [];
  frames.push({ hold: pushTime, column: 0, row: 0 });
  frames.push(...flipHolds.map((hold, index) => ({ hold: hold * stretch, column: index + 1, row: 0 })));
  frames.push(...openingHolds.map((hold, column) => ({ hold, column, row: 1 })));
  frames.push(...settlingHolds.map((hold, column) => ({ hold, column, row: 2 })));

  function position(elapsed: number): Point {
    if (elapsed < runTime) {
      const x = runway ? glideSegment(start.x, takeoff, 0, launchVx, runTime, elapsed) : start.x;
      return { x, y: start.y };
    }
    const airTime = elapsed - runTime;
    if (airTime < flipTime) {
      return {
        x: takeoff + airTime * (launchVx + ax * airTime / 2),
        y: start.y + airTime * (launchVy + gravity * airTime / 2),
      };
    }
    const openTime = airTime - flipTime;
    if (openTime < openingTime) {
      const brake = Math.min(horizontalBrake, openTime);
      return {
        x: openX + openVx * brake * (1 - brake / (2 * horizontalBrake)),
        y: glideSegment(openY, hover.y, openVy, 0, openingTime, openTime),
      };
    }
    const sway = Math.min(1, (openTime - openingTime) / settlingTime);
    return { x: hover.x, y: hover.y - 5 * Math.sin(Math.PI * sway) ** 2 };
  }
  return { frames, start, hover, position };
}

export function createParachuteGlide(): ParachuteGlide {
  return { elapsed: 0, offset: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, target: { x: 0, y: 0 }, tilt: 0 };
}

export function noteParachuteScrollInput(glide: ParachuteGlide, kind: ScrollInput) {
  const previous = glide.input;
  const consecutive = previous?.kind === kind && glide.elapsed - previous.last <= 120 ? previous.samples : 0;
  glide.input = { kind, last: glide.elapsed, samples: consecutive + 1 };
  if (kind === 'wheel-step') glide.burst = undefined;
}

function reactToScroll(glide: ParachuteGlide, delta: number, steeringRoom: number, lift: number) {
  const direction = delta > 0 ? 1 : -1;
  const now = glide.elapsed;
  let burst = glide.burst;
  if (!burst || direction !== burst.direction || now - burst.last > 170) {
    burst = { direction, distance: 0, samples: 0, start: now, last: now, drifted: false, widened: false };
    glide.burst = burst;
  }
  const input = glide.input;
  const swipeWindow = input?.kind === 'touch' ? 380 : 300;
  if (now - burst.start > swipeWindow) {
    burst.start = now;
    burst.distance = 0;
    burst.samples = 0;
  }
  burst.distance += Math.abs(delta);
  burst.samples++;
  burst.last = now;
  const fast = !burst.widened && input && input.kind !== 'wheel-step' && input.samples >= 3 && now - input.last <= 190 &&
    burst.samples >= 4 && now - burst.start >= 64 && burst.distance >= 235;
  if (!fast && (burst.drifted || burst.distance < 6)) return;
  const x = fast ? glide.target.x + direction * 38 : glide.offset.x + direction * 28;
  glide.target.x = Math.max(-steeringRoom, Math.min(steeringRoom, x));
  glide.target.y = Math.min(lift, glide.target.y + (fast ? 26 : 16));
  burst.drifted = true;
  if (fast) burst.widened = true;
}

function followGlideTarget(glide: ParachuteGlide, elapsed: number) {
  for (const axis of ['x', 'y'] as const) {
    // Critical damping preserves velocity when retargeting and settles without oscillating.
    const response = glideResponse[axis];
    const decay = Math.exp(-response * elapsed);
    const distance = glide.offset[axis] - glide.target[axis];
    const carry = glide.velocity[axis] + response * distance;
    glide.offset[axis] = glide.target[axis] + decay * (distance + carry * elapsed);
    glide.velocity[axis] = decay * (glide.velocity[axis] - response * carry * elapsed);
  }
}

export function stepParachuteGlide(
  glide: ParachuteGlide, area: ReturnType<typeof parachuteGlideArea>, delta: number, elapsed: number,
): GlideOffset {
  glide.elapsed += elapsed;
  const sideways = Math.max(0, Math.min(62, area.room - 7));
  const steeringRoom = Math.max(30, sideways);
  followGlideTarget(glide, elapsed);
  if (delta !== 0) reactToScroll(glide, delta, steeringRoom, area.lift);

  // Keep the bank readable when the gutter is too narrow for sideways travel.
  const bank = Math.max(-12, Math.min(12, glide.velocity.x * 100));
  glide.tilt += (bank - glide.tilt) * (1 - Math.exp(-elapsed / 65));
  const x = area.center.x + Math.max(-steeringRoom, Math.min(steeringRoom, glide.offset.x)) * sideways / steeringRoom;
  const y = area.center.y + Math.min(area.lift, glide.offset.y);
  return { ...clampParachute({ x, y }, area.width, area.height), tilt: glide.tilt };
}

export function parachuteFrame(track: ReturnType<typeof createParachuteTrack>, elapsed: number) {
  let celTime = elapsed;
  for (const frame of track.frames) {
    if (celTime < frame.hold) return { ...frame, ...track.position(elapsed) };
    celTime -= frame.hold;
  }
}

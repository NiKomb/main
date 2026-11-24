import type { Point } from './mascot-movement';

export const parachuteChance = .15;
export const parachuteCelSize = 144;
export const parachuteSpriteOffset = { x: -36, y: -64 };

type Cel = { hold: number; column: number; row: number };
type GlideOffset = Point & { tilt: number };
type Direction = -1 | 1;
type ScrollInput = 'touch' | 'pixel-wheel' | 'wheel-step';
type ScrollBurst = { direction: Direction; distance: number; samples: number; start: number; last: number; turned: boolean };
type Maneuver = { direction: Direction; kind: 'arc' | 'turn'; start: number; entry: GlideOffset; strength: number };
export type ParachuteGlide = {
  elapsed: number;
  offset: GlideOffset;
  velocity: GlideOffset;
  burst?: ScrollBurst;
  input?: { kind: ScrollInput; last: number; samples: number };
  maneuver?: Maneuver;
};

const flipHolds = [74, 68, 65, 65, 68, 75, 68];
const openingHolds = [58, 65, 72, 80, 88, 96, 102];
const settlingHolds = [56, 58, 62, 65, 68, 72];
const fullTurn = 2 * Math.PI;
const restOffset: GlideOffset = { x: 0, y: 0, tilt: 0 };
const springFrequency = .029;
const springDecay = springFrequency * .74;
const springOscillation = Math.sqrt(springFrequency ** 2 - springDecay ** 2);

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
  return { center, room, lift, width, height };
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
  return { elapsed: 0, offset: { ...restOffset }, velocity: { ...restOffset } };
}

export function noteParachuteScrollInput(glide: ParachuteGlide, kind: ScrollInput) {
  const previous = glide.input;
  const consecutive = previous?.kind === kind && glide.elapsed - previous.last <= 120 ? previous.samples : 0;
  glide.input = { kind, last: glide.elapsed, samples: consecutive + 1 };
  if (kind === 'wheel-step') glide.burst = undefined;
}

function reactToScroll(glide: ParachuteGlide, delta: number) {
  const direction = delta > 0 ? 1 : -1;
  const now = glide.elapsed;
  let burst = glide.burst;
  if (!burst || direction !== burst.direction || now - burst.last > 170) {
    burst = { direction, distance: 0, samples: 0, start: now, last: now, turned: false };
    glide.burst = burst;
  }
  if (now - burst.start > 240) {
    burst.start = now;
    burst.distance = 0;
    burst.samples = 0;
  }
  burst.distance += Math.abs(delta);
  burst.samples++;
  burst.last = now;
  if (glide.maneuver?.kind === 'turn') return;
  const input = glide.input;
  const fast = !burst.turned && input && input.kind !== 'wheel-step' && input.samples >= 3 && now - input.last <= 190 &&
    burst.samples >= 4 && now - burst.start >= 64 && burst.distance >= 235;
  if (fast) burst.turned = true;
  if (fast || (burst.distance >= 6 && glide.maneuver?.direction !== direction)) {
    glide.maneuver = {
      direction, kind: fast ? 'turn' : 'arc', start: now, entry: { ...glide.offset },
      strength: .82 + .18 * Math.min(1, burst.distance / 100),
    };
  }
}

function followGlideTarget(glide: ParachuteGlide, target: GlideOffset, elapsed: number) {
  const decay = Math.exp(-springDecay * elapsed);
  const sin = Math.sin(springOscillation * elapsed);
  const cos = Math.cos(springOscillation * elapsed);
  for (const axis of ['x', 'y', 'tilt'] as const) {
    // Keep both position and speed when the scroll changes the target.
    const distance = glide.offset[axis] - target[axis];
    const carry = (glide.velocity[axis] + springDecay * distance) / springOscillation;
    const displacement = distance * cos + carry * sin;
    glide.offset[axis] = target[axis] + decay * displacement;
    glide.velocity[axis] = decay * (springOscillation * (carry * cos - distance * sin) - springDecay * displacement);
  }
}

export function stepParachuteGlide(
  glide: ParachuteGlide, area: ReturnType<typeof parachuteGlideArea>, delta: number, elapsed: number,
): GlideOffset {
  glide.elapsed += elapsed;
  const maneuver = glide.maneuver;
  let target = restOffset;
  if (maneuver) {
    const turn = maneuver.kind === 'turn';
    const progress = Math.min(1, (glide.elapsed - maneuver.start) / (turn ? 1200 : 780));
    const angle = fullTurn * (.65 * progress + .35 * smoothstep(progress));
    const entrance = 1 - smoothstep(Math.min(1, progress * 7));
    const envelope = turn ? smoothstep(Math.min(1, progress * 6, (1 - progress) * 4.5))
      : Math.sin(progress * Math.PI) ** 2 * maneuver.strength;
    const sideways = Math.max(0, area.room - 7);
    const { entry, direction } = maneuver;
    target = {
      x: entry.x * entrance + (turn ? Math.cos(angle) * Math.min(62, sideways)
        : Math.sin(angle) * direction * Math.min(42, sideways)) * envelope * (1 - entrance),
      y: entry.y * entrance + (turn ? Math.sin(angle) : .72) * area.lift * direction * envelope * (1 - entrance),
      tilt: entry.tilt * entrance + Math.sin(angle + (turn ? Math.PI / 2 : 0)) * direction * 17 * envelope * (1 - entrance),
    };
    if (progress === 1) glide.maneuver = undefined;
  }
  followGlideTarget(glide, target, elapsed);
  if (delta !== 0) reactToScroll(glide, delta);

  const idle = glide.elapsed * fullTurn / 3800;
  const easeIn = smoothstep(Math.min(1, glide.elapsed / 400));
  const x = area.center.x + easeIn * Math.sin(idle) * Math.min(7, area.room * .35) + glide.offset.x;
  const y = area.center.y + easeIn * Math.cos(idle) * 4 + glide.offset.y;
  return { ...clampParachute({ x, y }, area.width, area.height), tilt: glide.offset.tilt };
}

export function parachuteFrame(track: ReturnType<typeof createParachuteTrack>, elapsed: number) {
  let celTime = elapsed;
  for (const frame of track.frames) {
    if (celTime < frame.hold) return { ...frame, ...track.position(elapsed) };
    celTime -= frame.hold;
  }
}

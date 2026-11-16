import { playGroundMovement } from './ground-movement';

export const spriteWidth = 72;
export const footOffset = 68;
export const sectionEdgeInset = 48;
const coverCornerInset = 12;
const wideSurfaceWidth = 144;
export const minDashDistance = 72;
export const shortGapDistance = 72;
export const mascotAttackChance = .4;
export const mascotAttackMessage = '#@!%*?';

export type Point = { x: number; y: number };
export type Surface = {
  tile: Element;
  left: number;
  right: number;
  y: number;
  canDash: boolean;
  dashDistance: number;
};

export type Stop = { surface: Surface; edge: 'start' | 'landing' | 'finish' | 'left-finish'; point: Point };

export function readSurface(tile: Element, bounds: DOMRect, box: DOMRect, dashDistance: number,
  isCover = tile.classList.contains('case-cover')): Surface {
  const left = Math.round(box.left - bounds.left - spriteWidth / 2);
  const right = Math.round(box.right - bounds.left - spriteWidth / 2);
  const inset = Math.min(coverCornerInset, Math.floor((right - left) / 2));
  return {
    tile,
    left: left + inset,
    right: right - inset,
    y: Math.round(box.top - bounds.top - footOffset),
    canDash: isCover && box.width >= wideSurfaceWidth,
    dashDistance,
  };
}

export function onSurface(x: number, surface: Surface) {
  return Math.max(surface.left, Math.min(surface.right, x));
}

type Phase = 'waiting' | 'blink' | 'run' | 'dash' | 'jump' | 'land' | 'idle';

export function createMascotMovement(layer: HTMLElement, canvas: HTMLCanvasElement | null, lift: HTMLElement | null, image: HTMLImageElement) {
  let phase: Phase = 'waiting';
  let activeSurface: Surface | undefined;
  let entrance: ReturnType<typeof playGroundMovement>;
  let motion: Animation | undefined;
  let dust: Animation | undefined;
  let recovery = 0;

  function cancel() {
    activeSurface = undefined;
    entrance?.cancel();
    entrance = undefined;
    if (motion) {
      motion.onfinish = null;
      motion.cancel();
      motion = undefined;
    }
    dust?.cancel();
    dust = undefined;
    window.clearTimeout(recovery);
  }

  function appear(point: Point, facing: 'left' | 'right', reveal: () => void) {
    entrance?.cancel();
    entrance = undefined;
    if (canvas) {
      entrance = playGroundMovement(canvas, image, point, point.x, (_, opacity) => {
        layer.style.opacity = String(opacity);
      }, reveal, { kind: 'blink-arrival', facing });
      if (entrance) {
        phase = 'blink';
        layer.dataset.pose = phase;
        layer.style.opacity = '0';
      }
    }
    if (!entrance) reveal();
  }

  function blink(from: Point, to: Point, reveal: () => void) {
    cancel();
    place(from);
    layer.style.opacity = '';
    if (from.x !== to.x) layer.dataset.direction = to.x < from.x ? 'left' : 'right';
    if (canvas) {
      entrance = playGroundMovement(canvas, image, from, to.x, (_, opacity) => {
        if (opacity) place(to);
        layer.style.opacity = String(opacity);
      }, reveal, { kind: 'blink', endY: to.y });
    }
    if (entrance) {
      phase = 'blink';
      layer.dataset.pose = phase;
    } else reveal();
  }

  const place = (point: Point) => {
    layer.style.transform = `translate(${point.x}px, ${point.y}px)`;
  };

  function settle(point: Point) {
    phase = 'idle';
    layer.dataset.pose = phase;
    layer.hidden = false;
    layer.style.opacity = '';
    place(point);
  }

  function leap(start: Point, to: Point, onLand: () => void, { carriedByDash = false, arcAcrossWideGap = false } = {}) {
    layer.style.opacity = '';
    place(to);
    if (typeof layer.animate !== 'function') {
      onLand();
      return;
    }

    if (Math.abs(to.x - start.x) > 8) layer.dataset.direction = to.x < start.x ? 'left' : 'right';
    const dx = to.x - start.x;
    const dy = to.y - start.y;
    const flight = carriedByDash ? 220 : Math.min(850, Math.max(360, Math.hypot(dx, dy) * 1.15));
    const push = carriedByDash ? 0 : 95;
    const duration = push + flight;
    const rise = carriedByDash ? 8 : Math.abs(dx) <= 72 ? 14 : Math.min(68, Math.max(28, Math.abs(dy) / 4 + 24));
    const arc = Math.abs(dy) + 2 * rise + 2 * Math.sqrt(rise * (rise + Math.abs(dy)));
    if (lift) {
      lift.style.left = `${start.x + spriteWidth / 2}px`;
      lift.style.top = `${start.y + footOffset - 44}px`;
      dust?.cancel();
      dust = lift.animate([
        { backgroundPositionX: '0px', opacity: .55 },
        { backgroundPositionX: '-800px', opacity: 0 },
      ], { duration: 280, delay: push, easing: 'steps(8, end)' });
    }
    layer.style.setProperty('--jump-duration', `${duration}ms`);
    phase = 'jump';
    layer.dataset.pose = phase;
    const wideGap = Math.abs(dx) > shortGapDistance && !arcAcrossWideGap;
    const startFrame = { transform: `translate(${start.x}px, ${start.y}px)` };
    const frames = wideGap ? [
      startFrame,
      {
        ...startFrame,
        offset: push / duration,
        easing: 'ease-in-out',
      },
      {
        transform: dy < 0 ? `translate(${start.x}px, ${to.y}px)` : `translate(${to.x}px, ${start.y}px)`,
        offset: (push + flight * (dy < 0 ? Math.abs(dy) : Math.abs(dx)) / (Math.abs(dx) + Math.abs(dy))) / duration,
        easing: 'ease-in-out',
      },
      { transform: `translate(${to.x}px, ${to.y}px)` },
    ] : [
      startFrame,
      ...Array.from({ length: 25 }, (_, step) => {
        const t = step / 24;
        return {
          offset: (push + t * flight) / duration,
          transform: `translate(${start.x + dx * t}px, ${start.y + dy * t - arc * t * (1 - t)}px)`,
        };
      }),
    ];
    motion = layer.animate(frames, { duration });

    motion.onfinish = () => {
      phase = 'land';
      layer.dataset.pose = phase;
      recovery = window.setTimeout(onLand, 160);
    };
  }

  function dashAlongCover(start: Point, endX: number, finish: () => void) {
    if (!canvas) return false;
    entrance?.cancel();
    entrance = playGroundMovement(canvas, image, start, endX, (x, opacity) => {
      place({ x, y: start.y });
      layer.style.opacity = String(opacity);
    }, finish, { kind: 'dash' });
    if (!entrance) return false;
    layer.dataset.direction = endX < start.x ? 'left' : 'right';
    phase = 'dash';
    layer.dataset.pose = phase;
    return true;
  }

  function moveHorizontally(start: Point, endX: number, finish: () => void) {
    place({ x: endX, y: start.y });
    if (typeof layer.animate !== 'function') {
      finish();
      return;
    }
    layer.dataset.direction = endX < start.x ? 'left' : 'right';
    phase = 'run';
    layer.dataset.pose = phase;
    motion = layer.animate([
      { transform: `translate(${start.x}px, ${start.y}px)` },
      { transform: layer.style.transform },
    ], { duration: Math.abs(endX - start.x) * 5 });
    motion.onfinish = finish;
  }

  function dashAndReturn(start: Point, surface: Surface, pointerX: number | undefined, finish: () => void) {
    const bounds = layer.getBoundingClientRect();
    const offset = pointerX === undefined ? 0 : pointerX - (bounds.left + bounds.width / 2);
    const moreRoomOnRight = surface.right - start.x > start.x - surface.left;
    const toRight = Math.abs(offset) < 2 ? moreRoomOnRight : offset < 0;
    const endX = onSurface(start.x + (toRight ? 1 : -1) * surface.dashDistance, surface);
    if (endX === start.x || !dashAlongCover(start, endX, () => {
      moveHorizontally({ x: endX, y: start.y }, start.x, () => {
        activeSurface = undefined;
        finish();
      });
    })) return false;
    activeSurface = surface;
    return true;
  }

  function moveOnSurface(start: Point, endX: number, surface: Surface, finish: (dashed: boolean) => void) {
    activeSurface = surface;
    const done = (dashed: boolean) => {
      activeSurface = undefined;
      finish(dashed);
    };
    if (start.x === endX) {
      done(false);
      return;
    }
    if (surface.canDash && Math.abs(endX - start.x) >= surface.dashDistance &&
      dashAlongCover(start, endX, () => done(true))) return;
    moveHorizontally(start, endX, () => done(false));
  }

  function travel(current: Stop, next: Stop, forward: boolean, finish: () => void, diagonal = false) {
    const { point: start, surface: from } = current;
    const into = next.surface;
    const fixedLanding = next.edge !== 'landing';
    let takeoffX = start.x;
    if (from.canDash) {
      takeoffX = fixedLanding ? onSurface(next.point.x, from) : forward ? from.right : from.left;
    }
    if (diagonal && from.y !== into.y && Math.abs(next.point.x - takeoffX) < 16) {
      takeoffX = onSurface(next.point.x - 48, from);
    }
    const approach = onSurface(takeoffX, into);
    if (from.canDash || Math.abs(takeoffX - approach) > shortGapDistance) {
      takeoffX = onSurface(approach, from);
    }
    const takeoff = { x: takeoffX, y: from.y };
    const landingX = fixedLanding && (diagonal || !into.canDash) &&
      Math.abs(next.point.x - takeoff.x) <= shortGapDistance ? next.point.x : onSurface(takeoff.x, into);
    const landing = { x: landingX, y: into.y };
    if (next.edge === 'landing') next.point = landing;
    const arrive = () => moveOnSurface(landing, next.point.x, into, finish);

    moveOnSurface(start, takeoff.x, from, (dashed) => {
      activeSurface = into;
      const gap = Math.abs(landing.x - takeoff.x);
      leap(takeoff, landing, arrive, {
        carriedByDash: dashed && takeoff.y === landing.y && gap > 0 && gap <= shortGapDistance,
        arcAcrossWideGap: diagonal,
      });
    });
  }

  return {
    get phase() { return phase; },
    get activeSurface() { return activeSurface; },
    place, cancel, settle, appear, blink, leap, dashAndReturn, moveOnSurface, travel,
  };
}

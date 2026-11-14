import { useEffect, useRef } from 'react';
import rider from './rider.png';
import takeoff from './haste.png';
import impact from './heavy-landing.png';
import { playGroundMovement } from './ground-movement';
import './mascot.css';

const spriteWidth = 72;
const footOffset = 68;
const coverEdgeInset = 28;
const coverCornerInset = 12;
const scrollThreshold = 96;
const wideSurfaceWidth = 144;
const minDashDistance = 72;
const shortGapDistance = 72;
const firstTileInset = 156;

export function Mascot({ resumeRoute }: { resumeRoute: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const effectsRef = useRef<HTMLCanvasElement>(null);
  const takeoffRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const layer = root.current;
    const grid = layer?.parentElement;
    if (!layer || !grid) return;

    const [firstCase, secondCase, ...laterCases] = grid.querySelectorAll('.case-tile');
    const firstTile = firstCase?.querySelector('.tile-copy');
    const lowerTile = firstCase?.querySelector('.tile-preview');
    const secondCover = secondCase?.querySelector('.case-cover');
    if (!firstTile || !secondCover) return;
    const laterTiles = [
      ...secondCase.querySelectorAll('.tile-copy, .tile-preview'),
      ...laterCases.flatMap((item) => [...item.querySelectorAll('.case-cover, .tile-copy, .tile-preview')]),
    ];

    type Point = { x: number; y: number };
    type Surface = {
      tile: Element;
      left: number;
      right: number;
      y: number;
      canDash: boolean;
    };

    const lift = takeoffRef.current;
    const image = new Image();
    let frame = 0;
    let entrance: ReturnType<typeof playGroundMovement>;
    let motion: Animation | undefined;
    let dust: Animation | undefined;
    let recovery = 0;
    let phase: 'waiting' | 'blink' | 'run' | 'dash' | 'coast' | 'jump' | 'land' | 'idle' = 'waiting';
    let route: Point[] | undefined;
    let currentTile: Element | undefined;
    let movementDestination: Point | undefined;
    let coverSide: 'left' | 'right' = resumeRoute ? 'left' : 'right';
    let bridgeEntry: Element | undefined;
    let activeSurface: Surface | undefined;

    const place = (point: Point) => {
      layer.style.transform = `translate(${point.x}px, ${point.y}px)`;
    };

    function cancelMotion() {
      entrance?.cancel();
      if (motion) {
        motion.onfinish = null;
        motion.cancel();
      }
      activeSurface = undefined;
      dust?.cancel();
      window.clearTimeout(recovery);
    }

    function settle(point: Point) {
      if (!layer) return;
      phase = 'idle';
      layer.dataset.pose = phase;
      layer.hidden = false;
      layer.style.opacity = '';
      place(point);
    }

    function leap(start: Point, to: Point, onLand: () => void) {
      if (!layer) return;
      layer.style.opacity = '';
      place(to);
      if (typeof layer.animate !== 'function') {
        onLand();
        return;
      }

      if (Math.abs(to.x - start.x) > 8) layer.dataset.direction = to.x < start.x ? 'left' : 'right';
      const dx = to.x - start.x;
      const dy = to.y - start.y;
      const flight = Math.min(850, Math.max(360, Math.hypot(dx, dy) * 1.15));
      const push = 95;
      const duration = push + flight;
      const rise = Math.abs(dx) <= 72 ? 14 : Math.min(68, Math.max(28, Math.abs(dy) / 4 + 24));
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
      motion = layer.animate([
        { transform: `translate(${start.x}px, ${start.y}px)` },
        ...Array.from({ length: 25 }, (_, step) => {
          const t = step / 24;
          return {
            offset: (push + t * flight) / duration,
            transform: `translate(${start.x + dx * t}px, ${start.y + dy * t - arc * t * (1 - t)}px)`,
          };
        }),
      ], { duration });

      motion.onfinish = () => {
        phase = 'land';
        layer.dataset.pose = phase;
        recovery = window.setTimeout(onLand, 160);
      };
    }

    function dashAlongCover(start: Point, endX: number, finish: () => void) {
      const canvas = effectsRef.current;
      if (!layer || !canvas) return false;
      entrance?.cancel();
      entrance = playGroundMovement(canvas, image, start, endX, (x, opacity) => {
        place({ x, y: start.y });
        layer.style.opacity = String(opacity);
      }, finish, undefined, 'dash');
      if (!entrance) return false;
      layer.dataset.direction = endX < start.x ? 'left' : 'right';
      phase = 'dash';
      layer.dataset.pose = phase;
      return true;
    }

    function readSurface(tile: Element, bounds: DOMRect, box = tile.getBoundingClientRect()): Surface {
      return {
        tile,
        left: Math.ceil(box.left - bounds.left - spriteWidth / 2 + coverCornerInset),
        right: Math.floor(box.right - bounds.left - spriteWidth / 2 - coverCornerInset),
        y: Math.round(box.top - bounds.top - footOffset),
        canDash: tile.classList.contains('case-cover') && box.width >= wideSurfaceWidth,
      };
    }

    function moveHorizontally(start: Point, endX: number, pose: 'run' | 'coast', finish: () => void) {
      if (!layer) return;
      place({ x: endX, y: start.y });
      if (typeof layer.animate !== 'function') {
        finish();
        return;
      }
      layer.dataset.direction = endX < start.x ? 'left' : 'right';
      phase = pose;
      layer.dataset.pose = phase;
      motion = layer.animate([
        { transform: `translate(${start.x}px, ${start.y}px)` },
        { transform: layer.style.transform },
      ], { duration: Math.abs(endX - start.x) * (pose === 'run' ? 5 : 2.5) });
      motion.onfinish = finish;
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
      if (surface.canDash && Math.abs(endX - start.x) >= minDashDistance &&
        dashAlongCover(start, endX, () => done(true))) return;
      moveHorizontally(start, endX, 'run', () => done(false));
    }

    function travel(start: Point, to: Point, from: Surface, into: Surface, finish: () => void) {
      movementDestination = to;
      // Jump between the nearest points on the two top edges.
      const landing = { x: onSurface(start.x, into), y: into.y };
      const takeoff = { x: onSurface(landing.x, from), y: from.y };
      moveOnSurface(start, takeoff.x, from, (dashed) => {
        activeSurface = into;
        const arrive = () => moveOnSurface(landing, to.x, into, finish);
        const gap = Math.abs(landing.x - takeoff.x);
        if (dashed && takeoff.y === landing.y && gap > 0 && gap <= shortGapDistance) {
          moveHorizontally(takeoff, landing.x, 'coast', arrive);
        } else {
          leap(takeoff, landing, arrive);
        }
      });
    }

    function onSurface(x: number, surface: Surface) {
      return Math.max(surface.left, Math.min(surface.right, x));
    }

    function update() {
      if (!layer || !grid || !firstTile || !secondCover) return;
      const bounds = grid.getBoundingClientRect();
      const tile = firstTile.getBoundingClientRect();
      const lower = lowerTile?.getBoundingClientRect();
      const cover = secondCover.getBoundingClientRect();
      const start = {
        x: Math.round(tile.right - Math.min(tile.width / 2, firstTileInset) - bounds.left - spriteWidth / 2),
        y: Math.round(tile.top - bounds.top - footOffset),
      };
      const middle = lower?.height ? {
        x: Math.round(lower.left + lower.width / 2 - bounds.left - spriteWidth / 2),
        y: Math.round(lower.top - bounds.top - footOffset),
      } : {
        x: start.x,
        y: Math.round(tile.bottom - bounds.top - footOffset),
      };
      const coverStop = (side: 'left' | 'right') => ({
        x: Math.round((side === 'left' ? cover.left + coverEdgeInset : cover.right - coverEdgeInset) - bounds.left - spriteWidth / 2),
        y: Math.round(cover.top - bounds.top - footOffset),
      });
      const coverSurface = readSurface(secondCover, bounds, cover);
      const currentSurface = activeSurface && readSurface(activeSurface.tile, bounds);
      const surfaceMoved = activeSurface && currentSurface && (
        currentSurface.left !== activeSurface.left || currentSurface.right !== activeSurface.right ||
        currentSurface.y !== activeSurface.y || currentSurface.canDash !== activeSurface.canDash
      );
      const visible = bounds.bottom > 0 && bounds.top < innerHeight && !document.hidden;
      layer.dataset.visible = String(visible);

      if (currentTile || resumeRoute) {
        const coverPoint = coverStop(coverSide);
        const stops = [{ surface: coverSurface, point: coverPoint, top: cover.top }];
        for (const tile of laterTiles) {
          const box = tile.getBoundingClientRect();
          if (!box.height || box.top < cover.top) continue;
          const surface = readSurface(tile, bounds, box);
          stops.push({
            surface,
            point: {
              x: Math.round(box.left + box.width / 2 - bounds.left - spriteWidth / 2),
              y: surface.y,
            },
            top: box.top,
          });
        }
        const scrollLimit = document.documentElement.scrollHeight - innerHeight;
        const atBottom = scrollLimit > 0 && scrollY >= scrollLimit - 1;
        const upcoming = stops.findIndex((stop) => stop.top > scrollThreshold);
        const lastPassed = atBottom || upcoming === -1 ? stops.length - 1 : Math.max(0, upcoming - 1);
        const target = !atBottom && stops[lastPassed].top === cover.top ? 0 : lastPassed;
        if (!currentTile) {
          if (!visible || !image.complete) return;
          const stop = stops[target];
          currentTile = stop.surface.tile;
          settle(stop.point);
          return;
        }
        const currentIndex = Math.max(0, stops.findIndex((stop) => stop.surface.tile === currentTile));
        const current = stops[currentIndex];
        const entry = bridgeEntry && stops.find((stop) => stop.surface.tile === bridgeEntry);
        if (entry && current.surface.tile === currentTile) {
          current.point.x = onSurface(entry.point.x, current.surface);
        }
        if (phase !== 'idle') {
          if (!visible || current.surface.tile !== currentTile ||
            current.point.x !== movementDestination?.x || current.point.y !== movementDestination?.y ||
            surfaceMoved) {
            cancelMotion();
            currentTile = current.surface.tile;
            settle(current.point);
            queueUpdate();
          }
          return;
        }
        currentTile = current.surface.tile;
        place(current.point);
        if (!visible) return;

        if (target !== currentIndex) {
          const next = stops[currentIndex + Math.sign(target - currentIndex)];
          bridgeEntry = undefined;
          if (next.surface.tile === secondCover) {
            coverSide = 'left';
            next.point = coverStop(coverSide);
          } else if (next.surface.tile.classList.contains('case-cover')) {
            // Stay where we land so the next dash can cross the cover in one move.
            bridgeEntry = current.surface.tile;
            next.point.x = onSurface(current.point.x, next.surface);
          }
          currentTile = next.surface.tile;
          travel(current.point, next.point, current.surface, next.surface, () => {
            settle(next.point);
            queueUpdate();
          });
        }
        return;
      }
      const end = coverStop('right');
      const landing = {
        x: Math.max(coverSurface.left, Math.min(middle.x, end.x - 120)),
        y: end.y,
      };
      const positions = [start, middle, landing, end];
      if (route) {
        const previous = route;
        const moved = positions.some((point, index) => point.x !== previous[index].x || point.y !== previous[index].y);
        if (!visible || moved || surfaceMoved) {
          cancelMotion();
          currentTile = secondCover;
          settle(end);
          queueUpdate();
        }
        return;
      }
      if (!visible || !image.complete) return;

      route = positions;
      const finishRoute = () => {
        currentTile = secondCover;
        settle(end);
        queueUpdate();
      };
      const startRoute = () => leap(start, middle, () => {
        activeSurface = coverSurface;
        leap(middle, landing, () => moveOnSurface(landing, end.x, coverSurface, finishRoute));
      });
      layer.hidden = false;
      place(start);
      const canvas = effectsRef.current;
      if (canvas) {
        const facing = middle.x < start.x ? 'left' : 'right';
        layer.dataset.direction = facing;
        entrance = playGroundMovement(canvas, image, start, start.x, (_, opacity) => {
          layer.style.opacity = String(opacity);
        }, startRoute, facing);
      }
      if (entrance) {
        phase = 'blink';
        layer.dataset.pose = phase;
        layer.style.opacity = '0';
      } else {
        startRoute();
      }
    }

    function queueUpdate() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }

    const resize = new ResizeObserver(queueUpdate);
    [grid, firstTile, secondCover, ...laterTiles].forEach((element) => resize.observe(element));
    if (lowerTile) resize.observe(lowerTile);
    window.addEventListener('scroll', queueUpdate, { passive: true });
    window.addEventListener('resize', queueUpdate);
    document.addEventListener('visibilitychange', queueUpdate);
    image.addEventListener('load', queueUpdate);
    image.addEventListener('error', queueUpdate);
    image.src = rider;
    queueUpdate();

    return () => {
      cancelMotion();
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener('scroll', queueUpdate);
      window.removeEventListener('resize', queueUpdate);
      document.removeEventListener('visibilitychange', queueUpdate);
      image.removeEventListener('load', queueUpdate);
      image.removeEventListener('error', queueUpdate);
    };
  }, [resumeRoute]);

  return (
    <>
      <canvas className="mascot__movement" ref={effectsRef} aria-hidden="true" hidden />
      <span className="mascot__fx mascot__takeoff" ref={takeoffRef} aria-hidden="true" style={{ backgroundImage: `url(${takeoff})` }} />
      <div className="mascot" ref={root} aria-hidden="true" hidden>
        <span className="mascot__facing">
          <span className="mascot__sprite" />
          <span className="mascot__fx mascot__impact" style={{ backgroundImage: `url(${impact})` }} />
        </span>
      </div>
    </>
  );
}

export function ViewportMascot({ onScrollAfterArrival }: { onScrollAfterArrival?: () => void }) {
  const actor = useRef<HTMLSpanElement>(null);
  const effects = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const layer = actor.current;
    const canvas = effects.current;
    const stage = canvas?.parentElement;
    if (!layer || !canvas || !stage) return;

    const image = new Image();
    let entrance: ReturnType<typeof playGroundMovement>;
    let started = false;
    let frame = 0;
    let arrivalScroll: number | undefined;

    const reveal = () => {
      layer.style.opacity = '1';
      layer.dataset.pose = 'idle';
      arrivalScroll ??= window.scrollY;
    };

    const resumeOnScroll = () => {
      if (arrivalScroll !== undefined && window.scrollY !== arrivalScroll) onScrollAfterArrival?.();
    };

    const appear = () => {
      if (started || document.hidden || !image.complete) return;
      started = true;
      const { offsetLeft: x, offsetTop: y } = layer;
      entrance = playGroundMovement(canvas, image, { x, y }, x, (_, opacity) => {
        layer.style.opacity = String(opacity);
      }, reveal, 'left');
      if (!entrance) reveal();
    };

    const updateVisibility = () => {
      layer.dataset.visible = String(!document.hidden);
      if (!document.hidden) {
        queueAppear();
      } else if (started) {
        entrance?.cancel();
        reveal();
      }
    };

    function queueAppear() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(appear);
    }

    image.addEventListener('load', queueAppear);
    image.addEventListener('error', queueAppear);
    document.addEventListener('visibilitychange', updateVisibility);
    if (onScrollAfterArrival) window.addEventListener('scroll', resumeOnScroll, { passive: true });
    image.src = rider;
    queueAppear();

    return () => {
      entrance?.cancel();
      cancelAnimationFrame(frame);
      image.removeEventListener('load', queueAppear);
      image.removeEventListener('error', queueAppear);
      document.removeEventListener('visibilitychange', updateVisibility);
      window.removeEventListener('scroll', resumeOnScroll);
    };
  }, [onScrollAfterArrival]);

  return (
    <div className="mascot-viewport" aria-hidden="true">
      <canvas className="mascot__movement" ref={effects} hidden />
      <span className="mascot mascot-viewport__actor" data-pose="blink" data-visible="true" data-direction="left" ref={actor}>
        <span className="mascot__facing">
          <span className="mascot__sprite" />
        </span>
      </span>
    </div>
  );
}

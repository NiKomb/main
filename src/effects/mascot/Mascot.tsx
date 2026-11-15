import { useEffect, useRef } from 'react';
import rider from './rider.png';
import takeoff from './haste.png';
import impact from './heavy-landing.png';
import { playGroundMovement } from './ground-movement';
import './mascot.css';

const spriteWidth = 72;
const footOffset = 68;
const sectionEdgeInset = 48;
const coverCornerInset = 12;
const scrollThreshold = 96;
const wideSurfaceWidth = 144;
const minDashDistance = 72;
const shortGapDistance = 72;
const ascentWaypoints = new Map([
  ['project-vseinstrumenti', { name: 'second-section-upper-edge', sectionX: 0.4 }],
]);

export function Mascot({ resumeRoute }: { resumeRoute: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const effectsRef = useRef<HTMLCanvasElement>(null);
  const takeoffRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const layer = root.current;
    const grid = layer?.parentElement;
    if (!layer || !grid) return;

    const sections = Array.from(grid.querySelectorAll('.case-tile'), (section) => ({
      element: section,
      tiles: Array.from(section.querySelectorAll('.case-cover, .tile-copy, .tile-preview')),
    }));

    type Point = { x: number; y: number };
    type Surface = {
      tile: Element;
      left: number;
      right: number;
      y: number;
      canDash: boolean;
      dashDistance: number;
    };

    type Stop = { surface: Surface; edge: 'left' | 'landing' | 'right' | `ascent:${string}`; point: Point };

    const lift = takeoffRef.current;
    const image = new Image();
    let frame = 0;
    let entrance: ReturnType<typeof playGroundMovement>;
    let motion: Animation | undefined;
    let dust: Animation | undefined;
    let recovery = 0;
    let phase: 'waiting' | 'blink' | 'run' | 'dash' | 'jump' | 'land' | 'idle' = 'waiting';
    let currentStop: Stop | undefined;
    let introduction = !resumeRoute;
    let introScroll: number | undefined;
    let returnScroll: number | undefined;
    let plannedTarget: Element | undefined;
    let pending: Stop[] = [];
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

    function leap(start: Point, to: Point, onLand: () => void, carriedByDash = false) {
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
      const wideGap = Math.abs(dx) > shortGapDistance;
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

    function readSurface(tile: Element, bounds: DOMRect, box: DOMRect, dashDistance: number): Surface {
      const left = Math.round(box.left - bounds.left - spriteWidth / 2);
      const right = Math.round(box.right - bounds.left - spriteWidth / 2);
      const inset = Math.min(coverCornerInset, Math.floor((right - left) / 2));
      return {
        tile,
        left: left + inset,
        right: right - inset,
        y: Math.round(box.top - bounds.top - footOffset),
        canDash: tile.classList.contains('case-cover') && box.width >= wideSurfaceWidth,
        dashDistance,
      };
    }

    function moveHorizontally(start: Point, endX: number, finish: () => void) {
      if (!layer) return;
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

    function travel(current: Stop, next: Stop, forward: boolean, finish: () => void) {
      if (!layer) return;
      const { point: start, surface: from } = current;
      const into = next.surface;
      let takeoffX = start.x;
      if (from.canDash) {
        takeoffX = next.edge === 'right' ? onSurface(next.point.x, from) : forward ? from.right : from.left;
      }
      const approach = onSurface(takeoffX, into);
      if (from.canDash || Math.abs(takeoffX - approach) > shortGapDistance) {
        takeoffX = onSurface(approach, from);
      }
      const takeoff = { x: takeoffX, y: from.y };
      const landingX = next.edge === 'right' && !into.canDash &&
        Math.abs(next.point.x - takeoff.x) <= shortGapDistance ? next.point.x : onSurface(takeoff.x, into);
      const landing = { x: landingX, y: into.y };
      if (next.edge === 'landing') next.point = landing;
      const arrive = () => moveOnSurface(landing, next.point.x, into, finish);

      moveOnSurface(start, takeoff.x, from, (dashed) => {
        activeSurface = into;
        const gap = Math.abs(landing.x - takeoff.x);
        leap(takeoff, landing, arrive, dashed && takeoff.y === landing.y && gap > 0 && gap <= shortGapDistance);
      });
    }

    function onSurface(x: number, surface: Surface) {
      return Math.max(surface.left, Math.min(surface.right, x));
    }

    function update() {
      if (!layer || !grid) return;
      const bounds = grid.getBoundingClientRect();
      const visible = bounds.bottom > 0 && bounds.top < innerHeight && !document.hidden;
      layer.dataset.visible = String(visible);

      const stops: Stop[] = [];
      const routes: { element: Element; top: number; landings: Stop[]; finish: Stop; ascentWaypoint?: Stop }[] = [];
      for (const { element, tiles } of sections) {
        const section = element.getBoundingClientRect();
        const visibleTiles = tiles.map((tile) => ({ tile, box: tile.getBoundingClientRect() }))
          .filter(({ box }) => box.width && box.height);
        const smallTileWidth = visibleTiles.find(({ tile }) => tile.classList.contains('tile-preview'))?.box.width;
        const dashDistance = Math.max(minDashDistance, smallTileWidth ?? 0);
        const surfaces = visibleTiles.map(({ tile, box }) => readSurface(tile, bounds, box, dashDistance));
        if (!surfaces.length) continue;

        const rightmost = surfaces.reduce((best, surface) => (
          surface.right > best.right || (surface.right === best.right && surface.y > best.y) ? surface : best
        ));
        const inset = Math.min(sectionEdgeInset, section.width / 2);
        const startLimit = Math.round(section.left - bounds.left - spriteWidth / 2 + inset);
        const finishX = Math.round(section.right - bounds.left - spriteWidth / 2 - inset);
        const finish: Stop = {
          surface: rightmost,
          edge: 'right',
          point: { x: onSurface(finishX, rightmost), y: rightmost.y },
        };
        const landings: Stop[] = surfaces.map((surface) => ({
          surface, edge: 'landing', point: { x: surface.left, y: surface.y },
        }));
        const waypoint = ascentWaypoints.get(element.getAttribute('data-section-id') ?? '');
        let ascentWaypoint: Stop | undefined;
        if (waypoint) {
          const x = Math.round(section.left + section.width * waypoint.sectionX - bounds.left - spriteWidth / 2);
          const topY = Math.min(...surfaces.map(({ y }) => y));
          const surface = surfaces.filter(({ y }) => y === topY).reduce((best, candidate) => (
            Math.abs(x - onSurface(x, candidate)) < Math.abs(x - onSurface(x, best)) ? candidate : best
          ));
          ascentWaypoint = {
            surface,
            edge: `ascent:${waypoint.name}`,
            point: { x: onSurface(x, surface), y: topY },
          };
          stops.push(ascentWaypoint);
        }
        if (!routes.length) {
          const surface = surfaces.find(({ tile }) => tile.classList.contains('tile-copy')) ?? surfaces[0];
          const center = Math.round((surface.left + surface.right) / 2);
          const startX = Math.max(startLimit, Math.min(finishX, center));
          stops.push({
            surface, edge: 'left', point: { x: onSurface(startX, surface), y: surface.y },
          });
        }
        stops.push(...landings, finish);
        routes.push({ element, top: section.top, landings, finish, ascentWaypoint });
      }
      if (!routes.length) {
        cancelMotion();
        currentStop = undefined;
        layer.hidden = true;
        return;
      }

      const scrollLimit = document.documentElement.scrollHeight - innerHeight;
      const atBottom = scrollLimit > 0 && scrollY >= scrollLimit - 1;
      const upcoming = atBottom ? undefined : routes.findIndex((route) => route.top > scrollThreshold);
      const scrollTarget = upcoming !== undefined && upcoming >= 0 ? upcoming : routes.length - 1;
      const holdIntroFinish = introScroll !== undefined && window.scrollY === introScroll;
      const target = introduction || holdIntroFinish ? Math.min(1, routes.length - 1) : scrollTarget;
      if (!holdIntroFinish) introScroll = undefined;
      const targetRoute = routes[target];

      if (!currentStop) {
        if (!visible || !image.complete) return;
        const footY = (stop: Stop) => bounds.top + stop.point.y + footOffset;
        const visibleStops = stops.filter((stop) => footY(stop) >= 0 && footY(stop) <= innerHeight);
        const candidates = visibleStops.length ? visibleStops : stops;
        const distance = (stop: Stop) => Math.abs(innerHeight - footY(stop));
        const start = introduction ? stops[0] : candidates.reduce((best, stop) => {
          const delta = distance(stop) - distance(best);
          return delta < 0 || (delta === 0 && stop.point.x > best.point.x) ? stop : best;
        });
        currentStop = start;
        settle(start.point);
        const reveal = () => {
          if (resumeRoute) returnScroll = window.scrollY;
          settle(start.point);
          queueUpdate();
        };
        if (effectsRef.current) {
          entrance = playGroundMovement(effectsRef.current, image, start.point, start.point.x, (_, opacity) => {
            layer.style.opacity = String(opacity);
          }, reveal, introduction ? 'right' : 'left');
          if (entrance) {
            phase = 'blink';
            layer.dataset.pose = phase;
            layer.style.opacity = '0';
          }
        }
        if (!entrance) reveal();
        return;
      }

      const currentIndex = stops.findIndex(({ surface, edge }) => (
        surface.tile === currentStop?.surface.tile && edge === currentStop.edge
      ));
      const current = stops[currentIndex] ??
        stops.find(({ surface, edge }) => surface.tile === currentStop?.surface.tile && edge === 'landing') ??
        targetRoute.finish;
      if (current.surface.tile === currentStop.surface.tile && current.edge === 'landing') {
        current.point.x = onSurface(currentStop.point.x - currentStop.surface.left + current.surface.left, current.surface);
      }
      const updatedSurface = activeSurface && stops.find((stop) => stop.surface.tile === activeSurface?.tile)?.surface;
      const surfaceMoved = activeSurface && (!updatedSurface || activeSurface.left !== updatedSurface.left ||
        activeSurface.right !== updatedSurface.right || activeSurface.y !== updatedSurface.y);
      if (phase !== 'idle') {
        if (!visible || currentIndex < 0 || current.point.x !== currentStop.point.x ||
          current.point.y !== currentStop.point.y || surfaceMoved) {
          cancelMotion();
          if (resumeRoute && phase === 'blink') returnScroll = window.scrollY;
          currentStop = current;
          settle(current.point);
          queueUpdate();
        }
        return;
      }

      currentStop = current;
      place(current.point);
      if (!visible) return;
      if (returnScroll === window.scrollY) return;
      returnScroll = undefined;

      const origin = routes.findIndex(({ landings }) => landings.some(({ surface }) => surface.tile === current.surface.tile));
      if (plannedTarget !== targetRoute.element) {
        pending = [];
        plannedTarget = targetRoute.element;
      }

      if (!pending.length) {
        if (introduction && origin === 0 && current.edge === 'left') {
          const preview = routes[0].landings.find(({ surface }) => surface.tile.classList.contains('tile-preview'));
          if (preview) pending.push(preview);
        }
        if (origin < target) {
          const below = routes[origin + 1];
          if (!introduction) {
            const intermediate = below.landings.filter(({ surface }) => surface.tile !== below.finish.surface.tile);
            pending.push(...intermediate.slice(0, -1));
          }
          pending.push(below.finish);
        } else if (origin > target) {
          const above = routes[origin - 1];
          const steps = above.landings.filter(({ surface }) => !surface.tile.classList.contains('case-cover'))
            .sort((a, b) => b.surface.y - a.surface.y);
          const arrival = steps[0] ?? above.finish;
          const gap = (surface: Surface) => Math.max(
            0, surface.left - arrival.surface.right, arrival.surface.left - surface.right,
          );
          const exit = routes[origin].landings.find(({ surface }) => surface.canDash && gap(surface) < gap(current.surface));
          if (exit) pending.push(exit);
          pending.push(...steps, above.ascentWaypoint ?? above.finish);
        } else if (current.edge !== 'right' && current.edge !== targetRoute.ascentWaypoint?.edge) {
          pending.push(targetRoute.finish);
        } else {
          if (introduction) {
            introduction = false;
            introScroll = window.scrollY;
          }
          return;
        }
      }

      const next = pending.shift();
      if (!next) return;
      const updated = stops.find(({ surface, edge }) => surface.tile === next.surface.tile && edge === next.edge);
      if (!updated) {
        queueUpdate();
        return;
      }
      const forward = origin <= target;
      currentStop = updated;
      const finish = () => {
        settle(updated.point);
        queueUpdate();
      };
      if (current.surface.tile === updated.surface.tile) {
        moveOnSurface(current.point, updated.point.x, current.surface, finish);
      } else {
        travel(current, updated, forward, finish);
      }
    }

    function queueUpdate() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }

    const resize = new ResizeObserver(queueUpdate);
    const layoutChanges = new MutationObserver(queueUpdate);
    resize.observe(grid);
    for (const { element, tiles } of sections) {
      resize.observe(element);
      tiles.forEach((tile) => resize.observe(tile));
      layoutChanges.observe(element, {
        attributes: true,
        attributeFilter: ['class', 'style', 'hidden'],
        subtree: true,
      });
    }
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
      layoutChanges.disconnect();
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

export function ViewportMascot() {
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

    const reveal = () => {
      layer.style.opacity = '1';
      layer.dataset.pose = 'idle';
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
    image.src = rider;
    queueAppear();

    return () => {
      entrance?.cancel();
      cancelAnimationFrame(frame);
      image.removeEventListener('load', queueAppear);
      image.removeEventListener('error', queueAppear);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

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

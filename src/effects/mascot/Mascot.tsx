import { useEffect, useRef, useState, type RefObject } from 'react';
import rider from './rider.png';
import takeoff from './haste.png';
import impact from './heavy-landing.png';
import { playGroundMovement } from './ground-movement';
import { MascotSpeech } from './MascotSpeech';
import { selectNarrowCover } from './narrow-cover';
import { speechPosition, type SpeechPosition } from './speech-position';
import './mascot.css';

const spriteWidth = 72;
const footOffset = 68;
const sectionEdgeInset = 48;
const coverCornerInset = 12;
const scrollThreshold = 96;
const wideSurfaceWidth = 144;
const minDashDistance = 72;
const shortGapDistance = 72;
export function Mascot({ resumeRoute, results }: { resumeRoute: boolean; results: Readonly<Partial<Record<string, string>>> }) {
  const root = useRef<HTMLDivElement>(null);
  const actorRef = useRef<HTMLButtonElement>(null);
  const effectsRef = useRef<HTMLCanvasElement>(null);
  const takeoffRef = useRef<HTMLSpanElement>(null);
  const [speech, setSpeech] = useState<(SpeechPosition & { message: string }) | null>(null);
  const [speechReplay, setSpeechReplay] = useState(0);

  useEffect(() => {
    const layer = root.current;
    const grid = layer?.parentElement;
    const actor = actorRef.current;
    if (!layer || !grid || !actor) return;

    const sections = Array.from(grid.querySelectorAll('.case-tile'), (section) => ({
      element: section,
      id: section.getAttribute('data-section-id'),
      cover: section.querySelector('.case-cover'),
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

    type Stop = { surface: Surface; edge: 'start' | 'landing' | 'finish' | 'left-finish'; point: Point };

    const lift = takeoffRef.current;
    const image = new Image();
    const narrow = matchMedia('(width < 1040px)');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let narrowLayout = narrow.matches;
    let narrowTarget: (Point & { sectionId: string | null; surface: Surface }) | undefined;
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
    let resumedAtTop = false;
    let plannedTarget: Stop | undefined;
    let pending: Stop[] = [];
    let activeSurface: Surface | undefined;
    let censored = false;

    const place = (point: Point) => {
      layer.style.transform = `translate(${point.x}px, ${point.y}px)`;
    };

    function showSpeech(point: Point, bounds: DOMRect, sectionId: string | null) {
      const anchor = { x: point.x + spriteWidth / 2, top: point.y, bottom: point.y + footOffset };
      const position = speechPosition(anchor, bounds, innerHeight, narrowLayout);
      const message = censored ? '#@!%*?' : sectionId ? results[sectionId] : undefined;
      const next = message && position ? { ...position, message } : null;
      setSpeech((current) => current && next && current.message === next.message && current.y === next.y &&
        current.alignment === next.alignment && current.above === next.above ? current : next);
    }

    const hideSpeech = () => {
      censored = false;
      delete layer.dataset.attacking;
      setSpeech(null);
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
      const fixedLanding = next.edge !== 'landing';
      let takeoffX = start.x;
      if (from.canDash) {
        takeoffX = fixedLanding ? onSurface(next.point.x, from) : forward ? from.right : from.left;
      }
      const approach = onSurface(takeoffX, into);
      if (from.canDash || Math.abs(takeoffX - approach) > shortGapDistance) {
        takeoffX = onSurface(approach, from);
      }
      const takeoff = { x: takeoffX, y: from.y };
      const landingX = fixedLanding && !into.canDash &&
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

    const resumeAtTop = () => {
      if (!resumeRoute || narrowLayout || scrollY > 0 || resumedAtTop) return;
      if (returnScroll === undefined && phase !== 'waiting' && phase !== 'blink') return;
      resumedAtTop = true;
      queueUpdate();
    };

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && event.deltaY < 0) resumeAtTop();
    };

    const handleScrollKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key !== 'ArrowUp' && event.key !== 'PageUp' && event.key !== 'Home') return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.matches('input, select, textarea'))) return;
      resumeAtTop();
    };

    function sameStop(a: Stop | undefined, b: Stop) {
      return a?.surface.tile === b.surface.tile && a.edge === b.edge;
    }

    const activate = (event: MouseEvent) => {
      if (layer.hidden || layer.dataset.visible !== 'true' || phase !== 'idle' || layer.hasAttribute('data-attacking')) return;
      const point = narrowLayout ? narrowTarget : currentStop?.point;
      const surface = narrowLayout ? narrowTarget?.surface : currentStop?.surface;
      if (point && Math.random() < .4) {
        censored = true;
        if (!reducedMotion.matches) layer.dataset.attacking = '';
        showSpeech(point, grid.getBoundingClientRect(), null);
        setSpeechReplay((replay) => replay + 1);
        return;
      }
      if (censored) {
        hideSpeech();
        queueUpdate();
      }
      if (!point || !surface || reducedMotion.matches) {
        setSpeechReplay((replay) => replay + 1);
        return;
      }

      const bounds = layer.getBoundingClientRect();
      const offset = event.detail ? event.clientX - (bounds.left + bounds.width / 2) : 0;
      const moreRoomOnRight = surface.right - point.x > point.x - surface.left;
      const toRight = Math.abs(offset) < 2 ? moreRoomOnRight : offset < 0;
      const endX = onSurface(point.x + (toRight ? 1 : -1) * surface.dashDistance, surface);
      if (endX === point.x || !dashAlongCover(point, endX, () => {
        moveHorizontally({ x: endX, y: point.y }, point.x, () => {
          activeSurface = undefined;
          settle(point);
          queueUpdate();
        });
      })) {
        setSpeechReplay((replay) => replay + 1);
        return;
      }

      activeSurface = surface;
      hideSpeech();
    };

    const endAttack = (event: AnimationEvent) => {
      if (event.animationName === 'mascot-attack') delete layer.dataset.attacking;
    };

    function updateNarrow(bounds: DOMRect, visible: boolean) {
      if (!layer) return;
      const covers = sections.flatMap(({ cover, id }) => {
        const box = cover?.getBoundingClientRect();
        return cover && box?.width ? [{ cover, box, top: box.top, bottom: box.bottom, id }] : [];
      });
      const scrollLimit = document.documentElement.scrollHeight - innerHeight;
      const atBottom = scrollLimit > 0 && scrollY >= scrollLimit - 1;
      const next = visible && selectNarrowCover(covers, innerHeight, atBottom);
      if (!next || !image.complete) {
        cancelMotion();
        layer.hidden = true;
        narrowTarget = undefined;
        hideSpeech();
        return;
      }

      const point = {
        x: Math.round(next.box.left - bounds.left + (next.box.width - spriteWidth) / 2),
        y: Math.round(next.box.top - bounds.top - footOffset),
      };
      if (narrowTarget?.x === point.x && narrowTarget.y === point.y && narrowTarget.sectionId === next.id &&
        (!reducedMotion.matches || phase === 'idle')) {
        if (phase === 'idle') showSpeech(point, bounds, next.id);
        return;
      }

      const start = layer.hidden || reducedMotion.matches || !image.naturalWidth ? undefined : layer.getBoundingClientRect();
      cancelMotion();
      narrowTarget = { ...point, sectionId: next.id, surface: readSurface(next.cover, bounds, next.box, minDashDistance) };
      hideSpeech();
      if (start) {
        leap({ x: start.left - bounds.left, y: start.top - bounds.top }, point, () => {
          settle(point);
          queueUpdate();
        });
      } else {
        settle(point);
        showSpeech(point, bounds, next.id);
      }
    }

    function update() {
      if (!layer || !grid) return;
      const bounds = grid.getBoundingClientRect();
      const visible = bounds.bottom > 0 && bounds.top < innerHeight && !document.hidden;
      layer.dataset.visible = String(visible);
      if (!visible) hideSpeech();

      if (narrowLayout !== narrow.matches) {
        cancelMotion();
        narrowLayout = narrow.matches;
        narrowTarget = undefined;
        currentStop = undefined;
        plannedTarget = undefined;
        pending = [];
        introduction = !resumeRoute;
        introScroll = undefined;
        returnScroll = undefined;
        resumedAtTop = false;
        layer.hidden = true;
        hideSpeech();
      }
      if (narrowLayout) {
        updateNarrow(bounds, visible);
        return;
      }

      const stops: Stop[] = [];
      const routes: { id: string | null; top: number; landings: Stop[]; finish: Stop; leftFinish?: Stop }[] = [];
      for (const { element, id, tiles } of sections) {
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
        const lowerTile = id === 'project-preview' ? surfaces.find(({ tile }) => tile.classList.contains('tile-preview')) : undefined;
        const finishSurface = lowerTile ?? rightmost;
        const finish: Stop = {
          surface: finishSurface,
          edge: 'finish',
          point: {
            x: lowerTile ? Math.round((lowerTile.left + lowerTile.right) / 2) : onSurface(finishX, finishSurface),
            y: finishSurface.y,
          },
        };
        const landings: Stop[] = surfaces.map((surface) => ({
          surface, edge: 'landing', point: { x: surface.left, y: surface.y },
        }));
        let leftFinish: Stop | undefined;
        if (id === 'project-preview') {
          const surface = surfaces.find(({ tile }) => tile.classList.contains('case-cover')) ?? surfaces[0];
          leftFinish = {
            surface,
            edge: 'left-finish',
            point: { x: onSurface(startLimit, surface), y: surface.y },
          };
          stops.push(leftFinish);
        }
        if (!routes.length) {
          const surface = surfaces.find(({ tile }) => tile.classList.contains('tile-copy')) ?? surfaces[0];
          const center = Math.round((surface.left + surface.right) / 2);
          const startX = Math.max(startLimit, Math.min(finishX, center));
          stops.push({
            surface, edge: 'start', point: { x: onSurface(startX, surface), y: surface.y },
          });
        }
        stops.push(...landings, finish);
        routes.push({ id, top: section.top, landings, finish, leftFinish });
      }
      if (!routes.length) {
        cancelMotion();
        currentStop = undefined;
        layer.hidden = true;
        hideSpeech();
        return;
      }

      const scrollLimit = document.documentElement.scrollHeight - innerHeight;
      const atBottom = scrollLimit > 0 && scrollY >= scrollLimit - 1;
      const holdIntroFinish = introScroll !== undefined && window.scrollY === introScroll;
      if (!holdIntroFinish) introScroll = undefined;
      let caseIndex = 0;
      if (!introduction && !holdIntroFinish && routes.length === 3 && scrollY > 0) {
        if (atBottom) caseIndex = 2;
        else if (routes[1].top <= scrollThreshold) caseIndex = 1;
      }
      const target = Math.min(caseIndex + 1, routes.length - 1);
      const targetRoute = routes[target];
      const targetFinish = caseIndex === 1 ? targetRoute.leftFinish ?? targetRoute.finish : targetRoute.finish;

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

      const currentIndex = stops.findIndex((stop) => sameStop(currentStop, stop));
      const current = stops[currentIndex] ??
        stops.find(({ surface, edge }) => surface.tile === currentStop?.surface.tile && edge === 'landing') ??
        targetFinish;
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
      if (returnScroll === window.scrollY && !resumedAtTop) return;
      returnScroll = undefined;

      const origin = routes.findIndex(({ landings }) => landings.some(({ surface }) => surface.tile === current.surface.tile));
      if (!sameStop(plannedTarget, targetFinish)) {
        pending = [];
        plannedTarget = targetFinish;
      }

      if (!pending.length) {
        if (introduction && origin === 0 && current.edge === 'start') {
          const preview = routes[0].landings.find(({ surface }) => surface.tile.classList.contains('tile-preview'));
          if (preview) pending.push(preview);
        }
        if (origin < target) {
          const below = routes[origin + 1];
          const finish = origin + 1 === target ? targetFinish : below.finish;
          if (!introduction && finish.edge !== 'left-finish') {
            const intermediate = below.landings.filter(({ surface }) => surface.tile !== finish.surface.tile);
            pending.push(...intermediate.slice(0, -1));
          }
          pending.push(finish);
        } else if (origin > target) {
          const above = routes[origin - 1];
          const finish = origin - 1 === target ? targetFinish : above.finish;
          const steps = above.landings.filter(({ surface }) => !surface.tile.classList.contains('case-cover'))
            .sort((a, b) => b.surface.y - a.surface.y);
          const arrival = steps[0] ?? finish;
          const gap = (surface: Surface) => Math.max(
            0, surface.left - arrival.surface.right, arrival.surface.left - surface.right,
          );
          const exit = routes[origin].landings.find(({ surface }) => surface.canDash && gap(surface) < gap(current.surface));
          if (exit) pending.push(exit);
          pending.push(...steps, finish);
        } else if (!sameStop(current, targetFinish)) {
          pending.push(targetFinish);
        } else {
          if (introduction) {
            introduction = false;
            introScroll = window.scrollY;
          }
          showSpeech(current.point, bounds, routes[caseIndex].id);
          return;
        }
      }

      const next = pending.shift();
      if (!next) return;
      const updated = stops.find((stop) => sameStop(next, stop));
      if (!updated) {
        queueUpdate();
        return;
      }
      const forward = origin <= target;
      currentStop = updated;
      hideSpeech();
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
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('keydown', handleScrollKey);
    window.addEventListener('resize', queueUpdate);
    actor.addEventListener('click', activate);
    actor.addEventListener('animationend', endAttack);
    actor.addEventListener('animationcancel', endAttack);
    reducedMotion.addEventListener('change', queueUpdate);
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
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleScrollKey);
      window.removeEventListener('resize', queueUpdate);
      actor.removeEventListener('click', activate);
      actor.removeEventListener('animationend', endAttack);
      actor.removeEventListener('animationcancel', endAttack);
      reducedMotion.removeEventListener('change', queueUpdate);
      document.removeEventListener('visibilitychange', queueUpdate);
      image.removeEventListener('load', queueUpdate);
      image.removeEventListener('error', queueUpdate);
    };
  }, [resumeRoute, results]);

  return (
    <>
      <canvas className="mascot__movement" ref={effectsRef} aria-hidden="true" hidden />
      <span className="mascot__fx mascot__takeoff" ref={takeoffRef} aria-hidden="true" style={{ backgroundImage: `url(${takeoff})` }} />
      <div className="mascot" ref={root} hidden>
        <button type="button" className="mascot__actor" ref={actorRef} aria-label="Рывок маскота">
          <span className="mascot__facing" aria-hidden="true">
            <span className="mascot__sprite" />
            <span className="mascot__fx mascot__impact" style={{ backgroundImage: `url(${impact})` }} />
          </span>
        </button>
      </div>
      {speech && <MascotSpeech key={`${speech.message}:${speechReplay}`} message={speech.message} position={speech} />}
    </>
  );
}

export function ViewportMascot({ actorRef: actor, runOnHeadingId, message }: {
  actorRef: RefObject<HTMLSpanElement | null>;
  runOnHeadingId?: string;
  message?: string;
}) {
  const effects = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const layer = actor.current;
    const canvas = effects.current;
    const stage = canvas?.parentElement;
    if (!layer || !canvas || !stage) return;

    const image = new Image();
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let entrance: ReturnType<typeof playGroundMovement>;
    let run: Animation | undefined;
    let headingAppeared = false;
    let started = false;
    let frame = 0;

    const stopRunning = () => {
      if (!run) return;
      run.cancel();
      run = undefined;
      layer.dataset.pose = 'idle';
    };

    const runToCenter = () => {
      if (!headingAppeared || document.hidden || layer.dataset.pose !== 'idle' || layer.hasAttribute('data-centered')) return;
      const { left, width } = layer.getBoundingClientRect();
      const distance = innerWidth / 2 - (left + width / 2);
      layer.dataset.centered = '';
      if (reducedMotion.matches || !distance || typeof layer.animate !== 'function') return;

      layer.dataset.direction = distance < 0 ? 'left' : 'right';
      layer.dataset.pose = 'run';
      run = layer.animate([
        { transform: `translateX(${-width / 2 - distance}px)` },
        { transform: 'translateX(-50%)' },
      ], { duration: Math.abs(distance) * 5 });
      run.onfinish = stopRunning;
    };

    const heading = runOnHeadingId ? document.getElementById(runOnHeadingId) : null;
    const observer = heading && new IntersectionObserver(([entry], source) => {
      if (entry.intersectionRatio < .25) return;
      source.disconnect();
      headingAppeared = true;
      runToCenter();
    }, { threshold: .25 });
    if (heading && observer) observer.observe(heading);

    const reveal = () => {
      layer.style.opacity = '1';
      layer.dataset.pose = 'idle';
      runToCenter();
    };

    const appear = () => {
      if (started || document.hidden || !image.complete) return;
      started = true;
      if (reducedMotion.matches) {
        reveal();
        return;
      }
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
        runToCenter();
      } else if (started) {
        stopRunning();
        entrance?.cancel();
        reveal();
      }
    };

    const updateMotion = () => {
      if (reducedMotion.matches) stopRunning();
    };

    function queueAppear() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(appear);
    }

    image.addEventListener('load', queueAppear);
    image.addEventListener('error', queueAppear);
    document.addEventListener('visibilitychange', updateVisibility);
    reducedMotion.addEventListener('change', updateMotion);
    image.src = rider;
    queueAppear();

    return () => {
      observer && observer.disconnect();
      stopRunning();
      delete layer.dataset.centered;
      entrance?.cancel();
      cancelAnimationFrame(frame);
      image.removeEventListener('load', queueAppear);
      image.removeEventListener('error', queueAppear);
      document.removeEventListener('visibilitychange', updateVisibility);
      reducedMotion.removeEventListener('change', updateMotion);
    };
  }, [actor, runOnHeadingId]);

  return (
    <div className="mascot-viewport">
      <canvas className="mascot__movement" ref={effects} aria-hidden="true" hidden />
      <span className="mascot mascot-viewport__actor" aria-hidden="true" data-pose="blink" data-visible="true" data-direction="left" ref={actor}>
        <span className="mascot__facing">
          <span className="mascot__sprite" />
        </span>
        {message && <MascotSpeech message={message} position={{ y: -8, alignment: 50, above: true }} duration={10000} />}
      </span>
      <p className="mascot-speech__transcript" role="status">{message}</p>
    </div>
  );
}

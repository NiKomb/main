import { useEffect, useRef, useState, type RefObject } from 'react';
import rider from './rider.png';
import takeoff from './haste.png';
import impact from './heavy-landing.png';
import { playGroundMovement } from './ground-movement';
import { createMascotMovement, footOffset, mascotAttackChance, mascotAttackMessage, minDashDistance, onSurface, readSurface, sectionEdgeInset,
  spriteWidth, type Point, type Stop, type Surface } from './mascot-movement';
import { MascotSpeech } from './MascotSpeech';
import { selectNarrowCover } from './narrow-cover';
import { speechPosition, type SpeechPosition } from './speech-position';
import './mascot.css';

const scrollThreshold = 96;

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

    const image = new Image();
    const movement = createMascotMovement(layer, effectsRef.current, takeoffRef.current, image);
    const { place, settle, leap, dashAndReturn, moveOnSurface, travel } = movement;
    const narrow = matchMedia('(width < 1040px)');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let narrowLayout = narrow.matches;
    let narrowTarget: (Point & { sectionId: string | null; surface: Surface }) | undefined;
    let frame = 0;
    let currentStop: Stop | undefined;
    let introduction = !resumeRoute;
    let introScroll: number | undefined;
    let returnScroll: number | undefined;
    let resumedAtTop = false;
    let plannedTarget: Stop | undefined;
    let pending: Stop[] = [];
    let censored = false;

    function showSpeech(point: Point, bounds: DOMRect, sectionId: string | null) {
      const anchor = { x: point.x + spriteWidth / 2, top: point.y, bottom: point.y + footOffset };
      const position = speechPosition(anchor, bounds, innerHeight, narrowLayout);
      const message = censored ? mascotAttackMessage : sectionId ? results[sectionId] : undefined;
      const next = message && position ? { ...position, message } : null;
      setSpeech((current) => current && next && current.message === next.message && current.y === next.y &&
        current.alignment === next.alignment && current.above === next.above ? current : next);
    }

    const hideSpeech = () => {
      censored = false;
      delete layer.dataset.attacking;
      setSpeech(null);
    };

    const cancelMotion = movement.cancel;

    const resumeAtTop = () => {
      if (!resumeRoute || narrowLayout || scrollY > 0 || resumedAtTop) return;
      if (returnScroll === undefined && movement.phase !== 'waiting' && movement.phase !== 'blink') return;
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
      if (layer.hidden || layer.dataset.visible !== 'true' || movement.phase !== 'idle' || layer.hasAttribute('data-attacking')) return;
      const point = narrowLayout ? narrowTarget : currentStop?.point;
      const surface = narrowLayout ? narrowTarget?.surface : currentStop?.surface;
      if (point && Math.random() < mascotAttackChance) {
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

      if (!dashAndReturn(point, surface, event.detail ? event.clientX : undefined, () => {
        settle(point);
        queueUpdate();
      })) {
        setSpeechReplay((replay) => replay + 1);
        return;
      }

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
        (!reducedMotion.matches || movement.phase === 'idle')) {
        if (movement.phase === 'idle') showSpeech(point, bounds, next.id);
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
        movement.appear(start.point, introduction ? 'right' : 'left', reveal);
        return;
      }

      const currentIndex = stops.findIndex((stop) => sameStop(currentStop, stop));
      const current = stops[currentIndex] ??
        stops.find(({ surface, edge }) => surface.tile === currentStop?.surface.tile && edge === 'landing') ??
        targetFinish;
      if (current.surface.tile === currentStop.surface.tile && current.edge === 'landing') {
        current.point.x = onSurface(currentStop.point.x - currentStop.surface.left + current.surface.left, current.surface);
      }
      const activeSurface = movement.activeSurface;
      const updatedSurface = activeSurface && stops.find((stop) => stop.surface.tile === activeSurface.tile)?.surface;
      const surfaceMoved = activeSurface && (!updatedSurface || activeSurface.left !== updatedSurface.left ||
        activeSurface.right !== updatedSurface.right || activeSurface.y !== updatedSurface.y);
      if (movement.phase !== 'idle') {
        if (!visible || currentIndex < 0 || current.point.x !== currentStop.point.x ||
          current.point.y !== currentStop.point.y || surfaceMoved) {
          cancelMotion();
          if (resumeRoute && movement.phase === 'blink') returnScroll = window.scrollY;
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

export function ViewportMascot({ actorRef: actor }: { actorRef: RefObject<HTMLSpanElement | null> }) {
  const effects = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const layer = actor.current;
    const canvas = effects.current;
    const stage = canvas?.parentElement;
    if (!layer || !canvas || !stage) return;

    const image = new Image();
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
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
      if (reducedMotion.matches) {
        reveal();
        return;
      }
      const { offsetLeft: x, offsetTop: y } = layer;
      entrance = playGroundMovement(canvas, image, { x, y }, x, (_, opacity) => {
        layer.style.opacity = String(opacity);
      }, reveal, { kind: 'blink-arrival', facing: 'left' });
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
  }, [actor]);

  return (
    <div className="mascot-viewport">
      <canvas className="mascot__movement" ref={effects} aria-hidden="true" hidden />
      <span className="mascot mascot-viewport__actor" aria-hidden="true" data-pose="blink" data-visible="true" data-direction="left" ref={actor}>
        <span className="mascot__facing">
          <span className="mascot__sprite" />
        </span>
      </span>
    </div>
  );
}

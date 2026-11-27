import { useEffect, useRef, useState, type RefObject } from 'react';
import rider from './rider.png';
import takeoff from './haste.png';
import impact from './heavy-landing.png';
import { mascotAppearanceEvent, mascotTakeoffEvent } from '../profile-avatar/rotation';
import { playGroundMovement } from './ground-movement';
import { createMascotMovement, footOffset, mascotAttackChance, mascotAttackMessage, minDashDistance, onSurface, readSurface, sectionEdgeInset,
  spriteWidth, type Point, type Stop } from './mascot-movement';
import { MascotSpeech } from './MascotSpeech';
import { reactToHomeScroll, selectHomeRoute } from './narrow-cover';
import { speechPosition, type SpeechPosition } from './speech-position';
import { useSpeechInterruption } from './use-speech-interruption';
import './mascot.css';

const viewportFinishGap = 12;

export function Mascot({ resumeRoute, results }: { resumeRoute: boolean; results: Readonly<Partial<Record<string, string>>> }) {
  const root = useRef<HTMLDivElement>(null);
  const actorRef = useRef<HTMLButtonElement>(null);
  const effectsRef = useRef<HTMLCanvasElement>(null);
  const takeoffRef = useRef<HTMLSpanElement>(null);
  const [speech, setSpeech] = useState<(SpeechPosition & { message: string; onClose?: () => void }) | null>(null);
  const [speechReplay, setSpeechReplay] = useState(0);
  const { bubbleRef, interrupt, interruption } = useSpeechInterruption();

  useEffect(() => {
    const layer = root.current;
    const grid = layer?.parentElement;
    const actor = actorRef.current;
    if (!layer || !grid || !actor) return;

    const avatar = grid.closest('main')?.querySelector('.portfolio-avatar');
    const sections = Array.from(grid.querySelectorAll('.case-tile'), (section) => ({
      element: section,
      id: section.getAttribute('data-section-id'),
      cover: section.querySelector('.case-cover'),
    }));

    const image = new Image();
    const movement = createMascotMovement(layer, effectsRef.current, takeoffRef.current, image);
    const { place, blink, dashAndReturn, travel } = movement;
    const narrow = matchMedia('(width < 1040px)');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let currentStop: Stop | undefined;
    let introduction = !resumeRoute;
    let returnScroll: number | undefined;
    let resumedAtTop = false;
    let censored = false;
    let scrollPending = false;
    let previousScroll = Math.max(0, scrollY);
    let reactedScroll = previousScroll;
    let lastFrameTime = performance.now();

    const settle = (point: Point) => {
      movement.settle(point);
      layer.toggleAttribute('data-viewport-finish', currentStop?.surface.tile === grid);
    };

    const finishAttackComment = () => {
      censored = false;
    };

    function showSpeech(point: Point, bounds: DOMRect, sectionId: string | null, fromScroll = false) {
      const anchor = { x: point.x + spriteWidth / 2, top: point.y, bottom: point.y + footOffset };
      const position = speechPosition(anchor, bounds, innerHeight, narrow.matches);
      const message = censored ? mascotAttackMessage : sectionId ? results[sectionId] : undefined;
      const onClose = censored ? finishAttackComment : undefined;
      const next = message && position ? { ...position, message, onClose } : null;
      if (fromScroll) interrupt(next?.message);
      setSpeech((current) => current && next && current.message === next.message && current.y === next.y &&
        current.alignment === next.alignment && current.above === next.above && current.onClose === next.onClose ? current : next);
    }

    const hideSpeech = (fromScroll = false) => {
      if (fromScroll) interrupt();
      censored = false;
      delete layer.dataset.attacking;
      setSpeech(null);
    };

    const cancelMotion = movement.cancel;

    const resumeAtTop = () => {
      if (!resumeRoute || scrollY > 0 || resumedAtTop) return;
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
      const point = currentStop?.point;
      const surface = currentStop?.surface;
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
      if (!point || !surface || surface.tile === grid || reducedMotion.matches) {
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

    function update(now: number) {
      if (!layer || !grid) return;
      const bounds = grid.getBoundingClientRect();
      const avatarBox = introduction ? avatar?.getBoundingClientRect() : undefined;
      const top = Math.min(bounds.top, avatarBox?.top ?? bounds.top);
      const visible = bounds.bottom > 0 && top < innerHeight && !document.hidden;
      layer.dataset.visible = String(visible);

      const routes = sections.flatMap(({ id, cover }) => {
        const box = cover?.getBoundingClientRect();
        if (!cover || !box?.width || !box.height) return [];
        const surface = readSurface(cover, bounds, box, minDashDistance);
        const center = Math.round((surface.left + surface.right) / 2);
        const midpoint: Stop = { surface, edge: 'midpoint', point: { x: center, y: surface.y } };
        const x = id === 'project-preview' ? center
          : onSurface(Math.round(box.right - bounds.left - spriteWidth / 2 - sectionEdgeInset), surface);
        const finish: Stop = { surface, edge: 'finish', point: { x, y: surface.y } };
        return [{ id, top: box.top, bottom: box.bottom, midpoint, finish }];
      });
      const scrollLimit = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      const position = Math.min(scrollLimit, Math.max(0, scrollY));
      const previousReaction = reactedScroll;
      reactedScroll = visible && position > 0 && !reducedMotion.matches
        ? reactToHomeScroll(position, previousScroll, reactedScroll, now - lastFrameTime) : position;
      previousScroll = position;
      lastFrameTime = now;
      const { cover: targetRoute, atBottom } = selectHomeRoute(routes, innerHeight, position, scrollLimit, reactedScroll);
      if (atBottom) reactedScroll = position;
      const fromScroll = (scrollPending || previousReaction !== reactedScroll) && !document.hidden;
      scrollPending = false;
      if (visible && reactedScroll !== position) queueUpdate();
      if (!targetRoute || !visible) {
        cancelMotion();
        if (avatar && currentStop?.surface.tile === avatar) avatar.dispatchEvent(new Event(mascotTakeoffEvent));
        currentStop = undefined;
        layer.hidden = true;
        hideSpeech(fromScroll);
        return;
      }

      const stops = routes.flatMap(({ midpoint, finish }) => midpoint.point.x === finish.point.x ? [finish] : [midpoint, finish]);
      const { midpoint, finish: coverFinish } = targetRoute;
      const enteringCover = currentStop && (currentStop.surface.tile !== coverFinish.surface.tile ||
        (currentStop.edge === 'midpoint' && movement.phase !== 'idle'));
      let targetFinish = enteringCover && !reducedMotion.matches && midpoint.point.x !== coverFinish.point.x ? midpoint : coverFinish;
      if (avatar && avatarBox?.width) {
        const surface = readSurface(avatar, bounds, avatarBox, minDashDistance);
        stops.unshift({
          surface, edge: 'start', point: { x: Math.round((surface.left + surface.right) / 2), y: surface.y },
        });
      }

      const previewReached = currentStop?.surface.tile === targetRoute.finish.surface.tile && movement.phase === 'idle';
      const finishAtFloor = atBottom && (targetRoute.id !== 'project-preview' ||
        (!reducedMotion.matches && (previewReached || currentStop?.surface.tile === grid)));
      if (finishAtFloor || currentStop?.surface.tile === grid) {
        const viewportRight = document.documentElement.clientWidth;
        const rightLimit = viewportRight - spriteWidth - viewportFinishGap;
        const x = Math.floor(Math.max(0, Math.min(bounds.right + viewportFinishGap, rightLimit)) - bounds.left);
        const center = Math.floor(Math.max(0, (viewportRight - spriteWidth) / 2) - bounds.left);
        const floorY = finishAtFloor ? innerHeight : innerHeight + scrollLimit - scrollY;
        const y = Math.floor(floorY - bounds.top - spriteWidth);
        const surface = {
          tile: grid, left: Math.min(center, x), right: Math.max(center, x), y, canDash: true, dashDistance: minDashDistance,
        };
        const landing: Stop = { surface, edge: 'landing', point: { x: center, y } };
        const finish: Stop = { surface, edge: 'finish', point: { x, y } };
        stops.push(landing, finish);
        if (finishAtFloor) {
          const reachedFloor = currentStop?.surface.tile === grid && (currentStop.edge === 'finish' || movement.phase === 'idle');
          targetFinish = reachedFloor ? finish : landing;
        }
      }

      if (!currentStop) {
        if (!image.complete) return;
        const footY = (stop: Stop) => bounds.top + stop.point.y + footOffset;
        const visibleStops = stops.filter((stop) => footY(stop) >= 0 && footY(stop) <= innerHeight);
        const candidates = visibleStops.length ? visibleStops : stops;
        const distance = (stop: Stop) => Math.abs(innerHeight - footY(stop));
        const start = introduction && !atBottom && !reducedMotion.matches && visibleStops.includes(stops[0]) && stops[0].edge === 'start'
          ? stops[0] : introduction ? targetFinish : candidates.reduce((best, stop) => {
          const delta = distance(stop) - distance(best);
          return delta < 0 || (delta === 0 && stop.point.x > best.point.x) ? stop : best;
        });
        currentStop = start;
        settle(start.point);
        if (resumeRoute) returnScroll = scrollY;
        const reveal = () => {
          settle(start.point);
          queueUpdate();
        };
        if (start.surface.tile === avatar) avatar.dispatchEvent(new Event(mascotAppearanceEvent));
        if (reducedMotion.matches) reveal();
        else movement.appear(start.point, introduction ? 'right' : 'left', reveal);
        return;
      }

      const currentIndex = stops.findIndex((stop) => sameStop(currentStop, stop));
      const current = stops[currentIndex] ?? targetFinish;
      const backwards = currentIndex > stops.indexOf(targetFinish);
      const footY = bounds.top + current.point.y + footOffset;
      const holdReturn = currentIndex >= 0 && returnScroll !== undefined && !resumedAtTop &&
        (returnScroll === scrollY || (scrollY > returnScroll && backwards && footY >= 0 && footY <= innerHeight));
      returnScroll = holdReturn ? scrollY : undefined;

      const retarget = fromScroll && movement.phase !== 'idle' && !sameStop(current, targetFinish);
      const toFloor = targetFinish.surface.tile === grid;
      const enteringFloor = toFloor && current.surface.tile !== grid;
      if ((backwards || retarget || enteringFloor) && !holdReturn && !layer.hidden) {
        const start = layer.getBoundingClientRect();
        const origin = { x: start.left - bounds.left, y: start.top - bounds.top };
        const fromAvatar = current.surface.tile === avatar || movement.activeSurface?.tile === avatar;
        cancelMotion();
        currentStop = targetFinish;
        hideSpeech(fromScroll);
        if (fromAvatar) avatar?.dispatchEvent(new Event(mascotTakeoffEvent));
        if (toFloor) layer.setAttribute('data-viewport-finish', '');
        const finish = () => {
          settle(targetFinish.point);
          queueUpdate();
        };
        if (reducedMotion.matches) {
          finish();
        } else if (!backwards && start.bottom > 0 && start.top < innerHeight && layer.style.opacity !== '0') {
          movement.leap(origin, targetFinish.point, finish, { arcAcrossWideGap: true });
        } else {
          blink(origin, targetFinish.point, finish);
        }
        return;
      }

      const activeSurface = movement.activeSurface;
      const updatedSurface = activeSurface && stops.find((stop) => stop.surface.tile === activeSurface.tile)?.surface;
      const surfaceMoved = activeSurface && (!updatedSurface || activeSurface.left !== updatedSurface.left ||
        activeSurface.right !== updatedSurface.right || activeSurface.y !== updatedSurface.y);
      if (movement.phase !== 'idle') {
        if (currentIndex < 0 || current.point.x !== currentStop.point.x ||
          current.point.y !== currentStop.point.y || surfaceMoved || reducedMotion.matches) {
          cancelMotion();
          currentStop = current;
          settle(current.point);
          queueUpdate();
        }
        return;
      }

      currentStop = current;
      place(current.point);
      if (holdReturn) return;
      if (sameStop(current, targetFinish)) {
        introduction = false;
        showSpeech(current.point, bounds, targetRoute.id, fromScroll);
        return;
      }

      currentStop = targetFinish;
      hideSpeech(fromScroll);
      const finish = () => {
        settle(targetFinish.point);
        queueUpdate();
      };
      const fromAvatar = current.surface.tile === avatar;
      if (reducedMotion.matches) {
        if (fromAvatar) avatar.dispatchEvent(new Event(mascotTakeoffEvent));
        finish();
      } else if (current.surface.tile === targetFinish.surface.tile) {
        movement.moveOnSurface(current.point, targetFinish.point.x, current.surface, finish);
      } else {
        travel(current, targetFinish, true, finish, fromAvatar,
          fromAvatar ? () => avatar.dispatchEvent(new Event(mascotTakeoffEvent)) : undefined);
      }
    }

    function queueUpdate() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }

    const onScroll = () => {
      scrollPending = true;
      queueUpdate();
    };

    const resize = new ResizeObserver(queueUpdate);
    const layoutChanges = new MutationObserver(queueUpdate);
    resize.observe(grid);
    for (const { element, cover } of sections) {
      resize.observe(element);
      if (cover) resize.observe(cover);
      layoutChanges.observe(element, {
        attributes: true,
        attributeFilter: ['class', 'style', 'hidden'],
        subtree: true,
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
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
      window.removeEventListener('scroll', onScroll);
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
  }, [resumeRoute, results, interrupt]);

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
        {interruption}
      </div>
      {!interruption && speech && <MascotSpeech key={`${speech.message}:${speechReplay}`} message={speech.message}
        position={speech} bubbleRef={bubbleRef} mascotRef={root} onClose={speech.onClose} />}
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

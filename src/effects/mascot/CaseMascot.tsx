import { useEffect, useRef, useState, type RefObject } from 'react';
import rider from './rider.png';
import takeoff from './haste.png';
import impact from './heavy-landing.png';
import { rocketCaptionHitEvent, shotCaptionVisible } from '../rocket-shot/scroll-trigger';
import { mascotPaintEvent, type PaintPoint } from './paint-drop';
import { MascotSpeech } from './MascotSpeech';
import { caseRouteComment } from './case-comments';
import { caseFooterRoute, caseRouteViewportLimits, nextCaseSurfaceToRight, rightmostCaseSurface, sameCaseRow, selectCaseSurface, type CaseSurface } from './case-route';
import { playGroundMovement } from './ground-movement';
import { createMascotMovement, footOffset, mascotAttackChance, mascotAttackMessage, minDashDistance, onSurface, readSurface, sectionEdgeInset, shortGapDistance,
  spriteWidth, type Point, type Stop, type Surface } from './mascot-movement';
import { speechPosition, type SpeechPosition } from './speech-position';
import { useSpeechInterruption } from './use-speech-interruption';
import './mascot.css';

const gallerySelector = '.case-covers, .interview-gallery-scroll, .dns-case-frames';
const cardSelector = '.dns-case-fact, .dns-case-summary, .dns-case-block > blockquote';
type RouteSurface = CaseSurface & { surface: Surface };
type Speech = SpeechPosition & { message: string; hidden?: boolean; paintTile?: Element };
type CaseSurfaceGeometry = Surface & { routeEnd?: true };
type CaseStop = Stop & { surface: CaseSurfaceGeometry };

function stop(surface: CaseSurfaceGeometry, edge: Stop['edge'], x: number): CaseStop {
  return { surface, edge, point: { x: onSurface(x, surface), y: surface.y } };
}

export function CaseMascot({ actorRef, comments, shotComment, paused }: {
  actorRef: RefObject<HTMLSpanElement | null>;
  comments: Readonly<Record<string, string>>;
  shotComment?: string;
  paused: boolean;
}) {
  const route = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const departureCanvas = useRef<HTMLCanvasElement>(null);
  const lift = useRef<HTMLSpanElement>(null);
  const setPaused = useRef<(paused: boolean) => void>(undefined);
  const [speech, setSpeech] = useState<Speech>();
  const [speechReplay, setSpeechReplay] = useState(0);
  const paintSpeech = useRef<HTMLSpanElement>(null);
  const { bubbleRef, interrupt, interruption } = useSpeechInterruption();

  useEffect(() => {
    const layer = route.current;
    const article = layer?.closest('article');
    const actor = actorRef.current;
    const control = actor?.querySelector<HTMLButtonElement>('.mascot__actor');
    if (!layer || !article || !actor || !control) return;

    const image = new Image();
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const movement = createMascotMovement(actor, canvas.current, lift.current, image);
    const openingGallery = article.querySelector('.case-covers');
    const footerActions = article.querySelector('[data-mascot-route-end]');
    const textColumn = article.querySelector('.dns-case-body > .case-text');
    const tiles = Array.from(article.querySelectorAll<HTMLElement>([
      '.case-covers .case-cover', '.dns-comparison-tile',
      '.case-screenshot:not(.dns-comparison-tile *)', cardSelector,
    ].join(', ')), (tile) => {
      const kind = tile.matches(cardSelector) ? 'card' as const : 'screen' as const;
      const gallery = tile.closest(gallerySelector);
      const clip = gallery?.matches('.case-covers, .interview-gallery-scroll') ? gallery : null;
      const group = gallery ?? tile.closest('.dns-case-stages, .dns-decision-tile') ?? tile;
      return { tile, kind, group, clip };
    });
    let current: CaseStop | undefined;
    let destination: CaseStop | undefined;
    let routeFinish: CaseStop | undefined;
    let metricCheck: Element | null = null;
    let metricGrid: Element | null = null;
    let frame = 0;
    let appeared = false;
    let suspended = false;
    let lastScroll = scrollY;
    let scrollPending = false;
    let teleportingFromJump = false;
    let direction = 0;
    let point: Point | undefined;
    let visibleActor: (Point & { facing: 'left' | 'right' }) | undefined;
    let departure: ReturnType<typeof playGroundMovement>;
    let shotCaption: HTMLElement | undefined;
    let gestureTile: Element | undefined;

    const rememberActor = (bounds = layer.getBoundingClientRect()) => {
      if (actor.hidden || actor.style.opacity === '0') return;
      const box = actor.getBoundingClientRect();
      if (box.bottom > 24 && box.top < innerHeight - 24 && box.right > 0 && box.left < innerWidth) {
        const facing = actor.dataset.direction === 'left' ? 'left' : 'right';
        visibleActor = { x: box.left - bounds.left, y: box.top - bounds.top, facing };
      }
    };

    const playDeparture = (bounds: DOMRect) => {
      const origin = visibleActor;
      const effects = departureCanvas.current;
      visibleActor = undefined;
      if (motion.matches || actor.hidden || actor.style.opacity === '0' || !origin || !effects) return false;
      const top = origin.y + bounds.top;
      if (top + spriteWidth <= 0 || top >= innerHeight) return false;
      departure?.cancel();
      departure = playGroundMovement(effects, image, origin, origin.x, () => {}, () => {},
        { kind: 'blink-departure', facing: origin.facing });
      return !!departure;
    };

    function settle(next: Point) {
      point = next;
      movement.settle(next);
      rememberActor();
    }

    const paintMetric = (stop: CaseStop, bounds?: DOMRect) => {
      const { tile } = stop.surface;
      if (!tile.matches('[data-mascot-paint-gradient]:not([data-paint-started])')) return;
      const layerBounds = bounds ?? layer.getBoundingClientRect();
      tile.dispatchEvent(new CustomEvent<PaintPoint>(mascotPaintEvent, {
        detail: { x: layerBounds.left + stop.point.x + spriteWidth / 2, y: layerBounds.top + stop.point.y + footOffset - 24 },
      }));
    };

    function finish(next: CaseStop) {
      teleportingFromJump = false;
      destination = undefined;
      current = next;
      settle(next.point);
      paintMetric(next);
      queue();
    }

    const renderedPosition = (bounds: DOMRect) => {
      if (actor.hidden || actor.style.opacity === '0') return;
      const box = actor.getBoundingClientRect();
      if (box.bottom > 0 && box.top < innerHeight) return { x: box.left - bounds.left, y: box.top - bounds.top };
    };

    const readRouteEnd = (bounds: DOMRect) => {
      if (!footerActions || !textColumn) return;
      const buttons = Array.from(footerActions.querySelectorAll(':is(button, a[href]):not(:disabled, [aria-disabled="true"])'))
        .filter((tile) => !tile.closest('[inert], [aria-hidden="true"]') && getComputedStyle(tile).visibility === 'visible')
        .map((tile) => {
          const { left, right, top, bottom } = tile.getBoundingClientRect();
          return { tile, left, right, top, bottom };
        });
      const footer = caseFooterRoute(buttons, innerWidth, innerHeight, textColumn.getBoundingClientRect().right, spriteWidth);
      if (!footer) return;

      const { button } = footer;
      const finishX = footer.rightFinish.x - bounds.left;
      const buttonX = footer.buttonX - bounds.left;
      const floor: CaseSurfaceGeometry = {
        tile: footerActions, routeEnd: true, canDash: true, dashDistance: minDashDistance,
        left: Math.min(buttonX, finishX), right: Math.max(buttonX, finishX), y: Math.floor(footer.rightFinish.y - bounds.top),
      };
      const buttonSurface: CaseSurfaceGeometry = {
        tile: button.tile, routeEnd: true, canDash: false, dashDistance: minDashDistance,
        left: buttonX, right: buttonX, y: Math.round(button.top - bounds.top - footOffset),
      };
      return {
        leftFinish: stop(buttonSurface, 'left-finish', buttonX),
        landing: stop(floor, 'landing', buttonX),
        rightFinish: stop(floor, 'finish', finishX),
      };
    };

    const hideSpeech = (fromScroll = false) => {
      if (fromScroll) interrupt();
      setSpeech((previous) => previous && !previous.hidden ? { ...previous, hidden: true } : previous);
    };

    const drawSpeech = (bounds: DOMRect, fromScroll = false) => {
      const stop = current;
      if (!stop || control.inert || actor.hidden || movement.phase !== 'idle') {
        hideSpeech(fromScroll);
        return;
      }
      paintMetric(stop, bounds);
      const reaction = gestureTile === stop.surface.tile ? mascotAttackMessage : shotCaption ? shotComment : undefined;
      if (!reaction && routeFinish && (stop.surface.tile !== routeFinish.surface.tile || stop.point.x !== routeFinish.point.x)) {
        hideSpeech(fromScroll);
        return;
      }
      const message = reaction ?? caseRouteComment(stop.surface.tile, comments);
      if (!message) {
        if (fromScroll) interrupt();
        setSpeech(undefined);
        return;
      }
      const { x, y } = stop.point;
      const position = speechPosition({ x: x + spriteWidth / 2, top: y, bottom: y + footOffset }, bounds, innerHeight);
      if (!position) {
        hideSpeech(fromScroll);
        return;
      }
      const metricBlock = metricCheck ?? metricGrid;
      if (!reaction && article.dataset.sectionId === 'project-dns' && stop.surface.tile.matches('.dns-case-summary')) {
        position.above = true;
        position.y = y + footOffset - 4;
      } else if (!reaction && metricBlock) {
        if (bounds.width >= 1280) {
          position.above = !metricGrid;
          position.y = metricGrid ? y + footOffset : y - 8;
        } else {
          const firstCard = metricGrid?.firstElementChild;
          if (firstCard && Math.abs(firstCard.getBoundingClientRect().top - (bounds.top + y + footOffset)) >= 1) {
            hideSpeech(fromScroll);
            return;
          }
          position.above = true;
          position.y = y + footOffset - 4;
        }
      }
      const paintTile = !reaction && stop.surface.tile.hasAttribute('data-mascot-paint-frame')
        ? stop.surface.tile : undefined;
      const next = { ...position, message, paintTile, avoidTiles: metricGrid ?? undefined };
      if (fromScroll) interrupt(message);
      setSpeech((previous) => previous?.message === next.message && !previous.hidden && previous.y === next.y &&
        previous.above === next.above && previous.alignment === next.alignment &&
        previous.paintTile === next.paintTile && previous.avoidTiles === next.avoidTiles ? previous : next);
    };

    const replaySpeech = () => setSpeechReplay((replay) => replay + 1);

    const clearGesture = () => {
      gestureTile = undefined;
      delete actor.dataset.attacking;
    };

    const activate = (event: MouseEvent) => {
      const origin = current;
      if (!origin || actor.hidden || actor.dataset.visible !== 'true' || movement.phase !== 'idle' || actor.hasAttribute('data-attacking')) return;
      const { point, surface } = origin;
      const pointerX = event.detail && point.x > surface.left && point.x < surface.right ? event.clientX : undefined;
      clearGesture();
      if (Math.random() < mascotAttackChance) {
        gestureTile = surface.tile;
        if (!motion.matches) actor.dataset.attacking = '';
      } else if (!motion.matches && movement.dashAndReturn(point, surface, pointerX, () => {
        replaySpeech();
        finish(origin);
      })) {
        hideSpeech();
        return;
      }
      replaySpeech();
      drawSpeech(layer.getBoundingClientRect());
    };

    const endAttack = (event: AnimationEvent) => {
      if (event.animationName === 'mascot-attack') delete actor.dataset.attacking;
    };

    const onCaptionHit = (event: Event) => {
      if (!(event instanceof CustomEvent) || !(event.detail instanceof HTMLElement)) return;
      shotCaption = event.detail;
      queue();
    };

    const update = () => {
      frame = 0;
      const fromScroll = scrollPending;
      scrollPending = false;
      const enabled = !suspended && !document.hidden;
      actor.dataset.visible = String(enabled);
      if (!enabled || motion.matches) departure?.cancel();
      if (!enabled) {
        movement.cancel();
        clearGesture();
        actor.hidden = true;
        visibleActor = undefined;
        teleportingFromJump = false;
        hideSpeech();
        current = destination = undefined;
        control.inert = false;
        lastScroll = scrollY;
        direction = 0;
        return;
      }
      const bounds = layer.getBoundingClientRect();
      if (!motion.matches && !image.complete) return;
      if (shotCaption && !shotCaptionVisible(shotCaption.getBoundingClientRect(), innerHeight)) shotCaption = undefined;
      const departing = departureCanvas.current;
      if (departing && !departing.hidden) {
        const box = departing.getBoundingClientRect();
        if (box.bottom <= 0 || box.top >= innerHeight) departure?.cancel();
      }

      const delta = scrollY - lastScroll;
      rememberActor(bounds);
      const canFollow = delta <= innerHeight / 3;
      if (delta !== 0) direction = Math.sign(delta);
      lastScroll = scrollY;
      if (teleportingFromJump && !motion.matches) return;
      teleportingFromJump = false;

      const contents = innerWidth < 1200 ? article.querySelector('.case-nav[data-dns-contents] ul') : null;
      const openingGalleryTop = scrollY <= 0 ? openingGallery?.getBoundingClientRect().top : undefined;
      const limits = caseRouteViewportLimits(innerHeight, contents?.getBoundingClientRect().bottom, openingGalleryTop);
      const target = (destination ?? current)?.surface;
      const onFooterButton = target?.routeEnd && target.tile !== footerActions;
      const footerButtonIsSafe = onFooterButton && target.tile.getBoundingClientRect().top < limits.bottom;
      const routeEnd = direction < 0 && !footerButtonIsSafe ? undefined : readRouteEnd(bounds);
      control.inert = !!routeEnd;
      const surfaces: RouteSurface[] = routeEnd ? [] : tiles.flatMap(({ tile, kind, group, clip }) => {
        const box = tile.getBoundingClientRect();
        if (!box.height || box.top < 0 || box.top > limits.bottom) return [];
        const clipBox = clip?.getBoundingClientRect();
        const left = Math.max(box.left, clipBox?.left ?? 0, 0);
        const right = Math.min(box.right, clipBox?.right ?? innerWidth, innerWidth);
        if (right - left < spriteWidth) return [];
        const surface = readSurface(tile, bounds, new DOMRect(left, box.top, right - left, box.height),
          minDashDistance, kind === 'screen');
        surface.left = Math.max(surface.left, Math.ceil(-bounds.left));
        surface.right = Math.min(surface.right, Math.floor(innerWidth - bounds.left - spriteWidth));
        return [{ tile, group, kind, top: box.top, left, right, surface, hasOwnComment: tile.hasAttribute('data-mascot-comment') }];
      });
      const upperSurfaces = surfaces.filter(({ top }) => top >= limits.top);
      const previous = surfaces.find(({ tile }) => tile === current?.surface.tile);
      const selected = selectCaseSurface(upperSurfaces, upperSurfaces.find(({ tile }) => tile === current?.surface.tile),
        innerHeight, direction < 0);
      metricCheck = selected?.hasOwnComment ? selected.tile.closest('.dns-decision-check') : null;
      metricGrid = selected?.group.matches('.dns-case-results[data-mascot-comment]') ? selected.group : null;
      const rightmost = selected && (selected.hasOwnComment ? selected : rightmostCaseSurface(selected, upperSurfaces));
      routeFinish = routeEnd?.rightFinish ?? (rightmost && stop(rightmost.surface, 'finish', rightmost.surface.right));
      if (gestureTile && gestureTile !== routeFinish?.surface.tile) clearGesture();

      const crossingRouteEnd = !!target?.routeEnd !== !!routeEnd;
      const scrolledInJump = fromScroll && movement.phase === 'jump';
      const blinkFrom = crossingRouteEnd || scrolledInJump ? renderedPosition(bounds) : undefined;
      let interrupted = false;
      let resumeFrom: Point | undefined;
      if (movement.phase !== 'idle' && !actor.hidden) {
        const live = routeEnd
          ? [routeEnd.rightFinish.surface, routeEnd.leftFinish.surface].find(({ tile }) => tile === target?.tile)
          : selected && upperSurfaces.find((candidate) => candidate.tile === target?.tile &&
            candidate.top <= innerHeight / 2 && sameCaseRow(candidate, selected) &&
            (!selected.hasOwnComment || candidate.tile === selected.tile))?.surface;
        if (!scrolledInJump && !motion.matches && target && live &&
          live.left === target.left && live.right === target.right && live.y === target.y) {
          drawSpeech(bounds, fromScroll);
          return;
        }
        if (!scrolledInJump && !motion.matches && !crossingRouteEnd && !routeEnd && movement.phase !== 'blink') {
          resumeFrom = renderedPosition(bounds);
        }
        movement.cancel();
        interrupted = true;
        destination = undefined;
      }

      const surface = routeEnd
        ? current?.surface.tile === routeEnd.rightFinish.surface.tile ? routeEnd.rightFinish.surface : routeEnd.leftFinish.surface
        : selected?.surface;
      if (!surface || !routeFinish) {
        if (!actor.hidden) {
          playDeparture(bounds);
          movement.cancel();
        }
        actor.hidden = true;
        hideSpeech(fromScroll);
        return;
      }

      const runUp = surface.canDash ? surface.dashDistance + 12 : sectionEdgeInset - 12;
      const entry = scrolledInJump ? routeFinish : routeEnd?.leftFinish ?? stop(surface, 'start', surface.right - runUp);

      if (motion.matches) {
        current = routeFinish;
        settle(routeFinish.point);
        appeared = true;
        drawSpeech(bounds, fromScroll);
        return;
      }

      if (resumeFrom && canFollow) {
        const landing = stop(surface, 'landing', current?.surface.tile === surface.tile ? current.point.x : resumeFrom.x);
        destination = landing;
        movement.leap(resumeFrom, landing.point, () => finish(landing), { arcAcrossWideGap: true });
        drawSpeech(bounds, fromScroll);
        return;
      }

      if (scrolledInJump || crossingRouteEnd || (routeEnd && interrupted) || current?.surface.tile !== surface.tile || actor.hidden) {
        const landing = previous?.group === selected?.group || surface.tile === routeFinish.surface.tile
          ? routeFinish : stop(surface, 'landing', surface.left);
        const from = previous && current && stop(previous.surface, current.edge, current.point.x);
        const nearby = from && Math.abs(from.point.y - landing.point.y) <= Math.min(400, innerHeight / 2) &&
          Math.max(0, from.surface.left - landing.surface.right, landing.surface.left - from.surface.right) <= shortGapDistance;
        if (!scrolledInJump && !crossingRouteEnd && !actor.hidden && selected && previous && nearby && canFollow) {
          destination = landing;
          movement.travel(from, landing, selected.top >= previous.top, () => finish(landing), true);
        } else {
          current = entry;
          teleportingFromJump = scrolledInJump;
          const foot = point && bounds.top + point.y + footOffset;
          const origin = blinkFrom ?? (appeared && !interrupted && !actor.hidden &&
            foot !== undefined && foot > 0 && foot < innerHeight ? point : undefined);
          if (origin) {
            destination = entry;
            movement.blink(origin, entry.point, () => finish(entry));
          } else {
            const leftWithBlink = playDeparture(bounds);
            const reveal = scrolledInJump || crossingRouteEnd || !!routeEnd || leftWithBlink || !appeared || actor.hidden ||
              Math.abs(delta) > innerHeight / 3;
            settle(entry.point);
            if (reveal) {
              actor.dataset.direction = 'left';
              movement.appear(entry.point, 'left', () => finish(entry));
            }
          }
          appeared = true;
          queue();
        }
        drawSpeech(bounds, fromScroll);
        return;
      }

      current = stop(surface, current.edge, current.point.x);
      if (surface.tile !== routeFinish.surface.tile || current.point.x !== routeFinish.point.x) {
        const nextTile = selected && surface.tile !== routeFinish.surface.tile ? nextCaseSurfaceToRight(selected, upperSurfaces) : undefined;
        const arrival = routeEnd?.leftFinish.surface.tile === surface.tile
          ? routeEnd.landing : nextTile ? stop(nextTile.surface, 'landing', nextTile.surface.left) : routeFinish;
        destination = arrival;
        const arrive = () => finish(arrival);
        if (surface.tile === arrival.surface.tile) movement.moveOnSurface(current.point, arrival.point.x, surface, arrive);
        else movement.travel(current, arrival, true, arrive, true);
      } else {
        current = routeFinish;
        settle(routeFinish.point);
      }
      drawSpeech(bounds, fromScroll);
    };

    function queue() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    const onScroll = () => {
      scrollPending = true;
      queue();
    };

    function updateVisibility() {
      if (!document.hidden) {
        queue();
        return;
      }
      cancelAnimationFrame(frame);
      update();
    }

    const resize = new ResizeObserver(queue);
    resize.observe(article);
    const footerChanges = new MutationObserver(queue);
    if (footerActions) {
      resize.observe(footerActions);
      footerChanges.observe(footerActions, {
        subtree: true, childList: true, attributes: true,
        attributeFilter: ['class', 'style', 'hidden', 'disabled', 'href', 'aria-disabled', 'aria-hidden', 'inert'],
      });
    }
    const scrollOptions = { passive: true, capture: true };
    window.addEventListener('scroll', onScroll, scrollOptions);
    window.addEventListener('resize', queue);
    document.addEventListener('visibilitychange', updateVisibility);
    motion.addEventListener('change', queue);
    control.addEventListener('click', activate);
    control.addEventListener('animationend', endAttack);
    control.addEventListener('animationcancel', endAttack);
    if (shotComment) actor.addEventListener(rocketCaptionHitEvent, onCaptionHit);
    setPaused.current = (value) => {
      suspended = value;
      queue();
    };
    image.addEventListener('load', queue);
    image.addEventListener('error', queue);
    image.src = rider;
    queue();

    return () => {
      setPaused.current = undefined;
      control.inert = false;
      cancelAnimationFrame(frame);
      departure?.cancel();
      movement.cancel();
      resize.disconnect();
      footerChanges.disconnect();
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', queue);
      document.removeEventListener('visibilitychange', updateVisibility);
      control.removeEventListener('click', activate);
      control.removeEventListener('animationend', endAttack);
      control.removeEventListener('animationcancel', endAttack);
      if (shotComment) actor.removeEventListener(rocketCaptionHitEvent, onCaptionHit);
      image.removeEventListener('load', queue);
      image.removeEventListener('error', queue);
      motion.removeEventListener('change', queue);
    };
  }, [actorRef, comments, shotComment, interrupt]);

  useEffect(() => setPaused.current?.(paused), [paused]);

  const paintTile = !interruption && !speech?.hidden ? speech?.paintTile : undefined;
  useEffect(() => {
    const bubble = paintSpeech.current?.firstElementChild;
    if (!paintTile || !bubble || paused) return;
    const bounds = bubble.getBoundingClientRect();
    paintTile.dispatchEvent(new CustomEvent<PaintPoint>(mascotPaintEvent, {
      detail: { x: bounds.right - 8, y: bounds.bottom },
    }));
  }, [paintTile, paused]);

  return (
    <div className="mascot-case" ref={route}>
      <canvas className="mascot__movement" ref={canvas} aria-hidden="true" hidden />
      <div className="mascot-case__departure" aria-hidden="true">
        <canvas className="mascot__movement" ref={departureCanvas} hidden />
      </div>
      <span className="mascot__fx mascot__takeoff" ref={lift} aria-hidden="true" style={{ backgroundImage: `url(${takeoff})` }} />
      <span className="mascot" ref={actorRef} hidden>
        <button className="mascot__actor" type="button" aria-label="Рывок маскота">
          <span className="mascot__facing" aria-hidden="true">
            <span className="mascot__sprite" />
            <span className="mascot__fx mascot__impact" style={{ backgroundImage: `url(${impact})` }} />
          </span>
        </button>
        {interruption}
      </span>
      {!interruption && speech && !speech.hidden && <span ref={paintSpeech} data-paint-speech={speech.paintTile ? '' : undefined}>
        <MascotSpeech key={`${speech.message}:${speechReplay}`} message={speech.message} position={speech}
          duration="persistent" bubbleRef={bubbleRef} mascotRef={actorRef} />
      </span>}
      <p className="mascot-speech__transcript" role="status">{interruption ? mascotAttackMessage : !speech?.hidden && speech?.message}</p>
    </div>
  );
}

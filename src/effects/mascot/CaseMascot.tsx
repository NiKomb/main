import { useEffect, useRef, useState, type RefObject } from 'react';
import rider from './rider.png';
import takeoff from './haste.png';
import impact from './heavy-landing.png';
import { rocketCaptionHitEvent, shotCaptionVisible } from '../rocket-shot/scroll-trigger';
import { MascotSpeech } from './MascotSpeech';
import { caseRouteComment, metricCommentRightEdge } from './case-comments';
import { nextCaseSurfaceToRight, rightmostCaseSurface, sameCaseRow, selectCaseSurface, type CaseSurface } from './case-route';
import { playGroundMovement } from './ground-movement';
import { createMascotMovement, footOffset, mascotAttackChance, mascotAttackMessage, minDashDistance, onSurface, readSurface, sectionEdgeInset, shortGapDistance,
  spriteWidth, type Point, type Stop, type Surface } from './mascot-movement';
import { speechPosition, type SpeechPosition } from './speech-position';
import './mascot.css';

const gallerySelector = '.case-covers, .interview-gallery-scroll, .dns-case-frames';
const cardSelector = '.dns-case-fact, .dns-case-summary, .dns-case-block > blockquote';
type RouteSurface = CaseSurface & { surface: Surface };
type Speech = SpeechPosition & { message: string; hidden?: boolean };

function stop(surface: Surface, edge: Stop['edge'], x: number): Stop {
  return { surface, edge, point: { x: onSurface(x, surface), y: surface.y } };
}

export function CaseMascot({ actorRef, comments, shotComment, paused }: {
  actorRef: RefObject<HTMLSpanElement | null>;
  comments: Readonly<Record<string, string>>;
  shotComment: string;
  paused: boolean;
}) {
  const route = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const departureCanvas = useRef<HTMLCanvasElement>(null);
  const lift = useRef<HTMLSpanElement>(null);
  const setPaused = useRef<(paused: boolean) => void>(undefined);
  const [speech, setSpeech] = useState<Speech>();
  const [speechReplay, setSpeechReplay] = useState(0);

  useEffect(() => {
    const layer = route.current;
    const article = layer?.closest('article');
    const actor = actorRef.current;
    const control = actor?.querySelector<HTMLButtonElement>('.mascot__actor');
    if (!layer || !article || !actor || !control) return;

    const image = new Image();
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const movement = createMascotMovement(actor, canvas.current, lift.current, image);
    const tiles = Array.from(article.querySelectorAll<HTMLElement>([
      '.case-covers .case-cover', '.dns-comparison-tile', '.dns-scenario-frames',
      '.case-screenshot:not(.dns-comparison-tile *, .dns-scenario-frames *)', cardSelector,
    ].join(', ')), (tile) => {
      const kind = tile.matches(cardSelector) ? 'card' as const : 'screen' as const;
      const gallery = tile.closest(gallerySelector);
      const clip = gallery?.matches('.case-covers, .interview-gallery-scroll') ? gallery : null;
      const group = gallery ?? tile.closest('.dns-case-stages, .dns-decision-tile') ?? tile;
      return { tile, kind, group, clip };
    });
    let current: Stop | undefined;
    let destination: Stop | undefined;
    let rightStop: Stop | undefined;
    let galleryComment: Element | null = null;
    let metricCheck: Element | null = null;
    let metricGrid: Element | null = null;
    let frame = 0;
    let appeared = false;
    let suspended = false;
    let lastScroll = scrollY;
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

    function finish(next: Stop) {
      destination = undefined;
      current = next;
      settle(next.point);
      queue();
    }

    const hideSpeech = () => {
      setSpeech((previous) => previous && !previous.hidden ? { ...previous, hidden: true } : previous);
    };

    const drawSpeech = (bounds: DOMRect) => {
      const stop = current;
      if (!stop || actor.hidden || movement.phase !== 'idle') {
        hideSpeech();
        return;
      }
      const reaction = gestureTile === stop.surface.tile ? mascotAttackMessage : shotCaption ? shotComment : undefined;
      if (!reaction && rightStop && (stop.surface.tile !== rightStop.surface.tile || stop.point.x !== rightStop.point.x)) {
        hideSpeech();
        return;
      }
      const message = reaction ?? caseRouteComment(stop.surface.tile, comments);
      if (!message) {
        setSpeech(undefined);
        return;
      }
      const { x, y } = stop.point;
      const position = speechPosition({ x: x + spriteWidth / 2, top: y, bottom: y + footOffset }, bounds, innerHeight);
      if (!position) {
        hideSpeech();
        return;
      }
      const metricBlock = metricCheck ?? metricGrid;
      const commentBlock = reaction ? null : metricBlock ?? galleryComment;
      if (commentBlock) {
        position.alignment = 0;
        position.above = true;
        if (bounds.width >= (metricBlock ? 1280 : 960)) {
          const textRight = metricCommentRightEdge(stop.surface.tile, metricGrid, metricCheck) ?? Math.max(commentBlock.getBoundingClientRect().left,
            ...Array.from(commentBlock.querySelectorAll(':scope > h4, :scope > p'), (element) => element.getBoundingClientRect().right));
          position.left = textRight - bounds.left + 12;
          position.maxWidth = Math.min(244, bounds.width - position.left - 12);
          position.above = !metricGrid;
          position.y = metricGrid ? y + footOffset : y - 8;
        } else {
          const firstCard = metricGrid?.firstElementChild;
          if (firstCard && Math.abs(firstCard.getBoundingClientRect().top - (bounds.top + y + footOffset)) >= 1) {
            hideSpeech();
            return;
          }
          const column = metricGrid ?? (metricCheck && stop.surface.tile.closest('.dns-case-block'));
          position.left = column ? column.getBoundingClientRect().left - bounds.left + 12 : 16;
          position.maxWidth = Math.min(244, x - position.left - 8);
          position.y = y + footOffset - 4;
        }
      }
      const next = { ...position, message };
      setSpeech((previous) => previous?.message === next.message && !previous.hidden && previous.y === next.y &&
        previous.above === next.above && previous.alignment === next.alignment && previous.left === next.left &&
        previous.maxWidth === next.maxWidth ? previous : next);
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
      const enabled = !suspended && !document.hidden;
      actor.dataset.visible = String(enabled);
      if (!enabled || motion.matches) departure?.cancel();
      if (!enabled) {
        movement.cancel();
        clearGesture();
        actor.hidden = true;
        visibleActor = undefined;
        hideSpeech();
        current = destination = undefined;
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
      const contents = article.querySelector('.case-nav[data-dns-contents] ul');
      const topLimit = innerWidth < 1200 && contents ? Math.max(48, contents.getBoundingClientRect().bottom) : 48;
      const surfaces: RouteSurface[] = tiles.flatMap(({ tile, kind, group, clip }) => {
        const box = tile.getBoundingClientRect();
        if (!box.height || box.top < 0 || box.top > innerHeight - 48) return [];
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
      const upperSurfaces = surfaces.filter(({ top }) => top >= topLimit);
      const previous = surfaces.find(({ tile }) => tile === current?.surface.tile);
      const selected = selectCaseSurface(upperSurfaces, upperSurfaces.find(({ tile }) => tile === current?.surface.tile),
        innerHeight, direction < 0);
      galleryComment = selected?.group.matches('.interview-gallery-scroll')
        ? selected.group.closest('.dns-case-block[data-mascot-comment]') : null;
      metricCheck = selected?.hasOwnComment ? selected.tile.closest('.dns-decision-check') : null;
      metricGrid = selected?.group.matches('.dns-case-results[data-mascot-comment]') ? selected.group : null;
      const rightmost = selected && (selected.hasOwnComment ? selected : rightmostCaseSurface(selected, upperSurfaces));
      rightStop = rightmost ? stop(rightmost.surface, 'finish', rightmost.surface.right) : undefined;
      if (gestureTile && gestureTile !== rightStop?.surface.tile) clearGesture();

      let interrupted = false;
      let resumeFrom: Point | undefined;
      if (movement.phase !== 'idle' && !actor.hidden) {
        const target = (destination ?? current)?.surface;
        const live = surfaces.find(({ tile }) => tile === target?.tile);
        if (!motion.matches && target && live && selected && live.top >= topLimit && live.top <= innerHeight / 2 &&
          sameCaseRow(live, selected) && (!selected.hasOwnComment || live.tile === selected.tile) &&
          live.surface.left === target.left && live.surface.right === target.right && live.surface.y === target.y) {
          drawSpeech(bounds);
          return;
        }
        if (!motion.matches && movement.phase !== 'blink') {
          const box = actor.getBoundingClientRect();
          if (box.bottom > 0 && box.top < innerHeight) resumeFrom = { x: box.left - bounds.left, y: box.top - bounds.top };
        }
        movement.cancel();
        interrupted = true;
        destination = undefined;
      }

      if (!selected || !rightStop) {
        if (!actor.hidden) {
          playDeparture(bounds);
          movement.cancel();
        }
        actor.hidden = true;
        hideSpeech();
        return;
      }

      const { surface } = selected;
      const runUp = surface.canDash ? surface.dashDistance + 12 : sectionEdgeInset - 12;
      const start = stop(surface, 'start', surface.right - runUp);

      if (motion.matches) {
        current = rightStop;
        settle(rightStop.point);
        appeared = true;
        drawSpeech(bounds);
        return;
      }

      if (resumeFrom && canFollow) {
        const landing = stop(surface, 'landing', current?.surface.tile === surface.tile ? current.point.x : resumeFrom.x);
        destination = landing;
        movement.leap(resumeFrom, landing.point, () => finish(landing), { arcAcrossWideGap: true });
        drawSpeech(bounds);
        return;
      }

      if (current?.surface.tile !== surface.tile || actor.hidden) {
        const landing = previous?.group === selected.group || surface.tile === rightStop.surface.tile
          ? rightStop : stop(surface, 'landing', surface.left);
        const from = previous && current && stop(previous.surface, current.edge, current.point.x);
        const nearby = from && Math.abs(from.point.y - landing.point.y) <= Math.min(400, innerHeight / 2) &&
          Math.max(0, from.surface.left - landing.surface.right, landing.surface.left - from.surface.right) <= shortGapDistance;
        if (!actor.hidden && previous && nearby && canFollow) {
          destination = landing;
          movement.travel(from, landing, selected.top >= previous.top, () => finish(landing), true);
        } else {
          current = start;
          const foot = point && bounds.top + point.y + footOffset;
          if (appeared && !interrupted && !actor.hidden && point && foot !== undefined &&
            foot > 0 && foot < innerHeight) {
            destination = start;
            movement.blink(point, start.point, () => finish(start));
          } else {
            const leftWithBlink = playDeparture(bounds);
            const reveal = leftWithBlink || !appeared || actor.hidden || Math.abs(delta) > innerHeight / 3;
            settle(start.point);
            if (reveal) {
              actor.dataset.direction = 'left';
              movement.appear(start.point, 'left', () => finish(start));
            }
          }
          appeared = true;
          queue();
        }
        drawSpeech(bounds);
        return;
      }

      current = stop(surface, current.edge, current.point.x);
      if (surface.tile !== rightStop.surface.tile || current.point.x !== rightStop.point.x) {
        const nextTile = surface.tile !== rightStop.surface.tile ? nextCaseSurfaceToRight(selected, upperSurfaces) : undefined;
        const arrival = nextTile ? stop(nextTile.surface, 'landing', nextTile.surface.left) : rightStop;
        destination = arrival;
        const arrive = () => finish(arrival);
        if (surface.tile !== arrival.surface.tile) movement.travel(current, arrival, true, arrive, true);
        else movement.moveOnSurface(current.point, arrival.point.x, surface, arrive);
      } else {
        current = rightStop;
        settle(rightStop.point);
      }
      drawSpeech(bounds);
    };

    function queue() {
      if (!frame) frame = requestAnimationFrame(update);
    }

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
    const scrollOptions = { passive: true, capture: true };
    window.addEventListener('scroll', queue, scrollOptions);
    window.addEventListener('resize', queue);
    document.addEventListener('visibilitychange', updateVisibility);
    motion.addEventListener('change', queue);
    control.addEventListener('click', activate);
    control.addEventListener('animationend', endAttack);
    control.addEventListener('animationcancel', endAttack);
    actor.addEventListener(rocketCaptionHitEvent, onCaptionHit);
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
      cancelAnimationFrame(frame);
      departure?.cancel();
      movement.cancel();
      resize.disconnect();
      window.removeEventListener('scroll', queue, true);
      window.removeEventListener('resize', queue);
      document.removeEventListener('visibilitychange', updateVisibility);
      control.removeEventListener('click', activate);
      control.removeEventListener('animationend', endAttack);
      control.removeEventListener('animationcancel', endAttack);
      actor.removeEventListener(rocketCaptionHitEvent, onCaptionHit);
      image.removeEventListener('load', queue);
      image.removeEventListener('error', queue);
      motion.removeEventListener('change', queue);
    };
  }, [actorRef, comments, shotComment]);

  useEffect(() => setPaused.current?.(paused), [paused]);

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
      </span>
      {speech && <span hidden={speech.hidden}>
        <MascotSpeech key={`${speech.message}:${speechReplay}`} message={speech.message} position={speech} duration="persistent" />
      </span>}
      <p className="mascot-speech__transcript" role="status">{!speech?.hidden && speech?.message}</p>
    </div>
  );
}

import { useEffect, useRef, useState, type RefObject } from 'react';
import rider from './rider.png';
import riderDrag from './rider-drag.png';
import riderParachuteLaunch from './rider-parachute-launch.png';
import riderParachute from './rider-parachute.png';
import takeoff from './haste.png';
import impact from './heavy-landing.png';
import { rocketCaptionHitEvent, shotCaptionVisible } from '../rocket-shot/scroll-trigger';
import { mascotPaintEvent, type PaintPoint } from './paint-drop';
import { MascotSpeech } from './MascotSpeech';
import { caseRouteComment } from './case-comments';
import { caseFooterRoute, caseMascotDropZone, caseMascotParking, caseRouteViewportLimits, caseRowFinishButton, caseRowRoute,
  caseSurfacesInJumpRange, nextCaseSurfaceToRight, recordCaseScrollStep, sameCaseRow, selectCaseSurface, trackCaseGalleryScroll,
  type CaseScrollStep, type CaseSurface, type ParkingSide } from './case-route';
import { dampDragReaction, dragPull, type DragSample } from './drag-reaction';
import { playGroundMovement, type BlinkDeparture } from './ground-movement';
import { createMascotMovement, footOffset, mascotAttackChance, mascotAttackMessage, minDashDistance, onSurface, readSurface, sectionEdgeInset, shortGapDistance,
  spriteWidth, type Point, type Stop, type Surface } from './mascot-movement';
import { createParachuteGlide, createParachuteTrack, createParachuteTrigger, noteParachuteScrollInput, parachuteCelSize, parachuteFrame,
  parachuteGlideArea, parachuteSpriteOffset, stepParachuteGlide, visibleParachuteEdge,
  type ParachuteGlide } from './parachute-flight';
import { speechPosition, type SpeechPosition } from './speech-position';
import { useSpeechInterruption } from './use-speech-interruption';
import './mascot.css';

const unlitFact = '[data-mascot-highlight]:not([data-mascot-highlighted])';
const dragThreshold = 5;
const tuckedDragFrame = 4;
const finishGroupSelector = '[data-mascot-finish-group]';
const finishButtonSelector = '[data-mascot-finish-button]';
type RouteSurface = CaseSurface & { surface: Surface };
type Speech = SpeechPosition & { message: string; hidden?: boolean; highlighted?: boolean };
type CaseSurfaceGeometry = Surface & { routeEnd?: true; rowFinishTile?: Element };
type CaseStop = Stop & { surface: CaseSurfaceGeometry };
type Drag = {
  pointerId: number; start: Point; active: boolean;
  sample: DragSample; pull: Point; reaction: Point;
};
type ParachuteFlight = {
  track: ReturnType<typeof createParachuteTrack>;
  elapsed: number;
  lastTime?: number;
  hover?: ParachuteGlide;
  area?: ReturnType<typeof parachuteGlideArea>;
  reachedBottom: boolean;
};

function stop(surface: CaseSurfaceGeometry, edge: Stop['edge'], x: number): CaseStop {
  return { surface, edge, point: { x: onSurface(x, surface), y: surface.y } };
}

function buttonSurface(tile: Element, top: number, x: number, bounds: DOMRect): Surface {
  const left = x - bounds.left;
  return { tile, left, right: left, y: Math.floor(top - bounds.top - footOffset), canDash: false, dashDistance: minDashDistance };
}

function routeButtonEnabled(tile: Element) {
  return !tile.matches(':disabled, [aria-disabled="true"]') &&
    !tile.closest('[inert], [aria-hidden="true"]') && getComputedStyle(tile).visibility === 'visible';
}

function readButtonBounds(tile: Element) {
  const { left, right, top, bottom } = tile.getBoundingClientRect();
  return { tile, left, right, top, bottom };
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
  const { bubbleRef, interrupt, interruption } = useSpeechInterruption();

  useEffect(() => {
    const routeLayer = route.current;
    const article = routeLayer?.closest('article');
    const mascot = actorRef.current;
    const mascotButton = mascot?.querySelector<HTMLButtonElement>('.mascot__actor');
    const parachuteSprite = mascotButton?.querySelector<HTMLElement>('.mascot__parachute');
    if (!routeLayer || !article || !mascot || !mascotButton || !parachuteSprite) return;
    const layer = routeLayer;
    const actor = mascot;
    const control = mascotButton;
    const sprite = control.querySelector<HTMLElement>('.mascot__sprite');
    const chute = parachuteSprite;

    const image = new Image();
    const dragImage = new Image();
    const launchImage = new Image();
    const parachuteImage = new Image();
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const movement = createMascotMovement(actor, canvas.current, lift.current, image);
    const openingGallery = article.querySelector('.case-covers');
    const galleries = new Map(Array.from(article.querySelectorAll('[data-mascot-clip]'), (gallery) => [
      gallery, trackCaseGalleryScroll(gallery),
    ]));
    const footerActions = article.querySelector('[data-mascot-route-end]');
    const caseFooter = article.querySelector('.dns-case-footer');
    const body = article.querySelector('.dns-case-body');
    const textColumn = body?.querySelector(':scope > .case-text');
    const commentBlocks = [...article.querySelectorAll('[data-mascot-comment]')];
    const hitInset = Number.parseFloat(getComputedStyle(control).getPropertyValue('--mascot-hit-inset'));
    const [dragGripX, dragGripY] = getComputedStyle(layer).getPropertyValue('--mascot-drag-grip').trim().split(/\s+/).map(Number.parseFloat);
    const tiles = Array.from(article.querySelectorAll<HTMLElement>(
      '[data-mascot-surface]:not([data-mascot-surface] *, [data-mascot-skip], [data-mascot-skip] *)',
    ), (tile) => {
      const kind = tile.dataset.mascotSurface === 'screen' ? 'screen' as const : 'card' as const;
      const gallery = tile.parentElement?.closest('[data-media-gallery]');
      const clip = gallery?.hasAttribute('data-mascot-clip') ? gallery : null;
      const group = gallery ?? tile.closest('[data-mascot-row]') ?? tile.closest('[data-mascot-group]') ?? tile;
      return { tile, kind, group, clip };
    });
    let current: CaseStop | undefined;
    let destination: CaseStop | undefined;
    let rightwardArrival: CaseStop | undefined;
    let routeFinish: CaseStop | undefined;
    let routeComment: Element | undefined;
    let metricCheck: Element | null = null;
    let metricGrid: Element | null = null;
    let frame = 0;
    let appeared = false;
    let suspended = false;
    let lastScroll = scrollY;
    let galleryBlink: CaseStop | 'pending' | undefined;
    const scrollSteps: CaseScrollStep[] = [];
    let scrollPending = false;
    let teleportingFromJump = false;
    let scrollingUp = false;
    let point: Point | undefined;
    let visibleActor: (Point & { facing: 'left' | 'right' }) | undefined;
    let departure: ReturnType<typeof playGroundMovement>;
    let shotCaption: HTMLElement | undefined;
    let gestureTile: Element | undefined;
    let parking: ParkingSide | undefined;
    let parkStepTimer = 0;
    let drag: Drag | undefined;
    let dragFrame = 0;
    let lastDragFrame = 0;
    let suppressClick = false;
    let finishManualMove: (() => void) | undefined;
    let routeReleaseScroll: number | undefined;
    const parachuteOnClick = createParachuteTrigger();
    let flight: ParachuteFlight | undefined;

    function readSurfaces(bounds: DOMRect, viewportBottom?: number): RouteSurface[] {
      return tiles.flatMap(({ tile, kind, group, clip }) => {
        const box = tile.getBoundingClientRect();
        if (!box.height || (viewportBottom !== undefined && (box.top < 0 || box.top > viewportBottom))) return [];
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
    }

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
      if (motion.matches || actor.hidden || actor.style.opacity === '0' || !origin || !effects) return;
      const top = origin.y + bounds.top;
      if (top + spriteWidth <= 0 || top >= innerHeight) return;
      departure?.cancel();
      departure = playGroundMovement(effects, image, origin, origin.x, () => {}, () => {},
        { kind: 'blink-departure', facing: origin.facing });
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

    function finish(next: CaseStop, movingRight = false) {
      teleportingFromJump = false;
      galleryBlink = undefined;
      destination = undefined;
      current = next;
      rightwardArrival = movingRight ? next : undefined;
      settle(next.point);
      paintMetric(next);
      if (next.point.x === next.surface.right && next.surface.tile.matches(unlitFact)) {
        next.surface.tile.setAttribute('data-mascot-highlighted', '');
      }
      queue();
    }

    const renderedPosition = (bounds: DOMRect) => {
      if (actor.hidden || actor.style.opacity === '0') return;
      const box = actor.getBoundingClientRect();
      if (box.bottom > 0 && box.top < innerHeight) return { x: box.left - bounds.left, y: box.top - bounds.top };
    };

    const readRouteEnd = (bounds: DOMRect) => {
      if (!footerActions || !textColumn || !caseFooter || caseFooter.getBoundingClientRect().bottom > innerHeight + 1) return;
      const buttons = Array.from(footerActions.querySelectorAll('button, a[href]'))
        .filter(routeButtonEnabled)
        .map(readButtonBounds);
      const footer = caseFooterRoute(buttons, innerWidth, innerHeight, textColumn.getBoundingClientRect().right, spriteWidth);
      if (!footer) return;

      const { button } = footer;
      const finishX = footer.rightFinish.x - bounds.left;
      const buttonX = footer.buttonX - bounds.left;
      const floor: CaseSurfaceGeometry = {
        tile: footerActions, routeEnd: true, canDash: true, dashDistance: minDashDistance,
        left: Math.min(buttonX, finishX), right: Math.max(buttonX, finishX), y: Math.floor(footer.rightFinish.y - bounds.top),
      };
      return {
        leftFinish: stop({ ...buttonSurface(button.tile, button.top, footer.buttonX, bounds), routeEnd: true }, 'left-finish', buttonX),
        landing: stop(floor, 'landing', buttonX),
        rightFinish: stop(floor, 'finish', finishX),
      };
    };

    function readRowFinishButton(row: RouteSurface, bounds: DOMRect, top: number) {
      const group = row.group.closest(finishGroupSelector);
      if (!group || row.kind !== 'card' || row.tile === row.group) return;
      const buttons = [...group.querySelectorAll(finishButtonSelector)]
        .filter((tile) => tile.closest(finishGroupSelector) === group && routeButtonEnabled(tile))
        .map(readButtonBounds);
      const edge = { x: bounds.left + row.surface.right, y: row.top };
      const target = caseRowFinishButton(buttons, edge, { width: innerWidth, height: innerHeight, top }, spriteWidth, shortGapDistance);
      if (!target) return;
      const { button, buttonX } = target;
      const surface = { ...buttonSurface(button.tile, button.top, buttonX, bounds), rowFinishTile: row.tile };
      return stop(surface, 'finish', surface.right);
    }

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
      const message = reaction ?? caseRouteComment(routeComment ?? stop.surface.tile, comments);
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
      const highlighted = !reaction && stop.surface.tile.hasAttribute('data-mascot-highlight-speech');
      const next = { ...position, message, highlighted, avoidTiles: metricGrid ?? undefined };
      if (fromScroll) interrupt(message);
      setSpeech((previous) => previous?.message === next.message && !previous.hidden && previous.y === next.y &&
        previous.above === next.above && previous.alignment === next.alignment &&
        previous.highlighted === next.highlighted && previous.avoidTiles === next.avoidTiles ? previous : next);
    };

    const replaySpeech = () => setSpeechReplay((replay) => replay + 1);

    const clearGesture = () => {
      gestureTile = undefined;
      delete actor.dataset.attacking;
    };

    function stopParkStep() {
      window.clearTimeout(parkStepTimer);
      parkStepTimer = 0;
      actor.removeAttribute('data-park-step');
    }

    function scheduleParkStep() {
      if (parkStepTimer || actor.hasAttribute('data-park-step')) return;
      parkStepTimer = window.setTimeout(() => {
        parkStepTimer = 0;
        if (drag || finishManualMove || suspended || document.hidden) return;
        actor.setAttribute('data-park-step', '');
      }, 4000 + Math.random() * 8000);
    }

    const readingColumn = textColumn ?? article;
    const columnBounds = () => {
      const { left, right } = readingColumn.getBoundingClientRect();
      const { top, bottom } = (body ?? article).getBoundingClientRect();
      return { left, right, top: openingGallery?.getBoundingClientRect().top ?? top, bottom };
    };

    const parkingGeometry = (side: ParkingSide) => caseMascotParking(side, columnBounds(), document.documentElement.clientWidth,
      innerHeight, spriteWidth, hitInset, footerActions?.getBoundingClientRect());

    function renderParking(side: ParkingSide) {
      const { point, step } = parkingGeometry(side);
      actor.style.setProperty('--mascot-park-step', `${step}px`);
      control.inert = false;
      movement.settle(point);
      if (step && !motion.matches) scheduleParkStep();
      else stopParkStep();
    }

    function beginManualMove() {
      movement.cancel();
      departure?.cancel();
      stopParkStep();
      clearGesture();
      visibleActor = undefined;
      shotCaption = undefined;
      destination = undefined;
      teleportingFromJump = false;
      galleryBlink = undefined;
      hideSpeech();
      control.inert = false;
      layer.setAttribute('data-manual', '');
    }

    function manualBlink(from: Point, to: Point, finish: () => void, departureFrame?: BlinkDeparture) {
      const arrive = () => {
        finishManualMove = undefined;
        finish();
      };
      finishManualMove = arrive;
      if (motion.matches) arrive();
      else movement.blink(from, to, arrive, departureFrame);
    }

    function park(side: ParkingSide, from: Point, departureFrame?: BlinkDeparture) {
      clearParachute();
      beginManualMove();
      parking = side;
      routeReleaseScroll = undefined;
      control.setAttribute('aria-label', 'Маскот на парковке. Пробел — реплика, Enter — вернуться на маршрут');
      manualBlink(from, parkingGeometry(side).point, () => renderParking(side), departureFrame);
    }

    function scrollRemaining() {
      const page = document.scrollingElement;
      return page ? page.scrollHeight - page.clientHeight - page.scrollTop : 0;
    }

    function parachuteTrack(origin: CaseStop) {
      if (!launchImage.naturalWidth || !parachuteImage.naturalWidth || scrollRemaining() <= 1) return;
      const { clientWidth: width, clientHeight: height } = document.documentElement;
      const { left: x, top: y } = actor.getBoundingClientRect();
      const contentRight = readingColumn.getBoundingClientRect().right;
      if (origin.surface.rowFinishTile) {
        return createParachuteTrack({ x, y }, x + spriteWidth / 2, width, height, contentRight);
      }
      const source = tiles.find(({ tile }) => tile === origin.surface.tile);
      if (!source) return;
      const finish = routeFinish?.surface.tile;
      if (finish && finish !== source.tile && source.group.hasAttribute('data-mascot-row') && source.group.contains(finish)) return;
      const tile = source.tile.getBoundingClientRect();
      const edge = visibleParachuteEdge(tile, source.clip?.getBoundingClientRect(), width, height);
      if (edge === undefined) return;
      if (Math.abs(y + footOffset - tile.top) > 2) return;
      return createParachuteTrack({ x, y }, edge, width, height, contentRight);
    }

    function launchParachute(track: ParachuteFlight['track']) {
      beginManualMove();
      current = undefined;
      routeReleaseScroll = undefined;
      flight = { track, elapsed: 0, reachedBottom: false };
      actor.dataset.direction = 'right';
      control.setAttribute('aria-label', 'Маскот на парашюте. Стрелки влево и вправо — парковка');
      movement.settle(track.start);
      queue();
    }

    function clearParachute() {
      if (!flight) return;
      flight = undefined;
      delete actor.dataset.parachute;
      chute.style.removeProperty('background-position');
      chute.style.removeProperty('--mascot-parachute-tilt');
      control.setAttribute('aria-label', 'Рывок маскота');
    }

    function parachuteDeparture(): BlinkDeparture | undefined {
      if (motion.matches) return;
      const scale = 2;
      const size = parachuteCelSize / scale;
      const inset = -parachuteSpriteOffset.y / scale + 8;
      const column = Math.round(-Number.parseFloat(getComputedStyle(chute).backgroundPositionX) / parachuteCelSize);
      const frame = document.createElement('canvas');
      frame.width = frame.height = spriteWidth / scale + inset * 2;
      const ctx = frame.getContext('2d');
      if (!ctx) return;
      const tilt = Number.parseFloat(chute.style.getPropertyValue('--mascot-parachute-tilt')) || 0;
      ctx.translate(inset + parachuteSpriteOffset.x / scale + size / 2, inset + parachuteSpriteOffset.y / scale + size / 2);
      ctx.rotate(tilt * Math.PI / 180);
      ctx.drawImage(parachuteImage, column * size, 0, size, size, -size / 2, -size / 2, size, size);
      return { sprite: frame, inset, pixels: new Uint32Array(ctx.getImageData(0, 0, frame.width, frame.height).data.buffer) };
    }

    function renderParachute(active: ParachuteFlight, delta: number) {
      const now = performance.now();
      const elapsed = Math.min(50, now - (active.lastTime ?? now));
      active.lastTime = now;
      if (!active.hover && !motion.matches) {
        active.elapsed += elapsed;
        const cel = parachuteFrame(active.track, active.elapsed);
        if (cel) {
          actor.hidden = false;
          actor.dataset.parachute = 'launch';
          chute.style.backgroundPosition = `${-cel.column * parachuteCelSize}px ${-cel.row * parachuteCelSize}px`;
          movement.place({ x: Math.round(cel.x), y: Math.round(cel.y) });
          queue();
          return;
        }
      }

      if (!active.area) {
        const { clientWidth: width, clientHeight: height } = document.documentElement;
        active.area = parachuteGlideArea(active.track.hover.y, readingColumn.getBoundingClientRect().right, width, height);
      }
      active.hover ??= createParachuteGlide();
      if (actor.hidden) actor.hidden = false;
      if (actor.dataset.parachute !== 'hover') {
        actor.dataset.parachute = 'hover';
        chute.style.removeProperty('background-position');
      }
      const reachedBottom = active.reachedBottom && scrollRemaining() <= 1;
      const glide = motion.matches ? undefined : stepParachuteGlide(active.hover, active.area, reachedBottom ? 0 : delta, elapsed);
      const position = glide ?? active.area.center;
      chute.style.setProperty('--mascot-parachute-tilt', `${glide?.tilt.toFixed(2) ?? 0}deg`);
      movement.place(position);
      if (reachedBottom) {
        park('right', position, parachuteDeparture());
      } else if (!motion.matches) {
        queue();
      }
    }

    function nearestRouteStop(pointer: Point) {
      let closest: CaseStop | undefined;
      let distance = Infinity;
      const bounds = layer.getBoundingClientRect();
      const localX = pointer.x - bounds.left - spriteWidth / 2;
      for (const { surface } of readSurfaces(bounds)) {
        const candidate = stop(surface, 'landing', localX);
        const gap = Math.hypot(candidate.point.x - localX, bounds.top + candidate.point.y + footOffset - pointer.y);
        if (gap >= distance) continue;
        closest = candidate;
        distance = gap;
      }
      return closest;
    }

    function attachToRoute(target: CaseStop, from: Point, departureFrame?: BlinkDeparture) {
      const bounds = layer.getBoundingClientRect();
      const releaseScroll = scrollY;
      parking = undefined;
      control.setAttribute('aria-label', 'Рывок маскота');
      manualBlink(from, target.point, () => {
        movement.cancel();
        layer.removeAttribute('data-manual');
        const routeBounds = layer.getBoundingClientRect();
        const surface = readSurfaces(routeBounds).find(({ tile }) => tile === target.surface.tile)?.surface;
        current = surface && stop(surface, 'landing', target.point.x + bounds.left - routeBounds.left);
        visibleActor = undefined;
        if (current) {
          settle(current.point);
          const top = routeBounds.top + current.point.y;
          actor.hidden = top >= innerHeight || top + spriteWidth <= 0;
        } else actor.hidden = true;
        lastScroll = releaseScroll;
        scrollPending = scrollY !== releaseScroll;
        routeReleaseScroll = current && !scrollPending ? releaseScroll : undefined;
        if (routeReleaseScroll === undefined) queue();
      }, departureFrame);
    }

    function restoreAfterDrag(from: Point, departureFrame?: BlinkDeparture) {
      if (parking) {
        park(parking, from, departureFrame);
        return;
      }
      layer.removeAttribute('data-manual');
      if (current) settle(current.point);
      else actor.hidden = true;
      queue();
    }

    function clearDragReaction() {
      cancelAnimationFrame(dragFrame);
      dragFrame = 0;
      actor.style.removeProperty('--mascot-drag-tilt');
      actor.style.removeProperty('--mascot-drag-stretch');
      if (drag) drag.reaction = { x: 0, y: 0 };
    }

    function drawDragReaction(now: number) {
      dragFrame = 0;
      if (!drag?.active || motion.matches) return;
      const reaction = dampDragReaction(drag.reaction, drag.pull, now - drag.sample.time, now - lastDragFrame);
      if (!reaction) {
        clearDragReaction();
        return;
      }
      const { x, y } = drag.reaction = reaction;
      lastDragFrame = now;
      actor.style.setProperty('--mascot-drag-tilt', `${(-20 * x).toFixed(2)}deg`);
      actor.style.setProperty('--mascot-drag-stretch', (1 + .16 * y).toFixed(3));
      dragFrame = requestAnimationFrame(drawDragReaction);
    }

    function releaseDrag() {
      const released = drag;
      if (!released) return;
      drag = undefined;
      layer.removeAttribute('data-dragging');
      clearDragReaction();
      if (control.hasPointerCapture(released.pointerId)) control.releasePointerCapture(released.pointerId);
      return released;
    }

    const dragPosition = (x: number, y: number) => ({
      x: x - (actor.dataset.direction === 'left' ? spriteWidth - dragGripX : dragGripX),
      y: y - dragGripY,
    });

    const startDrag = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0 || drag || finishManualMove || actor.hidden ||
        movement.phase !== 'idle' || (flight && !flight.hover)) return;
      const start = { x: event.clientX, y: event.clientY };
      suppressClick = false;
      drag = {
        pointerId: event.pointerId, start, active: false,
        sample: { ...start, time: performance.now() }, pull: { x: 0, y: 0 }, reaction: { x: 0, y: 0 },
      };
      control.setPointerCapture(event.pointerId);
    };

    const moveDrag = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const sample = { x: event.clientX, y: event.clientY, time: performance.now() };
      const previous = drag.sample;
      drag.sample = sample;
      if (!drag.active) {
        if (Math.hypot(sample.x - drag.start.x, sample.y - drag.start.y) < dragThreshold) return;
        drag.active = true;
        suppressClick = true;
        clearParachute();
        beginManualMove();
        layer.setAttribute('data-dragging', '');
      }
      movement.settle(dragPosition(sample.x, sample.y));
      if (motion.matches) return;
      drag.pull = dragPull(previous, sample);
      if (!dragFrame) {
        lastDragFrame = sample.time - 16;
        dragFrame = requestAnimationFrame(drawDragReaction);
      }
    };

    function dragDeparture(): BlinkDeparture | undefined {
      if (motion.matches || !sprite || !layer.hasAttribute('data-drag-sprite-ready')) return;
      const scale = 2;
      const size = spriteWidth / scale;
      const inset = 10;
      const frame = document.createElement('canvas');
      frame.width = frame.height = size + inset * 2;
      const ctx = frame.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.translate(inset, inset);
      if (actor.dataset.direction === 'left') {
        ctx.translate(size, 0);
        ctx.scale(-1, 1);
      }
      const transform = getComputedStyle(sprite).transform;
      if (transform !== 'none') {
        const matrix = new DOMMatrixReadOnly(transform);
        const x = dragGripX / scale;
        const y = dragGripY / scale;
        ctx.translate(x, y);
        ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e / scale, matrix.f / scale);
        ctx.translate(-x, -y);
      }
      ctx.drawImage(dragImage, tuckedDragFrame * size, 0, size, size, 0, 0, size, size);
      return { sprite: frame, inset, pixels: new Uint32Array(ctx.getImageData(0, 0, frame.width, frame.height).data.buffer) };
    }

    const drop = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const departureFrame = drag.active ? dragDeparture() : undefined;
      const released = releaseDrag();
      if (!released?.active) {
        queue();
        return;
      }
      const { clientX: x, clientY: y } = event;
      const from = dragPosition(x, y);
      const zone = caseMascotDropZone(x, y, columnBounds());
      if (zone === 'left' || zone === 'right') park(zone, from, departureFrame);
      else {
        const target = zone === 'route' ? nearestRouteStop({ x, y }) : undefined;
        if (target) attachToRoute(target, from, departureFrame);
        else restoreAfterDrag(from, departureFrame);
      }
    };

    function cancelDrag(event?: PointerEvent) {
      if (!drag || (event && event.pointerId !== drag.pointerId)) return;
      const box = actor.getBoundingClientRect();
      suppressClick = true;
      if (releaseDrag()?.active) restoreAfterDrag({ x: box.left, y: box.top });
      else queue();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && drag) {
        event.preventDefault();
        event.stopPropagation();
        cancelDrag();
        return;
      }
      if (event.target !== control || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        drag || finishManualMove || actor.hidden || movement.phase !== 'idle' || (flight && !flight.hover)) return;
      const box = actor.getBoundingClientRect();
      const from = { x: box.left, y: box.top };
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        park(event.key === 'ArrowLeft' ? 'left' : 'right', from, flight && parachuteDeparture());
      } else if (event.key === 'Enter' && parking) {
        event.preventDefault();
        const column = columnBounds();
        const target = nearestRouteStop({ x: (column.left + column.right) / 2, y: innerHeight / 2 });
        if (target) {
          beginManualMove();
          attachToRoute(target, from);
        }
      }
    }

    function parkingComment() {
      let message = mascotAttackMessage;
      let distance = Infinity;
      for (const block of commentBlocks) {
        const { top, bottom, left, right } = block.getBoundingClientRect();
        const visibleTop = Math.max(0, top);
        const visibleBottom = Math.min(innerHeight, bottom);
        if (visibleBottom <= visibleTop || right <= 0 || left >= innerWidth) continue;
        const gap = Math.abs((visibleTop + visibleBottom) / 2 - innerHeight / 2);
        if (gap >= distance) continue;
        const comment = caseRouteComment(block, comments);
        if (!comment) continue;
        message = comment;
        distance = gap;
      }
      return message;
    }

    function reactInParking(side: ParkingSide) {
      stopParkStep();
      hideSpeech();
      const { point } = parkingGeometry(side);
      const arrive = () => {
        finishManualMove = undefined;
        renderParking(side);
        const bounds = layer.getBoundingClientRect();
        const box = actor.getBoundingClientRect();
        const position = speechPosition({ x: box.left + spriteWidth / 2, top: box.top, bottom: box.top + footOffset }, bounds, innerHeight);
        if (position) {
          replaySpeech();
          setSpeech({ ...position, message: parkingComment() });
        }
      };
      const surface = { tile: layer, left: 0, right: document.documentElement.clientWidth - spriteWidth,
        y: point.y, canDash: true, dashDistance: 48 };
      finishManualMove = arrive;
      if (motion.matches || !movement.dashAndReturn(point, surface, undefined, arrive)) arrive();
    }

    const activate = (event: MouseEvent) => {
      if (event.detail && suppressClick) {
        suppressClick = false;
        return;
      }
      if (drag || flight || finishManualMove || actor.hidden || actor.dataset.visible !== 'true' || movement.phase !== 'idle') return;
      if (parking) {
        reactInParking(parking);
        return;
      }
      const origin = current;
      if (!origin || origin.surface.routeEnd) return;
      const track = parachuteOnClick(() => parachuteTrack(origin));
      if (track) {
        launchParachute(track);
        return;
      }
      if (actor.hasAttribute('data-attacking')) return;
      const { point, surface } = origin;
      const pointerX = event.detail && point.x > surface.left && point.x < surface.right ? event.clientX : undefined;
      clearGesture();
      if (Math.random() < mascotAttackChance) {
        gestureTile = surface.tile;
        if (!motion.matches) actor.dataset.attacking = '';
      } else if (!motion.matches && movement.dashAndReturn(point, surface, pointerX, () => {
        replaySpeech();
        finish(origin);
      }, { allowStationary: !!surface.rowFinishTile })) {
        hideSpeech();
        return;
      }
      replaySpeech();
      drawSpeech(layer.getBoundingClientRect());
    };

    const endAnimation = (event: AnimationEvent) => {
      if (event.animationName === 'mascot-attack') delete actor.dataset.attacking;
      if (event.animationName === 'mascot-park-step' && actor.hasAttribute('data-park-step')) {
        stopParkStep();
        queue();
      }
    };

    const onCaptionHit = (event: Event) => {
      if (layer.hasAttribute('data-manual') || !(event instanceof CustomEvent) || !(event.detail instanceof HTMLElement)) return;
      shotCaption = event.detail;
      queue();
    };

    const update = (now = performance.now()) => {
      frame = 0;
      const fromScroll = scrollPending;
      scrollPending = false;
      const enabled = !suspended && !document.hidden;
      if (actor.dataset.visible !== String(enabled)) actor.dataset.visible = String(enabled);
      if (!enabled || motion.matches) departure?.cancel();
      if (!enabled) {
        scrollSteps.length = 0;
        for (const scroll of galleries.values()) scroll.reset();
        releaseDrag();
        if (flight) {
          flight.lastTime = undefined;
          if (flight.hover) {
            flight.hover.input = undefined;
            flight.hover.burst = undefined;
          }
          actor.hidden = true;
          lastScroll = scrollY;
          return;
        }
        stopParkStep();
        finishManualMove = undefined;
        routeReleaseScroll = undefined;
        layer.toggleAttribute('data-manual', parking !== undefined);
        movement.cancel();
        clearGesture();
        actor.hidden = true;
        visibleActor = undefined;
        teleportingFromJump = false;
        galleryBlink = undefined;
        hideSpeech();
        current = destination = undefined;
        control.inert = false;
        lastScroll = scrollY;
        scrollingUp = false;
        return;
      }
      const delta = scrollY - lastScroll;
      if (delta !== 0) scrollingUp = delta < 0;
      lastScroll = scrollY;
      if (flight && delta !== 0) flight.reachedBottom = scrollRemaining() <= 1;
      if (drag) return;
      if (flight) {
        renderParachute(flight, delta);
        return;
      }
      if (finishManualMove) {
        if (motion.matches) {
          movement.cancel();
          finishManualMove();
        }
        return;
      }
      if (parking) {
        renderParking(parking);
        if (fromScroll) hideSpeech();
        return;
      }
      if (routeReleaseScroll === scrollY && !fromScroll) return;
      routeReleaseScroll = undefined;
      if (!motion.matches && !image.complete) return;
      const bounds = layer.getBoundingClientRect();
      if (shotCaption && !shotCaptionVisible(shotCaption.getBoundingClientRect(), innerHeight)) shotCaption = undefined;
      const departing = departureCanvas.current;
      if (departing && !departing.hidden) {
        const box = departing.getBoundingClientRect();
        if (box.bottom <= 0 || box.top >= innerHeight) departure?.cancel();
      }

      rememberActor(bounds);
      const fastScroll = recordCaseScrollStep(scrollSteps, delta, now, innerHeight);
      if (teleportingFromJump && !motion.matches && current) {
        const top = bounds.top + current.point.y;
        if (top + spriteWidth > 0 && top < innerHeight) return;
      }
      teleportingFromJump = false;

      const contents = innerWidth < 1200 ? article.querySelector('.case-nav[data-dns-contents] ul') : null;
      const contentsBottom = contents?.getBoundingClientRect().bottom ?? 0;
      const limits = caseRouteViewportLimits(innerHeight, contentsBottom);
      const target = (destination ?? current)?.surface;
      const onFooterButton = target?.routeEnd && target.tile !== footerActions;
      const footerButtonIsSafe = onFooterButton && target.tile.getBoundingClientRect().top < innerHeight * .95;
      const footerRoute = scrollingUp && !footerButtonIsSafe ? undefined : readRouteEnd(bounds);
      const factBeforeFooter = footerRoute && tiles.some(({ tile }) => {
        if (!tile.matches(unlitFact)) return false;
        const box = tile.getBoundingClientRect();
        return box.width >= spriteWidth && box.top >= limits.top && box.top <= limits.bottom;
      });
      const routeEnd = factBeforeFooter ? undefined : footerRoute;
      control.inert = !!routeEnd && (current?.surface.tile !== footerActions || movement.phase !== 'idle');
      const surfaces = routeEnd ? [] : readSurfaces(bounds, innerHeight).filter(({ top }) => top >= contentsBottom);
      const previous = surfaces.find(({ tile }) => tile === current?.surface.tile);
      const retained = surfaces.find(({ tile }) => tile === (target?.rowFinishTile ?? target?.tile)) ?? previous;
      const opening = scrollY <= 0 ? surfaces.find(({ tile }) => openingGallery?.contains(tile)) : undefined;
      const selected = opening ?? selectCaseSurface(surfaces, limits, retained);
      const row = selected && caseRowRoute(selected, surfaces, previous);
      metricCheck = selected?.hasOwnComment ? selected.tile.closest('.dns-decision-check') : null;
      metricGrid = selected?.group.matches('.dns-case-results[data-mascot-comment]') ? selected.group : null;
      const routeStart = row?.current ?? (selected && (surfaces.find((candidate) =>
        sameCaseRow(candidate, selected) && candidate.tile.matches(unlitFact) &&
        (!selected.hasOwnComment || candidate.left < selected.left)) ?? selected));
      routeComment = row?.comment;
      const rowFinish = row && stop(row.finish.surface, 'finish', row.finish.surface.right);
      routeFinish = routeEnd?.rightFinish ?? rowFinish;

      const gallery = selected?.group;
      const galleryScroll = gallery && galleries.get(gallery)?.read(now);
      if (!motion.matches && rowFinish && galleryScroll &&
        (gallery.contains(current?.surface.tile ?? null) || gallery.contains(target?.tile ?? null))) {
        const blinkTarget = galleryBlink !== 'pending' && destination === galleryBlink ? galleryBlink : undefined;
        const dragged = galleryScroll.changed && galleryScroll.dragging;
        if (!dragged && blinkTarget?.surface.tile === rowFinish.surface.tile && blinkTarget.point.x === rowFinish.point.x &&
          blinkTarget.point.y === rowFinish.point.y) return;

        const lostSupport = !previous || !surfaces.some(({ tile }) => tile === target?.tile);
        if (galleryBlink !== 'pending' && (blinkTarget || dragged || galleryScroll.fast || (galleryScroll.changed && lostSupport))) {
          const origin = renderedPosition(bounds);
          departure?.cancel();
          movement.cancel();
          if (origin) settle(origin);
          else {
            actor.hidden = true;
            visibleActor = undefined;
          }
          destination = undefined;
          galleryBlink = 'pending';
        }
        if (galleryBlink === 'pending') {
          hideSpeech(fromScroll);
          if (!galleryScroll.settled) {
            if (!galleryScroll.dragging) queue();
            return;
          }
          const origin = renderedPosition(bounds);
          destination = galleryBlink = rowFinish;
          if (origin) movement.blink(origin, rowFinish.point, () => finish(rowFinish));
          else {
            settle(rowFinish.point);
            movement.appear(rowFinish.point, actor.dataset.direction === 'left' ? 'left' : 'right', () => finish(rowFinish));
          }
          return;
        }
      }
      galleryBlink = undefined;

      const buttonFinish = row && !row.stopAtComment && !motion.matches ? readRowFinishButton(row.finish, bounds, contentsBottom) : undefined;
      const buttonTakeoff = !fastScroll && rowFinish && current && current === rightwardArrival && current.surface.tile === rowFinish.surface.tile &&
        current.point.x === rowFinish.point.x && current.point.y === rowFinish.point.y ? current : undefined;
      rightwardArrival = undefined;
      const onButton = buttonFinish && !actor.hidden && target?.tile === buttonFinish.surface.tile &&
        target.rowFinishTile === buttonFinish.surface.rowFinishTile && (movement.phase === 'idle' ||
          (!fastScroll && target.left === buttonFinish.point.x && target.y === buttonFinish.point.y));
      if (buttonFinish && (onButton || buttonTakeoff)) {
        routeFinish = buttonFinish;
        routeComment ??= rowFinish?.surface.tile;
        if (buttonTakeoff) {
          destination = buttonFinish;
          movement.leap(buttonTakeoff.point, buttonFinish.point, () => finish(buttonFinish));
        } else if (movement.phase === 'idle') {
          current = buttonFinish;
          settle(buttonFinish.point);
        }
        drawSpeech(bounds, fromScroll);
        return;
      }
      if (gestureTile && gestureTile !== routeFinish?.surface.tile) clearGesture();

      const crossingRouteEnd = !!target?.routeEnd !== !!routeEnd;
      const jumpInterruptedByScroll = fastScroll && !actor.hidden && movement.phase === 'jump';
      const blinkFrom = crossingRouteEnd || fastScroll ? renderedPosition(bounds) : undefined;
      let interrupted = false;
      let resumeFrom: Point | undefined;
      if (movement.phase !== 'idle' && !actor.hidden) {
        const live = routeEnd
          ? [routeEnd.rightFinish.surface, routeEnd.leftFinish.surface].find(({ tile }) => tile === target?.tile)
          : selected && surfaces.find((candidate) => candidate.tile === target?.tile && sameCaseRow(candidate, selected) &&
            (!row?.stopAtComment || candidate === selected || candidate === routeStart))?.surface;
        if (!jumpInterruptedByScroll && !motion.matches && target && live &&
          live.left === target.left && live.right === target.right && live.y === target.y) {
          drawSpeech(bounds, fromScroll);
          return;
        }
        if (!fastScroll && !motion.matches && !crossingRouteEnd && !routeEnd && movement.phase !== 'blink') {
          resumeFrom = renderedPosition(bounds);
        }
        movement.cancel();
        interrupted = true;
        destination = undefined;
      }

      const surface = routeEnd
        ? current?.surface.tile === routeEnd.rightFinish.surface.tile ? routeEnd.rightFinish.surface : routeEnd.leftFinish.surface
        : routeStart?.surface;
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
      const needsFactRun = surface.tile.matches(unlitFact);
      const entry = jumpInterruptedByScroll && !needsFactRun && !buttonFinish
        ? routeFinish : routeEnd?.leftFinish ?? stop(surface, 'start', surface.right - runUp);

      if (motion.matches) {
        current = routeFinish;
        settle(routeFinish.point);
        if (selected) {
          for (const candidate of surfaces) {
            if (sameCaseRow(candidate, selected) && (!row?.stopAtComment || candidate === selected || candidate === routeStart) &&
              candidate.tile.matches(unlitFact)) candidate.tile.setAttribute('data-mascot-highlighted', '');
          }
        }
        appeared = true;
        drawSpeech(bounds, fromScroll);
        return;
      }

      if (resumeFrom && caseSurfacesInJumpRange({ left: resumeFrom.x, right: resumeFrom.x, y: resumeFrom.y }, surface, innerHeight)) {
        const landing = stop(surface, 'landing', current?.surface.tile === surface.tile ? current.point.x : resumeFrom.x);
        destination = landing;
        movement.leap(resumeFrom, landing.point, () => finish(landing), { arcAcrossWideGap: true });
        drawSpeech(bounds, fromScroll);
        return;
      }

      if (jumpInterruptedByScroll || crossingRouteEnd || ((routeEnd || fastScroll) && interrupted) || current?.surface.tile !== surface.tile || actor.hidden) {
        const runToButton = buttonFinish && surface.tile === buttonFinish.surface.rowFinishTile;
        const landing = runToButton ? stop(surface, 'start', surface.right - runUp)
          : !needsFactRun && (previous?.group === selected?.group || surface.tile === routeFinish.surface.tile)
          ? routeFinish : stop(surface, 'landing', surface.left);
        const from = previous && current && stop(previous.surface, current.edge, current.point.x);
        const nearby = from && caseSurfacesInJumpRange(from.surface, landing.surface, innerHeight);
        if (!fastScroll && !crossingRouteEnd && !actor.hidden && selected && previous && nearby) {
          destination = landing;
          movement.travel(from, landing, selected.top >= previous.top, () => finish(landing), true);
        } else {
          current = entry;
          teleportingFromJump = jumpInterruptedByScroll;
          const foot = point && bounds.top + point.y + footOffset;
          const origin = blinkFrom ?? (appeared && !interrupted && !actor.hidden &&
            foot !== undefined && foot > 0 && foot < innerHeight ? point : undefined);
          if (origin) {
            destination = entry;
            movement.blink(origin, entry.point, () => finish(entry));
          } else {
            playDeparture(bounds);
            settle(entry.point);
            actor.dataset.direction = 'left';
            movement.appear(entry.point, 'left', () => finish(entry));
          }
          appeared = true;
          queue();
        }
        drawSpeech(bounds, fromScroll);
        return;
      }

      current = stop(surface, current.edge, current.point.x);
      const from = current;
      if (surface.tile !== routeFinish.surface.tile || current.point.x !== routeFinish.point.x) {
        const nextTile = routeStart && surface.tile !== routeFinish.surface.tile ? nextCaseSurfaceToRight(routeStart, surfaces) : undefined;
        const finishFact = current.point.x < surface.right && needsFactRun;
        const arrival = routeEnd?.leftFinish.surface.tile === surface.tile
          ? routeEnd.landing : finishFact ? stop(surface, 'finish', surface.right)
            : nextTile ? stop(nextTile.surface, 'landing', nextTile.surface.left) : routeFinish;
        destination = arrival;
        const arrive = () => finish(arrival, arrival.point.x > from.point.x);
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

    const onWheel = (event: WheelEvent) => {
      const hover = flight?.hover;
      if (!hover || motion.matches || event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const isStep = event.deltaMode !== 0 || Math.abs(event.deltaY) >= 100;
      noteParachuteScrollInput(hover, isStep ? 'wheel-step' : 'pixel-wheel');
    };

    const onTouchMove = (event: TouchEvent) => {
      if (flight?.hover && !drag && !motion.matches && event.touches.length === 1) {
        noteParachuteScrollInput(flight.hover, 'touch');
      }
    };

    function updateVisibility() {
      if (!document.hidden) {
        queue();
        return;
      }
      cancelAnimationFrame(frame);
      update();
    }

    const onResize = () => {
      if (flight) flight.area = undefined;
      queue();
    };
    const resize = new ResizeObserver(onResize);
    resize.observe(article);
    if (textColumn) resize.observe(textColumn);
    for (const button of article.querySelectorAll(finishButtonSelector)) resize.observe(button);
    const routeChanges = new MutationObserver(queue);
    for (const gallery of galleries.keys()) routeChanges.observe(gallery, { attributeFilter: ['data-dragging'] });
    if (footerActions) {
      resize.observe(footerActions);
      routeChanges.observe(footerActions, {
        subtree: true, childList: true, attributes: true,
        attributeFilter: ['class', 'style', 'hidden', 'disabled', 'href', 'aria-disabled', 'aria-hidden', 'inert'],
      });
    }
    const passiveCapture = { passive: true, capture: true };
    window.addEventListener('scroll', onScroll, passiveCapture);
    window.addEventListener('wheel', onWheel, passiveCapture);
    window.addEventListener('touchmove', onTouchMove, passiveCapture);
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', updateVisibility);
    const onMotionChange = () => {
      if (motion.matches) clearDragReaction();
      if (flight?.hover) {
        flight.hover = createParachuteGlide();
        flight.lastTime = undefined;
      }
      queue();
    };
    motion.addEventListener('change', onMotionChange);
    window.addEventListener('keydown', onKeyDown, true);
    control.addEventListener('click', activate);
    control.addEventListener('pointerdown', startDrag);
    control.addEventListener('pointermove', moveDrag);
    control.addEventListener('pointerup', drop);
    control.addEventListener('pointercancel', cancelDrag);
    control.addEventListener('lostpointercapture', cancelDrag);
    control.addEventListener('animationend', endAnimation);
    control.addEventListener('animationcancel', endAnimation);
    if (shotComment) actor.addEventListener(rocketCaptionHitEvent, onCaptionHit);
    setPaused.current = (value) => {
      suspended = value;
      queue();
    };
    image.addEventListener('load', queue);
    image.addEventListener('error', queue);
    image.src = rider;
    launchImage.src = riderParachuteLaunch;
    parachuteImage.src = riderParachute;
    const showDragFrames = () => {
      layer.style.setProperty('--mascot-drag-image', `url("${riderDrag}")`);
      layer.setAttribute('data-drag-sprite-ready', '');
    };
    dragImage.addEventListener('load', showDragFrames);
    dragImage.src = riderDrag;
    queue();

    return () => {
      setPaused.current = undefined;
      control.inert = false;
      releaseDrag();
      clearParachute();
      stopParkStep();
      actor.style.removeProperty('--mascot-park-step');
      cancelAnimationFrame(frame);
      departure?.cancel();
      movement.cancel();
      resize.disconnect();
      routeChanges.disconnect();
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('wheel', onWheel, true);
      window.removeEventListener('touchmove', onTouchMove, true);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('visibilitychange', updateVisibility);
      control.removeEventListener('click', activate);
      control.removeEventListener('pointerdown', startDrag);
      control.removeEventListener('pointermove', moveDrag);
      control.removeEventListener('pointerup', drop);
      control.removeEventListener('pointercancel', cancelDrag);
      control.removeEventListener('lostpointercapture', cancelDrag);
      control.removeEventListener('animationend', endAnimation);
      control.removeEventListener('animationcancel', endAnimation);
      layer.removeAttribute('data-manual');
      control.setAttribute('aria-label', 'Рывок маскота');
      if (shotComment) actor.removeEventListener(rocketCaptionHitEvent, onCaptionHit);
      image.removeEventListener('load', queue);
      image.removeEventListener('error', queue);
      dragImage.removeEventListener('load', showDragFrames);
      layer.removeAttribute('data-drag-sprite-ready');
      layer.style.removeProperty('--mascot-drag-image');
      motion.removeEventListener('change', onMotionChange);
    };
  }, [actorRef, comments, shotComment, interrupt]);

  useEffect(() => setPaused.current?.(paused), [paused]);

  return (
    <div className="mascot-case" ref={route}>
      <canvas className="mascot__movement" ref={canvas} aria-hidden="true" hidden />
      <div className="mascot-case__departure" aria-hidden="true">
        <canvas className="mascot__movement" ref={departureCanvas} hidden />
      </div>
      <span className="mascot__fx mascot__takeoff" ref={lift} aria-hidden="true" style={{ backgroundImage: `url(${takeoff})` }} />
      <span className="mascot" ref={actorRef} hidden>
        <button className="mascot__actor" type="button" aria-label="Рывок маскота" aria-keyshortcuts="ArrowLeft ArrowRight">
          <span className="mascot__facing" aria-hidden="true">
            <span className="mascot__sprite" />
            <span className="mascot__parachute" />
            <span className="mascot__fx mascot__impact" style={{ backgroundImage: `url(${impact})` }} />
          </span>
        </button>
        {interruption}
      </span>
      {!interruption && speech && !speech.hidden && <span data-highlighted-speech={speech.highlighted ? '' : undefined}>
        <MascotSpeech key={`${speech.message}:${speechReplay}`} message={speech.message} position={speech}
          duration="persistent" bubbleRef={bubbleRef} mascotRef={actorRef} />
      </span>}
      <p className="mascot-speech__transcript" role="status">{interruption ? mascotAttackMessage : !speech?.hidden && speech?.message}</p>
    </div>
  );
}

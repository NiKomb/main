import { useEffect, useRef, type RefObject } from 'react';
import { pixelSize, swapDepth, viewportExitCell, viewportSwapClip, type ViewportEdge } from '../case-pixels/pixel-swap';
import { clearParticles, createParticle, drawParticles, particleSeed, releasedScrollCell, type Particle } from '../case-pixels/particles';
import './viewport-edges.css';

type Props = {
  root: RefObject<HTMLElement | null>;
  targetSelector: string;
};

const stripHeight = swapDepth + pixelSize;
const tileSelector = '.case-cover, .tile-copy, .tile-preview, .dns-case-flow > li, .dns-case-hypothesis, .dns-case-stages > li';

type Source = { element: Element; text?: Node };
type Candidate = { x: number; y: number; probeY: number; seed: number };
type Trail = { context: CanvasRenderingContext2D; particles: Particle[]; exitCells: number[] };

function nearEdge(rect: DOMRect, edge: ViewportEdge, height: number, depth: number) {
  return edge === 'top'
    ? rect.top < depth && rect.bottom > 0
    : rect.bottom > height - depth && rect.top < height;
}

function paintSources(target: HTMLElement): Source[] {
  const sources: Source[] = [];
  const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
  for (let text = walker.nextNode(); text; text = walker.nextNode()) {
    if (text.parentElement && text.textContent?.trim()) sources.push({ element: text.parentElement, text });
  }
  for (const element of target.querySelectorAll(tileSelector)) {
    sources.push({ element });
  }
  return sources;
}

function paintFragments(sources: Source[], range: Range, edge: ViewportEdge, height: number) {
  const fragments: { rect: DOMRect; color: string }[] = [];
  for (const { element, text } of sources) {
    const rect = element.getBoundingClientRect();
    if (!rect.width || !nearEdge(rect, edge, height, stripHeight)) continue;
    const style = getComputedStyle(element);
    const color = text ? style.color : style.backgroundColor;
    if (style.visibility !== 'visible' || color === 'rgba(0, 0, 0, 0)') continue;
    if (text) {
      range.selectNodeContents(text);
      for (const rect of range.getClientRects()) {
        if (nearEdge(rect, edge, height, stripHeight)) fragments.push({ rect, color });
      }
    } else {
      fragments.push({ rect, color });
    }
  }
  return fragments;
}

function releasedCandidates(trail: Trail, edge: ViewportEdge, previous: number, scroll: number): Candidate[] {
  const candidates: Candidate[] = [];
  for (const [column, y] of trail.exitCells.entries()) {
    const cell = releasedScrollCell(previous, scroll, column, pixelSize);
    if (!cell) continue;
    const seed = particleSeed(column, cell.index);
    if (seed % 7 > 1) continue;
    const probeY = edge === 'top' ? y + pixelSize - cell.distance - .5 : y + cell.distance + .5;
    candidates.push({ x: (column + .5) * pixelSize, y: y + pixelSize / 2, probeY, seed });
  }
  return candidates;
}

export function PixelViewportEdges({ root, targetSelector }: Props) {
  const top = useRef<HTMLCanvasElement>(null);
  const bottom = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const surface = root.current;
    const topContext = top.current?.getContext('2d');
    const bottomContext = bottom.current?.getContext('2d');
    if (!surface || !topContext || !bottomContext ||
      !CSS.supports('clip-path', 'path(evenodd, "M0 0H1V1Z")')) return;

    const marker = surface;
    const targets = [...marker.querySelectorAll<HTMLElement>(targetSelector)]
      .map((element) => ({ element, sources: paintSources(element) }));
    const trails: Record<ViewportEdge, Trail> = {
      top: { context: topContext, particles: [], exitCells: [] },
      bottom: { context: bottomContext, particles: [], exitCells: [] },
    };
    const range = document.createRange();
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const viewport = window.visualViewport;
    let frame: number | undefined;
    let edge: ViewportEdge | undefined;
    let needsGeometry = false;
    let previousScroll = 0;
    let width = 0;
    let height = 0;
    let ratio = 0;
    const scrollPosition = () => Math.max(0, Math.min(window.scrollY,
      document.documentElement.scrollHeight - document.documentElement.clientHeight));

    function emit(trail: Trail, activeEdge: ViewportEdge, sources: Source[], bounds: DOMRect,
      candidates: Candidate[], time: number) {
      const fragments = paintFragments(sources, range, activeEdge, height);
      for (const { x, y, probeY, seed } of candidates) {
        if (trail.particles.length >= 2 * trail.exitCells.length) break;
        if (x < bounds.left || x >= bounds.right || probeY < bounds.top || probeY >= bounds.bottom) continue;
        const fragment = fragments.find(({ rect }) =>
          x >= rect.left && x < rect.right && probeY >= rect.top && probeY < rect.bottom);
        if (!fragment) continue;

        const stripY = activeEdge === 'top' ? y : y - height + stripHeight;
        trail.particles.push(createParticle(x, stripY, fragment.color, time, activeEdge === 'top' ? -1 : 1, seed));
      }
    }

    function updateGeometry(time: number) {
      const scroll = scrollPosition();
      const delta = scroll - previousScroll;
      if (delta) edge = delta > 0 ? 'top' : 'bottom';
      const trail = edge && trails[edge];
      const candidates = edge && trail && delta && Math.abs(delta) < height / 2
        ? releasedCandidates(trail, edge, previousScroll, scroll)
        : [];
      previousScroll = scroll;
      const focused = document.activeElement;
      const focusBounds = focused?.matches(':focus-visible') ? focused.getBoundingClientRect() : undefined;

      for (const { element: target, sources } of targets) {
        const bounds = target.getBoundingClientRect();
        const protectedFocus = edge && focusBounds && target.contains(focused) &&
          nearEdge(focusBounds, edge, height, swapDepth + 5);
        if (edge && !protectedFocus && nearEdge(bounds, edge, height, swapDepth)) {
          if (trail && candidates.length) emit(trail, edge, sources, bounds, candidates, time);
          target.style.setProperty('--viewport-edge-clip', viewportSwapClip(bounds, edge, height));
        } else {
          target.style.removeProperty('--viewport-edge-clip');
        }
      }
    }

    function flush(time: number) {
      frame = undefined;
      if (needsGeometry) {
        needsGeometry = false;
        updateGeometry(time);
      }
      for (const { context, particles } of Object.values(trails)) {
        drawParticles(context, particles, time, pixelSize, 'y');
      }
      if (trails.top.particles.length || trails.bottom.particles.length) schedule();
    }

    function schedule() {
      if (frame === undefined && marker.hasAttribute('data-viewport-pixel-swap')) frame = requestAnimationFrame(flush);
    }

    function invalidate() {
      needsGeometry = true;
      schedule();
    }

    function stop() {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined;
      edge = undefined;
      delete marker.dataset.viewportPixelSwap;
      for (const { element } of targets) element.style.removeProperty('--viewport-edge-clip');
      for (const { context, particles } of Object.values(trails)) {
        particles.length = 0;
        clearParticles(context);
      }
    }

    function sync() {
      if (motion.matches || document.hidden || (viewport && viewport.scale > 1)) {
        stop();
        return;
      }
      const nextWidth = window.innerWidth;
      const nextHeight = window.innerHeight;
      const nextRatio = Math.min(window.devicePixelRatio || 1, 2);
      if (nextWidth !== width || nextHeight !== height || nextRatio !== ratio) {
        width = nextWidth;
        height = nextHeight;
        ratio = nextRatio;
        for (const activeEdge of ['top', 'bottom'] as const) {
          const trail = trails[activeEdge];
          trail.particles.length = 0;
          trail.exitCells = Array.from({ length: Math.ceil(width / pixelSize) }, (_, column) =>
            viewportExitCell(column, activeEdge, height));
          trail.context.canvas.width = Math.ceil(width * ratio);
          trail.context.canvas.height = Math.ceil(stripHeight * ratio);
          trail.context.setTransform(ratio, 0, 0, ratio, 0, 0);
        }
      }
      if (!marker.hasAttribute('data-viewport-pixel-swap')) previousScroll = scrollPosition();
      marker.dataset.viewportPixelSwap = '';
      invalidate();
    }

    const observer = new ResizeObserver(invalidate);
    observer.observe(marker);
    window.addEventListener('scroll', invalidate, { passive: true });
    window.addEventListener('resize', sync);
    viewport?.addEventListener('resize', sync);
    motion.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    document.addEventListener('focusin', invalidate);
    document.addEventListener('focusout', invalidate);
    sync();
    return () => {
      stop();
      observer.disconnect();
      window.removeEventListener('scroll', invalidate);
      window.removeEventListener('resize', sync);
      viewport?.removeEventListener('resize', sync);
      motion.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
      document.removeEventListener('focusin', invalidate);
      document.removeEventListener('focusout', invalidate);
    };
  }, [root, targetSelector]);

  return (
    <div className="viewport-edge-particles" aria-hidden="true">
      <canvas ref={top} style={{ height: stripHeight }} />
      <canvas ref={bottom} style={{ height: stripHeight }} />
    </div>
  );
}

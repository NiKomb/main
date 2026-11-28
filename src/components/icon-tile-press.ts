import type { MouseEvent, PointerEvent } from 'react';

const startupRuns = new WeakMap<HTMLElement, Promise<unknown>>();

function releaseTouch(event: PointerEvent<HTMLElement>) {
  if (event.pointerType === 'touch' && event.isPrimary) delete event.currentTarget.dataset.touchPressed;
}

function restartIconTileStartup(tile: HTMLElement, trigger: 'hover' | 'press') {
  const caseTile = tile.matches('.tile-layout--sign');
  if (!caseTile && !tile.matches('.icon-tile--secondary, .icon-tile--lit')) return;
  if (trigger === 'hover' && !matchMedia(caseTile ? '(any-hover: hover)' : '(hover: hover)').matches) return;

  tile.dataset.iconTileStartup = trigger;
  const animations = tile.getAnimations?.({ subtree: caseTile }).filter((candidate) =>
    'animationName' in candidate && candidate.animationName === 'case-sign-startup') ?? [];
  if (!animations.length) {
    startupRuns.delete(tile);
    delete tile.dataset.iconTileStartup;
    return;
  }

  for (const animation of animations) {
    animation.currentTime = trigger === 'press' ? animation.effect?.getTiming().delay ?? 0 : 0;
    animation.play();
  }
  const finished = Promise.allSettled(animations.map((animation) => animation.finished));
  startupRuns.set(tile, finished);
  void finished.then(() => {
    if (startupRuns.get(tile) !== finished) return;
    startupRuns.delete(tile);
    delete tile.dataset.iconTileStartup;
  });
}

export const iconTilePress = {
  onClickCapture({ currentTarget, detail }: MouseEvent<HTMLElement>) {
    if (detail === 0) restartIconTileStartup(currentTarget, 'press');
  },
  onPointerEnter({ currentTarget, pointerType }: PointerEvent<HTMLElement>) {
    if (pointerType !== 'touch') restartIconTileStartup(currentTarget, 'hover');
  },
  onPointerDownCapture({ currentTarget, isPrimary, pointerType, button }: PointerEvent<HTMLElement>) {
    if (!isPrimary) return;
    if (pointerType === 'touch') currentTarget.dataset.touchPressed = '';
    if (button === 0) restartIconTileStartup(currentTarget, 'press');
  },
  onPointerUp: releaseTouch,
  onPointerCancel: releaseTouch,
  onLostPointerCapture: releaseTouch,
};

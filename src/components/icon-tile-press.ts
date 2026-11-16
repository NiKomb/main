import type { PointerEvent } from 'react';

function releaseTouch(event: PointerEvent<HTMLElement>) {
  if (event.pointerType === 'touch' && event.isPrimary) delete event.currentTarget.dataset.touchPressed;
}

export const iconTilePress = {
  onPointerDownCapture(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch' && event.isPrimary) event.currentTarget.dataset.touchPressed = '';
  },
  onPointerUp: releaseTouch,
  onPointerCancel: releaseTouch,
  onLostPointerCapture: releaseTouch,
};

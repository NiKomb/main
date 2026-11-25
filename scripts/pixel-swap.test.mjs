import assert from 'node:assert/strict';
import test from 'node:test';
import { pixelSize, viewportExitCell, viewportSwapClip } from '../src/effects/case-pixels/pixel-swap.ts';

function clipContains(clip, x, y) {
  const matches = [...clip.matchAll(/M(-?[\d.]+) (-?[\d.]+)H(-?[\d.]+)V(-?[\d.]+)/g)];
  const hits = matches.filter(([, left, top, right, bottom]) =>
    x >= Number(left) && x < Number(right) && y >= Number(top) && y < Number(bottom)).length;
  return clip.startsWith('path(evenodd') ? hits % 2 === 1 : hits > 0;
}

test('viewport switches the clipped side with the scroll direction', () => {
  const bounds = { left: 12, right: 72, top: -12, bottom: 612 };
  assert.match(viewportSwapClip(bounds, 'top', 600), /^path\(evenodd, "M-8\.00 -8\.00H68\.00V632\.00/);
  assert.match(viewportSwapClip(bounds, 'bottom', 600), /^path\("M-8\.00 -8\.00H68\.00V560\.00/);
  assert.equal(viewportSwapClip({ ...bounds, top: 56 }, 'top', 600), 'none');
});

test('the trail starts in a hidden cell on either viewport edge', () => {
  const bounds = { left: 0, right: 120, top: 0, bottom: 600 };
  const column = 3;
  const x = (column + .5) * pixelSize;
  for (const edge of ['top', 'bottom']) {
    const clip = viewportSwapClip(bounds, edge, bounds.bottom);
    const exit = viewportExitCell(column, edge, bounds.bottom) + pixelSize / 2;
    assert.equal(clipContains(clip, x, exit), false);
    assert.equal(clipContains(clip, x, exit + (edge === 'top' ? pixelSize : -pixelSize)), true);
  }
});

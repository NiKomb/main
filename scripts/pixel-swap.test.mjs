import assert from 'node:assert/strict';
import test from 'node:test';
import { comparisonExitCells, comparisonSwapClips, pixelSize, viewportExitCell, viewportSwapClip } from '../src/effects/case-pixels/pixel-swap.ts';
import { dividerOffsetAt } from '../src/effects/comparison-divider/spring.ts';

function clipContains(clip, x, y) {
  const matches = [...clip.matchAll(/M(-?[\d.]+) (-?[\d.]+)H(-?[\d.]+)V(-?[\d.]+)/g)];
  const hits = matches.filter(([, left, top, right, bottom]) =>
    x >= Number(left) && x < Number(right) && y >= Number(top) && y < Number(bottom)).length;
  return clip.startsWith('path(evenodd') ? hits % 2 === 1 : hits > 0;
}

test('comparison masks are complementary and follow the slider', () => {
  const { near, far } = comparisonSwapClips(120, 48, 50);
  const revealed = near.slice('path("'.length, -2);
  assert.match(revealed, /^M0\.00 0\.00H52\.00V48\.00H0\.00Z/);
  assert.match(revealed, /M52\.00 0\.00H56\.00V4\.00H52\.00Z/);
  assert.equal(far, `path(evenodd, "M0.00 0.00H120.00V48.00H0.00Z${revealed}")`);
  assert.notEqual(comparisonSwapClips(120, 48, 65).near, near);
});

test('comparison endpoints show a whole screenshot', () => {
  assert.equal(comparisonSwapClips(120, 48, 0), undefined);
  assert.equal(comparisonSwapClips(120, 48, 100), undefined);
  assert.equal(comparisonSwapClips(0, 0, 50), undefined);
});

test('comparison masks and particles follow the bend even when the handle stays still', () => {
  const straight = comparisonSwapClips(120, 120, 50);
  for (const stretch of [-18, 18]) {
    const offsetAt = (y) => dividerOffsetAt(stretch, 120, y);
    const curved = comparisonSwapClips(120, 120, 50, offsetAt);
    const x = stretch < 0 ? 48 : 68;
    assert.notEqual(clipContains(curved.near, x, 2), clipContains(curved.near, x, 62));
    assert.equal(clipContains(curved.near, x, 62), clipContains(straight.near, x, 62));

    const cells = comparisonExitCells(120, 120, 50, 50, undefined, offsetAt);
    assert.ok(cells.some(({ row }) => row === 0));
    assert.ok(cells.every(({ row }) => row !== 15));
    for (const { column, row } of cells) {
      const x = (column + .5) * pixelSize;
      const y = (row + .5) * pixelSize;
      assert.notEqual(clipContains(curved.near, x, y), clipContains(straight.near, x, y));
      assert.notEqual(clipContains(curved.near, x, y), clipContains(curved.far, x, y));
    }
  }
});

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

test('comparison releases only cells that change sides as the divider moves', () => {
  const columns = comparisonExitCells(120, 48, 50, 55);
  assert.ok(columns.length > 0);
  assert.deepEqual(comparisonExitCells(120, 48, 55, 50), columns);
  assert.ok(columns.every(({ column, row }) => column >= 13 && column <= 17 && row < 12));
  assert.deepEqual(comparisonExitCells(120, 48, 55, 55), []);
  const jump = comparisonExitCells(120, 48, 0, 100);
  assert.ok(jump.length > 0 && jump.every(({ column }) => column >= 25 && column < 30));
});

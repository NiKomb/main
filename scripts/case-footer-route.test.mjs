import assert from 'node:assert/strict';
import test from 'node:test';
import { caseButtonX, caseFooterRoute, caseRowFinishButton } from '../src/effects/mascot/case-route.ts';

const button = { left: 216, right: 256, top: 680, bottom: 720 };

test('a button narrower than the sprite supports a centered stop as close to the viewport edge as fits', () => {
  assert.equal(caseButtonX(button, 390, 72), 200);
  assert.equal(caseButtonX({ left: 0, right: 40 }, 390, 72), 0);
  assert.equal(caseButtonX({ left: 350, right: 390 }, 390, 72), 318);
});

test('the footer route starts over the button and finishes to the right of the date', () => {
  assert.deepEqual(caseFooterRoute([button], 1440, 800, 1120, 72), {
    button, buttonX: 200, rightFinish: { x: 1132, y: 728 },
  });
});

test('the footer route requires a fully visible button', () => {
  assert.equal(caseFooterRoute([{ ...button, bottom: 820 }], 1440, 800, 1120, 72), undefined);
  assert.equal(caseFooterRoute([], 1440, 800, 1120, 72), undefined);
  assert.ok(caseFooterRoute([{ ...button, bottom: 800 }], 1440, 800, 1120, 72));
});

test('the footer route picks the rightmost visible target by position', () => {
  const left = { ...button, left: 168, right: 208 };
  const belowViewport = { left: 270, right: 310, top: 790, bottom: 830 };
  assert.equal(caseFooterRoute([button, belowViewport, left], 1440, 800, 1120, 72).button, button);
  assert.equal(caseFooterRoute([left, button], 1440, 800, 1120, 72).button, button);
  assert.equal(caseFooterRoute([left], 1440, 800, 1120, 72).button, left);
});

test('the reserved date gap works on narrow windows and the sprite stays in view', () => {
  const route = caseFooterRoute([button], 280, 800, 196, 72);
  assert.deepEqual(route.rightFinish, { x: 208, y: 728 });
  assert.equal(route.buttonX, 200);

  const atRightEdge = caseFooterRoute([button], 260, 800, 300, 72);
  assert.equal(atRightEdge.buttonX, atRightEdge.rightFinish.x);
});

test('a row finish uses the closest fully visible button above the right edge', () => {
  const viewport = { width: 390, height: 844, top: 44 };
  const edge = { x: 318, y: 220 };
  const nearby = { left: 330, right: 370, top: 156, bottom: 196 };
  const further = { ...nearby, left: 280, right: 320, top: 140, bottom: 180 };

  assert.deepEqual(caseRowFinishButton([further, nearby], edge, viewport, 72, 72), { button: nearby, buttonX: 314 });
  assert.equal(caseRowFinishButton([
    { ...nearby, left: 120, right: 160 },
    { ...nearby, top: 40, bottom: 80 },
    { ...nearby, top: 110, bottom: 146 },
    { ...nearby, top: 190, bottom: 230 },
    { ...nearby, left: 360, right: 400 },
  ], edge, viewport, 72, 72), undefined);
});

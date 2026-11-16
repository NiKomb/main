import assert from 'node:assert/strict';
import test from 'node:test';
import { caseFooterRoute } from '../src/effects/mascot/case-route.ts';

const button = { left: 216, right: 256, top: 680, bottom: 720 };

test('the footer route starts over the button and finishes at the right edge of the text column', () => {
  assert.deepEqual(caseFooterRoute([button], 1440, 800, 1120, 72), {
    button, buttonX: 200, rightFinish: { x: 1048, y: 728 },
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

test('the finish follows the text column on narrow windows and keeps the sprite in view', () => {
  const route = caseFooterRoute([button], 280, 800, 274, 72);
  assert.deepEqual(route.rightFinish, { x: 202, y: 728 });
  assert.equal(route.buttonX, 200);

  const atRightEdge = caseFooterRoute([button], 260, 800, 300, 72);
  assert.equal(atRightEdge.buttonX, atRightEdge.rightFinish.x);
});

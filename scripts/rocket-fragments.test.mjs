import assert from 'node:assert/strict';
import test from 'node:test';
import { drawFragments, fragmentDuration } from '../src/effects/rocket-shot/fragment-motion.ts';

test('rocket fragments spread quickly, fall, fade, and stop drawing when their time is up', () => {
  const fragment = {
    x: 10, y: 0, color: '#222', size: 2, lifetime: fragmentDuration, travelX: 30, travelY: -25,
  };
  const calls = [];
  const context = {
    globalAlpha: 1,
    fillRect(x, y, width, height) {
      calls.push({ x, y, width, height, alpha: this.globalAlpha });
    },
  };
  for (const elapsed of [0, 150, 300, 850, fragmentDuration]) {
    drawFragments(context, [fragment], { x: 100, y: 100 }, elapsed, 2);
    assert.equal(context.globalAlpha, 1);
  }
  assert.equal(calls.length, 4);
  const [impact, spread, slowed, fall] = calls;
  assert.deepEqual(impact, { x: 110, y: 100, width: 2, height: 2, alpha: 1 });
  assert.equal(spread.alpha, 1);
  assert.ok(spread.x > impact.x && spread.y < impact.y);
  assert.ok(slowed.x - spread.x < spread.x - impact.x);
  assert.ok(fall.y > impact.y);
  assert.ok(fall.alpha > 0 && fall.alpha < slowed.alpha);
});

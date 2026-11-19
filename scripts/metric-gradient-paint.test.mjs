import assert from 'node:assert/strict';
import test from 'node:test';
import { pixelRevealStepCount, pixelRevealSteps } from '../src/effects/metric-gradient-paint/pixel-reveal.ts';

test('the pixel reveal leaves dark gaps during the spread and paints each pixel exactly once', () => {
  const width = 100;
  const height = 50;
  const steps = pixelRevealSteps(width, height, 0);
  assert.equal(steps.length, pixelRevealStepCount);
  const middle = new Set(steps.slice(0, 17).flat());
  assert.ok(middle.size > width * height * .2 && middle.size < width * height * .8);

  const mixedColumns = Array.from({ length: width }, (_, column) => {
    let painted = 0;
    for (let row = 0; row < height; row++) {
      if (middle.has(row * width + column)) painted++;
    }
    return painted;
  });
  assert.ok(mixedColumns[25] > 0 && mixedColumns[25] < height);
  assert.ok(mixedColumns[5] > mixedColumns[75]);
  const order = steps.flat().sort((left, right) => left - right);
  assert.deepEqual(order, Array.from({ length: width * height }, (_, index) => index));
});

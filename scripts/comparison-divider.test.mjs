import assert from 'node:assert/strict';
import test from 'node:test';
import { dividerPixels, pullDivider, stepDivider } from '../src/effects/comparison-divider/spring.ts';

test('the divider uses three-pixel squares with a six-pixel pitch', () => {
  assert.equal(dividerPixels(0, 15), 'M-1.5 0h3v3h-3ZM-1.5 6h3v3h-3ZM-1.5 12h3v3h-3Z');
});

test('divider ends trail the handle with a bounded stretch in either direction', () => {
  const still = { offset: 0, velocity: 0 };
  for (const direction of [-1, 1]) {
    const dragged = pullDivider(still, direction * 300);
    assert.equal(dragged.offset, direction * 28);
    const pixels = dividerPixels(dragged.offset, 120);
    assert.match(pixels, /M-1\.5 60h3v3h-3Z/);
    assert.notEqual(pixels, dividerPixels(0, 120));
  }
});

test('divider overshoots slightly and settles after release', () => {
  let spring = pullDivider({ offset: 0, velocity: 0 }, -28);
  let crossed = false;
  for (let frame = 0; frame < 60; frame++) {
    spring = stepDivider(spring, 1 / 60);
    crossed ||= spring.offset > 0;
  }
  assert.ok(crossed);
  assert.ok(Math.abs(spring.offset) < .1);
  assert.ok(Math.abs(spring.velocity) < 2);
});

test('a delayed animation frame cannot destabilize the spring', () => {
  const spring = pullDivider({ offset: 0, velocity: 0 }, 28);
  assert.deepEqual(stepDivider(spring, 4), stepDivider(spring, 1 / 30));
});

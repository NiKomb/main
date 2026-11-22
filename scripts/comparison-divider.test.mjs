import assert from 'node:assert/strict';
import test from 'node:test';
import { dividerPath, maxVisibleStretch, pullDivider, stepDivider, visibleDividerStretch } from '../src/effects/comparison-divider/spring.ts';

test('the divider is a continuous straight line at rest', () => {
  assert.equal(dividerPath(0, 15), 'M0 0V15');
  assert.equal(dividerPath(0, 0), '');
});

test('divider ends trail the handle with a bounded stretch in either direction', () => {
  const still = { offset: 0, velocity: 0 };
  for (const direction of [-1, 1]) {
    const dragged = pullDivider(still, direction * 300);
    const stretch = visibleDividerStretch(dragged.offset);
    assert.equal(stretch, direction * maxVisibleStretch);
    const path = dividerPath(stretch, 120);
    assert.match(path, new RegExp(`^M${stretch} 0(?:V\\d+H-?\\d+)+V120$`));
    let x = stretch;
    let crossesHandle = false;
    for (const [, y, next] of path.matchAll(/V(\d+)H(-?\d+)/g)) {
      assert.equal(Number(y) % 2, 0);
      assert.equal(Math.abs(Number(next) - x), 1);
      x = Number(next);
      crossesHandle ||= x === 0;
    }
    assert.ok(crossesHandle);
    assert.equal(x, stretch);
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

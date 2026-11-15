import assert from 'node:assert/strict';
import test from 'node:test';
import { aimLauncher, flightFrame, gripPoint } from '../src/effects/rocket-shot/launcher-geometry.ts';

test('the grip follows the current run or jump frame and mirrors with the sprite', () => {
  const bounds = { left: 100, top: 200, width: 72, height: 72 };
  assert.deepEqual(gripPoint(bounds, 0, 1, false), { x: 158, y: 238 });
  assert.deepEqual(gripPoint(bounds, 2, 1, false), { x: 146, y: 244 });
  assert.deepEqual(gripPoint(bounds, 2, 2, true), { x: 108, y: 234 });
});

test('the sprite muzzle and trajectory align when aiming in either direction', () => {
  const grip = { x: 50, y: 50 };
  for (const x of [0, 100]) {
    const target = { x, y: 20 };
    const { angle, flip, muzzle } = aimLauncher(grip, target, 1);
    assert.equal(flip, x > grip.x ? 1 : -1);
    assert.ok(Math.abs(Math.atan2(target.y - muzzle.y, target.x - muzzle.x) - angle) < 1e-10);
  }
});

test('the travel position interpolates between frames and reaches the target even after a skipped frame', () => {
  assert.deepEqual(flightFrame(.5), { index: 0, progress: 4 / 246, arrived: false });
  assert.deepEqual(flightFrame(35), { index: 16, progress: 1, arrived: true });
});

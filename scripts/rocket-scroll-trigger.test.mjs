import assert from 'node:assert/strict';
import test from 'node:test';
import { shotDeadline } from '../src/effects/rocket-shot/scroll-trigger.ts';

test('the timer starts when the caption enters view and lasts five seconds', () => {
  assert.equal(shotDeadline(undefined, 100, false), undefined);
  assert.equal(shotDeadline(undefined, 200, true), 5200);
});

test('the deadline survives subsequent checks while the caption is visible', () => {
  assert.equal(shotDeadline(5200, 600, true), 5200);
  assert.equal(shotDeadline(5200, 5200, true), 5200);
});

test('leaving view cancels the timer, and returning restarts it', () => {
  const cancelled = shotDeadline(5200, 1000, false);
  assert.equal(cancelled, undefined);
  assert.equal(shotDeadline(cancelled, 1200, true), 6200);
});

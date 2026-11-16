import assert from 'node:assert/strict';
import test from 'node:test';
import { shotCaptionVisible, shotDeadline } from '../src/effects/rocket-shot/scroll-trigger.ts';

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

test('the caption is in view until it leaves the visible part of the viewport', () => {
  assert.equal(shotCaptionVisible({ top: -20, bottom: 40, height: 60 }, 800), true);
  assert.equal(shotCaptionVisible({ top: -20, bottom: 40, height: 60 }, 800, 48), false);
  assert.equal(shotCaptionVisible({ top: -60, bottom: 0, height: 60 }, 800), false);
  assert.equal(shotCaptionVisible({ top: 800, bottom: 860, height: 60 }, 800), false);
});

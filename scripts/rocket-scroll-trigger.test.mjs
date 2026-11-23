import assert from 'node:assert/strict';
import test from 'node:test';
import { shotCaptionCentered, shotCaptionVisible, shotDeadline } from '../src/effects/rocket-shot/scroll-trigger.ts';

test('the timer starts when the caption enters the target zone and lasts three seconds', () => {
  assert.equal(shotDeadline(undefined, 100, false), undefined);
  assert.equal(shotDeadline(undefined, 200, true), 3200);
});

test('the deadline survives subsequent checks while the caption is visible', () => {
  assert.equal(shotDeadline(3200, 600, true), 3200);
  assert.equal(shotDeadline(3200, 3200, true), 3200);
});

test('leaving the target zone cancels the timer even while the caption is still visible', () => {
  const centered = shotCaptionCentered({ top: 370, height: 60 }, 800);
  const entered = shotDeadline(undefined, 200, centered);
  const nearTop = { top: 100, bottom: 160, height: 60 };
  assert.equal(shotCaptionVisible(nearTop, 800), true);
  const cancelled = shotDeadline(entered, 1000, shotCaptionCentered(nearTop, 800));
  assert.equal(cancelled, undefined);
  assert.equal(shotDeadline(cancelled, 1200, centered), 4200);
});

test('the target zone spans the middle half of the viewport and respects the top inset', () => {
  assert.equal(shotCaptionCentered({ top: 169, height: 60 }, 800), false);
  assert.equal(shotCaptionCentered({ top: 170, height: 60 }, 800), true);
  assert.equal(shotCaptionCentered({ top: 570, height: 60 }, 800), true);
  assert.equal(shotCaptionCentered({ top: 571, height: 60 }, 800), false);
  assert.equal(shotCaptionCentered({ top: 170, height: 60 }, 800, 240), false);
  assert.equal(shotCaptionCentered({ top: 400, height: 0 }, 800), false);
});

test('the caption is in view until it leaves the visible part of the viewport', () => {
  assert.equal(shotCaptionVisible({ top: -20, bottom: 40, height: 60 }, 800), true);
  assert.equal(shotCaptionVisible({ top: -20, bottom: 40, height: 60 }, 800, 48), false);
  assert.equal(shotCaptionVisible({ top: -60, bottom: 0, height: 60 }, 800), false);
  assert.equal(shotCaptionVisible({ top: 800, bottom: 860, height: 60 }, 800), false);
});

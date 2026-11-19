import assert from 'node:assert/strict';
import test from 'node:test';
import { frameContact, frameDash } from '../src/effects/comparison-frame-paint/stroke.ts';
import { animatePaintDrop, paintDropDuration } from '../src/effects/mascot/paint-drop.ts';

test('the shared paint drop pauses at its origin and disappears at the impact point', () => {
  const drop = {
    animate(keyframes, options) { return { keyframes, options }; },
  };
  const { keyframes, options } = animatePaintDrop(drop, { x: 20, y: -24 }, { x: 24, y: 1 });
  assert.equal(options.duration, paintDropDuration);
  assert.ok(keyframes[1].transform.startsWith('translate(20px, -24px)'));
  assert.equal(keyframes[1].opacity, 1);
  assert.ok(keyframes[3].transform.startsWith('translate(24px, 1px)'));
  assert.equal(keyframes[3].opacity, 0);
});

test('a bubble above the tile paints its top edge, and a low bubble paints the nearer side', () => {
  assert.deepEqual(frameContact(102, 62, 10, 300, 99, -20), { x: 91, y: 1, origin: 80 });
  assert.deepEqual(frameContact(102, 62, 10, 300, 99, 15), { x: 101, y: 45, origin: 129 });
  assert.deepEqual(frameContact(102, 62, 10, 300, 12, 15), { x: 1, y: 45, origin: 251 });
});

test('the color expands in both directions from the contact point and fills the perimeter', () => {
  assert.deepEqual(frameDash(1000, 125, 0), { strokeDasharray: '0px 1000px', strokeDashoffset: '-125px' });
  assert.deepEqual(frameDash(1000, 125, 30), { strokeDasharray: '60px 940px', strokeDashoffset: '-95px' });
  assert.equal(frameDash(1000, 125, 500).strokeDasharray, '1000px 0px');
});

test('the bright tails begin at the contact point and follow opposite ends of the painted border', () => {
  const clockwise = { direction: 'clockwise', length: 30 };
  const counterclockwise = { direction: 'counterclockwise', length: 30 };
  assert.deepEqual(frameDash(1000, 125, 2, clockwise), { strokeDasharray: '2px 998px', strokeDashoffset: '-125px' });
  assert.equal(frameDash(1000, 125, 2, counterclockwise).strokeDashoffset, '-123px');
  assert.deepEqual(frameDash(1000, 125, 50, clockwise), { strokeDasharray: '30px 970px', strokeDashoffset: '-145px' });
  assert.equal(frameDash(1000, 125, 50, counterclockwise).strokeDashoffset, '-75px');
});

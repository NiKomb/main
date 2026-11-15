import assert from 'node:assert/strict';
import test from 'node:test';
import { adjacentSlide, slidesInGallery, swipeDirection } from '../src/components/media-navigation.ts';

test('a screenshot outside a gallery opens by itself', () => {
  const screenshot = { closest: () => null };
  assert.deepEqual(slidesInGallery(screenshot), [screenshot]);
});

test('a gallery keeps the order of its own screenshots and skips nested galleries', () => {
  const gallery = { querySelectorAll: () => [first, nested, last] };
  const nestedGallery = { querySelectorAll: () => [nested] };
  const first = { closest: () => gallery };
  const nested = { closest: () => nestedGallery };
  const last = { closest: () => gallery };

  assert.deepEqual(slidesInGallery(last), [first, last]);
  assert.deepEqual(slidesInGallery(nested), [nested]);
});

test('slide navigation wraps at both ends', () => {
  assert.equal(adjacentSlide(0, 4, -1), 3);
  assert.equal(adjacentSlide(3, 4, 1), 0);
  assert.equal(adjacentSlide(2, 4, -1), 1);
  assert.equal(adjacentSlide(2, 4, 1), 3);
});

test('horizontal swipes change slides and short or vertical gestures are ignored', () => {
  assert.equal(swipeDirection(-44, 10), 1);
  assert.equal(swipeDirection(44, -10), -1);
  assert.equal(swipeDirection(43, 0), null);
  assert.equal(swipeDirection(60, -60), null);
  assert.equal(swipeDirection(0, 100), null);
});

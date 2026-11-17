import assert from 'node:assert/strict';
import test from 'node:test';
import { replaceGallerySlide } from '../src/effects/gallery-slide/transition.ts';

function setup() {
  const content = {
    children: [],
    get firstElementChild() { return this.children[0]; },
    prepend(slide) { this.children.unshift(slide); },
    replaceChildren(slide) { this.children = [slide]; },
  };
  function slide(video) {
    return {
      attributes: new Map(),
      setAttribute(name, value) { this.attributes.set(name, value); },
      querySelector: () => video,
      animate(keyframes) {
        return this.animation = { keyframes, cancel() { this.cancelled = true; } };
      },
      remove() { content.children = content.children.filter((child) => child !== this); },
    };
  }
  return { content, slide };
}

test('switching covers keeps the new slide first and removes the outgoing slide when the effect ends', () => {
  const { content, slide } = setup();
  const video = { controls: true, pause() { this.paused = true; } };
  const previous = slide(video);
  const next = slide();
  content.replaceChildren(previous);

  replaceGallerySlide(content, next, 1);

  assert.deepEqual(content.children, [next, previous]);
  assert.ok(previous.attributes.has('inert'));
  assert.equal(video.paused, true);
  assert.equal(video.controls, false);
  assert.equal(previous.animation.keyframes.at(-1).translate, '-24px');
  assert.equal(next.animation.keyframes[0].translate, '24px');

  previous.animation.onfinish();
  assert.deepEqual(content.children, [next]);
  assert.equal(next.animation.cancelled, true);
});

test('an interrupted transition clears the outgoing slide before an immediate replacement', () => {
  const { content, slide } = setup();
  const previous = slide();
  const next = slide();
  const last = slide();
  content.replaceChildren(previous);

  const cancel = replaceGallerySlide(content, next, -1);
  assert.equal(next.animation.keyframes[0].translate, '-24px');
  cancel();
  assert.deepEqual(content.children, [next]);
  assert.equal(previous.animation.cancelled, true);
  assert.equal(next.animation.cancelled, true);

  assert.equal(replaceGallerySlide(content, last), undefined);
  assert.deepEqual(content.children, [last]);
  assert.equal(last.animation, undefined);
});

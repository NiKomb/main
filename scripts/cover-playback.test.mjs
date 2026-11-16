import assert from 'node:assert/strict';
import test from 'node:test';
import { connectCoverPlayback } from '../src/components/cover-playback.ts';

function setup({ reducedMotion = false } = {}) {
  const document = Object.assign(new EventTarget(), { hidden: false });
  const motion = Object.assign(new EventTarget(), { matches: reducedMotion });
  let reportIntersection;
  document.defaultView = {
    matchMedia: () => motion,
    IntersectionObserver: class {
      constructor(callback) { reportIntersection = callback; }
      observe() {}
      disconnect() { reportIntersection = undefined; }
    },
  };
  const video = Object.assign(new EventTarget(), {
    ownerDocument: document,
    paused: true,
    ended: false,
    async play() {
      this.paused = false;
      this.ended = false;
      this.dispatchEvent(new Event('play'));
    },
    pause() {
      this.paused = true;
      this.dispatchEvent(new Event('pause'));
    },
  });
  const preference = { current: null };
  const changes = [];
  const controller = connectCoverPlayback(video, preference, (playing) => changes.push(playing));
  return {
    video, preference, changes, controller,
    show(ratio) {
      reportIntersection?.([{ isIntersecting: ratio > 0, intersectionRatio: ratio }]);
    },
    hideTab(hidden) {
      document.hidden = hidden;
      document.dispatchEvent(new Event('visibilitychange'));
    },
  };
}

test('a cover plays muted while visible and stops offscreen or in a hidden tab', () => {
  const { video, show, hideTab, changes, controller } = setup();
  show(0.1);
  assert.equal(video.paused, true);
  show(0.7);
  assert.equal(video.muted, true);
  assert.equal(video.paused, false);
  hideTab(true);
  assert.equal(video.paused, true);
  hideTab(false);
  assert.equal(video.paused, false);
  show(0);
  assert.equal(video.paused, true);
  assert.equal(changes.at(-1), false);
  controller.disconnect();
  show(1);
  assert.equal(video.paused, true);
});

test('reduced motion and a manual pause prevent automatic playback', () => {
  const { video, preference, show, hideTab, controller } = setup({ reducedMotion: true });
  show(1);
  assert.equal(video.paused, true);
  controller.toggle();
  assert.equal(video.paused, false);
  assert.equal(preference.current, true);
  controller.toggle();
  assert.equal(preference.current, false);
  show(0);
  show(1);
  hideTab(false);
  assert.equal(video.paused, true);
  controller.disconnect();
});

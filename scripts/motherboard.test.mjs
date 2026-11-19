import assert from 'node:assert/strict';
import test from 'node:test';
import { connectMotherboard } from '../src/effects/motherboard/interaction.ts';

function setup(reducedMotion = false) {
  const document = Object.assign(new EventTarget(), { hidden: false });
  const motion = Object.assign(new EventTarget(), { matches: reducedMotion });
  const frames = new Map();
  const draws = [];
  let reportIntersection;
  let reportResize;
  let id = 0;
  const window = Object.assign(new EventTarget(), {
    matchMedia: () => motion,
    requestAnimationFrame(callback) { frames.set(++id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    IntersectionObserver: class {
      constructor(callback) { reportIntersection = callback; }
      observe() {}
      disconnect() { reportIntersection = undefined; }
    },
    ResizeObserver: class {
      constructor(callback) { reportResize = callback; }
      observe() {}
      disconnect() { reportResize = undefined; }
    },
  });
  document.defaultView = window;
  const captured = new Set();
  const canvas = Object.assign(new EventTarget(), {
    ownerDocument: document, dataset: {}, focus() {},
    hasPointerCapture(id) { return captured.has(id); },
    setPointerCapture(id) { captured.add(id); },
    releasePointerCapture(id) { captured.delete(id); },
  });
  const disconnect = connectMotherboard(canvas, { draw: (...pose) => draws.push(pose) });
  function event(type, properties = {}) {
    const event = Object.assign(new Event(type, { cancelable: true }), {
      isPrimary: true, button: 0, buttons: 1, pointerId: 1, pointerType: 'mouse', clientX: 0, clientY: 0,
      ...properties,
    });
    canvas.dispatchEvent(event);
    return event;
  }
  return {
    canvas, motion, window, draws, frames, captured, disconnect, event,
    show(visible = true) { reportIntersection?.([{ isIntersecting: visible }]); },
    resize() { reportResize?.(); },
    hideTab(hidden) { document.hidden = hidden; document.dispatchEvent(new Event('visibilitychange')); },
    tick(time = 100) {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach(callback => callback(time));
    },
  };
}

test('motherboard spins only while visible, stops in a hidden tab, and cleans up on remount', () => {
  const view = setup();
  assert.equal(view.frames.size, 0);
  view.show(); view.tick(); view.tick(120);
  assert.ok(view.draws[1][0] > view.draws[0][0]);
  view.show(false);
  assert.equal(view.frames.size, 0);
  view.show(); view.tick(10000);
  assert.equal(view.draws.at(-1)[0], view.draws[1][0], 'no jump after a hidden interval');
  view.hideTab(true);
  assert.equal(view.frames.size, 0);
  view.hideTab(false);
  assert.equal(view.frames.size, 1);
  view.disconnect();
  view.show(); view.resize(); view.hideTab(false); view.event('pointerdown');
  assert.equal(view.frames.size, 0);
  assert.equal(view.captured.size, 0);
  const next = setup();
  next.show(); next.tick();
  assert.equal(next.draws.length, 1);
  next.disconnect();
});

test('only a primary left drag changes the orbit; release and cancellation resume spinning', () => {
  const view = setup();
  view.show(); view.tick();
  const initial = view.draws.at(-1);
  view.event('pointermove', { clientX: 10 });
  view.event('pointerdown', { button: 2 });
  view.event('pointermove', { clientX: 20 });
  assert.equal(view.captured.size, 0);
  view.event('pointerdown');
  view.event('pointermove', { pointerId: 2, clientX: 500 });
  view.tick(120);
  assert.deepEqual(view.draws.at(-1), initial);
  view.event('pointermove', { clientX: 20, clientY: 10 }); view.tick(140);
  const dragged = view.draws.at(-1);
  assert.ok(dragged[0] < initial[0]);
  assert.ok(dragged[1] > initial[1]);
  assert.equal(dragged[2], initial[2], 'distance stays fixed');
  assert.equal(view.frames.size, 0, 'no idle render loop during a drag');
  view.event('pointerup'); view.tick(160); view.tick(180);
  assert.ok(view.draws.at(-1)[0] > dragged[0]);
  for (const ending of ['pointercancel', 'lostpointercapture']) {
    view.event('pointerdown'); view.event(ending);
    assert.equal(view.captured.size, 0);
    assert.equal(view.frames.size, 1);
  }
  view.event('pointerdown');
  view.event('pointermove', { buttons: 0, clientX: 100 });
  assert.equal(view.captured.size, 0);
  view.disconnect();
});

test('reduced motion draws once, allows rotation and resize, and leaves wheel scrolling alone', () => {
  const view = setup(true);
  view.show(); view.tick();
  assert.equal(view.frames.size, 0);
  const initial = view.draws.at(-1);
  assert.equal(view.event('keydown', { key: 'ArrowRight' }).defaultPrevented, true);
  view.tick();
  assert.ok(view.draws.at(-1)[0] < initial[0]);
  view.event('pointerdown', { pointerType: 'touch' });
  view.event('pointermove', { pointerType: 'touch', clientY: 1000 }); view.tick();
  assert.equal(view.draws.at(-1)[1], 1.569, 'elevation is bounded');
  view.event('pointercancel'); view.tick();
  assert.equal(view.frames.size, 0);
  view.resize(); view.tick();
  assert.equal(view.frames.size, 0);
  assert.equal(view.event('wheel', { deltaY: 100 }).defaultPrevented, false);
  assert.equal(view.event('keydown', { key: '+' }).defaultPrevented, false);
  view.motion.matches = false;
  view.motion.dispatchEvent(new Event('change')); view.tick(); view.tick(120);
  assert.equal(view.frames.size, 1);
  view.event('keydown', { code: 'Space' }); view.tick();
  assert.equal(view.frames.size, 0);
  view.motion.matches = true;
  view.motion.dispatchEvent(new Event('change')); view.tick();
  assert.equal(view.frames.size, 0);
  view.disconnect();
});

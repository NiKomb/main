import assert from 'node:assert/strict';
import test from 'node:test';
import { runnerImport } from 'vite';

const { module: { playGroundMovement } } = await runnerImport(
  './src/effects/mascot/ground-movement.ts', { configFile: false },
);
const { module: { createMascotMovement } } = await runnerImport(
  './src/effects/mascot/mascot-movement.ts', { configFile: false },
);

test('the Blink canvas covers an avatar to the left of or above the case grid', (t) => {
  const context = {
    drawImage() {},
    getImageData: () => ({ data: new Uint8ClampedArray(36 * 36 * 4) }),
    createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
  };
  globalThis.document = { createElement: () => ({ getContext: () => context }) };
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  t.after(() => {
    delete globalThis.document;
    delete globalThis.requestAnimationFrame;
    delete globalThis.cancelAnimationFrame;
  });

  for (const { bounds, start } of [
    { bounds: { left: 416, top: 48, width: 944, height: 1212 }, start: { x: -328, y: -68 } },
    { bounds: { left: 20, top: 496, width: 350, height: 500 }, start: { x: -8, y: -516 } },
  ]) {
    const canvas = {
      parentElement: { getBoundingClientRect: () => bounds },
      getContext: () => context,
      style: {},
      hidden: true,
    };
    const blink = playGroundMovement(canvas, { naturalWidth: 288 }, start, start.x,
      () => {}, () => {}, { kind: 'blink-arrival' });
    assert.ok(blink);
    assert.equal(canvas.hidden, false);
    const left = parseFloat(canvas.style.left);
    const top = parseFloat(canvas.style.top);
    assert.ok(left <= start.x + 36 && left + canvas.width * 2 > start.x + 36);
    assert.ok(top <= start.y + 68 && top + canvas.height * 2 > start.y + 68);
    blink.cancel();
  }
});

test('travel announces takeoff when the run-up ends and the jump begins', () => {
  const animations = [];
  const layer = {
    style: { setProperty() {} },
    dataset: {},
    animate() {
      const animation = {};
      animations.push(animation);
      return animation;
    },
  };
  const movement = createMascotMovement(layer, null, null, {});
  const avatar = {
    surface: { left: -20, right: 20, y: 0, canDash: false },
    edge: 'start',
    point: { x: 0, y: 0 },
  };
  const cover = {
    surface: { left: 280, right: 580, y: 0, canDash: true },
    edge: 'landing',
    point: { x: 280, y: 0 },
  };
  let takeoffs = 0;
  movement.travel(avatar, cover, true, () => {}, true, () => takeoffs++);
  assert.equal(movement.phase, 'run');
  assert.equal(takeoffs, 0);
  animations[0].onfinish();
  assert.equal(movement.phase, 'jump');
  assert.equal(takeoffs, 1);
});

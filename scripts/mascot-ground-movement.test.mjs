import assert from 'node:assert/strict';
import test from 'node:test';
import { runnerImport } from 'vite';

const { module: { playGroundMovement } } = await runnerImport(
  './src/effects/mascot/ground-movement.ts', { configFile: false },
);
const { module: { createMascotMovement } } = await runnerImport(
  './src/effects/mascot/mascot-movement.ts', { configFile: false },
);
const { module: { default: movement } } = await runnerImport(
  './src/effects/mascot/sprite-fusion-movement.ts', { configFile: false },
);

test('an opt-in dash still moves toward its endpoint just before the skid starts', () => {
  function remainingDistance(dashExitSpeed) {
    let position;
    const dash = movement({
      kind: 'dash', x: 0, y: 0, distance: 200, time: .27, dashExitSpeed,
      cue: (name, point) => { if (name === 'move') position = point.x; },
    });
    dash.update(.389);
    return 200 - position;
  }

  assert.ok(remainingDistance() < .05);
  assert.ok(remainingDistance(225) > .225 && remainingDistance(225) < .25);
});

test('an opted-in dash animates a single-point stop and settles without a return run', (t) => {
  const context = {
    drawImage() {},
    getImageData: () => ({ data: new Uint8ClampedArray(36 * 36 * 4) }),
    createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
    putImageData() {},
  };
  let frame;
  globalThis.document = { createElement: () => ({ getContext: () => context }) };
  globalThis.requestAnimationFrame = (callback) => { frame = callback; return 1; };
  globalThis.cancelAnimationFrame = () => {};
  t.after(() => {
    delete globalThis.document;
    delete globalThis.requestAnimationFrame;
    delete globalThis.cancelAnimationFrame;
  });

  const canvas = {
    parentElement: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 300 }) },
    getContext: () => context,
    style: {},
    hidden: true,
  };
  const actor = { style: {}, dataset: {}, getBoundingClientRect: () => ({ left: 100, width: 72 }),
    animate: () => assert.fail('a stationary dash has no return run') };
  const movement = createMascotMovement(actor, canvas, null, { naturalWidth: 288 });
  const point = { x: 100, y: 60 };
  const surface = { left: point.x, right: point.x, dashDistance: 72 };
  let completed = 0;
  const finish = () => { completed++; movement.settle(point); };
  movement.settle(point);

  assert.equal(movement.dashAndReturn(point, surface, undefined, finish), false);
  assert.equal(movement.dashAndReturn(point, surface, undefined, finish, { allowStationary: true }), true);
  assert.equal(movement.phase, 'dash');
  assert.equal(canvas.hidden, false);

  const start = performance.now();
  for (let i = 1; i <= 20; i++) {
    frame(start + i * 25);
    assert.equal(actor.style.transform, 'translate(100px, 60px)');
  }
  assert.equal(movement.phase, 'idle');
  assert.equal(movement.activeSurface, undefined);
  assert.equal(completed, 1);
});

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

test('a departure at the viewport edge announces the vanish once without revealing the actor', (t) => {
  const context = {
    drawImage() {},
    getImageData: () => ({ data: new Uint8ClampedArray(36 * 36 * 4) }),
    createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
    putImageData() {},
  };
  const canvas = {
    parentElement: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }) },
    getContext: () => context,
    style: {},
    hidden: true,
  };
  let frame;
  globalThis.document = { createElement: () => ({ getContext: () => context }) };
  globalThis.requestAnimationFrame = (callback) => { frame = callback; return 1; };
  globalThis.cancelAnimationFrame = () => {};
  t.after(() => {
    delete globalThis.document;
    delete globalThis.requestAnimationFrame;
    delete globalThis.cancelAnimationFrame;
  });

  const origin = { x: 318, y: 772 };
  const moves = [];
  const blink = playGroundMovement(canvas, { naturalWidth: 288 }, origin, origin.x,
    (x, opacity) => moves.push([x, opacity]), () => assert.fail('a departure has no arrival'), { kind: 'blink-departure' });
  assert.ok(blink);

  const start = performance.now();
  for (let i = 1; i <= 8; i++) frame(start + i * 25);
  assert.deepEqual(moves, []);
  for (let i = 9; i <= 40; i++) frame(start + i * 25);
  assert.deepEqual(moves, [[origin.x, 0]]);
  blink.cancel();
});

test('the dash canvas reaches the viewport edges when the route leaves the grid', (t) => {
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

  const bounds = { left: 100, top: 100, width: 900, height: 620 };
  const viewport = { clientWidth: 1200, clientHeight: 800 };
  const canvas = {
    ownerDocument: { documentElement: viewport },
    parentElement: { getBoundingClientRect: () => bounds },
    getContext: () => context,
    style: {},
    hidden: true,
  };
  const dash = playGroundMovement(canvas, { naturalWidth: 288 }, { x: 464, y: 628 }, 1016,
    () => {}, () => {}, { kind: 'dash' });
  assert.ok(dash);
  assert.equal(bounds.left + parseFloat(canvas.style.left) + canvas.width * 2, viewport.clientWidth);
  assert.equal(bounds.top + parseFloat(canvas.style.top) + canvas.height * 2, viewport.clientHeight);
  dash.cancel();
});

test('a drag release draws the tucked sprite until it vanishes, then reveals the standing actor at the destination', (t) => {
  const standing = { naturalWidth: 288 };
  const tucked = { width: 56, height: 56 };
  const pixels = new Uint32Array(tucked.width * tucked.height);
  pixels[15 * tucked.width + 20] = 0xff1627be;
  const capturedImages = [];
  const source = {
    drawImage(image) { capturedImages.push(image); },
    getImageData: () => ({ data: new Uint8ClampedArray(36 * 36 * 4) }),
  };
  const drawnImages = [];
  const context = {
    createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
    drawImage(image) { drawnImages.push(image); },
    putImageData() {},
  };
  const canvas = {
    parentElement: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 300 }) },
    getContext: () => context,
    style: {},
  };
  let frame;
  globalThis.document = { createElement: () => ({ getContext: () => source }) };
  globalThis.requestAnimationFrame = (callback) => { frame = callback; return 1; };
  globalThis.cancelAnimationFrame = () => {};
  t.after(() => {
    delete globalThis.document;
    delete globalThis.requestAnimationFrame;
    delete globalThis.cancelAnimationFrame;
  });

  const changes = [];
  const from = { x: 40, y: 60 };
  const blink = playGroundMovement(canvas, standing, from, 120,
    (x, opacity) => changes.push([x, opacity]), () => {},
    { kind: 'blink', departureFrame: { sprite: tucked, inset: 10, pixels } });
  assert.ok(blink);
  assert.deepEqual(capturedImages, [standing]);
  assert.deepEqual(drawnImages, [tucked]);

  const start = performance.now();
  for (let i = 1; i <= 8; i++) frame(start + i * 25);
  assert.ok(drawnImages.length > 1 && drawnImages.every((image) => image === tucked));
  assert.deepEqual(changes, []);

  for (let i = 9; i <= 16; i++) frame(start + i * 25);
  assert.deepEqual(changes, [[from.x, 0]]);
  const drawnBeforeArrival = drawnImages.length;
  for (let i = 17; i <= 38; i++) frame(start + i * 25);
  assert.deepEqual(changes, [[from.x, 0], [120, 1]]);
  assert.equal(drawnImages.length, drawnBeforeArrival);
  blink.cancel();
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
  assert.equal(layer.dataset.pose, 'long-jump');
  assert.equal(takeoffs, 1);
});

test('jumps choose launch and landing poses from the horizontal and vertical offsets', (t) => {
  let finishRecovery;
  globalThis.window = {
    setTimeout: (callback) => { finishRecovery = callback; },
    clearTimeout: () => { finishRecovery = undefined; },
  };
  t.after(() => { delete globalThis.window; });

  let animation;
  const layer = {
    style: { setProperty() {} },
    dataset: {},
    animate() {
      animation = { cancel() {} };
      return animation;
    },
  };
  const movement = createMascotMovement(layer, null, null, {});
  const start = { x: 150, y: 90 };

  function jump(dx, dy, prefix = '', options) {
    const end = { x: start.x + dx, y: start.y + dy };
    movement.leap(start, end, () => movement.settle(end), options);
    assert.equal(movement.phase, 'jump');
    assert.equal(layer.dataset.pose, `${prefix}jump`);
    animation.onfinish();
    assert.equal(movement.phase, 'land');
    assert.equal(layer.dataset.pose, `${prefix}land`);
    finishRecovery();
    assert.equal(layer.dataset.pose, 'idle');
  }

  jump(-73, 20, 'long-', { arcAcrossWideGap: true });
  assert.equal(layer.dataset.direction, 'left');
  jump(72, 0);
  jump(48, 64, 'long-');
  jump(56, -56, 'long-');
  jump(32, -32);
  jump(8, -140, 'up-');
  jump(8, 140, 'down-');
  jump(23, 120, 'down-');
  jump(24, 120, 'long-');
  jump(8, -119);
  jump(72, 0, '', { carriedByDash: true });
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { clearFrame, composite, createFrame, createFx } from 'pixelfx';
import * as groundSlam from '../src/effects/rocket-shot/ground-slam-effect.js';
import { createMeteorFire } from '../src/effects/rocket-shot/meteor-fire.js';

test('the dust clears while the dark grey rocks remain on the ground', () => {
  const { size: [width, height], origin: [x, y], fps, duration } = groundSlam.meta;
  const effect = createFx(groundSlam, { x, y, stone: '#444444' });
  const frame = createFrame(width, height);
  const pixels = new Uint8ClampedArray(width * height * 4);

  const draw = () => {
    effect.draw(clearFrame(frame));
    composite(frame, pixels);
  };
  const hasPixel = (fromRow, toRow, matches) => {
    for (let i = fromRow * width * 4; i < toRow * width * 4; i += 4) {
      if (pixels[i + 3] && matches(pixels[i], pixels[i + 1], pixels[i + 2])) return true;
    }
    return false;
  };

  const frames = duration * fps;
  for (let i = 1; i <= frames; i++) {
    effect.update(1 / fps);
    if (i === 2 * fps) {
      draw();
      assert.ok(hasPixel(0, y - 12, () => true), 'dust is still visible two seconds after impact');
    }
  }
  draw();
  assert.ok(hasPixel(y - 7, y, (r, g, b) => r === 68 && g === 68 && b === 68), 'dark grey rock pixels remain');
  assert.equal(hasPixel(0, y - 12, () => true), false, 'the dust has cleared');
  assert.equal(hasPixel(y + 10, height, () => true), false, 'there are no cracks below the impact');
});

test('Meteor fire stays lit by settled rocks past the original one-shot duration', () => {
  const fire = createMeteorFire([{ x: 14, y: 0, size: 3 }], 144, 164);
  assert.ok(fire);
  const width = fire.right - fire.left;
  const height = fire.bottom - fire.top;
  const frame = createFrame(width, height, fire.left, fire.top);
  const pixels = new Uint8ClampedArray(width * height * 4);
  const snapshots = [];
  for (let second = 1; second <= 8; second++) {
    for (let step = 0; step < 15; step++) fire.effect.update(1 / 15);
    if (second < 6) continue;
    fire.effect.draw(clearFrame(frame));
    composite(frame, pixels);
    assert.ok(pixels.some((value, i) => i % 4 === 0 &&
      value > pixels[i + 1] && pixels[i + 1] > pixels[i + 2] && pixels[i + 3] > 0));
    snapshots.push(pixels.slice());
  }
  assert.notDeepEqual(snapshots[0], snapshots[1]);
});

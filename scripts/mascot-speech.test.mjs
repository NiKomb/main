import assert from 'node:assert/strict';
import test from 'node:test';
import { speechPosition } from '../src/effects/mascot/speech-position.ts';

test('speech grows toward the grid from a mascot near the right edge', () => {
  const position = speechPosition({ x: 896, top: 510, bottom: 578 }, { top: 48, width: 944 }, 900);
  assert.equal(position.above, true);
  assert.equal(position.y, 502);
  for (const width of [24, 640, 944]) {
    const left = (944 - width) * position.alignment / 100;
    assert.ok(left >= 0 && left + width <= 944);
  }
});

test('speech opens below a mascot near the top and stays hidden outside the viewport', () => {
  const anchor = { x: 175, top: 56, bottom: 124 };
  assert.deepEqual(speechPosition(anchor, { top: -24, width: 350 }, 600), {
    y: 132, alignment: 50, above: false,
  });
  assert.equal(speechPosition(anchor, { top: -140, width: 350 }, 600), null);
  assert.equal(speechPosition(anchor, { top: 600, width: 350 }, 600), null);
});

test('a narrow layout puts speech over the cover when it fits below the mascot', () => {
  const anchor = { x: 175, top: -68, bottom: 0 };
  assert.equal(speechPosition(anchor, { top: 500, width: 350 }, 844, true).above, false);
  assert.equal(speechPosition(anchor, { top: 500, width: 350 }, 600, true).above, true);
});

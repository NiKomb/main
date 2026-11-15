import assert from 'node:assert/strict';
import test from 'node:test';
import { selectNarrowCover } from '../src/effects/mascot/narrow-cover.ts';

test('the mascot moves to the next visible cover after scrolling past the upper threshold', () => {
  const first = { top: 132, bottom: 328 };
  const second = { top: 402, bottom: 598 };
  assert.equal(selectNarrowCover([first, second], 700, false), first);

  const scrolledFirst = { top: 35, bottom: 231 };
  const scrolledSecond = { top: 305, bottom: 501 };
  assert.equal(selectNarrowCover([scrolledFirst, scrolledSecond], 700, false), scrolledSecond);
  assert.equal(selectNarrowCover([first, second], 700, false), first);
});

test('a short page can reach the last visible cover and ignores covers outside the viewport', () => {
  const first = { top: 118, bottom: 314 };
  const second = { top: 388, bottom: 584 };
  const beyond = { top: 660, bottom: 856 };
  assert.equal(selectNarrowCover([first, second, beyond], 600, true), second);
  assert.equal(selectNarrowCover([beyond], 600, false), undefined);
});
